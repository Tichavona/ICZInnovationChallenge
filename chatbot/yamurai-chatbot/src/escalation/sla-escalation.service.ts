// // backend/src/escalation/sla-escalation.service.ts
// import { Injectable, Logger } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, LessThan, MoreThan, Between, In } from 'typeorm';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { IncidentAssignment, AssignmentStatus, SLAMetrics } from '../database/incident-assignment.entity';
// import { EmergencyReport, EmergencyPriority } from '../database/emergency-report.entity';
// import { IssueReport } from '../database/issue-report.entity';
// import { SLAConfig, IncidentPriority, EscalationLevel } from '../database/sla-config.entity';
// import { EscalationLog, EscalationLevel as LogLevel, EscalationReason, EscalationStatus } from '../database/escalation-log.entity';
// import { DashboardNotification } from '../database/dashboard.entity';
// import { NotificationGateway } from '../dashboard/notifications/notification.gateway';
// import { Department, DepartmentStaff } from '../database/department.entity';

// export interface SLAStatus {
//   incidentId: string;
//   incidentType: 'emergency' | 'issue';
//   status: 'compliant' | 'warning' | 'breached' | 'critical';
//   metrics: {
//     responseTarget: number;
//     actualResponse: number | null;
//     resolutionTarget: number;
//     actualResolution: number | null;
//     timeToResponseBreach: number;
//     timeToResolutionBreach: number;
//   };
//   breaches: SLABreachInfo[];
//   currentEscalationLevel: number;
//   nextEscalationIn: number | null;
// }

// export interface SLABreachInfo {
//   type: 'response' | 'resolution' | 'update';
//   breachedAt: Date;
//   threshold: number;
//   actual: number;
//   severity: 'low' | 'medium' | 'high' | 'critical';
//   escalatedTo?: string;
// }

// @Injectable()
// export class SLAEscalationService {
//   private readonly logger = new Logger(SLAEscalationService.name);
  
//   // Escalation thresholds (in minutes)
//   private readonly ESCALATION_THRESHOLDS = {
//     [EmergencyPriority.CRITICAL]: { level1: 5, level2: 15, level3: 30 },
//     [EmergencyPriority.HIGH]: { level1: 15, level2: 30, level3: 60 },
//     [EmergencyPriority.MEDIUM]: { level1: 30, level2: 60, level3: 120 },
//     [EmergencyPriority.LOW]: { level1: 60, level2: 120, level3: 240 }
//   };

//   constructor(
//     @InjectRepository(IncidentAssignment)
//     private assignmentRepo: Repository<IncidentAssignment>,
//     @InjectRepository(EmergencyReport)
//     private emergencyRepo: Repository<EmergencyReport>,
//     @InjectRepository(IssueReport)
//     private issueRepo: Repository<IssueReport>,
//     @InjectRepository(SLAConfig)
//     private slaConfigRepo: Repository<SLAConfig>,
//     @InjectRepository(EscalationLog)
//     private escalationLogRepo: Repository<EscalationLog>,
//     @InjectRepository(Department)
//     private departmentRepo: Repository<Department>,
//     @InjectRepository(DepartmentStaff)
//     private staffRepo: Repository<DepartmentStaff>,
//     @InjectRepository(DashboardNotification)
//     private notificationRepo: Repository<DashboardNotification>,
//     private notificationGateway: NotificationGateway,
//   ) {}

//   /**
//    * Monitor SLA compliance for all active assignments
//    * Runs every minute
//    */
//   @Cron('*/1 * * * *')
//   async monitorSLACompliance() {
//     this.logger.debug('Running SLA compliance check...');
    
//     try {
//       const activeAssignments = await this.assignmentRepo.find({
//         where: { 
//           status: In(['pending', 'accepted', 'en_route', 'on_scene']),
//         },
//         relations: ['emergency', 'issue', 'assignedStation']
//       });

//       let breachedCount = 0;
//       let escalatedCount = 0;

//       for (const assignment of activeAssignments) {
//         const slaStatus = await this.checkAssignmentSLA(assignment);
        
//         if (slaStatus.status === 'breached' || slaStatus.status === 'critical') {
//           breachedCount++;
          
//           if (slaStatus.breaches.length > 0) {
//             const escalated = await this.handleSLABreach(assignment, slaStatus);
//             if (escalated) escalatedCount++;
//           }
//         }
//       }

//       if (breachedCount > 0) {
//         this.logger.log(`SLA Check: ${breachedCount} breaches detected, ${escalatedCount} escalated`);
//       }

//       // Broadcast SLA metrics to dashboards
//       await this.broadcastSLAMetrics();

//     } catch (error) {
//       this.logger.error('Error in SLA compliance monitor:', error);
//     }
//   }

//   /**
//    * Check SLA status for a specific assignment
//    */
//   async checkAssignmentSLA(assignment: IncidentAssignment): Promise<SLAStatus> {
//     const now = new Date();
//     const createdAt = assignment.assignedAt;
//     const incident = assignment.emergency || assignment.issue;
    
//     if (!incident) {
//       throw new Error('Incident not found for assignment');
//     }

//     // Get SLA config for this incident type
//     const slaConfig = await this.getSLAConfig(
//       assignment.incidentType,
//       incident.type,
//       assignment.emergency?.priority
//     );

//     const metrics: SLAStatus['metrics'] = {
//       responseTarget: slaConfig?.responseTimeMinutes || 15,
//       actualResponse: assignment.acknowledgedAt ? 
//         (assignment.acknowledgedAt.getTime() - createdAt.getTime()) / (1000 * 60) : null,
//       resolutionTarget: slaConfig?.resolutionTimeMinutes || 120,
//       actualResolution: assignment.completedAt ? 
//         (assignment.completedAt.getTime() - createdAt.getTime()) / (1000 * 60) : null,
//       timeToResponseBreach: 0,
//       timeToResolutionBreach: 0
//     };

//     // Calculate time to breach
//     if (!assignment.acknowledgedAt) {
//       metrics.timeToResponseBreach = Math.max(0, 
//         (createdAt.getTime() + (metrics.responseTarget * 60 * 1000) - now.getTime()) / (1000 * 60)
//       );
//     }

//     if (!assignment.completedAt) {
//       metrics.timeToResolutionBreach = Math.max(0,
//         (createdAt.getTime() + (metrics.resolutionTarget * 60 * 1000) - now.getTime()) / (1000 * 60)
//       );
//     }

//     // Check for breaches
//     const breaches: SLABreachInfo[] = [];
    
//     if (!assignment.acknowledgedAt && now > new Date(createdAt.getTime() + metrics.responseTarget * 60 * 1000)) {
//       breaches.push({
//         type: 'response',
//         breachedAt: new Date(createdAt.getTime() + metrics.responseTarget * 60 * 1000),
//         threshold: metrics.responseTarget,
//         actual: (now.getTime() - createdAt.getTime()) / (1000 * 60),
//         severity: this.calculateBreachSeverity(metrics.responseTarget, 'response', incident.priority)
//       });
//     }

//     if (!assignment.completedAt && now > new Date(createdAt.getTime() + metrics.resolutionTarget * 60 * 1000)) {
//       breaches.push({
//         type: 'resolution',
//         breachedAt: new Date(createdAt.getTime() + metrics.resolutionTarget * 60 * 1000),
//         threshold: metrics.resolutionTarget,
//         actual: (now.getTime() - createdAt.getTime()) / (1000 * 60),
//         severity: this.calculateBreachSeverity(metrics.resolutionTarget, 'resolution', incident.priority)
//       });
//     }

