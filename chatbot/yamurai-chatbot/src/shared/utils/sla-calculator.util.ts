/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/shared/utils/sla-calculator.util.ts
import { Injectable } from '@nestjs/common';

export interface BusinessDayHours {
  start: string;
  end: string;
}

export type BusinessDayConfig = BusinessDayHours | null;

export interface BusinessHours {
  monday: BusinessDayConfig;
  tuesday: BusinessDayConfig;
  wednesday: BusinessDayConfig;
  thursday: BusinessDayConfig;
  friday: BusinessDayConfig;
  saturday: BusinessDayConfig;
  sunday: BusinessDayConfig;
  allDay: boolean; // When true, 24/7 operation
}

export interface EscalationRule {
  level: 'supervisor' | 'manager' | 'director' | 'headquarters';
  triggerMinutes: number;
  notifyRoles: string[];
  autoAssign?: boolean;
}

export interface SLATarget {
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  updateFrequencyMinutes: number;
  businessHours?: BusinessHours;
  escalationRules: EscalationRule[];
}

export interface SLAMetrics {
  responseTarget: number;
  resolutionTarget: number;
  updateFrequency: number;
  responseDeadline: Date;
  resolutionDeadline: Date;
  nextUpdateDeadline: Date;
  isResponseBreached: boolean;
  isResolutionBreached: boolean;
  isUpdateBreached: boolean;
  timeToResponseBreach: number;
  timeToResolutionBreach: number;
  timeToUpdateBreach: number;
  escalationLevel?: string;
  businessHours?: BusinessHours;
}

export interface SLAStatus {
  status: 'compliant' | 'warning' | 'breached' | 'critical';
  metrics: SLAMetrics;
  breaches: SLABreach[];
  escalations: EscalationRecord[];
}

export interface SLABreach {
  type: 'response' | 'resolution' | 'update';
  breachedAt: Date;
  threshold: number;
  actual: number;
  escalatedTo?: string;
}

export interface EscalationRecord {
  level: string;
  escalatedAt: Date;
  reason: string;
  resolved: boolean;
  resolvedAt?: Date;
  notes?: string;
}

export interface TimeRemaining {
  responseRemaining: number;
  resolutionRemaining: number;
  updateRemaining: number;
  responsePercentage: number;
  resolutionPercentage: number;
  updatePercentage: number;
  isResponseOverdue: boolean;
  isResolutionOverdue: boolean;
  isUpdateOverdue: boolean;
}

@Injectable()
export class SLACalculatorUtil {
  /**
   * Calculate SLA deadlines based on incident creation time and targets
   */
  calculateDeadlines(
    createdAt: Date,
    slaTarget: SLATarget,
    priority?: string,
    incidentType?: string
  ): {
    responseDeadline: Date;
    resolutionDeadline: Date;
    nextUpdateDeadline: Date;
  } {
    // Adjust targets based on priority if needed
    let responseTime = slaTarget.responseTimeMinutes;
    let resolutionTime = slaTarget.resolutionTimeMinutes;
    
    if (priority === 'critical') {
      responseTime = Math.ceil(responseTime * 0.5); // 50% of normal time
      resolutionTime = Math.ceil(resolutionTime * 0.6);
    } else if (priority === 'high') {
      responseTime = Math.ceil(responseTime * 0.75); // 75% of normal time
      resolutionTime = Math.ceil(resolutionTime * 0.8);
    } else if (priority === 'low') {
      responseTime = Math.ceil(responseTime * 1.5); // 150% of normal time
      resolutionTime = Math.ceil(resolutionTime * 1.3);
    }

    // Calculate deadlines considering business hours if applicable
    const responseDeadline = this.addBusinessMinutes(createdAt, responseTime, slaTarget.businessHours);
    const resolutionDeadline = this.addBusinessMinutes(createdAt, resolutionTime, slaTarget.businessHours);
    const nextUpdateDeadline = this.addBusinessMinutes(createdAt, slaTarget.updateFrequencyMinutes, slaTarget.businessHours);

    return {
      responseDeadline,
      resolutionDeadline,
      nextUpdateDeadline
    };
  }

