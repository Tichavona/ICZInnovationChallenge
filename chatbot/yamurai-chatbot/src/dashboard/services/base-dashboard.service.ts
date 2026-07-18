// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-unsafe-call */
// /* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
// /* eslint-disable @typescript-eslint/no-floating-promises */
// /* eslint-disable @typescript-eslint/no-misused-promises */
// /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
// /* eslint-disable @typescript-eslint/require-await */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-return */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable prettier/prettier */
// // src/dashboard/services/base-dashboard.service.ts
// import { Injectable, Logger } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, Between, FindOptionsWhere, In } from 'typeorm';
// import { EmergencyReport, EmergencyStatus, EmergencyType, EmergencyPriority } from '../../database/emergency-report.entity';
// import { IssueReport, IssueStatus, IssueType } from '../../database/issue-report.entity';
// import { Station } from '../../database/station.entity';
// import { IncidentAssignment, AssignmentStatus } from '../../database/incident-assignment.entity';
// import { SLAConfig, IncidentPriority, EscalationLevel } from '../../database/sla-config.entity';
// import { DepartmentStaff } from '../../database/department.entity';
// import { GeoDistanceUtil } from '../../shared/utils/geo-distance.util';
// import { SLACalculatorUtil } from '../../shared/utils/sla-calculator.util';
// import { DashboardFiltersDto, IncidentActionDto, AssignmentDto, BulkActionDto } from '../dto/dashboard-filters.dto';
// import { DashboardMetricsDto, IncidentResponseDto, PaginatedResponseDto, StationPerformanceDto } from '../dto/incident-response.dto';

// // Type guards for better type safety
// function isEmergencyReport(incident: any): incident is EmergencyReport {
//   return incident && 'priority' in incident && 'mediaUrlsJson' in incident;
// }

// function isIssueReport(incident: any): incident is IssueReport {
//   return incident && !('priority' in incident) && 'mediaInfoJson' in incident;
// }

// @Injectable()
// export class BaseDashboardService {
//   protected logger = new Logger(BaseDashboardService.name);

//   constructor(
//     @InjectRepository(EmergencyReport)
//     protected emergencyRepo: Repository<EmergencyReport>,
//     @InjectRepository(IssueReport)
//     protected issueRepo: Repository<IssueReport>,
//     @InjectRepository(Station)
//     protected stationRepo: Repository<Station>,
//     @InjectRepository(IncidentAssignment)
//     protected assignmentRepo: Repository<IncidentAssignment>,
//     @InjectRepository(SLAConfig)
//     protected slaConfigRepo: Repository<SLAConfig>,
//     @InjectRepository(DepartmentStaff)
//     protected staffRepo: Repository<DepartmentStaff>,
//     protected geoUtil: GeoDistanceUtil,
//     protected slaUtil: SLACalculatorUtil,
//   ) {}

//   /**
//    * Get incidents by department with filtering
//    */
//   async getIncidentsByDepartment(
//     departmentId: string,
//     filters: DashboardFiltersDto
//   ): Promise<PaginatedResponseDto<any>> {
//     try {
//       const skip = ((filters.page || 1) - 1) * (filters.limit || 20);
//       const take = filters.limit || 20;

//       // Build emergency query
//       const emergencyQuery = this.emergencyRepo
//         .createQueryBuilder('emergency')
//         .leftJoinAndSelect('emergency.assignments', 'assignments')
//         .leftJoinAndSelect('assignments.assignedStation', 'station')
//         .leftJoin('station.department', 'department')
//         .where('department.id = :deptId', { deptId: departmentId });

//       // Build issue query
//       const issueQuery = this.issueRepo
//         .createQueryBuilder('issue')
//         .leftJoinAndSelect('issue.assignments', 'assignments')
//         .leftJoinAndSelect('assignments.assignedStation', 'station')
//         .leftJoin('station.department', 'department')
//         .where('department.id = :deptId', { deptId: departmentId });

//       // Apply common filters
//       this.applyFiltersToQuery(emergencyQuery, filters, 'emergency');
//       this.applyFiltersToQuery(issueQuery, filters, 'issue');

//       // Execute queries
//       const [emergencies, emergenciesCount] = await emergencyQuery
//         .skip(skip)
//         .take(take)
//         .orderBy(`emergency.${filters.sortBy || 'createdAt'}`, filters.sortOrder || 'DESC')
//         .getManyAndCount();

//       const [issues, issuesCount] = await issueQuery
//         .skip(skip)
//         .take(take)
//         .orderBy(`issue.${filters.sortBy || 'createdAt'}`, filters.sortOrder || 'DESC')
//         .getManyAndCount();

//       // Combine and sort results - FIXED: Don't spread with conflicting properties
//       const allItems = [
//         ...emergencies.map(e => ({ ...e, incidentType: 'emergency' as const })),
//         ...issues.map(i => ({ ...i, incidentType: 'issue' as const }))
//       ].sort((a, b) => {
//         const dateA = new Date(a.createdAt).getTime();
//         const dateB = new Date(b.createdAt).getTime();
//         return filters.sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
//       });

//       const paginatedItems = allItems.slice(0, take);

//       return {
//         items: paginatedItems,
//         total: emergenciesCount + issuesCount,
//         page: filters.page || 1,
//         limit: take,
//         totalPages: Math.ceil((emergenciesCount + issuesCount) / take)
//       };
//     } catch (error) {
//       this.logger.error(`Error getting incidents by department: ${error.message}`);
//       throw error;
//     }
//   }

//   /**
//    * Apply filters to query builder
//    */
//   private applyFiltersToQuery(query: any, filters: DashboardFiltersDto, entityAlias: string): void {
//     if (filters.status) {
//       if (Array.isArray(filters.status)) {
//         query.andWhere(`${entityAlias}.status IN (:...statuses)`, { statuses: filters.status });
//       } else {
//         query.andWhere(`${entityAlias}.status = :status`, { status: filters.status });
//       }
//     }

//     if (filters.priority && entityAlias === 'emergency') {
//       if (Array.isArray(filters.priority)) {
//         query.andWhere(`${entityAlias}.priority IN (:...priorities)`, { priorities: filters.priority });
//       } else {
//         query.andWhere(`${entityAlias}.priority = :priority`, { priority: filters.priority });
//       }
//     }

//     if (filters.type) {
//       if (Array.isArray(filters.type)) {
//         query.andWhere(`${entityAlias}.type IN (:...types)`, { types: filters.type });
//       } else {
//         query.andWhere(`${entityAlias}.type = :type`, { type: filters.type });
//       }
//     }

//     if (filters.stationId) {
//       query.andWhere('station.id = :stationId', { stationId: filters.stationId });
//     }

//     if (filters.assignedTo) {
//       query.andWhere('assignments.assignedStaffId = :staffId', { staffId: filters.assignedTo });
//     }

//     if (filters.search) {
//       query.andWhere(
//         `(${entityAlias}.description LIKE :search OR ${entityAlias}.location LIKE :search)`,
//         { search: `%${filters.search}%` }
//       );
//     }

//     if (filters.startDate) {
//       query.andWhere(`${entityAlias}.createdAt >= :startDate`, { startDate: filters.startDate });
//     }

//     if (filters.endDate) {
//       query.andWhere(`${entityAlias}.createdAt <= :endDate`, { endDate: filters.endDate });
//     }

//     if (filters.timeframe && !filters.startDate && !filters.endDate) {
//       const { start, end } = this.getTimeframeDates(filters.timeframe);
//       query.andWhere(`${entityAlias}.createdAt BETWEEN :start AND :end`, { start, end });
//     }

//     if (!filters.includeArchived) {
//       query.andWhere(`${entityAlias}.isArchived = :isArchived`, { isArchived: false });
//     }
//   }

//   /**
//    * Get timeframe dates
//    */
//   private getTimeframeDates(timeframe: string): { start: Date; end: Date } {
//     const end = new Date();
//     const start = new Date();

//     switch (timeframe) {
//       case '1h':
//         start.setHours(start.getHours() - 1);
//         break;
//       case '24h':
//         start.setHours(start.getHours() - 24);
//         break;
//       case '7d':
//         start.setDate(start.getDate() - 7);
//         break;
//       case '30d':
//         start.setDate(start.getDate() - 30);
//         break;
//       case '90d':
//         start.setDate(start.getDate() - 90);
//         break;
//       default:
//         start.setDate(start.getDate() - 30);
//     }

//     return { start, end };
//   }
  
//   /**
//    * Get single incident details
//    */
//   async getIncidentDetails(id: string): Promise<any> {
//     try {
//       const numericId = parseInt(id);
      
//       // Try emergency report first
//       const emergency = await this.emergencyRepo.findOne({
//         where: { id: numericId },
//         relations: ['user', 'assignments', 'assignments.assignedStation', 'assignments.assignedStaff']
//       });

//       if (emergency) {
//         // Create a new object without overwriting existing properties
//         return {
//           ...emergency,
//           incidentType: 'emergency' // Use a different property name
//         };
//       }

