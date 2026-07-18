// backend/src/tracking/status-tracking.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between, In } from 'typeorm';
import { EmergencyReport, EmergencyStatus } from '../database/emergency-report.entity';
import { IssueReport, IssueStatus } from '../database/issue-report.entity';
import { IncidentAssignment, AssignmentStatus } from '../database/incident-assignment.entity';
import { IncidentGroup, IncidentUpdate } from '../database/dashboard.entity';
import { NotificationGateway } from '../dashboard/notifications/notification.gateway';

export interface ReportStatus {
  reportId: string;
  reportType: 'emergency' | 'issue';
  status: string;
  priority?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedResolution?: Date;
  assignedTo?: {
    department?: string;
    station?: string;
    staff?: string[];
  };
  timeline: StatusTimelineEntry[];
  updates: StatusUpdate[];
  slaStatus: {
    status: 'compliant' | 'warning' | 'breached' | 'critical';
    responseDeadline?: Date;
    resolutionDeadline?: Date;
    timeRemaining?: number;
  };
  incidentGroup?: {
    id: number;
    totalReports: number;
    uniqueReporters: number;
    status: string;
  };
  canEdit: boolean;
  canCancel: boolean;
  canProvideFeedback: boolean;
}

export interface StatusTimelineEntry {
  timestamp: Date;
  status: string;
  description: string;
  updatedBy?: string;
}

export interface StatusUpdate {
  id: string;
  type: 'system' | 'admin' | 'user';
  message: string;
  timestamp: Date;
  isRead: boolean;
}

export interface StatusSubscription {
  phoneNumber: string;
  reportId: string;
  reportType: 'emergency' | 'issue';
  subscribedAt: Date;
  lastNotified?: Date;
  notificationPreferences: {
    sms: boolean;
    whatsapp: boolean;
    email: boolean;
  };
}

@Injectable()
export class StatusTrackingService {
  private readonly logger = new Logger(StatusTrackingService.name);
  
  // In-memory subscriptions (would use Redis in production)
  private readonly subscriptions = new Map<string, StatusSubscription[]>();

  constructor(
    @InjectRepository(EmergencyReport)
    private emergencyRepo: Repository<EmergencyReport>,
    @InjectRepository(IssueReport)
    private issueRepo: Repository<IssueReport>,
    @InjectRepository(IncidentAssignment)
    private assignmentRepo: Repository<IncidentAssignment>,
    @InjectRepository(IncidentGroup)
    private incidentGroupRepo: Repository<IncidentGroup>,
    @InjectRepository(IncidentUpdate)
    private incidentUpdateRepo: Repository<IncidentUpdate>,
    private notificationGateway: NotificationGateway,
  ) {}

