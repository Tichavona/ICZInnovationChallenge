/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
// src/database/dashboard.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { EmergencyReport } from './emergency-report.entity';
import { IssueReport } from './issue-report.entity';
import { EmergencyPriority } from './emergency-report.entity';

// Dashboard User Roles
export enum DashboardRole {
  CITIZEN = 'citizen',        // Regular users who submit reports
  AGENT = 'agent',            // Field agents who handle reports
  SUPERVISOR = 'supervisor',  // Team supervisors
  ADMIN = 'admin',            // System administrators
  EMERGENCY_RESPONDER = 'emergency_responder' // Fire, medical, police
}

// Dashboard User Entity
@Entity('dashboard_users')
export class DashboardUser {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.dashboardProfiles)
  user: User;

  @Column({ type: 'varchar', length: 50 })
  role: DashboardRole;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string; // e.g., "Fire Department", "Police", "Public Works"

  @Column({ type: 'varchar', length: 100, nullable: true })
  assignedZone: string; // Geographic zone for assignment

  // Changed from boolean to bit for MSSQL compatibility
  @Column({ type: 'bit', default: 1 })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  assignedTickets: number; // Currently assigned tickets

  @Column({ type: 'int', default: 0 })
  resolvedTickets: number; // Historical resolved tickets

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;
}

// Ticket Assignment Entity
@Entity('ticket_assignments')
export class TicketAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DashboardUser)
  assignedTo: DashboardUser;

  @ManyToOne(() => DashboardUser, { nullable: true })
  assignedBy: DashboardUser;

  @Column({ type: 'varchar', length: 20 })
  ticketType: 'emergency' | 'issue';

  @Column()
  ticketId: number; // References EmergencyReport.id or IssueReport.id

  @Column({ type: 'varchar', length: 50 })
  status: 'pending' | 'in_progress' | 'resolved' | 'closed' | 'escalated';

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'datetime', nullable: true })
  deadline: Date;

  @Column({ type: 'int', nullable: true })
  priority: number; // 1-5 scale

  @CreateDateColumn({ type: 'datetime2' })
  assignedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  closedAt: Date;
}

// Enhanced Notification Entity (Merged Implementation)
@Entity('dashboard_notifications')
export class DashboardNotification {
  @PrimaryGeneratedColumn()
  id: number;

  // User relationship (if notification is for specific user)
  @ManyToOne(() => DashboardUser, { nullable: true })
  recipient: DashboardUser;

  // For department-wide notifications (when specific recipient not assigned)
  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string;

  // Core notification fields
  @Column({ type: 'varchar', length: 50 })
  reportType: string; // 'EMERGENCY' or 'ISSUE'

  @Column()
  reportId: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  // Notification type for filtering
  @Column({ 
    type: 'varchar', 
    length: 50,
    default: 'new_ticket'
  })
  type: 'new_ticket' | 'assignment' | 'status_update' | 'message' | 'system' | 'escalation';

  // Priority and status
  @Column({ 
    type: 'varchar', 
    length: 50, 
    default: 'MEDIUM' 
  })
  priority: string; // 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW' (maps to EmergencyPriority)

  @Column({ 
    type: 'varchar', 
    length: 50, 
    default: 'PENDING' 
  })
  status: string; // 'PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'

  // Escalation tracking
  @Column({ type: 'int', default: 0 })
  escalationLevel: number; // 0, 1, 2

  // Assignment tracking
  @Column({ type: 'varchar', length: 100, nullable: true })
  assignedTo: string; // User ID or name (for quick reference)

  // Read/Archive status - Changed from boolean to bit for MSSQL compatibility
  @Column({ type: 'bit', default: 0 })
  isRead: boolean;

  @Column({ type: 'bit', default: 0 })
  isArchived: boolean;

  // Metadata for additional data - Changed from nvarchar(MAX) to text for MSSQL compatibility
  @Column({ type: 'text', nullable: true })
  metadata: string;

  // Timestamps
  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  acknowledgedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date;
  data: any;

  // Helper methods
  getMetadata(): any {
    try {
      return this.metadata ? JSON.parse(this.metadata) : {};
    } catch {
      return {};
    }
  }

  setMetadata(data: any): void {
    this.metadata = JSON.stringify(data);
  }

