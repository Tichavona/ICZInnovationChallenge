/* eslint-disable prettier/prettier */
// src/dashboard/modules/police-dashboard.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardModule } from './dashboard.module';
import { PoliceDashboardController } from '../controllers/police-dashboard.controller';
import { PoliceDashboardService } from '../services/police-dashboard.service';
import { EmergencyReport } from '../../database/emergency-report.entity';
import { IncidentAssignment } from '../../database/incident-assignment.entity';
import { Station } from '../../database/station.entity';
import { DepartmentStaff } from '../../database/department.entity'; 
import { Department } from '../../database/department.entity'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmergencyReport,
      IncidentAssignment,
      Station,
      DepartmentStaff, 
      Department,
    ]),
    DashboardModule, 
  ],
  controllers: [PoliceDashboardController],
  providers: [PoliceDashboardService],
  exports: [PoliceDashboardService],
})
export class PoliceDashboardModule {}