  /**
   * Calculate SLA metrics for an incident
   */
  calculateSLAMetrics(
    createdAt: Date,
    slaTarget: SLATarget,
    acknowledgedAt?: Date,
    resolvedAt?: Date,
    lastUpdateAt?: Date,
    priority?: string
  ): SLAMetrics {
    const now = new Date();
    const deadlines = this.calculateDeadlines(createdAt, slaTarget, priority);

    // Calculate time remaining/breached
    const responseTimeRemaining = acknowledgedAt 
      ? 0 
      : this.getMinutesBetween(now, deadlines.responseDeadline);

    const resolutionTimeRemaining = resolvedAt
      ? 0
      : this.getMinutesBetween(now, deadlines.resolutionDeadline);

    const updateTimeRemaining = lastUpdateAt
      ? this.getMinutesBetween(
          new Date(lastUpdateAt.getTime() + slaTarget.updateFrequencyMinutes * 60000),
          deadlines.nextUpdateDeadline
        )
      : this.getMinutesBetween(now, deadlines.nextUpdateDeadline);

    // Check for breaches
    const isResponseBreached = !acknowledgedAt && now > deadlines.responseDeadline;
    const isResolutionBreached = !resolvedAt && now > deadlines.resolutionDeadline;
    const isUpdateBreached = !lastUpdateAt 
      ? now > deadlines.nextUpdateDeadline
      : new Date(lastUpdateAt.getTime() + slaTarget.updateFrequencyMinutes * 60000) < now;

    // Determine escalation level if breached
    let escalationLevel: string | undefined;
    if (isResponseBreached || isResolutionBreached) {
      const breachDuration = isResponseBreached
        ? this.getMinutesBetween(deadlines.responseDeadline, now)
        : this.getMinutesBetween(deadlines.resolutionDeadline, now);

      escalationLevel = this.determineEscalationLevel(breachDuration, slaTarget.escalationRules);
    }

    return {
      responseTarget: slaTarget.responseTimeMinutes,
      resolutionTarget: slaTarget.resolutionTimeMinutes,
      updateFrequency: slaTarget.updateFrequencyMinutes,
      responseDeadline: deadlines.responseDeadline,
      resolutionDeadline: deadlines.resolutionDeadline,
      nextUpdateDeadline: deadlines.nextUpdateDeadline,
      isResponseBreached,
      isResolutionBreached,
      isUpdateBreached,
      timeToResponseBreach: Math.max(0, responseTimeRemaining),
      timeToResolutionBreach: Math.max(0, resolutionTimeRemaining),
      timeToUpdateBreach: Math.max(0, updateTimeRemaining),
      escalationLevel,
      businessHours: slaTarget.businessHours
    };
  }

  /**
   * Get complete SLA status
   */
  getSLAStatus(
    createdAt: Date,
    slaTarget: SLATarget,
    acknowledgedAt?: Date,
    resolvedAt?: Date,
    lastUpdateAt?: Date,
    priority?: string
  ): SLAStatus {
    const metrics = this.calculateSLAMetrics(
      createdAt,
      slaTarget,
      acknowledgedAt,
      resolvedAt,
      lastUpdateAt,
      priority
    );

    const breaches: SLABreach[] = [];
    const escalations: EscalationRecord[] = [];

    // Determine overall status
    let status: 'compliant' | 'warning' | 'breached' | 'critical' = 'compliant';

    if (metrics.isResolutionBreached) {
      status = 'critical';
      breaches.push({
        type: 'resolution',
        breachedAt: metrics.resolutionDeadline,
        threshold: metrics.resolutionTarget,
        actual: this.getMinutesBetween(createdAt, new Date())
      });
    } else if (metrics.isResponseBreached) {
      status = 'breached';
      breaches.push({
        type: 'response',
        breachedAt: metrics.responseDeadline,
        threshold: metrics.responseTarget,
        actual: this.getMinutesBetween(createdAt, new Date())
      });
    } else if (metrics.isUpdateBreached) {
      status = 'warning';
      breaches.push({
        type: 'update',
        breachedAt: metrics.nextUpdateDeadline,
        threshold: metrics.updateFrequency,
        actual: lastUpdateAt 
          ? this.getMinutesBetween(lastUpdateAt, new Date())
          : this.getMinutesBetween(createdAt, new Date())
      });
    }

    // Add escalation records if applicable
    if (metrics.escalationLevel) {
      escalations.push({
        level: metrics.escalationLevel,
        escalatedAt: new Date(),
        reason: `SLA ${metrics.isResolutionBreached ? 'resolution' : 'response'} time exceeded`,
        resolved: false
      });
    }

    return {
      status,
      metrics,
      breaches,
      escalations
    };
  }