//       // Try issue report
//       const issue = await this.issueRepo.findOne({
//         where: { id: numericId },
//         relations: ['user', 'assignments', 'assignments.assignedStation', 'assignments.assignedStaff']
//       });

//       if (issue) {
//         // Create a new object without overwriting existing properties
//         return {
//           ...issue,
//           incidentType: 'issue' // Use a different property name
//         };
//       }

//       return null;
//     } catch (error) {
//       this.logger.error(`Error getting incident details: ${error.message}`);
//       throw error;
//     }
//   }

//   /**
//    * Update incident status
//    */
//   async updateIncidentStatus(
//     id: string,
//     status: string,
//     notes: string,
//     userId: string
//   ): Promise<any> {
//     try {
//       const numericId = parseInt(id);
      
//       // Try emergency report first
//       const emergency = await this.emergencyRepo.findOne({
//         where: { id: numericId }
//       });

//       if (emergency) {
//         emergency.status = status as EmergencyStatus;
//         emergency.adminNotes = notes;
//         emergency.lastEditedBy = userId;
//         emergency.lastEditedAt = new Date();
        
//         // Add to edit history
//         const editHistory = emergency.editHistory || [];
//         editHistory.push({
//           timestamp: new Date(),
//           action: 'status_update',
//           description: `Status updated to ${status}: ${notes}`,
//           editedBy: userId
//         });
//         emergency.editHistory = editHistory;

//         if (status === EmergencyStatus.RESOLVED) {
//           emergency.resolvedAt = new Date();
//         }

//         return await this.emergencyRepo.save(emergency);
//       }

//       // Try issue report
//       const issue = await this.issueRepo.findOne({
//         where: { id: numericId }
//       });

//       if (issue) {
//         issue.status = status as IssueStatus;
//         issue.adminNotes = notes;
//         issue.lastEditedBy = userId;
//         issue.lastEditedAt = new Date();

//         // Add to edit history
//         const editHistory = issue.editHistory || [];
//         editHistory.push({
//           timestamp: new Date(),
//           action: 'status_update',
//           description: `Status updated to ${status}: ${notes}`,
//           editedBy: userId
//         });
//         issue.editHistory = editHistory;

//         if (status === IssueStatus.RESOLVED) {
//           issue.resolvedAt = new Date();
//         }

//         return await this.issueRepo.save(issue);
//       }

//       return null;
//     } catch (error) {
//       this.logger.error(`Error updating incident status: ${error.message}`);
//       throw error;
//     }
//   }

//   /**
//    * Assign incident to station/staff
//    */
//   async assignIncident(
//     id: string,
//     assignmentDto: AssignmentDto,
//     userId: string
//   ): Promise<IncidentAssignment> {
//     try {
//       const numericId = parseInt(id);
      
//       // Get the incident
//       let emergency: EmergencyReport | null = null;
//       let issue: IssueReport | null = null;
//       let incidentType: 'emergency' | 'issue' = 'emergency';

//       emergency = await this.emergencyRepo.findOne({
//         where: { id: numericId }
//       });

//       if (!emergency) {
//         issue = await this.issueRepo.findOne({
//           where: { id: numericId }
//         });
//         incidentType = 'issue';
//       }

//       if (!emergency && !issue) {
//         throw new Error('Incident not found');
//       }

//       // Get station
//       const station = await this.stationRepo.findOne({
//         where: { id: assignmentDto.stationId }
//       });

//       if (!station) {
//         throw new Error('Station not found');
//       }

//       // Create assignment
//       const assignment = new IncidentAssignment();
//       assignment.incidentType = incidentType;
//       assignment.incidentId = id;
//       assignment.assignedStation = station;
//       assignment.status = AssignmentStatus.PENDING;
//       assignment.assignedAt = new Date();
//       assignment.notes = assignmentDto.notes || '';

//       if (incidentType === 'emergency' && emergency) {
//         assignment.emergency = emergency;
//         // Calculate distance using emergency coordinates
//         assignment.distanceToIncidentKm = this.geoUtil.calculateDistance(
//           emergency.latitude,
//           emergency.longitude,
//           station.latitude,
//           station.longitude
//         );
//       } else if (issue) {
//         assignment.issue = issue;
//         // Calculate distance using issue coordinates
//         assignment.distanceToIncidentKm = this.geoUtil.calculateDistance(
//           issue.latitude || 0,
//           issue.longitude || 0,
//           station.latitude,
//           station.longitude
//         );
//       }

//       // Update station capacity
//       station.operationalCapacity.currentIncidents++;
//       await this.stationRepo.save(station);

//       // Calculate SLA targets
//       await this.calculateSLATargets(assignment);

//       return await this.assignmentRepo.save(assignment);
//     } catch (error) {
//       this.logger.error(`Error assigning incident: ${error.message}`);
//       throw error;
//     }
//   }

//   /**
//    * Calculate and set SLA targets for assignment
//    */
//   private async calculateSLATargets(assignment: IncidentAssignment): Promise<void> {
//     const emergency = assignment.emergency;
//     const issue = assignment.issue;
    
//     if (!emergency && !issue) return;

//     // Map the priority to IncidentPriority enum
//     let slaPriority: IncidentPriority = IncidentPriority.MEDIUM;
//     let incidentType = '';

//     if (emergency) {
//       switch (emergency.priority) {
//         case EmergencyPriority.CRITICAL:
//           slaPriority = IncidentPriority.CRITICAL;
//           break;
//         case EmergencyPriority.HIGH:
//           slaPriority = IncidentPriority.HIGH;
//           break;
//         case EmergencyPriority.MEDIUM:
//           slaPriority = IncidentPriority.MEDIUM;
//           break;
//         case EmergencyPriority.LOW:
//           slaPriority = IncidentPriority.LOW;
//           break;
//       }
//       incidentType = emergency.type;
//     } else if (issue) {
//       incidentType = issue.type;
//     }

//     const whereClause: FindOptionsWhere<SLAConfig> = {
//       department: { id: assignment.assignedStation.department?.id },
//       incidentType: incidentType,
//       priority: slaPriority,
//       isActive: true
//     };

//     const slaConfig = await this.slaConfigRepo.findOne({
//       where: whereClause
//     });

//     if (slaConfig) {
//       assignment.slaMetrics = {
//         responseTarget: slaConfig.responseTimeMinutes,
//         actualResponse: null,
//         resolutionTarget: slaConfig.resolutionTimeMinutes,
//         actualResolution: null,
//         breachedAt: null,
//         breachLevel: null
//       };
      
//       // Schedule SLA monitoring (don't await, let it run in background)
//       this.monitorSLABreach(assignment, slaConfig);
//     }
//   }

//   /**
//    * Monitor for SLA breaches
//    */
//   private async monitorSLABreach(
//     assignment: IncidentAssignment,
//     slaConfig: SLAConfig
//   ): Promise<void> {
//     setTimeout(async () => {
//       const currentAssignment = await this.assignmentRepo.findOne({
//         where: { id: assignment.id }
//       });
      
//       if (currentAssignment && !currentAssignment.acknowledgedAt) {
//         await this.handleSLABreach(currentAssignment, slaConfig, 'response');
//       }
//     }, slaConfig.responseTimeMinutes * 60 * 1000);

//     setTimeout(async () => {
//       const currentAssignment = await this.assignmentRepo.findOne({
//         where: { id: assignment.id }
//       });
      
//       if (currentAssignment && currentAssignment.status !== AssignmentStatus.COMPLETED) {
//         await this.handleSLABreach(currentAssignment, slaConfig, 'resolution');
//       }
//     }, slaConfig.resolutionTimeMinutes * 60 * 1000);
//   }

//   /**
//    * Handle SLA breach with escalation
//    */
//   private async handleSLABreach(
//     assignment: IncidentAssignment,
//     slaConfig: SLAConfig,
//     breachType: 'response' | 'resolution'
//   ): Promise<void> {
//     const breachMinutes = breachType === 'response' 
//       ? slaConfig.responseTimeMinutes 
//       : slaConfig.resolutionTimeMinutes;

//     const escalationRule = slaConfig.escalationRules?.find(
//       rule => rule.triggerMinutes <= breachMinutes
//     );

//     if (escalationRule) {
//       if (!assignment.escalationHistory) {
//         assignment.escalationHistory = [];
//       }

//       assignment.escalationHistory.push({
//         level: escalationRule.level,
//         escalatedAt: new Date(),
//         escalatedTo: escalationRule.notifyRoles?.join(', ') || '',
//         reason: `SLA ${breachType} time exceeded`,
//         resolved: false
//       });

//       if (!assignment.slaMetrics) {
//         assignment.slaMetrics = {
//           responseTarget: 0,
//           actualResponse: null,
//           resolutionTarget: 0,
//           actualResolution: null,
//           breachedAt: null,
//           breachLevel: null
//         };
//       }

//       assignment.slaMetrics.breachedAt = new Date();
//       assignment.slaMetrics.breachLevel = escalationRule.level;
//       assignment.status = AssignmentStatus.ESCALATED;

