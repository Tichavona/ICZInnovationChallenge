/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UnifiedDashboardService } from './base-dashboard.service';
import { EmergencyReport, EmergencyType, EmergencyStatus } from '../../database/emergency-report.entity';
import { IncidentAssignment, AssignmentStatus } from '../../database/incident-assignment.entity';
import { Station } from '../../database/station.entity';
import { DepartmentStaff, Department } from '../../database/department.entity';
import { GeoDistanceUtil } from '../../shared/utils/geo-distance.util';
import { SLACalculatorUtil } from '../../shared/utils/sla-calculator.util';
import { DashboardUser, DashboardNotification } from '../../database/dashboard.entity';
import { SLAConfig } from '../../database/sla-config.entity';
import { IssueReport } from '../../database/issue-report.entity';
import { NotificationGateway } from '../notifications/notification.gateway';

@Injectable()
export class PoliceDashboardService extends UnifiedDashboardService {
  private readonly policeIncidentTypes = [
    EmergencyType.ROBBERY,
    EmergencyType.CRIME,
    EmergencyType.ACCIDENT,
    EmergencyType.OTHER
  ];

  constructor(
    @InjectRepository(EmergencyReport)
    protected emergencyRepo: Repository<EmergencyReport>,
    @InjectRepository(IncidentAssignment)
    protected assignmentRepo: Repository<IncidentAssignment>,
    @InjectRepository(Station)
    protected stationRepo: Repository<Station>,
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
    @InjectRepository(IssueReport)
    protected issueRepo: Repository<IssueReport>,
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

  async getPoliceIncidents(filters: {
    status?: string;
    timeframe?: '24h' | '7d' | '30d';
    stationId?: string;
    district?: string;
    incidentType?: EmergencyType[];
  }): Promise<any[]> {
    const timeframeMap = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const queryBuilder = this.emergencyRepo
      .createQueryBuilder('emergency')
      .leftJoinAndSelect('emergency.assignments', 'assignments')
      .leftJoinAndSelect('assignments.assignedStation', 'station')
      .where('emergency.type IN (:...types)', { types: this.policeIncidentTypes });

    if (filters.status) {
      queryBuilder.andWhere('emergency.status = :status', { status: filters.status });
    }

    if (filters.timeframe) {
      const since = new Date(Date.now() - timeframeMap[filters.timeframe]);
      queryBuilder.andWhere('emergency.createdAt >= :since', { since });
    }

    if (filters.stationId) {
      queryBuilder.andWhere('station.id = :stationId', { stationId: filters.stationId });
    }

    if (filters.district) {
      // Add district filtering logic here if needed
      queryBuilder.andWhere('station.jurisdiction -> \'districts\' ? :district', { 
        district: filters.district 
      });
    }

    if (filters.incidentType?.length) {
      queryBuilder.andWhere('emergency.type IN (:...incidentTypes)', { 
        incidentTypes: filters.incidentType 
      });
    }

    const incidents = await queryBuilder.getMany();

    // Enrich with SLA data and assignments
    const enrichedIncidents = await Promise.all(
      incidents.map(async incident => {
        const assignment = await this.assignmentRepo.findOne({
          where: { incidentId: incident.id.toString() },
          relations: ['assignedStation', 'assignedStaff', 'assignedStaff.user']
        });

        return {
          ...incident,
          currentAssignment: assignment || undefined,
          slaStatus: this.calculateSLABreachStatus(incident, assignment)
        };
      })
    );

    return enrichedIncidents;
  }

  /**
   * Auto-assign incident to appropriate station - Implementation
   */
  async autoAssignIncident(
    incident: EmergencyReport,
    stationId?: string
  ): Promise<IncidentAssignment> {
    try {
      // If stationId is provided, assign to that specific station
      if (stationId) {
        const station = await this.stationRepo.findOne({
          where: { id: stationId }
        });

        if (!station) {
          throw new Error('Station not found');
        }

        // Create assignment
        const assignment = new IncidentAssignment();
        assignment.incidentType = 'emergency';
        assignment.emergency = incident;
        assignment.incidentId = incident.id.toString();
        assignment.assignedStation = station;
        assignment.status = AssignmentStatus.PENDING;
        assignment.assignedAt = new Date();
        
        // Calculate distance
        assignment.distanceToIncidentKm = this.geoUtil.calculateDistance(
          incident.latitude,
          incident.longitude,
          station.latitude,
          station.longitude
        );

        // Update station capacity
        station.operationalCapacity = {
          ...station.operationalCapacity,
          currentIncidents: (station.operationalCapacity?.currentIncidents || 0) + 1
        };
        await this.stationRepo.save(station);

        return await this.assignmentRepo.save(assignment);
      }

      // Otherwise, find nearest available station
      const nearestStations = await this.findNearestStations(
        incident.latitude,
        incident.longitude,
        incident.assignedDepartment || 'police'
      );

      for (const station of nearestStations) {
        if ((station.operationalCapacity?.currentIncidents || 0) < 
            (station.operationalCapacity?.maxConcurrentIncidents || 10)) {
          
          const assignment = new IncidentAssignment();
          assignment.incidentType = 'emergency';
          assignment.emergency = incident;
          assignment.incidentId = incident.id.toString();
          assignment.assignedStation = station;
          assignment.status = AssignmentStatus.PENDING;
          assignment.assignedAt = new Date();
          assignment.distanceToIncidentKm = this.geoUtil.calculateDistance(
            incident.latitude,
            incident.longitude,
            station.latitude,
            station.longitude
          );

          // Update station capacity
          station.operationalCapacity = {
            ...station.operationalCapacity,
            currentIncidents: (station.operationalCapacity?.currentIncidents || 0) + 1
          };
          await this.stationRepo.save(station);

          return await this.assignmentRepo.save(assignment);
        }
      }

      // If no stations available, create escalation
      const escalationAssignment = new IncidentAssignment();
      escalationAssignment.incidentType = 'emergency';
      escalationAssignment.emergency = incident;
      escalationAssignment.incidentId = incident.id.toString();
      escalationAssignment.status = AssignmentStatus.ESCALATED;
      escalationAssignment.assignedAt = new Date();
      escalationAssignment.notes = 'Auto-escalated - No available stations';
      
      return await this.assignmentRepo.save(escalationAssignment);

    } catch (error) {
      this.logger.error('Error auto-assigning incident:', error);
      throw error;
    }
  }

  /**
   * Find nearest stations to incident location
   */
  async findNearestStations(
    latitude: number,
    longitude: number,
    departmentId: string,
    limit: number = 5
  ): Promise<Station[]> {
    const stations = await this.stationRepo
      .createQueryBuilder('station')
      .leftJoinAndSelect('station.department', 'department')
      .where('department.id = :deptId', { deptId: departmentId })
      .andWhere('station.status = :status', { status: 'active' })
      .getMany();

    // Calculate distances and filter by coverage radius
    const stationsWithDistance = stations
      .map(station => ({
        station,
        distance: this.geoUtil.calculateDistance(
          latitude,
          longitude,
          station.latitude,
          station.longitude
        )
      }))
      .filter(item => item.distance <= item.station.coverageRadiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map(item => item.station);

    return stationsWithDistance;
  }

  async getCrimeHeatmap(stationId?: string, days: number = 30): Promise<any[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const queryBuilder = this.emergencyRepo
      .createQueryBuilder('emergency')
      .leftJoin('emergency.assignments', 'assignment')
      .leftJoin('assignment.assignedStation', 'station')
      .where('emergency.type IN (:...types)', { 
        types: [EmergencyType.ROBBERY, EmergencyType.CRIME] 
      })
      .andWhere('emergency.createdAt >= :since', { since });

    if (stationId) {
      queryBuilder.andWhere('station.id = :stationId', { stationId });
    }

    const crimes = await queryBuilder.getMany();

    return crimes.map(crime => ({
      id: crime.id,
      type: crime.type,
      latitude: crime.latitude,
      longitude: crime.longitude,
      timestamp: crime.createdAt,
      priority: crime.priority,
      status: crime.status
    }));
  }

  /**
   * Get dashboard metrics - Implementation
   */
  async getDashboardMetrics(
    departmentId?: string,
    stationId?: string,
    timeframe?: { start: Date; end: Date }
  ): Promise<any> {
    try {
      const queryBuilder = this.assignmentRepo
        .createQueryBuilder('assignment')
        .leftJoinAndSelect('assignment.emergency', 'emergency')
        .leftJoinAndSelect('assignment.assignedStation', 'station')
        .leftJoinAndSelect('station.department', 'department')
        .where('emergency.type IN (:...types)', { types: this.policeIncidentTypes });

      if (departmentId) {
        queryBuilder.andWhere('department.id = :deptId', { deptId: departmentId });
      }

      if (stationId) {
        queryBuilder.andWhere('station.id = :stationId', { stationId });
      }

      if (timeframe) {
        queryBuilder.andWhere('assignment.assignedAt BETWEEN :start AND :end', {
          start: timeframe.start,
          end: timeframe.end
        });
      }

      const assignments = await queryBuilder.getMany();

      // Calculate metrics
      const totalIncidents = assignments.length;
      const activeIncidents = assignments.filter(
        a => a.status !== AssignmentStatus.COMPLETED && a.status !== AssignmentStatus.ESCALATED
      ).length;
      
      const resolvedIncidents = assignments.filter(
        a => a.status === AssignmentStatus.COMPLETED
      ).length;

      const slaBreaches = assignments.filter(
        a => a.slaMetrics?.breachedAt
      ).length;

      // Calculate average response time
      const assignmentsWithResponse = assignments.filter(a => a.acknowledgedAt);
      const avgResponseTime = assignmentsWithResponse.length > 0
        ? assignmentsWithResponse.reduce((sum, a) => {
            const responseTime = (a.acknowledgedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60);
            return sum + responseTime;
          }, 0) / assignmentsWithResponse.length
        : 0;

      // Calculate priority breakdown
      const priorityBreakdown = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      };

      assignments.forEach(a => {
        if (a.emergency?.priority) {
          priorityBreakdown[a.emergency.priority as keyof typeof priorityBreakdown]++;
        }
      });

      // Get station performance
      const stationMap = new Map<string, any>();
      assignments.forEach(a => {
        if (!a.assignedStation) return;
        
        const stationId = a.assignedStation.id;
        if (!stationMap.has(stationId)) {
          stationMap.set(stationId, {
            stationId,
            stationName: a.assignedStation.name,
            totalAssigned: 0,
            completed: 0,
            slaBreaches: 0,
            responseTimeSum: 0,
            responseTimeCount: 0
          });
        }

        const stats = stationMap.get(stationId);
        stats.totalAssigned++;
        
        if (a.status === AssignmentStatus.COMPLETED) {
          stats.completed++;
        }
        
        if (a.slaMetrics?.breachedAt) {
          stats.slaBreaches++;
        }
        
        if (a.acknowledgedAt) {
          const responseTime = (a.acknowledgedAt.getTime() - a.assignedAt.getTime()) / (1000 * 60);
          stats.responseTimeSum += responseTime;
          stats.responseTimeCount++;
        }
      });

      const stationPerformance = Array.from(stationMap.values()).map(stats => ({
        stationId: stats.stationId,
        stationName: stats.stationName,
        totalAssigned: stats.totalAssigned,
        completed: stats.completed,
        slaBreaches: stats.slaBreaches,
        avgResponseTime: stats.responseTimeCount > 0 
          ? Math.round((stats.responseTimeSum / stats.responseTimeCount) * 10) / 10 
          : 0
      }));

      return {
        totalIncidents,
        activeIncidents,
        resolvedIncidents,
        slaBreaches,
        slaComplianceRate: totalIncidents > 0 
          ? Math.round(((totalIncidents - slaBreaches) / totalIncidents) * 100 * 10) / 10
          : 100,
        avgResponseTimeMinutes: Math.round(avgResponseTime * 10) / 10,
        stationPerformance,
        priorityBreakdown,
        incidentsByType: await this.getIncidentsByType(departmentId, stationId, timeframe),
        incidentsByStatus: await this.getIncidentsByStatus(departmentId, stationId, timeframe)
      };
    } catch (error) {
      this.logger.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Get incidents grouped by type
   */
  private async getIncidentsByType(
    departmentId?: string,
    stationId?: string,
    timeframe?: { start: Date; end: Date }
  ): Promise<Record<string, number>> {
    const queryBuilder = this.emergencyRepo
      .createQueryBuilder('emergency')
      .leftJoin('emergency.assignments', 'assignment')
      .leftJoin('assignment.assignedStation', 'station')
      .leftJoin('station.department', 'department')
      .where('emergency.type IN (:...types)', { types: this.policeIncidentTypes });

    if (departmentId) {
      queryBuilder.andWhere('department.id = :deptId', { deptId: departmentId });
    }

    if (stationId) {
      queryBuilder.andWhere('station.id = :stationId', { stationId });
    }

    if (timeframe) {
      queryBuilder.andWhere('emergency.createdAt BETWEEN :start AND :end', {
        start: timeframe.start,
        end: timeframe.end
      });
    }

    const emergencies = await queryBuilder.getMany();

    const byType: Record<string, number> = {};
    emergencies.forEach(e => {
      byType[e.type] = (byType[e.type] || 0) + 1;
    });

    return byType;
  }

  /**
   * Get incidents grouped by status
   */
  private async getIncidentsByStatus(
    departmentId?: string,
    stationId?: string,
    timeframe?: { start: Date; end: Date }
  ): Promise<Record<string, number>> {
    const queryBuilder = this.emergencyRepo
      .createQueryBuilder('emergency')
      .leftJoin('emergency.assignments', 'assignment')
      .leftJoin('assignment.assignedStation', 'station')
      .leftJoin('station.department', 'department')
      .where('emergency.type IN (:...types)', { types: this.policeIncidentTypes });

    if (departmentId) {
      queryBuilder.andWhere('department.id = :deptId', { deptId: departmentId });
    }

    if (stationId) {
      queryBuilder.andWhere('station.id = :stationId', { stationId });
    }

    if (timeframe) {
      queryBuilder.andWhere('emergency.createdAt BETWEEN :start AND :end', {
        start: timeframe.start,
        end: timeframe.end
      });
    }

    const emergencies = await queryBuilder.getMany();

    const byStatus: Record<string, number> = {};
    emergencies.forEach(e => {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    });

    return byStatus;
  }

  async getResponseTimeAnalytics(period: '24h' | '7d' | '30d' | '90d'): Promise<any[]> {
    const periodMap = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };

    const days = periodMap[period];
    const intervals = this.generateTimeIntervals(days);

    const analytics: any[] = [];

    for (const interval of intervals) {
      const assignments = await this.assignmentRepo
        .createQueryBuilder('assignment')
        .leftJoinAndSelect('assignment.emergency', 'emergency')
        .leftJoinAndSelect('assignment.assignedStation', 'station')
        .where('emergency.type IN (:...types)', { types: this.policeIncidentTypes })
        .andWhere('assignment.assignedAt BETWEEN :start AND :end', {
          start: interval.start,
          end: interval.end
        })
        .getMany();

      const avgResponseTime = this.calculateAverageResponseTime(assignments);
      const avgResolutionTime = this.calculateAverageResolutionTime(assignments);

      analytics.push({
        period: interval.label,
        avgResponseTimeMinutes: avgResponseTime,
        avgResolutionTimeMinutes: avgResolutionTime,
        totalIncidents: assignments.length,
        slaComplianceRate: this.calculateSLACompliance(assignments)
      });
    }

    return analytics;
  }

  async getCrimeTypeBreakdown(stationId?: string, days: number = 30): Promise<any> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const queryBuilder = this.emergencyRepo
      .createQueryBuilder('emergency')
      .leftJoin('emergency.assignments', 'assignment')
      .leftJoin('assignment.assignedStation', 'station')
      .where('emergency.type IN (:...types)', { 
        types: [EmergencyType.ROBBERY, EmergencyType.CRIME] 
      })
      .andWhere('emergency.createdAt >= :since', { since });

    if (stationId) {
      queryBuilder.andWhere('station.id = :stationId', { stationId });
    }

    const crimes = await queryBuilder.getMany();

    const breakdown: any = {
      [EmergencyType.ROBBERY]: {
        total: 0,
        byStatus: {},
        byPriority: {}
      },
      [EmergencyType.CRIME]: {
        total: 0,
        byStatus: {},
        byPriority: {}
      }
    };

    crimes.forEach(crime => {
      breakdown[crime.type].total++;
      
      // Count by status
      const status = crime.status || 'unknown';
      breakdown[crime.type].byStatus[status] = 
        (breakdown[crime.type].byStatus[status] || 0) + 1;
      
      // Count by priority
      const priority = crime.priority || 'medium';
      breakdown[crime.type].byPriority[priority] = 
        (breakdown[crime.type].byPriority[priority] || 0) + 1;
    });

    return breakdown;
  }

  async getStaffPerformanceMetrics(stationId?: string): Promise<any[]> {
    const queryBuilder = this.staffRepo
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.user', 'user')
      .leftJoinAndSelect('staff.department', 'department')
      .leftJoinAndSelect('staff.assignments', 'assignments')
      .leftJoinAndSelect('assignments.emergency', 'emergency')
      .where('department.type = :deptType', { deptType: 'police' });

    if (stationId) {
      queryBuilder.andWhere('staff.stationId = :stationId', { stationId });
    }

    const staff = await queryBuilder.getMany();

    return staff.map(member => {
      const completedAssignments = member.assignments?.filter(
        a => a.status === 'completed'
      ).length || 0;

      const avgResponseTime = this.calculateAverageResponseTime(member.assignments || []);
      const avgResolutionTime = this.calculateAverageResolutionTime(member.assignments || []);

      return {
        staffId: member.id,
        name: member.user?.name || 'Unknown',
        role: member.role,
        specialization: member.specialization,
        isOnDuty: member.isOnDuty,
        currentAssignments: member.currentAssignments,
        performance: {
          completedIncidents: completedAssignments,
          avgResponseTimeMinutes: avgResponseTime,
          avgResolutionTimeMinutes: avgResolutionTime,
          slaCompliance: this.calculateIndividualSLA(member.assignments || [])
        }
      };
    });
  }

  async getResourceAvailability(stationId?: string): Promise<any[]> {
    const queryBuilder = this.stationRepo
      .createQueryBuilder('station')
      .leftJoinAndSelect('station.department', 'department')
      .where('department.type = :deptType', { deptType: 'police' });

    if (stationId) {
      queryBuilder.andWhere('station.id = :stationId', { stationId });
    }

    const stations = await queryBuilder.getMany();

    return stations.map(station => ({
      stationId: station.id,
      stationName: station.name,
      status: station.status,
      capacity: station.operationalCapacity || {
        maxConcurrentIncidents: 10,
        currentIncidents: 0,
        availableStaff: 0,
        totalStaff: 0,
        availableVehicles: 0,
        totalVehicles: 0
      },
      specializations: station.specializations || [],
      coverage: {
        radiusKm: station.coverageRadiusKm,
        location: {
          lat: station.latitude,
          lng: station.longitude
        }
      },
      availabilityScore: this.calculateAvailabilityScore(station)
    }));
  }

  // Helper methods
  private generateTimeIntervals(days: number): Array<{ start: Date; end: Date; label: string }> {
    const intervals: Array<{ start: Date; end: Date; label: string }> = [];
    const now = new Date();

    if (days === 1) {
      // Hourly intervals for last 24 hours
      for (let i = 23; i >= 0; i--) {
        const end = new Date(now.getTime() - i * 60 * 60 * 1000);
        const start = new Date(end.getTime() - 60 * 60 * 1000);
        intervals.push({
          start,
          end,
          label: `${start.getHours()}:00 - ${end.getHours()}:00`
        });
      }
    } else {
      // Daily intervals
      for (let i = days - 1; i >= 0; i--) {
        const end = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        intervals.push({
          start,
          end,
          label: start.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: i === 0 ? 'numeric' : undefined
          })
        });
      }
    }

