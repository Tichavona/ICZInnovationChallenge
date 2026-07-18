/* eslint-disable prettier/prettier */
// whatsapp.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WhatsappController } from './whatsapp/whatsapp.controller';
import { WhatsappService } from './whatsapp/whatsapp.service';
import { AuthService } from '../auth/auth.service';
import { IssueReportingService } from './services/reporting/issue-reporting.service';
import { EmergencyReportingService } from './services/reporting/emergency-reporting.service';
import { NlpService } from './services/nlp.service';
import { SessionManagerService } from './services/session-manager.service';
import { StorageService } from './services/storage.service';
import { SessionCleanupService } from './services/cleanup.service';
import { MessagingService } from './services/messaging/messaging.service';
import { User } from '../database/user.entity';
import { ActiveSession, AuthSession, LoginSession, UserSession, RegistrationSession } from '../database/session.entity';
import { EmergencyReport } from '../database/emergency-report.entity';
import { IssueReport } from '../database/issue-report.entity';
import { AnalyticsDaily, LocationAnalytics, UserAnalytics, DepartmentAnalytics } from '../database/analytics.entity';
import { KycData } from '../database/kyc.entity';
import { DepartmentRoutingService } from './services/department-routing.service';
import { NotificationService } from './services/notification.service';
import { EditFeedbackService } from './services/edit/edit-feedback.service';
import { ReportConsolidationService } from './services/report-consolidation.service';
import { IncidentManagementService } from './services/incident-management.service';
import { BloodDetectionService } from './services/blood-detection.service';
import { FireHazardDetectionService } from './services/fire-hazard-detection.service';
import { Message } from '../database/message.entity'
import { FlaskRagService } from './services/flask-rag.service';
import { 
  IncidentGroup, 
  IncidentUpdate, 
  StatusVerification,
  DashboardUser,
  DashboardNotification,
  ReportConsolidation 
} from '../database/dashboard.entity';

import { MessageHandlerService } from './services/messaging/message-handler.service';
import { MenuCommandService } from './services/menu/menu-command.service';
import { RAGSessionService } from './services/rag/rag-session.service';
import { RAGQueryService } from './services/rag/rag-query.service';
import { RAGTimeoutService } from './services/rag/rag-timeout.service';
import { DeduplicationService } from './services/utils/deduplication.service';
import { MessageSplitterService } from './services/utils/message-splitter.service';
import { EcofarmerModule } from './services/ecoFarmer/ecofarmer.module';


@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([
      User, 
      ActiveSession,
      AuthSession,
      LoginSession,
      UserSession,
      RegistrationSession,
      EmergencyReport,
      IssueReport,
      AnalyticsDaily,
      LocationAnalytics,
      UserAnalytics,
      DepartmentAnalytics,
      KycData,
      DashboardNotification,
      ReportConsolidation,
      IncidentGroup,
      IncidentUpdate,
      StatusVerification,
      DashboardUser,
      Message,
    ]),
    EcofarmerModule,
  ],
  controllers: [WhatsappController],
  providers: [
    WhatsappService,
    AuthService,
    IssueReportingService,
    EmergencyReportingService,
    NlpService,
    SessionManagerService,
    StorageService,
    SessionCleanupService,
    MessagingService,
    DepartmentRoutingService,
    NotificationService,
    EditFeedbackService,
    ReportConsolidationService,
    IncidentManagementService,
    BloodDetectionService,
    FireHazardDetectionService,
    FlaskRagService,
    MessageHandlerService,
    MenuCommandService,
    RAGSessionService,
    RAGQueryService,
    RAGTimeoutService,
    DeduplicationService,
    MessageSplitterService
  ],
  exports: [
    WhatsappService, 
    NlpService,
    IssueReportingService,
    EmergencyReportingService,
    SessionManagerService,
    StorageService,
    MessagingService,
    DepartmentRoutingService,
    NotificationService,
    EditFeedbackService,
    ReportConsolidationService,
    IncidentManagementService,
    BloodDetectionService,
    FireHazardDetectionService,
    FlaskRagService,
    MessageHandlerService,
    MenuCommandService,
    RAGSessionService,
    RAGQueryService,
    RAGTimeoutService,
    DeduplicationService,
    MessageSplitterService,
    EcofarmerModule,
  ],
})
export class WhatsappModule {}