/* eslint-disable prettier/prettier */
// src/dashboard/modules/city-council-dashboard.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardModule } from './dashboard.module';
import { CityCouncilDashboardController } from '../controllers/city-council-dashboard.controller';
import { CityCouncilDashboardService } from '../services/city-council-dashboard.service';
import { IssueReport } from '../../database/issue-report.entity';
import { IncidentAssignment } from '../../database/incident-assignment.entity';
import { Station } from '../../database/station.entity';
import { SLAConfig } from '../../database/sla-config.entity';
import { DepartmentStaff } from '../../database/department.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IssueReport,
      IncidentAssignment,
      Station,
      SLAConfig,
      DepartmentStaff,
    ]),
    DashboardModule,
  ],
  controllers: [CityCouncilDashboardController],
  providers: [CityCouncilDashboardService],
  exports: [CityCouncilDashboardService],
})
export class CityCouncilDashboardModule {}