//     // Determine overall status
//     let status: SLAStatus['status'] = 'compliant';
//     if (breaches.length > 0) {
//       status = breaches.some(b => b.severity === 'critical') ? 'critical' : 'breached';
//     } else if (metrics.timeToResponseBreach < 10 || metrics.timeToResolutionBreach < 30) {
//       status = 'warning';
//     }

//     // Get current escalation level
//     const currentEscalation = await this.getCurrentEscalationLevel(assignment.id);
//     const nextEscalation = await this.getNextEscalationTime(assignment, currentEscalation);

//     return {
//       incidentId: assignment.incidentId,
//       incidentType: assignment.incidentType,
//       status,
//       metrics,
//       breaches,
//       currentEscalationLevel: currentEscalation,
//       nextEscalationIn: nextEscalation
//     };
//   }

//   /**
//    * Handle SLA breach with escalation
//    */
//   private async handleSLABreach(
//     assignment: IncidentAssignment,
//     slaStatus: SLAStatus
//   ): Promise<boolean> {
//     try {
//       const incident = assignment.emergency || assignment.issue;
//       const priority = assignment.emergency?.priority || EmergencyPriority.MEDIUM;
      
//       // Get escalation thresholds for this priority
//       const thresholds = this.ESCALATION_THRESHOLDS[priority] || this.ESCALATION_THRESHOLDS[EmergencyPriority.MEDIUM];
      
//       // Calculate time since breach
//       const now = new Date();
//       const createdAt = assignment.assignedAt;
//       const minutesSinceAssignment = (now.getTime() - createdAt.getTime()) / (1000 * 60);

//       let escalationLevel: LogLevel | null = null;
//       let escalated = false;

//       // Determine escalation level
//       if (minutesSinceAssignment > thresholds.level3) {
//         escalationLevel = LogLevel.LEVEL_4; // Headquarters
//       } else if (minutesSinceAssignment > thresholds.level2) {
//         escalationLevel = LogLevel.LEVEL_3; // Director
//       } else if (minutesSinceAssignment > thresholds.level1) {
//         escalationLevel = LogLevel.LEVEL_2; // Manager
//       }

//       if (escalationLevel) {
//         // Check if already escalated to this level
//         const existingEscalation = await this.escalationLogRepo.findOne({
//           where: {
//             incidentId: assignment.incidentId.toString(),
//             escalationLevel: escalationLevel,
//             status: In([EscalationStatus.PENDING, EscalationStatus.ACKNOWLEDGED])
//           }
//         });

//         if (!existingEscalation) {
//           await this.createEscalation(assignment, escalationLevel, slaStatus);
//           escalated = true;
//         }
//       }

//       return escalated;
//     } catch (error) {
//       this.logger.error('Error handling SLA breach:', error);
//       return false;
//     }
//   }

//   /**
//    * Create escalation record and notifications
//    */
//   private async createEscalation(
//     assignment: IncidentAssignment,
//     level: LogLevel,
//     slaStatus: SLAStatus
//   ): Promise<EscalationLog> {
//     const incident = assignment.emergency || assignment.issue;
    
//     // Determine escalation reason
//     let reason: EscalationReason;
//     if (slaStatus.breaches.some(b => b.type === 'response')) {
//       reason = EscalationReason.SLA_RESPONSE_BREACH;
//     } else if (slaStatus.breaches.some(b => b.type === 'resolution')) {
//       reason = EscalationReason.SLA_RESOLUTION_BREACH;
//     } else {
//       reason = EscalationReason.NO_STAFF_AVAILABLE;
//     }

//     // Find who to escalate to
//     const escalatedTo = await this.findEscalationTarget(assignment.assignedStation?.departmentId, level);

//     // Create escalation log
//     const escalationLog = this.escalationLogRepo.create({
//       incidentType: assignment.incidentType,
//       [assignment.incidentType === 'emergency' ? 'emergencyId' : 'issueId']: parseInt(assignment.incidentId),
//       escalationLevel: level,
//       escalationReason: reason,
//       reasonDetails: `SLA breached after ${slaStatus.breaches[0]?.actual.toFixed(1)} minutes`,
//       status: EscalationStatus.PENDING,
//       escalatedAt: new Date(),
//       escalatedToDepartmentId: escalatedTo.department?.id,
//       escalatedToUserId: escalatedTo.user?.id,
//       escalatedToEmail: escalatedTo.user?.email,
//       escalatedToRole: escalatedTo.role,
//       metadata: {
//         incidentSnapshot: {
//           description: incident?.description,
//           location: incident?.location,
//           priority: incident?.priority,
//           createdAt: incident?.createdAt
//         },
//         systemMetrics: {
//           responseTime: slaStatus.metrics.actualResponse,
//           staffAvailable: await this.countAvailableStaff(assignment.assignedStation?.departmentId),
//           stationLoad: assignment.assignedStation?.operationalCapacity?.currentIncidents || 0
//         }
//       }
//     });

//     await this.escalationLogRepo.save(escalationLog);

//     // Create dashboard notification
//     await this.createEscalationNotification(escalationLog, assignment);

//     // Update assignment status
//     assignment.status = AssignmentStatus.ESCALATED;
//     if (!assignment.escalationHistory) {
//       assignment.escalationHistory = [];
//     }
//     assignment.escalationHistory.push({
//       level: level.toString(),
//       escalatedAt: new Date(),
//       escalatedTo: escalatedTo.user?.email || 'Unknown',
//       reason: reason,
//       resolved: false
//     });
//     await this.assignmentRepo.save(assignment);

//     // Send real-time notification via WebSocket
//     this.notificationGateway.sendToDepartment(
//       assignment.assignedStation?.departmentId || 'all',
//       {
//         type: 'SLA_BREACH',
//         title: `SLA Breach: ${assignment.incidentType} #${assignment.incidentId}`,
//         message: `SLA breached after ${slaStatus.breaches[0]?.actual.toFixed(1)} minutes. Escalated to ${level}.`,
//         severity: slaStatus.breaches[0]?.severity,
//         data: {
//           assignmentId: assignment.id,
//           incidentId: assignment.incidentId,
//           incidentType: assignment.incidentType,
//           escalationLevel: level,
//           breachedAt: slaStatus.breaches[0]?.breachedAt,
//           slaMetrics: slaStatus.metrics
//         }
//       }
//     );

//     return escalationLog;
//   }

//   /**
//    * Find escalation target (who to notify)
//    */
//   private async findEscalationTarget(
//     departmentId: string | undefined,
//     level: LogLevel
//   ): Promise<{ department?: Department; user?: DepartmentStaff; role: string }> {
//     if (!departmentId) {
//       return { role: 'system_admin' };
//     }

//     const roleMap = {
//       [LogLevel.LEVEL_1]: 'supervisor',
//       [LogLevel.LEVEL_2]: 'manager',
//       [LogLevel.LEVEL_3]: 'director',
//       [LogLevel.LEVEL_4]: 'headquarters'
//     };

//     const requiredRole = roleMap[level] || 'supervisor';

//     // Find staff with required role in the department
//     const staff = await this.staffRepo.findOne({
//       where: {
//         department: { id: departmentId },
//         role: requiredRole as any,
//         isActive: true,
//         isOnDuty: true
//       },
//       relations: ['user', 'department']
//     });

//     if (staff) {
//       return {
//         department: staff.department,
//         user: staff,
//         role: staff.role
//       };
//     }

//     // If no specific staff found, return department info
//     const department = await this.departmentRepo.findOne({ where: { id: departmentId } });
//     return {
//       department,
//       role: requiredRole
//     };
//   }