  /**
   * Get status for a specific report
   */
  async getReportStatus(
    reportId: string,
    reportType: 'emergency' | 'issue',
    phoneNumber?: string
  ): Promise<ReportStatus | null> {
    try {
      let report: EmergencyReport | IssueReport | null = null;
      let assignments: IncidentAssignment[] = [];
      let incidentGroup: IncidentGroup | null = null;
      let timeline: StatusTimelineEntry[] = [];

      if (reportType === 'emergency') {
        report = await this.emergencyRepo.findOne({
          where: { id: parseInt(reportId) }
        });

        if (report) {
          assignments = await this.assignmentRepo.find({
            where: { incidentId: reportId },
            relations: ['assignedStation', 'assignedStaff', 'assignedStaff.user']
          });

          if (report.consolidationId) {
            incidentGroup = await this.incidentGroupRepo.findOne({
              where: { id: report.consolidationId }
            });
          }

          // Build timeline
          timeline = [
            {
              timestamp: report.createdAt,
              status: 'reported',
              description: 'Emergency reported'
            }
          ];

          if (report.dispatchedAt) {
            timeline.push({
              timestamp: report.dispatchedAt,
              status: 'dispatched',
              description: 'Emergency services dispatched'
            });
          }

          if (report.resolvedAt) {
            timeline.push({
              timestamp: report.resolvedAt,
              status: 'resolved',
              description: 'Emergency resolved'
            });
          }

          // Add assignment timeline
          assignments.forEach(assignment => {
            if (assignment.acknowledgedAt) {
              timeline.push({
                timestamp: assignment.acknowledgedAt,
                status: 'acknowledged',
                description: `Acknowledged by ${assignment.assignedStation?.name || 'station'}`,
                updatedBy: assignment.assignedStaff?.user?.name
              });
            }
            if (assignment.enRouteAt) {
              timeline.push({
                timestamp: assignment.enRouteAt,
                status: 'en_route',
                description: 'Unit en route'
              });
            }
            if (assignment.onSceneAt) {
              timeline.push({
                timestamp: assignment.onSceneAt,
                status: 'on_scene',
                description: 'Unit on scene'
              });
            }
          });
        }
      } else {
        report = await this.issueRepo.findOne({
          where: { id: parseInt(reportId) }
        });

        if (report) {
          assignments = await this.assignmentRepo.find({
            where: { incidentId: reportId },
            relations: ['assignedStation', 'assignedStaff', 'assignedStaff.user']
          });

          if (report.consolidatedReportId) {
            incidentGroup = await this.incidentGroupRepo.findOne({
              where: { id: report.consolidatedReportId }
            });
          }

          // Build timeline
          timeline = [
            {
              timestamp: report.createdAt,
              status: 'reported',
              description: 'Issue reported'
            }
          ];

          if (report.resolvedAt) {
            timeline.push({
              timestamp: report.resolvedAt,
              status: 'resolved',
              description: 'Issue resolved'
            });
          }

          assignments.forEach(assignment => {
            if (assignment.acknowledgedAt) {
              timeline.push({
                timestamp: assignment.acknowledgedAt,
                status: 'acknowledged',
                description: `Acknowledged by ${assignment.assignedStation?.name || 'department'}`,
                updatedBy: assignment.assignedStaff?.user?.name
              });
            }
          });
        }
      }

      if (!report) {
        return null;
      }

      // Check if user can edit/cancel
      const canEdit = phoneNumber ? report.reportingPhoneNumber === phoneNumber : false;
      const canCancel = canEdit && 
        (report.status === EmergencyStatus.REPORTED || 
         report.status === IssueStatus.REPORTED ||
         report.status === IssueStatus.IN_PROGRESS);
      const canProvideFeedback = canEdit && 
        (report.status === EmergencyStatus.RESOLVED || 
         report.status === IssueStatus.RESOLVED ||
         report.status === IssueStatus.CLOSED);

      // Get incident group updates
      const incidentUpdates = incidentGroup ? 
        await this.incidentUpdateRepo.find({
          where: { incidentGroup: { id: incidentGroup.id } },
          order: { createdAt: 'DESC' },
          take: 10
        }) : [];

      // Calculate SLA status
      const slaStatus = await this.calculateSLAStatus(report, assignments);

      // Estimate resolution time
      const estimatedResolution = await this.estimateResolutionTime(report, assignments);

      return {
        reportId,
        reportType,
        status: report.status,
        priority: (report as any).priority,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        estimatedResolution,
        assignedTo: assignments.length > 0 ? {
          department: assignments[0].assignedStation?.department?.name,
          station: assignments[0].assignedStation?.name,
          staff: assignments.map(a => a.assignedStaff?.user?.name).filter(Boolean) as string[]
        } : undefined,
        timeline: timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
        updates: incidentUpdates.map(u => ({
          id: u.id.toString(),
          type: u.updateType === 'admin_update' ? 'admin' : 'system',
          message: u.description,
          timestamp: u.createdAt,
          isRead: false
        })),
        slaStatus,
        incidentGroup: incidentGroup ? {
          id: incidentGroup.id,
          totalReports: incidentGroup.reportCount,
          uniqueReporters: incidentGroup.uniqueReporters,
          status: incidentGroup.status
        } : undefined,
        canEdit,
        canCancel,
        canProvideFeedback
      };
    } catch (error) {
      this.logger.error('Error getting report status:', error);
      return null;
    }
  }