  /**
   * Calculate time remaining for SLA targets
   */
  calculateTimeRemaining(
    createdAt: Date,
    slaTarget: SLATarget,
    acknowledgedAt?: Date,
    resolvedAt?: Date,
    lastUpdateAt?: Date
  ): TimeRemaining {
    const now = new Date();
    const deadlines = this.calculateDeadlines(createdAt, slaTarget);

    const responseRemaining = acknowledgedAt
      ? 0
      : Math.max(0, this.getMinutesBetween(now, deadlines.responseDeadline));

    const resolutionRemaining = resolvedAt
      ? 0
      : Math.max(0, this.getMinutesBetween(now, deadlines.resolutionDeadline));

    const updateRemaining = lastUpdateAt
      ? Math.max(0, this.getMinutesBetween(
          now,
          new Date(lastUpdateAt.getTime() + slaTarget.updateFrequencyMinutes * 60000)
        ))
      : Math.max(0, this.getMinutesBetween(now, deadlines.nextUpdateDeadline));

    const totalResponseTime = slaTarget.responseTimeMinutes;
    const totalResolutionTime = slaTarget.resolutionTimeMinutes;
    const totalUpdateTime = slaTarget.updateFrequencyMinutes;

    const elapsedResponse = acknowledgedAt
      ? totalResponseTime
      : totalResponseTime - responseRemaining;

    const elapsedResolution = resolvedAt
      ? totalResolutionTime
      : totalResolutionTime - resolutionRemaining;

    const elapsedUpdate = lastUpdateAt
      ? totalUpdateTime - updateRemaining
      : totalUpdateTime - updateRemaining;

    return {
      responseRemaining,
      resolutionRemaining,
      updateRemaining,
      responsePercentage: Math.min(100, (elapsedResponse / totalResponseTime) * 100),
      resolutionPercentage: Math.min(100, (elapsedResolution / totalResolutionTime) * 100),
      updatePercentage: Math.min(100, (elapsedUpdate / totalUpdateTime) * 100),
      isResponseOverdue: responseRemaining <= 0 && !acknowledgedAt,
      isResolutionOverdue: resolutionRemaining <= 0 && !resolvedAt,
      isUpdateOverdue: updateRemaining <= 0
    };
  }

  /**
   * Check if SLA is in breach
   */
  isSLABreached(
    createdAt: Date,
    slaTarget: SLATarget,
    acknowledgedAt?: Date,
    resolvedAt?: Date
  ): boolean {
    const now = new Date();
    const deadlines = this.calculateDeadlines(createdAt, slaTarget);

    return (!acknowledgedAt && now > deadlines.responseDeadline) ||
           (!resolvedAt && now > deadlines.resolutionDeadline);
  }

  /**
   * Calculate SLA compliance percentage
   */
  calculateCompliancePercentage(
    incidents: Array<{
      createdAt: Date;
      acknowledgedAt?: Date;
      resolvedAt?: Date;
      slaTarget: SLATarget;
    }>
  ): number {
    if (!incidents.length) return 100;

    const compliantIncidents = incidents.filter(incident => {
      const deadlines = this.calculateDeadlines(incident.createdAt, incident.slaTarget);
      const now = new Date();

      const responseCompliant = incident.acknowledgedAt 
        ? incident.acknowledgedAt <= deadlines.responseDeadline
        : now <= deadlines.responseDeadline;

      const resolutionCompliant = incident.resolvedAt
        ? incident.resolvedAt <= deadlines.resolutionDeadline
        : now <= deadlines.resolutionDeadline;

      return responseCompliant && resolutionCompliant;
    });

    return (compliantIncidents.length / incidents.length) * 100;
  }

