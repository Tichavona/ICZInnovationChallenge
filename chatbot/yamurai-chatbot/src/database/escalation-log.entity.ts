/* eslint-disable prettier/prettier */
// src/database/escalation-log.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { EmergencyReport } from './emergency-report.entity';
import { IssueReport } from './issue-report.entity';
import { User } from './user.entity';
import { Department } from './department.entity';

export enum EscalationLevel {
  LEVEL_1 = 'supervisor',      // First level - immediate supervisor
  LEVEL_2 = 'manager',          // Department manager
  LEVEL_3 = 'director',         // Department director
  LEVEL_4 = 'headquarters',      // National/Regional headquarters
  LEVEL_5 = 'emergency_services' // Cross-department emergency coordination
}

export enum EscalationReason {
  SLA_RESPONSE_BREACH = 'sla_response_breach',
  SLA_RESOLUTION_BREACH = 'sla_resolution_breach',
  NO_STAFF_AVAILABLE = 'no_staff_available',
  NO_STATION_AVAILABLE = 'no_station_available',
  INCIDENT_SEVERITY_ESCALATION = 'incident_severity_escalation',
  MULTI_DEPARTMENT_REQUIRED = 'multi_department_required',
  CITIZEN_COMPLAINT = 'citizen_complaint',
  CRITICAL_INCIDENT = 'critical_incident',
  SYSTEM_FAILURE = 'system_failure'
}

export enum EscalationStatus {
  PENDING = 'pending',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  IGNORED = 'ignored',
  ESCALATED_FURTHER = 'escalated_further'
}

@Entity('escalation_logs')
export class EscalationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  incidentType: 'emergency' | 'issue';

  @Column({ type: 'int', nullable: true })
  emergencyId: number;

  @Column({ type: 'int', nullable: true })
  issueId: number;

  @ManyToOne(() => EmergencyReport, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'emergencyId' })
  emergency: EmergencyReport;

  @ManyToOne(() => IssueReport, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issueId' })
  issue: IssueReport;

  @Column({ type: 'varchar', length: 50 })
  escalationLevel: EscalationLevel;

  @Column({ type: 'varchar', length: 100 })
  escalationReason: EscalationReason;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  reasonDetails: string; // Detailed explanation of why escalation happened

  @Column({ type: 'int', nullable: true })
  slaBreachMinutes: number; // How many minutes over SLA

  @Column({ type: 'varchar', length: 50, default: EscalationStatus.PENDING })
  status: EscalationStatus;

  // Who escalated
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'escalatedById' })
  escalatedBy: User;

  @Column({ type: 'uuid', nullable: true })
  escalatedById: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  escalatedByRole: string;

  @Column({ type: 'datetime2' })
  escalatedAt: Date;

  // Who is it escalated to
  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'escalatedToDepartmentId' })
  escalatedToDepartment: Department;

  @Column({ type: 'uuid', nullable: true })
  escalatedToDepartmentId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'escalatedToUserId' })
  escalatedToUser: User;

  @Column({ type: 'uuid', nullable: true })
  escalatedToUserId: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  escalatedToEmail: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  escalatedToRole: string;

  // Response tracking
  @Column({ type: 'datetime2', nullable: true })
  acknowledgedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'acknowledgedById' })
  acknowledgedBy: User;

  @Column({ type: 'uuid', nullable: true })
  acknowledgedById: string;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  acknowledgementNotes: string;

  @Column({ type: 'datetime2', nullable: true })
  resolvedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolvedById' })
  resolvedBy: User;

  @Column({ type: 'uuid', nullable: true })
  resolvedById: string;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  resolutionNotes: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  resolutionAction: string; // What action was taken

  @Column({ type: 'json', nullable: true })
  notificationHistory: {
    channel: 'email' | 'sms' | 'whatsapp' | 'in_app';
    sentAt: Date;
    recipient: string;
    status: 'sent' | 'delivered' | 'failed';
    errorMessage?: string;
  }[];

  @Column({ type: 'json', nullable: true })
  metadata: {
    previousEscalationId?: string;
    nextEscalationId?: string;
    autoEscalationRules?: any;
    incidentSnapshot?: any; // Snapshot of incident at time of escalation
    systemMetrics?: {
      responseTime: number;
      staffAvailable: number;
      stationLoad: number;
    };
  };

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @Column({ type: 'datetime2', nullable: true })
  updatedAt: Date;

  // Helper method to check if escalation is overdue
  isOverdue(hoursThreshold: number = 24): boolean {
    if (this.status === EscalationStatus.RESOLVED) return false;
    const hoursSinceEscalation = (new Date().getTime() - this.escalatedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceEscalation > hoursThreshold;
  }

  // Helper to get formatted duration
  getEscalationDuration(): string {
    const endTime = this.resolvedAt || new Date();
    const durationMs = endTime.getTime() - this.escalatedAt.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
} 