    return intervals;
  }

  private calculateAverageResponseTime(assignments: IncidentAssignment[]): number {
    const withResponse = assignments.filter(a => a.acknowledgedAt);
    if (withResponse.length === 0) return 0;

    const total = withResponse.reduce((sum, a) => {
      if (a.acknowledgedAt && a.assignedAt) {
        const responseTime = (a.acknowledgedAt.getTime() - a.assignedAt.getTime()) / (1000 * 60);
        return sum + responseTime;
      }
      return sum;
    }, 0);

    return Math.round((total / withResponse.length) * 10) / 10;
  }

  private calculateAverageResolutionTime(assignments: IncidentAssignment[]): number {
    const resolved = assignments.filter(a => a.completedAt && a.assignedAt);
    if (resolved.length === 0) return 0;

    const total = resolved.reduce((sum, a) => {
      if (a.completedAt && a.assignedAt) {
        const resolutionTime = (a.completedAt.getTime() - a.assignedAt.getTime()) / (1000 * 60);
        return sum + resolutionTime;
      }
      return sum;
    }, 0);

    return Math.round((total / resolved.length) * 10) / 10;
  }

  private calculateSLACompliance(assignments: IncidentAssignment[]): number {
    if (assignments.length === 0) return 100;

    const breached = assignments.filter(a => a.slaMetrics?.breachedAt).length;
    return Math.round(((assignments.length - breached) / assignments.length) * 100);
  }

  private calculateIndividualSLA(assignments: IncidentAssignment[]): number {
    if (assignments.length === 0) return 100;

    const completed = assignments.filter(a => a.status === 'completed');
    if (completed.length === 0) return 100;

    const slaCompliant = completed.filter(a => !a.slaMetrics?.breachedAt).length;
    return Math.round((slaCompliant / completed.length) * 100);
  }

  private calculateAvailabilityScore(station: Station): number {
    const capacity = station.operationalCapacity || {
      maxConcurrentIncidents: 10,
      currentIncidents: 0,
      availableStaff: 0,
      totalStaff: 1
    };

    const { currentIncidents, maxConcurrentIncidents, availableStaff, totalStaff } = capacity;

    // Avoid division by zero
    const capacityScore = maxConcurrentIncidents > 0 
      ? 1 - (currentIncidents / maxConcurrentIncidents)
      : 0.5;
    
    const staffScore = totalStaff > 0 
      ? availableStaff / totalStaff 
      : 0.5;

    return Math.round(((capacityScore + staffScore) / 2) * 100);
  }

  private calculateSLABreachStatus(
    incident: EmergencyReport, 
    assignment?: IncidentAssignment | null
  ): any {
    if (!assignment || !assignment.slaMetrics) {
      return { status: 'unknown' };
    }

    if (assignment.slaMetrics.breachedAt) {
      return {
        status: 'breached',
        breachedAt: assignment.slaMetrics.breachedAt,
        level: assignment.slaMetrics.breachLevel || 'unknown'
      };
    }

    if (incident.status === EmergencyStatus.RESOLVED) {
      return { status: 'compliant' };
    }

    // Calculate time remaining
    const now = new Date();
    const assignedAt = new Date(assignment.assignedAt);
    const elapsedMinutes = (now.getTime() - assignedAt.getTime()) / (1000 * 60);
    
    const responseTarget = assignment.slaMetrics.responseTarget || 30; // Default 30 mins
    const resolutionTarget = assignment.slaMetrics.resolutionTarget || 120; // Default 2 hours

    const responseRemaining = Math.max(0, responseTarget - elapsedMinutes);
    const resolutionRemaining = Math.max(0, resolutionTarget - elapsedMinutes);

    return {
      status: 'active',
      responseRemainingMinutes: Math.round(responseRemaining),
      resolutionRemainingMinutes: Math.round(resolutionRemaining),
      isResponseBreached: responseRemaining <= 0,
      isResolutionBreached: resolutionRemaining <= 0
    };
  }
}