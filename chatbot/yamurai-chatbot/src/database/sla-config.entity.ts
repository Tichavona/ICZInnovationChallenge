/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Department } from './department.entity';
import { Station } from './station.entity';

export enum IncidentPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum EscalationLevel {
  LEVEL_1 = 'supervisor',
  LEVEL_2 = 'manager',
  LEVEL_3 = 'director',
  LEVEL_4 = 'headquarters'
}

@Entity('sla_configs')
export class SLAConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Department)
  department: Department;

  @Column({ type: 'varchar', length: 50 })
  incidentType: string; // e.g., 'robbery', 'fire', 'medical'

  @Column({ type: 'varchar', length: 20 })
  priority: IncidentPriority;

  @Column('int')
  responseTimeMinutes: number; // Time to acknowledge/respond

  @Column('int')
  resolutionTimeMinutes: number; // Time to resolve

  @Column('int')
  updateFrequencyMinutes: number; // Required status updates

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  mediaUrlsJson: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  additionalNotesJson: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  assignedDepartmentsJson: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  followupCommentsJson: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  editHistoryJson: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  consolidationMetadataJson: string | null;

  @Column({ type: 'bit', default: false })
  allDay: boolean; // Whether service is 24/7

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'bit', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  escalationRules: any;
}