  // Method to convert EmergencyPriority to notification priority string
  static fromEmergencyPriority(priority: EmergencyPriority): string {
    switch (priority) {
      case EmergencyPriority.CRITICAL:
        return 'CRITICAL';
      case EmergencyPriority.HIGH:
        return 'HIGH';
      case EmergencyPriority.MEDIUM:
        return 'MEDIUM';
      case EmergencyPriority.LOW:
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }

  // Method to get notification priority as EmergencyPriority
  toEmergencyPriority(): EmergencyPriority {
    switch (this.priority) {
      case 'CRITICAL':
        return EmergencyPriority.CRITICAL;
      case 'HIGH':
        return EmergencyPriority.HIGH;
      case 'MEDIUM':
        return EmergencyPriority.MEDIUM;
      case 'LOW':
        return EmergencyPriority.LOW;
      default:
        return EmergencyPriority.MEDIUM;
    }
  }

  // Escalation methods
  escalate(): void {
    if (this.escalationLevel < 2) {
      this.escalationLevel++;
      this.updatedAt = new Date();
      
      // Update message with escalation info
      const escalationMessages = [
        '⚠️ Initial escalation: Response overdue',
        '🚨 Second escalation: Urgent attention required',
        '🔴 Critical escalation: Immediate action needed',
      ];
      
      this.message += `\n\n${escalationMessages[this.escalationLevel]}`;
    }
  }

  // Status transition methods
  acknowledge(): void {
    if (this.status === 'PENDING') {
      this.status = 'ACKNOWLEDGED';
      this.acknowledgedAt = new Date();
      this.isRead = true;
      this.readAt = new Date();
    }
  }

  markInProgress(): void {
    this.status = 'IN_PROGRESS';
    this.updatedAt = new Date();
  }

  markResolved(): void {
    this.status = 'RESOLVED';
    this.resolvedAt = new Date();
    this.updatedAt = new Date();
  }

  archive(): void {
    this.isArchived = true;
    this.updatedAt = new Date();
  }

  // Factory method to create notification from report
  static createFromReport(
    reportType: 'EMERGENCY' | 'ISSUE',
    reportId: number,
    department: string,
    title: string,
    message: string,
    priority: string = 'MEDIUM',
    metadata?: any
  ): DashboardNotification {
    const notification = new DashboardNotification();
    notification.reportType = reportType;
    notification.reportId = reportId;
    notification.department = department;
    notification.title = title;
    notification.message = message;
    notification.priority = priority;
    notification.status = 'PENDING';
    notification.escalationLevel = 0;
    notification.isRead = false;
    notification.isArchived = false;
    notification.type = 'new_ticket';
    
    if (metadata) {
      notification.setMetadata(metadata);
    }
    
    return notification;
  }
}

// Dashboard Activity Log
@Entity('dashboard_activities')
export class DashboardActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DashboardUser)
  user: DashboardUser;

  @Column({ type: 'varchar', length: 50 })
  action: string; // e.g., 'assign_ticket', 'update_status', 'add_note'

  @Column({ type: 'text' })
  description: string;

  // Changed from json to text for MSSQL compatibility
  @Column({ type: 'text', nullable: true })
  metadata: string; // Additional data about the action

  @CreateDateColumn({ type: 'datetime2' })
  timestamp: Date;

  // Helper method to get parsed metadata
  getMetadata(): any {
    try {
      return this.metadata ? JSON.parse(this.metadata) : {};
    } catch {
      return {};
    }
  }

  setMetadata(data: any): void {
    this.metadata = JSON.stringify(data);
  }

  // Factory method for common activities
  static createNotificationActivity(
    user: DashboardUser,
    notification: DashboardNotification,
    action: string
  ): DashboardActivity {
    const activity = new DashboardActivity();
    activity.user = user;
    activity.action = action;
    activity.description = `${action} for ${notification.reportType} report #${notification.reportId}`;
    activity.setMetadata({
      notificationId: notification.id,
      reportType: notification.reportType,
      reportId: notification.reportId,
      priority: notification.priority,
      department: notification.department
    });
    activity.timestamp = new Date();
    return activity;
  }
}

