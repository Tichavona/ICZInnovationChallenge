/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
// src/database/issue-report.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

export enum IssueType {
  POTHOLE = 'pothole',
  LITTER = 'litter',
  SEWER = 'sewer',
  WATER_PIPE_BURST = 'water_pipe_burst',
  OTHER = 'other'
}

export enum IssueStatus {
  REPORTED = 'reported',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

@Entity('issue_reports')
export class IssueReport {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.issueReports, { nullable: true })
  user: User | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  reportingPhoneNumber: string;

  @Column({ type: 'varchar', enum: IssueType })
  type: IssueType;

  @Column('text')
  description: string;

  @Column('varchar', { nullable: true })
  location: string;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column('decimal', { precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column('varchar', { nullable: true })
  imageUrl: string;

  @Column('varchar', { nullable: true })
  voiceNoteUrl: string;

  @Column('varchar', { nullable: true })
  videoUrl: string;

  @Column({ type: 'varchar', enum: IssueStatus, default: IssueStatus.REPORTED })
  status: IssueStatus;

  @Column('text', { nullable: true })
  adminNotes: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date;

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
  assignedDepartmentsJson: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  editHistoryJson: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  mediaInfoJson: string;

  @Column({ nullable: true })
  lastEditedAt?: Date;

  @Column({ nullable: true })
  lastEditedBy?: string;

  // Add isArchived as bit
  @Column({ type: 'bit', default: 0 })
  isArchived: boolean;
  rating: number;
  userFeedback: any;

  // Getters and setters for JSON fields
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

  get mediaInfo(): Array<{ type: string; path: string; addedAt: Date }> {
    try {
      const parsed = this.mediaInfoJson ? JSON.parse(this.mediaInfoJson) : [];
      return parsed.map((item: any) => ({
        ...item,
        addedAt: item.addedAt ? new Date(item.addedAt) : new Date()
      }));
    } catch {
      return [];
    }
  }

  set mediaInfo(info: Array<{ type: string; path: string; addedAt: Date }>) {
    const serialized = info.map(item => ({
      ...item,
      addedAt: item.addedAt ? item.addedAt.toISOString() : new Date().toISOString()
    }));
    this.mediaInfoJson = JSON.stringify(serialized);
  }
}