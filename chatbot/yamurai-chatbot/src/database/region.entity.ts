/* eslint-disable prettier/prettier */
// src/database/region.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Station } from './station.entity';
import { Province } from './province.entity';

@Entity('regions')
export class Region {
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

  @OneToMany(() => Province, province => province.region)
  provinces: Province[];

  @OneToMany(() => Station, station => station.region)
  stations: Station[];

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;
}