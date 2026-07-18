/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
// src/database/emergency-report.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

export enum EmergencyType {
  FIRE = 'fire',
  AMBULANCE = 'ambulance',
  ROBBERY = 'robbery',
  ACCIDENT = 'accident',
  MEDICAL = 'medical',
  CRIME = 'crime',
  NATURAL_DISASTER = 'natural_disaster',
  OTHER = 'other'
}

export enum EmergencyStatus {
  REPORTED = 'reported',
  DISPATCHED = 'dispatched',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled'
}

export enum EmergencyPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

@Entity('emergency_reports')
export class EmergencyReport {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.emergencyReports, { nullable: true })
  user: User | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  reportingPhoneNumber: string;

  @Column({ type: 'varchar', enum: EmergencyType })
  type: EmergencyType;

  @Column({ type: 'varchar', enum: EmergencyPriority, default: EmergencyPriority.MEDIUM })
  priority: EmergencyPriority;

  @Column('text')
  description: string;

  @Column('varchar')
  location: string;

  @Column('decimal', { precision: 10, scale: 8 })
  latitude: number;

  @Column('decimal', { precision: 11, scale: 8 })
  longitude: number;

  @Column('varchar', { nullable: true })
  imageUrl: string;

  @Column('varchar', { nullable: true })
  voiceNoteUrl: string;

  @Column('varchar', { nullable: true })
  videoUrl: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  mediaUrlsJson: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  additionalNotesJson: string;

  @Column({ type: 'varchar', enum: EmergencyStatus, default: EmergencyStatus.REPORTED })
  status: EmergencyStatus;

  @Column('text', { nullable: true })
  adminNotes: string;

  @Column('text', { nullable: true })
  userFeedback: string;

  @Column({ type: 'int', default: 0 })
  rating: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  assignedDepartment: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  assignedUnit: string;

  @Column({ type: 'datetime', nullable: true })
  dispatchedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  // Change from boolean to bit
  @Column({ type: 'bit', default: 0 })
  isConsolidated: boolean;

  @Column({ type: 'int', nullable: true })
  consolidationId: number;

  @Column({ type: 'int', nullable: true })
  consolidatedReportId: number;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  consolidationMetadata: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  followupCommentsJson: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  editHistoryJson: string;

  @Column({ nullable: true })
  lastEditedAt?: Date;

  @Column({ nullable: true })
  lastEditedBy?: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  assignedDepartmentsJson: string;

  // Add isArchived as bit
  @Column({ type: 'bit', default: 0 })
  isArchived: boolean;

  // Getters and setters for JSON fields
  get mediaUrls(): string[] {
    try {
      return this.mediaUrlsJson ? JSON.parse(this.mediaUrlsJson) : [];
    } catch {
      return [];
    }
  }

  set mediaUrls(urls: string[]) {
    this.mediaUrlsJson = JSON.stringify(urls);
  }

  get assignedDepartments(): string[] {
    try {
      return this.assignedDepartmentsJson ? JSON.parse(this.assignedDepartmentsJson) : [];
    } catch {
      return [];
    }
  }

  set assignedDepartments(departments: string[]) {
    this.assignedDepartmentsJson = JSON.stringify(departments);
  }

  get additionalNotes(): string[] {
    try {
      return this.additionalNotesJson ? JSON.parse(this.additionalNotesJson) : [];
    } catch {
      return [];
    }
  }

  set additionalNotes(notes: string[]) {
    this.additionalNotesJson = JSON.stringify(notes);
  }

  get followupComments(): Array<{ timestamp: string; comment: string; type: string }> {
    try {
      return this.followupCommentsJson ? JSON.parse(this.followupCommentsJson) : [];
    } catch {
      return [];
    }
  }

  set followupComments(comments: Array<{ timestamp: string; comment: string; type: string }>) {
    this.followupCommentsJson = JSON.stringify(comments);
  }

  get editHistory(): Array<{ timestamp: Date; action: string; description: string; editedBy: string }> {
    try {
      const parsed = this.editHistoryJson ? JSON.parse(this.editHistoryJson) : [];
      return parsed.map((item: any) => ({
        ...item,
        timestamp: item.timestamp ? new Date(item.timestamp) : new Date()
      }));
    } catch {
      return [];
    }
  }

  set editHistory(history: Array<{ timestamp: Date; action: string; description: string; editedBy: string }>) {
    const serialized = history.map(item => ({
      ...item,
      timestamp: item.timestamp ? item.timestamp.toISOString() : new Date().toISOString()
    }));
    this.editHistoryJson = JSON.stringify(serialized);
  }
}