  /**
   * Get next escalation level
   */
  getNextEscalationLevel(
    currentLevel: string,
    escalationRules: EscalationRule[]
  ): EscalationRule | undefined {
    const levels = ['supervisor', 'manager', 'director', 'headquarters'];
    const currentIndex = levels.indexOf(currentLevel);
    
    if (currentIndex < 0 || currentIndex >= levels.length - 1) {
      return undefined;
    }

    const nextLevel = levels[currentIndex + 1];
    return escalationRules.find(rule => rule.level === nextLevel);
  }

  /**
   * Calculate time until next escalation
   */
  timeUntilNextEscalation(
    createdAt: Date,
    slaTarget: SLATarget,
    currentEscalationLevel?: string
  ): number | null {
    if (!slaTarget.escalationRules?.length) return null;

    const now = new Date();
    const deadlines = this.calculateDeadlines(createdAt, slaTarget);
    
    // Find the next escalation rule
    const currentLevelIndex = currentEscalationLevel
      ? slaTarget.escalationRules.findIndex(r => r.level === currentEscalationLevel)
      : -1;

    const nextRules = slaTarget.escalationRules
      .filter((_, index) => index > currentLevelIndex)
      .sort((a, b) => a.triggerMinutes - b.triggerMinutes);

    if (!nextRules.length) return null;

    const nextRule = nextRules[0];
    const breachTime = new Date(deadlines.responseDeadline.getTime() + nextRule.triggerMinutes * 60000);

    return Math.max(0, this.getMinutesBetween(now, breachTime));
  }

  /**
   * Determine if current time is within business hours
   */
  isWithinBusinessHours(date: Date, businessHours?: BusinessHours): boolean {
    if (!businessHours || businessHours.allDay) return true;

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = days[date.getDay()];
    
    const hours = businessHours[dayName as keyof BusinessHours];
    
    // Type guard to check if hours is a BusinessDayHours object
    if (this.isBusinessDayHours(hours)) {
      const currentTime = date.getHours() * 60 + date.getMinutes();
      const [startHour, startMinute] = hours.start.split(':').map(Number);
      const [endHour, endMinute] = hours.end.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      return currentTime >= startMinutes && currentTime <= endMinutes;
    }

    return false; // hours is null
  }

  /**
   * Type guard to check if value is BusinessDayHours
   */
  private isBusinessDayHours(value: any): value is BusinessDayHours {
    return value !== null && 
           typeof value === 'object' && 
           'start' in value && 
           'end' in value;
  }

  /**
   * Add minutes considering business hours
   */
  private addBusinessMinutes(startDate: Date, minutes: number, businessHours?: BusinessHours): Date {
    if (!businessHours || businessHours.allDay) {
      return new Date(startDate.getTime() + minutes * 60000);
    }

    let remainingMinutes = minutes;
    let currentDate = new Date(startDate);
    
    while (remainingMinutes > 0) {
      // Move to next business hour if outside business hours
      while (!this.isWithinBusinessHours(currentDate, businessHours)) {
        currentDate = this.getNextBusinessHour(currentDate, businessHours);
      }

      // Calculate minutes until end of business day
      const dayEnd = this.getDayEnd(currentDate, businessHours);
      const minutesUntilEnd = this.getMinutesBetween(currentDate, dayEnd);

      if (minutesUntilEnd >= remainingMinutes) {
        // Can complete within current business day
        return new Date(currentDate.getTime() + remainingMinutes * 60000);
      }

      // Use remaining minutes in current day and move to next day
      remainingMinutes -= minutesUntilEnd;
      currentDate = this.getNextBusinessDay(currentDate, businessHours);
    }

    return currentDate;
  }

