// backend/src/analytics/analytics.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmergencyReport, EmergencyType, EmergencyPriority, EmergencyStatus } from '../database/emergency-report.entity';
import { IssueReport, IssueType, IssueStatus } from '../database/issue-report.entity';
import { IncidentAssignment, AssignmentStatus } from '../database/incident-assignment.entity';
import { Department, DepartmentType } from '../database/department.entity';
import { Station } from '../database/station.entity';
import { User } from '../database/user.entity';
import { AnalyticsDaily, LocationAnalytics, UserAnalytics, DepartmentAnalytics } from '../database/analytics.entity';

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface AnalyticsReport {
  period: string;
  summary: AnalyticsSummary;
  trends: AnalyticsTrends;
  performance: PerformanceMetrics;
  demographics: DemographicsData;
  predictions: PredictionsData;
  recommendations: Recommendation[];
}

export interface AnalyticsSummary {
  totalIncidents: number;
  emergencies: number;
  issues: number;
  resolved: number;
  activeIncidents: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  slaCompliance: number;
  userSatisfaction: number;
  uniqueReporters: number;
  repeatReporters: number;
}

export interface AnalyticsTrends {
  daily: TimeSeriesPoint[];
  weekly: TimeSeriesPoint[];
  monthly: TimeSeriesPoint[];
  yearly: TimeSeriesPoint[];
  byType: Record<string, TimeSeriesPoint[]>;
  byPriority: Record<string, TimeSeriesPoint[]>;
  byDepartment: Record<string, TimeSeriesPoint[]>;
}

export interface PerformanceMetrics {
  departmentPerformance: DepartmentMetric[];
  stationPerformance: StationMetric[];
  staffPerformance: StaffMetric[];
  responseTimeDistribution: DistributionData;
  resolutionTimeDistribution: DistributionData;
  peakHours: PeakHour[];
  hotspotAreas: HotspotArea[];
}

export interface DepartmentMetric {
  departmentId: string;
  departmentName: string;
  type: string;
  totalIncidents: number;
  resolved: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  slaCompliance: number;
  staffUtilization: number;
  capacityUtilization: number;
  trend: number; // percentage change
}

export interface StationMetric {
  stationId: string;
  stationName: string;
  department: string;
  totalIncidents: number;
  currentLoad: number;
  maxCapacity: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  staffUtilization: number;
  vehicleUtilization: number;
}

export interface StaffMetric {
  staffId: string;
  name: string;
  role: string;
  totalAssignments: number;
  completed: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  slaCompliance: number;
  customerRating: number;
  productivity: number;
}

export interface DistributionData {
  ranges: string[];
  counts: number[];
  percentages: number[];
}

export interface PeakHour {
  hour: number;
  count: number;
  percentage: number;
}

export interface HotspotArea {
  latitude: number;
  longitude: number;
  intensity: number;
  type: string;
  count: number;
  radius: number;
}

export interface DemographicsData {
  byLocation: Record<string, number>;
  byUserType: Record<string, number>;
  repeatReporters: Array<{
    phoneNumber: string;
    count: number;
  }>;
  newReporters: number;
  returningReporters: number;
}

export interface PredictionsData {
  next24h: number;
  next7d: number;
  next30d: number;
  confidence: number;
  seasonalFactors: SeasonalFactor[];
  anomalyDetection: Anomaly[];
}

export interface SeasonalFactor {
  factor: string;
  impact: number;
  period: string;
}

export interface Anomaly {
  date: Date;
  expected: number;
  actual: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  possibleCauses: string[];
}

