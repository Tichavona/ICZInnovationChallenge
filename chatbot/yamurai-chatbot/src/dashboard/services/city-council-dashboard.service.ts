/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
// src/dashboard/services/city-council-dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, Not } from 'typeorm';
import { UnifiedDashboardService } from './base-dashboard.service';
import { IssueReport, IssueType, IssueStatus } from '../../database/issue-report.entity';
import { Station } from '../../database/station.entity';
import { IncidentAssignment } from '../../database/incident-assignment.entity';
import { SLAConfig } from '../../database/sla-config.entity';
import { DepartmentStaff, Department } from '../../database/department.entity';
import { GeoDistanceUtil } from '../../shared/utils/geo-distance.util';
import { SLACalculatorUtil } from '../../shared/utils/sla-calculator.util';
import { EmergencyReport } from '../../database/emergency-report.entity';
import { DashboardUser, DashboardNotification } from '../../database/dashboard.entity';
import { NotificationGateway } from '../notifications/notification.gateway';

export enum CouncilIssueCategory {
  ROADS = 'roads',
  STREET_LIGHTS = 'street_lights',
  SIDEWALKS = 'sidewalks',
  TRAFFIC_SIGNS = 'traffic_signs',
  DRAINAGE = 'drainage',
  PARKS = 'parks',
  PUBLIC_BUILDINGS = 'public_buildings',
  NOISE_COMPLAINT = 'noise_complaint',
  STREET_VENDING = 'street_vending',
  PARKING = 'parking',
  GRAFFITI = 'graffiti',
  OVERGROWN_VEGETATION = 'overgrown_vegetation',
  OTHER = 'OTHER'
}

export enum CouncilPriority {
  CRITICAL = 'critical',     // Safety hazards, major infrastructure failure
  HIGH = 'high',             // Disruptive issues, multiple complaints
  MEDIUM = 'medium',         // Standard maintenance
  LOW = 'low'                // Cosmetic issues, minor repairs
}

// Define interfaces for type safety
interface WardBreakdown {
  [key: string]: {
    totalIssues: number;
    criticalIssues: number;
    resolvedThisMonth: number;
    averageResponseDays: number;
  };
}

interface CategoryMetrics {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  avgRepairTime: number;
}

interface InfrastructureHealth {
  overallHealthScore: number;
  totalActiveIssues: number;
  criticalIssues: number;
  byCategory: Record<CouncilIssueCategory, CategoryMetrics>;
  byWard: WardBreakdown;
  infrastructureAge: InfrastructureAgeData;
  maintenanceBacklog: MaintenanceBacklog;
}

interface InfrastructureAgeData {
  roads: { averageAge: number; lastMajorUpgrade: number; condition: string };
  waterMains: { averageAge: number; lastMajorUpgrade: number; condition: string };
  streetLights: { averageAge: number; lastMajorUpgrade: number; condition: string };
  drainage: { averageAge: number; lastMajorUpgrade: number; condition: string };
}

interface MaintenanceBacklog {
  totalPending: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  estimatedCompletionWeeks: number;
  requiredResources: {
    crew: string;
    equipment: string;
    budget: number;
  };
}

interface TrendData {
  [key: string]: any;
  totalRequests: number;
  resolved: number;
  averageResolutionTime: number;
  byCategory: Record<string, number>;
}

interface SeasonalityAnalysis {
  peakMonths: string[];
  lowMonths: string[];
  seasonalFactor: number;
  weatherCorrelation: number;
}

interface ForecastData {
  nextMonth: number;
  nextQuarter: number;
  nextYear: number;
  confidence: number;
}

interface BudgetCategory {
  allocated: number;
  spent: number;
  commitments: number;
}

export interface BudgetUtilization {
  fiscalYear: number;
  summary: {
    totalBudget: number;
    totalSpent: number;
    totalCommitted: number;
    remainingBudget: number;
    utilizationRate: number;
    projectedYearEnd: number;
  };
  byCategory: Record<string, BudgetCategory>;
  monthlySpending: MonthlySpending[];
  varianceAnalysis: VarianceAnalysis[];
}

interface MonthlySpending {
  month: string;
  actual: number;
  budget: number;
  variance: number;
}

interface VarianceAnalysis {
  category: string;
  variance: number;
  reason: string;
  recommendation: string;
}

interface SatisfactionMetrics {
  period: string;
  overallSatisfaction: number;
  responseRate: number;
  ratingDistribution: Record<number, number>;
  byCategory: Record<string, { total: number; sum: number; average: number }>;
  feedbackThemes: FeedbackTheme[];
  topComplaints: FeedbackTheme[];
  improvementAreas: string[];
}

