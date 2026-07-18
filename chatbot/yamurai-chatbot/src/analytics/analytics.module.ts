import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { EmergencyReport } from '../database/emergency-report.entity';
import { IssueReport } from '../database/issue-report.entity';
import { IncidentAssignment } from '../database/incident-assignment.entity';
import { Department } from '../database/department.entity';
import { Station } from '../database/station.entity';
import { User } from '../database/user.entity';
import { AnalyticsDaily, LocationAnalytics, UserAnalytics, DepartmentAnalytics } from '../database/analytics.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmergencyReport,
      IssueReport,
      IncidentAssignment,
      Department,
      Station,
      User,
      AnalyticsDaily,
      LocationAnalytics,
      UserAnalytics,
      DepartmentAnalytics
    ])
  ],
  providers: [AnalyticsService],
  exports: [AnalyticsService]
})
export class AnalyticsModule {}
 