  /**
   * Get next business hour
   */
  private getNextBusinessHour(date: Date, businessHours: BusinessHours): Date {
    const nextDate = new Date(date);
    
    // Try same day first
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const hours = businessHours[dayName as keyof BusinessHours];
    
    if (this.isBusinessDayHours(hours)) {
      const [hour, minute] = hours.start.split(':').map(Number);
      nextDate.setHours(hour, minute, 0, 0);
      
      if (nextDate > date) {
        return nextDate;
      }
    }

    // Move to next day
    return this.getNextBusinessDay(date, businessHours);
  }

  /**
   * Get next business day
   */
  private getNextBusinessDay(date: Date, businessHours: BusinessHours): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    nextDate.setHours(0, 0, 0, 0);

    // Find next day with business hours
    for (let i = 0; i < 7; i++) {
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][nextDate.getDay()];
      const hours = businessHours[dayName as keyof BusinessHours];
      
      if (this.isBusinessDayHours(hours)) {
        const [hour, minute] = hours.start.split(':').map(Number);
        nextDate.setHours(hour, minute, 0, 0);
        return nextDate;
      }
      
      nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate; // Fallback
  }

  /**
   * Get end of business day
   */
  private getDayEnd(date: Date, businessHours: BusinessHours): Date {
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const hours = businessHours[dayName as keyof BusinessHours];
    
    if (this.isBusinessDayHours(hours)) {
      const [hour, minute] = hours.end.split(':').map(Number);
      const dayEnd = new Date(date);
      dayEnd.setHours(hour, minute, 0, 0);
      return dayEnd;
    }

    return date; // Fallback
  }

  /**
   * Determine escalation level based on breach duration
   */
  private determineEscalationLevel(
    breachDurationMinutes: number,
    escalationRules: EscalationRule[]
  ): string | undefined {
    const applicableRule = escalationRules
      .sort((a, b) => a.triggerMinutes - b.triggerMinutes)
      .find(rule => breachDurationMinutes >= rule.triggerMinutes);

    return applicableRule?.level;
  }

  /**
   * Get minutes between two dates
   */
  private getMinutesBetween(date1: Date, date2: Date): number {
    return (date2.getTime() - date1.getTime()) / 60000;
  }

  /**
   * Format duration for display
   */
  formatDuration(minutes: number): string {
    if (minutes < 0) return 'Overdue';
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h remaining`;
    }
    
    if (hours > 0) {
      return `${hours}h ${mins}m remaining`;
    }
    
    return `${mins}m remaining`;
  }

  /**
   * Get SLA health color
   */
  getSLAHealthColor(metrics: SLAMetrics): 'success' | 'warning' | 'error' | 'default' {
    if (metrics.isResolutionBreached) return 'error';
    if (metrics.isResponseBreached) return 'error';
    if (metrics.isUpdateBreached) return 'warning';
    
    if (metrics.timeToResponseBreach < 15 || metrics.timeToResolutionBreach < 30) {
      return 'warning';
    }
    
    return 'success';
  }

  /**
   * Validate SLA configuration
   */
  validateSLAConfig(slaTarget: SLATarget): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (slaTarget.responseTimeMinutes < 1) {
      errors.push('Response time must be at least 1 minute');
    }

    if (slaTarget.resolutionTimeMinutes < slaTarget.responseTimeMinutes) {
      errors.push('Resolution time must be greater than response time');
    }

    if (slaTarget.updateFrequencyMinutes < 5) {
      errors.push('Update frequency should be at least 5 minutes');
    }

    if (slaTarget.escalationRules?.length) {
      const sortedRules = [...slaTarget.escalationRules].sort((a, b) => a.triggerMinutes - b.triggerMinutes);
      
      for (let i = 0; i < sortedRules.length; i++) {
        if (i > 0 && sortedRules[i].triggerMinutes <= sortedRules[i - 1].triggerMinutes) {
          errors.push('Escalation rules must have increasing trigger times');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}