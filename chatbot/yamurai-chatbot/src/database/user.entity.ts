/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
// src/database/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate, OneToOne, OneToMany } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { KycData } from './kyc.entity';
import { IssueReport } from './issue-report.entity';
import { EmergencyReport } from './emergency-report.entity';
import { FarmerProfile } from './farmer.entity';
import { DepartmentStaff } from './department.entity';
import { DashboardUser } from './dashboard.entity'; // Add this import

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  OPERATOR = 'operator',
  DISPATCHER = 'dispatcher'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  firstName: string;

  @Column('varchar')
  lastName: string;

  @Column({ unique: true, type: 'varchar' })
  email: string;

  @Column({ unique: true, type: 'varchar' })
  phoneNumber: string;

  @Column('varchar')
  password: string;

  @Column({ type: 'varchar', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'varchar', enum: UserStatus, default: UserStatus.PENDING_VERIFICATION })
  status: UserStatus;

  @Column({ type: 'bit', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true })
  passwordResetToken: string | null;

  @Column({ type: 'datetime', nullable: true })
  passwordResetExpires: Date | null;

  @Column({ type: 'varchar', nullable: true })
  emailVerificationToken: string | null;

  @Column({ type: 'bit', default: false })
  emailVerified: boolean;

  @Column({ type: 'bit', default: false })
  phoneVerified: boolean;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastActivityAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date;

  @Column({ type: 'varchar', nullable: true })
  timezone: string;

  @Column({ type: 'varchar', nullable: true })
  language: string;

  // Computed field for full name
  get name(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get phone(): string {
    return this.phoneNumber;
  }

  // Relationships
  @OneToOne(() => KycData, kyc => kyc.user, { cascade: true })
  kycData: KycData;

  @OneToMany(() => IssueReport, issueReport => issueReport.user, { nullable: true })
  issueReports: IssueReport[];

  @OneToMany(() => EmergencyReport, emergencyReport => emergencyReport.user, { nullable: true })
  emergencyReports: EmergencyReport[];

  @OneToOne(() => FarmerProfile, farmerProfile => farmerProfile.user, { nullable: true })
  farmerProfile: FarmerProfile;

  @OneToMany(() => DepartmentStaff, departmentStaff => departmentStaff.user)
  departmentStaff: DepartmentStaff[];

  // Add this relationship for dashboard profiles
  @OneToMany(() => DashboardUser, dashboardUser => dashboardUser.user)
  dashboardProfiles: DashboardUser[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && this.password.length < 60) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async comparePassword(attempt: string): Promise<boolean> {
    return bcrypt.compare(attempt, this.password);
  }

  hasRole(role: UserRole): boolean {
    return this.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    return roles.includes(this.role);
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  canAccessAdmin(): boolean {
    return [UserRole.ADMIN, UserRole.OPERATOR, UserRole.DISPATCHER].includes(this.role);
  }
}