interface FeedbackTheme {
  theme: string;
  count: number;
}

interface WardPerformance {
  ward: string;
  totalIssues: number;
  activeIssues: number;
  resolutionRate: number;
  avgResolutionTimeDays: number;
  topCategories: Array<{ category: string; count: number }>;
  satisfactionScore: number;
  comparisonToCity: CityComparison;
  recommendations: string[];
}

interface CityComparison {
  resolutionTime: {
    ward: number;
    city: number;
    difference: number;
  };
  satisfaction: {
    ward: number;
    city: number;
  };
}

interface DuplicateReport {
  id: number;
  reportedAt: Date;
  status: IssueStatus;
}

// Use type intersection instead of interface extension to avoid conflicts
export type IssueWithMetadata = IssueReport & {
  category: CouncilIssueCategory;
  priority: CouncilPriority;
  estimatedRepairCost: number;
  affectedResidents: number;
  ward: string;
  requiresEmergency: boolean;
  duplicateReports: DuplicateReport[];
};

@Injectable()
export class CityCouncilDashboardService extends UnifiedDashboardService {
  getCivicIssues(filters: { type: "sewer" | "pothole" | "street_light" | "water_pipe" | "sidewalk" | "graffiti" | "other" | undefined; status: string | undefined; district: string | undefined; ward: string | undefined; timeframe: "24h" | "7d" | "30d" | "90d" | undefined; priority: "critical" | "high" | "medium" | "low" | undefined; }) {
      throw new Error('Method not implemented.');
  }
  getIssuesByDistrict(district: string, status: string | undefined) {
      throw new Error('Method not implemented.');
  }
  getIssueDetails(id: string) {
      throw new Error('Method not implemented.');
  }
  updateIssueStatus(id: string, updateDto: { status: "reported" | "assigned" | "in_progress" | "resolved" | "closed"; notes?: string; resolutionNotes?: string; resolvedAt?: Date; }, id1: any) {
      throw new Error('Method not implemented.');
  }
  assignIssue(id: string, assignDto: { crewId: string; supervisorId: string; estimatedCompletion: Date; priority: "high" | "medium" | "low"; equipmentNeeded?: string[]; }) {
      throw new Error('Method not implemented.');
  }
  getResolutionTimeAnalytics(period: string, issueType: string | undefined, district: string | undefined) {
      throw new Error('Method not implemented.');
  }
  getIssueBreakdown(district: string | undefined, ward: string | undefined, days: number) {
      throw new Error('Method not implemented.');
  }
  getWorkCrews(district: string | undefined, status: string | undefined) {
      throw new Error('Method not implemented.');
  }
  getCrewDetails(id: string) {
      throw new Error('Method not implemented.');
  }
  updateCrewStatus(id: string, updateDto: { status: "available" | "assigned" | "working" | "off_duty"; currentLocation?: { latitude: number; longitude: number; }; estimatedAvailable?: Date; }) {
      throw new Error('Method not implemented.');
  }
  getEquipmentFleet(type: string | undefined, status: string | undefined) {
      throw new Error('Method not implemented.');
  }
  scheduleMaintenance(scheduleDto: { equipmentId: string; maintenanceType: "routine" | "repair" | "inspection"; scheduledDate: Date; estimatedDuration: number; notes?: string; }) {
      throw new Error('Method not implemented.');
  }
  getCostAnalysis(issueType: string | undefined, period: string) {
      throw new Error('Method not implemented.');
  }
  getSatisfactionMetrics(district: string | undefined, days: number) {
      throw new Error('Method not implemented.');
  }
  getIssueHotspots // Create a new object with all properties from issue plus computed properties
      (issueType: string | undefined, days: number, minOccurrences: number) {
          throw new Error('Method not implemented.');
  }
  schedulePreventiveMaintenance(scheduleDto: { hotspotId: string; issueType: string; scheduledDate: Date; crewId: string; estimatedCost: number; priority: "high" | "medium" | "low"; }) {
      throw new Error('Method not implemented.');
  }
  getContractorPerformance(contractorId: string | undefined, period: string) {
      throw new Error('Method not implemented.');
  }
  getPublicWorksProjects(status: string | undefined, district: string | undefined) {
      throw new Error('Method not implemented.');
  }
  createProject(projectDto: { name: string; description: string; location: string; district: string; ward: string; startDate: Date; estimatedEndDate: Date; budget: number; contractor?: string; projectManager: string; }) {
      throw new Error('Method not implemented.');
  }
  updateProjectProgress(id: string, progressDto: { percentageComplete: number; status: "planned" | "in_progress" | "completed" | "delayed"; actualEndDate?: Date; notes: string; updatedBy: string; }) {
      throw new Error('Method not implemented.');
  }
  getWeatherImpact(days: number, operation: string | undefined) {
      throw new Error('Method not implemented.');
  }
  getHolidaySchedule(date: Date | undefined, service: string | undefined) {
      throw new Error('Method not implemented.');
  }
  private readonly councilIssueTypes = [
    IssueType.POTHOLE,
    IssueType.SEWER,
    IssueType.WATER_PIPE_BURST,
    IssueType.OTHER
  ];

