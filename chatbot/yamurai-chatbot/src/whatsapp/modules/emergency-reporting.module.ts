/* eslint-disable prettier/prettier */
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmergencyReportingService } from '../services/reporting/emergency-reporting.service';
import { EmergencyReport } from '../../database/emergency-report.entity';
import { User } from '../../database/user.entity';
import { WhatsappModule } from '../whatsapp.module'; 
import { AnalyticsDaily, LocationAnalytics, UserAnalytics, DepartmentAnalytics } from '../../database/analytics.entity';
import { SessionModule } from './session.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmergencyReport, 
      User,
      AnalyticsDaily,
      LocationAnalytics,
      UserAnalytics,
      DepartmentAnalytics
    ]),
    forwardRef(() => WhatsappModule),
    SessionModule
  ],
  providers: [EmergencyReportingService],
  exports: [EmergencyReportingService],
})
export class EmergencyReportingModule {}
