// backend/src/database/incident-routing-rule.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Department } from './department.entity';
import { EmergencyType } from './emergency-report.entity';
import { IssueType } from './issue-report.entity';

export enum IncidentType {
  EMERGENCY = 'emergency',
  ISSUE = 'issue'
}

// Interface for secondary departments
export interface SecondaryDepartment {
  departmentId: string;
  priority: number;
  condition?: string;
}

// Interface for conditions
export interface RoutingConditions {
  severity?: string[];
  location?: string[];
  timeOfDay?: string[];
  dayOfWeek?: number[];
  customCriteria?: any;
}

@Entity('incident_routing_rules')
export class IncidentRoutingRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ 
    type: 'varchar', 
    length: 20,
    enum: IncidentType 
  })
  incidentType: IncidentType;

  @Column({ type: 'varchar', length: 100 })
  category: string; // Stores EmergencyType or IssueType as string

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'primaryDepartmentId' })
  primaryDepartment: Department;

  @Column({ type: 'uuid', nullable: false })
  primaryDepartmentId: string;

  // Change from json to nvarchar for MSSQL
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  secondaryDepartmentsJson: string | null;

  // Change from json to nvarchar for MSSQL
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  conditionsJson: string | null;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ type: 'bit', default: 1 })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;

  // Getter and setter for secondaryDepartments
  get secondaryDepartments(): SecondaryDepartment[] {
    if (!this.secondaryDepartmentsJson) return [];
    try {
      return JSON.parse(this.secondaryDepartmentsJson);
    } catch {
      return [];
    }
  }

  set secondaryDepartments(value: SecondaryDepartment[]) {
    this.secondaryDepartmentsJson = value ? JSON.stringify(value) : null;
  }

  // Getter and setter for conditions
  get conditions(): RoutingConditions | null {
    if (!this.conditionsJson) return null;
    try {
      return JSON.parse(this.conditionsJson);
    } catch {
      return null;
    }
  }

  set conditions(value: RoutingConditions | null) {
    this.conditionsJson = value ? JSON.stringify(value) : null;
  }
}