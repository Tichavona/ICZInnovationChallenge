/* eslint-disable prettier/prettier */
// src/dashboard/modules/ambulance-dashboard.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardModule } from './dashboard.module';
import { AmbulanceDashboardController } from '../controllers/ambulance-dashboard.controller';
import { AmbulanceDashboardService } from '../services/ambulance-dashboard.service';
import { EmergencyReport } from '../../database/emergency-report.entity';
import { IncidentAssignment } from '../../database/incident-assignment.entity';
import { Station } from '../../database/station.entity';
import { IssueReport } from '../../database/issue-report.entity';
import { SLAConfig } from '../../database/sla-config.entity';
import { DepartmentStaff } from '../../database/department.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmergencyReport,
      IncidentAssignment,
      Station,
      SLAConfig,
      IssueReport,
      DepartmentStaff,
    ]),
    DashboardModule,
  ],
  controllers: [AmbulanceDashboardController],
  providers: [AmbulanceDashboardService],
  exports: [AmbulanceDashboardService],
})
export class AmbulanceDashboardModule {}