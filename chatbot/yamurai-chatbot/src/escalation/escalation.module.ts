// backend/src/escalation/escalation.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SLAEscalationService } from './sla-escalation.service';
import { IncidentAssignment } from '../database/incident-assignment.entity';
import { EmergencyReport } from '../database/emergency-report.entity';
import { IssueReport } from '../database/issue-report.entity';
import { SLAConfig } from '../database/sla-config.entity';
import { EscalationLog } from '../database/escalation-log.entity';
import { Department } from '../database/department.entity';
import { DepartmentStaff } from '../database/department.entity';
import { DashboardNotification } from '../database/dashboard.entity';
import { NotificationGateway } from '../dashboard/notifications/notification.gateway';
import { MessagingService } from '../whatsapp/services/messaging/messaging.service';
import { HttpModule } from '@nestjs/axios';
import { Message } from '../database/message.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IncidentAssignment,
      EmergencyReport,
      IssueReport,
      SLAConfig,
      EscalationLog,
      Department,
      DepartmentStaff,
      DashboardNotification,
      Message // Add Message entity for MessagingService
    ]),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get('HTTP_TIMEOUT', 5000),
        maxRedirects: configService.get('HTTP_MAX_REDIRECTS', 5),
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  providers: [
    SLAEscalationService,
    NotificationGateway,
    MessagingService,
    ConfigService,
  ],
  exports: [SLAEscalationService, MessagingService]
})
export class EscalationModule {}