//   /**
//    * Create escalation notification
//    */
//   private async createEscalationNotification(
//     escalation: EscalationLog,
//     assignment: IncidentAssignment
//   ): Promise<DashboardNotification> {
//     const notification = this.notificationRepo.create({
//       reportType: escalation.incidentType === 'emergency' ? 'EMERGENCY' : 'ISSUE',
//       reportId: parseInt(assignment.incidentId),
//       department: escalation.escalatedToDepartmentId || 'all',
//       title: `🚨 ESCALATION: ${escalation.escalationLevel}`,
//       message: `Incident #${assignment.incidentId} has been escalated to ${escalation.escalationLevel} level due to SLA breach.`,
//       type: 'escalation',
//       priority: this.mapEscalationToPriority(escalation),
//       status: 'PENDING',
//       escalationLevel: this.mapLogLevelToNumber(escalation.escalationLevel),
//       metadata: JSON.stringify({
//         escalationId: escalation.id,
//         reason: escalation.escalationReason,
//         reasonDetails: escalation.reasonDetails,
//         incidentSnapshot: escalation.metadata?.incidentSnapshot,
//         systemMetrics: escalation.metadata?.systemMetrics
//       })
//     });

//     return await this.notificationRepo.save(notification);
//   }

//   /**
//    * Get SLA configuration for incident type
//    */
//   private async getSLAConfig(
//     incidentType: 'emergency' | 'issue',
//     category: string,
//     priority?: EmergencyPriority
//   ): Promise<SLAConfig | null> {
//     const slaPriority = priority ? 
//       this.mapEmergencyPriorityToSLA(priority) : 
//       IncidentPriority.MEDIUM;

//     return await this.slaConfigRepo.findOne({
//       where: {
//         incidentType,
//         priority: slaPriority,
//         isActive: true
//       }
//     });
//   }

//   /**
//    * Get current escalation level for an assignment
//    */
//   private async getCurrentEscalationLevel(assignmentId: string): Promise<number> {
//     const latestEscalation = await this.escalationLogRepo.findOne({
//       where: { 
//         id: assignmentId,
//         status: In([EscalationStatus.PENDING, EscalationStatus.ACKNOWLEDGED])
//       },
//       order: { escalatedAt: 'DESC' }
//     });

//     return latestEscalation ? 
//       this.mapLogLevelToNumber(latestEscalation.escalationLevel) : 0;
//   }

//   /**
//    * Get time until next escalation
//    */
//   private async getNextEscalationTime(
//     assignment: IncidentAssignment,
//     currentLevel: number
//   ): Promise<number | null> {
//     const priority = assignment.emergency?.priority || EmergencyPriority.MEDIUM;
//     const thresholds = this.ESCALATION_THRESHOLDS[priority] || this.ESCALATION_THRESHOLDS[EmergencyPriority.MEDIUM];
    
//     const now = new Date();
//     const minutesSinceAssignment = (now.getTime() - assignment.assignedAt.getTime()) / (1000 * 60);

//     if (currentLevel < 1 && minutesSinceAssignment < thresholds.level1) {
//       return thresholds.level1 - minutesSinceAssignment;
//     } else if (currentLevel < 2 && minutesSinceAssignment < thresholds.level2) {
//       return thresholds.level2 - minutesSinceAssignment;
//     } else if (currentLevel < 3 && minutesSinceAssignment < thresholds.level3) {
//       return thresholds.level3 - minutesSinceAssignment;
//     }

//     return null;
//   }

//   /**
//    * Calculate breach severity
//    */
//   private calculateBreachSeverity(
//     threshold: number,
//     type: 'response' | 'resolution',
//     priority?: EmergencyPriority
//   ): 'low' | 'medium' | 'high' | 'critical' {
//     if (priority === EmergencyPriority.CRITICAL) {
//       return 'critical';
//     }

//     if (type === 'response') {
//       if (threshold < 10) return 'high';
//       if (threshold < 30) return 'medium';
//       return 'low';
//     } else {
//       if (threshold < 30) return 'high';
//       if (threshold < 120) return 'medium';
//       return 'low';
//     }
//   }

//   /**
//    * Count available staff in department
//    */
//   private async countAvailableStaff(departmentId?: string): Promise<number> {
//     if (!departmentId) return 0;

//     return await this.staffRepo.count({
//       where: {
//         department: { id: departmentId },
//         isActive: true,
//         isOnDuty: true
//       }
//     });
//   }

//   /**
//    * Map escalation level to number
//    */
//   private mapLogLevelToNumber(level: LogLevel): number {
//     const map = {
//       [LogLevel.LEVEL_1]: 1,
//       [LogLevel.LEVEL_2]: 2,
//       [LogLevel.LEVEL_3]: 3,
//       [LogLevel.LEVEL_4]: 4,
//       [LogLevel.LEVEL_5]: 5
//     };
//     return map[level] || 1;
//   }

//   /**
//    * Map escalation to priority string
//    */
//   private mapEscalationToPriority(escalation: EscalationLog): string {
//     const map = {
//       [LogLevel.LEVEL_1]: 'MEDIUM',
//       [LogLevel.LEVEL_2]: 'HIGH',
//       [LogLevel.LEVEL_3]: 'HIGH',
//       [LogLevel.LEVEL_4]: 'CRITICAL',
//       [LogLevel.LEVEL_5]: 'CRITICAL'
//     };
//     return map[escalation.escalationLevel] || 'MEDIUM';
//   }

//   /**
//    * Map emergency priority to SLA priority
//    */
//   private mapEmergencyPriorityToSLA(priority: EmergencyPriority): IncidentPriority {
//     const map = {
//       [EmergencyPriority.CRITICAL]: IncidentPriority.CRITICAL,
//       [EmergencyPriority.HIGH]: IncidentPriority.HIGH,
//       [EmergencyPriority.MEDIUM]: IncidentPriority.MEDIUM,
//       [EmergencyPriority.LOW]: IncidentPriority.LOW
//     };
//     return map[priority] || IncidentPriority.MEDIUM;
//   }

//   /**
//    * Broadcast SLA metrics to all dashboards
//    */
//   private async broadcastSLAMetrics() {
//     // Get overall SLA metrics
//     const assignments = await this.assignmentRepo.find({
//       where: { 
//         createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)) 
//       }
//     });

//     const totalAssignments = assignments.length;
//     const breachedAssignments = assignments.filter(a => a.slaMetrics?.breachedAt).length;
//     const complianceRate = totalAssignments > 0 ? 
//       ((totalAssignments - breachedAssignments) / totalAssignments) * 100 : 100;

//     // Group by department
//     const departmentMetrics = new Map<string, { total: number; breached: number }>();
    
//     for (const assignment of assignments) {
//       const deptId = assignment.assignedStation?.departmentId;
//       if (!deptId) continue;

//       const current = departmentMetrics.get(deptId) || { total: 0, breached: 0 };
//       current.total++;
//       if (assignment.slaMetrics?.breachedAt) {
//         current.breached++;
//       }
//       departmentMetrics.set(deptId, current);
//     }

//     // Broadcast to all connected dashboard clients
//     this.notificationGateway.broadcast({
//       type: 'SLA_METRICS_UPDATE',
//       data: {
//         timestamp: new Date(),
//         overallComplianceRate: complianceRate,
//         totalBreaches: breachedAssignments,
//         departmentMetrics: Array.from(departmentMetrics.entries()).map(([deptId, metrics]) => ({
//           departmentId: deptId,
//           complianceRate: metrics.total > 0 ? ((metrics.total - metrics.breached) / metrics.total) * 100 : 100,
//           totalIncidents: metrics.total,
//           breaches: metrics.breached
//         }))
//       }
//     });
//   }

