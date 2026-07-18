/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
// src/database/incident-assignment.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { EmergencyReport } from './emergency-report.entity';
import { IssueReport } from './issue-report.entity';
import { Station } from './station.entity';
import { DepartmentStaff } from './department.entity';

export enum AssignmentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EN_ROUTE = 'en_route',
  ON_SCENE = 'on_scene',
  COMPLETED = 'completed',
  ESCALATED = 'escalated',
  REASSIGNED = 'reassigned'
}

export interface SLAMetrics {
  responseTarget: number;
  actualResponse: number | null;
  resolutionTarget: number;
  actualResolution: number | null;
  breachedAt: Date | null;
  breachLevel: string | null;
}

// Interface for storage format (with string dates)
interface SLAMetricsStorage {
  responseTarget: number;
  actualResponse: number | null;
  resolutionTarget: number;
  actualResolution: number | null;
  breachedAt: string | null;
  breachLevel: string | null;
}

export interface EscalationHistoryItem {
  level: string;
  escalatedAt: Date;
  escalatedTo: string;
  reason: string;
  resolved: boolean;
}

// Interface for storage format (with string dates)
interface EscalationHistoryItemStorage {
  level: string;
  escalatedAt: string;
  escalatedTo: string;
  reason: string;
  resolved: boolean;
}

@Entity('incident_assignments')
export class IncidentAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  incidentType: 'emergency' | 'issue';

  @Column({ type: 'varchar', nullable: true })
  incidentId: string;

  @ManyToOne(() => EmergencyReport, { nullable: true })
  emergency: EmergencyReport;

  @ManyToOne(() => IssueReport, { nullable: true })
  issue: IssueReport;

  @ManyToOne(() => Station, station => station.assignments)
  assignedStation: Station;

  @ManyToOne(() => DepartmentStaff, staff => staff.assignments, { nullable: true })
  assignedStaff: DepartmentStaff;

  @Column({ type: 'varchar', length: 50 })
  status: AssignmentStatus;

  @Column({ type: 'datetime' })
  assignedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  acknowledgedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  enRouteAt: Date;

  @Column({ type: 'datetime', nullable: true })
  onSceneAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;

  @Column({ type: 'float', nullable: true })
  distanceToIncidentKm: number;

  @Column({ type: 'int', nullable: true })
  estimatedArrivalMinutes: number;

  // Change from json to nvarchar for MSSQL - allow null
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  slaMetricsJson: string | null;

  // Change from json to nvarchar for MSSQL - allow null
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  escalationHistoryJson: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  // Getters and setters for slaMetrics with proper null handling
  get slaMetrics(): SLAMetrics | null {
    if (!this.slaMetricsJson) return null;
    try {
      const parsed = JSON.parse(this.slaMetricsJson) as SLAMetricsStorage;
      // Convert string dates back to Date objects
      return {
        ...parsed,
        breachedAt: parsed.breachedAt ? new Date(parsed.breachedAt) : null
      };
    } catch {
      return null;
    }
  }

  set slaMetrics(value: SLAMetrics | null) {
    if (!value) {
      this.slaMetricsJson = null;
      return;
    }
    
    // Convert Date objects to strings for storage using the storage interface
    const toStore: SLAMetricsStorage = {
      responseTarget: value.responseTarget,
      actualResponse: value.actualResponse,
      resolutionTarget: value.resolutionTarget,
      actualResolution: value.actualResolution,
      breachedAt: value.breachedAt instanceof Date ? value.breachedAt.toISOString() : null,
      breachLevel: value.breachLevel
    };
    
    this.slaMetricsJson = JSON.stringify(toStore);
  }

  // Getters and setters for escalationHistory with proper null handling
  get escalationHistory(): EscalationHistoryItem[] | null {
    if (!this.escalationHistoryJson) return null;
    try {
      const parsed = JSON.parse(this.escalationHistoryJson) as EscalationHistoryItemStorage[];
      // Convert string dates back to Date objects
      return parsed.map(item => ({
        ...item,
        escalatedAt: new Date(item.escalatedAt)
      }));
    } catch {
      return null;
    }
  }

  set escalationHistory(value: EscalationHistoryItem[] | null) {
    if (!value || value.length === 0) {
      this.escalationHistoryJson = null;
      return;
    }
    
    // Convert Date objects to strings for storage using the storage interface
    const toStore: EscalationHistoryItemStorage[] = value.map(item => ({
      level: item.level,
      escalatedAt: item.escalatedAt instanceof Date ? 
        item.escalatedAt.toISOString() : item.escalatedAt as any,
      escalatedTo: item.escalatedTo,
      reason: item.reason,
      resolved: item.resolved
    }));
    
    this.escalationHistoryJson = JSON.stringify(toStore);
  }
}