  constructor(
    @InjectRepository(IssueReport)
    protected issueRepo: Repository<IssueReport>,
    @InjectRepository(EmergencyReport)
    protected emergencyRepo: Repository<EmergencyReport>,
    @InjectRepository(Station)
    protected stationRepo: Repository<Station>,
    @InjectRepository(IncidentAssignment)
    protected assignmentRepo: Repository<IncidentAssignment>,
    @InjectRepository(DepartmentStaff)
    protected staffRepo: Repository<DepartmentStaff>,
    @InjectRepository(Department)
    protected departmentRepo: Repository<Department>,
    @InjectRepository(DashboardUser)
    protected dashboardUserRepo: Repository<DashboardUser>,
    @InjectRepository(SLAConfig)
    protected slaConfigRepo: Repository<SLAConfig>,
    @InjectRepository(DashboardNotification)
    protected notificationRepo: Repository<DashboardNotification>,
    protected geoUtil: GeoDistanceUtil,
    protected slaUtil: SLACalculatorUtil,
    protected notificationGateway: NotificationGateway,
  ) {
    super(
      emergencyRepo,
      issueRepo,
      assignmentRepo,
      departmentRepo,
      stationRepo,
      staffRepo,
      dashboardUserRepo,
      slaConfigRepo,
      notificationRepo,
      notificationGateway
    );
  }

  async getCouncilIssues(filters: {
    category?: CouncilIssueCategory;
    status?: IssueStatus;
    priority?: CouncilPriority;
    stationId?: string;
    ward?: string;
    district?: string;
    timeframe?: '24h' | '7d' | '30d' | '90d';
    includeEmergency?: boolean;
  }): Promise<IssueWithMetadata[]> {
    const timeframeMap = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };

    const queryBuilder = this.issueRepo
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.assignments', 'assignments')
      .leftJoinAndSelect('assignments.assignedStation', 'station')
      .where('issue.type IN (:...types)', { types: this.councilIssueTypes });

    if (filters.status) {
      queryBuilder.andWhere('issue.status = :status', { status: filters.status });
    }

    if (filters.timeframe) {
      const since = new Date(Date.now() - timeframeMap[filters.timeframe]);
      queryBuilder.andWhere('issue.createdAt >= :since', { since });
    }

    if (filters.stationId) {
      queryBuilder.andWhere('station.id = :stationId', { stationId: filters.stationId });
    }

    if (filters.ward) {
      queryBuilder.andWhere('issue.location LIKE :ward', { ward: `%${filters.ward}%` });
    }

    const issues = await queryBuilder.getMany();
    const allIssues = await this.issueRepo.find();

