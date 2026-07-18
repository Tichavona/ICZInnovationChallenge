/* eslint-disable prettier/prettier */
// src/database/province.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Station } from './station.entity';
import { District } from './district.entity';
import { Region } from './region.entity';

@Entity('provinces')
export class Province {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  capital: string;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column('decimal', { precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'int', nullable: true })
  population: number;

  @Column({ type: 'float', nullable: true })
  area: number;

  // Change from boolean to bit for MSSQL
  @Column({ type: 'bit', default: 1 })
  isActive: boolean;

  @ManyToOne(() => Region, region => region.provinces)
  region: Region;

  @OneToMany(() => District, district => district.province)
  districts: District[];

  @OneToMany(() => Station, station => station.province)
  stations: Station[];

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;
}