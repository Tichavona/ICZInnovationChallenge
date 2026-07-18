/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/department/services/department-analytics.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Department, DepartmentType } from '../../database/department.entity';
import { DepartmentStaff } from '../../database/department.entity';
import { EmergencyReport, EmergencyStatus } from '../../database/emergency-report.entity';
import { IssueReport, IssueStatus } from '../../database/issue-report.entity';

@Injectable()
export class DepartmentAnalyticsService {
  private readonly logger = new Logger(DepartmentAnalyticsService.name);

  constructor(
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(DepartmentStaff)
    private staffRepository: Repository<DepartmentStaff>,
    @InjectRepository(EmergencyReport)
    private emergencyRepository: Repository<EmergencyReport>,
    @InjectRepository(IssueReport)
    private issueRepository: Repository<IssueReport>
  ) {}

  /**
   * Get comprehensive department analytics for managerial dashboard
   */
  async getDepartmentAnalytics(
    departmentId: string,
    timeframe: '24h' | '7d' | '30d' | '90d' = '30d'
  ): Promise<{
    overview: any;
    performance: any;
    staff: any;
    incidents: any;
    trends: any;
  }> {
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId }
    });

    if (!department) {
      throw new Error(`Department ${departmentId} not found`);
    }

    const dateRange = this.getDateRange(timeframe);

    const [overview, performance, staffAnalytics, incidentAnalytics, trends] = 
      await Promise.all([
        this.getOverviewMetrics(department, dateRange),
        this.getPerformanceMetrics(department, dateRange),
        this.getStaffAnalytics(department),
        this.getIncidentAnalytics(department, dateRange),
        this.getTrendAnalysis(department, timeframe)
      ]);

    return {
      overview,
      performance,
      staff: staffAnalytics,
      incidents: incidentAnalytics,
      trends
    };
  }
    getOverviewMetrics(department: Department, dateRange: { start: Date; end: Date; }): any {
        throw new Error('Method not implemented.');
    }
    getPerformanceMetrics(department: Department, dateRange: { start: Date; end: Date; }): any {
        throw new Error('Method not implemented.');
    }
    getStaffAnalytics(department: Department): any {
        throw new Error('Method not implemented.');
    }
    getTrendAnalysis(department: Department, timeframe: string): any {
        throw new Error('Method not implemented.');
    }

  /**
   * Get staff performance analytics for department managers
   */
  async getStaffPerformanceAnalytics(
    departmentId: string,
    filters?: {
      role?: string;
      shift?: string;
      minAssignments?: number;
    }
  ): Promise<{
    summary: any;
    topPerformers: any[];
    needAttention: any[];
    detailedMetrics: any[];
  }> {
    const query = this.staffRepository
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.user', 'user')
      .where('staff.departmentId = :deptId', { deptId: departmentId })
      .andWhere('staff.isActive = :active', { active: true });

    // Apply filters
    if (filters?.role) {
      query.andWhere('staff.role = :role', { role: filters.role });
    }

    if (filters?.shift) {
      query.andWhere('staff.shiftSchedule->>"$.shift" = :shift', { shift: filters.shift });
    }

    const staff = await query.getMany();

    // Calculate performance metrics
    const metrics = staff.map(staffMember => {
      const perf = staffMember.performanceMetrics || {};
      return {
        id: staffMember.id,
        name: `${staffMember.user.firstName} ${staffMember.user.lastName}`,
        role: staffMember.role,
        currentAssignments: staffMember.currentAssignments,
        performanceScore: this.calculatePerformanceScore(perf),
        responseTimeAvg: perf.responseTimeAvg || 0,
        resolutionRate: perf.resolutionRate || 0,
        customerSatisfaction: perf.customerSatisfaction || 0,
        ticketsCompleted: perf.ticketsCompleted || 0,
        availability: staffMember.isOnDuty ? 'on_duty' : 'off_duty'
      };
    });

    // Sort by performance score
    const sortedMetrics = metrics.sort((a, b) => b.performanceScore - a.performanceScore);

    return {
      summary: {
        totalStaff: staff.length,
        onDuty: staff.filter(s => s.isOnDuty).length,
        avgPerformanceScore: this.calculateAverage(metrics.map(m => m.performanceScore)),
        avgResponseTime: this.calculateAverage(metrics.map(m => m.responseTimeAvg))
      },
      topPerformers: sortedMetrics.slice(0, 5),
      needAttention: sortedMetrics.slice(-5).reverse(), // Lowest performers
      detailedMetrics: metrics
    };
  }

  /**
   * Get incident/issue analytics for department
   */
  private async getIncidentAnalytics(
    department: Department,
    dateRange: { start: Date; end: Date }
  ) {
    // Based on department type, query relevant incidents
    switch (department.type) {
      case DepartmentType.POLICE:
        return await this.getPoliceIncidentAnalytics(department.id, dateRange);
      
      case DepartmentType.FIRE_BRIGADE:
        return await this.getFireIncidentAnalytics(department.id, dateRange);
      
      case DepartmentType.AMBULANCE:
        return await this.getMedicalIncidentAnalytics(department.id, dateRange);
      
      case DepartmentType.CITY_COUNCIL:
        return await this.getCityCouncilAnalytics(department.id, dateRange);
      
      case DepartmentType.WASTE_MANAGEMENT:
        return await this.getWasteManagementAnalytics(department.id, dateRange);
      
      default:
        return {};
    }
  }
    getFireIncidentAnalytics(id: string, dateRange: { start: Date; end: Date; }) {
        throw new Error('Method not implemented.');
    }
    getMedicalIncidentAnalytics(id: string, dateRange: { start: Date; end: Date; }) {
        throw new Error('Method not implemented.');
    }
    getCityCouncilAnalytics(id: string, dateRange: { start: Date; end: Date; }) {
        throw new Error('Method not implemented.');
    }

  private async getPoliceIncidentAnalytics(
    departmentId: string,
    dateRange: { start: Date; end: Date }
  ) {
    const incidents = await this.emergencyRepository
      .createQueryBuilder('incident')
      .where('incident.assignedDepartment = :deptId', { deptId: departmentId })
      .andWhere('incident.createdAt BETWEEN :start AND :end', dateRange)
      .getMany();

    const byType = this.groupBy(incidents, 'type');
    const byStatus = this.groupBy(incidents, 'status');
    const byPriority = this.groupBy(incidents, 'priority');

    // Calculate response times
    const resolvedIncidents = incidents.filter(i => i.status === EmergencyStatus.RESOLVED);
    const avgResponseTime = resolvedIncidents.length > 0 
      ? resolvedIncidents.reduce((sum, incident) => {
          const responseTime = incident.dispatchedAt 
            ? incident.dispatchedAt.getTime() - incident.createdAt.getTime()
            : 0;
          return sum + responseTime;
        }, 0) / resolvedIncidents.length
      : 0;

    return {
      totalIncidents: incidents.length,
      byType,
      byStatus,
      byPriority,
      avgResponseTime: avgResponseTime / (1000 * 60), // Convert to minutes
      clearanceRate: (byStatus[EmergencyStatus.RESOLVED] || 0) / incidents.length * 100,
      criticalIncidents: incidents.filter(i => i.priority === 'critical').length
    };
  }

  private async getWasteManagementAnalytics(
    departmentId: string,
    dateRange: { start: Date; end: Date }
  ) {
    const issues = await this.issueRepository
      .createQueryBuilder('issue')
      .where('issue.assignedDepartment = :deptId', { deptId: departmentId })
      .andWhere('issue.createdAt BETWEEN :start AND :end', dateRange)
      .getMany();

    const byType = this.groupBy(issues, 'type');
    const byStatus = this.groupBy(issues, 'status');

    // Calculate resolution efficiency
    const resolvedIssues = issues.filter(i => i.status === IssueStatus.RESOLVED);
    const avgResolutionTime = resolvedIssues.length > 0
      ? resolvedIssues.reduce((sum, issue) => {
          const resolutionTime = issue.resolvedAt
            ? issue.resolvedAt.getTime() - issue.createdAt.getTime()
            : 0;
          return sum + resolutionTime;
        }, 0) / resolvedIssues.length
      : 0;

    return {
      totalIssues: issues.length,
      byType,
      byStatus,
      avgResolutionTime: avgResolutionTime / (1000 * 60 * 60), // Convert to hours
      resolutionRate: resolvedIssues.length / issues.length * 100,
      pendingIssues: issues.filter(i => 
        i.status === IssueStatus.REPORTED || i.status === IssueStatus.IN_PROGRESS
      ).length
    };
  }

  /**
   * Calculate performance score for staff
   */
  private calculatePerformanceScore(metrics: any): number {
    const weights = {
      responseTime: 0.3,
      resolutionRate: 0.3,
      customerSatisfaction: 0.2,
      ticketsCompleted: 0.2
    };

    const normalizedScores = {
      responseTime: metrics.responseTimeAvg 
        ? Math.max(0, 100 - (metrics.responseTimeAvg / 10)) // Lower time = higher score
        : 50,
      resolutionRate: (metrics.resolutionRate || 0) * 100,
      customerSatisfaction: (metrics.customerSatisfaction || 0) * 100,
      ticketsCompleted: Math.min(100, (metrics.ticketsCompleted || 0) / 10) // 10 tickets = 100%
    };

    return Object.entries(weights).reduce((score, [metric, weight]) => {
      return score + (normalizedScores[metric] * weight);
    }, 0);
  }

  private getDateRange(timeframe: string): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (timeframe) {
      case '24h':
        start.setDate(start.getDate() - 1);
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
      default:
        start.setDate(start.getDate() - 30);
    }

    return { start, end };
  }

  private calculateAverage(numbers: number[]): number {
    return numbers.length > 0 
      ? numbers.reduce((a, b) => a + b, 0) / numbers.length 
      : 0;
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((groups, item) => {
      const value = item[key];
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }
} 
