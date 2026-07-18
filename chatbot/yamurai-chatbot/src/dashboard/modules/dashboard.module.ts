/* eslint-disable prettier/prettier */
// src/dashboard/modules/dashboard.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnifiedDashboardController } from '../controllers/base-dashboard.controller';
import { UnifiedDashboardService } from '../services/base-dashboard.service';
import { EmergencyReport } from '../../database/emergency-report.entity';
import { IssueReport } from '../../database/issue-report.entity';
import { Station } from '../../database/station.entity';
import { IncidentAssignment } from '../../database/incident-assignment.entity';
import { SLAConfig } from '../../database/sla-config.entity';
import { DepartmentStaff, Department } from '../../database/department.entity';
import { GeoDistanceUtil } from '../../shared/utils/geo-distance.util';
import { SLACalculatorUtil } from '../../shared/utils/sla-calculator.util';
import { DashboardUser, DashboardNotification } from '../../database/dashboard.entity';
import { NotificationGateway } from '../notifications/notification.gateway';
import { UtilsModule } from '../../shared/utils/utils.module';
import { EscalationModule } from '../../escalation/escalation.module';
import { TrackingModule } from '../../tracking/tracking.module';
import { AnalyticsModule } from '../../analytics/analytics.module';
import { RoutingModule } from '../../routing/routing.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmergencyReport,
      IssueReport,
      Station,
      IncidentAssignment,
      SLAConfig,
      DepartmentStaff,
      Department,
      DashboardUser,
      DashboardNotification
    ]),
    UtilsModule,
    forwardRef(() => EscalationModule),
    forwardRef(() => TrackingModule),
    forwardRef(() => AnalyticsModule),
    forwardRef(() => RoutingModule)
  ],
  controllers: [UnifiedDashboardController],
  providers: [
    UnifiedDashboardService,
    NotificationGateway,
    GeoDistanceUtil,
    SLACalculatorUtil,
  ],
  exports: [
    UnifiedDashboardService, 
    NotificationGateway,
    GeoDistanceUtil, 
    SLACalculatorUtil,
    TypeOrmModule,  // Export TypeOrmModule to make repositories available
  ],
})
export class DashboardModule {}