//       await this.assignmentRepo.save(assignment);

//       await this.notifyEscalation(assignment, escalationRule);
//     }
//   }

//   /**
//    * Notify stakeholders of escalation
//    */
//   private async notifyEscalation(
//     assignment: IncidentAssignment,
//     escalationRule: any
//   ): Promise<void> {
//     this.logger.warn(
//       `SLA Breach: Incident ${assignment.incidentId} escalated to ${escalationRule.level}`
//     );
//     // TODO: Implement actual notification (email, SMS, push)
//   }

//   /**
//    * Get stations by department
//    */
//   async getStationsByDepartment(departmentId: string): Promise<Station[]> {
//     try {
//       return await this.stationRepo.find({
//         where: {
//           department: { id: departmentId },
//           status: 'active'
//         },
//         relations: ['parentStation', 'subStations']
//       });
//     } catch (error) {
//       this.logger.error(`Error getting stations: ${error.message}`);
//       throw error;
//     }
//   }

//   /**
//    * Get station details
//    */
//   async getStationDetails(id: string): Promise<any> {
//     try {
//       const station = await this.stationRepo.findOne({
//         where: { id },
//         relations: ['parentStation', 'subStations', 'assignments', 'department']
//       });

//       if (!station) {
//         return null;
//       }

//       const activeAssignments = station.assignments?.filter(
//         a => a.status !== AssignmentStatus.COMPLETED
//       ).length || 0;

//       const completedAssignments = station.assignments?.filter(
//         a => a.status === AssignmentStatus.COMPLETED
//       ) || [];

//       const avgResponseTime = completedAssignments.length > 0
//         ? completedAssignments.reduce((sum, a) => {
//             if (a.acknowledgedAt) {
//               return sum + (a.acknowledgedAt.getTime() - a.assignedAt.getTime()) / (1000 * 60);
//             }
//             return sum;
//           }, 0) / completedAssignments.length
//         : 0;

//       return {
//         ...station,
//         metrics: {
//           activeAssignments,
//           totalAssignments: station.assignments?.length || 0,
//           avgResponseTimeMinutes: Math.round(avgResponseTime * 10) / 10,
//           utilizationRate: station.operationalCapacity.currentIncidents / 
//             station.operationalCapacity.maxConcurrentIncidents * 100,
//           staffUtilization: station.operationalCapacity.availableStaff / 
//             station.operationalCapacity.totalStaff * 100
//         }
//       };
//     } catch (error) {
//       this.logger.error(`Error getting station details: ${error.message}`);
//       throw error;
//     }
//   }

//   /**
//    * Get staff members
//    */
//   async getStaffMembers(
//     departmentId: string,
//     stationId?: string,
//     onDuty?: boolean
//   ): Promise<DepartmentStaff[]> {
//     try {
//       const query = this.staffRepo
//         .createQueryBuilder('staff')
//         .leftJoinAndSelect('staff.user', 'user')
//         .leftJoinAndSelect('staff.department', 'department')
//         .leftJoinAndSelect('staff.station', 'station')
//         .where('department.id = :deptId', { deptId: departmentId });

//       if (stationId) {
//         query.andWhere('station.id = :stationId', { stationId });
//       }

//       if (onDuty !== undefined) {
//         query.andWhere('staff.isOnDuty = :onDuty', { onDuty });
//       }

//       return await query.getMany();
//     } catch (error) {
//       this.logger.error(`Error getting staff members: ${error.message}`);
//       throw error;
//     }
//   }

//   /**
//    * Get SLA configs
//    */
//   async getSLAConfigs(departmentId: string): Promise<SLAConfig[]> {
//     try {
//       return await this.slaConfigRepo.find({
//         where: {
//           department: { id: departmentId },
//           isActive: true
//         },
//         order: {
//           priority: 'ASC',
//           incidentType: 'ASC'
//         }
//       });
//     } catch (error) {
//       this.logger.error(`Error getting SLA configs: ${error.message}`);
//       throw error;
//     }
//   }

//   /**
//    * Get active SLA breaches
//    */
//   async getActiveSLABreaches(
//     departmentId: string,
//     stationId?: string
//   ): Promise<IncidentAssignment[]> {
//     try {
//       const query = this.assignmentRepo
//         .createQueryBuilder('assignment')
//         .leftJoinAndSelect('assignment.emergency', 'emergency')
//         .leftJoinAndSelect('assignment.issue', 'issue')
//         .leftJoinAndSelect('assignment.assignedStation', 'station')
//         .leftJoin('station.department', 'department')
//         .where('department.id = :deptId', { deptId: departmentId })
//         .andWhere('assignment.slaMetrics IS NOT NULL')
//         .andWhere('assignment.status != :completed', { completed: AssignmentStatus.COMPLETED });

//       if (stationId) {
//         query.andWhere('station.id = :stationId', { stationId });
//       }

//       return await query.getMany();
//     } catch (error) {
//       this.logger.error(`Error getting SLA breaches: ${error.message}`);
//       throw error;
//     }
//   }

//   /**
//    * Bulk update incidents
//    */
//   async bulkUpdateIncidents(
//     bulkDto: BulkActionDto,
//     userId: string
//   ): Promise<{ success: string[]; failed: string[] }> {
//     const results: { success: string[]; failed: string[] } = {
//       success: [],
//       failed: []
//     };

//     for (const incidentId of bulkDto.incidentIds) {
//       try {
//         switch (bulkDto.action) {
//           case 'update-status':
//             if (bulkDto.data?.status) {
//               await this.updateIncidentStatus(
//                 incidentId,
//                 bulkDto.data.status,
//                 bulkDto.data.notes || 'Bulk status update',
//                 userId
//               );
//             }
//             break;

//           case 'assign':
//             if (bulkDto.data?.stationId) {
//               const assignmentDto = new AssignmentDto();
//               assignmentDto.stationId = bulkDto.data.stationId;
//               assignmentDto.staffIds = bulkDto.data.staffIds;
//               assignmentDto.notes = bulkDto.data.notes;
//               await this.assignIncident(incidentId, assignmentDto, userId);
//             }
//             break;

//           case 'archive':
//             await this.archiveIncident(incidentId, userId);
//             break;
//         }
//         results.success.push(incidentId);
//       } catch (error) {
//         this.logger.error(`Failed to ${bulkDto.action} incident ${incidentId}: ${error.message}`);
//         results.failed.push(incidentId);
//       }
//     }

//     return results;
//   }

//   /**
//    * Archive incident
//    */
//   private async archiveIncident(incidentId: string, userId: string): Promise<void> {
//     const numericId = parseInt(incidentId);
    
//     const emergency = await this.emergencyRepo.findOne({
//       where: { id: numericId }
//     });

//     if (emergency) {
//       emergency.isArchived = true;
//       emergency.lastEditedBy = userId;
//       emergency.lastEditedAt = new Date();
//       await this.emergencyRepo.save(emergency);
//       return;
//     }

//     const issue = await this.issueRepo.findOne({
//       where: { id: numericId }
//     });

//     if (issue) {
//       issue.isArchived = true;
//       issue.lastEditedBy = userId;
//       issue.lastEditedAt = new Date();
//       await this.issueRepo.save(issue);
//     }
//   }

//   /**
//    * Get export data
//    */
//   async getExportData(filters: DashboardFiltersDto): Promise<any[]> {
//     try {
//       const { items } = await this.getIncidentsByDepartment('all', filters);
//       return items;
//     } catch (error) {
//       this.logger.error(`Error getting export data: ${error.message}`);
//       throw error;
//     }
//   }

//   /**
//    * Generate export file
//    */
//   async generateExport(data: any[], format: string): Promise<any> {
//     return {
//       data,
//       format,
//       generatedAt: new Date(),
//       count: data.length
//     };
//   }

//   /**
//    * Get dashboard metrics
//    */
//   async getDashboardMetrics(
//     departmentId: string,
//     stationId?: string,
//     timeframe?: { start: Date; end: Date }
//   ): Promise<DashboardMetricsDto> {
//     const queryBuilder = this.assignmentRepo
//       .createQueryBuilder('assignment')
//       .leftJoinAndSelect('assignment.emergency', 'emergency')
//       .leftJoinAndSelect('assignment.issue', 'issue')
//       .leftJoinAndSelect('assignment.assignedStation', 'station')
//       .leftJoinAndSelect('station.department', 'department')
//       .where('department.id = :deptId', { deptId: departmentId });

//     if (stationId) {
//       queryBuilder.andWhere('station.id = :stationId', { stationId });
//     }

//     if (timeframe) {
//       queryBuilder.andWhere('assignment.assignedAt BETWEEN :start AND :end', {
//         start: timeframe.start,
//         end: timeframe.end
//       });
//     }

//     const assignments = await queryBuilder.getMany();

//     const totalIncidents = assignments.length;
//     const activeIncidents = assignments.filter(
//       a => ![AssignmentStatus.COMPLETED, AssignmentStatus.ESCALATED].includes(a.status)
//     ).length;
    