//   /**
//    * Get SLA dashboard data
//    */
//   async getSLADashboardData(departmentId?: string, stationId?: string): Promise<any> {
//     const where: any = {};
//     if (stationId) {
//       where.assignedStation = { id: stationId };
//     } else if (departmentId) {
//       where.assignedStation = { department: { id: departmentId } };
//     }

//     // Get active assignments with SLA metrics
//     const activeAssignments = await this.assignmentRepo.find({
//       where: {
//         ...where,
//         status: In(['pending', 'accepted', 'en_route', 'on_scene']),
//         slaMetrics: MoreThan({ breachedAt: null })
//       },
//       relations: ['emergency', 'issue', 'assignedStation']
//     });

//     // Calculate breach statistics
//     const breachesByType = {
//       response: activeAssignments.filter(a => 
//         a.slaMetrics?.breachLevel === 'response' ||
//         (a.slaMetrics?.actualResponse && a.slaMetrics?.actualResponse > a.slaMetrics?.responseTarget)
//       ).length,
//       resolution: activeAssignments.filter(a => 
//         a.slaMetrics?.breachLevel === 'resolution' ||
//         (a.slaMetrics?.actualResolution && a.slaMetrics?.actualResolution > a.slaMetrics?.resolutionTarget)
//       ).length
//     };

//     // Get escalation history
//     const escalations = await this.escalationLogRepo.find({
//       where: {
//         escalatedAt: MoreThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
//       },
//       order: { escalatedAt: 'DESC' },
//       take: 50
//     });

//     return {
//       activeBreaches: activeAssignments.length,
//       breachesByType,
//       complianceTrend: await this.getComplianceTrend(departmentId, 7),
//       recentEscalations: escalations.map(e => ({
//         id: e.id,
//         incidentId: e.emergencyId || e.issueId,
//         level: e.escalationLevel,
//         reason: e.escalationReason,
//         escalatedAt: e.escalatedAt,
//         status: e.status
//       })),
//       departmentPerformance: await this.getDepartmentPerformance(departmentId)
//     };
//   }

//   /**
//    * Get compliance trend for last N days
//    */
//   private async getComplianceTrend(departmentId?: string, days: number = 7): Promise<any[]> {
//     const trend = [];
//     const now = new Date();

//     for (let i = days - 1; i >= 0; i--) {
//       const date = new Date(now);
//       date.setDate(date.getDate() - i);
//       date.setHours(0, 0, 0, 0);

//       const nextDate = new Date(date);
//       nextDate.setDate(nextDate.getDate() + 1);

//       const where: any = {
//         assignedAt: Between(date, nextDate)
//       };

//       if (departmentId) {
//         where.assignedStation = { department: { id: departmentId } };
//       }

//       const assignments = await this.assignmentRepo.find({ where });
//       const total = assignments.length;
//       const breached = assignments.filter(a => a.slaMetrics?.breachedAt).length;

//       trend.push({
//         date: date.toISOString().split('T')[0],
//         complianceRate: total > 0 ? ((total - breached) / total) * 100 : 100,
//         totalIncidents: total,
//         breaches: breached
//       });
//     }

//     return trend;
//   }

//   /**
//    * Get department performance metrics
//    */
//   private async getDepartmentPerformance(departmentId?: string): Promise<any> {
//     const departments = departmentId ? 
//       [await this.departmentRepo.findOne({ where: { id: departmentId } })] :
//       await this.departmentRepo.find();

//     const performance = [];

//     for (const dept of departments) {
//       if (!dept) continue;

//       const assignments = await this.assignmentRepo.find({
//         where: {
//           assignedStation: { department: { id: dept.id } },
//           assignedAt: MoreThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
//         }
//       });

//       const total = assignments.length;
//       const breached = assignments.filter(a => a.slaMetrics?.breachedAt).length;
//       const avgResponseTime = assignments
//         .filter(a => a.acknowledgedAt)
//         .reduce((sum, a) => sum + ((a.acknowledgedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60)), 0) / 
//         (assignments.filter(a => a.acknowledgedAt).length || 1);

//       performance.push({
//         departmentId: dept.id,
//         departmentName: dept.name,
//         totalIncidents: total,
//         breaches: breached,
//         complianceRate: total > 0 ? ((total - breached) / total) * 100 : 100,
//         avgResponseTimeMinutes: Math.round(avgResponseTime * 10) / 10
//       });
//     }

//     return performance;
//   }

//   /**
//    * Acknowledge escalation
//    */
//   async acknowledgeEscalation(
//     escalationId: string,
//     userId: string,
//     notes?: string
//   ): Promise<EscalationLog> {
//     const escalation = await this.escalationLogRepo.findOne({
//       where: { id: escalationId },
//       relations: ['escalatedToUser']
//     });

//     if (!escalation) {
//       throw new Error('Escalation not found');
//     }

//     escalation.status = EscalationStatus.ACKNOWLEDGED;
//     escalation.acknowledgedAt = new Date();
//     escalation.acknowledgedById = userId;
//     escalation.acknowledgementNotes = notes!;

//     // Update the corresponding assignment
//     const incidentId = escalation.emergencyId || escalation.issueId;
//     const assignment = await this.assignmentRepo.findOne({
//       where: { incidentId: incidentId.toString() }
//     });

//     if (assignment && assignment.escalationHistory) {
//       const lastEscalation = assignment.escalationHistory[assignment.escalationHistory.length - 1];
//       if (lastEscalation) {
//         lastEscalation.resolved = true;
//       }
//       await this.assignmentRepo.save(assignment);
//     }

//     // Create notification for acknowledgment
//     this.notificationGateway.sendToUser(userId, {
//       type: 'ESCALATION_ACKNOWLEDGED',
//       title: 'Escalation Acknowledged',
//       message: `Escalation ${escalationId} has been acknowledged`,
//       data: { escalationId }
//     });

//     return await this.escalationLogRepo.save(escalation);
//   }

//   /**
//    * Resolve escalation
//    */
//   async resolveEscalation(
//     escalationId: string,
//     userId: string,
//     resolutionNotes: string,
//     resolutionAction: string
//   ): Promise<EscalationLog> {
//     const escalation = await this.escalationLogRepo.findOne({
//       where: { id: escalationId }
//     });

//     if (!escalation) {
//       throw new Error('Escalation not found');
//     }

//     escalation.status = EscalationStatus.RESOLVED;
//     escalation.resolvedAt = new Date();
//     escalation.resolvedById = userId;
//     escalation.resolutionNotes = resolutionNotes;
//     escalation.resolutionAction = resolutionAction;

//     // Update assignment status
//     const incidentId = escalation.emergencyId || escalation.issueId;
//     const assignment = await this.assignmentRepo.findOne({
//       where: { incidentId: incidentId.toString() }
//     });

//     if (assignment) {
//       assignment.status = AssignmentStatus.COMPLETED;
//       if (assignment.slaMetrics) {
//         assignment.slaMetrics.breachedAt = null;
//         assignment.slaMetrics.breachLevel = null;
//       }
//       await this.assignmentRepo.save(assignment);
//     }

//     // Notify all parties
//     this.notificationGateway.broadcast({
//       type: 'ESCALATION_RESOLVED',
//       title: 'Escalation Resolved',
//       message: `Escalation ${escalationId} has been resolved`,
//       data: { escalationId, resolutionAction, resolutionNotes }
//     });