// Department Entity for better department management
@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string; // e.g., "Police Department", "Fire Brigade"

  @Column({ type: 'varchar', length: 10, nullable: true })
  code: string; // e.g., "PD", "FB", "AMB"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string; // 'active', 'inactive', 'maintenance'

  @Column({ type: 'int', default: 0 })
  activeNotifications: number;

  @Column({ type: 'int', default: 0 })
  pendingNotifications: number;

  @Column({ type: 'int', default: 0 })
  resolvedNotifications: number;

  @OneToMany(() => DashboardUser, user => user.department)
  members: DashboardUser[];

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;
}

// Notification Escalation Log
@Entity('notification_escalations')
export class NotificationEscalation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => DashboardNotification)
  notification: DashboardNotification;

  @Column({ type: 'int' })
  fromLevel: number;

  @Column({ type: 'int' })
  toLevel: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @ManyToOne(() => DashboardUser, { nullable: true })
  escalatedBy: DashboardUser;

  @ManyToOne(() => DashboardUser, { nullable: true })
  escalatedTo: DashboardUser; // Who it was escalated to

  @CreateDateColumn({ type: 'datetime2' })
  escalatedAt: Date;

  // Changed from json to text for MSSQL compatibility
  @Column({ type: 'text', nullable: true })
  metadata: string;

  // Helper method to get parsed metadata
  getMetadata(): any {
    try {
      return this.metadata ? JSON.parse(this.metadata) : {};
    } catch {
      return {};
    }
  }

  setMetadata(data: any): void {
    this.metadata = JSON.stringify(data);
  }
}

// Report Consolidation Entity
@Entity('report_consolidations')
export class ReportConsolidation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  consolidationType: 'emergency' | 'issue';

  @Column({ type: 'varchar', length: 100 })
  primaryDepartment: string;

  // Changed from nvarchar(MAX) to text for MSSQL compatibility
  @Column({ type: 'nvarchar', length: 'MAX', nullable: false })
  departmentsJson: string;

  @Column('text')
  description: string;

  @Column('varchar')
  location: string;

  @Column('decimal', { precision: 10, scale: 8 })
  latitude: number;

  @Column('decimal', { precision: 11, scale: 8 })
  longitude: number;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'int', default: 1 })
  reportCount: number;

  // Changed from nvarchar(MAX) to text for MSSQL compatibility
  @Column({ type: 'nvarchar', length: 'MAX', nullable: false })
  reportIdsJson: string;

  // Added missing property for reporter phones
  @Column({ type: 'text', nullable: true })
  reporterPhonesJson: string;

  // Changed from nvarchar(MAX) to text for MSSQL compatibility
  @Column({ type: 'text', nullable: true })
  metadata: string;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date;
  
  lastReportedAt: Date;
  uniqueReporters: any;

  // Helper methods
  get departments(): string[] {
    try {
      return this.departmentsJson ? JSON.parse(this.departmentsJson) : [];
    } catch {
      return [];
    }
  }

  set departments(depts: string[]) {
    this.departmentsJson = JSON.stringify(depts);
  }

  get reportIds(): number[] {
    try {
      return this.reportIdsJson ? JSON.parse(this.reportIdsJson) : [];
    } catch {
      return [];
    }
  }

  set reportIds(ids: number[]) {
    this.reportIdsJson = JSON.stringify(ids);
  }

  // Added getter and setter for reporterPhones
  get reporterPhones(): string[] {
    try {
      return this.reporterPhonesJson ? JSON.parse(this.reporterPhonesJson) : [];
    } catch {
      return [];
    }
  }

  set reporterPhones(phones: string[]) {
    this.reporterPhonesJson = JSON.stringify(phones);
  }

  getMetadata(): any {
    try {
      return this.metadata ? JSON.parse(this.metadata) : {};
    } catch {
      return {};
    }
  }

  setMetadata(data: any): void {
    this.metadata = JSON.stringify(data);
  }

  // Fixed addReport method to handle all 3 parameters correctly
  addReport(reportId: number, reporterPhone: string, department: string): void {
    const ids = this.reportIds;
    const depts = this.departments;
    const phones = this.reporterPhones;
    
    if (!ids.includes(reportId)) {
      ids.push(reportId);
      this.reportIds = ids;
      this.reportCount = ids.length;
      this.lastReportedAt = new Date();
    }

    if (!phones.includes(reporterPhone)) {
      phones.push(reporterPhone);
      this.reporterPhones = phones;
      this.uniqueReporters = phones.length;
    }

    if (!depts.includes(department)) {
      depts.push(department);
      this.departments = depts;
    }

    this.updatedAt = new Date();
  }

  constructor() {
    // Initialize with empty arrays as JSON strings
    this.departmentsJson = '[]';
    this.reportIdsJson = '[]';
    this.reporterPhonesJson = '[]'; // Initialize reporterPhonesJson
    this.reportCount = 1;
    this.status = 'active';
  }
}