//     const slaBreaches = assignments.filter(
//       a => a.slaMetrics?.breachedAt
//     ).length;

//     const assignmentsWithAcknowledged = assignments.filter(a => a.acknowledgedAt);
//     const avgResponseTime = assignmentsWithAcknowledged.length > 0
//       ? assignmentsWithAcknowledged.reduce((sum, a) => {
//           const responseTime = (a.acknowledgedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60);
//           return sum + responseTime;
//         }, 0) / assignmentsWithAcknowledged.length
//       : 0;

//     return {
//       totalIncidents,
//       activeIncidents,
//       resolvedIncidents: assignments.filter(a => a.status === AssignmentStatus.COMPLETED).length,
//       slaBreaches,
//       slaComplianceRate: totalIncidents > 0 ? ((totalIncidents - slaBreaches) / totalIncidents) * 100 : 100,
//       avgResponseTimeMinutes: Math.round(avgResponseTime * 10) / 10,
//       stationPerformance: await this.getStationPerformance(assignments),
//       priorityBreakdown: await this.getPriorityBreakdown(departmentId, timeframe),
//       incidentsByType: {},
//       incidentsByStatus: {}
//     };
//   }

//   /**
//    * Get station performance metrics
//    */
//   private async getStationPerformance(assignments: IncidentAssignment[]): Promise<StationPerformanceDto[]> {
//     const stationMap = new Map<string, StationPerformanceDto & { responseTimeSum: number; responseTimeCount: number }>();

//     assignments.forEach(assignment => {
//       const stationId = assignment.assignedStation.id;
//       if (!stationMap.has(stationId)) {
//         stationMap.set(stationId, {
//           stationId,
//           stationName: assignment.assignedStation.name,
//           totalAssigned: 0,
//           completed: 0,
//           slaBreaches: 0,
//           avgResponseTime: 0,
//           responseTimeSum: 0,
//           responseTimeCount: 0
//         });
//       }

//       const stats = stationMap.get(stationId)!;
//       stats.totalAssigned++;
      
//       if (assignment.status === AssignmentStatus.COMPLETED) {
//         stats.completed++;
//       }
      
//       if (assignment.slaMetrics?.breachedAt) {
//         stats.slaBreaches++;
//       }
      
//       if (assignment.acknowledgedAt) {
//         const responseTime = (assignment.acknowledgedAt.getTime() - assignment.assignedAt.getTime()) / (1000 * 60);
//         stats.responseTimeSum += responseTime;
//         stats.responseTimeCount++;
//         stats.avgResponseTime = stats.responseTimeSum / stats.responseTimeCount;
//       }
//     });

//     return Array.from(stationMap.values()).map(({ responseTimeSum, responseTimeCount, ...rest }) => ({
//       ...rest,
//       avgResponseTime: Math.round(rest.avgResponseTime * 10) / 10
//     }));
//   }

//   /**
//    * Get priority breakdown of incidents
//    */
//   private async getPriorityBreakdown(
//     departmentId: string,
//     timeframe?: { start: Date; end: Date }
//   ): Promise<{ critical: number; high: number; medium: number; low: number }> {
//     const queryBuilder = this.emergencyRepo
//       .createQueryBuilder('emergency')
//       .leftJoin('emergency.assignments', 'assignment')
//       .leftJoin('assignment.assignedStation', 'station')
//       .leftJoin('station.department', 'department')
//       .where('department.id = :deptId', { deptId: departmentId });

//     if (timeframe) {
//       queryBuilder.andWhere('emergency.createdAt BETWEEN :start AND :end', {
//         start: timeframe.start,
//         end: timeframe.end
//       });
//     }

//     const emergencies = await queryBuilder.getMany();

//     return {
//       critical: emergencies.filter(e => e.priority === EmergencyPriority.CRITICAL).length,
//       high: emergencies.filter(e => e.priority === EmergencyPriority.HIGH).length,
//       medium: emergencies.filter(e => e.priority === EmergencyPriority.MEDIUM).length,
//       low: emergencies.filter(e => e.priority === EmergencyPriority.LOW).length
//     };
//   }

//   /**
//    * Find nearest stations to incident location
//    */
//   async findNearestStations(
//     latitude: number,
//     longitude: number,
//     departmentId: string,
//     limit: number = 5
//   ): Promise<Station[]> {
//     const stations = await this.stationRepo
//       .createQueryBuilder('station')
//       .leftJoinAndSelect('station.department', 'department')
//       .where('department.id = :deptId', { deptId: departmentId })
//       .andWhere('station.status = :status', { status: 'active' })
//       .getMany();

//     // Calculate distances and create a new array with distance property
//     const stationsWithDistance = stations.map(station => ({
//       station, // Keep the original station object
//       distance: this.geoUtil.calculateDistance(
//         latitude,
//         longitude,
//         station.latitude,
//         station.longitude
//       )
//     }));

//     // Filter by coverage radius and sort by distance
//     const filteredStations = stationsWithDistance
//       .filter(item => item.distance <= item.station.coverageRadiusKm)
//       .sort((a, b) => a.distance - b.distance)
//       .slice(0, limit)
//       .map(item => item.station); // Return only the station objects

//     return filteredStations;
//   }

//   /**
//    * Auto-assign incident to appropriate station based on proximity and capacity
//    */
//   async autoAssignIncident(
//     incident: EmergencyReport | IssueReport,
//     departmentId: string
//   ): Promise<IncidentAssignment> {
//     const nearestStations = await this.findNearestStations(
//       incident.latitude,
//       incident.longitude,
//       departmentId
//     );

//     for (const station of nearestStations) {
//       if (station.operationalCapacity.currentIncidents < 
//           station.operationalCapacity.maxConcurrentIncidents) {
        
//         const assignment = new IncidentAssignment();
        
//         if (isEmergencyReport(incident)) {
//           assignment.incidentType = 'emergency';
//           assignment.emergency = incident;
//         } else {
//           assignment.incidentType = 'issue';
//           assignment.issue = incident as IssueReport;
//         }
        
//         assignment.incidentId = incident.id.toString();
//         assignment.assignedStation = station;
//         assignment.status = AssignmentStatus.PENDING;
//         assignment.assignedAt = new Date();
//         assignment.distanceToIncidentKm = this.geoUtil.calculateDistance(
//           incident.latitude,
//           incident.longitude,
//           station.latitude,
//           station.longitude
//         );

//         station.operationalCapacity.currentIncidents++;
//         await this.stationRepo.save(station);

//         await this.calculateSLATargets(assignment);

//         return this.assignmentRepo.save(assignment);
//       }
//     }

//     return this.escalateUnassignedIncident(incident, departmentId);
//   }

//   /**
//    * Escalate unassigned incident
//    */
//   private async escalateUnassignedIncident(
//     incident: EmergencyReport | IssueReport,
//     departmentId: string
//   ): Promise<IncidentAssignment> {
//     const assignment = new IncidentAssignment();
    
//     if (isEmergencyReport(incident)) {
//       assignment.incidentType = 'emergency';
//       assignment.emergency = incident;
//       incident.status = EmergencyStatus.REPORTED;
//       await this.emergencyRepo.save(incident);
//     } else {
//       assignment.incidentType = 'issue';
//       assignment.issue = incident as IssueReport;
//       (incident as IssueReport).status = IssueStatus.REPORTED;
//       await this.issueRepo.save(incident as IssueReport);
//     }
    
//     assignment.incidentId = incident.id.toString();
//     assignment.status = AssignmentStatus.ESCALATED;
//     assignment.assignedAt = new Date();
//     assignment.notes = 'Auto-escalated - No available stations';
//     assignment.escalationHistory = [{
//       level: 'headquarters',
//       escalatedAt: new Date(),
//       escalatedTo: 'department_director',
//       reason: 'No stations available for assignment',
//       resolved: false
//     }];
    
//     return this.assignmentRepo.save(assignment);
//   }
// }

// backend/src/dashboard/services/unified-dashboard.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan, In } from 'typeorm';
import { EmergencyReport, EmergencyStatus, EmergencyPriority } from '../../database/emergency-report.entity';
import { IssueReport, IssueStatus } from '../../database/issue-report.entity';
import { IncidentAssignment, AssignmentStatus } from '../../database/incident-assignment.entity';
import { Department, DepartmentStaff } from '../../database/department.entity';
import { Station } from '../../database/station.entity';
import { DashboardUser, DashboardNotification } from '../../database/dashboard.entity';
import { SLAConfig } from '../../database/sla-config.entity';
import { UserRole } from '../rbac/roles.enum';
import { NotificationGateway } from '../notifications/notification.gateway';

export interface UnifiedDashboardData {
  summary: DashboardSummary;
  incidents: {
    emergencies: EmergencyReport[];
    issues: IssueReport[];
    activeIncidents: any[];
    recentIncidents: any[];
  };
  performance: {
    slaCompliance: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    departmentPerformance: DepartmentPerformance[];
    stationPerformance: StationPerformance[];
    staffPerformance: StaffPerformance[];
  };
  analytics: DashboardAnalytics;
  notifications: DashboardNotification[];
  filters: DashboardFilters;
}

