/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
// src/database/station.entity.ts (add district relationship)
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Tree, TreeParent, TreeChildren, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Department } from './department.entity';
import { IncidentAssignment } from './incident-assignment.entity';
import { DepartmentStaff } from './department.entity';
import { Province } from './province.entity';
import { Region } from './region.entity';
import { District } from './district.entity'; // Add this import

export enum StationType {
  HEADQUARTERS = 'headquarters',
  REGIONAL = 'regional',
  DISTRICT = 'district',
  LOCAL = 'local',
  SATELLITE = 'satellite'
}

@Entity('stations')
@Tree('materialized-path')
export class Station {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  stationType: StationType;

  @ManyToOne(() => Department, department => department.stations)
  department: Department;

  @Column({ type: 'varchar', length: 200 })
  address: string;

  @Column('decimal', { precision: 10, scale: 8 })
  latitude: number;

  @Column('decimal', { precision: 11, scale: 8 })
  longitude: number;

  @Column('decimal', { precision: 10, scale: 2, default: 10 })
  coverageRadiusKm: number;

  // Change from json to nvarchar for MSSQL - allow null
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  contactInfoJson: string | null;

  // Change from json to nvarchar for MSSQL - allow null
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  operationalCapacityJson: string | null;

  @Column({ type: 'simple-array', nullable: true })
  specializations: string[];

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: 'active' | 'inactive' | 'maintenance' | 'overloaded';

  @TreeParent()
  parentStation: Station;

  @TreeChildren()
  subStations: Station[];

  // Change from json to nvarchar for MSSQL - allow null
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  jurisdictionJson: string | null;

  @Column({ type: 'int', default: 0 })
  priority: number;

  // Add district relationship
  @ManyToOne(() => District, { nullable: true })
  district: District;

  @ManyToOne(() => Province, { nullable: true })
  province: Province;

  @ManyToOne(() => Region, { nullable: true })
  region: Region;

  @OneToMany(() => IncidentAssignment, assignment => assignment.assignedStation)
  assignments: IncidentAssignment[];

  @OneToMany(() => DepartmentStaff, staff => staff.station)
  staff: DepartmentStaff[];

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;

  // Getters and setters with proper null handling
  get contactInfo(): any {
    if (!this.contactInfoJson) return null;
    try {
      return JSON.parse(this.contactInfoJson);
    } catch {
      return null;
    }
  }

  set contactInfo(value: any) {
    this.contactInfoJson = value ? JSON.stringify(value) : null;
  }

  get operationalCapacity(): any {
    if (!this.operationalCapacityJson) {
      return {
        maxConcurrentIncidents: 10,
        currentIncidents: 0,
        availableStaff: 0,
        totalStaff: 0,
        availableVehicles: 0,
        totalVehicles: 0
      };
    }
    try {
      return JSON.parse(this.operationalCapacityJson);
    } catch {
      return {
        maxConcurrentIncidents: 10,
        currentIncidents: 0,
        availableStaff: 0,
        totalStaff: 0,
        availableVehicles: 0,
        totalVehicles: 0
      };
    }
  }

  set operationalCapacity(value: any) {
    this.operationalCapacityJson = value ? JSON.stringify(value) : null;
  }

  get jurisdiction(): any {
    if (!this.jurisdictionJson) {
      return {
        districts: [],
        provinces: [],
        regions: []
      };
    }
    try {
      return JSON.parse(this.jurisdictionJson);
    } catch {
      return {
        districts: [],
        provinces: [],
        regions: []
      };
    }
  }

  set jurisdiction(value: any) {
    this.jurisdictionJson = value ? JSON.stringify(value) : null;
  }
}