export interface ConsolidationMatch {
  isMatch: boolean;
  consolidationId?: number;
  confidence: number; // 0-100
  matchReasons: string[];
  distance?: number; // meters
  similarityScore?: number; // 0-100
}

@Entity('incident_groups')
export class IncidentGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  incidentType: 'emergency' | 'issue';

  @Column({ type: 'varchar', length: 100 })
  primaryDepartment: string;

  // Changed from nvarchar(MAX) to text for MSSQL compatibility
  @Column({ type: 'text' })
  departmentsJson: string;

  @Column('text')
  summary: string;

  @Column('varchar')
  location: string;

  @Column('decimal', { precision: 10, scale: 8 })
  centroidLatitude: number;

  @Column('decimal', { precision: 11, scale: 8 })
  centroidLongitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  radiusMeters: number; // Spread of reports

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string; // 'active', 'investigating', 'in_progress', 'resolved', 'closed', 'reopened'

  @Column({ type: 'int', default: 1 })
  reportCount: number;

  @Column({ type: 'int', default: 0 })
  uniqueReporters: number;

  // Changed from nvarchar(MAX) to text for MSSQL compatibility
  @Column({ type: 'text' })
  reporterPhonesJson: string; // Track unique reporters

  // Changed from nvarchar(MAX) to text for MSSQL compatibility
  @Column({ type: 'text' })
  reportIdsJson: string;

  @Column({ type: 'datetime' })
  firstReportedAt: Date;

  @Column({ type: 'datetime' })
  lastReportedAt: Date;

  @Column({ type: 'int', default: 0 })
  escalationLevel: number;

  // Changed from nvarchar(MAX) to text for MSSQL compatibility
  @Column({ type: 'text', nullable: true })
  analyticsJson: string;

  // Changed from nvarchar(MAX) to text for MSSQL compatibility
  @Column({ type: 'text', nullable: true })
  metadata: string;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  acknowledgedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  investigationStartedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  closedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  reopenedAt: Date;

  // Helper methods
  get departments(): string[] {
    try {
      return this.departmentsJson ? JSON.parse(this.departmentsJson) : [];
    } catch {
      return [];
    }
  }

  set departments(depts: string[]) {
    this.departmentsJson = JSON.stringify(depts);
  }

  get reportIds(): number[] {
    try {
      return this.reportIdsJson ? JSON.parse(this.reportIdsJson) : [];
    } catch {
      return [];
    }
  }

  set reportIds(ids: number[]) {
    this.reportIdsJson = JSON.stringify(ids);
  }

  get reporterPhones(): string[] {
    try {
      return this.reporterPhonesJson ? JSON.parse(this.reporterPhonesJson) : [];
    } catch {
      return [];
    }
  }

  set reporterPhones(phones: string[]) {
    this.reporterPhonesJson = JSON.stringify(phones);
  }

  get analytics(): IncidentAnalytics {
    try {
      return this.analyticsJson ? JSON.parse(this.analyticsJson) : {};
    } catch {
      return {};
    }
  }

  set analytics(data: IncidentAnalytics) {
    this.analyticsJson = JSON.stringify(data);
  }

  addReport(reportId: number, reporterPhone: string, department?: string): void {
    const ids = this.reportIds;
    const phones = this.reporterPhones;
    let depts: string[] = [];
    
    if (!ids.includes(reportId)) {
      ids.push(reportId);
      this.reportIds = ids;
      this.reportCount = ids.length;
      this.lastReportedAt = new Date();
    }

    if (!phones.includes(reporterPhone)) {
      phones.push(reporterPhone);
      this.reporterPhones = phones;
      this.uniqueReporters = phones.length;
    }

    try {
      depts = this.departmentsJson ? JSON.parse(this.departmentsJson) : [];
    } catch {
      depts = [];
    }

    if (!depts.includes(department!)) {
      depts.push(department!);
      this.departmentsJson = JSON.stringify(depts);
    }
    
    this.updatedAt = new Date();
  }

  // Status management methods
  markInvestigating(): void {
    if (this.status !== 'investigating') {
      this.status = 'investigating';
      this.investigationStartedAt = new Date();
      this.updatedAt = new Date();
    }
  }

  markResolved(): void {
    if (this.status !== 'resolved') {
      this.status = 'resolved';
      this.resolvedAt = new Date();
      this.updatedAt = new Date();
    }
  }

  markClosed(): void {
    if (this.status !== 'closed') {
      this.status = 'closed';
      this.closedAt = new Date();
      this.updatedAt = new Date();
    }
  }

  reopen(): void {
    if (this.status === 'resolved' || this.status === 'closed') {
      this.status = 'reopened';
      this.reopenedAt = new Date();
      this.updatedAt = new Date();
    }
  }
}

