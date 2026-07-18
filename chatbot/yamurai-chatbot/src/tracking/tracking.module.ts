// backend/src/tracking/tracking.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusTrackingService } from './status-tracking.service';
import { EmergencyReport } from '../database/emergency-report.entity';
import { IssueReport } from '../database/issue-report.entity';
import { IncidentAssignment } from '../database/incident-assignment.entity';
import { IncidentGroup, IncidentUpdate } from '../database/dashboard.entity';
import { NotificationGateway } from '../dashboard/notifications/notification.gateway';
import { MessagingService } from '../whatsapp/services/messaging/messaging.service';
import { HttpModule } from '@nestjs/axios';
import { Message } from '../database/message.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmergencyReport,
      IssueReport,
      IncidentAssignment,
      IncidentGroup,
      IncidentUpdate,
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
    StatusTrackingService,
    NotificationGateway,
    MessagingService,
    ConfigService,
  ],
  exports: [StatusTrackingService, MessagingService]
})
export class TrackingModule {}
