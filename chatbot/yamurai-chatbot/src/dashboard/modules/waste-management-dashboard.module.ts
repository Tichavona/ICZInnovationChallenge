/* eslint-disable prettier/prettier */
// src/dashboard/modules/waste-management-dashboard.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardModule } from './dashboard.module';
import { WasteManagementDashboardController } from '../controllers/waste-management-dashboard.controller';
import { WasteManagementDashboardService } from '../services/waste-management-dashboard.service';
import { IssueReport } from '../../database/issue-report.entity';
import { IncidentAssignment } from '../../database/incident-assignment.entity';
import { Station } from '../../database/station.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IssueReport,
      IncidentAssignment,
      Station,
    ]),
    DashboardModule,
  ],
  controllers: [WasteManagementDashboardController],
  providers: [WasteManagementDashboardService],
  exports: [WasteManagementDashboardService],
})
export class WasteManagementDashboardModule {}