// Incident Analytics Interface
export interface IncidentAnalytics {
  reportDensity?: number; // Reports per hour
  timeIntervals?: {
    average: number; // Average minutes between reports
    min: number;
    max: number;
    intervals: number[]; // All intervals in minutes
  };
  locationSpread?: {
    radius: number;
    variance: number;
    points: Array<{ lat: number; lng: number }>;
  };
  reporterPatterns?: {
    repeatReporters: number;
    newReporters: number;
    reporterFrequency: Record<string, number>; // phone -> count
  };
  statusChanges?: Array<{
    from: string;
    to: string;
    timestamp: Date;
    changedBy?: string;
  }>;
  confidenceScores?: {
    geolocation: number;
    description: number;
    temporal: number;
    overall: number;
  };
  verificationFlags?: {
    needsInvestigation: boolean;
    potentialDuplicate: boolean;
    conflictingStatus: boolean;
    highActivity: boolean;
  };
}

// Incident Update Entity (for group-level updates)
@Entity('incident_updates')
export class IncidentUpdate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => IncidentGroup)
  incidentGroup: IncidentGroup;

  @ManyToOne(() => DashboardUser, { nullable: true })
  updatedBy: DashboardUser; // null for system updates

  @Column({ type: 'varchar', length: 50 })
  updateType: 'admin_update' | 'user_addition' | 'status_change' | 'investigation' | 'resolution';

  @Column('text')
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string;

  // Changed from nvarchar(MAX) to text for MSSQL compatibility
  @Column({ type: 'text', nullable: true })
  metadata: string;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  // Changed from boolean to bit for MSSQL compatibility
  @Column({ type: 'bit', default: 0 })
  isPublic: boolean;

  // Changed from boolean to bit for MSSQL compatibility
  @Column({ type: 'bit', default: 0 })
  requiresAction: boolean;

  // Helper methods
  getMetadata(): any {
    try {
      return this.metadata ? JSON.parse(this.metadata) : {};
    } catch {
      return {};
    }
  }

  setMetadata(data: any): void {
    this.metadata = JSON.stringify(data);
  }
}

// Status Verification Entity
@Entity('status_verifications')
export class StatusVerification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => IncidentGroup)
  incidentGroup: IncidentGroup;

  @ManyToOne(() => DashboardUser)
  verifiedBy: DashboardUser;

  @Column({ type: 'varchar', length: 50 })
  verificationType: 'status_conflict' | 'new_case_check' | 'false_report' | 'duplicate_verification';

  @Column('text')
  reason: string;

  @Column({ type: 'varchar', length: 50 })
  originalStatus: string;

  @Column({ type: 'varchar', length: 50 })
  newStatus: string;

  // Changed from boolean to bit for MSSQL compatibility
  @Column({ type: 'bit', default: 0 })
  isConfirmed: boolean;

  @Column('text', { nullable: true })
  notes: string;

  // Changed from nvarchar(MAX) to text for MSSQL compatibility
  @Column({ type: 'text', nullable: true })
  evidenceJson: string;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date;

  // Helper methods
  get evidence(): any[] {
    try {
      return this.evidenceJson ? JSON.parse(this.evidenceJson) : [];
    } catch {
      return [];
    }
  }

  set evidence(data: any[]) {
    this.evidenceJson = JSON.stringify(data);
  }

  confirm(): void {
    this.isConfirmed = true;
    this.resolvedAt = new Date();
  }
}