  /**
   * Subscribe to status updates for a report
   */
  async subscribeToStatus(
    phoneNumber: string,
    reportId: string,
    reportType: 'emergency' | 'issue',
    preferences: { sms?: boolean; whatsapp?: boolean; email?: boolean } = { whatsapp: true }
  ): Promise<boolean> {
    try {
      const key = `${reportType}:${reportId}`;
      const subscriptions = this.subscriptions.get(key) || [];

      // Check if already subscribed
      const existing = subscriptions.find(s => s.phoneNumber === phoneNumber);
      if (existing) {
        // Update preferences
        existing.notificationPreferences = {
          ...existing.notificationPreferences,
          ...preferences
        };
      } else {
        subscriptions.push({
          phoneNumber,
          reportId,
          reportType,
          subscribedAt: new Date(),
          notificationPreferences: {
            sms: preferences.sms || false,
            whatsapp: preferences.whatsapp || true,
            email: preferences.email || false
          }
        });
      }

      this.subscriptions.set(key, subscriptions);
      this.logger.log(`User ${phoneNumber} subscribed to ${reportType} #${reportId}`);

      return true;
    } catch (error) {
      this.logger.error('Error subscribing to status:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from status updates
   */
  async unsubscribeFromStatus(
    phoneNumber: string,
    reportId: string,
    reportType: 'emergency' | 'issue'
  ): Promise<boolean> {
    try {
      const key = `${reportType}:${reportId}`;
      const subscriptions = this.subscriptions.get(key) || [];
      
      const filtered = subscriptions.filter(s => s.phoneNumber !== phoneNumber);
      this.subscriptions.set(key, filtered);

      this.logger.log(`User ${phoneNumber} unsubscribed from ${reportType} #${reportId}`);
      return true;
    } catch (error) {
      this.logger.error('Error unsubscribing from status:', error);
      return false;
    }
  }

  /**
   * Notify subscribers of status change
   */
  async notifyStatusChange(
    reportId: string,
    reportType: 'emergency' | 'issue',
    newStatus: string,
    oldStatus: string,
    message: string
  ): Promise<void> {
    try {
      const key = `${reportType}:${reportId}`;
      const subscribers = this.subscriptions.get(key) || [];

      if (subscribers.length === 0) return;

      const report = reportType === 'emergency' ?
        await this.emergencyRepo.findOne({ where: { id: parseInt(reportId) } }) :
        await this.issueRepo.findOne({ where: { id: parseInt(reportId) } });

      for (const subscriber of subscribers) {
        if (subscriber.notificationPreferences.whatsapp) {
          // Send WhatsApp notification
          this.notificationGateway.sendToUser(subscriber.phoneNumber, {
            type: 'STATUS_UPDATE',
            title: `Status Update: ${reportType} #${reportId}`,
            message,
            data: {
              reportId,
              reportType,
              oldStatus,
              newStatus,
              report
            }
          });
        }

        // Update last notified
        subscriber.lastNotified = new Date();
      }

      this.logger.log(`Notified ${subscribers.length} subscribers of status change for ${reportType} #${reportId}`);
    } catch (error) {
      this.logger.error('Error notifying subscribers:', error);
    }
  }

  /**
   * Calculate SLA status for a report
   */
  private async calculateSLAStatus(
    report: EmergencyReport | IssueReport,
    assignments: IncidentAssignment[]
  ): Promise<ReportStatus['slaStatus']> {
    const now = new Date();
    
    // Check if report has breached SLA
    const hasBreached = assignments.some(a => a.slaMetrics?.breachedAt);

    if (hasBreached) {
      return {
        status: 'breached',
        responseDeadline: undefined,
        resolutionDeadline: undefined,
        timeRemaining: 0
      };
    }

    // Check for critical/high priority
    const priority = (report as any).priority;
    if (priority === 'critical' || priority === 'high') {
      return {
        status: 'warning',
        responseDeadline: new Date(Date.now() + 5 * 60 * 1000),
        resolutionDeadline: new Date(Date.now() + 30 * 60 * 1000),
        timeRemaining: 5
      };
    }

    return {
      status: 'compliant',
      timeRemaining: 30
    };
  }

  /**
   * Estimate resolution time based on historical data
   */
  private async estimateResolutionTime(
    report: EmergencyReport | IssueReport,
    assignments: IncidentAssignment[]
  ): Promise<Date | undefined> {
    if (report.status === 'resolved' || report.status === 'closed') {
      return undefined;
    }

    // Get average resolution time for similar incidents
    const similarIncidents = await this.assignmentRepo.find({
      where: {
        incidentType: report instanceof EmergencyReport ? 'emergency' : 'issue',
        status: AssignmentStatus.COMPLETED,
        completedAt: MoreThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      },
      take: 100
    });

    if (similarIncidents.length === 0) {
      return undefined;
    }

    const avgResolutionTime = similarIncidents.reduce((sum, a) => {
      if (a.completedAt) {
        return sum + (a.completedAt.getTime() - a.assignedAt.getTime());
      }
      return sum;
    }, 0) / similarIncidents.length;

    // Adjust based on priority
    const priority = (report as any).priority;
    const priorityMultiplier = {
      critical: 0.7,
      high: 0.9,
      medium: 1.0,
      low: 1.3
    };

    const adjustedTime = avgResolutionTime * 
      (priorityMultiplier[priority as keyof typeof priorityMultiplier] || 1.0);

    return new Date(Date.now() + adjustedTime);
  }

  /**
   * Get status history for a user
   */
  async getUserStatusHistory(
    phoneNumber: string,
    limit: number = 10
  ): Promise<ReportStatus[]> {
    try {
      const emergencies = await this.emergencyRepo.find({
        where: { reportingPhoneNumber: phoneNumber },
        order: { createdAt: 'DESC' },
        take: limit
      });

      const issues = await this.issueRepo.find({
        where: { reportingPhoneNumber: phoneNumber },
        order: { createdAt: 'DESC' },
        take: limit
      });

      const statuses: ReportStatus[] = [];

      for (const emergency of emergencies) {
        const status = await this.getReportStatus(emergency.id.toString(), 'emergency');
        if (status) statuses.push(status);
      }

      for (const issue of issues) {
        const status = await this.getReportStatus(issue.id.toString(), 'issue');
        if (status) statuses.push(status);
      }

      return statuses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      this.logger.error('Error getting user status history:', error);
      return [];
    }
  }

  /**
   * Cancel a report (if allowed)
   */
  async cancelReport(
    reportId: string,
    reportType: 'emergency' | 'issue',
    phoneNumber: string,
    reason?: string
  ): Promise<boolean> {
    try {
      if (reportType === 'emergency') {
        const report = await this.emergencyRepo.findOne({
          where: { id: parseInt(reportId), reportingPhoneNumber: phoneNumber }
        });

        if (!report) {
          return false;
        }

        if (report.status !== EmergencyStatus.REPORTED) {
          return false;
        }

        report.status = EmergencyStatus.CANCELLED;
        report.adminNotes = reason!;
        await this.emergencyRepo.save(report);

        // Notify subscribers
        await this.notifyStatusChange(
          reportId,
          reportType,
          EmergencyStatus.CANCELLED,
          report.status,
          `Report cancelled by user${reason ? ': ' + reason : ''}`
        );

        return true;
      } else {
        const report = await this.issueRepo.findOne({
          where: { id: parseInt(reportId), reportingPhoneNumber: phoneNumber }
        });

        if (!report) {
          return false;
        }

        if (report.status !== IssueStatus.REPORTED) {
          return false;
        }

        report.status = IssueStatus.CLOSED;
        report.adminNotes = reason!;
        await this.issueRepo.save(report);

        // Notify subscribers
        await this.notifyStatusChange(
          reportId,
          reportType,
          IssueStatus.CLOSED,
          report.status,
          `Report cancelled by user${reason ? ': ' + reason : ''}`
        );

        return true;
      }
    } catch (error) {
      this.logger.error('Error cancelling report:', error);
      return false;
    }
  }

  /**
   * Add user feedback to a report
   */
  async addFeedback(
    reportId: string,
    reportType: 'emergency' | 'issue',
    phoneNumber: string,
    rating: number,
    feedback: string
  ): Promise<boolean> {
    try {
      if (reportType === 'emergency') {
        const report = await this.emergencyRepo.findOne({
          where: { id: parseInt(reportId), reportingPhoneNumber: phoneNumber }
        });

        if (!report) {
          return false;
        }

        report.rating = rating;
        report.userFeedback = feedback;
        await this.emergencyRepo.save(report);

        return true;
      } else {
        const report = await this.issueRepo.findOne({
          where: { id: parseInt(reportId), reportingPhoneNumber: phoneNumber }
        });

        if (!report) {
          return false;
        }

        // Issues might not have rating field, add to description or admin notes
        report.adminNotes = `Feedback (${rating}/5): ${feedback}`;
        await this.issueRepo.save(report);

        return true;
      }
    } catch (error) {
      this.logger.error('Error adding feedback:', error);
      return false;
    }
  }

  /**
   * Clean up old subscriptions
   */
  cleanupOldSubscriptions(): void {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const [key, subscribers] of this.subscriptions.entries()) {
      const active = subscribers.filter(s => s.subscribedAt > thirtyDaysAgo);
      if (active.length !== subscribers.length) {
        this.subscriptions.set(key, active);
      }
    }
  }
} 
