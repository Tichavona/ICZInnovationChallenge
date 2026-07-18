/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
// src/database/session.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum SessionType {
  AUTH = 'auth',
  LOGIN = 'login',
  USER = 'user',
  REGISTRATION = 'registration',
  EMERGENCY = 'emergency',
  ISSUE_REPORTING = 'issue_reporting',
  EDIT_FEEDBACK = 'edit_feedback',
  VERIFICATION = 'verification',
  GOVERNMENT = 'government',
  FARMER = 'farmer',
  AGROMATE = 'AGROMATE'
}

export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  LOGGED_OUT = 'logged_out',
}

// Base session interface with common fields
export interface BaseSession {
  id: number;
  phoneNumber: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  status: string;
  lastActive?: Date;
  endedBy?: string;
  cancellationReason?: string;
}

// Auth Session Entity
@Entity('auth_sessions')
@Index(['sessionID'], { unique: true })
@Index(['phoneNumber', 'expiresAt'])
export class AuthSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  sessionID: string;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ type: 'bit', default: false })
  verified: boolean;

  @Column({ type: 'datetime' })
  lastActivity: Date;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'bit', default: false })
  cancelled: boolean;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancellationReason: string;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;
}

// Login Session Entity
@Entity('login_sessions')
@Index(['sessionToken'], { unique: true })
@Index(['phoneNumber', 'status', 'expiresAt'])
export class LoginSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  sessionToken: string;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime' })
  lastActive: Date;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'expired' | 'logged_out';

  @Column({ type: 'varchar', length: 50, nullable: true })
  endedBy: string;

  @Column({ type: 'datetime', nullable: true })
  endedAt: Date;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;
}

// User Session Entity
@Entity('user_sessions')
@Index(['phoneNumber', 'status', 'expiresAt'])
export class UserSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  organisation: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  sessionData: string; // JSON string

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'expired' | 'cancelled';

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancellationReason: string;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;

  // Helper methods
  get parsedSessionData(): any {
    if (!this.sessionData) return null;
    try {
      return JSON.parse(this.sessionData);
    } catch {
      return null;
    }
  }

  set parsedSessionData(data: any) {
    this.sessionData = JSON.stringify(data);
  }
}

// Registration Session Entity
@Entity('registration_sessions')
@Index(['phoneNumber', 'status', 'expiresAt'])
export class RegistrationSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ type: 'int', default: 0 })
  step: number;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  data: string; // JSON string

  @Column({ type: 'datetime' })
  lastActive: Date;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'expired' | 'cancelled';

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancellationReason: string;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;

  // Helper methods
  get parsedData(): any {
    if (!this.data) return {};
    try {
      return JSON.parse(this.data);
    } catch {
      return {};
    }
  }

  set parsedData(value: any) {
    this.data = JSON.stringify(value);
  }
}

// Active Session Entity (for tracking ongoing sessions)
@Entity('active_sessions')
@Index(['phoneNumber', 'sessionType', 'status', 'expiresAt'])
export class ActiveSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 50 })
  sessionType: SessionType;

  @Column({ type: 'int', default: 0 })
  currentStep: number;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  sessionData: string | null; // JSON string

  @Column({ type: 'varchar', length: 20, default: SessionStatus.ACTIVE })
  status: SessionStatus;

  @Column({ type: 'datetime' })
  lastActive: Date;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  endedBy: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancellationReason: string | null;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;

  // Helper methods
  get parsedSessionData(): any {
    if (!this.sessionData) return {};
    try {
      return JSON.parse(this.sessionData);
    } catch {
      return {};
    }
  }

  set parsedSessionData(data: any) {
    this.sessionData = data ? JSON.stringify(data) : null;
  }
}