//     return await this.escalationLogRepo.save(escalation);
//   }

//   /**
//    * Get active escalations
//    */
//   async getActiveEscalations(departmentId?: string): Promise<EscalationLog[]> {
//     const where: any = {
//       status: In([EscalationStatus.PENDING, EscalationStatus.ACKNOWLEDGED])
//     };

//     if (departmentId) {
//       where.escalatedToDepartmentId = departmentId;
//     }

//     return await this.escalationLogRepo.find({
//       where,
//       order: { escalatedAt: 'DESC' },
//       relations: ['emergency', 'issue', 'escalatedToDepartment']
//     });
//   }

//   /**
//    * Check if incident requires immediate attention
//    */
//   async requiresImmediateAttention(incidentId: string): Promise<boolean> {
//     const assignment = await this.assignmentRepo.findOne({
//       where: { incidentId }
//     });

//     if (!assignment) return false;

//     const slaStatus = await this.checkAssignmentSLA(assignment);
//     return slaStatus.status === 'critical' || 
//            slaStatus.currentEscalationLevel >= 2;
//   }
// }

// backend/src/escalation/sla-escalation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IncidentAssignment, AssignmentStatus } from '../database/incident-assignment.entity';
import { EmergencyReport, EmergencyPriority } from '../database/emergency-report.entity';
import { IssueReport } from '../database/issue-report.entity';
import { SLAConfig, IncidentPriority } from '../database/sla-config.entity';
import { EscalationLog, EscalationLevel as LogLevel, EscalationReason, EscalationStatus } from '../database/escalation-log.entity';
import { DashboardNotification } from '../database/dashboard.entity';
import { NotificationGateway } from '../dashboard/notifications/notification.gateway';
import { Department, DepartmentStaff } from '../database/department.entity';

export interface SLAStatus {
  incidentId: string;
  incidentType: 'emergency' | 'issue';
  status: 'compliant' | 'warning' | 'breached' | 'critical';
  metrics: {
    responseTarget: number;
    actualResponse: number | null;
    resolutionTarget: number;
    actualResolution: number | null;
    timeToResponseBreach: number;
    timeToResolutionBreach: number;
  };
  breaches: SLABreachInfo[];
  currentEscalationLevel: number;
  nextEscalationIn: number | null;
}

export interface SLABreachInfo {
  type: 'response' | 'resolution' | 'update';
  breachedAt: Date;
  threshold: number;
  actual: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  escalatedTo?: string;
}

@Injectable()
export class SLAEscalationService {
  private readonly logger = new Logger(SLAEscalationService.name);
  
  // Escalation thresholds (in minutes)
  private readonly ESCALATION_THRESHOLDS = {
    [EmergencyPriority.CRITICAL]: { level1: 5, level2: 15, level3: 30 },
    [EmergencyPriority.HIGH]: { level1: 15, level2: 30, level3: 60 },
    [EmergencyPriority.MEDIUM]: { level1: 30, level2: 60, level3: 120 },
    [EmergencyPriority.LOW]: { level1: 60, level2: 120, level3: 240 }
  };

  constructor(
    @InjectRepository(IncidentAssignment)
    private assignmentRepo: Repository<IncidentAssignment>,
    @InjectRepository(EmergencyReport)
    private emergencyRepo: Repository<EmergencyReport>,
    @InjectRepository(IssueReport)
    private issueRepo: Repository<IssueReport>,
    @InjectRepository(SLAConfig)
    private slaConfigRepo: Repository<SLAConfig>,
    @InjectRepository(EscalationLog)
    private escalationLogRepo: Repository<EscalationLog>,
    @InjectRepository(Department)
    private departmentRepo: Repository<Department>,
    @InjectRepository(DepartmentStaff)
    private staffRepo: Repository<DepartmentStaff>,
    @InjectRepository(DashboardNotification)
    private notificationRepo: Repository<DashboardNotification>,
    private notificationGateway: NotificationGateway,
  ) {}

  /**
   * Monitor SLA compliance for all active assignments
   * Runs every minute
   */
  @Cron('*/1 * * * *')
  async monitorSLACompliance() {
    this.logger.debug('Running SLA compliance check...');
    
    try {
      const activeAssignments = await this.assignmentRepo.find({
        where: { 
          status: In(['pending', 'accepted', 'en_route', 'on_scene']),
        },
        relations: ['emergency', 'issue', 'assignedStation']
      });

      let breachedCount = 0;
      let escalatedCount = 0;

      for (const assignment of activeAssignments) {
        const slaStatus = await this.checkAssignmentSLA(assignment);
        
        if (slaStatus.status === 'breached' || slaStatus.status === 'critical') {
          breachedCount++;
          
          if (slaStatus.breaches.length > 0) {
            const escalated = await this.handleSLABreach(assignment, slaStatus);
            if (escalated) escalatedCount++;
          }
        }
      }

      if (breachedCount > 0) {
        this.logger.log(`SLA Check: ${breachedCount} breaches detected, ${escalatedCount} escalated`);
      }

      // Broadcast SLA metrics to dashboards
      await this.broadcastSLAMetrics();

    } catch (error) {
      this.logger.error('Error in SLA compliance monitor:', error);
    }
  }

  /**
   * Check SLA status for a specific assignment
   */
  async checkAssignmentSLA(assignment: IncidentAssignment): Promise<SLAStatus> {
    const now = new Date();
    const createdAt = assignment.assignedAt;
    const incident = assignment.emergency || assignment.issue;
    
    if (!incident) {
      throw new Error('Incident not found for assignment');
    }

    // Get SLA config for this incident type
    const slaConfig = await this.getSLAConfig(
      assignment.incidentType,
      incident.type,
      assignment.emergency?.priority
    );

    const metrics: SLAStatus['metrics'] = {
      responseTarget: slaConfig?.responseTimeMinutes || 15,
      actualResponse: assignment.acknowledgedAt ? 
        (assignment.acknowledgedAt.getTime() - createdAt.getTime()) / (1000 * 60) : null,
      resolutionTarget: slaConfig?.resolutionTimeMinutes || 120,
      actualResolution: assignment.completedAt ? 
        (assignment.completedAt.getTime() - createdAt.getTime()) / (1000 * 60) : null,
      timeToResponseBreach: 0,
      timeToResolutionBreach: 0
    };

    // Calculate time to breach
    if (!assignment.acknowledgedAt) {
      metrics.timeToResponseBreach = Math.max(0, 
        (createdAt.getTime() + (metrics.responseTarget * 60 * 1000) - now.getTime()) / (1000 * 60)
      );
    }

    if (!assignment.completedAt) {
      metrics.timeToResolutionBreach = Math.max(0,
        (createdAt.getTime() + (metrics.resolutionTarget * 60 * 1000) - now.getTime()) / (1000 * 60)
      );
    }

    // Check for breaches
    const breaches: SLABreachInfo[] = [];
    
    if (!assignment.acknowledgedAt && now > new Date(createdAt.getTime() + metrics.responseTarget * 60 * 1000)) {
      breaches.push({
        type: 'response',
        breachedAt: new Date(createdAt.getTime() + metrics.responseTarget * 60 * 1000),
        threshold: metrics.responseTarget,
        actual: (now.getTime() - createdAt.getTime()) / (1000 * 60),
        severity: this.calculateBreachSeverity(metrics.responseTarget, 'response', incident.priority)
      });
    }

    if (!assignment.completedAt && now > new Date(createdAt.getTime() + metrics.resolutionTarget * 60 * 1000)) {
      breaches.push({
        type: 'resolution',
        breachedAt: new Date(createdAt.getTime() + metrics.resolutionTarget * 60 * 1000),
        threshold: metrics.resolutionTarget,
        actual: (now.getTime() - createdAt.getTime()) / (1000 * 60),
        severity: this.calculateBreachSeverity(metrics.resolutionTarget, 'resolution', incident.priority)
      });
    }

    // Determine overall status
    let status: SLAStatus['status'] = 'compliant';
    if (breaches.length > 0) {
      status = breaches.some(b => b.severity === 'critical') ? 'critical' : 'breached';
    } else if (metrics.timeToResponseBreach < 10 || metrics.timeToResolutionBreach < 30) {
      status = 'warning';
    }

    // Get current escalation level
    const currentEscalation = await this.getCurrentEscalationLevel(assignment.id);
    const nextEscalation = await this.getNextEscalationTime(assignment, currentEscalation);

    return {
      incidentId: assignment.incidentId,
      incidentType: assignment.incidentType,
      status,
      metrics,
      breaches,
      currentEscalationLevel: currentEscalation,
      nextEscalationIn: nextEscalation
    };
  }