    // Properly map each issue to IssueWithMetadata
    return issues.map(issue => this.enrichIssueWithMetadata(issue, allIssues));
  }

  // Helper method to enrich an issue with metadata
  private enrichIssueWithMetadata(issue: IssueReport, allIssues: IssueReport[]): IssueWithMetadata {
    // Create a new object with all properties from issue plus computed properties
    const enrichedIssue = {
        ...issue,
        category: this.classifyCouncilIssue(issue),
        priority: this.calculateCouncilPriority(issue),
        estimatedRepairCost: this.estimateRepairCost(issue),
        affectedResidents: this.estimateAffectedResidents(issue),
        ward: this.extractWard(issue),
        requiresEmergency: this.requiresEmergencyResponse(issue),
        duplicateReports: this.findDuplicateReports(issue, allIssues)
    } as unknown as IssueWithMetadata; // Double assertion to bypass type checking

    return enrichedIssue;
    }

  async getInfrastructureHealthMetrics(
    ward?: string,
    district?: string
  ): Promise<InfrastructureHealth> {
    const issues = await this.issueRepo.find({
      where: {
        type: In(this.councilIssueTypes),
        status: Not(IssueStatus.RESOLVED)
      }
    });

    // Initialize categories with proper typing
    const categories: Record<CouncilIssueCategory, CategoryMetrics> = {
      [CouncilIssueCategory.ROADS]: { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgRepairTime: 0 },
      [CouncilIssueCategory.STREET_LIGHTS]: { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgRepairTime: 0 },
      [CouncilIssueCategory.SIDEWALKS]: { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgRepairTime: 0 },
      [CouncilIssueCategory.DRAINAGE]: { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgRepairTime: 0 },
      [CouncilIssueCategory.PARKS]: { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgRepairTime: 0 },
      [CouncilIssueCategory.PUBLIC_BUILDINGS]: { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgRepairTime: 0 },
      [CouncilIssueCategory.TRAFFIC_SIGNS]: { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgRepairTime: 0 },
      [CouncilIssueCategory.NOISE_COMPLAINT]: { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgRepairTime: 0 },
      [CouncilIssueCategory.STREET_VENDING]: { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgRepairTime: 0 },
      [CouncilIssueCategory.PARKING]: { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgRepairTime: 0 },
      [CouncilIssueCategory.GRAFFITI]: { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgRepairTime: 0 },
      [CouncilIssueCategory.OVERGROWN_VEGETATION]: { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgRepairTime: 0 },
      [CouncilIssueCategory.OTHER]: { total: 0, critical: 0, high: 0, medium: 0, low: 0, avgRepairTime: 0 }
    };

    issues.forEach(issue => {
      const category = this.classifyCouncilIssue(issue);
      const priority = this.calculateCouncilPriority(issue);
      
      if (categories[category]) {
        categories[category].total++;
        categories[category][priority]++;
      }
    });

    // Calculate overall health score
    const totalIssues = issues.length;
    const criticalIssues = issues.filter(i => 
      this.calculateCouncilPriority(i) === CouncilPriority.CRITICAL
    ).length;

    const healthScore = totalIssues === 0 ? 100 : 
      Math.max(0, 100 - (criticalIssues / totalIssues) * 50);

    return {
      overallHealthScore: healthScore,
      totalActiveIssues: totalIssues,
      criticalIssues,
      byCategory: categories,
      byWard: await this.getWardBreakdown(ward),
      infrastructureAge: await this.getInfrastructureAgeData(district),
      maintenanceBacklog: await this.getMaintenanceBacklog(ward)
    };
  }

  async getServiceRequestTrends(
    period: 'weekly' | 'monthly' | 'quarterly' = 'monthly',
    category?: CouncilIssueCategory
  ): Promise<{
    period: string;
    trends: TrendData[];
    seasonality: SeasonalityAnalysis;
    forecast: ForecastData;
  }> {
    const now = new Date();
    const intervals: Date[] = [];
    let intervalLabel: string;

    switch (period) {
      case 'weekly':
        // Last 8 weeks
        for (let i = 7; i >= 0; i--) {
          intervals.push(new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000));
        }
        intervalLabel = 'week';
        break;
      case 'monthly':
        // Last 12 months
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          intervals.push(date);
        }
        intervalLabel = 'month';
        break;
      case 'quarterly':
        // Last 8 quarters
        for (let i = 7; i >= 0; i--) {
          const quarter = Math.floor((now.getMonth() - i * 3) / 3);
          const year = now.getFullYear() + Math.floor((now.getMonth() - i * 3) / 12);
          intervals.push(new Date(year, quarter * 3, 1));
        }
        intervalLabel = 'quarter';
        break;
    }

    const trends = await Promise.all(
      intervals.map(async (interval, index) => {
        const nextInterval = intervals[index + 1] || new Date();
        
        const queryBuilder = this.issueRepo
          .createQueryBuilder('issue')
          .where('issue.type IN (:...types)', { types: this.councilIssueTypes })
          .andWhere('issue.createdAt BETWEEN :start AND :end', {
            start: interval,
            end: nextInterval
          });

        const issues = await queryBuilder.getMany();

        const trendData: TrendData = {
          [intervalLabel]: interval.toLocaleDateString(),
          totalRequests: issues.length,
          resolved: issues.filter(i => i.status === IssueStatus.RESOLVED).length,
          averageResolutionTime: this.calculateAvgResolutionTime(issues),
          byCategory: this.groupByCategory(issues)
        };

        return trendData;
      })
    );

    return {
      period,
      trends,
      seasonality: this.analyzeSeasonality(trends),
      forecast: this.generateForecast(trends)
    };
  }

  async getBudgetUtilization(
    fiscalYear: number = new Date().getFullYear(),
    department?: string
  ): Promise<BudgetUtilization> {
    // Mock budget data - in production, this would come from financial system
    const budgetCategories: Record<string, BudgetCategory> = {
      roads: { allocated: 5000000, spent: 3200000, commitments: 800000 },
      lighting: { allocated: 2000000, spent: 1450000, commitments: 200000 },
      drainage: { allocated: 3000000, spent: 2100000, commitments: 400000 },
      parks: { allocated: 1500000, spent: 900000, commitments: 200000 },
      buildings: { allocated: 2500000, spent: 1800000, commitments: 300000 }
    };

    const totalAllocated = Object.values(budgetCategories).reduce(
      (sum, cat) => sum + cat.allocated, 0
    );
    const totalSpent = Object.values(budgetCategories).reduce(
      (sum, cat) => sum + cat.spent, 0
    );
    const totalCommitted = Object.values(budgetCategories).reduce(
      (sum, cat) => sum + cat.commitments, 0
    );

    const byCategory = department && budgetCategories[department] ? 
      { [department]: budgetCategories[department] } : 
      budgetCategories;

    return {
      fiscalYear,
      summary: {
        totalBudget: totalAllocated,
        totalSpent,
        totalCommitted,
        remainingBudget: totalAllocated - totalSpent - totalCommitted,
        utilizationRate: (totalSpent / totalAllocated) * 100,
        projectedYearEnd: this.calculateProjectedYearEnd(totalSpent, totalAllocated)
      },
      byCategory,
      monthlySpending: await this.getMonthlySpending(fiscalYear),
      varianceAnalysis: this.analyzeVariance(byCategory)
    };
  }

  async getCitizenSatisfactionMetrics(
    ward?: string,
    timeframe: '30d' | '90d' | 'year' = '90d'
  ): Promise<SatisfactionMetrics> {
    const timeframeMap = {
      '30d': 30,
      '90d': 90,
      'year': 365
    };

    const days = timeframeMap[timeframe];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const resolvedIssues = await this.issueRepo
      .createQueryBuilder('issue')
      .where('issue.type IN (:...types)', { types: this.councilIssueTypes })
      .andWhere('issue.status = :status', { status: IssueStatus.RESOLVED })
      .andWhere('issue.resolvedAt >= :since', { since })
      .andWhere('issue.rating > 0')
      .getMany();

    const averageRating = resolvedIssues.length > 0 ? 
      resolvedIssues.reduce((sum, issue) => sum + (issue.rating || 0), 0) / resolvedIssues.length : 0;

    const ratingDistribution: Record<number, number> = {
      5: resolvedIssues.filter(i => i.rating === 5).length,
      4: resolvedIssues.filter(i => i.rating === 4).length,
      3: resolvedIssues.filter(i => i.rating === 3).length,
      2: resolvedIssues.filter(i => i.rating === 2).length,
      1: resolvedIssues.filter(i => i.rating === 1).length
    };

    const feedbackThemes = this.analyzeFeedbackThemes(resolvedIssues);

    return {
      period: timeframe,
      overallSatisfaction: averageRating,
      responseRate: resolvedIssues.length > 0 ? (resolvedIssues.length / days) * 100 : 0,
      ratingDistribution,
      byCategory: this.getSatisfactionByCategory(resolvedIssues),
      feedbackThemes,
      topComplaints: feedbackThemes.slice(0, 5),
      improvementAreas: this.identifyImprovementAreas(resolvedIssues)
    };
  }

  async getWardPerformance(ward: string): Promise<WardPerformance> {
    const issues = await this.issueRepo
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.assignments', 'assignments')
      .where('issue.location LIKE :ward', { ward: `%${ward}%` })
      .getMany();

    const resolvedIssues = issues.filter(i => i.status === IssueStatus.RESOLVED);
    const avgResolutionTime = this.calculateAvgResolutionTime(resolvedIssues);

    return {
      ward,
      totalIssues: issues.length,
      activeIssues: issues.filter(i => i.status !== IssueStatus.RESOLVED).length,
      resolutionRate: issues.length > 0 ? (resolvedIssues.length / issues.length) * 100 : 0,
      avgResolutionTimeDays: Math.round(avgResolutionTime / 24 / 60 * 10) / 10,
      topCategories: this.getTopCategories(issues),
      satisfactionScore: issues.length > 0 ? 
        issues.reduce((sum, i) => sum + (i.rating || 0), 0) / issues.length : 0,
      comparisonToCity: this.compareToCityAverage(issues),
      recommendations: this.generateWardRecommendations(issues)
    };
  }

  // Helper methods
  private classifyCouncilIssue(issue: IssueReport): CouncilIssueCategory {
    const description = issue.description?.toLowerCase() || '';
    const type = issue.type;

    if (type === IssueType.POTHOLE) return CouncilIssueCategory.ROADS;
    if (type === IssueType.SEWER) return CouncilIssueCategory.DRAINAGE;
    if (type === IssueType.WATER_PIPE_BURST) return CouncilIssueCategory.DRAINAGE;

    if (description.includes('street light') || description.includes('streetlight')) {
      return CouncilIssueCategory.STREET_LIGHTS;
    }
    if (description.includes('sidewalk') || description.includes('pavement')) {
      return CouncilIssueCategory.SIDEWALKS;
    }
    if (description.includes('traffic sign') || description.includes('road sign')) {
      return CouncilIssueCategory.TRAFFIC_SIGNS;
    }
    if (description.includes('park') || description.includes('playground')) {
      return CouncilIssueCategory.PARKS;
    }
    if (description.includes('noise') || description.includes('loud')) {
      return CouncilIssueCategory.NOISE_COMPLAINT;
    }
    if (description.includes('graffiti')) {
      return CouncilIssueCategory.GRAFFITI;
    }
    if (description.includes('vegetation') || description.includes('overgrown')) {
      return CouncilIssueCategory.OVERGROWN_VEGETATION;
    }

    return CouncilIssueCategory.OTHER;
  }

  private calculateCouncilPriority(issue: IssueReport): CouncilPriority {
    const category = this.classifyCouncilIssue(issue);
    const description = issue.description?.toLowerCase() || '';

    // Critical priority conditions
    if (
      description.includes('collapse') ||
      description.includes('sinkhole') ||
      description.includes('flooding') ||
      description.includes('electrical hazard') ||
      description.includes('gas leak')
    ) {
      return CouncilPriority.CRITICAL;
    }

    // Category-based priority
    switch (category) {
      case CouncilIssueCategory.ROADS:
        if (description.includes('major')) return CouncilPriority.HIGH;
        if (description.includes('minor')) return CouncilPriority.MEDIUM;
        return CouncilPriority.MEDIUM;
      
      case CouncilIssueCategory.STREET_LIGHTS:
        if (description.includes('multiple') || description.includes('intersection')) {
          return CouncilPriority.HIGH;
        }
        return CouncilPriority.MEDIUM;
      
      case CouncilIssueCategory.DRAINAGE:
        return CouncilPriority.HIGH;
      
      case CouncilIssueCategory.SIDEWALKS:
        if (description.includes('trip') || description.includes('hazard')) {
          return CouncilPriority.HIGH;
        }
        return CouncilPriority.MEDIUM;
      
      default:
        return CouncilPriority.LOW;
    }
  }

  private estimateRepairCost(issue: IssueReport): number {
    const priority = this.calculateCouncilPriority(issue);
    const category = this.classifyCouncilIssue(issue);

    const baseCosts: Record<string, Record<CouncilPriority, number>> = {
      [CouncilIssueCategory.ROADS]: { 
        [CouncilPriority.CRITICAL]: 5000, 
        [CouncilPriority.HIGH]: 2000, 
        [CouncilPriority.MEDIUM]: 800, 
        [CouncilPriority.LOW]: 300 
      },
      [CouncilIssueCategory.STREET_LIGHTS]: { 
        [CouncilPriority.CRITICAL]: 1000, 
        [CouncilPriority.HIGH]: 500, 
        [CouncilPriority.MEDIUM]: 200, 
        [CouncilPriority.LOW]: 100 
      },
      [CouncilIssueCategory.SIDEWALKS]: { 
        [CouncilPriority.CRITICAL]: 3000, 
        [CouncilPriority.HIGH]: 1500, 
        [CouncilPriority.MEDIUM]: 600, 
        [CouncilPriority.LOW]: 200 
      },
      [CouncilIssueCategory.DRAINAGE]: { 
        [CouncilPriority.CRITICAL]: 8000, 
        [CouncilPriority.HIGH]: 4000, 
        [CouncilPriority.MEDIUM]: 1500, 
        [CouncilPriority.LOW]: 500 
      }
    };

    const defaultCosts = { 
      [CouncilPriority.CRITICAL]: 2000, 
      [CouncilPriority.HIGH]: 1000, 
      [CouncilPriority.MEDIUM]: 500, 
      [CouncilPriority.LOW]: 200 
    };

    const costs = baseCosts[category] || defaultCosts;
    return costs[priority] || costs[CouncilPriority.MEDIUM];
  }

  private estimateAffectedResidents(issue: IssueReport): number {
    const priority = this.calculateCouncilPriority(issue);
    
    switch (priority) {
      case CouncilPriority.CRITICAL: return Math.floor(Math.random() * 100) + 50;
      case CouncilPriority.HIGH: return Math.floor(Math.random() * 50) + 20;
      case CouncilPriority.MEDIUM: return Math.floor(Math.random() * 20) + 5;
      default: return Math.floor(Math.random() * 5) + 1;
    }
  }

  private extractWard(issue: IssueReport): string {
    const location = issue.location || '';
    const wardMatch = location.match(/ward\s+(\d+)/i);
    return wardMatch ? `Ward ${wardMatch[1]}` : 'Unknown';
  }

  private requiresEmergencyResponse(issue: IssueReport): boolean {
    const priority = this.calculateCouncilPriority(issue);
    return priority === CouncilPriority.CRITICAL;
  }

  private findDuplicateReports(issue: IssueReport, allIssues: IssueReport[]): DuplicateReport[] {
    const similarIssues = allIssues.filter(i => 
      i.id !== issue.id &&
      Math.abs(Number(i.latitude) - Number(issue.latitude)) < 0.001 &&
      Math.abs(Number(i.longitude) - Number(issue.longitude)) < 0.001 &&
      i.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    return similarIssues.map(i => ({
      id: i.id,
      reportedAt: i.createdAt,
      status: i.status
    }));
  }

  private async getWardBreakdown(ward?: string): Promise<WardBreakdown> {
    // Mock ward data
    const wards = ward ? [ward] : ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5'];
    
    const breakdown: WardBreakdown = {};
    for (const w of wards) {
      breakdown[w] = {
        totalIssues: Math.floor(Math.random() * 50) + 10,
        criticalIssues: Math.floor(Math.random() * 5),
        resolvedThisMonth: Math.floor(Math.random() * 20) + 5,
        averageResponseDays: Math.floor(Math.random() * 5) + 1
      };
    }
    
    return breakdown;
  }

  private async getInfrastructureAgeData(district?: string): Promise<InfrastructureAgeData> {
    // Mock infrastructure age data
    return {
      roads: { averageAge: 15, lastMajorUpgrade: 2018, condition: 'fair' },
      waterMains: { averageAge: 25, lastMajorUpgrade: 2010, condition: 'poor' },
      streetLights: { averageAge: 8, lastMajorUpgrade: 2022, condition: 'good' },
      drainage: { averageAge: 20, lastMajorUpgrade: 2015, condition: 'fair' }
    };
  }

  private async getMaintenanceBacklog(ward?: string): Promise<MaintenanceBacklog> {
    return {
      totalPending: 156,
      byPriority: {
        critical: 12,
        high: 34,
        medium: 68,
        low: 42
      },
      estimatedCompletionWeeks: 8,
      requiredResources: {
        crew: '3 teams',
        equipment: '2 excavators, 5 trucks',
        budget: 450000
      }
    };
  }

  private calculateAvgResolutionTime(issues: IssueReport[]): number {
    if (issues.length === 0) return 0;
    
    const issuesWithResolution = issues.filter(i => i.resolvedAt);
    if (issuesWithResolution.length === 0) return 0;

    const totalTime = issuesWithResolution.reduce((sum, issue) => {
      if (issue.resolvedAt) {
        const resolutionTime = (issue.resolvedAt.getTime() - issue.createdAt.getTime()) / (1000 * 60);
        return sum + resolutionTime;
      }
      return sum;
    }, 0);

    return totalTime / issuesWithResolution.length;
  }

  private groupByCategory(issues: IssueReport[]): Record<string, number> {
    return issues.reduce((acc: Record<string, number>, issue) => {
      const category = this.classifyCouncilIssue(issue);
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category]++;
      return acc;
    }, {});
  }

  private analyzeSeasonality(trends: TrendData[]): SeasonalityAnalysis {
    // Simple seasonality analysis
    return {
      peakMonths: ['January', 'March', 'August'],
      lowMonths: ['February', 'November'],
      seasonalFactor: 1.2,
      weatherCorrelation: 0.7
    };
  }

  private generateForecast(trends: TrendData[]): ForecastData {
    const lastValue = trends.length > 0 ? trends[trends.length - 1]?.totalRequests || 0 : 0;
    const growth = 0.05; // Assume 5% growth
    
    return {
      nextMonth: Math.round(lastValue * (1 + growth)),
      nextQuarter: Math.round(lastValue * (1 + growth * 3)),
      nextYear: Math.round(lastValue * (1 + growth * 12)),
      confidence: 0.85
    };
  }

  private calculateProjectedYearEnd(spent: number, allocated: number): number {
    const monthsRemaining = 6; // Assuming halfway through year
    const monthlyAverage = spent / 6;
    return spent + (monthlyAverage * monthsRemaining);
  }

  private async getMonthlySpending(fiscalYear: number): Promise<MonthlySpending[]> {
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      actual: Math.floor(Math.random() * 400000) + 200000,
      budget: 400000,
      variance: Math.floor(Math.random() * 50000) - 25000
    }));
  }

  private analyzeVariance(categories: Record<string, BudgetCategory>): VarianceAnalysis[] {
    const variances: VarianceAnalysis[] = [];
    
    for (const [cat, data] of Object.entries(categories)) {
      const variance = (data.spent / data.allocated) - 1;
      if (Math.abs(variance) > 0.1) {
        variances.push({
          category: cat,
          variance: variance * 100,
          reason: variance > 0 ? 'Overspending' : 'Underspending',
          recommendation: variance > 0 ? 'Review budget allocation' : 'Accelerate projects'
        });
      }
    }
    return variances;
  }

  private analyzeFeedbackThemes(issues: IssueReport[]): FeedbackTheme[] {
    const themes: Record<string, number> = {
      'Response Time': 0,
      'Quality of Work': 0,
      'Communication': 0,
      'Crew Professionalism': 0,
      'Follow-up': 0
    };

    issues.forEach(issue => {
      const feedback = issue.userFeedback?.toLowerCase() || '';
      if (feedback.includes('slow') || feedback.includes('delay')) themes['Response Time']++;
      if (feedback.includes('quality') || feedback.includes('workmanship')) themes['Quality of Work']++;
      if (feedback.includes('communication') || feedback.includes('update')) themes['Communication']++;
      if (feedback.includes('professional') || feedback.includes('polite')) themes['Crew Professionalism']++;
      if (feedback.includes('follow') || feedback.includes('forgot')) themes['Follow-up']++;
    });

    return Object.entries(themes)
      .map(([theme, count]) => ({ theme, count }))
      .sort((a, b) => b.count - a.count);
  }

  private getSatisfactionByCategory(issues: IssueReport[]): Record<string, { total: number; sum: number; average: number }> {
    const byCategory: Record<string, { total: number; sum: number; average: number }> = {};
    
    issues.forEach(issue => {
      const category = this.classifyCouncilIssue(issue);
      if (!byCategory[category]) {
        byCategory[category] = { total: 0, sum: 0, average: 0 };
      }
      byCategory[category].total++;
      byCategory[category].sum += issue.rating || 0;
    });

    Object.keys(byCategory).forEach(cat => {
      if (byCategory[cat].total > 0) {
        byCategory[cat].average = byCategory[cat].sum / byCategory[cat].total;
      }
    });

    return byCategory;
  }

  private identifyImprovementAreas(issues: IssueReport[]): string[] {
    const lowRated = issues.filter(i => i.rating && i.rating < 3);
    const improvementAreas = new Set<string>();

    lowRated.forEach(issue => {
      const category = this.classifyCouncilIssue(issue);
      improvementAreas.add(`${category} response time`);
      if (issue.userFeedback?.toLowerCase().includes('communication')) {
        improvementAreas.add('customer communication');
      }
    });

    return Array.from(improvementAreas).slice(0, 3);
  }

  private getTopCategories(issues: IssueReport[]): Array<{ category: string; count: number }> {
    const categoryCount = this.groupByCategory(issues);
    return Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private compareToCityAverage(issues: IssueReport[]): CityComparison {
    const cityAvgResolution = 5; // days
    const wardAvgResolution = this.calculateAvgResolutionTime(issues) / 24 / 60; // convert to days
    
    return {
      resolutionTime: {
        ward: Math.round(wardAvgResolution * 10) / 10,
        city: cityAvgResolution,
        difference: Math.round((wardAvgResolution - cityAvgResolution) * 10) / 10
      },
      satisfaction: {
        ward: issues.length > 0 ? 
          issues.reduce((sum, i) => sum + (i.rating || 0), 0) / issues.length : 0,
        city: 3.8
      }
    };
  }

  private generateWardRecommendations(issues: IssueReport[]): string[] {
    const recommendations: string[] = [];
    const topCategories = this.getTopCategories(issues);

    if (topCategories.length > 0 && topCategories[0]?.count > 20) {
      recommendations.push(`Consider dedicated team for ${topCategories[0].category} issues`);
    }

    if (this.calculateAvgResolutionTime(issues) > 7 * 24 * 60) { // > 7 days
      recommendations.push('Review resource allocation to improve response times');
    }

    return recommendations;
  }
}