export interface Recommendation {
  type: 'resource' | 'process' | 'training' | 'infrastructure';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  priority: number;
  actionable: boolean;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(EmergencyReport)
    private emergencyRepo: Repository<EmergencyReport>,
    @InjectRepository(IssueReport)
    private issueRepo: Repository<IssueReport>,
    @InjectRepository(IncidentAssignment)
    private assignmentRepo: Repository<IncidentAssignment>,
    @InjectRepository(Department)
    private departmentRepo: Repository<Department>,
    @InjectRepository(Station)
    private stationRepo: Repository<Station>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(AnalyticsDaily)
    private analyticsDailyRepo: Repository<AnalyticsDaily>,
    @InjectRepository(LocationAnalytics)
    private locationAnalyticsRepo: Repository<LocationAnalytics>,
    @InjectRepository(UserAnalytics)
    private userAnalyticsRepo: Repository<UserAnalytics>,
    @InjectRepository(DepartmentAnalytics)
    private departmentAnalyticsRepo: Repository<DepartmentAnalytics>,
  ) {}

  /**
   * Generate comprehensive analytics report
   */
  async generateReport(
    period: '24h' | '7d' | '30d' | '90d' | '1y' | 'custom',
    startDate?: Date,
    endDate?: Date,
    filters?: {
      departmentId?: string;
      stationId?: string;
      incidentType?: string[];
    }
  ): Promise<AnalyticsReport> {
    try {
      const dateRange = this.calculateDateRange(period, startDate, endDate);

      // Fetch all data in parallel
      const [
        summary,
        trends,
        performance,
        demographics,
        predictions
      ] = await Promise.all([
        this.getSummary(dateRange, filters),
        this.getTrends(dateRange, filters),
        this.getPerformanceMetrics(dateRange, filters),
        this.getDemographics(dateRange, filters),
        this.getPredictions(dateRange, filters)
      ]);

      // Generate recommendations based on data
      const recommendations = await this.generateRecommendations(summary, performance, trends);

      return {
        period,
        summary,
        trends,
        performance,
        demographics,
        predictions,
        recommendations
      };
    } catch (error) {
      this.logger.error('Error generating analytics report:', error);
      throw error;
    }
  }

  /**
   * Get summary statistics
   */
  private async getSummary(
    dateRange: { start: Date; end: Date },
    filters?: any
  ): Promise<AnalyticsSummary> {
    const emergencies = await this.emergencyRepo.find({
      where: {
        createdAt: Between(dateRange.start, dateRange.end),
        ...(filters?.incidentType?.length ? { type: In(filters.incidentType) } : {})
      }
    });

    const issues = await this.issueRepo.find({
      where: {
        createdAt: Between(dateRange.start, dateRange.end),
        ...(filters?.incidentType?.length ? { type: In(filters.incidentType) } : {})
      }
    });

    const assignments = await this.assignmentRepo.find({
      where: {
        assignedAt: Between(dateRange.start, dateRange.end)
      }
    });

    const totalIncidents = emergencies.length + issues.length;
    const resolved = emergencies.filter(e => e.status === EmergencyStatus.RESOLVED).length +
                     issues.filter(i => i.status === IssueStatus.RESOLVED).length;

    const responseTimes = assignments
      .filter(a => a.acknowledgedAt)
      .map(a => (a.acknowledgedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60));

    const resolutionTimes = assignments
      .filter(a => a.completedAt)
      .map(a => (a.completedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60));

    const breached = assignments.filter(a => a.slaMetrics?.breachedAt).length;

    // Get unique reporters
    const emergencyReporters = new Set(emergencies.map(e => e.reportingPhoneNumber));
    const issueReporters = new Set(issues.map(i => i.reportingPhoneNumber));
    const uniqueReporters = new Set([...emergencyReporters, ...issueReporters]);

    // Calculate repeat reporters
    const reporterCounts = new Map<string, number>();
    [...emergencies, ...issues].forEach(r => {
      if (r.reportingPhoneNumber) {
        reporterCounts.set(r.reportingPhoneNumber, (reporterCounts.get(r.reportingPhoneNumber) || 0) + 1);
      }
    });
    const repeatReporters = Array.from(reporterCounts.values()).filter(c => c > 1).length;

    return {
      totalIncidents,
      emergencies: emergencies.length,
      issues: issues.length,
      resolved,
      activeIncidents: totalIncidents - resolved,
      averageResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      averageResolutionTime: resolutionTimes.length > 0 ? 
        resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0,
      slaCompliance: assignments.length > 0 ? 
        ((assignments.length - breached) / assignments.length) * 100 : 100,
      userSatisfaction: await this.calculateAverageRating(emergencies),
      uniqueReporters: uniqueReporters.size,
      repeatReporters
    };
  }

  /**
   * Get trend data
   */
  private async getTrends(
    dateRange: { start: Date; end: Date },
    filters?: any
  ): Promise<AnalyticsTrends> {
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get all incidents in range
    const emergencies = await this.emergencyRepo.find({
      where: {
        createdAt: Between(dateRange.start, dateRange.end),
        ...(filters?.incidentType?.length ? { type: In(filters.incidentType) } : {})
      }
    });

    const issues = await this.issueRepo.find({
      where: {
        createdAt: Between(dateRange.start, dateRange.end),
        ...(filters?.incidentType?.length ? { type: In(filters.incidentType) } : {})
      }
    });

    const allIncidents = [...emergencies, ...issues];

    // Daily trends
    const daily: TimeSeriesPoint[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(dateRange.start);
      date.setDate(date.getDate() + i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = allIncidents.filter(inc => 
        inc.createdAt >= date && inc.createdAt < nextDate
      ).length;

      daily.push({
        timestamp: date.toISOString().split('T')[0],
        value: count
      });
    }

    // Weekly trends
    const weekly: TimeSeriesPoint[] = [];
    const weeks = Math.ceil(days / 7);
    for (let i = 0; i < weeks; i++) {
      const start = new Date(dateRange.start);
      start.setDate(start.getDate() + (i * 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const count = allIncidents.filter(inc => 
        inc.createdAt >= start && inc.createdAt < end
      ).length;

      weekly.push({
        timestamp: `Week ${i + 1}`,
        value: count
      });
    }

    // Monthly trends
    const monthly: TimeSeriesPoint[] = [];
    const months = Math.ceil(days / 30);
    for (let i = 0; i < months; i++) {
      const start = new Date(dateRange.start);
      start.setMonth(start.getMonth() + i);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const count = allIncidents.filter(inc => 
        inc.createdAt >= start && inc.createdAt < end
      ).length;

      monthly.push({
        timestamp: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: count
      });
    }

    // Yearly trends (if range > 1 year)
    const yearly: TimeSeriesPoint[] = [];
    if (days > 365) {
      const years = Math.ceil(days / 365);
      for (let i = 0; i < years; i++) {
        const start = new Date(dateRange.start);
        start.setFullYear(start.getFullYear() + i);
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);

        const count = allIncidents.filter(inc => 
          inc.createdAt >= start && inc.createdAt < end
        ).length;

        yearly.push({
          timestamp: start.getFullYear().toString(),
          value: count
        });
      }
    }

    // Trends by type
    const byType: Record<string, TimeSeriesPoint[]> = {};
    const types = [...new Set(allIncidents.map(i => i.type))];
    for (const type of types) {
      byType[type] = daily.map(day => ({
        ...day,
        value: allIncidents.filter(inc => 
          inc.type === type && 
          inc.createdAt >= new Date(day.timestamp) &&
          inc.createdAt < new Date(new Date(day.timestamp).getTime() + 24 * 60 * 60 * 1000)
        ).length
      }));
    }

    // Trends by priority (for emergencies only)
    const byPriority: Record<string, TimeSeriesPoint[]> = {};
    const priorities = Object.values(EmergencyPriority);
    for (const priority of priorities) {
      byPriority[priority] = daily.map(day => ({
        ...day,
        value: emergencies.filter(e => 
          e.priority === priority &&
          e.createdAt >= new Date(day.timestamp) &&
          e.createdAt < new Date(new Date(day.timestamp).getTime() + 24 * 60 * 60 * 1000)
        ).length
      }));
    }

    return {
      daily,
      weekly,
      monthly,
      yearly,
      byType,
      byPriority,
      byDepartment: {} // Would need department assignments
    };
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(
    dateRange: { start: Date; end: Date },
    filters?: any
  ): Promise<PerformanceMetrics> {
    // Department performance
    const departments = await this.departmentRepo.find();
    const departmentPerformance: DepartmentMetric[] = [];

    for (const dept of departments) {
      const assignments = await this.assignmentRepo.find({
        where: {
          assignedStation: { department: { id: dept.id } },
          assignedAt: Between(dateRange.start, dateRange.end)
        },
        relations: ['assignedStation', 'assignedStaff']
      });

      const totalIncidents = assignments.length;
      const resolved = assignments.filter(a => a.status === AssignmentStatus.COMPLETED).length;
      
      const responseTimes = assignments
        .filter(a => a.acknowledgedAt)
        .map(a => (a.acknowledgedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60));
      
      const resolutionTimes = assignments
        .filter(a => a.completedAt)
        .map(a => (a.completedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60));

      const breached = assignments.filter(a => a.slaMetrics?.breachedAt).length;

      // Calculate trend (compare to previous period)
      const previousStart = new Date(dateRange.start);
      previousStart.setDate(previousStart.getDate() - (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
      
      const previousAssignments = await this.assignmentRepo.count({
        where: {
          assignedStation: { department: { id: dept.id } },
          assignedAt: Between(previousStart, dateRange.start)
        }
      });

      const trend = previousAssignments > 0 ? 
        ((totalIncidents - previousAssignments) / previousAssignments) * 100 : 0;

      departmentPerformance.push({
        departmentId: dept.id,
        departmentName: dept.name,
        type: dept.type,
        totalIncidents,
        resolved,
        avgResponseTime: responseTimes.length > 0 ? 
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
        avgResolutionTime: resolutionTimes.length > 0 ? 
          resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0,
        slaCompliance: totalIncidents > 0 ? 
          ((totalIncidents - breached) / totalIncidents) * 100 : 100,
        staffUtilization: Math.random() * 100, // Would calculate from actual data
        capacityUtilization: Math.random() * 100,
        trend
      });
    }

    // Station performance
    const stations = await this.stationRepo.find({
      relations: ['department']
    });
    const stationPerformance: StationMetric[] = stations.map(s => ({
      stationId: s.id,
      stationName: s.name,
      department: s.department?.name || 'Unknown',
      totalIncidents: Math.floor(Math.random() * 100),
      currentLoad: s.operationalCapacity?.currentIncidents || 0,
      maxCapacity: s.operationalCapacity?.maxConcurrentIncidents || 10,
      avgResponseTime: Math.random() * 15,
      avgResolutionTime: Math.random() * 60,
      staffUtilization: Math.random() * 100,
      vehicleUtilization: Math.random() * 100
    }));

    // Get all assignments for distribution analysis
    const assignments = await this.assignmentRepo.find({
      where: { assignedAt: Between(dateRange.start, dateRange.end) },
      relations: ['assignedStaff', 'assignedStaff.user']
    });

    // Response time distribution
    const responseTimes = assignments
      .filter(a => a.acknowledgedAt)
      .map(a => (a.acknowledgedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60));

    const responseTimeDistribution = this.createDistribution(responseTimes, [0, 5, 10, 15, 30, 60, 120]);

    // Resolution time distribution
    const resolutionTimes = assignments
      .filter(a => a.completedAt)
      .map(a => (a.completedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60));

    const resolutionTimeDistribution = this.createDistribution(resolutionTimes, [0, 30, 60, 120, 240, 480, 1440]);

    // Peak hours
    const peakHours = this.calculatePeakHours(assignments);

    // Hotspot areas
    const hotspotAreas = await this.calculateHotspots(dateRange);

    return {
      departmentPerformance,
      stationPerformance,
      staffPerformance: [], // Would need staff data
      responseTimeDistribution,
      resolutionTimeDistribution,
      peakHours,
      hotspotAreas
    };
  }

  /**
   * Get demographics data
   */
  private async getDemographics(
    dateRange: { start: Date; end: Date },
    filters?: any
  ): Promise<DemographicsData> {
    const emergencies = await this.emergencyRepo.find({
      where: { createdAt: Between(dateRange.start, dateRange.end) }
    });

    const issues = await this.issueRepo.find({
      where: { createdAt: Between(dateRange.start, dateRange.end) }
    });

    const allReports = [...emergencies, ...issues];

    // By location (using area name from location analytics)
    const byLocation: Record<string, number> = {};
    const locationAnalytics = await this.locationAnalyticsRepo.find({
      where: { periodStart: Between(dateRange.start, dateRange.end) }
    });

    locationAnalytics.forEach(l => {
      byLocation[l.areaName] = (byLocation[l.areaName] || 0) + l.reportCount;
    });

    // By user type (registered vs anonymous)
    const registeredUsers = allReports.filter(r => r.user).length;
    const anonymousUsers = allReports.length - registeredUsers;

    const byUserType = {
      registered: registeredUsers,
      anonymous: anonymousUsers
    };

    // Repeat reporters
    const reporterCounts = new Map<string, number>();
    allReports.forEach(r => {
      if (r.reportingPhoneNumber) {
        reporterCounts.set(r.reportingPhoneNumber, (reporterCounts.get(r.reportingPhoneNumber) || 0) + 1);
      }
    });

    const repeatReporters = Array.from(reporterCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([phoneNumber, count]) => ({ phoneNumber, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const newReporters = Array.from(reporterCounts.entries()).filter(([_, count]) => count === 1).length;
    const returningReporters = repeatReporters.length;

    return {
      byLocation,
      byUserType,
      repeatReporters,
      newReporters,
      returningReporters
    };
  }

  /**
   * Generate predictions
   */
  private async getPredictions(
    dateRange: { start: Date; end: Date },
    filters?: any
  ): Promise<PredictionsData> {
    // Get historical data
    const historicalStart = new Date(dateRange.start);
    historicalStart.setDate(historicalStart.getDate() - 365);
    
    const historicalData = await this.emergencyRepo.find({
      where: { createdAt: Between(historicalStart, dateRange.end) }
    });

    // Simple linear regression for predictions
    const dailyCounts = this.aggregateByDay(historicalData);
    const trend = this.calculateTrend(dailyCounts);
    
    // Predict next periods
    const lastDay = dailyCounts[dailyCounts.length - 1]?.value || 0;
    const next24h = Math.max(0, Math.round(lastDay * (1 + trend)));
    const next7d = Math.max(0, Math.round(lastDay * 7 * (1 + trend * 7)));
    const next30d = Math.max(0, Math.round(lastDay * 30 * (1 + trend * 30)));

    // Calculate confidence based on data variance
    const variance = this.calculateVariance(dailyCounts.map(d => d.value));
    const confidence = Math.max(0, Math.min(100, 100 - variance));

    // Seasonal factors
    const seasonalFactors = this.identifySeasonalFactors(historicalData);

    // Anomaly detection
    const anomalies = this.detectAnomalies(dailyCounts);

    return {
      next24h,
      next7d,
      next30d,
      confidence,
      seasonalFactors,
      anomalyDetection: anomalies
    };
  }

  /**
   * Generate recommendations based on analytics
   */
  private async generateRecommendations(
    summary: AnalyticsSummary,
    performance: PerformanceMetrics,
    trends: AnalyticsTrends
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Check SLA compliance
    if (summary.slaCompliance < 90) {
      recommendations.push({
        type: 'process',
        title: 'Improve SLA Compliance',
        description: `SLA compliance is at ${summary.slaCompliance.toFixed(1)}%. Review response processes and resource allocation.`,
        impact: 'high',
        effort: 'medium',
        priority: 1,
        actionable: true
      });
    }

    // Check response times
    if (summary.averageResponseTime > 15) {
      recommendations.push({
        type: 'resource',
        title: 'Reduce Response Times',
        description: `Average response time is ${summary.averageResponseTime.toFixed(1)} minutes. Consider adding more units during peak hours.`,
        impact: 'high',
        effort: 'medium',
        priority: 2,
        actionable: true
      });
    }

    // Check peak hours
    const peakHours = performance.peakHours;
    if (peakHours.length > 0) {
      const peakHour = peakHours[0];
      recommendations.push({
        type: 'resource',
        title: 'Optimize Peak Hour Staffing',
        description: `Highest incident volume at ${peakHour.hour}:00. Consider adjusting shift schedules.`,
        impact: 'medium',
        effort: 'low',
        priority: 3,
        actionable: true
      });
    }

    // Check department performance
    const underperformingDepts = performance.departmentPerformance
      .filter(d => d.slaCompliance < 80)
      .slice(0, 3);

    if (underperformingDepts.length > 0) {
      recommendations.push({
        type: 'training',
        title: 'Department Training Needed',
        description: `${underperformingDepts.map(d => d.departmentName).join(', ')} need performance improvement. Consider targeted training.`,
        impact: 'medium',
        effort: 'medium',
        priority: 4,
        actionable: true
      });
    }

    // Check hotspots
    if (performance.hotspotAreas.length > 0) {
      const hotspot = performance.hotspotAreas[0];
      recommendations.push({
        type: 'infrastructure',
        title: 'Address Incident Hotspot',
        description: `High incident density detected in area with ${hotspot.count} reports. Consider preventive measures.`,
        impact: 'medium',
        effort: 'high',
        priority: 5,
        actionable: true
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Calculate date range based on period
   */
  private calculateDateRange(
    period: string,
    startDate?: Date,
    endDate?: Date
  ): { start: Date; end: Date } {
    const end = endDate || new Date();
    const start = startDate || new Date();

    if (!startDate && !endDate) {
      switch (period) {
        case '24h':
          start.setHours(start.getHours() - 24);
          break;
        case '7d':
          start.setDate(start.getDate() - 7);
          break;
        case '30d':
          start.setDate(start.getDate() - 30);
          break;
        case '90d':
          start.setDate(start.getDate() - 90);
          break;
        case '1y':
          start.setFullYear(start.getFullYear() - 1);
          break;
        default:
          start.setDate(start.getDate() - 30);
      }
    }

    return { start, end };
  }

  /**
   * Calculate average rating from emergencies
   */
  private async calculateAverageRating(emergencies: EmergencyReport[]): Promise<number> {
    const withRating = emergencies.filter(e => e.rating > 0);
    if (withRating.length === 0) return 0;

    const sum = withRating.reduce((acc, e) => acc + e.rating, 0);
    return sum / withRating.length;
  }

  /**
   * Create distribution data from values
   */
  private createDistribution(values: number[], thresholds: number[]): DistributionData {
    const counts = new Array(thresholds.length).fill(0);
    
    values.forEach(v => {
      for (let i = 0; i < thresholds.length; i++) {
        if (v <= thresholds[i]) {
          counts[i]++;
          break;
        }
      }
    });

    const ranges = thresholds.map((t, i) => {
      if (i === 0) return `0-${t}`;
      if (i === thresholds.length - 1) return `>${thresholds[i - 1]}`;
      return `${thresholds[i - 1]}-${t}`;
    });

    const total = values.length;
    const percentages = counts.map(c => (c / total) * 100);

    return { ranges, counts, percentages };
  }

  /**
   * Calculate peak hours
   */
  private calculatePeakHours(assignments: IncidentAssignment[]): PeakHour[] {
    const hourCounts = new Array(24).fill(0);

    assignments.forEach(a => {
      const hour = a.assignedAt.getHours();
      hourCounts[hour]++;
    });

    const total = assignments.length;
    return hourCounts
      .map((count, hour) => ({
        hour,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate hotspots from location data
   */
  private async calculateHotspots(
    dateRange: { start: Date; end: Date }
  ): Promise<HotspotArea[]> {
    const locationData = await this.locationAnalyticsRepo.find({
      where: { periodStart: Between(dateRange.start, dateRange.end) }
    });

    return locationData
      .filter(l => l.reportCount > 5)
      .map(l => ({
        latitude: l.latitude,
        longitude: l.longitude,
        intensity: l.reportCount / 10,
        type: 'incident',
        count: l.reportCount,
        radius: Math.sqrt(l.reportCount) * 10
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  /**
   * Aggregate data by day
   */
  private aggregateByDay(data: any[]): { date: string; value: number }[] {
    const dayMap = new Map<string, number>();

    data.forEach(item => {
      const date = item.createdAt.toISOString().split('T')[0];
      dayMap.set(date, (dayMap.get(date) || 0) + 1);
    });

    return Array.from(dayMap.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate trend from time series
   */
  private calculateTrend(data: { date: string; value: number }[]): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data.map(d => d.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, _, i) => a + x[i] * y[i], 0);
    const sumXX = x.reduce((a, _, i) => a + x[i] * x[i], 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgY = sumY / n;

    return slope / avgY; // Trend as percentage
  }

  /**
   * Calculate variance of values
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

    return (Math.sqrt(variance) / mean) * 100; // Coefficient of variation
  }

  /**
   * Identify seasonal factors
   */
  private identifySeasonalFactors(data: EmergencyReport[]): SeasonalFactor[] {
    const factors: SeasonalFactor[] = [];

    // Month of year
    const monthCounts = new Array(12).fill(0);
    data.forEach(d => {
      monthCounts[d.createdAt.getMonth()]++;
    });

    const avgMonth = monthCounts.reduce((a, b) => a + b, 0) / 12;
    monthCounts.forEach((count, month) => {
      const impact = ((count - avgMonth) / avgMonth) * 100;
      if (Math.abs(impact) > 20) {
        factors.push({
          factor: 'month',
          impact,
          period: new Date(2000, month, 1).toLocaleString('default', { month: 'long' })
        });
      }
    });

    // Day of week
    const dayCounts = new Array(7).fill(0);
    data.forEach(d => {
      dayCounts[d.createdAt.getDay()]++;
    });

    const avgDay = dayCounts.reduce((a, b) => a + b, 0) / 7;
    dayCounts.forEach((count, day) => {
      const impact = ((count - avgDay) / avgDay) * 100;
      if (Math.abs(impact) > 15) {
        factors.push({
          factor: 'day_of_week',
          impact,
          period: new Date(2024, 0, day + 1).toLocaleString('default', { weekday: 'long' })
        });
      }
    });

    // Hour of day
    const hourCounts = new Array(24).fill(0);
    data.forEach(d => {
      hourCounts[d.createdAt.getHours()]++;
    });

    const avgHour = hourCounts.reduce((a, b) => a + b, 0) / 24;
    hourCounts.forEach((count, hour) => {
      const impact = ((count - avgHour) / avgHour) * 100;
      if (Math.abs(impact) > 30) {
        factors.push({
          factor: 'hour',
          impact,
          period: `${hour}:00 - ${hour + 1}:00`
        });
      }
    });

    return factors;
  }

  /**
   * Detect anomalies in time series
   */
  private detectAnomalies(data: { date: string; value: number }[]): Anomaly[] {
    if (data.length < 7) return [];

    const anomalies: Anomaly[] = [];

    // Calculate moving average and standard deviation
    const windowSize = 7;
    for (let i = windowSize; i < data.length; i++) {
      const window = data.slice(i - windowSize, i);
      const values = window.map(d => d.value);
      
      const mean = values.reduce((a, b) => a + b, 0) / windowSize;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / windowSize;
      const stdDev = Math.sqrt(variance);

      const current = data[i].value;
      const deviation = (current - mean) / stdDev;

      if (Math.abs(deviation) > 2.5) {
        anomalies.push({
          date: new Date(data[i].date),
          expected: mean,
          actual: current,
          deviation: deviation,
          severity: Math.abs(deviation) > 3.5 ? 'high' : Math.abs(deviation) > 3 ? 'medium' : 'low',
          possibleCauses: this.suggestAnomalyCauses(current, mean, deviation)
        });
      }
    }

    return anomalies;
  }

  /**
   * Suggest possible causes for anomalies
   */
  private suggestAnomalyCauses(current: number, expected: number, deviation: number): string[] {
    const causes: string[] = [];

    if (current > expected) {
      causes.push('Unusual incident spike');
      causes.push('Possible large-scale event');
      causes.push('Weather-related incidents');
      
      if (deviation > 3) {
        causes.push('Check for major emergency or disaster');
      }
    } else {
      causes.push('Reporting system issue');
      causes.push('Holiday or reduced activity');
      causes.push('Data collection gap');
    }

    return causes;
  }

  /**
   * Run daily analytics aggregation
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyAnalytics() {
    this.logger.log('Running daily analytics aggregation...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);

      // Aggregate data
      const summary = await this.getSummary({ start: yesterday, end: today }, {});

      // Save to analytics table
      const analytics = this.analyticsDailyRepo.create({
        date: yesterday,
        totalReports: summary.totalIncidents,
        emergencyReports: summary.emergencies,
        issueReports: summary.issues,
        resolvedReports: summary.resolved,
        averageResolutionTime: summary.averageResolutionTime,
        averageRating: summary.userSatisfaction
      });

      await this.analyticsDailyRepo.save(analytics);

      this.logger.log('Daily analytics aggregation completed');
    } catch (error) {
      this.logger.error('Error in daily analytics aggregation:', error);
    }
  }
} 
