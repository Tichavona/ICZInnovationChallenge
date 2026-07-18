/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('analytics_daily')
export class AnalyticsDaily {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'int', default: 0 })
  totalReports: number;

  @Column({ type: 'int', default: 0 })
  emergencyReports: number;

  @Column({ type: 'int', default: 0 })
  issueReports: number;

  @Column({ type: 'int', default: 0 })
  fireReports: number;

  @Column({ type: 'int', default: 0 })
  ambulanceReports: number;

  @Column({ type: 'int', default: 0 })
  robberyReports: number;

  @Column({ type: 'int', default: 0 })
  accidentReports: number;

  @Column({ type: 'int', default: 0 })
  medicalReports: number;

  @Column({ type: 'int', default: 0 })
  crimeReports: number;

  @Column({ type: 'int', default: 0 })
  naturalDisasterReports: number;

  @Column({ type: 'int', default: 0 })
  otherReports: number;

  @Column({ type: 'int', default: 0 })
  resolvedReports: number;

  @Column({ type: 'int', default: 0 })
  activeUsers: number;

  @Column({ type: 'int', default: 0 })
  newUsers: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageResolutionTime: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageRating: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('location_analytics')
export class LocationAnalytics {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 8 })
  latitude: number;

  @Column('decimal', { precision: 11, scale: 8 })
  longitude: number;

  @Column('varchar')
  areaName: string;

  @Column({ type: 'int', default: 0 })
  reportCount: number;

  @Column({ type: 'int', default: 0 })
  emergencyCount: number;

  @Column({ type: 'int', default: 0 })
  issueCount: number;

  @Column({ type: 'int', default: 0 })
  fireCount: number;

  @Column({ type: 'int', default: 0 })
  medicalCount: number;

  @Column({ type: 'int', default: 0 })
  crimeCount: number;

  @Column({ type: 'int', default: 0 })
  accidentCount: number;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('user_analytics')
export class UserAnalytics {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'int', default: 0 })
  totalUsers: number;

  @Column({ type: 'int', default: 0 })
  activeUsers: number;

  @Column({ type: 'int', default: 0 })
  newRegistrations: number;

  @Column({ type: 'int', default: 0 })
  reportsPerUser: number;

  @Column({ type: 'int', default: 0 })
  emergencyReportsPerUser: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('department_analytics')
export class DepartmentAnalytics {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  department: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'int', default: 0 })
  assignedReports: number;

  @Column({ type: 'int', default: 0 })
  resolvedReports: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageResolutionTime: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageRating: number;

  @CreateDateColumn()
  createdAt: Date;
}