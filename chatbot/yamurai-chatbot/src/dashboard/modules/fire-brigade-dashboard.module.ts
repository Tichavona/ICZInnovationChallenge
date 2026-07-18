/* eslint-disable prettier/prettier */
// src/dashboard/modules/fire-brigade-dashboard.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardModule } from './dashboard.module';
import { FireBrigadeDashboardController } from '../controllers/fire-brigade-dashboard.controller';
import { FireBrigadeDashboardService } from '../services/fire-brigade-dashboard.service';
import { EmergencyReport } from '../../database/emergency-report.entity';
import { IncidentAssignment } from '../../database/incident-assignment.entity';
import { Station } from '../../database/station.entity';
import { DepartmentStaff } from '../../database/department.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmergencyReport,
      IncidentAssignment,
      Station,
      DepartmentStaff
    ]),
    DashboardModule,
  ],
  controllers: [FireBrigadeDashboardController],
  providers: [FireBrigadeDashboardService],
  exports: [FireBrigadeDashboardService],
})
export class FireBrigadeDashboardModule {}