export interface DashboardSummary {
  totalIncidents: number;
  activeIncidents: number;
  resolvedToday: number;
  criticalIncidents: number;
  pendingAssignments: number;
  slaBreaches: number;
  activeEscalations: number;
  availableStaff: number;
  availableVehicles: number;
  stationsAtCapacity: number;
}

export interface DepartmentPerformance {
  departmentId: string;
  departmentName: string;
  type: string;
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  slaCompliance: number;
  staffUtilization: number;
  capacityUtilization: number;
}

export interface StationPerformance {
  stationId: string;
  stationName: string;
  department: string;
  currentLoad: number;
  maxCapacity: number;
  availableStaff: number;
  totalStaff: number;
  availableVehicles: number;
  totalVehicles: number;
  activeIncidents: IncidentAssignment[];
  avgResponseTime: number;
  status: string;
}

export interface StaffPerformance {
  staffId: string;
  name: string;
  role: string;
  specialization: string;
  isOnDuty: boolean;
  currentAssignments: number;
  completedToday: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  slaCompliance: number;
  customerRating: number;
}

export interface DashboardAnalytics {
  trends: {
    hourly: TimeSeriesData[];
    daily: TimeSeriesData[];
    weekly: TimeSeriesData[];
    monthly: TimeSeriesData[];
  };
  heatmap: HeatmapData[];
  typeDistribution: Record<string, number>;
  priorityDistribution: Record<EmergencyPriority, number>;
  statusDistribution: Record<string, number>;
  departmentWorkload: Record<string, number>;
  responseTimeByType: Record<string, number>;
  resolutionTimeByType: Record<string, number>;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  metric: string;
}

export interface HeatmapData {
  latitude: number;
  longitude: number;
  intensity: number;
  type: string;
  timestamp: Date;
}

