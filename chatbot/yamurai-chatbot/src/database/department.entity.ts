/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
// src/database/department.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, Tree, TreeParent, TreeChildren, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Station } from './station.entity';
import { IncidentAssignment } from './incident-assignment.entity';
import { IncidentRoutingRule } from './incident-routing-rule.entity';

export enum DepartmentType {
  POLICE = 'police',
  FIRE_BRIGADE = 'fire_brigade',
  AMBULANCE = 'ambulance',
  CITY_COUNCIL = 'city_council',
  WASTE_MANAGEMENT = 'waste_management',
  AGRICULTURAL = 'agricultural',
  EMERGENCY_COORDINATION = 'emergency_coordination'
}

@Entity('departments')
@Tree('materialized-path')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type: DepartmentType;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'inactive' | 'maintenance';

  @Column({ type: 'int', default: 0 })
  activeStaff: number;

  @Column({ type: 'int', default: 0 })
  activeIncidents: number;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  contactInfoJson: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  operationalHoursJson: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  serviceAreasJson: string | null;

  // Getters and setters
  get contactInfo(): any {
    return this.contactInfoJson ? JSON.parse(this.contactInfoJson) : null;
  }

  set contactInfo(value: any) {
    this.contactInfoJson = value ? JSON.stringify(value) : null;
  }

  get operationalHours(): any {
    return this.operationalHoursJson ? JSON.parse(this.operationalHoursJson) : null;
  }

  set operationalHours(value: any) {
    this.operationalHoursJson = value ? JSON.stringify(value) : null;
  }

  get serviceAreas(): string[] {
    return this.serviceAreasJson ? JSON.parse(this.serviceAreasJson) : [];
  }

  set serviceAreas(value: string[]) {
    this.serviceAreasJson = value ? JSON.stringify(value) : null;
  }
  
  @TreeParent()
  @JoinColumn({ name: 'parentDepartmentId' })
  parentDepartment: Department;

  @Column({ type: 'uuid', nullable: true })
  parentDepartmentId: string;

  @TreeChildren()
  subDepartments: Department[];

  @OneToMany(() => DepartmentStaff, staff => staff.department)
  staff: DepartmentStaff[];

  @OneToMany(() => Station, station => station.department)
  stations: Station[];

  @OneToMany(() => IncidentRoutingRule, rule => rule.primaryDepartment)
  routingRules: IncidentRoutingRule[];

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;
}

@Entity('department_staff')
export class DepartmentStaff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.departmentStaff)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int', nullable: false })
  userId: number;

  @ManyToOne(() => Department, department => department.staff)
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @Column({ type: 'uuid', nullable: false })
  departmentId: string;

  @ManyToOne(() => Station, station => station.staff, { nullable: true })
  @JoinColumn({ name: 'stationId' })
  station: Station;

  @Column({ type: 'uuid', nullable: true })
  stationId: string;

  @Column({ type: 'varchar', length: 50 })
  role: 'field_agent' | 'supervisor' | 'manager' | 'director' | 'admin';

  @Column({ type: 'varchar', length: 100, nullable: true })
  specialization: string;

  @Column({ type: 'bit', default: true })
  isActive: boolean;

  @Column({ type: 'bit', default: false })
  isOnDuty: boolean;

  @Column({ type: 'int', default: 0 })
  currentAssignments: number;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  shiftScheduleJson: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  performanceMetricsJson: string | null;

  get shiftSchedule(): any {
    return this.shiftScheduleJson ? JSON.parse(this.shiftScheduleJson) : null;
  }

  set shiftSchedule(value: any) {
    this.shiftScheduleJson = value ? JSON.stringify(value) : null;
  }

  get performanceMetrics(): any {
    return this.performanceMetricsJson ? JSON.parse(this.performanceMetricsJson) : null;
  }

  set performanceMetrics(value: any) {
    this.performanceMetricsJson = value ? JSON.stringify(value) : null;
  }

  @OneToMany(() => IncidentAssignment, assignment => assignment.assignedStaff)
  assignments: IncidentAssignment[];

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;
}