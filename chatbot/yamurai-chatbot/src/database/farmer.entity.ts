/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum FarmType {
  CROPS = 'crops',
  LIVESTOCK = 'livestock',
  MIXED = 'mixed',
  POULTRY = 'poultry',
  DAIRY = 'dairy',
  HORTICULTURE = 'horticulture',
}

export enum CropType {
  MAIZE = 'maize',
  WHEAT = 'wheat',
  SOYBEANS = 'soybeans',
  COTTON = 'cotton',
  TOBACCO = 'tobacco',
  VEGETABLES = 'vegetables',
  FRUITS = 'fruits',
  OTHER = 'other',
}

export enum LivestockType {
  CATTLE = 'cattle',
  GOATS = 'goats',
  SHEEP = 'sheep',
  PIGS = 'pigs',
  CHICKENS = 'chickens',
  OTHER = 'other',
}

@Entity('farmer_profiles')
export class FarmerProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, user => user.farmerProfile, { eager: true })
  @JoinColumn()
  user: User;

  @Column({ type: 'nvarchar', length: 255 })
  farmName: string;

  // Use enum as string to ensure SQL Server stores text representation
  @Column({ type: 'varchar', enum: FarmType })
  farmType: FarmType;

  @Column({ type: 'nvarchar', length: 500 })
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  farmSize: number;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  farmSizeUnit: string; // hectares, acres

  // SQL Server does not support simple-array → use string with comma separation
  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  crops: string; // Store as comma-separated CropType values

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  livestock: string; // Store as comma-separated LivestockType values

  @Column({ type: 'int', nullable: true })
  yearsFarming: number;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;
    latitude: any;
    longitude: any;
}

@Entity('crop_disease_reports')
export class CropDiseaseReport {
  userId(userId: any): void {
      throw new Error('Method not implemented.');
  }
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, { eager: true })
  @JoinColumn()
  user: User;

  @Column({ type: 'nvarchar', length: 100 })
  cropType: string;

  @Column({ type: 'nvarchar', length: 255 })
  diseaseName: string;

  @Column({ type: 'nvarchar', length: 'max' })
  symptoms: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  affectedArea: number;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  severity: string; // low, medium, high, critical

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  imageUrl: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  treatmentApplied: string;

  @Column({ type: 'nvarchar', length: 50, default: 'reported' })
  status: string; // reported, diagnosed, treated, resolved

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  expertAdvice: string;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;
}

@Entity('farm_disaster_reports')
export class FarmDisasterReport {
  severity: string;
  userId(userId: any): void {
      throw new Error('Method not implemented.');
  }
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, { eager: true })
  @JoinColumn()
  user: User;

  @Column({ type: 'nvarchar', length: 100 })
  disasterType: string; // drought, flood, storm, fire, pest_infestation, hail

  @Column({ type: 'nvarchar', length: 'max' })
  description: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimatedLoss: number;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  currency: string;

  @Column({ type: 'nvarchar', length: 500 })
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'bit', default: false })
  needsAssistance: boolean;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  assistanceType: string; // financial, inputs, technical, emergency

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  imageUrl: string;

  @Column({ type: 'nvarchar', length: 50, default: 'reported' })
  status: string; // reported, assessed, assistance_provided, resolved

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;
}

@Entity('agricultural_advisories')
export class AgriculturalAdvisory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 255 })
  title: string;

  @Column({ type: 'nvarchar', length: 'max' })
  content: string;

  @Column({ type: 'nvarchar', length: 100 })
  targetCrop: string;

  @Column({ type: 'nvarchar', length: 100 })
  season: string; // planting, growing, harvesting

  @Column({ type: 'nvarchar', length: 100 })
  region: string;

  @Column({ type: 'nvarchar', length: 50 })
  priority: string; // low, medium, high

  @Column({ type: 'datetime2', nullable: true })
  validFrom: Date;

  @Column({ type: 'datetime2', nullable: true })
  validTo: Date;

  @Column({ type: 'bit', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;
}
