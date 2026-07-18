/* eslint-disable prettier/prettier */
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('kyc_data')
export class KycData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: 'varchar' })
  idNumber: string;

  @Column('varchar')
  address: string;

  @Column('varchar')
  porLink: string; 

  @Column('varchar')
  idLink: string; 

  @OneToOne(() => User)
  @JoinColumn()
  user: User;
}