  /**
   * Handle SLA breach with escalation
   */
  private async handleSLABreach(
    assignment: IncidentAssignment,
    slaStatus: SLAStatus
  ): Promise<boolean> {
    try {
      const incident = assignment.emergency || assignment.issue;
      const priority = assignment.emergency?.priority || EmergencyPriority.MEDIUM;
      
      // Get escalation thresholds for this priority
      const thresholds = this.ESCALATION_THRESHOLDS[priority] || this.ESCALATION_THRESHOLDS[EmergencyPriority.MEDIUM];
      
      // Calculate time since breach
      const now = new Date();
      const createdAt = assignment.assignedAt;
      const minutesSinceAssignment = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      let escalationLevel: LogLevel | null = null;
      let escalated = false;

      // Determine escalation level
      if (minutesSinceAssignment > thresholds.level3) {
        escalationLevel = LogLevel.LEVEL_4; // Headquarters
      } else if (minutesSinceAssignment > thresholds.level2) {
        escalationLevel = LogLevel.LEVEL_3; // Director
      } else if (minutesSinceAssignment > thresholds.level1) {
        escalationLevel = LogLevel.LEVEL_2; // Manager
      }

      if (escalationLevel) {
        // Check if already escalated to this level
        const existingEscalation = await this.escalationLogRepo.findOne({
          where: {
            // Fix: Use the correct field names from the entity
            emergencyId: assignment.incidentType === 'emergency' ? parseInt(assignment.incidentId) : undefined,
            issueId: assignment.incidentType === 'issue' ? parseInt(assignment.incidentId) : undefined,
            escalationLevel: escalationLevel,
            status: In([EscalationStatus.PENDING, EscalationStatus.ACKNOWLEDGED])
          }
        });

        if (!existingEscalation) {
          await this.createEscalation(assignment, escalationLevel, slaStatus);
          escalated = true;
        }
      }

      return escalated;
    } catch (error) {
      this.logger.error('Error handling SLA breach:', error);
      return false;
    }
  }

  /**
   * Create escalation record and notifications
   */
  private async createEscalation(
    assignment: IncidentAssignment,
    level: LogLevel,
    slaStatus: SLAStatus
  ): Promise<EscalationLog> {
    const incident = assignment.emergency || assignment.issue;
    
    // Determine escalation reason
    let reason: EscalationReason;
    if (slaStatus.breaches.some(b => b.type === 'response')) {
      reason = EscalationReason.SLA_RESPONSE_BREACH;
    } else if (slaStatus.breaches.some(b => b.type === 'resolution')) {
      reason = EscalationReason.SLA_RESOLUTION_BREACH;
    } else {
      reason = EscalationReason.NO_STAFF_AVAILABLE;
    }

    // Find who to escalate to
    const escalatedTo = await this.findEscalationTarget(assignment.assignedStation?.department?.id, level);

    // Create escalation log - Fix: Use correct field names
    const escalationLogData: Partial<EscalationLog> = {
      incidentType: assignment.incidentType,
      emergencyId: assignment.incidentType === 'emergency' ? parseInt(assignment.incidentId) : undefined,
      issueId: assignment.incidentType === 'issue' ? parseInt(assignment.incidentId) : undefined,
      escalationLevel: level,
      escalationReason: reason,
      reasonDetails: `SLA breached after ${slaStatus.breaches[0]?.actual.toFixed(1)} minutes`,
      status: EscalationStatus.PENDING,
      escalatedAt: new Date(),
      escalatedToDepartmentId: escalatedTo.department?.id,
      escalatedToUserId: escalatedTo.user?.id,
      escalatedToEmail: escalatedTo.user?.user?.email, // Fix: Access email through user relation
      escalatedToRole: escalatedTo.role,
      metadata: {
        incidentSnapshot: {
          description: incident?.description,
          location: incident?.location,
          priority: incident?.priority,
          createdAt: incident?.createdAt
        },
        systemMetrics: {
          responseTime: slaStatus.metrics.actualResponse!,
          staffAvailable: await this.countAvailableStaff(assignment.assignedStation?.department?.id),
          stationLoad: assignment.assignedStation?.operationalCapacity?.currentIncidents || 0
        }
      }
    };

    const escalationLog = this.escalationLogRepo.create(escalationLogData);
    await this.escalationLogRepo.save(escalationLog);

    // Create dashboard notification
    await this.createEscalationNotification(escalationLog, assignment);

    // Update assignment status
    assignment.status = AssignmentStatus.ESCALATED;
    if (!assignment.escalationHistory) {
      assignment.escalationHistory = [];
    }
    assignment.escalationHistory.push({
      level: level.toString(),
      escalatedAt: new Date(),
      escalatedTo: escalatedTo.user?.user?.email || 'Unknown',
      reason: reason,
      resolved: false
    });
    await this.assignmentRepo.save(assignment);

    // Send real-time notification via WebSocket
    this.notificationGateway.sendToDepartment(
      assignment.assignedStation?.department?.id || 'all',
      {
        type: 'SLA_BREACH',
        title: `SLA Breach: ${assignment.incidentType} #${assignment.incidentId}`,
        message: `SLA breached after ${slaStatus.breaches[0]?.actual.toFixed(1)} minutes. Escalated to ${level}.`,
        severity: slaStatus.breaches[0]?.severity,
        data: {
          assignmentId: assignment.id,
          incidentId: assignment.incidentId,
          incidentType: assignment.incidentType,
          escalationLevel: level,
          breachedAt: slaStatus.breaches[0]?.breachedAt,
          slaMetrics: slaStatus.metrics
        }
      }
    );

    return escalationLog;
  }

  /**
   * Find escalation target (who to notify)
   */
  private async findEscalationTarget(
    departmentId: string | undefined,
    level: LogLevel
  ): Promise<{ department?: Department; user?: DepartmentStaff; role: string }> {
    if (!departmentId) {
      return { role: 'system_admin' };
    }

    const roleMap = {
      [LogLevel.LEVEL_1]: 'supervisor',
      [LogLevel.LEVEL_2]: 'manager',
      [LogLevel.LEVEL_3]: 'director',
      [LogLevel.LEVEL_4]: 'headquarters'
    };

    const requiredRole = roleMap[level] || 'supervisor';

    // Find staff with required role in the department
    const staff = await this.staffRepo.findOne({
      where: {
        department: { id: departmentId },
        role: requiredRole as any,
        isActive: true,
        isOnDuty: true
      },
      relations: ['user', 'department']
    });

    if (staff) {
      return {
        department: staff.department,
        user: staff,
        role: staff.role
      };
    }

    // If no specific staff found, return department info
    const department = await this.departmentRepo.findOne({ where: { id: departmentId } });
    return {
      department: department || undefined,
      role: requiredRole
    };
  }

