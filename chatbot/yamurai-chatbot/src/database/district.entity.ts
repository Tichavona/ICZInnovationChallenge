/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
// src/database/district.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Province } from './province.entity';
import { Station } from './station.entity';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @ManyToOne(() => Province, province => province.districts)
  province: Province;

  @Column({ type: 'varchar', length: 100, nullable: true })
  capital: string;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column('decimal', { precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'int', nullable: true })
  population: number;

  @Column({ type: 'float', nullable: true })
  area: number; // in square kilometers

  // Change from 'json' to 'nvarchar' for MSSQL
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  coordinatesJson: string | null;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: 'active' | 'inactive' | 'maintenance';

  @OneToMany(() => Station, station => station.district)
  stations: Station[];

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date;

  // Getter and setter for coordinates
  get coordinates(): any {
    if (!this.coordinatesJson) return null;
    try {
      return JSON.parse(this.coordinatesJson);
    } catch {
      return null;
    }
  }

  set coordinates(value: any) {
    this.coordinatesJson = value ? JSON.stringify(value) : null;
  }
}