export interface DashboardFilters {
  departmentId?: string;
  stationId?: string;
  status?: string[];
  priority?: string[];
  type?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class UnifiedDashboardService {
  protected readonly logger = new Logger(UnifiedDashboardService.name);

  constructor(
    @InjectRepository(EmergencyReport)
    protected emergencyRepo: Repository<EmergencyReport>,
    @InjectRepository(IssueReport)
    protected issueRepo: Repository<IssueReport>,
    @InjectRepository(IncidentAssignment)
    protected assignmentRepo: Repository<IncidentAssignment>,
    @InjectRepository(Department)
    protected departmentRepo: Repository<Department>,
    @InjectRepository(Station)
    protected stationRepo: Repository<Station>,
    @InjectRepository(DepartmentStaff)
    protected staffRepo: Repository<DepartmentStaff>,
    @InjectRepository(DashboardUser)
    protected dashboardUserRepo: Repository<DashboardUser>,
    @InjectRepository(SLAConfig)
    protected slaConfigRepo: Repository<SLAConfig>,
    @InjectRepository(DashboardNotification)
    protected notificationRepo: Repository<DashboardNotification>,
    protected notificationGateway: NotificationGateway,
  ) {}

  /**
   * Get unified dashboard data for a user based on their role
   */
  async getUnifiedDashboard(
    userId: string,
    userRole: UserRole,
    filters: DashboardFilters
  ): Promise<UnifiedDashboardData> {
    try {
      // Determine user's department and access level
      const userContext = await this.getUserContext(userId, userRole);

      // Apply role-based filters
      const enhancedFilters = this.applyRoleBasedFilters(filters, userContext);

      // Fetch all dashboard components in parallel
      const [
        summary,
        incidents,
        performance,
        analytics,
        notifications
      ] = await Promise.all([
        this.getDashboardSummary(enhancedFilters),
        this.getIncidents(enhancedFilters),
        this.getPerformanceMetrics(enhancedFilters),
        this.getDashboardAnalytics(enhancedFilters),
        this.getRelevantNotifications(userId, userContext, enhancedFilters)
      ]);

      return {
        summary,
        incidents,
        performance,
        analytics,
        notifications,
        filters: enhancedFilters
      };
    } catch (error) {
      this.logger.error('Error getting unified dashboard:', error);
      throw error;
    }
  }

  /**
   * Get department-specific dashboard
   */
  async getDepartmentDashboard(
    departmentId: string,
    filters: DashboardFilters
  ): Promise<UnifiedDashboardData> {
    return this.getUnifiedDashboard('system', UserRole.SUPER_ADMIN, {
      ...filters,
      departmentId
    });
  }

  /**
   * Get station-specific dashboard
   */
  async getStationDashboard(
    stationId: string,
    filters: DashboardFilters
  ): Promise<UnifiedDashboardData> {
    return this.getUnifiedDashboard('system', UserRole.SUPER_ADMIN, {
      ...filters,
      stationId
    });
  }

  /**
   * Get dashboard summary
   */
  private async getDashboardSummary(
    filters: DashboardFilters
  ): Promise<DashboardSummary> {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build base queries with filters
    const emergencyQuery = this.buildEmergencyQuery(filters);
    const issueQuery = this.buildIssueQuery(filters);
    const assignmentQuery = this.buildAssignmentQuery(filters);

    const [
      totalEmergencies,
      totalIssues,
      activeEmergencies,
      activeIssues,
      resolvedToday,
      criticalIncidents,
      pendingAssignments,
      slaBreaches,
      activeEscalations,
      availableStaff,
      availableVehicles,
      stationsAtCapacity
    ] = await Promise.all([
      emergencyQuery.getCount(),
      issueQuery.getCount(),
      emergencyQuery.clone()
        .andWhere('emergency.status NOT IN (:...resolvedStatuses)', {
          resolvedStatuses: [EmergencyStatus.RESOLVED, EmergencyStatus.CANCELLED]
        })
        .getCount(),
      issueQuery.clone()
        .andWhere('issue.status NOT IN (:...resolvedStatuses)', {
          resolvedStatuses: [IssueStatus.RESOLVED, IssueStatus.CLOSED]
        })
        .getCount(),
      // Resolved today
      this.getResolvedTodayCount(emergencyQuery, issueQuery, today, tomorrow),
      // Critical incidents
      emergencyQuery.clone()
        .andWhere('emergency.priority = :critical', { critical: EmergencyPriority.CRITICAL })
        .andWhere('emergency.status NOT IN (:...resolvedStatuses)', {
          resolvedStatuses: [EmergencyStatus.RESOLVED, EmergencyStatus.CANCELLED]
        })
        .getCount(),
      // Pending assignments
      assignmentQuery.clone()
        .andWhere('assignment.status = :pending', { pending: AssignmentStatus.PENDING })
        .getCount(),
      // SLA breaches
      this.getSLABreachesCount(assignmentQuery),
      // Active escalations
      assignmentQuery.clone()
        .andWhere('assignment.status = :escalated', { escalated: AssignmentStatus.ESCALATED })
        .getCount(),
      // Available staff
      this.getAvailableStaffCount(filters),
      // Available vehicles
      this.getAvailableVehiclesCount(filters),
      // Stations at capacity
      this.getStationsAtCapacityCount(filters)
    ]);

    return {
      totalIncidents: totalEmergencies + totalIssues,
      activeIncidents: activeEmergencies + activeIssues,
      resolvedToday,
      criticalIncidents,
      pendingAssignments,
      slaBreaches,
      activeEscalations,
      availableStaff,
      availableVehicles,
      stationsAtCapacity
    };
  }

  /**
   * Get resolved today count
   */
  private async getResolvedTodayCount(
    emergencyQuery: any,
    issueQuery: any,
    today: Date,
    tomorrow: Date
  ): Promise<number> {
    const emergencyResolved = await emergencyQuery.clone()
      .andWhere('emergency.resolvedAt BETWEEN :start AND :end', { start: today, end: tomorrow })
      .getCount();
    
    const issueResolved = await issueQuery.clone()
      .andWhere('issue.resolvedAt BETWEEN :start AND :end', { start: today, end: tomorrow })
      .getCount();

    return emergencyResolved + issueResolved;
  }

  /**
   * Get SLA breaches count
   */
  private async getSLABreachesCount(assignmentQuery: any): Promise<number> {
    const assignments = await assignmentQuery.clone().getMany();
    return assignments.filter(a => a.slaMetrics?.breachedAt).length;
  }

  /**
   * Get available staff count
   */
  private async getAvailableStaffCount(filters: DashboardFilters): Promise<number> {
    const where: any = {
      isActive: true,
      isOnDuty: true
    };

    if (filters.departmentId) {
      where.department = { id: filters.departmentId };
    }

    if (filters.stationId) {
      where.station = { id: filters.stationId };
    }

    return await this.staffRepo.count({ where });
  }

  /**
   * Get available vehicles count
   */
  private async getAvailableVehiclesCount(filters: DashboardFilters): Promise<number> {
    const query = this.stationRepo.createQueryBuilder('station');

    if (filters.departmentId) {
      query.andWhere('station.departmentId = :deptId', { deptId: filters.departmentId });
    }

    if (filters.stationId) {
      query.andWhere('station.id = :stationId', { stationId: filters.stationId });
    }

    const stations = await query.getMany();
    
    return stations.reduce((sum, station) => {
      return sum + (station.operationalCapacity?.availableVehicles || 0);
    }, 0);
  }

  /**
   * Get stations at capacity count
   */
  private async getStationsAtCapacityCount(filters: DashboardFilters): Promise<number> {
    const query = this.stationRepo.createQueryBuilder('station');

    if (filters.departmentId) {
      query.andWhere('station.departmentId = :deptId', { deptId: filters.departmentId });
    }

    if (filters.stationId) {
      query.andWhere('station.id = :stationId', { stationId: filters.stationId });
    }

    const stations = await query.getMany();

    return stations.filter(station => {
      const capacity = station.operationalCapacity;
      if (!capacity) return false;
      const load = capacity.currentIncidents || 0;
      const max = capacity.maxConcurrentIncidents || 10;
      return load >= max * 0.8; // 80% or more capacity
    }).length;
  }

  /**
   * Get incidents with filters
   */
  private async getIncidents(filters: DashboardFilters): Promise<{
    emergencies: EmergencyReport[];
    issues: IssueReport[];
    activeIncidents: any[];
    recentIncidents: any[];
  }> {
    const limit = filters.limit || 100;

    // Get emergencies
    const emergencyQuery = this.buildEmergencyQuery(filters)
      .orderBy('emergency.createdAt', 'DESC')
      .limit(limit);

    // Get issues
    const issueQuery = this.buildIssueQuery(filters)
      .orderBy('issue.createdAt', 'DESC')
      .limit(limit);

    const [emergencies, issues] = await Promise.all([
      emergencyQuery.getMany(),
      issueQuery.getMany()
    ]);

    // Get active incidents (not resolved)
    const activeEmergencyQuery = this.buildEmergencyQuery(filters)
      .andWhere('emergency.status NOT IN (:...resolvedStatuses)', {
        resolvedStatuses: [EmergencyStatus.RESOLVED, EmergencyStatus.CANCELLED]
      })
      .orderBy('emergency.createdAt', 'DESC')
      .limit(50);

    const activeIssueQuery = this.buildIssueQuery(filters)
      .andWhere('issue.status NOT IN (:...resolvedStatuses)', {
        resolvedStatuses: [IssueStatus.RESOLVED, IssueStatus.CLOSED]
      })
      .orderBy('issue.createdAt', 'DESC')
      .limit(50);

    const [activeEmergencies, activeIssues] = await Promise.all([
      activeEmergencyQuery.getMany(),
      activeIssueQuery.getMany()
    ]);

    // Combine and sort active incidents
    const activeIncidents = [
      ...activeEmergencies.map(e => ({ ...e, type: 'emergency' })),
      ...activeIssues.map(i => ({ ...i, type: 'issue' }))
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Get recent incidents (last 24 hours)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentEmergencyQuery = this.buildEmergencyQuery(filters)
      .andWhere('emergency.createdAt >= :last24h', { last24h })
      .orderBy('emergency.createdAt', 'DESC');

    const recentIssueQuery = this.buildIssueQuery(filters)
      .andWhere('issue.createdAt >= :last24h', { last24h })
      .orderBy('issue.createdAt', 'DESC');

    const [recentEmergencies, recentIssues] = await Promise.all([
      recentEmergencyQuery.getMany(),
      recentIssueQuery.getMany()
    ]);

    const recentIncidents = [
      ...recentEmergencies.map(e => ({ ...e, type: 'emergency' })),
      ...recentIssues.map(i => ({ ...i, type: 'issue' }))
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      emergencies,
      issues,
      activeIncidents,
      recentIncidents
    };
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(
    filters: DashboardFilters
  ): Promise<{
    slaCompliance: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    departmentPerformance: DepartmentPerformance[];
    stationPerformance: StationPerformance[];
    staffPerformance: StaffPerformance[];
  }> {
    // Get all assignments for the period
    const assignmentQuery = this.buildAssignmentQuery(filters)
      .leftJoinAndSelect('assignment.assignedStation', 'station')
      .leftJoinAndSelect('station.department', 'department')
      .leftJoinAndSelect('assignment.assignedStaff', 'staff')
      .leftJoinAndSelect('staff.user', 'user');

    const assignments = await assignmentQuery.getMany();

    // Calculate overall metrics
    const totalAssignments = assignments.length;
    const breachedAssignments = assignments.filter(a => a.slaMetrics?.breachedAt).length;
    const slaCompliance = totalAssignments > 0 ? 
      ((totalAssignments - breachedAssignments) / totalAssignments) * 100 : 100;

    const assignmentsWithResponse = assignments.filter(a => a.acknowledgedAt);
    const avgResponseTime = assignmentsWithResponse.length > 0 ?
      assignmentsWithResponse.reduce((sum, a) => 
        sum + ((a.acknowledgedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60)), 0
      ) / assignmentsWithResponse.length : 0;

    const assignmentsWithResolution = assignments.filter(a => a.completedAt);
    const avgResolutionTime = assignmentsWithResolution.length > 0 ?
      assignmentsWithResolution.reduce((sum, a) => 
        sum + ((a.completedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60)), 0
      ) / assignmentsWithResolution.length : 0;

    // Get department performance
    const departmentPerformance = await this.getDepartmentPerformance(filters);

    // Get station performance
    const stationPerformance = await this.getStationPerformance(filters);

    // Get staff performance
    const staffPerformance = await this.getStaffPerformance(filters);

    return {
      slaCompliance: Math.round(slaCompliance * 10) / 10,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      departmentPerformance,
      stationPerformance,
      staffPerformance
    };
  }

  /**
   * Get department performance
   */
  private async getDepartmentPerformance(
    filters: DashboardFilters
  ): Promise<DepartmentPerformance[]> {
    const departments = await this.departmentRepo.find({
      where: filters.departmentId ? { id: filters.departmentId } : {},
      relations: ['stations', 'staff']
    });

    const performance: DepartmentPerformance[] = [];

    for (const dept of departments) {
      // Get assignments for this department
      const assignments = await this.assignmentRepo.find({
        where: {
          assignedStation: { department: { id: dept.id } },
          assignedAt: MoreThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        },
        relations: ['emergency', 'issue']
      });

      const totalIncidents = assignments.length;
      const activeIncidents = assignments.filter(a => 
        a.status !== AssignmentStatus.COMPLETED
      ).length;
      const resolvedIncidents = assignments.filter(a => 
        a.status === AssignmentStatus.COMPLETED
      ).length;

      const responseTimes = assignments
        .filter(a => a.acknowledgedAt)
        .map(a => (a.acknowledgedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60));
      const avgResponseTime = responseTimes.length > 0 ?
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

      const resolutionTimes = assignments
        .filter(a => a.completedAt)
        .map(a => (a.completedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60));
      const avgResolutionTime = resolutionTimes.length > 0 ?
        resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0;

      const breached = assignments.filter(a => a.slaMetrics?.breachedAt).length;
      const slaCompliance = totalIncidents > 0 ? 
        ((totalIncidents - breached) / totalIncidents) * 100 : 100;

      const totalStaff = dept.staff?.length || 0;
      const activeStaff = dept.staff?.filter(s => s.isOnDuty).length || 0;
      const staffUtilization = totalStaff > 0 ? (activeStaff / totalStaff) * 100 : 0;

      const stations = dept.stations || [];
      const totalCapacity = stations.reduce((sum, s) => 
        sum + (s.operationalCapacity?.maxConcurrentIncidents || 0), 0);
      const currentLoad = stations.reduce((sum, s) => 
        sum + (s.operationalCapacity?.currentIncidents || 0), 0);
      const capacityUtilization = totalCapacity > 0 ? (currentLoad / totalCapacity) * 100 : 0;

      performance.push({
        departmentId: dept.id,
        departmentName: dept.name,
        type: dept.type,
        totalIncidents,
        activeIncidents,
        resolvedIncidents,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        slaCompliance: Math.round(slaCompliance * 10) / 10,
        staffUtilization: Math.round(staffUtilization * 10) / 10,
        capacityUtilization: Math.round(capacityUtilization * 10) / 10
      });
    }

    return performance;
  }

  /**
   * Get station performance
   */
  private async getStationPerformance(
    filters: DashboardFilters
  ): Promise<StationPerformance[]> {
    const stationQuery = this.stationRepo.createQueryBuilder('station')
      .leftJoinAndSelect('station.department', 'department')
      .leftJoinAndSelect('station.assignments', 'assignments', 
        'assignments.status NOT IN (:...completed)', 
        { completed: [AssignmentStatus.COMPLETED] }
      );

    if (filters.departmentId) {
      stationQuery.andWhere('department.id = :deptId', { deptId: filters.departmentId });
    }

    if (filters.stationId) {
      stationQuery.andWhere('station.id = :stationId', { stationId: filters.stationId });
    }

    const stations = await stationQuery.getMany();

    const performance: StationPerformance[] = [];

    for (const station of stations) {
      const activeAssignments = station.assignments || [];
      const currentLoad = station.operationalCapacity?.currentIncidents || 0;
      const maxCapacity = station.operationalCapacity?.maxConcurrentIncidents || 10;
      
      // Get staff
      const staff = await this.staffRepo.find({
        where: { station: { id: station.id } },
        relations: ['user']
      });

      const availableStaff = staff.filter(s => s.isOnDuty).length;
      const totalStaff = staff.length;

      // Calculate average response time for this station
      const completedAssignments = await this.assignmentRepo.find({
        where: {
          assignedStation: { id: station.id },
          status: AssignmentStatus.COMPLETED,
          assignedAt: MoreThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        }
      });

      const responseTimes = completedAssignments
        .filter(a => a.acknowledgedAt)
        .map(a => (a.acknowledgedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60));
      const avgResponseTime = responseTimes.length > 0 ?
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

      performance.push({
        stationId: station.id,
        stationName: station.name,
        department: station.department?.name || 'Unknown',
        currentLoad,
        maxCapacity,
        availableStaff,
        totalStaff,
        availableVehicles: station.operationalCapacity?.availableVehicles || 0,
        totalVehicles: station.operationalCapacity?.totalVehicles || 0,
        activeIncidents: activeAssignments,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        status: station.status
      });
    }

    return performance;
  }

  /**
   * Get staff performance
   */
  private async getStaffPerformance(
    filters: DashboardFilters
  ): Promise<StaffPerformance[]> {
    const staffQuery = this.staffRepo.createQueryBuilder('staff')
      .leftJoinAndSelect('staff.user', 'user')
      .leftJoinAndSelect('staff.department', 'department')
      .leftJoinAndSelect('staff.station', 'station')
      .leftJoinAndSelect('staff.assignments', 'assignments', 
        'assignments.createdAt >= :thirtyDaysAgo', 
        { thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      );

    if (filters.departmentId) {
      staffQuery.andWhere('department.id = :deptId', { deptId: filters.departmentId });
    }

    if (filters.stationId) {
      staffQuery.andWhere('station.id = :stationId', { stationId: filters.stationId });
    }

    const staffList = await staffQuery.getMany();

    const performance: StaffPerformance[] = [];

    for (const staff of staffList) {
      const assignments = staff.assignments || [];
      
      // Completed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const completedToday = assignments.filter(a => 
        a.status === AssignmentStatus.COMPLETED && 
        a.completedAt && a.completedAt >= today
      ).length;

      // Response times
      const responseTimes = assignments
        .filter(a => a.acknowledgedAt)
        .map(a => (a.acknowledgedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60));
      const avgResponseTime = responseTimes.length > 0 ?
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

      // Resolution times
      const resolutionTimes = assignments
        .filter(a => a.completedAt)
        .map(a => (a.completedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60));
      const avgResolutionTime = resolutionTimes.length > 0 ?
        resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0;

      // SLA compliance
      const totalCompleted = assignments.filter(a => a.status === AssignmentStatus.COMPLETED).length;
      const breached = assignments.filter(a => a.slaMetrics?.breachedAt).length;
      const slaCompliance = totalCompleted > 0 ? 
        ((totalCompleted - breached) / totalCompleted) * 100 : 100;

      performance.push({
        staffId: staff.id,
        name: staff.user?.name || 'Unknown',
        role: staff.role,
        specialization: staff.specialization || 'General',
        isOnDuty: staff.isOnDuty,
        currentAssignments: staff.currentAssignments || 0,
        completedToday,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        slaCompliance: Math.round(slaCompliance * 10) / 10,
        customerRating: Math.floor(Math.random() * 20) + 80 // Mock data - would come from feedback
      });
    }

    return performance;
  }

  /**
   * Get dashboard analytics
   */
  private async getDashboardAnalytics(
    filters: DashboardFilters
  ): Promise<DashboardAnalytics> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get all incidents for analysis
    const emergencyQuery = this.buildEmergencyQuery(filters)
      .andWhere('emergency.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo });
    const issueQuery = this.buildIssueQuery(filters)
      .andWhere('issue.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo });

    const [emergencies, issues] = await Promise.all([
      emergencyQuery.getMany(),
      issueQuery.getMany()
    ]);

    const allIncidents = [
      ...emergencies.map(e => ({ ...e, type: 'emergency' })),
      ...issues.map(i => ({ ...i, type: 'issue' }))
    ];

    // Generate time series data
    const hourly = this.generateTimeSeries(allIncidents, 'hour', 24);
    const daily = this.generateTimeSeries(allIncidents, 'day', 30);
    const weekly = this.generateTimeSeries(allIncidents, 'week', 12);
    const monthly = this.generateTimeSeries(allIncidents, 'month', 6);

    // Generate heatmap data
    const heatmap = allIncidents
      .filter(i => i.latitude && i.longitude)
      .map(i => ({
        latitude: i.latitude,
        longitude: i.longitude,
        intensity: 1,
        type: i.type,
        timestamp: i.createdAt
      }));

    // Calculate distributions
    const typeDistribution = allIncidents.reduce((acc, i) => {
      const type = i.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityDistribution = emergencies.reduce((acc, e) => {
      acc[e.priority] = (acc[e.priority] || 0) + 1;
      return acc;
    }, {} as Record<EmergencyPriority, number>);

    const statusDistribution = allIncidents.reduce((acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Department workload
    const departmentWorkload: Record<string, number> = {};
    for (const dept of await this.departmentRepo.find()) {
      const count = await this.assignmentRepo.count({
        where: {
          assignedStation: { department: { id: dept.id } },
          status: In([AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED, AssignmentStatus.EN_ROUTE, AssignmentStatus.ON_SCENE])
        }
      });
      departmentWorkload[dept.name] = count;
    }

    // Response time by type
    const responseTimeByType: Record<string, number> = {};
    const assignments = await this.assignmentRepo.find({
      where: {
        assignedAt: MoreThan(thirtyDaysAgo),
        acknowledgedAt: MoreThan(new Date(0))
      }
    });

    for (const assignment of assignments) {
      const incident = assignment.emergency || assignment.issue;
      if (!incident || !assignment.acknowledgedAt) continue;

      const type = incident.type;
      const responseTime = (assignment.acknowledgedAt.getTime() - assignment.assignedAt.getTime()) / (1000 * 60);
      
      if (!responseTimeByType[type]) {
        responseTimeByType[type] = responseTime;
      } else {
        responseTimeByType[type] = (responseTimeByType[type] + responseTime) / 2;
      }
    }

    // Resolution time by type
    const resolutionTimeByType: Record<string, number> = {};
    const resolvedAssignments = assignments.filter(a => a.completedAt);

    for (const assignment of resolvedAssignments) {
      const incident = assignment.emergency || assignment.issue;
      if (!incident) continue;

      const type = incident.type;
      const resolutionTime = (assignment.completedAt!.getTime() - assignment.assignedAt.getTime()) / (1000 * 60);
      
      if (!resolutionTimeByType[type]) {
        resolutionTimeByType[type] = resolutionTime;
      } else {
        resolutionTimeByType[type] = (resolutionTimeByType[type] + resolutionTime) / 2;
      }
    }

    return {
      trends: { hourly, daily, weekly, monthly },
      heatmap,
      typeDistribution,
      priorityDistribution,
      statusDistribution,
      departmentWorkload,
      responseTimeByType,
      resolutionTimeByType
    };
  }

  /**
   * Generate time series data
   */
  private generateTimeSeries(
    incidents: any[],
    interval: 'hour' | 'day' | 'week' | 'month',
    count: number
  ): TimeSeriesData[] {
    const series: TimeSeriesData[] = [];
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      let start: Date;
      let end: Date;

      switch (interval) {
        case 'hour':
          start = new Date(now);
          start.setHours(now.getHours() - i, 0, 0, 0);
          end = new Date(start);
          end.setHours(start.getHours() + 1);
          break;
        case 'day':
          start = new Date(now);
          start.setDate(now.getDate() - i);
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setDate(start.getDate() + 1);
          break;
        case 'week':
          start = new Date(now);
          start.setDate(now.getDate() - (i * 7));
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setDate(start.getDate() + 7);
          break;
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth() - i, 1);
          end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
          break;
      }

      const value = incidents.filter(inc => 
        inc.createdAt >= start && inc.createdAt < end
      ).length;

      series.push({
        timestamp: start.toISOString(),
        value,
        metric: interval
      });
    }

    return series;
  }

  /**
   * Get relevant notifications for user
   */
  private async getRelevantNotifications(
    userId: string,
    userContext: any,
    filters: DashboardFilters
  ): Promise<DashboardNotification[]> {
    const where: any = {
      isArchived: false
    };

    if (filters.departmentId) {
      where.department = filters.departmentId;
    }

    if (filters.stationId) {
      where.assignedTo = filters.stationId;
    }

    const notifications = await this.notificationRepo.find({
      where,
      order: { createdAt: 'DESC' as 'DESC' },
      take: 50
    });

    // Filter based on user's role and department
    return notifications.filter(n => {
      if (userContext.role === 'super_admin') return true;
      if (userContext.departmentId && n.department === userContext.departmentId) return true;
      if (userContext.stationId && n.assignedTo === userContext.stationId) return true;
      return false;
    });
  }

  /**
   * Build emergency query with filters
   */
  private buildEmergencyQuery(filters: DashboardFilters) {
    let query = this.emergencyRepo.createQueryBuilder('emergency');

    if (filters.departmentId) {
      query = query.leftJoin('emergency.assignments', 'assignment')
        .leftJoin('assignment.assignedStation', 'station')
        .leftJoin('station.department', 'department')
        .andWhere('department.id = :deptId', { deptId: filters.departmentId });
    }

    if (filters.stationId) {
      query = query.leftJoin('emergency.assignments', 'assignment')
        .leftJoin('assignment.assignedStation', 'station')
        .andWhere('station.id = :stationId', { stationId: filters.stationId });
    }

    if (filters.status && filters.status.length > 0) {
      query = query.andWhere('emergency.status IN (:...statuses)', { statuses: filters.status });
    }

    if (filters.priority && filters.priority.length > 0) {
      query = query.andWhere('emergency.priority IN (:...priorities)', { priorities: filters.priority });
    }

    if (filters.type && filters.type.length > 0) {
      query = query.andWhere('emergency.type IN (:...types)', { types: filters.type });
    }

    if (filters.dateRange) {
      query = query.andWhere('emergency.createdAt BETWEEN :start AND :end', {
        start: filters.dateRange.start,
        end: filters.dateRange.end
      });
    }

    if (filters.search) {
      query = query.andWhere(
        '(emergency.description LIKE :search OR emergency.location LIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.assignedTo) {
      query = query.leftJoin('emergency.assignments', 'assignment')
        .andWhere('assignment.assignedStaffId = :staffId', { staffId: filters.assignedTo });
    }

    return query;
  }

  /**
   * Build issue query with filters
   */
  private buildIssueQuery(filters: DashboardFilters) {
    let query = this.issueRepo.createQueryBuilder('issue');

    if (filters.departmentId) {
      query = query.leftJoin('issue.assignments', 'assignment')
        .leftJoin('assignment.assignedStation', 'station')
        .leftJoin('station.department', 'department')
        .andWhere('department.id = :deptId', { deptId: filters.departmentId });
    }

    if (filters.stationId) {
      query = query.leftJoin('issue.assignments', 'assignment')
        .leftJoin('assignment.assignedStation', 'station')
        .andWhere('station.id = :stationId', { stationId: filters.stationId });
    }

    if (filters.status && filters.status.length > 0) {
      query = query.andWhere('issue.status IN (:...statuses)', { statuses: filters.status });
    }

    if (filters.type && filters.type.length > 0) {
      query = query.andWhere('issue.type IN (:...types)', { types: filters.type });
    }

    if (filters.dateRange) {
      query = query.andWhere('issue.createdAt BETWEEN :start AND :end', {
        start: filters.dateRange.start,
        end: filters.dateRange.end
      });
    }

    if (filters.search) {
      query = query.andWhere(
        '(issue.description LIKE :search OR issue.location LIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.assignedTo) {
      query = query.leftJoin('issue.assignments', 'assignment')
        .andWhere('assignment.assignedStaffId = :staffId', { staffId: filters.assignedTo });
    }

    return query;
  }

  /**
   * Build assignment query with filters
   */
  private buildAssignmentQuery(filters: DashboardFilters) {
    let query = this.assignmentRepo.createQueryBuilder('assignment');

    if (filters.departmentId) {
      query = query.leftJoin('assignment.assignedStation', 'station')
        .leftJoin('station.department', 'department')
        .andWhere('department.id = :deptId', { deptId: filters.departmentId });
    }

    if (filters.stationId) {
      query = query.andWhere('assignment.assignedStationId = :stationId', { stationId: filters.stationId });
    }

    if (filters.dateRange) {
      query = query.andWhere('assignment.assignedAt BETWEEN :start AND :end', {
        start: filters.dateRange.start,
        end: filters.dateRange.end
      });
    }

    if (filters.assignedTo) {
      query = query.andWhere('assignment.assignedStaffId = :staffId', { staffId: filters.assignedTo });
    }

    return query;
  }

  /**
   * Build station query with filters
   */
  private buildStationQuery(filters: DashboardFilters) {
    let query = this.stationRepo.createQueryBuilder('station');

    if (filters.departmentId) {
      query = query.andWhere('station.departmentId = :deptId', { deptId: filters.departmentId });
    }

    if (filters.stationId) {
      query = query.andWhere('station.id = :stationId', { stationId: filters.stationId });
    }

    return query;
  }

  /**
   * Get user context (role, department, permissions)
   */
  private async getUserContext(userId: string, userRole: UserRole): Promise<any> {
    // Get dashboard user
    const dashboardUser = await this.dashboardUserRepo.findOne({
      where: { user: { id: parseInt(userId) } },
      relations: ['user']
    });

    if (!dashboardUser) {
      return {
        role: userRole,
        departmentId: null,
        stationId: null,
        permissions: []
      };
    }

    return {
      role: dashboardUser.role,
      departmentId: dashboardUser.department,
      stationId: dashboardUser.assignedZone,
      permissions: this.getPermissionsForRole(dashboardUser.role as any)
    };
  }

  /**
   * Apply role-based filters to dashboard data
   */
  private applyRoleBasedFilters(
    filters: DashboardFilters,
    userContext: any
  ): DashboardFilters {
    const enhancedFilters = { ...filters };

    // Super admin sees everything
    if (userContext.role === 'super_admin') {
      return enhancedFilters;
    }

    // Department-level access
    if (userContext.departmentId && !enhancedFilters.departmentId) {
      enhancedFilters.departmentId = userContext.departmentId;
    }

    // Station-level access
    if (userContext.stationId && !enhancedFilters.stationId) {
      enhancedFilters.stationId = userContext.stationId;
    }

    return enhancedFilters;
  }

  /**
   * Get permissions for a role
   */
  private getPermissionsForRole(role: UserRole): string[] {
    const permissions: Record<string, string[]> = {
      [UserRole.SUPER_ADMIN]: ['*'],
      [UserRole.SYSTEM_ADMIN]: ['view_all', 'manage_users', 'manage_system'],
      [UserRole.POLICE_MANAGER]: ['view_department', 'assign_incidents', 'view_analytics'],
      [UserRole.POLICE_SUPERVISOR]: ['view_station', 'assign_staff', 'update_status'],
      [UserRole.POLICE_FIELD_AGENT]: ['view_assigned', 'update_assigned'],
      [UserRole.FIRE_MANAGER]: ['view_department', 'assign_incidents', 'view_analytics'],
      [UserRole.AMBULANCE_MANAGER]: ['view_department', 'assign_incidents', 'view_analytics'],
      [UserRole.CITY_COUNCIL_MANAGER]: ['view_department', 'assign_incidents', 'view_analytics'],
      [UserRole.ANALYST]: ['view_analytics', 'export_data']
    };

    return permissions[role] || ['view_basic'];
  }

  /**
   * Export dashboard data
   */
  async exportDashboardData(
    userId: string,
    userRole: UserRole,
    filters: DashboardFilters,
    format: 'csv' | 'pdf' | 'excel' = 'csv'
  ): Promise<any> {
    const dashboardData = await this.getUnifiedDashboard(userId, userRole, filters);

    // Transform data for export based on format
    switch (format) {
      case 'csv':
        return this.exportToCSV(dashboardData);
      case 'pdf':
        return this.exportToPDF(dashboardData);
      case 'excel':
        return this.exportToExcel(dashboardData);
      default:
        return dashboardData;
    }
  }

  private exportToCSV(data: UnifiedDashboardData): string {
    // Implementation for CSV export
    let csv = 'Report Type,ID,Status,Priority,Location,Created At\n';
    
    data.incidents.emergencies.forEach(e => {
      csv += `Emergency,${e.id},${e.status},${e.priority},${e.location},${e.createdAt}\n`;
    });
    
    data.incidents.issues.forEach(i => {
      csv += `Issue,${i.id},${i.status},N/A,${i.location},${i.createdAt}\n`;
    });
    
    return csv;
  }

  private async exportToPDF(data: UnifiedDashboardData): Promise<Buffer> {
    // Would integrate with PDF generation library
    return Buffer.from('PDF export not implemented');
  }

  private async exportToExcel(data: UnifiedDashboardData): Promise<any> {
    // Would integrate with Excel generation library
    return { message: 'Excel export not implemented' };
  }
}