  /**
   * Create escalation notification
   */
  private async createEscalationNotification(
    escalation: EscalationLog,
    assignment: IncidentAssignment
  ): Promise<DashboardNotification> {
    const notification = this.notificationRepo.create({
      reportType: escalation.incidentType === 'emergency' ? 'EMERGENCY' : 'ISSUE',
      reportId: parseInt(assignment.incidentId),
      department: escalation.escalatedToDepartmentId || 'all',
      title: `🚨 ESCALATION: ${escalation.escalationLevel}`,
      message: `Incident #${assignment.incidentId} has been escalated to ${escalation.escalationLevel} level due to SLA breach.`,
      type: 'escalation',
      priority: this.mapEscalationToPriority(escalation),
      status: 'PENDING',
      escalationLevel: this.mapLogLevelToNumber(escalation.escalationLevel),
      metadata: JSON.stringify({
        escalationId: escalation.id,
        reason: escalation.escalationReason,
        reasonDetails: escalation.reasonDetails,
        incidentSnapshot: (escalation.metadata as any)?.incidentSnapshot,
        systemMetrics: (escalation.metadata as any)?.systemMetrics
      })
    });

    return await this.notificationRepo.save(notification);
  }

  /**
   * Get SLA configuration for incident type
   */
  private async getSLAConfig(
    incidentType: 'emergency' | 'issue',
    category: string,
    priority?: EmergencyPriority
  ): Promise<SLAConfig | null> {
    const slaPriority = priority ? 
      this.mapEmergencyPriorityToSLA(priority) : 
      IncidentPriority.MEDIUM;

    return await this.slaConfigRepo.findOne({
      where: {
        incidentType,
        priority: slaPriority,
        isActive: true
      }
    });
  }

