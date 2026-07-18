/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable prettier/prettier */
// src/whatsapp/services/incident-management.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import { 
  IncidentGroup, 
  IncidentAnalytics, 
  IncidentUpdate, 
  StatusVerification,
  DashboardNotification,
  DashboardUser 
} from '../../database/dashboard.entity';
import { EmergencyReport, EmergencyType } from '../../database/emergency-report.entity';
import { IssueReport, IssueType } from '../../database/issue-report.entity';
import { DepartmentRoutingService } from './department-routing.service';
import { NotificationService } from './notification.service';

@Injectable()
export class IncidentManagementService {
  private readonly logger = new Logger(IncidentManagementService.name);
  
  // Configuration
  private readonly INVESTIGATION_THRESHOLD = 2; // New reports on resolved incident
  private readonly TIME_WINDOW_HOURS = 24; // Consider reports within this window
  private readonly MIN_CONFIDENCE = 60; // Minimum confidence to group
  private readonly HIGH_ACTIVITY_THRESHOLD = 5; // Reports per hour

  constructor(
    @InjectRepository(IncidentGroup)
    private incidentRepository: Repository<IncidentGroup>,
    
    @InjectRepository(IncidentUpdate)
    private updateRepository: Repository<IncidentUpdate>,
    
    @InjectRepository(StatusVerification)
    private verificationRepository: Repository<StatusVerification>,
    
    @InjectRepository(EmergencyReport)
    private emergencyRepository: Repository<EmergencyReport>,
    
    @InjectRepository(IssueReport)
    private issueRepository: Repository<IssueReport>,
    
    @InjectRepository(DashboardNotification)
    private notificationRepository: Repository<DashboardNotification>,
    
    @InjectRepository(DashboardUser)
    private dashboardUserRepository: Repository<DashboardUser>,
    
    private readonly departmentRouting: DepartmentRoutingService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Process a new report and manage incident grouping
   */
  async processReport(
    reportType: 'EMERGENCY' | 'ISSUE',
    reportId: number,
    reportData: any,
    reporterPhone: string
  ): Promise<{
    incidentGroup: IncidentGroup;
    isNewIncident: boolean;
    analytics: IncidentAnalytics;
    requiresVerification: boolean;
  }> {
    try {
      // Find existing incident groups
      const existingGroups = await this.findPotentialGroups(reportType, reportData);
      
      // Check if report conflicts with resolved incidents
      const conflictingGroups = await this.checkStatusConflicts(reportType, reportData);
      
      let incidentGroup: IncidentGroup;
      let isNewIncident = false;
      let requiresVerification = false;

      if (existingGroups.length > 0 && !conflictingGroups.length) {
        // Add to existing group
        incidentGroup = await this.addToExistingGroup(
          existingGroups[0], 
          reportId, 
          reporterPhone, 
          reportData
        );
      } else if (conflictingGroups.length > 0) {
        // Handle status conflict - requires verification
        incidentGroup = conflictingGroups[0];
        requiresVerification = true;
        
        // Create verification request
        await this.createStatusVerification(incidentGroup, reportData, reporterPhone);
        
        // Add report but mark as pending verification
        incidentGroup.addReport(reportId, reporterPhone);
        incidentGroup.markInvestigating();
        await this.incidentRepository.save(incidentGroup);
      } else {
        // Create new incident group
        incidentGroup = await this.createNewIncidentGroup(
          reportType,
          reportId,
          reportData,
          reporterPhone
        );
        isNewIncident = true;
      }

      // Update analytics
      const analytics = await this.updateIncidentAnalytics(incidentGroup);
      
      // Check if incident needs investigation
      if (this.shouldInvestigate(incidentGroup, analytics)) {
        await this.flagForInvestigation(incidentGroup, analytics);
      }

      // Create incident update
      await this.createIncidentUpdate(
        incidentGroup,
        'user_addition',
        `New report added to incident #${incidentGroup.id}`,
        null, // user
        { reportId, reporterPhone }
      );

      return {
        incidentGroup,
        isNewIncident,
        analytics,
        requiresVerification
      };

    } catch (error) {
      this.logger.error('Error processing report:', error);
      throw error;
    }
  }

  /**
   * Find potential incident groups for a report
   */

  private async findPotentialGroups(
    reportType: 'EMERGENCY' | 'ISSUE',
    reportData: any
  ): Promise<IncidentGroup[]> {
    const timeWindow = new Date(Date.now() - this.TIME_WINDOW_HOURS * 60 * 60 * 1000);
    
    // Convert reportType to lowercase for database query
    const incidentType = reportType.toLowerCase() as 'emergency' | 'issue';
    
    // Start building the query
    const queryBuilder = this.incidentRepository
      .createQueryBuilder('incident')
      .where('incident.incidentType = :type', { type: incidentType })
      .andWhere('incident.status != :closed', { closed: 'closed' })
      .andWhere('incident.lastReportedAt >= :time', { time: timeWindow });

    // Geolocation filter
    if (reportData.latitude && reportData.longitude) {
      const earthRadius = 6371000; // meters
      const distanceThreshold = 500; // 500 meters
      
      queryBuilder.andWhere(`
        (${earthRadius} * ACOS(
          COS(RADIANS(:lat)) * COS(RADIANS(incident.centroidLatitude)) *
          COS(RADIANS(incident.centroidLongitude) - RADIANS(:lng)) +
          SIN(RADIANS(:lat)) * SIN(RADIANS(incident.centroidLatitude))
        )) <= :distance
      `, {
        lat: reportData.latitude,
        lng: reportData.longitude,
        distance: distanceThreshold
      });
    }

    // Department match - Use LIKE instead of JSON_CONTAINS for SQL Server
    const departments = reportType === 'EMERGENCY'
      ? this.departmentRouting.routeEmergency(
          reportData.type as EmergencyType,
          reportData.priority
        ).departments
      : this.departmentRouting.routeIssue(reportData.type as IssueType).departments;

    if (departments.length > 0) {
      // For SQL Server, we'll use LIKE to check if the department string contains the department
      // This is a workaround since SQL Server doesn't have JSON_CONTAINS
      const departmentConditions = departments.map((dept, index) => {
        return `incident.departmentsJson LIKE :dept${index}`;
      }).join(' OR ');
      
      const parameters: any = {};
      departments.forEach((dept, index) => {
        parameters[`dept${index}`] = `%${dept}%`;
      });
      
      queryBuilder.andWhere(`(${departmentConditions})`, parameters);
    }

    // Use TOP instead of OFFSET/FETCH for SQL Server 2012+
    return await queryBuilder
      .orderBy('incident.reportCount', 'DESC')
      .limit(5) // Use limit() instead of take() for SQL Server
      .getMany();
  }

  /**
   * Check for status conflicts with resolved incidents
   */
  private async checkStatusConflicts(
    reportType: 'EMERGENCY' | 'ISSUE',
    reportData: any
  ): Promise<IncidentGroup[]> {
    const recentTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const incidentType = reportType.toLowerCase() as 'emergency' | 'issue';
    
    const queryBuilder = this.incidentRepository
      .createQueryBuilder('incident')
      .where('incident.incidentType = :type', { type: incidentType })
      .andWhere('incident.status IN (:...statuses)', { 
        statuses: ['resolved', 'closed'] 
      })
      .andWhere('incident.lastReportedAt >= :time', { time: recentTime });

    // Geolocation filter
    if (reportData.latitude && reportData.longitude) {
      const earthRadius = 6371000;
      const distanceThreshold = 200; // 200 meters for conflict check
      
      queryBuilder.andWhere(`
        (${earthRadius} * ACOS(
          COS(RADIANS(:lat)) * COS(RADIANS(incident.centroidLatitude)) *
          COS(RADIANS(incident.centroidLongitude) - RADIANS(:lng)) +
          SIN(RADIANS(:lat)) * SIN(RADIANS(incident.centroidLatitude))
        )) <= :distance
      `, {
        lat: reportData.latitude,
        lng: reportData.longitude,
        distance: distanceThreshold
      });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Add report to existing incident group
   */
  private async addToExistingGroup(
    group: IncidentGroup,
    reportId: number,
    reporterPhone: string,
    reportData: any
  ): Promise<IncidentGroup> {
    // Update centroid based on new report
    const reports = await this.getGroupReports(group);
    if (reportData.latitude && reportData.longitude) {
      reports.push({ latitude: reportData.latitude, longitude: reportData.longitude });
      
      const newCentroid = this.calculateCentroid(reports);
      group.centroidLatitude = newCentroid.lat;
      group.centroidLongitude = newCentroid.lng;
      group.radiusMeters = this.calculateRadius(reports, newCentroid);
    }

    // Add report using helper methods
    const currentReportIds = group.reportIds;
    if (!currentReportIds.includes(reportId)) {
      currentReportIds.push(reportId);
      group.reportIdsJson = JSON.stringify(currentReportIds);
      group.reportCount = currentReportIds.length;
    }

    const currentReporterPhones = group.reporterPhones;
    if (!currentReporterPhones.includes(reporterPhone)) {
      currentReporterPhones.push(reporterPhone);
      group.reporterPhonesJson = JSON.stringify(currentReporterPhones);
      group.uniqueReporters = currentReporterPhones.length;
    }

    group.lastReportedAt = new Date();
    group.updatedAt = new Date();
    
    // Update the original report - convert incidentType to uppercase
    const reportType = group.incidentType === 'emergency' ? 'EMERGENCY' : 'ISSUE';
    await this.updateReportWithGroup(reportType, reportId, group.id);

    return await this.incidentRepository.save(group);
  }

  /**
   * Create new incident group
   */
  private async createNewIncidentGroup(
    reportType: 'EMERGENCY' | 'ISSUE',
    reportId: number,
    reportData: any,
    reporterPhone: string
  ): Promise<IncidentGroup> {
    const departments = reportType === 'EMERGENCY'
      ? this.departmentRouting.routeEmergency(
          reportData.type as EmergencyType,
          reportData.priority
        ).departments
      : this.departmentRouting.routeIssue(reportData.type as IssueType).departments;

    const now = new Date();
    
    const group = this.incidentRepository.create({
      incidentType: reportType.toLowerCase() as 'emergency' | 'issue',
      primaryDepartment: departments[0] || 'General',
      departmentsJson: JSON.stringify(departments),
      summary: this.generateSummary(reportData),
      location: reportData.location || 'Location not specified',
      centroidLatitude: reportData.latitude || 0,
      centroidLongitude: reportData.longitude || 0,
      radiusMeters: 0,
      status: 'active',
      reportCount: 1,
      uniqueReporters: 1,
      reporterPhonesJson: JSON.stringify([reporterPhone]),
      reportIdsJson: JSON.stringify([reportId]),
      firstReportedAt: now,
      lastReportedAt: now,
      escalationLevel: 0,
      metadata: JSON.stringify({
        initialReport: {
          type: reportData.type,
          priority: reportData.priority,
          description: reportData.description?.substring(0, 200)
        }
      })
    });

    await this.incidentRepository.save(group);
    
    // Update the report
    await this.updateReportWithGroup(reportType, reportId, group.id);

    // Create notification for new incident
    await this.notifyNewIncident(group);

    return group;
  }

  /**
   * Update incident analytics
   */
  private async updateIncidentAnalytics(group: IncidentGroup): Promise<IncidentAnalytics> {
    const reports = await this.getGroupReportsDetailed(group);
    
    const analytics: IncidentAnalytics = {
      reportDensity: this.calculateReportDensity(reports),
      timeIntervals: this.calculateTimeIntervals(reports),
      locationSpread: this.calculateLocationSpread(reports),
      reporterPatterns: this.analyzeReporterPatterns(group, reports),
      confidenceScores: this.calculateConfidenceScores(group, reports),
      verificationFlags: this.checkVerificationFlags(group, reports)
    };

    group.analytics = analytics;
    await this.incidentRepository.save(group);

    return analytics;
  }

  /**
   * Get detailed reports for a group
   */
  private async getGroupReportsDetailed(group: IncidentGroup): Promise<any[]> {
    const reportIds = group.reportIds;
    
    if (reportIds.length === 0) {
      return [];
    }
    
    if (group.incidentType === 'emergency') {
      return await this.emergencyRepository
        .createQueryBuilder('report')
        .where('report.id IN (:...ids)', { ids: reportIds })
        .orderBy('report.createdAt', 'ASC')
        .getMany();
    } else {
      return await this.issueRepository
        .createQueryBuilder('report')
        .where('report.id IN (:...ids)', { ids: reportIds })
        .orderBy('report.createdAt', 'ASC')
        .getMany();
    }
  }

  /**
   * Get geographic points for a group
   */
  private async getGroupReports(group: IncidentGroup): Promise<Array<{ latitude: number; longitude: number }>> {
    const reports = await this.getGroupReportsDetailed(group);
    return reports
      .filter(r => r.latitude && r.longitude)
      .map(r => ({ latitude: r.latitude, longitude: r.longitude }));
  }

  /**
   * Calculate report density (reports per hour)
   */
  private calculateReportDensity(reports: any[]): number {
    if (reports.length < 2) return 0;
    
    const first = new Date(reports[0].createdAt).getTime();
    const last = new Date(reports[reports.length - 1].createdAt).getTime();
    const hours = (last - first) / (1000 * 60 * 60);
    
    return hours > 0 ? reports.length / hours : reports.length;
  }

  /**
   * Calculate time intervals between reports
   */
  private calculateTimeIntervals(reports: any[]): IncidentAnalytics['timeIntervals'] {
    if (reports.length < 2) {
      return {
        average: 0,
        min: 0,
        max: 0,
        intervals: []
      };
    }

    const intervals: number[] = [];
    for (let i = 1; i < reports.length; i++) {
      const prev = new Date(reports[i - 1].createdAt).getTime();
      const curr = new Date(reports[i].createdAt).getTime();
      intervals.push((curr - prev) / (1000 * 60)); // minutes
    }

    const sum = intervals.reduce((a, b) => a + b, 0);
    
    return {
      average: sum / intervals.length,
      min: Math.min(...intervals),
      max: Math.max(...intervals),
      intervals
    };
  }

  /**
   * Calculate location spread
   */
  private calculateLocationSpread(points: Array<{ latitude: number; longitude: number }>): 
    IncidentAnalytics['locationSpread'] {
    
    if (points.length === 0) {
      return {
        radius: 0,
        variance: 0,
        points: []
      };
    }

    const centroid = this.calculateCentroid(points);
    const distances = points.map(p => 
      this.calculateDistance(p.latitude, p.longitude, centroid.lat, centroid.lng)
    );

    const radius = Math.max(...distances);
    const variance = this.calculateVariance(distances);

    return {
      radius,
      variance,
      points: points.map(p => ({ lat: p.latitude, lng: p.longitude }))
    };
  }

  /**
   * Analyze reporter patterns
   */
  private analyzeReporterPatterns(group: IncidentGroup, reports: any[]): 
    IncidentAnalytics['reporterPatterns'] {
    
    const reporterCount: Record<string, number> = {};
    
    reports.forEach(report => {
      const phone = report.reportingPhoneNumber;
      if (phone) {
        reporterCount[phone] = (reporterCount[phone] || 0) + 1;
      }
    });

    const repeatReporters = Object.values(reporterCount).filter(count => count > 1).length;
    const newReporters = group.uniqueReporters - repeatReporters;

    return {
      repeatReporters,
      newReporters,
      reporterFrequency: reporterCount
    };
  }

  /**
   * Calculate confidence scores
   */
  private calculateConfidenceScores(group: IncidentGroup, reports: any[]): 
    IncidentAnalytics['confidenceScores'] {
    
    let geolocationScore = 0;
    let descriptionScore = 0;
    let temporalScore = 0;

    // Geolocation score based on spread
    const locationPoints = reports.filter(r => r.latitude && r.longitude)
      .map(r => ({ latitude: r.latitude, longitude: r.longitude }));
    
    if (locationPoints.length > 0) {
      const spread = this.calculateLocationSpread(locationPoints)!;
      
      if (spread.radius < 10) geolocationScore = 95;
      else if (spread.radius < 100) geolocationScore = 85;
      else if (spread.radius < 500) geolocationScore = 70;
      else geolocationScore = 50;
    } else {
      geolocationScore = 50; // Default score if no location data
    }

    // Temporal score based on clustering
    const intervals = this.calculateTimeIntervals(reports)!;
    const avgInterval = intervals.average || 0;
    
    if (avgInterval < 10) temporalScore = 95; // Reports within 10 minutes
    else if (avgInterval < 30) temporalScore = 85; // Reports within 30 minutes
    else if (avgInterval < 120) temporalScore = 65;
    else temporalScore = 40;

    // Description similarity (simplified)
    if (reports.length > 1) {
      const firstDesc = reports[0].description?.toLowerCase() || '';
      const similarCount = reports.filter(r => {
        const desc = r.description?.toLowerCase() || '';
        return desc.includes(firstDesc.substring(0, Math.min(20, firstDesc.length)));
      }).length;
      
      descriptionScore = (similarCount / reports.length) * 100;
    } else {
      descriptionScore = 100;
    }

    const overall = (geolocationScore * 0.4 + descriptionScore * 0.3 + temporalScore * 0.3);

    return {
      geolocation: Math.round(geolocationScore),
      description: Math.round(descriptionScore),
      temporal: Math.round(temporalScore),
      overall: Math.round(overall)
    };
  }

  /**
   * Check if incident needs verification
   */
  private checkVerificationFlags(group: IncidentGroup, reports: any[]): 
    IncidentAnalytics['verificationFlags'] {
    
    const density = this.calculateReportDensity(reports);
    const isResolved = group.status === 'resolved' || group.status === 'closed';
    const recentReport = reports.length > 0 && 
      (Date.now() - new Date(reports[reports.length - 1].createdAt).getTime()) < 3600000; // 1 hour

    return {
      needsInvestigation: group.reportCount >= this.INVESTIGATION_THRESHOLD && isResolved && recentReport,
      potentialDuplicate: reports.length > 3 && density > 10, // High frequency
      conflictingStatus: isResolved && recentReport,
      highActivity: density >= this.HIGH_ACTIVITY_THRESHOLD
    };
  }

  /**
   * Flag incident for investigation
   */
  private async flagForInvestigation(group: IncidentGroup, analytics: IncidentAnalytics): Promise<void> {
    if (!analytics.verificationFlags?.needsInvestigation) return;

    group.markInvestigating();
    await this.incidentRepository.save(group);

    // Create investigation notification
    await this.createIncidentUpdate(
      group,
      'investigation',
      'Incident flagged for investigation due to new reports on resolved case',
      null,
      { 
        reportCount: group.reportCount,
        uniqueReporters: group.uniqueReporters,
        lastReport: group.lastReportedAt 
      }
    );

    // Notify authorities
    await this.notifyAuthorities(group, 'INVESTIGATION_NEEDED');
  }

  /**
   * Create status verification request - FIXED VERSION
   */
  private async createStatusVerification(
    group: IncidentGroup,
    reportData: any,
    reporterPhone: string
  ): Promise<void> {
    // Create evidence JSON
    const evidenceJson = JSON.stringify([{
      reportData: {
        type: reportData.type,
        location: reportData.location,
        timestamp: new Date().toISOString()
      },
      incidentData: {
        status: group.status,
        lastUpdated: group.updatedAt,
        reportCount: group.reportCount
      }
    }]);

    const verificationData = {
      incidentGroup: group,
      verifiedBy: undefined as DashboardUser | undefined, // Use undefined instead of null
      verificationType: 'status_conflict' as const,
      reason: `New report conflicts with ${group.status} incident`,
      originalStatus: group.status,
      newStatus: 'investigating',
      isConfirmed: false,
      notes: `Report from ${reporterPhone}: ${reportData.description?.substring(0, 100)}`,
      evidenceJson: evidenceJson
    };

    const verification = this.verificationRepository.create(verificationData);
    await this.verificationRepository.save(verification);

    // Notify supervisors
    await this.notifyAuthorities(group, 'STATUS_VERIFICATION_NEEDED');
  }

  /**
   * Create incident update - FIXED VERSION
   */
  async createIncidentUpdate(
    group: IncidentGroup,
    updateType: 'admin_update' | 'user_addition' | 'status_change' | 'investigation' | 'resolution',
    description: string,
    updatedBy: DashboardUser | null | undefined,
    metadata?: any
    ): Promise<IncidentUpdate> {
    // Create new instance manually
    const update = new IncidentUpdate();
    update.incidentGroup = group;
    update.updatedBy = updatedBy! || undefined;
    update.updateType = updateType;
    update.description = description;
    update.department = group.primaryDepartment;
    update.isPublic = updateType === 'resolution' || updateType === 'status_change';
    update.requiresAction = updateType === 'investigation';
    
    if (metadata) {
        update.metadata = JSON.stringify(metadata);
    }

    return await this.updateRepository.save(update);
  }

  /**
   * Get all updates for an incident group
   */
  async getIncidentUpdates(groupId: number): Promise<IncidentUpdate[]> {
    const updates = await this.updateRepository
      .createQueryBuilder('update')
      .leftJoinAndSelect('update.updatedBy', 'updatedBy')
      .where('update.incidentGroupId = :groupId', { groupId })
      .orderBy('update.createdAt', 'DESC')
      .getMany();
    
    return updates;
  }

  /**
   * Get specific incident update by ID
   */
  async getIncidentUpdate(updateId: number): Promise<IncidentUpdate> {
    const update = await this.updateRepository.findOne({
      where: { id: updateId },
      relations: ['updatedBy']
    });
    
    if (!update) {
      throw new Error(`Incident update with ID ${updateId} not found`);
    }
    
    return update;
  }

  /**
   * Add user contribution to incident
   */
  async addUserContribution(
    groupId: number,
    userId: string,
    contributionType: 'media' | 'note' | 'location_update' | 'status_update',
    content: string,
    metadata?: any
  ): Promise<IncidentUpdate> {
    const group = await this.incidentRepository.findOne({ where: { id: groupId } });
    
    if (!group) {
      throw new Error('Incident group not found');
    }

    const updateType = 'user_addition' as const;
    const description = `User contribution: ${contributionType} - ${content.substring(0, 100)}`;
    
    const update = await this.createIncidentUpdate(
      group,
      updateType,
      description,
      undefined, // Use undefined instead of null
      {
        userId,
        contributionType,
        content,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    );

    // Update incident analytics
    await this.updateIncidentAnalytics(group);

    return update;
  }

  /**
   * Update incident status (admin function)
   */
  async updateIncidentStatus(
    groupId: number,
    newStatus: string,
    updatedBy: DashboardUser | null | undefined,
    notes?: string
  ): Promise<{
    group: IncidentGroup;
    update: IncidentUpdate;
    verification?: StatusVerification;
  }> {
    const group = await this.incidentRepository.findOne({ where: { id: groupId } });
    
    if (!group) {
      throw new Error('Incident group not found');
    }

    const oldStatus = group.status;
    group.status = newStatus;
    group.updatedAt = new Date();

    // Set specific timestamps based on status
    switch (newStatus) {
      case 'investigating':
        group.investigationStartedAt = new Date();
        break;
      case 'resolved':
        group.resolvedAt = new Date();
        break;
      case 'closed':
        group.closedAt = new Date();
        break;
      case 'reopened':
        group.reopenedAt = new Date();
        break;
    }

    await this.incidentRepository.save(group);

    // Create status update record
    const update = await this.createIncidentUpdate(
      group,
      'status_change',
      `Status changed from ${oldStatus} to ${newStatus}` + (notes ? `: ${notes}` : ''),
      updatedBy,
      {
        oldStatus,
        newStatus,
        changedBy: updatedBy?.id || 'system',
        timestamp: new Date().toISOString()
      }
    );

    // If reopening a resolved incident, create verification
    let verification: StatusVerification | undefined;
    if ((oldStatus === 'resolved' || oldStatus === 'closed') && newStatus === 'reopened') {
      const verificationData = {
        incidentGroup: group,
        verifiedBy: updatedBy || undefined, // Use undefined instead of null
        verificationType: 'new_case_check' as const,
        reason: 'Incident reopened - requires verification',
        originalStatus: oldStatus,
        newStatus,
        isConfirmed: true,
        notes: `Reopened by ${updatedBy?.id || 'system'}: ${notes || 'No notes provided'}`,
        resolvedAt: new Date()
      };

      verification = this.verificationRepository.create(verificationData);
      await this.verificationRepository.save(verification);
    }

    // Notify all reporters about status change
    await this.notifyReporters(group, newStatus);

    return { group, update, verification };
  }

  /**
   * Get incident statistics
   */
  async getIncidentStatistics(): Promise<any> {
    const totalIncidents = await this.incidentRepository.count();
    
    const byType = await this.incidentRepository
      .createQueryBuilder('incident')
      .select('incident.incidentType, COUNT(*) as count, AVG(incident.reportCount) as avg_reports')
      .groupBy('incident.incidentType')
      .getRawMany();

    const byStatus = await this.incidentRepository
      .createQueryBuilder('incident')
      .select('incident.status, COUNT(*) as count')
      .groupBy('incident.status')
      .getRawMany();

    const activeIncidents = await this.incidentRepository
      .createQueryBuilder('incident')
      .where('incident.status IN (:...statuses)', {
        statuses: ['active', 'investigating', 'in_progress', 'reopened']
      })
      .orderBy('incident.reportCount', 'DESC')
      .take(10)
      .getMany();

    const verificationStats = await this.verificationRepository
      .createQueryBuilder('verification')
      .select('verification.verificationType, COUNT(*) as count, SUM(CASE WHEN verification.isConfirmed THEN 1 ELSE 0 END) as confirmed')
      .groupBy('verification.verificationType')
      .getRawMany();

    return {
      totalIncidents,
      byType,
      byStatus,
      activeIncidents: activeIncidents.map(i => ({
        id: i.id,
        type: i.incidentType,
        reportCount: i.reportCount,
        uniqueReporters: i.uniqueReporters,
        location: i.location,
        status: i.status,
        lastReport: i.lastReportedAt
      })),
      verificationStats,
      efficiencyMetrics: await this.calculateEfficiencyMetrics()
    };
  }

  private async calculateEfficiencyMetrics(): Promise<any> {
    const incidents = await this.incidentRepository.find();
    
    let totalGroupedReports = 0;
    let totalResponseTime = 0;
    let resolvedCount = 0;

    incidents.forEach(incident => {
      totalGroupedReports += incident.reportCount;
      
      if (incident.resolvedAt && incident.firstReportedAt) {
        totalResponseTime += incident.resolvedAt.getTime() - incident.firstReportedAt.getTime();
        resolvedCount++;
      }
    });

    const avgReportsPerIncident = incidents.length > 0 ? totalGroupedReports / incidents.length : 0;
    const avgResponseTime = resolvedCount > 0 ? totalResponseTime / (resolvedCount * 60 * 1000) : 0; // minutes

    return {
      avgReportsPerIncident: Math.round(avgReportsPerIncident * 100) / 100,
      avgResponseTimeMinutes: Math.round(avgResponseTime),
      groupingEfficiency: Math.round((totalGroupedReports - incidents.length) / totalGroupedReports * 100),
      verificationRate: await this.getVerificationRate()
    };
  }

  private async getVerificationRate(): Promise<number> {
    const total = await this.verificationRepository.count();
    const confirmed = await this.verificationRepository.count({ where: { isConfirmed: true } });
    
    return total > 0 ? Math.round((confirmed / total) * 100) : 0;
  }

  // Helper methods
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const earthRadius = 6371000;
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.degreesToRadians(lat1)) * 
              Math.cos(this.degreesToRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateCentroid(points: Array<{ latitude: number; longitude: number }>): { lat: number; lng: number } {
    if (points.length === 0) return { lat: 0, lng: 0 };
    
    const sum = points.reduce((acc, point) => ({
      lat: acc.lat + point.latitude,
      lng: acc.lng + point.longitude
    }), { lat: 0, lng: 0 });

    return {
      lat: sum.lat / points.length,
      lng: sum.lng / points.length
    };
  }

  private calculateRadius(points: Array<{ latitude: number; longitude: number }>, centroid: { lat: number; lng: number }): number {
    if (points.length === 0) return 0;
    
    const distances = points.map(point => 
      this.calculateDistance(point.latitude, point.longitude, centroid.lat, centroid.lng)
    );
    
    return Math.max(...distances);
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
    
    return variance;
  }

  private generateSummary(reportData: any): string {
    const type = reportData.type || 'incident';
    const location = reportData.location || 'unknown location';
    const desc = reportData.description?.substring(0, 100) || '';
    
    return `${type} at ${location}: ${desc}`;
  }

  private async updateReportWithGroup(reportType: 'EMERGENCY' | 'ISSUE', reportId: number, groupId: number): Promise<void> {
    try {
      if (reportType === 'EMERGENCY') {
        await this.emergencyRepository.update(
          { id: reportId },
          { 
            isConsolidated: true,
            consolidationId: groupId,
            updatedAt: new Date()
          }
        );
      } else {
        await this.issueRepository.update(
          { id: reportId },
          { 
            isConsolidated: true,
            consolidationId: groupId,
            updatedAt: new Date()
          }
        );
      }
    } catch (error) {
      this.logger.error('Error updating report with group:', error);
    }
  }

  private shouldInvestigate(group: IncidentGroup, analytics: IncidentAnalytics): boolean {
    return !!analytics.verificationFlags?.needsInvestigation;
  }

  private async notifyNewIncident(group: IncidentGroup): Promise<void> {
    // Implementation depends on your notification system
    this.logger.log(`New incident created: #${group.id} - ${group.summary}`);
  }

  private async notifyAuthorities(group: IncidentGroup, reason: string): Promise<void> {
    // Notify relevant departments
    this.logger.log(`Notifying authorities for incident #${group.id}: ${reason}`);
  }

  private async notifyReporters(group: IncidentGroup, newStatus: string): Promise<void> {
    // Notify all unique reporters about status change
    const reporters = group.reporterPhones;
    this.logger.log(`Notifying ${reporters.length} reporters about status change to ${newStatus}`);
  }
}