  /**
   * Get current escalation level for an assignment
   */
  private async getCurrentEscalationLevel(assignmentId: string): Promise<number> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId }
    });

    return assignment?.escalationHistory?.length || 0;
  }

  /**
   * Get time until next escalation
   */
  private async getNextEscalationTime(
    assignment: IncidentAssignment,
    currentLevel: number
  ): Promise<number | null> {
    const priority = assignment.emergency?.priority || EmergencyPriority.MEDIUM;
    const thresholds = this.ESCALATION_THRESHOLDS[priority] || this.ESCALATION_THRESHOLDS[EmergencyPriority.MEDIUM];
    
    const now = new Date();
    const minutesSinceAssignment = (now.getTime() - assignment.assignedAt.getTime()) / (1000 * 60);

    if (currentLevel < 1 && minutesSinceAssignment < thresholds.level1) {
      return thresholds.level1 - minutesSinceAssignment;
    } else if (currentLevel < 2 && minutesSinceAssignment < thresholds.level2) {
      return thresholds.level2 - minutesSinceAssignment;
    } else if (currentLevel < 3 && minutesSinceAssignment < thresholds.level3) {
      return thresholds.level3 - minutesSinceAssignment;
    }

    return null;
  }

  /**
   * Calculate breach severity
   */
  private calculateBreachSeverity(
    threshold: number,
    type: 'response' | 'resolution',
    priority?: EmergencyPriority
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (priority === EmergencyPriority.CRITICAL) {
      return 'critical';
    }

    if (type === 'response') {
      if (threshold < 10) return 'high';
      if (threshold < 30) return 'medium';
      return 'low';
    } else {
      if (threshold < 30) return 'high';
      if (threshold < 120) return 'medium';
      return 'low';
    }
  }

  /**
   * Count available staff in department
   */
  private async countAvailableStaff(departmentId?: string): Promise<number> {
    if (!departmentId) return 0;

    return await this.staffRepo.count({
      where: {
        department: { id: departmentId },
        isActive: true,
        isOnDuty: true
      }
    });
  }

  /**
   * Map escalation level to number
   */
  private mapLogLevelToNumber(level: LogLevel): number {
    const map = {
      [LogLevel.LEVEL_1]: 1,
      [LogLevel.LEVEL_2]: 2,
      [LogLevel.LEVEL_3]: 3,
      [LogLevel.LEVEL_4]: 4,
      [LogLevel.LEVEL_5]: 5
    };
    return map[level] || 1;
  }

  /**
   * Map escalation to priority string
   */
  private mapEscalationToPriority(escalation: EscalationLog): string {
    const map = {
      [LogLevel.LEVEL_1]: 'MEDIUM',
      [LogLevel.LEVEL_2]: 'HIGH',
      [LogLevel.LEVEL_3]: 'HIGH',
      [LogLevel.LEVEL_4]: 'CRITICAL',
      [LogLevel.LEVEL_5]: 'CRITICAL'
    };
    return map[escalation.escalationLevel] || 'MEDIUM';
  }

  /**
   * Map emergency priority to SLA priority
   */
  private mapEmergencyPriorityToSLA(priority: EmergencyPriority): IncidentPriority {
    const map = {
      [EmergencyPriority.CRITICAL]: IncidentPriority.CRITICAL,
      [EmergencyPriority.HIGH]: IncidentPriority.HIGH,
      [EmergencyPriority.MEDIUM]: IncidentPriority.MEDIUM,
      [EmergencyPriority.LOW]: IncidentPriority.LOW
    };
    return map[priority] || IncidentPriority.MEDIUM;
  }

  /**
   * Broadcast SLA metrics to all dashboards
   */
  private async broadcastSLAMetrics() {
    // Get overall SLA metrics
    const assignments = await this.assignmentRepo.find({
      where: { 
        createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)) 
      }
    });

    const totalAssignments = assignments.length;
    const breachedAssignments = assignments.filter(a => a.slaMetrics?.breachedAt).length;
    const complianceRate = totalAssignments > 0 ? 
      ((totalAssignments - breachedAssignments) / totalAssignments) * 100 : 100;

    // Group by department
    const departmentMetrics = new Map<string, { total: number; breached: number }>();
    
    for (const assignment of assignments) {
      const deptId = assignment.assignedStation?.department?.id;
      if (!deptId) continue;

      const current = departmentMetrics.get(deptId) || { total: 0, breached: 0 };
      current.total++;
      if (assignment.slaMetrics?.breachedAt) {
        current.breached++;
      }
      departmentMetrics.set(deptId, current);
    }

    // Broadcast to all connected dashboard clients
    this.notificationGateway.broadcast({
      type: 'SLA_METRICS_UPDATE',
      data: {
        timestamp: new Date(),
        overallComplianceRate: complianceRate,
        totalBreaches: breachedAssignments,
        departmentMetrics: Array.from(departmentMetrics.entries()).map(([deptId, metrics]) => ({
          departmentId: deptId,
          complianceRate: metrics.total > 0 ? ((metrics.total - metrics.breached) / metrics.total) * 100 : 100,
          totalIncidents: metrics.total,
          breaches: metrics.breached
        }))
      }
    });
  }

  /**
   * Get SLA dashboard data
   */
  async getSLADashboardData(departmentId?: string, stationId?: string): Promise<any> {
    const where: any = {};
    if (stationId) {
      where.assignedStation = { id: stationId };
    } else if (departmentId) {
      where.assignedStation = { department: { id: departmentId } };
    }

    // Get active assignments with SLA metrics
    const activeAssignments = await this.assignmentRepo.find({
      where: {
        ...where,
        status: In(['pending', 'accepted', 'en_route', 'on_scene']),
      },
      relations: ['emergency', 'issue', 'assignedStation']
    });

    // Filter assignments with breaches
    const breachedAssignments = activeAssignments.filter(a => a.slaMetrics?.breachedAt);

    // Calculate breach statistics
    const breachesByType = {
      response: breachedAssignments.filter(a => 
        a.slaMetrics?.breachLevel === 'response' ||
        (a.slaMetrics?.actualResponse && a.slaMetrics?.actualResponse > a.slaMetrics?.responseTarget)
      ).length,
      resolution: breachedAssignments.filter(a => 
        a.slaMetrics?.breachLevel === 'resolution' ||
        (a.slaMetrics?.actualResolution && a.slaMetrics?.actualResolution > a.slaMetrics?.resolutionTarget)
      ).length
    };

    // Get escalation history
    const escalations = await this.escalationLogRepo.find({
      where: {
        escalatedAt: MoreThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      },
      order: { escalatedAt: 'DESC' as 'DESC' },
      take: 50
    });

    return {
      activeBreaches: breachedAssignments.length,
      breachesByType,
      complianceTrend: await this.getComplianceTrend(departmentId, 7),
      recentEscalations: escalations.map(e => ({
        id: e.id,
        incidentId: e.emergencyId || e.issueId,
        level: e.escalationLevel,
        reason: e.escalationReason,
        escalatedAt: e.escalatedAt,
        status: e.status
      })),
      departmentPerformance: await this.getDepartmentPerformance(departmentId)
    };
  }

  /**
   * Get compliance trend for last N days
   */
  private async getComplianceTrend(departmentId?: string, days: number = 7): Promise<any[]> {
    const trend: any[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const where: any = {
        assignedAt: Between(date, nextDate)
      };

      if (departmentId) {
        where.assignedStation = { department: { id: departmentId } };
      }

      const assignments = await this.assignmentRepo.find({ 
        where,
        relations: ['assignedStation', 'assignedStation.department']
      });
      const total = assignments.length;
      const breached = assignments.filter(a => a.slaMetrics?.breachedAt).length;

      trend.push({
        date: date.toISOString().split('T')[0],
        complianceRate: total > 0 ? ((total - breached) / total) * 100 : 100,
        totalIncidents: total,
        breaches: breached
      });
    }

    return trend;
  }

  /**
   * Get department performance metrics
   */
  private async getDepartmentPerformance(departmentId?: string): Promise<any[]> {
    const departments = departmentId ? 
      [await this.departmentRepo.findOne({ where: { id: departmentId } })] :
      await this.departmentRepo.find();

    const performance: any[] = [];

    for (const dept of departments) {
      if (!dept) continue;

      const assignments = await this.assignmentRepo.find({
        where: {
          assignedStation: { department: { id: dept.id } },
          assignedAt: MoreThan(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        },
        relations: ['assignedStation', 'assignedStation.department']
      });

      const total = assignments.length;
      const breached = assignments.filter(a => a.slaMetrics?.breachedAt).length;
      const avgResponseTime = assignments
        .filter(a => a.acknowledgedAt)
        .reduce((sum, a) => sum + ((a.acknowledgedAt!.getTime() - a.assignedAt.getTime()) / (1000 * 60)), 0) / 
        (assignments.filter(a => a.acknowledgedAt).length || 1);

      performance.push({
        departmentId: dept.id,
        departmentName: dept.name,
        totalIncidents: total,
        breaches: breached,
        complianceRate: total > 0 ? ((total - breached) / total) * 100 : 100,
        avgResponseTimeMinutes: Math.round(avgResponseTime * 10) / 10
      });
    }

    return performance;
  }

  /**
   * Acknowledge escalation
   */
  async acknowledgeEscalation(
    escalationId: string,
    userId: string,
    notes?: string
  ): Promise<EscalationLog> {
    const escalation = await this.escalationLogRepo.findOne({
      where: { id: escalationId },
      relations: ['escalatedToUser']
    });

    if (!escalation) {
      throw new Error('Escalation not found');
    }

    escalation.status = EscalationStatus.ACKNOWLEDGED;
    escalation.acknowledgedAt = new Date();
    escalation.acknowledgedById = userId;
    escalation.acknowledgementNotes = notes!;

    // Update the corresponding assignment
    const incidentId = escalation.emergencyId || escalation.issueId;
    const assignment = await this.assignmentRepo.findOne({
      where: { incidentId: incidentId?.toString() }
    });

    if (assignment && assignment.escalationHistory) {
      const lastEscalation = assignment.escalationHistory[assignment.escalationHistory.length - 1];
      if (lastEscalation) {
        lastEscalation.resolved = true;
      }
      await this.assignmentRepo.save(assignment);
    }

    // Create notification for acknowledgment
    this.notificationGateway.sendToUser(userId, {
      type: 'ESCALATION_ACKNOWLEDGED',
      title: 'Escalation Acknowledged',
      message: `Escalation ${escalationId} has been acknowledged`,
      data: { escalationId }
    });

    return await this.escalationLogRepo.save(escalation);
  }

  /**
   * Resolve escalation
   */
  async resolveEscalation(
    escalationId: string,
    userId: string,
    resolutionNotes: string,
    resolutionAction: string
  ): Promise<EscalationLog> {
    const escalation = await this.escalationLogRepo.findOne({
      where: { id: escalationId }
    });

    if (!escalation) {
      throw new Error('Escalation not found');
    }

    escalation.status = EscalationStatus.RESOLVED;
    escalation.resolvedAt = new Date();
    escalation.resolvedById = userId;
    escalation.resolutionNotes = resolutionNotes;
    escalation.resolutionAction = resolutionAction;

    // Update assignment status
    const incidentId = escalation.emergencyId || escalation.issueId;
    const assignment = await this.assignmentRepo.findOne({
      where: { incidentId: incidentId?.toString() }
    });

    if (assignment) {
      assignment.status = AssignmentStatus.COMPLETED;
      if (assignment.slaMetrics) {
        assignment.slaMetrics.breachedAt = null;
        assignment.slaMetrics.breachLevel = null;
      }
      await this.assignmentRepo.save(assignment);
    }

    // Notify all parties
    this.notificationGateway.broadcast({
      type: 'ESCALATION_RESOLVED',
      title: 'Escalation Resolved',
      message: `Escalation ${escalationId} has been resolved`,
      data: { escalationId, resolutionAction, resolutionNotes }
    });

    return await this.escalationLogRepo.save(escalation);
  }

  /**
   * Get active escalations
   */
  async getActiveEscalations(departmentId?: string): Promise<EscalationLog[]> {
    const where: any = {
      status: In([EscalationStatus.PENDING, EscalationStatus.ACKNOWLEDGED])
    };

    if (departmentId) {
      where.escalatedToDepartmentId = departmentId;
    }

    return await this.escalationLogRepo.find({
      where,
      order: { escalatedAt: 'DESC' as 'DESC' },
      relations: ['emergency', 'issue', 'escalatedToDepartment']
    });
  }

  /**
   * Check if incident requires immediate attention
   */
  async requiresImmediateAttention(incidentId: string): Promise<boolean> {
    const assignment = await this.assignmentRepo.findOne({
      where: { incidentId }
    });

    if (!assignment) return false;

    const slaStatus = await this.checkAssignmentSLA(assignment);
    return slaStatus.status === 'critical' || 
           slaStatus.currentEscalationLevel >= 2;
  }
}