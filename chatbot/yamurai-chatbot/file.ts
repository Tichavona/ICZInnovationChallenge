import { constants } from "buffer"
import { AssignmentDto } from "src/dashboard"

/* eslint-disable prettier/prettier */
// Given the folder structure below backend Structure
// backend/
// ├── 📁 src/
// │	├── 📁 analytics/
// │	│   ├── analytics.module.ts
// │	│   └── analytics.service.ts
// │	│
// │	├── 📁 auth/
// │	│   ├── auth.service.ts
// │	│   ├── current-user.decorator.ts
// │	│   └── jwt-auth.guard.ts
// │	│
// │	├── 📁 components/
// │	│	│
// │	│	└── 📁 dashboards/
// │	│	    └── agriculturalAPI.ts
// │	│
// │	├── 📁 dashboard/
// │	│	│
// │	│	├── 📁 controllers/
// │	│	│   ├── agricultural-dashboard.controller.ts
// │	│	│   ├── ambulance-dashboard.controller.ts
// │	│	│   ├── base-dashboard.controller.ts
// │	│	│   ├── city-council-dashboard.controller.ts
// │	│	│   ├── fire-brigade-dashboard.controller.ts
// │	│	│   ├── police.controller.ts
// │	│	│   └── waste-management-dashboard.controller.ts
// │	│	│
// │	│	├── 📁 dto/
// │	│	│   ├── assignment.dto.ts
// │	│	│   ├── bulk-action.dto.ts
// │	│	│   ├── dashboard-filters.dto.ts
// │	│	│   ├── incident-response.dto.ts
// │	│	│   ├── index.ts
// │	│	│   └── sla-violation.dto.ts
// │	│	│
// │	│	├── 📁 interfaces/
// │	│	│   ├── agricultural.types.ts
// │	│	│   ├── department-station.interface.ts
// │	│	│   ├── escalation-policy.interface.ts
// │	│	│   └── sla-config.interface.ts
// │	│	│
// │	│	├── 📁 modules/
// │	│	│   ├── agricultural-dashboard.module.ts
// │	│	│   ├── ambulance-dashboard.module.ts
// │	│	│   ├── city-council-dashboard.module.ts
// │	│	│   ├── dashboard.module.ts
// │	│	│   ├── fire-brigade-dashboard.module.ts
// │	│	│   ├── police-dashboard.module.ts
// │	│	│   └── waste-management-dashboard.module.ts
// │	│	│
// │	│	├── 📁 notifications/
// │	│	│   └── notification.service.ts
// │	│	│
// │	│	├── 📁 rbac/
// │	│	│   ├── dashboard.guard.ts
// │	│	|   ├── permissions.decorator.ts
// │	│	|   ├── roles.decorator.ts
// │	│	|   ├── roles.enum.ts
// │	│	│   └── roles.guard.ts
// │	│	│
// │	│	├── 📁 services/
// │	│	│   ├── agricultural-dashboard.service.ts
// │	│	│   ├── ambulance-dashboard.service.ts
// │	│	│   ├── base-dashboard.service.ts
// │	│	│   ├── city-council-dashboard.service.ts
// │	│	│   ├── fire-brigade-dashboard.service.ts
// │	│	│   ├── police-dashboard.service.ts
// │	│	│   └── waste-management-dashboard.service.ts
// │	│	│
// │	│	└── index.ts
// │	│
// │	├── 📁 database/
// │	│   ├── analytics.entity.ts
// │	│   ├── dashboard.entity.ts
// │	│   ├── database.module.ts
// │	│   ├── department.entity.ts
// │	│   ├── district.entity.ts
// │	│   ├── emergency-report.entity.ts
// │	│   ├── escalation-log.entity.ts
// │	│   ├── farmer.entity.ts
// │	│   ├── incident-assignment.entity.ts
// │	│   ├── incident-routing-rule.entity.ts
// │	│   ├── incident-status.entity.ts
// │	│   ├── index.ts
// │	│   ├── issue-report.entity.ts
// │	│   ├── kyc.entity.ts
// │	│   ├── message.entity.ts
// │	│   ├── province.entity.ts
// │	│   ├── region.entity.ts
// │	│   ├── session.entity.ts
// │	│   ├── sla-config.entity.ts
// │	│   ├── station.entity.ts
// │	│   └── user.eneity.ts
// |   │
// │	├── 📁 department/
// │	│	├── 📁 controllers/
// │   │	│   └── police-department.controller.ts
// │   │	│
// │	│	├── 📁 guards/
// │   │	│   └── department.guard.ts
// │   │	│
// │	│	├── 📁 routing/
// │   │	│   └── routing.service.ts
// │   │	│
// │	│	└── 📁 services/
// │   │	    ├── department-analytics.service.ts
// │   │	    ├── fire-brigade-dashboard.service.ts
// │   │	    ├── police-dashboard.service.ts
// │   │	    └── waste-management-dashboard.service.ts
// |   │
// │	├── 📁 escalation/
// │   │	 ├── escalation.module.ts
// │   │	 └── escalation.service.ts
// |   │
// │	├── 📁 routing/
// │   │	 ├── routing.module.ts
// │   │	 └── routing.service.ts
// |   │	
// │	├── 📁 shared/
// │   │	│
// │	│	├── 📁 constants/
// │   │	│   └── department.constants.ts
// │   │	│
// │	│	└── 📁 utils/
// │   │	    ├── geo-distance.util.ts
// │   │	    ├── index.ts
// │   │	    ├── sla-calculator.util.ts
// │   │	    └── utils.module.ts
// |   │	
// │	├── 📁 tracking/
// │   │	 ├── status-tracking.service.ts
// │   │	 └── tracking.module.ts
// |   │	
// │	├── 📁 whatsapp/
// |   │	│	
// │	│	├── 📁 modules/
// │	│	│   ├── emergency-reporting.module.ts
// │	│	│   ├── issue-reporting.module.ts
// │	│	│   ├── session.module.ts
// │	│	│   └── storage.module.ts
// |   │	│	
// │	│	├── 📁 services/
// |   │	│	├── 📁 edit/
// |   │	│	│   ├── edit-feedback.service.ts
// |   │	│	│   ├── edit-media.service.ts
// |   │	│	│   └── edit-session.service.ts
// |   │	│	│
// |   │	│	├── 📁 interfaces/
// |   │	│	│   └── webhook.interface.ts
// |   │	│	│
// |   │	│	├── 📁 menu/
// |   │	│	│   └── menu-command.service.ts
// |   │	│	│
// |   │	│	├── 📁 messaging/
// |   │	│	│   ├── message-handler.service.ts
// |   │	│	│   └── messaging.service.ts
// |   │	│	│
// |   │	│	├── 📁 rag/
// |   │	│	│   ├── rag-query.service.ts
// |   │	│	│   ├── rag-session.service.ts
// |   │	│	│   └── rag-timeout.service.ts
// |   │	│	│
// |   │	│	├── 📁 registration/
// |   │	│	│   └── registration.service.ts
// |   │	│	│
// |   │	│	├── 📁 reporting/
// |   │	│	│   ├── emergency-reporting.service.ts
// |   │	│	│   └── issue-reporting.service.ts
// |   │	│	│
// |   │	│	├── 📁 utils/
// |   │	│	│   ├── deduplication.service.ts
// |   │	│	│   ├── message-splitter.service.ts
// |   │	│	│   └── validation.service.ts
// |   │	│	│
// │	│	│   ├── blood-detection.service.ts
// │	│	│   ├── cleanup.service.ts
// │	│	│   ├── department-routing.service.ts
// │	│	│   ├── escalation.service.ts
// │	│	│   ├── fire-hazard-detection.service.ts
// │	│	│   ├── flask-rag.service.ts
// │	│	│   ├── incident-management.service.ts
// │	│	│   ├── nlp.service.ts
// │	│	│   ├── notification.service.ts
// │	│	│   ├── report-consolidation.service.ts
// │	│	│   ├── session-manager.service.ts
// │	│	│   └── storage.service.ts
// |   │	│	
// │	│	├── 📁 whatsapp/
// │	│	│   ├── whatsapp.controller.spec.ts
// │	│	│   ├── whatsapp.controller.ts
// │	│	│   ├── whatsapp.service.spec.ts
// │	│	│   └── whatsapp.service.ts
// |   │	│	
// │	│	└── WhatsApp.module.ts
// |   │	
// │   ├── app.controller.spec.ts
// │   ├── app.controller.ts
// │   ├── app.module.ts
// │   ├── app.service.ts
// │   └── main.ts
// │
// ├── 📁 test/
// │   ├── app.e2e-spec.ts
// │   └── jest-e2e.json              
// │
// ├── .env
// ├── .gitignore
// ├── .prettierrc
// ├── eslint.config.mjs
// ├── nest-cli.json
// ├── package-lock.json
// ├── package.json
// ├── README.md
// ├── tsconfig.build.json
// └── tsconfig.json

// and 
// frontend/
// ├── 📁 public/
// │	├── favicon.ico
// │	├── index.html
// │	├── logo192.png
// │	├── logo512.png
// │	├── manifest.json
// │   └── robots.txt
// │	
// ├── 📁 src/
// │	├── 📁 components/
// |   │	│
// |   │	├── 📁 charts/
// |   │	|   ├── HeatmapLayer.tsx
// |   │	|   ├── IncidentTypePieChart.tsx
// |   │	|   └── ResponseTineChart.tsx
// |   │	│
// |   │	├── 📁 common/
// |   │	|   ├── IncidentList.tsx
// |   │	|   ├── IncidentMap.tsx
// |   │	|   ├── RoleBasedRoute.tsx
// |   │	|   ├── SLATimer.tsx
// |   │	|   └── StationSelector.tsx
// |   │	│
// |   │	└── 📁 dashbaord/
// |   │	    ├── agriculturalDashboard.tsx
// |   │	    ├── ambulanceDashboard.tsx
// |   │	    ├── BaseDashboard.tsx
// |   │	    ├── CityCouncilDashboard.tsx
// |   │	    ├── FireBrigadeDashboard.tsx
// |   │	    └── PoliceDashboard.tsx
// │	│
// │	├── 📁 hooks/
// │	│   ├── useAuth.ts
// │	│   ├── useIncidentData.ts
// │	│   ├── useRealtimeUpdates.ts
// │	│   └── useSLA.ts
// │	│
// │	├── 📁 services/
// │	│	│
// │	│	├── 📁 api/
// │	│	|   ├── AuthApi.ts
// │	│	|   ├── fireApi.ts
// │	│	|   └── policeApi.ts
// │	│	│
// │	│	├── 📁 websocket/
// │	│	|   └── notificationClient.ts
// │	│	│
// │	│   ├── api.ts
// │	│	└── socket.ts
// │	│
// │	├── 📁 types/
// │	│	└── dashboard.types.ts
// |   │	
// │   ├── App.css
// │   ├── App.test.tsx
// │   ├── App.tsx
// │   ├── index.css
// │   ├── index.tsx
// │   ├── logo.svg
// │   ├── react-app-env.d.ts
// │   ├── reportWebVitals.ts
// │   └── setupTests.ts              
// │
// ├── .env
// ├── .env.development
// ├── .gitignore
// ├── package-lock.json
// ├── package.json
// ├── README.md
// └── tsconfig.json

// and the bot should follow this message flow

// 1. userMessage -> Basic query (Check if no locked user session) -> if basic query then Bot response with welcome message
// 2. userMessage -> Basic query or salutation (Check if no locked user session) -> if not basic query or salutation then check for menu commands -> if menu commands -> message route to correct service and create session, lock user/bind user to session until completed or cancelled
// 3. userMessage -> Basic query or salutation (Check if no locked user session) -> if not basic query or salutation then check for menu commands -> if menu commands -> if  not menu commands then NLP check for emergency -> If emergency route to emergency reporting and create session and lock user/ bind user to session until completed or cancelled
// 4. userMessage -> Basic query or salutation (Check if no locked user session) -> if not basic query or salutation then check for menu commands -> if menu commands -> if  not menu commands then NLP check for emergency -> If not emergency then NLP check for issue reporting -> if issue reporting then route to issue reporting and create session and lock user to session/ bind user to session until completed or cancelled.
// 5. If NLP fails for the emegency and issue reporting, then bot should respond seeking clarity of user needs and services it provides with correct menus to use to get the services

// and following file codes
// // main.ts
// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   await app.listen(process.env.PORT ?? 6399);
// }
// void bootstrap();

// // app.service.ts
// import { Injectable } from '@nestjs/common';

// @Injectable()
// export class AppService {
//   getHello(): string {
//     return 'Hello World!';
//   }
// }

// // app.module.ts
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-call */
// /* eslint-disable prettier/prettier */
// import { Module } from '@nestjs/common';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';
// import { WhatsappModule } from './whatsapp/whatsapp.module';
// import { ConfigModule } from '@nestjs/config';
// import { DatabaseModule } from './database/database.module';
// import { ScheduleModule } from '@nestjs/schedule';

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       isGlobal: true,
//     }), 
//     DatabaseModule,
//     WhatsappModule,
//     ScheduleModule.forRoot(),
//   ],
//   controllers: [AppController],
//   providers: [AppService],
// })
// export class AppModule {}

// // app.controller.ts
// import { Controller, Get } from '@nestjs/common';
// import { AppService } from './app.service';

// @Controller()
// export class AppController {
//   constructor(private readonly appService: AppService) {}

//   @Get()
//   getHello(): string {
//     return this.appService.getHello();
//   }
// }

// //app.controller.spec.ts
// import { Test, TestingModule } from '@nestjs/testing';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';

// describe('AppController', () => {
//   let appController: AppController;

//   beforeEach(async () => {
//     const app: TestingModule = await Test.createTestingModule({
//       controllers: [AppController],
//       providers: [AppService],
//     }).compile();

//     appController = app.get<AppController>(AppController);
//   });

//   describe('root', () => {
//     it('should return "Hello World!"', () => {
//       expect(appController.getHello()).toBe('Hello World!');
//     });
//   });
// });

// // whatsapp.module.ts
// /* eslint-disable prettier/prettier */
// // whatsapp.module.ts
// import { Module } from '@nestjs/common';
// import { HttpModule } from '@nestjs/axios';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { ConfigModule } from '@nestjs/config';
// import { WhatsappController } from './whatsapp/whatsapp.controller';
// import { WhatsappService } from './whatsapp/whatsapp.service';
// import { AuthService } from '../auth/auth.service';
// import { IssueReportingService } from './services/issue-reporting.service';
// import { EmergencyReportingService } from './services/emergency-reporting.service';
// import { NlpService } from './services/nlp.service';
// import { SessionManagerService } from './services/session-manager.service';
// import { StorageService } from './services/storage.service';
// import { SessionCleanupService } from './services/cleanup.service';
// import { MessagingService } from './services/messaging.service';
// import { User } from '../database/user.entity';
// import { ActiveSession, AuthSession, LoginSession, UserSession, RegistrationSession } from '../database/session.entity';
// import { EmergencyReport } from '../database/emergency-report.entity';
// import { IssueReport } from '../database/issue-report.entity';
// import { AnalyticsDaily, LocationAnalytics, UserAnalytics, DepartmentAnalytics } from '../database/analytics.entity';
// import { KycData } from '../database/kyc.entity';

// @Module({
//   imports: [
//     HttpModule,
//     ConfigModule.forRoot(),
//     TypeOrmModule.forFeature([
//       User, 
//       ActiveSession,
//       AuthSession,
//       LoginSession,
//       UserSession,
//       RegistrationSession,
//       EmergencyReport,
//       IssueReport,
//       AnalyticsDaily,
//       LocationAnalytics,
//       UserAnalytics,
//       DepartmentAnalytics,
//       KycData,
//     ]),
//   ],
//   controllers: [WhatsappController],
//   providers: [
//     WhatsappService,
//     AuthService,
//     IssueReportingService,
//     EmergencyReportingService,
//     NlpService,
//     SessionManagerService,
//     StorageService,
//     SessionCleanupService,
//     MessagingService,
//   ],
//   exports: [
//     WhatsappService, 
//     NlpService,
//     IssueReportingService,
//     EmergencyReportingService,
//     SessionManagerService,
//     StorageService,
//     MessagingService,
//   ],
// })
// export class WhatsappModule {}

// // whatsapp.service.ts
// /* eslint-disable @typescript-eslint/no-misused-promises */
// /* eslint-disable @typescript-eslint/no-unsafe-call */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-unsafe-argument */
// /* eslint-disable prettier/prettier */
// /* eslint-disable @typescript-eslint/no-unsafe-return */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */

// import { Injectable, Logger, BadRequestException } from '@nestjs/common';
// import { HttpService } from '@nestjs/axios';
// import { ConfigService } from '@nestjs/config';
// import { catchError, map, timeout } from 'rxjs/operators';
// import type { AxiosResponse } from 'axios';
// import { firstValueFrom } from 'rxjs';
// import { EmergencyReportingService } from '../services/emergency-reporting.service';
// import { IssueReportingService } from '../services/issue-reporting.service';
// import { NlpService } from '../services/nlp.service';
// import { SessionManagerService } from '../services/session-manager.service';
// import { StorageService } from '../services/storage.service';
// import { AuthService } from '../../auth/auth.service';
// import { SessionType } from '../../database/session.entity';
// import { User, UserRole, UserStatus } from '../../database/user.entity';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { existsSync } from 'fs';
// import { MessagingService } from '../services/messaging.service';

// interface WebhookPayload {
//   entry?: Array<{
//     changes?: Array<{
//       value?: {
//         messages?: Array<{
//           from: string;
//           id: string;
//           type: string;
//           text?: { body: string };
//           image?: { id: string; mime_type: string };
//           audio?: { id: string; mime_type: string };
//           video?: { id: string; mime_type: string };
//           document?: { id: string; mime_type: string };
//           location?: { latitude: number; longitude: number };
//         }>;
//       };
//     }>;
//   }>;
// }

// interface MessageData {
//   messaging_product: string;
//   recipient_type: string;
//   to: string;
//   type: string;
//   text?: {
//     preview_url: boolean;
//     body: string;
//   };
//   interactive?: {
//     type: string;
//     body: {
//       text: string;
//     };
//     action: {
//       buttons?: Array<{
//         type: string;
//         reply: {
//           id: string;
//           title: string;
//         };
//       }>;
//       sections?: Array<{
//         title: string;
//         rows: Array<{
//           id: string;
//           title: string;
//           description?: string;
//         }>;
//       }>;
//     };
//   };
// }

// interface RegistrationData {
//   firstName?: string;
//   lastName?: string;
//   email?: string;
//   password?: string;
//   idNumber?: string;
//   address?: string;
//   idDocumentUrl?: string;
//   proofOfResidenceUrl?: string;
//   step?: number;
// }

// @Injectable()
// export class WhatsappService {
//   private readonly logger = new Logger(WhatsappService.name);
//   private readonly API_TIMEOUT = 15000;
  
//   // In-memory registration sessions
//   private readonly usersInRegistration = new Map<string, {
//     step: number;
//     data: RegistrationData;
//     lastActive: number;
//   }>();

//   constructor(
//     private httpService: HttpService,
//     private configService: ConfigService,
//     private readonly emergencyReportingService: EmergencyReportingService,
//     private readonly issueReportingService: IssueReportingService,
//     private readonly nlpService: NlpService,
//     private readonly sessionManager: SessionManagerService,
//     private readonly storageService: StorageService,
//     private readonly authService: AuthService,
//     private readonly messagingService: MessagingService,
//     @InjectRepository(User)
//     private userRepository: Repository<User>,
//   ) {}

//   getTestMessage(): string {
//     return 'Civil Protection Bot - Ready to serve!';
//   }

//   verifyWebhook(
//     mode: string,
//     token: string,
//     challenge: string,
//   ): string | undefined {
//     const verificationToken = process.env.WHATSAPP_CLOUD_API_WEBHOOK_VERIFICATION_TOKEN;

//     if (!mode || !token) {
//       return 'Error verifying token';
//     }

//     if (mode === 'subscribe' && token === verificationToken) {
//       return challenge;
//     }
//     return undefined;
//   }

//   async handleIncomingMessage(payload: WebhookPayload): Promise<any> {
//     try {
//       const messages = payload?.entry?.[0]?.changes?.[0]?.value?.messages;
      
//       if (!messages || messages.length === 0) {
//         return;
//       }

//       const message = messages[0];
//       const messageID = message.id;
//       const messageSender = message.from;

//       // Mark message as read
//       await this.markMessageAsRead(messageID);
      
//       // Process message with the specified flow
//       await this.processMessageFlow(messageSender, message, messageID);
      
//     } catch (error) {
//       this.logger.error('Error handling incoming message:', error);
//     }
//   }

//   private async processMessageFlow(phoneNumber: string, message: any, messageID: string): Promise<void> {
//     try {
//       // ==================== STEP 1: Check if user has locked session ====================
//       const hasActiveGuidedSession = await this.sessionManager.hasActiveGuidedSession(phoneNumber);
      
//       if (hasActiveGuidedSession) {
//         this.logger.log(`User ${phoneNumber} has active guided session, routing to session handler`);
//         // User is in an active session (emergency/issue reporting/registration)
//         // Route directly to appropriate session handler
//         await this.routeMessageToSessionHandler(phoneNumber, message, messageID);
//         return;
//       }

//       // ==================== STEP 2: Check for text messages ====================
//       if (message.type === 'text') {
//         const text = message.text?.body?.trim();
//         if (!text) return;

//         // Normalize text for processing
//         const normalizedText = text.toLowerCase().trim();
        
//         // ==================== STEP 2A: Check for basic queries or salutations ====================
//         const isBasicQuery = this.isBasicQuery(normalizedText);
//         const isSalutation = this.isSalutation(normalizedText);
        
//         if (isBasicQuery || isSalutation) {
//           this.logger.log(`User ${phoneNumber} sent basic query/salutation: ${text}`);
//           await this.sendWelcomeMessage(phoneNumber, messageID);
//           return;
//         }

//         // ==================== STEP 3: Check for menu commands ====================
//         const menuCommand = this.detectMenuCommand(normalizedText);
//         if (menuCommand) {
//           this.logger.log(`User ${phoneNumber} used menu command: ${menuCommand}`);
//           await this.handleMenuCommand(phoneNumber, menuCommand, text, messageID);
//           return;
//         }

//         // ==================== STEP 4: NLP check for emergency ====================
//         const nlpResult = await this.nlpService.processNaturalLanguage(text, phoneNumber);
        
//         if (nlpResult.handled && nlpResult.type === 'emergency') {
//           this.logger.log(`NLP detected emergency for ${phoneNumber}: ${nlpResult.data.type}`);
          
//           // Create emergency session and lock user
//           await this.emergencyReportingService.startEmergencyReportWithContext(
//             phoneNumber,
//             messageID,
//             {
//               detectedType: nlpResult.data.type,
//               originalMessage: text,
//               confidence: nlpResult.data.confidence,
//               keywords: nlpResult.data.keywords
//             }
//           );
          
//           // Create session lock
//           await this.sessionManager.createOrUpdateActiveSession(
//             phoneNumber,
//             SessionType.EMERGENCY,
//             2, // Start at step 2 (type already detected)
//             {
//               emergencyType: nlpResult.data.type,
//               startedAt: new Date(),
//               messageId: messageID
//             },
//             messageID
//           );
          
//           return;
//         }

//         // ==================== STEP 5: NLP check for issue reporting ====================
//         if (nlpResult.handled && nlpResult.type === 'issue') {
//           this.logger.log(`NLP detected issue for ${phoneNumber}: ${nlpResult.data.type}`);
          
//           // Create issue reporting session and lock user
//           await this.issueReportingService.startIssueReportWithContext(
//             phoneNumber,
//             messageID,
//             {
//               detectedType: nlpResult.data.type,
//               originalMessage: text,
//               confidence: nlpResult.data.confidence,
//               keywords: nlpResult.data.keywords
//             }
//           );
          
//           // Create session lock (we need to add issue reporting session type)
//           await this.sessionManager.createOrUpdateActiveSession(
//             phoneNumber,
//             SessionType.ISSUE_REPORTING,
//             2, // Start at step 2 (type already detected)
//             {
//               issueType: nlpResult.data.type,
//               startedAt: new Date(),
//               messageId: messageID
//             },
//             messageID
//           );
          
//           return;
//         }

//         // ==================== STEP 6: NLP failed - seek clarity ====================
//         this.logger.log(`NLP failed for ${phoneNumber}, seeking clarity: ${text}`);
//         await this.sendClarityMessage(phoneNumber, text, messageID);
//         return;
//       }

//       // ==================== STEP 7: Handle non-text messages when no active session ====================
//       // If user sends media/location without starting a session, show main menu
//       if (['image', 'audio', 'video', 'document', 'location'].includes(message.type)) {
//         await this.sendWelcomeMessage(phoneNumber, messageID);
//         return;
//       }

//       // ==================== STEP 8: Default fallback ====================
//       await this.sendWelcomeMessage(phoneNumber, messageID);

//     } catch (error) {
//       this.logger.error('Error processing message flow:', error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         'Sorry, I encountered an error processing your message. Please try again.',
//         messageID
//       );
//     }
//   }

//   private async routeMessageToSessionHandler(phoneNumber: string, message: any, messageID: string): Promise<void> {
//     try {
//       const activeSession = await this.sessionManager.getActiveSession(phoneNumber);
      
//       if (!activeSession) {
//         this.logger.log(`No active session found for ${phoneNumber}, sending welcome message`);
//         await this.sendWelcomeMessage(phoneNumber, messageID);
//         return;
//       }

//       this.logger.log(`Routing message to session handler for ${phoneNumber}, session type: ${activeSession.sessionType}`);

//       // Route based on session type
//       switch (activeSession.sessionType) {
//         case SessionType.EMERGENCY:
//           await this.routeToEmergencyReporting(phoneNumber, message, messageID);
//           break;
        
//         case SessionType.ISSUE_REPORTING:
//           await this.routeToIssueReporting(phoneNumber, message, messageID);
//           break;
        
//         case SessionType.REGISTRATION:
//           await this.routeToRegistration(phoneNumber, message, messageID);
//           break;
        
//         default:
//           this.logger.warn(`Unhandled session type: ${activeSession.sessionType} for ${phoneNumber}`);
//           await this.sendWelcomeMessage(phoneNumber, messageID);
//           break;
//       }
//     } catch (error) {
//       this.logger.error(`Error routing message to session handler for ${phoneNumber}:`, error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ An error occurred while processing your message. Please try again.',
//         messageID
//       );
//     }
//   }

//   private async routeToEmergencyReporting(phoneNumber: string, message: any, messageID: string): Promise<void> {
//     try {
//       if (message.type === 'text') {
//         const text = message.text?.body;
//         if (text) {
//           const handled = await this.emergencyReportingService.handleEmergencyReporting(phoneNumber, text, messageID);
//           if (!handled) {
//             await this.messagingService.sendTextMessage(
//               phoneNumber,
//               '🚨 Please continue with your emergency report or type "CANCEL" to exit.',
//               messageID
//             );
//           }
//         }
//       } 
//       else if (message.type === 'image' || message.type === 'audio' || message.type === 'video') {
//         await this.handleMediaInEmergency(phoneNumber, message, messageID);
//       } 
//       else if (message.type === 'location') {
//         await this.handleLocationInEmergency(phoneNumber, message, messageID);
//       }
//       else {
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '🚨 Please send text, media, or location information for your emergency report, or type "CANCEL" to exit.',
//           messageID
//         );
//       }
//     } catch (error) {
//       this.logger.error(`Error routing to emergency reporting for ${phoneNumber}:`, error);
//       throw error;
//     }
//   }

//   private async routeToIssueReporting(phoneNumber: string, message: any, messageID: string): Promise<void> {
//     try {
//       if (message.type === 'text') {
//         const text = message.text?.body;
//         if (text) {
//           // Check for cancel command
//           const normalizedText = text.toLowerCase().trim();
//           if (normalizedText === 'cancel' || normalizedText === 'stop' || normalizedText === 'exit') {
//             await this.issueReportingService.cancelReportingSession(phoneNumber);
//             await this.sessionManager.cancelSession(phoneNumber, SessionType.ISSUE_REPORTING);
//             await this.messagingService.sendTextMessage(
//               phoneNumber,
//               '❌ Issue reporting cancelled. You can start again by typing "REPORT".',
//               messageID
//             );
//             await this.sendWelcomeMessage(phoneNumber, messageID);
//             return;
//           }
          
//           const handled = await this.issueReportingService.handleReportingStep(phoneNumber, text, messageID);
//           if (!handled) {
//             await this.messagingService.sendTextMessage(
//               phoneNumber,
//               '📝 Please continue with your issue report or type "CANCEL" to exit.',
//               messageID
//             );
//           }
//         }
//       } 
//       else if (message.type === 'image' || message.type === 'audio' || message.type === 'video') {
//         await this.handleMediaInReporting(phoneNumber, message, messageID);
//       } 
//       else if (message.type === 'location') {
//         await this.handleLocationInReporting(phoneNumber, message, messageID);
//       }
//       else {
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '📝 Please send text, media, or location information for your issue report, or type "CANCEL" to exit.',
//           messageID
//         );
//       }
//     } catch (error) {
//       this.logger.error(`Error routing to issue reporting for ${phoneNumber}:`, error);
//       throw error;
//     }
//   }

//   private async routeToRegistration(phoneNumber: string, message: any, messageID: string): Promise<void> {
//     try {
//       if (message.type === 'text') {
//         const text = message.text?.body;
//         if (text) {
//           // Check for cancel command
//           const normalizedText = text.toLowerCase().trim();
//           if (normalizedText === 'cancel' || normalizedText === 'stop' || normalizedText === 'exit') {
//             await this.cancelRegistration(phoneNumber, messageID);
//             return;
//           }
          
//           await this.handleRegistrationStep(phoneNumber, text, messageID);
//         }
//       } 
//       else if (message.type === 'image' || message.type === 'document') {
//         await this.handleRegistrationDocument(phoneNumber, message, messageID);
//       }
//       else {
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '📝 Please send text or upload documents as requested for your registration.',
//           messageID
//         );
//       }
//     } catch (error) {
//       this.logger.error(`Error routing to registration for ${phoneNumber}:`, error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Error processing registration step. Please try again or type "CANCEL" to exit.',
//         messageID
//       );
//     }
//   }

//   private async handleMediaInEmergency(phoneNumber: string, message: any, messageID: string): Promise<boolean> {
//     try {
//       let mediaId: string;
//       let mediaType: 'image' | 'voice' | 'video';
//       let mimeType: string;

//       if (message.image) {
//         mediaId = message.image.id;
//         mediaType = 'image';
//         mimeType = message.image.mime_type;
//       } else if (message.audio) {
//         mediaId = message.audio.id;
//         mediaType = 'voice';
//         mimeType = message.audio.mime_type;
//       } else if (message.video) {
//         mediaId = message.video.id;
//         mediaType = 'video';
//         mimeType = message.video.mime_type;
//       } else {
//         return false;
//       }

//       const mediaUrl = await this.getMediaUrl(mediaId);
//       return await this.emergencyReportingService.handleMediaInEmergency(phoneNumber, mediaType, mediaUrl, messageID, mimeType);
//     } catch (error) {
//       this.logger.error('Error handling media in emergency:', error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Failed to process media. Please try again or type "CANCEL" to exit.',
//         messageID
//       );
//       return false;
//     }
//   }

//   private async handleLocationInEmergency(phoneNumber: string, message: any, messageID: string): Promise<boolean> {
//     try {
//       const location = message.location;
//       if (!location) return false;

//       const lat = location.latitude;
//       const lng = location.longitude;

//       return await this.emergencyReportingService.handleLocationInEmergency(phoneNumber, lat, lng, messageID);
//     } catch (error) {
//       this.logger.error('Error handling location in emergency:', error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Failed to process location. Please try again or type "CANCEL" to exit.',
//         messageID
//       );
//       return false;
//     }
//   }

//   private async handleMediaInReporting(phoneNumber: string, message: any, messageID: string): Promise<boolean> {
//     try {
//       let mediaId: string;
//       let mediaType: 'image' | 'voice' | 'video';
//       let mimeType: string;

//       if (message.image) {
//         mediaId = message.image.id;
//         mediaType = 'image';
//         mimeType = message.image.mime_type;
//       } else if (message.audio) {
//         mediaId = message.audio.id;
//         mediaType = 'voice';
//         mimeType = message.audio.mime_type;
//       } else if (message.video) {
//         mediaId = message.video.id;
//         mediaType = 'video';
//         mimeType = message.video.mime_type;
//       } else {
//         return false;
//       }

//       const mediaUrl = await this.getMediaUrl(mediaId);
//       return await this.issueReportingService.handleMediaInReport(phoneNumber, mediaType, mediaUrl, messageID, mimeType);
//     } catch (error) {
//       this.logger.error('Error handling media in reporting:', error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Failed to process media. Please try again or type "CANCEL" to exit.',
//         messageID
//       );
//       return false;
//     }
//   }

//   private async handleLocationInReporting(phoneNumber: string, message: any, messageID: string): Promise<boolean> {
//     try {
//       const location = message.location;
//       if (!location) return false;

//       const lat = location.latitude;
//       const lng = location.longitude;
//       const locationMessage = `${lat}, ${lng}`;

//       return await this.issueReportingService.handleReportingStep(phoneNumber, locationMessage, messageID);
//     } catch (error) {
//       this.logger.error('Error handling location in reporting:', error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Failed to process location. Please try again or type "CANCEL" to exit.',
//         messageID
//       );
//       return false;
//     }
//   }

//   private isBasicQuery(text: string): boolean {
//     const basicQueries = [
//       // Questions about the bot
//       'who are you',
//       'what are you',
//       'what can you do',
//       'help me',
//       'what services',
//       'how does this work',
      
//       // Information requests
//       'what is',
//       'tell me about',
//       'explain',
//       'information about',
//       'details about',
      
//       // General inquiries
//       'how to use',
//       'how do i',
//       'can i',
//       'is there',
//       'where can i',
      
//       // Simple yes/no questions
//       'can you help',
//       'are you',
//       'do you',
//       'will you',
//       'would you'
//     ];

//     // Check if text ends with question mark or contains basic query phrases
//     if (text.endsWith('?')) {
//       return true;
//     }

//     return basicQueries.some(query => text.includes(query));
//   }

//   private isSalutation(text: string): boolean {
//     const salutations = [
//       'hi', 'hello', 'hey', 'greetings',
//       'good morning', 'good afternoon', 'good evening',
//       'hi there', 'hello there', 'hey there',
//       'howdy', 'whats up', 'sup',
//       'hi bot', 'hello bot', 'hey bot'
//     ];

//     return salutations.some(salutation => text.includes(salutation));
//   }

//   private detectMenuCommand(text: string): string | null {
//     const menuCommands = {
//       'emergency': 'EMERGENCY',
//       'report': 'REPORT',
//       'register': 'REGISTER',
//       'login': 'LOGIN',
//       'logout': 'LOGOUT',
//       'cancel': 'CANCEL',
//       'my reports': 'MY_REPORTS',
//       'my emergencies': 'MY_EMERGENCIES',
//       'help': 'HELP',
//       'menu': 'MENU'
//     };

//     // Check for exact matches first
//     for (const [command, action] of Object.entries(menuCommands)) {
//       if (text === command.toLowerCase()) {
//         return action;
//       }
//     }

//     // Check for partial matches
//     if (text.includes('emergency')) return 'EMERGENCY';
//     if (text.includes('report')) return 'REPORT';
//     if (text.includes('register')) return 'REGISTER';
//     if (text.includes('help')) return 'HELP';
//     if (text.includes('menu')) return 'MENU';

//     return null;
//   }

//   private async handleMenuCommand(phoneNumber: string, command: string, originalText: string, messageID: string): Promise<void> {
//     switch (command) {
//       case 'EMERGENCY':
//         await this.startEmergencyReporting(phoneNumber, messageID);
//         break;
//       case 'REPORT':
//         await this.startIssueReporting(phoneNumber, messageID);
//         break;
//       case 'REGISTER':
//         await this.startRegistrationFlow(phoneNumber, messageID);
//         break;
//       case 'LOGIN':
//         await this.handleLoginCommand(phoneNumber, originalText, messageID);
//         break;
//       case 'LOGOUT':
//         await this.handleLogoutCommand(phoneNumber, messageID);
//         break;
//       case 'CANCEL':
//         await this.handleCancelCommand(phoneNumber, messageID);
//         break;
//       case 'MY_REPORTS':
//         await this.issueReportingService.getUserReports(phoneNumber, messageID);
//         break;
//       case 'MY_EMERGENCIES':
//         await this.emergencyReportingService.getUserEmergencyReports(phoneNumber, messageID);
//         break;
//       case 'HELP':
//         await this.sendHelpMessage(phoneNumber, messageID);
//         break;
//       case 'MENU':
//         await this.sendMainMenu(phoneNumber, messageID);
//         break;
//       default:
//         await this.sendWelcomeMessage(phoneNumber, messageID);
//     }
//   }

//   // ==================== REGISTRATION METHODS ====================

//   async startRegistrationFlow(phoneNumber: string, messageID: string): Promise<void> {
//     try {
//       // Check if user is already in registration
//       if (this.usersInRegistration.has(phoneNumber)) {
//         const registrationData = this.usersInRegistration.get(phoneNumber)!;
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           `📝 You're already in registration. Please continue with step ${registrationData.step}.\n\nCurrent step: ${this.getRegistrationStepDescription(registrationData.step)}`,
//           messageID
//         );
//         return;
//       }

//       // Initialize registration data
//       const registrationData: RegistrationData = {
//         step: 1
//       };

//       // Store in memory
//       this.usersInRegistration.set(phoneNumber, {
//         step: 1,
//         data: registrationData,
//         lastActive: Date.now()
//       });

//       // Create database session for locking
//       await this.sessionManager.createOrUpdateActiveSession(
//         phoneNumber,
//         SessionType.REGISTRATION,
//         1,
//         registrationData,
//         messageID
//       );

//       const welcomeMessage = `📝 *REGISTRATION* 📝\n\nI'll help you create your account. Please follow these steps:\n\n*Step 1/9:* What is your First Name?`;
      
//       await this.messagingService.sendTextMessage(phoneNumber, welcomeMessage, messageID);

//     } catch (error) {
//       this.logger.error('Error starting registration:', error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Error starting registration. Please try again.',
//         messageID
//       );
//     }
//   }

//   private getRegistrationStepDescription(step: number): string {
//     const steps = [
//       "Step 1: First Name",
//       "Step 2: Last Name",
//       "Step 3: Email",
//       "Step 4: Password",
//       "Step 5: Confirm Password",
//       "Step 6: ID Number",
//       "Step 7: Address",
//       "Step 8: ID Document Upload",
//       "Step 9: Proof of Residence Upload"
//     ];
//     return steps[step - 1] || "Unknown step";
//   }

//   private async handleRegistrationStep(phoneNumber: string, text: string, messageID: string): Promise<void> {
//     try {
//       if (!this.usersInRegistration.has(phoneNumber)) {
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           'No active registration session. Please start over with "REGISTER".',
//           messageID
//         );
//         return;
//       }

//       const registration = this.usersInRegistration.get(phoneNumber)!;
//       registration.lastActive = Date.now();

//       switch (registration.step) {
//         case 1: // First Name
//           registration.data.firstName = text.trim();
//           registration.step = 2;
//           await this.messagingService.sendTextMessage(phoneNumber, '👤 *Step 2/9:* What is your Last Name?', messageID);
//           break;
        
//         case 2: // Last Name
//           registration.data.lastName = text.trim();
//           registration.step = 3;
//           await this.messagingService.sendTextMessage(phoneNumber, '📧 *Step 3/9:* What is your Email Address?', messageID);
//           break;
        
//         case 3: // Email
//           if (!this.validateEmail(text)) {
//             await this.messagingService.sendTextMessage(
//               phoneNumber,
//               '❌ Please provide a valid email address. Try again:',
//               messageID
//             );
//             return;
//           }
//           registration.data.email = text.trim();
//           registration.step = 4;
//           await this.messagingService.sendTextMessage(
//             phoneNumber,
//             '🔐 *Step 4/9:* Create a Password (minimum 10 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character):',
//             messageID
//           );
//           break;
        
//         case 4: // Password
//           if (!this.validatePassword(text)) {
//             await this.messagingService.sendTextMessage(
//               phoneNumber,
//               '❌ Password must be at least 10 characters with:\n• 1 uppercase letter\n• 1 lowercase letter\n• 1 number\n• 1 special character (@$!%*?&)\n\nPlease try again:',
//               messageID
//             );
//             return;
//           }
//           registration.data.password = text;
//           registration.step = 5;
//           await this.messagingService.sendTextMessage(phoneNumber, '🔐 *Step 5/9:* Please confirm your password:', messageID);
//           break;
        
//         case 5: // Confirm Password
//           if (text !== registration.data.password) {
//             await this.messagingService.sendTextMessage(
//               phoneNumber,
//               '❌ Passwords do not match. Please re-enter your password:',
//               messageID
//             );
//             registration.step = 4;
//             delete registration.data.password;
//             return;
//           }
//           registration.step = 6;
//           await this.messagingService.sendTextMessage(phoneNumber, '🆔 *Step 6/9:* What is your ID Number?', messageID);
//           break;
        
//         case 6: // ID Number
//           if (!this.validateIdNumber(text)) {
//             await this.messagingService.sendTextMessage(
//               phoneNumber,
//               '❌ Please provide a valid ID number (6-20 characters). Try again:',
//               messageID
//             );
//             return;
//           }
//           registration.data.idNumber = text.trim();
//           registration.step = 7;
//           await this.messagingService.sendTextMessage(phoneNumber, '📍 *Step 7/9:* What is your Address?', messageID);
//           break;
        
//         case 7: // Address
//           registration.data.address = text.trim();
//           registration.step = 8;
//           await this.messagingService.sendTextMessage(
//             phoneNumber,
//             '📄 *Step 8/9:* Please upload your ID Document (photo of your ID):\n\nYou can send a photo or document.',
//             messageID
//           );
//           break;
        
//         default:
//           await this.messagingService.sendTextMessage(
//             phoneNumber,
//             'Invalid registration step. Please start over with "REGISTER".',
//             messageID
//           );
//           this.usersInRegistration.delete(phoneNumber);
//           return;
//       }

//       // Update in-memory registration
//       this.usersInRegistration.set(phoneNumber, registration);

//       // Update database session
//       await this.sessionManager.createOrUpdateActiveSession(
//         phoneNumber,
//         SessionType.REGISTRATION,
//         registration.step,
//         registration.data,
//         messageID
//       );

//     } catch (error) {
//       this.logger.error('Error handling registration step:', error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Error processing registration step. Please try again or type "CANCEL" to exit.',
//         messageID
//       );
//     }
//   }

//   private async handleRegistrationDocument(phoneNumber: string, message: any, messageID: string): Promise<void> {
//     try {
//       if (!this.usersInRegistration.has(phoneNumber)) {
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           'No active registration session. Please start over with "REGISTER".',
//           messageID
//         );
//         return;
//       }

//       const registration = this.usersInRegistration.get(phoneNumber)!;
      
//       if (registration.step !== 8 && registration.step !== 9) {
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           'Please continue with the current text step first.',
//           messageID
//         );
//         return;
//       }

//       const mediaId = message.image?.id || message.document?.id;
//       const mimeType = message.image?.mime_type || message.document?.mime_type;

//       if (!mediaId) {
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '❌ No media found. Please try uploading again.',
//           messageID
//         );
//         return;
//       }

//       const validDocumentTypes = [
//         'application/pdf', 'image/jpeg', 'image/png', 
//         'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
//       ];
      
//       if (!validDocumentTypes.includes(mimeType)) { 
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '❌ Please upload a valid document (PDF, JPEG, PNG, Word). Try again:',
//           messageID
//         );
//         return;
//       }

//       const mediaUrl = await this.getMediaUrl(mediaId);
//       const mediaBuffer = await this.downloadMedia(mediaUrl);
//       const extension = this.getFileExtensionFromMimeType(mimeType);
//       const timestamp = Date.now();

//       if (registration.step === 8) {
//         // ID Document
//         const fileName = `id_document_${phoneNumber}_${timestamp}.${extension}`;
//         const filePath = await this.storageService.saveIdDocument(
//           phoneNumber, 
//           mediaBuffer,
//           fileName
//         );

//         if (!filePath || !existsSync(filePath)) {
//           throw new Error('Failed to save ID document');
//         }

//         registration.data.idDocumentUrl = filePath;
//         registration.step = 9;
        
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '✅ ID Document received!\n\n📄 *Step 9/9:* Please upload your Proof of Residence (document or photo):\n\nThis could be a utility bill, bank statement, or other official document with your address.',
//           messageID
//         );
//       } 
//       else if (registration.step === 9) {
//         // Proof of Residence
//         const fileName = `proof_of_residence_${phoneNumber}_${timestamp}.${extension}`;
//         const filePath = await this.storageService.saveProofOfResidence(
//           phoneNumber, 
//           mediaBuffer,
//           fileName
//         );

//         if (!filePath || !existsSync(filePath)) {
//           throw new Error('Failed to save proof of residence');
//         }
        
//         registration.data.proofOfResidenceUrl = filePath;
        
//         // Complete registration
//         await this.completeRegistration(phoneNumber, registration.data, messageID);
//         return;
//       }

//       // Update in-memory registration
//       registration.lastActive = Date.now();
//       this.usersInRegistration.set(phoneNumber, registration);

//       // Update database session
//       await this.sessionManager.createOrUpdateActiveSession(
//         phoneNumber,
//         SessionType.REGISTRATION,
//         registration.step,
//         registration.data,
//         messageID
//       );

//     } catch (error) {
//       this.logger.error('Error handling registration document:', error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Failed to process document. Please try again or type "CANCEL" to exit.',
//         messageID
//       );
//     }
//   }

//   private async completeRegistration(phoneNumber: string, userData: RegistrationData, messageID: string): Promise<void> {
//     try {
//       // Validate all required fields
//       const requiredFields = [
//         { field: 'firstName', name: 'First Name' },
//         { field: 'lastName', name: 'Last Name' },
//         { field: 'email', name: 'Email' },
//         { field: 'password', name: 'Password' },
//         { field: 'idNumber', name: 'ID Number' },
//         { field: 'address', name: 'Address' },
//         { field: 'idDocumentUrl', name: 'ID Document' },
//         { field: 'proofOfResidenceUrl', name: 'Proof of Residence' }
//       ];
      
//       const missingFields: string[] = [];
//       for (const { field, name } of requiredFields) {
//         if (!userData[field as keyof RegistrationData]) {
//           missingFields.push(name);
//         }
//       }

//       if (missingFields.length > 0) {
//         throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
//       }

//       // Verify documents exist
//       if (!existsSync(userData.idDocumentUrl!)) {
//         throw new Error('ID document file not found');
//       }
//       if (!existsSync(userData.proofOfResidenceUrl!)) {
//         throw new Error('Proof of residence file not found');
//       }

//       const userToCreate = {
//         phoneNumber: phoneNumber.toString(),
//         firstName: userData.firstName!,
//         lastName: userData.lastName!,
//         email: userData.email!,
//         password: userData.password!,
//         role: UserRole.USER,
//         status: UserStatus.PENDING_VERIFICATION,
//         isActive: true,
//         emailVerified: false,
//         phoneVerified: false,
//         kycData: {
//           idNumber: userData.idNumber!,
//           address: userData.address!,
//           idLink: userData.idDocumentUrl!,
//           porLink: userData.proofOfResidenceUrl!,
//         },
//         passwordResetToken: null,
//         passwordResetExpires: null,
//         emailVerificationToken: null,
//         lastActivityAt: new Date(),
//         lastLoginAt: new Date(),
//         timezone: null,
//         language: null
//       };

//       // Save to database
//       const registrationSuccess = await this.authService.completeRegistration(userToCreate);

//       if (registrationSuccess) {
//         // Clean up sessions
//         this.usersInRegistration.delete(phoneNumber);
//         await this.sessionManager.completeSession(phoneNumber, SessionType.REGISTRATION);
//         await this.sessionManager.createLoginSession(phoneNumber);

//         await this.sendRegistrationSuccessMessage(phoneNumber, userData, messageID);
//         await this.sendWelcomeMessageAfterRegistration(phoneNumber, messageID);
//       } else {
//         throw new Error('Registration failed in auth service');
//       }
//     } catch (error) {
//       this.logger.error('Error completing registration:', error);
      
//       // Clean up on error
//       this.usersInRegistration.delete(phoneNumber);
//       await this.sessionManager.cancelSession(phoneNumber, SessionType.REGISTRATION);
      
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Registration failed. Please start over by sending "REGISTER".',
//         messageID
//       );
//     }
//   }

//   private async sendRegistrationSuccessMessage(phoneNumber: string, userData: RegistrationData, messageID: string): Promise<void> {
//     await this.messagingService.sendTextMessage(
//       phoneNumber,
//       '🎉 *REGISTRATION COMPLETED SUCCESSFULLY!* 🎉\n\n' +
//       'Your account has been created and is pending verification.\n\n' +
//       '📋 *Your Details:*\n' +
//       `• Name: ${userData.firstName} ${userData.lastName}\n` +
//       `• Email: ${userData.email}\n` +
//       `• Status: Pending Verification\n\n` +
//       'You can now use basic features while we verify your documents.',
//       messageID
//     );
//   }

//   private async sendWelcomeMessageAfterRegistration(phoneNumber: string, messageID: string): Promise<void> {
//     await this.messagingService.sendTextMessage(
//       phoneNumber,
//       '🎉 *Welcome to Civil Protection Bot!* 🛡️\n\n' +
//       'While your account is being verified, you can use:\n\n' +
//       '🆓 *Free Features (Available now):*\n' +
//       '• Report emergencies: "EMERGENCY"\n' +
//       '• Report issues: "REPORT"\n' +
//       '• View your reports: "MY REPORTS"\n' +
//       '• Get basic assistance: "HELP"\n\n' +
//       '🔐 *Premium Features (After verification):*\n' +
//       '• Set organisations\n' +
//       '• Chat with organisation AI\n' +
//       '• Access custom knowledge bases\n\n' +
//       'We will notify you once your account is verified!',
//       messageID
//     );

//     // Send quick commands after a short delay
//     setTimeout(async () => {
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '💡 *Quick Commands:*\n' +
//         '• "HELP" - Show help menu\n' +
//         '• "REPORT" - Report an issue\n' +
//         '• "MY REPORTS" - View your reports\n' +
//         '• "EMERGENCY" - Urgent help\n' +
//         '• "LOGOUT" - End your session\n' +
//         '• "CANCEL" - Cancel any active session',
//         messageID
//       );
//     }, 2000);
//   }

//   private async cancelRegistration(phoneNumber: string, messageID: string): Promise<void> {
//     this.usersInRegistration.delete(phoneNumber);
//     await this.sessionManager.cancelSession(phoneNumber, SessionType.REGISTRATION);
    
//     await this.messagingService.sendTextMessage(
//       phoneNumber,
//       '❌ Registration cancelled. You can start again by typing "REGISTER".',
//       messageID
//     );
    
//     await this.sendWelcomeMessage(phoneNumber, messageID);
//   }

//   // ==================== LOGIN/LOGOUT METHODS ====================

//   private async handleLoginCommand(phoneNumber: string, text: string, messageID: string): Promise<void> {
//     try {
//       const loginParts = text.split(' ');
//       if (loginParts.length < 3) {
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '❌ Invalid login format.\n\n' +
//           '💡 Usage: LOGIN <email/phone> <password>\n' +
//           'Example: LOGIN myemail@example.com mypassword123\n' +
//           'Example: LOGIN +263771234567 mypassword123',
//           messageID
//         );
//         return;
//       }

//       const emailOrPhone = loginParts[1];
//       const password = loginParts.slice(2).join(' ');

//       const user = await this.tryMultipleLoginStrategies(emailOrPhone, password, phoneNumber);
      
//       if (user) {
//         await this.sessionManager.createLoginSession(phoneNumber);
        
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '✅ *LOGIN SUCCESSFUL!*\n\n' +
//           `Welcome back, ${user.firstName} ${user.lastName}!\n\n` +
//           'You now have access to all premium features.',
//           messageID
//         );
        
//         this.logger.log(`User ${user.email} logged in successfully via WhatsApp`);
//       } else {
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '❌ Login failed. Please check your credentials and try again.\n\n' +
//           '💡 Tips:\n' +
//           '• Use the exact email or phone number you registered with\n' +
//           '• Ensure your password is correct\n' +
//           '• Make sure you are registered first (type "REGISTER")\n' +
//           '• If you forgot your password, contact support',
//           messageID
//         );
//       }
//     } catch (error) {
//       this.logger.error('Error handling login command:', error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ An error occurred during login. Please try again.',
//         messageID
//       );
//     }
//   }

//   private async tryMultipleLoginStrategies(identifier: string, password: string, whatsappPhone: string): Promise<User | null> {
//     try {
//       this.logger.debug(`Attempting login for identifier: ${identifier}`);
      
//       // Try email login
//       if (this.validateEmail(identifier)) {
//         this.logger.debug('Trying email-based login');
//         const userByEmail = await this.authService.loginByEmail(identifier, password);
//         if (userByEmail) {
//           this.logger.debug('Login successful via email');
//           return userByEmail;
//         }
//       }
      
//       // Try phone login (using the provided identifier)
//       this.logger.debug('Trying phone-based login');
//       const userByPhone = await this.authService.login(identifier, password);
//       if (userByPhone) {
//         this.logger.debug('Login successful via phone');
//         return userByPhone;
//       }
      
//       // Try WhatsApp phone login
//       this.logger.debug('Trying WhatsApp phone-based login');
//       const userByWhatsAppPhone = await this.authService.login(whatsappPhone, password);
//       if (userByWhatsAppPhone) {
//         this.logger.debug('Login successful via WhatsApp phone');
//         return userByWhatsAppPhone;
//       }
      
//       this.logger.warn(`All login strategies failed for identifier: ${identifier}`);
//       return null;
      
//     } catch (error) {
//       this.logger.error('Error in login strategies:', error);
//       return null;
//     }
//   }

//   private async handleLogoutCommand(phoneNumber: string, messageID: string): Promise<void> {
//     try {
//       const hadSession = await this.sessionManager.hasValidLoginSession(phoneNumber);
//       await this.sessionManager.removeLoginSession(phoneNumber);
      
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         hadSession ? 
//         '✅ You have been logged out successfully.' :
//         'ℹ️ You were not logged in.',
//         messageID
//       );
      
//       await this.sendWelcomeMessage(phoneNumber, messageID);
//     } catch (error) {
//       this.logger.error('Error handling logout command:', error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Error during logout. Please try again.',
//         messageID
//       );
//     }
//   }

//   // ==================== OTHER METHODS ====================

//   private async handleCancelCommand(phoneNumber: string, messageID: string): Promise<void> {
//     const cancelled = await this.sessionManager.cancelSession(phoneNumber);
//     if (cancelled) {
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '✅ All active sessions cancelled. You can now start a new service.',
//         messageID
//       );
//     } else {
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         'ℹ️ No active sessions to cancel.',
//         messageID
//       );
//     }
//     await this.sendMainMenu(phoneNumber, messageID);
//   }

//   private async sendClarityMessage(phoneNumber: string, originalMessage: string, messageID: string): Promise<void> {
//     const clarityMessage = `🤔 *I need more clarity*

// I received your message: "*${originalMessage.substring(0, 50)}${originalMessage.length > 50 ? '...' : ''}*"

// I'm your Civil Protection Assistant and I can help you with:

// 🚨 *EMERGENCY SERVICES*
// • Fire emergencies, medical emergencies
// • Crime in progress, accidents
// • Natural disasters

// 📝 *ISSUE REPORTING*
// • Potholes, road damage
// • Water pipe bursts, sewer issues
// • Litter, sanitation problems

// 💡 *OTHER SERVICES*
// • View your reports
// • Register for premium features
// • Get help and information

// *Please choose one of these options:*

// *Type a command:*
// • "EMERGENCY" - For urgent situations
// • "REPORT" - To report civic issues
// • "HELP" - For assistance
// • "MENU" - To see all options

// *Or describe your situation clearly:*
// • "There's a fire at the mall"
// • "Need ambulance, chest pain"
// • "Big pothole on Main Street"
// • "Sewer is overflowing in my area"

// I'm here to help you! What would you like to do?`;

//     await this.messagingService.sendTextMessage(phoneNumber, clarityMessage, messageID);
//   }

//   async sendWelcomeMessage(phoneNumber: string, messageID: string): Promise<void> {
//     const welcomeMessage = `👋 *Welcome to Civil Protection Bot!* 🛡️

// I'm your community safety assistant. I can help you with:

// 🚨 *URGENT EMERGENCIES*
// • Fire, medical, crime, accidents
// • Natural disasters
// • Life-threatening situations

// 📝 *CIVIC ISSUE REPORTING*
// • Potholes & road damage
// • Water & sewer problems
// • Sanitation & litter
// • Electricity issues

// 📋 *OTHER SERVICES*
// • View your reports
// • Register account
// • Get help & information

// *How to use:*

// 1️⃣ *For emergencies:* Type "EMERGENCY" or describe the situation
// 2️⃣ *For issues:* Type "REPORT" or describe the problem
// 3️⃣ *For help:* Type "HELP" or ask a question
// 4️⃣ *For menu:* Type "MENU" to see all options

// *Examples:*
// • "EMERGENCY" - Start emergency report
// • "There's a fire on Main Street" - Report fire
// • "REPORT pothole" - Report road issue
// • "Need ambulance" - Medical emergency
// • "Help me" - Get assistance

// What would you like to do today?`;

//     await this.messagingService.sendTextMessage(phoneNumber, welcomeMessage, messageID);
//   }

//   async sendMainMenu(phoneNumber: string, messageID: string): Promise<boolean> {
//     try {
//       const messageData: MessageData = {
//         messaging_product: 'whatsapp',
//         recipient_type: 'individual',
//         to: phoneNumber,
//         type: 'interactive',
//         interactive: {
//           type: 'button',
//           body: {
//             text: `📱 *CIVIL PROTECTION MENU* 📱\n\nChoose an option below:\n\nYou can also type commands:\n• EMERGENCY\n• REPORT\n• MY REPORTS\n• HELP\n• MENU\n• CANCEL`
//           },
//           action: {
//             buttons: [
//               {
//                 type: 'reply',
//                 reply: {
//                   id: 'btn_emergency',
//                   title: '🚨 EMERGENCY'
//                 }
//               },
//               {
//                 type: 'reply',
//                 reply: {
//                   id: 'btn_report_issue',
//                   title: '📝 REPORT ISSUE'
//                 }
//               },
//               // {
//               //   type: 'reply',
//               //   reply: {
//               //     id: 'btn_my_reports',
//               //     title: '📋 MY REPORTS'
//               //   }
//               // },
//               {
//                 type: 'reply',
//                 reply: {
//                   id: 'btn_help',
//                   title: '❓ HELP'
//                 }
//               }
//             ]
//           }
//         }
//       };

//       return await this.sendWhatsappMessage(messageData, messageID);
//     } catch (error) {
//       this.logger.error('Error sending main menu:', error);
      
//       // Fallback to text message
//       const fallbackMessage = `📱 *CIVIL PROTECTION MENU* 📱

// *Available Commands:*
// 🚨 EMERGENCY - Report urgent emergencies
// 📝 REPORT - Report civic issues
// 📋 MY REPORTS - View your reports
// 📋 MY EMERGENCIES - View emergency reports
// 📝 REGISTER - Create account
// 🔐 LOGIN email password - Sign in
// 🚪 LOGOUT - End session
// ❓ HELP - Get help
// 📱 MENU - Show this menu
// ❌ CANCEL - Cancel current session

// Type your command or describe what you need help with.`;

//       return await this.messagingService.sendTextMessage(phoneNumber, fallbackMessage, messageID);
//     }
//   }

//   async sendHelpMessage(phoneNumber: string, messageID: string): Promise<boolean> {
//     const helpMessage = `🆘 *CIVIL PROTECTION BOT - HELP* 🆘

// *🚨 WHEN TO USE EMERGENCY:*
// • FIRE - Building fire, forest fire, smoke
// • MEDICAL - Heart attack, stroke, unconscious
// • CRIME - Robbery in progress, assault, violence
// • ACCIDENT - Car crash, serious injury
// • DISASTER - Flood, earthquake, storm damage

// *📝 WHAT YOU CAN REPORT:*
// • ROADS - Potholes, sinkholes, road damage
// • WATER - Burst pipes, leaks, flooding
// • SEWER - Blockages, overflows, sewage
// • SANITATION - Litter, garbage, illegal dumping
// • ELECTRICITY - Power lines down, sparking wires

// *💡 HOW TO USE:*

// *Option 1: Type Commands*
// • "EMERGENCY" - Start emergency report
// • "REPORT" - Start issue report
// • "MY REPORTS" - View your reports
// • "MY EMERGENCIES" - View emergency reports
// • "HELP" - Show this help
// • "MENU" - Show main menu
// • "CANCEL" - Cancel current session

// *Option 2: Describe Naturally*
// • "There's a fire at 123 Main Street"
// • "Need ambulance for chest pain"
// • "Big pothole causing accidents"
// • "Sewer overflowing in my yard"

// *Option 3: Click Buttons*
// Use the interactive menu buttons for quick access

// *🆘 FOR LIFE-THREATENING EMERGENCIES:*
// 1. Use "EMERGENCY" immediately
// 2. Follow the prompts
// 3. If in immediate danger, CALL local emergency services

// *📞 SUPPORT:*
// For technical issues, contact support.

// Stay safe! 🛡️`;

//     return await this.messagingService.sendTextMessage(phoneNumber, helpMessage, messageID);
//   }

//   async startEmergencyReporting(phoneNumber: string, messageID: string): Promise<void> {
//     try {
//       await this.emergencyReportingService.startEmergencyReport(phoneNumber, messageID);
      
//       // Create session lock
//       await this.sessionManager.createOrUpdateActiveSession(
//         phoneNumber,
//         SessionType.EMERGENCY,
//         1,
//         {
//           startedAt: new Date(),
//           messageId: messageID,
//           emergencyType: 'user_initiated'
//         },
//         messageID
//       );
      
//     } catch (error) {
//       this.logger.error('Error starting emergency reporting:', error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Unable to start emergency reporting. Please try again or call emergency services directly.',
//         messageID
//       );
//     }
//   }

//   async startIssueReporting(phoneNumber: string, messageID: string): Promise<void> {
//     try {
//       await this.issueReportingService.startIssueReport(phoneNumber, messageID);
      
//       // Create session lock
//       await this.sessionManager.createOrUpdateActiveSession(
//         phoneNumber,
//         SessionType.ISSUE_REPORTING,
//         1,
//         {
//           startedAt: new Date(),
//           messageId: messageID,
//           issueType: 'user_initiated'
//         },
//         messageID
//       );
      
//     } catch (error) {
//       this.logger.error('Error starting issue reporting:', error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Unable to start issue reporting. Please try again.',
//         messageID
//       );
//     }
//   }

//   async sendTextMessage(recipient: string, message: string, messageID?: string): Promise<boolean> {
//     try {
//       const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
//       const version = this.configService.get<string>('WHATSAPP_API_VERSION');
//       const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

//       if (!phoneNumberId || !version || !accessToken) {
//         throw new BadRequestException('Missing WhatsApp configuration');
//       }

//       const messageData: MessageData = {
//         messaging_product: 'whatsapp',
//         recipient_type: 'individual',
//         to: recipient,
//         type: 'text',
//         text: {
//           preview_url: false,
//           body: message,
//         },
//       };

//       // Add context if provided
//       if (messageID) {
//         messageData['context'] = { message_id: messageID };
//       }

//       const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

//       const response$ = this.httpService.post(url, messageData, {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           'Content-Type': 'application/json',
//         },
//       })
//       .pipe(
//         map((res: AxiosResponse) => res.data),
//         catchError((error) => {
//           this.logger.error('WhatsApp API Error:', error.response?.data || error.message);
//           throw new BadRequestException('Error posting to WhatsApp Cloud API');
//         }),
//       );

//       await firstValueFrom(response$);
//       return true;
//     } catch (error) {
//       this.logger.error('Error sending text message:', error);
//       return false;
//     }
//   }

//   private async sendWhatsappMessage(messageData: MessageData, contextMessageId?: string): Promise<boolean> {
//     try {
//       const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
//       const version = this.configService.get<string>('WHATSAPP_API_VERSION');
//       const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

//       if (!phoneNumberId || !version || !accessToken) {
//         throw new BadRequestException('Missing WhatsApp configuration');
//       }

//       // Add context if provided
//       if (contextMessageId) {
//         messageData['context'] = { message_id: contextMessageId };
//       }

//       const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

//       const response$ = this.httpService.post(url, messageData, {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           'Content-Type': 'application/json',
//         },
//       })
//       .pipe(
//         map((res: AxiosResponse) => res.data),
//         catchError((error) => {
//           this.logger.error('WhatsApp API Error:', error.response?.data || error.message);
//           throw new BadRequestException('Error posting to WhatsApp Cloud API');
//         }),
//       );

//       await firstValueFrom(response$);
//       return true;
//     } catch (error) {
//       this.logger.error('Error sending WhatsApp message:', error);
//       return false;
//     }
//   }

//   async markMessageAsRead(messageID: string): Promise<boolean> {
//     try {
//       const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
//       const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
//       const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION');

//       if (!phoneNumberId || !accessToken) {
//         this.logger.error('Missing WhatsApp configuration for mark as read');
//         return false;
//       }

//       const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

//       const config = {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           'Content-Type': 'application/json'
//         },
//         timeout: this.API_TIMEOUT
//       };

//       const data = {
//         messaging_product: 'whatsapp',
//         status: 'read',
//         message_id: messageID.trim(),
//       };

//       this.logger.debug(`Marking message as read: ${messageID}`);

//       const response = await firstValueFrom(
//         this.httpService.post(url, data, config).pipe(
//           timeout(this.API_TIMEOUT),
//           catchError(error => {
//             this.logger.error('Error marking message as read:', error.message);
//             throw error;
//           })
//         )
//       );

//       if (response.status === 200) {
//         this.logger.log(`Successfully marked message ${messageID} as read`);
//         return true;
//       } else {
//         this.logger.warn(`Unexpected response when marking message as read: ${response.status}`);
//         return false;
//       }
//     } catch (error) {
//       this.logger.error('Error marking message as read:', error);
//       return false;
//     }
//   }

//   async getMediaUrl(mediaId: string): Promise<string> {
//     try {
//       const version = this.configService.get<string>('WHATSAPP_API_VERSION');
//       const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

//       const url = `https://graph.facebook.com/${version}/${mediaId}`;
      
//       const response = await firstValueFrom(
//         this.httpService.get(url, {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//           },
//         }).pipe(
//           timeout(this.API_TIMEOUT),
//           catchError(error => {
//             this.logger.error('Error getting media URL:', error);
//             throw error;
//           })
//         )
//       );

//       return response.data.url;
//     } catch (error) {
//       this.logger.error('Failed to get media URL:', error);
//       throw error;
//     }
//   }

//   async downloadMedia(mediaUrl: string): Promise<Buffer> {
//     try {
//       const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

//       const response = await firstValueFrom(
//         this.httpService.get(mediaUrl, {
//           responseType: 'arraybuffer',
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//           },
//         }).pipe(
//           timeout(this.API_TIMEOUT),
//           catchError(error => {
//             this.logger.error('Error downloading media:', error);
//             throw error;
//           })
//         )
//       );

//       return Buffer.from(response.data);
//     } catch (error) {
//       this.logger.error('Failed to download media:', error);
//       throw error;
//     }
//   }

//   getFileExtensionFromMimeType(mimeType: string): string {
//     const extensionMap: { [key: string]: string } = {
//       'image/jpeg': 'jpg',
//       'image/png': 'png',
//       'image/gif': 'gif',
//       'audio/ogg': 'ogg',
//       'audio/aac': 'aac',
//       'audio/mp4': 'm4a',
//       'audio/mpeg': 'mp3',
//       'audio/amr': 'amr',
//       'video/mp4': 'mp4',
//       'video/3gpp': '3gp',
//       'video/quicktime': 'mov',
//       'application/pdf': 'pdf',
//       'application/msword': 'doc',
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
//     };
    
//     return extensionMap[mimeType] || 'bin';
//   }

//   // Validation methods
//   validateEmail(email: string): boolean {
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return emailRegex.test(email);
//   }

//   validatePassword(password: string): boolean {
//     // At least 10 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
//     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;
//     return passwordRegex.test(password);
//   }

//   validateIdNumber(idNumber: string): boolean {
//     // Basic validation - can be customized per country
//     return idNumber.length >= 6 && idNumber.length <= 20;
//   }

//   // Cleanup old registration sessions
//   cleanupOldRegistrationSessions(): void {
//     const now = Date.now();
//     const SESSION_TTL = 30 * 60 * 1000; // 30 minutes
    
//     for (const [phoneNumber, registration] of this.usersInRegistration.entries()) {
//       if (now - registration.lastActive > SESSION_TTL) {
//         this.usersInRegistration.delete(phoneNumber);
//         this.logger.log(`Cleaned up expired registration session for ${phoneNumber}`);
        
//         // Also clean up database session
//         this.sessionManager.cancelSession(phoneNumber, SessionType.REGISTRATION)
//           .catch(error => this.logger.error('Error cleaning up database registration session:', error));
//       }
//     }
//   }
// }

// // whatsapp.controller.ts
// /* eslint-disable @typescript-eslint/no-unsafe-call */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-argument */
// /* eslint-disable prettier/prettier */
// import {
//   Controller,
//   Get,
//   Post,
//   Query,
//   Body,
//   HttpCode,
//   Logger
// } from '@nestjs/common';
// import { WhatsappService } from './whatsapp.service';

// @Controller('whatsapp')
// export class WhatsappController {
//   private readonly logger = new Logger(WhatsappController.name);

//   constructor(private readonly whatsappService: WhatsappService) {}

//   @Get('test')
//   testGetResponse(): string {
//     return this.whatsappService.getTestMessage();
//   }

//   @Get('webhook')
//   whatsappVerificationChallenge(
//     @Query('hub.mode') mode: string,
//     @Query('hub.challenge') challenge: string,
//     @Query('hub.verify_token') token: string,
//   ) {
//     this.logger.log(`Webhook verification attempt: mode=${mode}, token=${token}`);
//     return this.whatsappService.verifyWebhook(mode, token, challenge);
//   }

//   @Post('webhook')
//   @HttpCode(200)
//   async handleIncomingWhatsappMessage(@Body() request: any) {
//     this.logger.log('Received webhook payload');

//     try{
//         // Log the incoming request for debugging
//         if (request?.entry?.[0]?.changes?.[0]?.value?.messages) {
//             const messages = request.entry[0].changes[0].value.messages;
//             messages.forEach((msg: any) => {
//                 this.logger.log(`Processing message from ${msg.from}: type=${msg.type}`);
//             });
//         }

//         // Process the message
//         await this.whatsappService.handleIncomingMessage(request);

//         return {status: 'success', message: 'Message Processed'};
//     } catch (error) {
//         this.logger.log('Error processing webhook:', error);
//         return {status: 'error', message: error.message};
//     }
//   }
// }

// // cleanup.service.ts
// /* eslint-disable prettier/prettier */
// import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { SessionManagerService } from './session-manager.service';

// @Injectable()
// export class SessionCleanupService {
//   private readonly logger = new Logger(SessionCleanupService.name);

//   constructor(private readonly sessionManager: SessionManagerService) {}

//   @Cron(CronExpression.EVERY_HOUR)
//   async handleSessionCleanup() {
//     this.logger.log('Starting session cleanup...');
//     try {
//       await this.sessionManager.performAllCleanup();
//       this.logger.log('Session cleanup completed');
//     } catch (error) {
//       this.logger.error('Error during session cleanup:', error);
//     }
//   }
// }

// // emergency-reporting.service.ts
// /* eslint-disable @typescript-eslint/no-require-imports */
// /* eslint-disable @typescript-eslint/restrict-template-expressions */
// /* eslint-disable @typescript-eslint/no-unsafe-return */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-unsafe-call */
// /* eslint-disable @typescript-eslint/require-await */
// /* eslint-disable @typescript-eslint/no-unsafe-argument */
// /* eslint-disable prettier/prettier */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// import { Injectable, Logger } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, Between, MoreThanOrEqual } from 'typeorm';
// import { EmergencyReport, EmergencyType, EmergencyStatus, EmergencyPriority } from '../../database/emergency-report.entity';
// import { User } from '../../database/user.entity';
// import { AnalyticsDaily, LocationAnalytics, UserAnalytics, DepartmentAnalytics } from '../../database/analytics.entity';
// import { SessionManagerService } from './session-manager.service';
// import { SessionType } from '../../database/session.entity';
// import { MessagingService } from './messaging.service';
// import { StorageService } from './storage.service';
// import * as crypto from 'crypto';
// import { writeFileSync, mkdirSync, existsSync } from 'fs';
// import { join } from 'path';

// interface EmergencySession {
//   phoneNumber: string;
//   currentStep: number;
//   data: Partial<EmergencyReport> & {
//     mediaUrls?: string[];
//     additionalNotes?: string[];
//     isReadyToSubmit?: boolean;
//   };
//   lastActive: number;
//   messageID: string;
// }

// @Injectable()
// export class EmergencyReportingService {
//   private readonly logger = new Logger(EmergencyReportingService.name);
//   private readonly emergencySessions = new Map<string, EmergencySession>();
//   private readonly CONSOLIDATION_DISTANCE = 0.0001; // Approximately 10 meters
//   private readonly SESSION_TTL = 30 * 60 * 1000; // 30 minutes

//   // Add media storage directories
//   private readonly baseDir = 'C:/Users/ACER/Documents/CourseGenerator/chatbot/uploads';
//   private readonly emergencyImagesDir = join(this.baseDir, 'emergency_images');
//   private readonly emergencyVoiceNotesDir = join(this.baseDir, 'emergency_voice_notes');
//   private readonly emergencyVideosDir = join(this.baseDir, 'emergency_videos');

//   // Enhanced emergency type mapping with natural language keywords
//   private readonly emergencyTypeKeywords = {
//     [EmergencyType.FIRE]: [
//       'fire', 'fire emergency', 'there is a fire', 'building fire', 'house fire', 
//       'forest fire', 'fire outbreak', 'fire incident', 'reporting on fire',
//       '🔥', 'flames', 'burning', 'smoke'
//     ],
//     [EmergencyType.AMBULANCE]: [
//       'ambulance', 'medical emergency', 'need ambulance', 'medical help',
//       'heart attack', 'stroke', 'seizure', 'unconscious', 'bleeding',
//       'medical assistance', '🚑', 'paramedic'
//     ],
//     [EmergencyType.ROBBERY]: [
//       'robbery', 'robbery in progress', 'being robbed', 'theft', 'burglary',
//       'break in', 'stolen', 'robbers', 'armed robbery', '🚔', 'crime'
//     ],
//     [EmergencyType.ACCIDENT]: [
//       'accident', 'traffic accident', 'car accident', 'road accident',
//       'vehicle accident', 'crash', 'collision', '🚗', 'car crash'
//     ],
//     [EmergencyType.MEDICAL]: [
//       'medical', 'medical emergency', 'health emergency', 'sick', 'illness',
//       'injury', 'wound', 'pain', 'emergency medical', '🏥', 'doctor'
//     ],
//     [EmergencyType.CRIME]: [
//       'crime', 'criminal activity', 'criminal', 'assault', 'violence',
//       'attack', 'fighting', 'disturbance', 'public disorder', '👮', 'police'
//     ],
//     [EmergencyType.NATURAL_DISASTER]: [
//       'natural disaster', 'earthquake', 'flood', 'storm', 'cyclone',
//       'hurricane', 'tornado', 'landslide', 'tsunami', '🌪️', 'disaster'
//     ],
//     [EmergencyType.OTHER]: [
//       'other', 'unknown', 'unsure', 'miscellaneous', 'general emergency',
//       'help needed', 'emergency situation'
//     ]
//   };

//   constructor(
//     @InjectRepository(EmergencyReport)
//     private emergencyRepository: Repository<EmergencyReport>,
//     @InjectRepository(AnalyticsDaily)
//     private analyticsRepository: Repository<AnalyticsDaily>,
//     @InjectRepository(LocationAnalytics)
//     private locationAnalyticsRepository: Repository<LocationAnalytics>,
//     @InjectRepository(UserAnalytics)
//     private userAnalyticsRepository: Repository<UserAnalytics>,
//     @InjectRepository(DepartmentAnalytics)
//     private departmentAnalyticsRepository: Repository<DepartmentAnalytics>,
//     @InjectRepository(User)
//     private userRepository: Repository<User>,
//     private readonly messagingService: MessagingService,
//     private readonly sessionManager: SessionManagerService,
//     private readonly storageService: StorageService,
//   ) {
//     this.ensureMediaDirs();
//   }

//   private ensureMediaDirs() {
//     try {
//       if (!existsSync(this.baseDir)) mkdirSync(this.baseDir);
//       if (!existsSync(this.emergencyImagesDir)) mkdirSync(this.emergencyImagesDir);
//       if (!existsSync(this.emergencyVoiceNotesDir)) mkdirSync(this.emergencyVoiceNotesDir);
//       if (!existsSync(this.emergencyVideosDir)) mkdirSync(this.emergencyVideosDir);
//     } catch (error) {
//       this.logger.error('Error creating media directories', error);
//     }
//   }

//   // Check if user has active emergency session
//   hasActiveEmergencySession(phoneNumber: string): boolean {
//     const session = this.emergencySessions.get(phoneNumber);
//     if (!session) return false;
    
//     const isActive = (Date.now() - session.lastActive) < this.SESSION_TTL;
//     if (!isActive) {
//       this.emergencySessions.delete(phoneNumber);
//       return false;
//     }
//     return true;
//   }

//   async getEmergencySession(phoneNumber: string): Promise<EmergencySession | null> {
//     return this.emergencySessions.get(phoneNumber) || null;
//   }

//   async cancelEmergencyReport(phoneNumber: string): Promise<void> {
//     this.emergencySessions.delete(phoneNumber);
//     await this.sessionManager.cancelSession(phoneNumber, SessionType.EMERGENCY);
//   }

//   // Start emergency reporting flow
//   async startEmergencyReport(phoneNumber: string, messageID: string): Promise<boolean> {
//     try {
//       // Create in-memory session
//       const sessionData: Partial<EmergencyReport> & {
//         mediaUrls?: string[];
//         additionalNotes?: string[];
//         isReadyToSubmit?: boolean;
//       } = {
//         reportingPhoneNumber: phoneNumber,
//         status: EmergencyStatus.REPORTED,
//         priority: EmergencyPriority.MEDIUM,
//         mediaUrls: [],
//         additionalNotes: [],
//         isReadyToSubmit: false,
//       };

//       this.emergencySessions.set(phoneNumber, {
//         phoneNumber,
//         currentStep: 1,
//         data: sessionData,
//         lastActive: Date.now(),
//         messageID
//       });

//       // Create database active session for NLP locking
//       await this.sessionManager.createOrUpdateActiveSession(
//         phoneNumber,
//         SessionType.EMERGENCY,
//         1, // Starting step
//         {
//           ...sessionData,
//           startedAt: new Date(),
//           messageId: messageID,
//           emergencyType: 'user_initiated'
//         },
//         messageID
//       );

//       const welcomeMessage = `🚨 *EMERGENCY REPORTING* 🚨

// We're here to help! Please tell us what type of emergency you're reporting:

// *You can say:*
// • "Fire" or "There's a fire" 🔥
// • "Ambulance" or "Medical emergency" 🚑
// • "Robbery" or "Crime in progress" 👮
// • "Accident" or "Car crash" 🚗
// • "Medical help" or "Someone is sick" 🏥
// • "Natural disaster" or "Flood" 🌪️
// • "Other emergency"

// *Or choose from:*
// 1️⃣ FIRE - Fire emergency
// 2️⃣ AMBULANCE - Medical transport needed
// 3️⃣ ROBBERY - Robbery/theft in progress
// 4️⃣ ACCIDENT - Traffic accident
// 5️⃣ MEDICAL - Medical emergency
// 6️⃣ CRIME - Criminal activity
// 7️⃣ NATURAL_DISASTER - Natural disaster
// 8️⃣ OTHER - Other emergency

// *Examples:* "Fire emergency", "Reporting a robbery", "Need ambulance", "There's been an accident"`;

//       await this.messagingService.sendTextMessage(phoneNumber, welcomeMessage, messageID);
//       this.logger.log(`Emergency session started for ${phoneNumber} with database session`);
//       return true;
//     } catch (error) {
//       this.logger.error('Error starting emergency report:', error);
//       return false;
//     }
//   }

//   // Handle emergency reporting steps
//   async handleEmergencyReporting(phoneNumber: string, text: string, messageID: string): Promise<boolean> {
//     try {
//       const session = this.emergencySessions.get(phoneNumber);
//       if (!session) {
//         // Start new emergency report if user types "EMERGENCY" or emergency-related phrases
//         const normalizedText = text.toLowerCase().trim();
//         if (normalizedText === 'emergency' || 
//             normalizedText.includes('emergency') ||
//             normalizedText.includes('help') ||
//             normalizedText.includes('urgent')) {
//           return await this.startEmergencyReport(phoneNumber, messageID);
//         }
//         return false;
//       }

//       // Update session activity
//       session.lastActive = Date.now();
//       session.messageID = messageID;
//       this.emergencySessions.set(phoneNumber, session);

//       // Update database session activity
//       await this.updateEmergencySession(phoneNumber, session);

//       // Check if user wants to submit
//       if (session.currentStep >= 4 && text.toLowerCase().trim() === 'submit') {
//         await this.completeEmergencyReport(phoneNumber, session);
//         return true;
//       }

//       // Check if user wants to add more media
//       if (session.currentStep === 4 && text.toLowerCase().trim() === 'add more') {
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '📸 You can send more photos, videos, or voice notes.\n\nWhen you\'re ready to submit, type "SUBMIT"',
//           messageID
//         );
//         return true;
//       }

//       switch (session.currentStep) {
//         case 1: // Emergency Type
//           return await this.handleEmergencyType(phoneNumber, text, session);
//         case 2: // Description
//           return await this.handleDescription(phoneNumber, text, session);
//         case 3: // Location
//           return await this.handleLocation(phoneNumber, text, session);
//         case 4: // Media and final confirmation
//           return await this.handleMediaStep(phoneNumber, text, session);
//         default:
//           await this.completeEmergencyReport(phoneNumber, session);
//           return true;
//       }
//     } catch (error) {
//       this.logger.error('Error handling emergency reporting:', error);
//       return false;
//     }
//   }

//   // Update database emergency session
//   private async updateEmergencySession(phoneNumber: string, session: EmergencySession): Promise<void> {
//     try {
//       await this.sessionManager.createOrUpdateActiveSession(
//         phoneNumber,
//         SessionType.EMERGENCY,
//         session.currentStep,
//         {
//           ...session.data,
//           currentStep: session.currentStep,
//           lastActive: new Date(session.lastActive),
//           messageId: session.messageID
//         },
//         session.messageID
//       );
//     } catch (error) {
//       this.logger.error('Error updating emergency session in database:', error);
//       // Don't throw - continue with in-memory session
//     }
//   }

//   // Enhanced emergency type detection with natural language processing
//   private detectEmergencyTypeFromText(text: string): EmergencyType | null {
//     const normalizedText = text.toLowerCase().trim();
    
//     // Check for exact matches first
//     const validTypes = Object.values(EmergencyType);
//     if (validTypes.includes(normalizedText.toUpperCase() as EmergencyType)) {
//       return normalizedText.toUpperCase() as EmergencyType;
//     }

//     // Check for number selections (1-8)
//     const numberMap = {
//       '1': EmergencyType.FIRE,
//       '1️⃣': EmergencyType.FIRE,
//       '2': EmergencyType.AMBULANCE,
//       '2️⃣': EmergencyType.AMBULANCE,
//       '3': EmergencyType.ROBBERY,
//       '3️⃣': EmergencyType.ROBBERY,
//       '4': EmergencyType.ACCIDENT,
//       '4️⃣': EmergencyType.ACCIDENT,
//       '5': EmergencyType.MEDICAL,
//       '5️⃣': EmergencyType.MEDICAL,
//       '6': EmergencyType.CRIME,
//       '6️⃣': EmergencyType.CRIME,
//       '7': EmergencyType.NATURAL_DISASTER,
//       '7️⃣': EmergencyType.NATURAL_DISASTER,
//       '8': EmergencyType.OTHER,
//       '8️⃣': EmergencyType.OTHER
//     };

//     if (numberMap[normalizedText]) {
//       return numberMap[normalizedText];
//     }

//     // Check keyword matches
//     for (const [emergencyType, keywords] of Object.entries(this.emergencyTypeKeywords)) {
//       for (const keyword of keywords) {
//         if (normalizedText.includes(keyword.toLowerCase())) {
//           return emergencyType as EmergencyType;
//         }
//       }
//     }

//     return null;
//   }

//   /**
//    * Start emergency report with NLP context
//    */
//   async startEmergencyReportWithContext(
//     phoneNumber: string, 
//     messageID: string,
//     context: {
//       detectedType: string;
//       originalMessage: string;
//       confidence: number;
//       keywords: string[];
//       nlpMetadata?: any;
//     }
//   ): Promise<boolean> {
//     try {
//       // Map detected type to EmergencyType
//       const emergencyType = this.mapNlpTypeToEmergencyType(context.detectedType);

//       const sessionData: Partial<EmergencyReport> & {
//         mediaUrls?: string[];
//         additionalNotes?: string[];
//         isReadyToSubmit?: boolean;
//       } = {
//         reportingPhoneNumber: phoneNumber,
//         status: EmergencyStatus.REPORTED,
//         priority: this.getPriorityFromType(emergencyType),
//         type: emergencyType,
//         description: `NLP Detected: ${context.originalMessage}\nConfidence: ${context.confidence}\nKeywords: ${context.keywords.join(', ')}`,
//         mediaUrls: [],
//         additionalNotes: [],
//         isReadyToSubmit: false,
//       };
      
//       // Create in-memory session
//       this.emergencySessions.set(phoneNumber, {
//         phoneNumber,
//         currentStep: 2, // Skip type selection since we detected it
//         data: sessionData,
//         lastActive: Date.now(),
//         messageID
//       });

//       // Create database active session
//       await this.sessionManager.createOrUpdateActiveSession(
//         phoneNumber,
//         SessionType.EMERGENCY,
//         2, // Starting at step 2
//         {
//           ...sessionData,
//           startedAt: new Date(),
//           messageId: messageID,
//           emergencyType: 'nlp_detected',
//           nlpContext: context
//         },
//         messageID
//       );

//       const confirmationMessage = `🚨 *EMERGENCY DETECTED: ${emergencyType}* 🚨\n\nI understand you're reporting a ${context.detectedType} emergency.\n\n${this.getEmergencyTypeConfirmation(emergencyType)}`;

//       await this.messagingService.sendTextMessage(phoneNumber, confirmationMessage, messageID);
//       this.logger.log(`NLP-triggered emergency session started for ${phoneNumber}`);
//       return true;
//     } catch (error) {
//       this.logger.error('Error starting emergency report with context:', error);
//       // Fallback to regular emergency flow
//       return await this.startEmergencyReport(phoneNumber, messageID);
//     }
//   }

//   /**
//    * Map NLP detected type to EmergencyType enum
//    */
//   private mapNlpTypeToEmergencyType(nlpType: string): EmergencyType {
//     const typeMap: { [key: string]: EmergencyType } = {
//       'robbery': EmergencyType.ROBBERY,
//       'violence': EmergencyType.CRIME,
//       'medical': EmergencyType.MEDICAL,
//       'fire': EmergencyType.FIRE,
//       'accident': EmergencyType.ACCIDENT,
//       'danger': EmergencyType.OTHER,
//       'kidnapping': EmergencyType.CRIME,
//       'weapons': EmergencyType.CRIME,
//       'general': EmergencyType.OTHER
//     };

//     return typeMap[nlpType] || EmergencyType.OTHER;
//   }

//   /**
//    * Get priority based on emergency type
//    */
//   private getPriorityFromType(emergencyType: EmergencyType): EmergencyPriority {
//     switch (emergencyType) {
//       case EmergencyType.FIRE:
//       case EmergencyType.ROBBERY:
//       case EmergencyType.CRIME:
//         return EmergencyPriority.CRITICAL;
//       case EmergencyType.AMBULANCE:
//       case EmergencyType.MEDICAL:
//       case EmergencyType.ACCIDENT:
//         return EmergencyPriority.HIGH;
//       default:
//         return EmergencyPriority.MEDIUM;
//     }
//   }

//   private async handleEmergencyType(phoneNumber: string, text: string, session: EmergencySession): Promise<boolean> {
//     const detectedType = this.detectEmergencyTypeFromText(text);
    
//     if (!detectedType) {
//       const typeList = Object.entries(this.emergencyTypeKeywords)
//         .map(([type, keywords]) => {
//           const mainKeywords = keywords.slice(0, 3).join(', ');
//           return `• *${type}* - Examples: "${mainKeywords}"`;
//         })
//         .join('\n');

//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         `❌ I couldn't identify the emergency type from your message.\n\nPlease choose from:\n\n${typeList}\n\n*Examples:* "Fire emergency", "Need ambulance", "Reporting a robbery", "There's been an accident"`,
//         session.messageID
//       );
//       return true;
//     }

//     session.data.type = detectedType;
    
//     // Set priority based on emergency type
//     switch (detectedType) {
//       case EmergencyType.FIRE:
//       case EmergencyType.ROBBERY:
//       case EmergencyType.CRIME:
//         session.data.priority = EmergencyPriority.CRITICAL;
//         break;
//       case EmergencyType.AMBULANCE:
//       case EmergencyType.MEDICAL:
//       case EmergencyType.ACCIDENT:
//         session.data.priority = EmergencyPriority.HIGH;
//         break;
//       default:
//         session.data.priority = EmergencyPriority.MEDIUM;
//     }

//     session.currentStep = 2;

//     const confirmationMessage = this.getEmergencyTypeConfirmation(detectedType);
//     await this.messagingService.sendTextMessage(
//       phoneNumber,
//       confirmationMessage,
//       session.messageID
//     );

//     return true;
//   }

//   // Get appropriate confirmation message based on emergency type
//   private getEmergencyTypeConfirmation(emergencyType: EmergencyType): string {
//     const baseMessage = `✅ Emergency type confirmed: ${emergencyType}\n\n📝 *Step 2: Please describe the emergency*\n\n`;
    
//     const typeSpecificPrompts = {
//       [EmergencyType.FIRE]: `${baseMessage}Provide details about:\n• Location of the fire\n• Size and intensity\n• Any people trapped\n• Visible smoke or flames\n• Nearby buildings at risk`,
//       [EmergencyType.AMBULANCE]: `${baseMessage}Provide details about:\n• Number of people affected\n• Nature of medical issue\n• Conscious/unconscious status\n• Any visible injuries\n• Current condition`,
//       [EmergencyType.ROBBERY]: `${baseMessage}Provide details about:\n• Location of incident\n• Number of suspects\n• Weapons involved\n• Suspect descriptions\n• Current situation`,
//       [EmergencyType.ACCIDENT]: `${baseMessage}Provide details about:\n• Number of vehicles involved\n• Injuries observed\n• Road blockage\n• Hazardous materials\n• Exact location details`,
//       [EmergencyType.MEDICAL]: `${baseMessage}Provide details about:\n• Symptoms observed\n• Duration of condition\n• Age of affected person\n• Any known medical conditions\n• Current consciousness level`,
//       [EmergencyType.CRIME]: `${baseMessage}Provide details about:\n• Type of criminal activity\n• Suspect information\n• Weapons involved\n• Time incident occurred\n• Witness information`,
//       [EmergencyType.NATURAL_DISASTER]: `${baseMessage}Provide details about:\n• Type of natural disaster\n• Area affected\n• People in danger\n• Infrastructure damage\n• Immediate threats`,
//       [EmergencyType.OTHER]: `${baseMessage}Provide details about:\n• What happened\n• Number of people involved\n• Current situation\n• Any immediate dangers\n• Specific assistance needed`
//     };

//     return typeSpecificPrompts[emergencyType] || typeSpecificPrompts[EmergencyType.OTHER];
//   }

//   private async handleDescription(phoneNumber: string, text: string, session: EmergencySession): Promise<boolean> {
//     if (text.length < 10) {
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Please provide a more detailed description (at least 10 characters). This helps emergency services respond appropriately.',
//         session.messageID
//       );
//       return true;
//     }

//     session.data.description = text;
//     session.currentStep = 3;

//      // Update database session
//     await this.updateEmergencySession(phoneNumber, session);

//     await this.messagingService.sendTextMessage(
//       phoneNumber,
//       `✅ Description received.\n\n📍 *Step 3: Please provide your location*\n\nYou can:\n• Type your current address/location\n• Or send your location using WhatsApp's location sharing\n• Or send coordinates (latitude, longitude)\n\n*Examples:* "123 Main Street, City" or "17.8292, 31.0522" or "Near the shopping center"`,
//       session.messageID
//     );

//     return true;
//   }

//   private async handleLocation(phoneNumber: string, text: string, session: EmergencySession): Promise<boolean> {
//     if (text.length < 5) {
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Please provide a valid location or address (at least 5 characters). Accurate location helps emergency services find you quickly.',
//         session.messageID
//       );
//       return true;
//     }

//     session.data.location = text;
//     session.currentStep = 4;

//     // Update database session
//     await this.updateEmergencySession(phoneNumber, session);

//     await this.messagingService.sendTextMessage(
//       phoneNumber,
//       `✅ Location received: ${text}\n\n📸 *Step 4: Media & Final Review*\n\nYou can now:\n• Send photos/videos of the situation\n• Send voice notes with additional details\n• Type additional notes if needed\n• When ready, type "SUBMIT" to send your emergency report\n\nYou can send multiple media files. After each media, you'll have the option to add more or submit.`,
//       session.messageID
//     );

//     return true;
//   }

//   private async handleMediaStep(phoneNumber: string, text: string, session: EmergencySession): Promise<boolean> {
//     const normalizedText = text.toLowerCase().trim();
    
//     // Handle submission
//     if (normalizedText === 'submit') {
//       if (!session.data.isReadyToSubmit) {
//         session.data.isReadyToSubmit = true;
//         await this.showSubmissionConfirmation(phoneNumber, session);
//         return true;
//       }
//       // If already confirmed, proceed with submission
//       await this.completeEmergencyReport(phoneNumber, session);
//       return true;
//     }

//     // Handle cancel submission
//     if (normalizedText === 'cancel') {
//       session.data.isReadyToSubmit = false;
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         'Submission cancelled. You can continue adding media or type "SUBMIT" when ready.',
//         session.messageID
//       );
//       return true;
//     }

//     // Handle add more media
//     if (normalizedText === 'add more') {
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         'You can send more photos, videos, or voice notes.\n\nWhen ready, type "SUBMIT"',
//         session.messageID
//       );
//       return true;
//     }

//     // If it's not a command, treat as additional note
//     session.data.additionalNotes = session.data.additionalNotes || [];
//     session.data.additionalNotes.push(text);
    
//     await this.messagingService.sendTextMessage(
//       phoneNumber,
//       `📝 Note added. You have ${session.data.additionalNotes.length} note(s).\n\nSend more media, add more notes, or type "SUBMIT" when ready.`,
//       session.messageID
//     );

//     return true;
//   }

//   private async showSubmissionConfirmation(phoneNumber: string, session: EmergencySession): Promise<void> {
//     const mediaCount = session.data.mediaUrls?.length || 0;
//     const noteCount = session.data.additionalNotes?.length || 0;
    
//     let confirmationMessage = `🚨 *REVIEW YOUR EMERGENCY REPORT* 🚨\n\n`;
//     confirmationMessage += `📋 *Type:* ${session.data.type}\n`;
//     confirmationMessage += `🚨 *Priority:* ${session.data.priority}\n`;
//     confirmationMessage += `📍 *Location:* ${session.data.location}\n`;
//     confirmationMessage += `📝 *Description:* ${session.data.description?.substring(0, 100)}${session.data.description && session.data.description.length > 100 ? '...' : ''}\n`;
//     confirmationMessage += `📸 *Media files:* ${mediaCount}\n`;
//     confirmationMessage += `📝 *Additional notes:* ${noteCount}\n\n`;
//     confirmationMessage += `*Are you ready to submit this emergency report?*\n\n`;
//     confirmationMessage += `Type "SUBMIT" again to confirm and send to emergency services\n`;
//     confirmationMessage += `Type "CANCEL" to go back and add more information\n`;
//     confirmationMessage += `Type "ADD MORE" to add more media or notes`;

//     await this.messagingService.sendTextMessage(phoneNumber, confirmationMessage, session.messageID);
//   }

//   // Handle media in emergency reporting
//   async handleMediaInEmergency(phoneNumber: string, mediaType: 'image' | 'voice' | 'video', mediaUrl: string, messageID: string, mimeType?: string): Promise<boolean> {
//     const session = this.emergencySessions.get(phoneNumber);
//     if (!session || session.currentStep !== 4) {
//       return false;
//     }

//     try {
//       // Download media from WhatsApp
//       const mediaBuffer = await this.downloadMediaFromWhatsApp(mediaUrl);
      
//       // Save to local file system
//       const localFilePath = await this.saveMediaFile(mediaBuffer, phoneNumber, mediaType, mimeType || this.getDefaultMimeType(mediaType));

//       // Initialize mediaUrls array if it doesn't exist
//       let mediaUrlsString: string | undefined;
//       if (session.data.mediaUrls && session.data.mediaUrls.length > 0) {
//         mediaUrlsString = JSON.stringify(session.data.mediaUrls);
//       }
      
//       // Store the media file path
//       session.data.mediaUrls?.push(localFilePath);

//       // Update specific media type field for backward compatibility
//       if (mediaType === 'image') {
//         session.data.imageUrl = localFilePath;
//       } else if (mediaType === 'voice') {
//         session.data.voiceNoteUrl = localFilePath;
//       } else if (mediaType === 'video') {
//         // In emergency reports, we might want to store video separately
//         session.data.videoUrl = localFilePath;
//       }

//       session.lastActive = Date.now();
//       this.emergencySessions.set(phoneNumber, session);

//       // Update database session
//       await this.updateEmergencySession(phoneNumber, session);

//       const mediaCount = session.data.mediaUrls?.length;
      
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         `✅ ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} received! You now have ${mediaCount} media file(s).\n\nYou can:\n• Send more photos/videos/voice notes\n• Type additional notes\n• Type "SUBMIT" when ready to send the report`,
//         messageID
//       );
//       return true;
//     } catch (error) {
//       this.logger.error('Error handling media in emergency:', error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         `❌ Failed to process your ${mediaType}. Please try again or type "submit" to continue without media.`,
//         messageID
//       );
//       return false;
//     }
//   }

//   private async downloadMediaFromWhatsApp(mediaUrl: string): Promise<Buffer> {
//     const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

//     try {
//       const axios = require('axios');
//       const response = await axios.get(mediaUrl, {
//         responseType: 'arraybuffer',
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//         timeout: 30000,
//       });
//       return Buffer.from(response.data);
//     } catch (error) {
//       this.logger.error('Media download failed:', error);
//       throw new Error('Failed to download media from WhatsApp');
//     }
//   }

//   private getDefaultMimeType(mediaType: 'image' | 'voice' | 'video'): string {
//     const defaultMimeTypes: { [key: string]: string } = {
//       'image': 'image/jpeg',
//       'voice': 'audio/ogg', 
//       'video': 'video/mp4'
//     };
//     return defaultMimeTypes[mediaType];
//   }

//   private async saveMediaFile(buffer: Buffer, phoneNumber: string, mediaType: 'image' | 'voice' | 'video', originalMimeType: string): Promise<string> {
//     try {
//       const timestamp = Date.now();
//       const extension = this.getFileExtensionFromMimeType(originalMimeType);
      
//       let filename: string;
//       let dir: string;

//       switch (mediaType) {
//         case 'image':
//           filename = `emergency_image_${phoneNumber}_${timestamp}.${extension}`;
//           dir = this.emergencyImagesDir;
//           break;
//         case 'voice':
//           filename = `emergency_voice_${phoneNumber}_${timestamp}.${extension}`;
//           dir = this.emergencyVoiceNotesDir;
//           break;
//         case 'video':
//           filename = `emergency_video_${phoneNumber}_${timestamp}.${extension}`;
//           dir = this.emergencyVideosDir;
//           break;
//         default:
//           throw new Error(`Unsupported media type: ${mediaType}`);
//       }

//       const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
//       const filePath = join(dir, sanitizedFilename);
      
//       writeFileSync(filePath, buffer);
//       return filePath;
//     } catch (error) {
//       this.logger.error(`Error saving ${mediaType} file for ${phoneNumber}`, error);
//       throw new Error(`Failed to save ${mediaType} file`);
//     }
//   }

//   private getFileExtensionFromMimeType(mimeType: string): string {
//     const extensionMap: { [key: string]: string } = {
//       'image/jpeg': 'jpg',
//       'image/png': 'png',
//       'image/gif': 'gif',
//       'audio/ogg': 'ogg',
//       'audio/aac': 'aac',
//       'audio/mp4': 'm4a',
//       'audio/mpeg': 'mp3',
//       'audio/amr': 'amr',
//       'video/mp4': 'mp4',
//       'video/3gpp': '3gp',
//       'video/quicktime': 'mov'
//     };
    
//     return extensionMap[mimeType] || 'bin';
//   }

//   // Handle location in emergency reporting
//   async handleLocationInEmergency(phoneNumber: string, latitude: number, longitude: number, messageID: string): Promise<boolean> {
//     const session = this.emergencySessions.get(phoneNumber);
//     if (!session || session.currentStep !== 3) {
//       return false;
//     }

//     try {
//       session.data.latitude = latitude;
//       session.data.longitude = longitude;
//       session.data.location = `${latitude}, ${longitude}`;
//       session.currentStep = 4;

//       // Update database session
//       await this.updateEmergencySession(phoneNumber, session);

//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         `✅ Location coordinates received.\n\n📸 *Step 4: Media & Final Review*\n\nYou can now:\n• Send photos/videos of the situation\n• Send voice notes with additional details\n• Type additional notes if needed\n• When ready, type "SUBMIT" to send your emergency report\n\nYou can send multiple media files. After each media, you'll have the option to add more or submit.`,
//         messageID
//       );

//       return true;
//     } catch (error) {
//       this.logger.error('Error handling location in emergency:', error);
//       return false;
//     }
//   }

//   // Complete and save emergency report
//    async completeEmergencyReport(phoneNumber: string, session: EmergencySession): Promise<void> {
//     try {
//       // Combine description with additional notes if any
//       let fullDescription = session.data.description || '';
//       if (session.data.additionalNotes && session.data.additionalNotes.length > 0) {
//         fullDescription += '\n\nAdditional Notes:\n' + session.data.additionalNotes.join('\n');
//       }

//       // Find user if registered
//       let user: User | null = null;
//       try {
//         const hashedPhone = await this.hashPhoneNumber(phoneNumber);
//         user = await this.userRepository.findOne({ where: { phoneNumber: hashedPhone } });
//       } catch (error) {
//         this.logger.debug('User not found or not registered, proceeding with anonymous report');
//       }

//       // Prepare media URLs for JSON storage
//       const mediaUrls = session.data.mediaUrls || [];
//       const additionalNotes = session.data.additionalNotes || [];

//       // Create emergency report with JSON fields
//       const emergencyReport = this.emergencyRepository.create({
//         ...session.data,
//         description: fullDescription,
//         user: user || null,
//         reportingPhoneNumber: phoneNumber,
//         latitude: session.data.latitude || 0,
//         longitude: session.data.longitude || 0,
//         // Store arrays as JSON strings
//         mediaUrlsJson: JSON.stringify(mediaUrls),
//         additionalNotesJson: JSON.stringify(additionalNotes),
//         createdAt: new Date(),
//         updatedAt: new Date()
//       });

//       const savedReport = await this.emergencyRepository.save(emergencyReport);

//       // Send confirmation message
//       const confirmationMessage = this.getConfirmationMessage(savedReport, session.data.type!);

//       await this.messagingService.sendTextMessage(phoneNumber, confirmationMessage, session.messageID);

//       // Update analytics
//       await this.updateAllAnalytics();

//       // Clean up both in-memory and database sessions
//       this.emergencySessions.delete(phoneNumber);
//       await this.sessionManager.completeSession(phoneNumber, SessionType.EMERGENCY);

//       this.logger.log(`Emergency report completed and sessions cleared for ${phoneNumber}. User is now free to use other services.`);

//       // Send final message indicating user can now use other services
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '🔄 *Session ended*\n\nYour emergency report has been submitted successfully. You can now use other services like:\n\n• Report another emergency\n• Report community issues\n• Check your reports\n• Register your account\n\nJust type what you need help with!',
//         session.messageID
//       );

//     } catch (error) {
//       this.logger.error('Error completing emergency report:', error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Error submitting emergency report. Please try again or call emergency services directly.',
//         session.messageID
//       );

//       // Clean up sessions on error too
//       this.emergencySessions.delete(phoneNumber);
//       await this.sessionManager.cancelSession(phoneNumber, SessionType.EMERGENCY);
//     }
//   }

//   // Get appropriate confirmation message based on emergency type
//   private getConfirmationMessage(report: EmergencyReport, emergencyType: EmergencyType): string {
//     const baseMessage = `🚨 *EMERGENCY REPORT SUBMITTED* 🚨

// Your emergency report has been received and help is on the way!

// 📋 *Report Details:*
// • Type: ${emergencyType}
// • Priority: ${report.priority}
// • Location: ${report.location}
// • Reference: #EM${report.id.toString().padStart(6, '0')}

// 🆘 *What to do next:*
// 1. Stay safe and follow emergency protocols
// 2. Keep your phone accessible for updates
// 3. Emergency services have been notified

// 📞 If this is a life-threatening emergency, please also call your local emergency number.

// Thank you for reporting!`;

//     const typeSpecificAdvice = {
//       [EmergencyType.FIRE]: `\n\n🔥 *FIRE SAFETY TIPS:*\n• Evacuate immediately if safe to do so\n• Alert others in the building\n• Do not use elevators\n• Stay low to avoid smoke inhalation`,
//       [EmergencyType.AMBULANCE]: `\n\n🚑 *MEDICAL ASSISTANCE:*\n• Do not move the injured person unless necessary\n• Keep the person warm and comfortable\n• Have medical information ready if available`,
//       [EmergencyType.ROBBERY]: `\n\n👮 *SAFETY ADVICE:*\n• Do not confront the suspects\n• Move to a safe location if possible\n• Note any distinguishing features\n• Cooperate if confronted, your safety comes first`,
//       [EmergencyType.ACCIDENT]: `\n\n🚗 *ACCIDENT SCENE:*\n• Turn on hazard lights\n• Set up warning triangles if available\n• Do not move injured people\n• Watch for traffic hazards`,
//       [EmergencyType.MEDICAL]: `\n\n🏥 *MEDICAL CARE:*\n• Stay with the person if safe\n• Monitor breathing and consciousness\n• Have any medications ready for paramedics`,
//       [EmergencyType.CRIME]: `\n\n🚔 *CRIME SCENE:*\n• Move to a safe location\n• Do not touch anything at the scene\n• Note suspect descriptions and direction of travel`,
//       [EmergencyType.NATURAL_DISASTER]: `\n\n🌪️ *DISASTER SAFETY:*\n• Follow local emergency broadcasts\n• Move to higher ground if flooding\n• Stay away from damaged structures`,
//       [EmergencyType.OTHER]: `\n\n⚠️ *GENERAL SAFETY:*\n• Follow instructions from emergency services\n• Keep yourself and others safe\n• Stay alert to changing conditions`
//     };

//     return baseMessage + (typeSpecificAdvice[emergencyType] || typeSpecificAdvice[EmergencyType.OTHER]);
//   }

//   // Get user's emergency reports - UPDATED FOR JSON FIELDS
//   async getUserEmergencyReports(phoneNumber: string, messageID: string): Promise<boolean> {
//     try {
//       let reports: EmergencyReport[] = [];

//       // Hash phone number for user lookup
//       const hashedPhone = await this.hashPhoneNumber(phoneNumber);
//       const user = await this.userRepository.findOne({ 
//         where: { phoneNumber: hashedPhone } 
//       });

//       if (user) {
//         // Single query using QueryBuilder to get all relevant reports
//         reports = await this.emergencyRepository
//           .createQueryBuilder('report')
//           .leftJoinAndSelect('report.user', 'user')
//           .where('report.userId = :userId', { userId: user.id })
//           .orWhere('(report.reportingPhoneNumber = :phoneNumber AND report.userId IS NULL)', { 
//             phoneNumber 
//           })
//           .orderBy('report.createdAt', 'DESC')
//           .take(10)
//           .getMany();

//         // Background process to link orphaned emergency reports for future queries
//         this.linkOrphanedEmergencyReportsToUser(phoneNumber, user.id).catch(error => {
//           this.logger.error('Background linking of emergency reports failed:', error);
//         });

//       } else {
//         // User is not registered - only get reports by phone number
//         reports = await this.emergencyRepository.find({
//           where: { reportingPhoneNumber: phoneNumber },
//           order: { createdAt: 'DESC' },
//           take: 10
//         });
//       }

//       if (reports.length === 0) {
//         const message = user 
//           ? "🚨 You haven't submitted any emergency reports yet.\n\nSend 'EMERGENCY' to report an emergency situation."
//           : "🚨 You haven't submitted any emergency reports yet, or your reports were submitted as a guest.\n\nSend 'EMERGENCY' to report an emergency situation.";
        
//         await this.messagingService.sendTextMessage(phoneNumber, message, messageID);
//         return true;
//       }

//       let reportsMessage = `🚨 *Your Emergency Reports (${reports.length})*\n\n`;

//       reports.forEach((report, index) => {
//         // Fixed status emoji mapping with correct EmergencyStatus values
//         const statusEmoji: { [key in EmergencyStatus]: string } = {
//           [EmergencyStatus.REPORTED]: '📝',
//           [EmergencyStatus.IN_PROGRESS]: '🔄',
//           [EmergencyStatus.DISPATCHED]: '🚗',
//           [EmergencyStatus.RESOLVED]: '✅',
//           [EmergencyStatus.CANCELLED]: '❌'
//         };

//         const priorityEmoji: { [key in EmergencyPriority]: string } = {
//           [EmergencyPriority.LOW]: '🟢',
//           [EmergencyPriority.MEDIUM]: '🟡',
//           [EmergencyPriority.HIGH]: '🟠',
//           [EmergencyPriority.CRITICAL]: '🔴'
//         };

//         // Get media count from JSON
//         const mediaCount = report.mediaUrls ? report.mediaUrls.length : 0;

//         reportsMessage += `*${index + 1}. ${statusEmoji[report.status]} ${report.type}*\n`;
//         reportsMessage += `   ${priorityEmoji[report.priority]} Priority: ${report.priority}\n`;
//         reportsMessage += `   🆔 #EM${report.id.toString().padStart(6, '0')}\n`;
//         reportsMessage += `   📅 ${report.createdAt.toLocaleDateString()}\n`;
//         reportsMessage += `   📍 ${report.location || 'Location not specified'}\n`;
//         reportsMessage += `   📸 Media files: ${mediaCount}\n`;
        
//         if (report.assignedDepartment) {
//           reportsMessage += `   🏢 Department: ${report.assignedDepartment}\n`;
//         }
        
//         if (report.status === EmergencyStatus.RESOLVED && report.resolvedAt) {
//           reportsMessage += `   ✅ Resolved: ${report.resolvedAt.toLocaleDateString()}\n`;
//         }
        
//         reportsMessage += '\n';
//       });

//       if (!user) {
//         reportsMessage += "💡 *Register your account to:*\n• Track all your emergency reports in one place\n• Get real-time status updates\n• Receive priority response\n• Access historical data\n\nSend 'REGISTER' to get started!";
//       }

//       await this.messagingService.sendTextMessage(phoneNumber, reportsMessage, messageID);
//       return true;
//     } catch (error) {
//       this.logger.error('Error fetching user emergency reports:', error);
//       await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '❌ Failed to fetch your emergency reports. Please try again later.',
//         messageID
//       );
//       return false;
//     }
//   }

//   // Link orphaned emergency reports to user account
//   private async linkOrphanedEmergencyReportsToUser(phoneNumber: string, userId: number): Promise<void> {
//     try {
//       // Find all emergency reports with this phone number that aren't linked to any user
//       const orphanedReports = await this.emergencyRepository
//         .createQueryBuilder('report')
//         .where('report.reportingPhoneNumber = :phoneNumber', { phoneNumber })
//         .andWhere('report.userId IS NULL')
//         .getMany();

//       if (orphanedReports.length > 0) {
//         // Update these reports to link them to the user
//         await this.emergencyRepository
//           .createQueryBuilder()
//           .update(EmergencyReport)
//           .set({ user: { id: userId } })
//           .where('reportingPhoneNumber = :phoneNumber', { phoneNumber })
//           .andWhere('userId IS NULL')
//           .execute();

//         this.logger.log(`Linked ${orphanedReports.length} orphaned emergency reports to user ${userId}`);
//       }
//     } catch (error) {
//       this.logger.error('Error linking orphaned emergency reports to user:', error);
//       // Don't throw error - this is a background process
//     }
//   }

//   // Helper method to hash phone numbers
//   private async hashPhoneNumber(phoneNumber: string): Promise<string> {
//       const salt = process.env.PHONE_HASH_SALT || 'default-salt';
//       const normalizedPhone = phoneNumber.replace(/\D/g, '');
//       return crypto.createHmac('sha256', salt).update(normalizedPhone).digest('hex');
//     }

//   // Cleanup old sessions
//   cleanupOldSessions(): void {
//     const now = Date.now();
//     for (const [phoneNumber, session] of this.emergencySessions.entries()) {
//       if (now - session.lastActive > this.SESSION_TTL) {
//         this.emergencySessions.delete(phoneNumber);
//         this.logger.log(`Cleaned up expired emergency session for ${phoneNumber}`);

//         // Also clean up database session
//         this.sessionManager.cancelSession(phoneNumber, SessionType.EMERGENCY)
//           .catch(error => this.logger.error('Error cleaning up database emergency session:', error));
//       }
//     }
//   }

//   async createEmergencyReport(reportData: Partial<EmergencyReport>): Promise<EmergencyReport> {
//     const report = this.emergencyRepository.create(reportData);
//     const savedReport = await this.emergencyRepository.save(report);

//     // Check for consolidation
//     await this.consolidateReports(savedReport);

//     // Update all analytics
//     await this.updateAllAnalytics();

//     return savedReport;
//   }

//   async consolidateReports(newReport: EmergencyReport): Promise<void> {
//     if (!newReport.latitude || !newReport.longitude) return;

//     const nearbyReports = await this.emergencyRepository
//       .createQueryBuilder('report')
//       .where('report.id != :id', { id: newReport.id })
//       .andWhere('report.type = :type', { type: newReport.type })
//       .andWhere('report.createdAt >= :time', { 
//         time: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
//       })
//       .andWhere(
//         `(6371 * acos(cos(radians(:lat)) * cos(radians(report.latitude)) * 
//         cos(radians(report.longitude) - radians(:lng)) + 
//         sin(radians(:lat)) * sin(radians(report.latitude)))) < :distance`,
//         {
//           lat: newReport.latitude,
//           lng: newReport.longitude,
//           distance: 0.01 // ~10 meters
//         }
//       )
//       .getMany();

//     if (nearbyReports.length > 0) {
//       // Mark as consolidated
//       newReport.isConsolidated = true;
//       newReport.consolidatedReportId = nearbyReports[0].id;
//       await this.emergencyRepository.save(newReport);
      
//       // Update location analytics for consolidated reports
//       await this.updateLocationAnalytics(newReport.latitude, newReport.longitude, newReport.type);
//     }
//   }

//   async updateReportStatus(id: number, status: EmergencyStatus, adminNotes?: string): Promise<EmergencyReport> {
//     const report = await this.emergencyRepository.findOne({ where: { id } });
    
//     if (!report) {
//       throw new Error('Report not found');
//     }

//     report.status = status;
//     report.adminNotes = adminNotes!;

//     if (status === EmergencyStatus.DISPATCHED) {
//       report.dispatchedAt = new Date();
//     } else if (status === EmergencyStatus.RESOLVED) {
//       report.resolvedAt = new Date();
//       // Update analytics when report is resolved
//       await this.updateDepartmentAnalytics(report);
//     }

//     const updatedReport = await this.emergencyRepository.save(report);
    
//     // Update analytics after status change
//     await this.updateAllAnalytics();

//     return updatedReport;
//   }

//   async assignToDepartment(id: number, department: string, unit: string): Promise<EmergencyReport> {
//     const report = await this.emergencyRepository.findOne({ where: { id } });
    
//     if (!report) {
//       throw new Error('Report not found');
//     }

//     report.assignedDepartment = department;
//     report.assignedUnit = unit;
//     report.status = EmergencyStatus.DISPATCHED;
//     report.dispatchedAt = new Date();

//     const updatedReport = await this.emergencyRepository.save(report);
    
//     // Update department analytics
//     await this.updateDepartmentAnalytics(updatedReport);

//     return updatedReport;
//   }

//   async addUserFeedback(id: number, feedback: string, rating: number): Promise<EmergencyReport> {
//     const report = await this.emergencyRepository.findOne({ where: { id } });
    
//     if (!report) {
//       throw new Error('Report not found');
//     }

//     report.userFeedback = feedback;
//     report.rating = rating;

//     const updatedReport = await this.emergencyRepository.save(report);
    
//     // Update analytics with user feedback
//     await this.updateAllAnalytics();

//     return updatedReport;
//   }

//   async getDashboardStats() {
//     const totalReports = await this.emergencyRepository.count();
//     const activeReports = await this.emergencyRepository.count({ 
//       where: { status: EmergencyStatus.REPORTED } 
//     });
//     const resolvedReports = await this.emergencyRepository.count({ 
//       where: { status: EmergencyStatus.RESOLVED } 
//     });

//     const reportsByType = await this.emergencyRepository
//       .createQueryBuilder('report')
//       .select('report.type, COUNT(*) as count')
//       .groupBy('report.type')
//       .getRawMany();

//     const averageResolutionTime = await this.emergencyRepository
//       .createQueryBuilder('report')
//       .select('AVG(DATEDIFF(MINUTE, report.createdAt, report.resolvedAt)) as avgTime')
//       .where('report.resolvedAt IS NOT NULL')
//       .getRawOne();

//     const averageRating = await this.emergencyRepository
//       .createQueryBuilder('report')
//       .select('AVG(report.rating) as avgRating')
//       .where('report.rating > 0')
//       .getRawOne();

//     return {
//       totalReports,
//       activeReports,
//       resolvedReports,
//       reportsByType,
//       averageResolutionTime: averageResolutionTime?.avgTime || 0,
//       averageRating: averageRating?.avgRating || 0
//     };
//   }

//   async getLocationAnalytics(): Promise<any> {
//     const locations = await this.locationAnalyticsRepository.find({
//       order: { reportCount: 'DESC' },
//       take: 10
//     });

//     const heatmapData = await this.emergencyRepository
//       .createQueryBuilder('report')
//       .select(['latitude', 'longitude', 'type', 'COUNT(*) as count'])
//       .groupBy('latitude, longitude, type')
//       .getRawMany();

//     return { locations, heatmapData };
//   }

//   async getUserAnalytics(): Promise<any> {
//     const thirtyDaysAgo = new Date();
//     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

//     const userAnalytics = await this.userAnalyticsRepository.find({
//       where: {
//         date: MoreThanOrEqual(thirtyDaysAgo)
//       },
//       order: { date: 'ASC' }
//     });

//     return userAnalytics;
//   }

//   async getDepartmentAnalytics(): Promise<any> {
//     const thirtyDaysAgo = new Date();
//     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

//     const departmentAnalytics = await this.departmentAnalyticsRepository.find({
//       where: {
//         date: MoreThanOrEqual(thirtyDaysAgo)
//       },
//       order: { date: 'ASC', department: 'ASC' }
//     });

//     return departmentAnalytics;
//   }

//   private async updateAllAnalytics(): Promise<void> {
//     await this.updateDailyAnalytics();
//     await this.updateUserAnalytics();
//   }

//   private async updateDailyAnalytics(): Promise<void> {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     let analytics = await this.analyticsRepository.findOne({ 
//       where: { date: today } 
//     });

//     if (!analytics) {
//       analytics = this.analyticsRepository.create({ date: today });
//     }

//     // Update analytics data with comprehensive stats
//     const stats = await this.getDashboardStats();
    
//     // Set type-specific counts
//     analytics.fireReports = stats.reportsByType.find(r => r.type === EmergencyType.FIRE)?.count || 0;
//     analytics.ambulanceReports = stats.reportsByType.find(r => r.type === EmergencyType.AMBULANCE)?.count || 0;
//     analytics.robberyReports = stats.reportsByType.find(r => r.type === EmergencyType.ROBBERY)?.count || 0;
//     analytics.accidentReports = stats.reportsByType.find(r => r.type === EmergencyType.ACCIDENT)?.count || 0;
//     analytics.medicalReports = stats.reportsByType.find(r => r.type === EmergencyType.MEDICAL)?.count || 0;
//     analytics.crimeReports = stats.reportsByType.find(r => r.type === EmergencyType.CRIME)?.count || 0;
//     analytics.naturalDisasterReports = stats.reportsByType.find(r => r.type === EmergencyType.NATURAL_DISASTER)?.count || 0;
//     analytics.otherReports = stats.reportsByType.find(r => r.type === EmergencyType.OTHER)?.count || 0;
    
//     // Set general stats
//     analytics.totalReports = stats.totalReports;
//     analytics.emergencyReports = stats.totalReports; // Assuming all are emergency reports in this service
//     analytics.resolvedReports = stats.resolvedReports;
//     analytics.averageResolutionTime = stats.averageResolutionTime;
//     analytics.averageRating = stats.averageRating;

//     await this.analyticsRepository.save(analytics);
//   }

//   private async updateLocationAnalytics(latitude: number, longitude: number, type: EmergencyType): Promise<void> {
//     const areaName = await this.getAreaName(latitude, longitude);
//     const today = new Date();
//     const periodStart = new Date(today);
//     periodStart.setDate(periodStart.getDate() - 7); // Weekly period

//     let locationAnalytics = await this.locationAnalyticsRepository.findOne({
//       where: {
//         latitude: Math.round(latitude * 1000000) / 1000000, // Round to 6 decimal places for grouping
//         longitude: Math.round(longitude * 1000000) / 1000000,
//         periodStart: Between(periodStart, today)
//       }
//     });

//     if (!locationAnalytics) {
//       locationAnalytics = this.locationAnalyticsRepository.create({
//         latitude: Math.round(latitude * 1000000) / 1000000,
//         longitude: Math.round(longitude * 1000000) / 1000000,
//         areaName,
//         periodStart,
//         periodEnd: today
//       });
//     }

//     // Update counts based on type
//     locationAnalytics.reportCount += 1;
//     locationAnalytics.emergencyCount += 1;

//     switch (type) {
//       case EmergencyType.FIRE:
//         locationAnalytics.fireCount += 1;
//         break;
//       case EmergencyType.AMBULANCE:
//       case EmergencyType.MEDICAL:
//         locationAnalytics.medicalCount += 1;
//         break;
//       case EmergencyType.ROBBERY:
//       case EmergencyType.CRIME:
//         locationAnalytics.crimeCount += 1;
//         break;
//       case EmergencyType.ACCIDENT:
//         locationAnalytics.accidentCount += 1;
//         break;
//     }

//     await this.locationAnalyticsRepository.save(locationAnalytics);
//   }

//   private async updateUserAnalytics(): Promise<void> {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     let userAnalytics = await this.userAnalyticsRepository.findOne({
//       where: { date: today }
//     });

//     if (!userAnalytics) {
//       userAnalytics = this.userAnalyticsRepository.create({ date: today });
//     }

//     // Calculate user statistics
//     const totalUsers = await this.userRepository.count();
//     const activeUsers = await this.emergencyRepository
//       .createQueryBuilder('report')
//       .select('COUNT(DISTINCT report.userId) as activeUsers')
//       .where('report.createdAt >= :date', { date: today })
//       .getRawOne();

//     userAnalytics.totalUsers = totalUsers;
//     userAnalytics.activeUsers = parseInt(activeUsers?.activeUsers) || 0;
    
//     // Calculate reports per user
//     if (totalUsers > 0) {
//       userAnalytics.reportsPerUser = userAnalytics.activeUsers > 0 ? 
//         Math.round((userAnalytics.activeUsers / totalUsers) * 100) / 100 : 0;
//     }

//     await this.userAnalyticsRepository.save(userAnalytics);
//   }

//   private async updateDepartmentAnalytics(report: EmergencyReport): Promise<void> {
//     if (!report.assignedDepartment) return;

//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     let departmentAnalytics = await this.departmentAnalyticsRepository.findOne({
//       where: {
//         department: report.assignedDepartment,
//         date: today
//       }
//     });

//     if (!departmentAnalytics) {
//       departmentAnalytics = this.departmentAnalyticsRepository.create({
//         department: report.assignedDepartment,
//         date: today
//       });
//     }

//     departmentAnalytics.assignedReports += 1;

//     if (report.status === EmergencyStatus.RESOLVED) {
//       departmentAnalytics.resolvedReports += 1;
      
//       // Calculate resolution time in minutes
//       if (report.createdAt && report.resolvedAt) {
//         const resolutionTime = (report.resolvedAt.getTime() - report.createdAt.getTime()) / (1000 * 60);
        
//         // Update average resolution time
//         if (departmentAnalytics.averageResolutionTime === 0) {
//           departmentAnalytics.averageResolutionTime = resolutionTime;
//         } else {
//           departmentAnalytics.averageResolutionTime = 
//             (departmentAnalytics.averageResolutionTime + resolutionTime) / 2;
//         }
//       }

//       // Update average rating
//       if (report.rating > 0) {
//         if (departmentAnalytics.averageRating === 0) {
//           departmentAnalytics.averageRating = report.rating;
//         } else {
//           departmentAnalytics.averageRating = 
//             (departmentAnalytics.averageRating + report.rating) / 2;
//         }
//       }
//     }

//     await this.departmentAnalyticsRepository.save(departmentAnalytics);
//   }

//   private async getAreaName(latitude: number, longitude: number): Promise<string> {
//         // Try Google Maps first, fallback to OpenStreetMap, then to cached/local data
//         try {
//             // Primary: Google Maps Geocoding
//             return await this.getAreaNameFromGoogleMaps(latitude, longitude);
//         } catch (googleError) {
//             this.logger.warn('Google Maps geocoding failed, trying OpenStreetMap:', googleError);
            
//             try {
//             // Secondary: OpenStreetMap Nominatim
//             return await this.getAreaNameFromOpenStreetMap(latitude, longitude);
//             } catch (osmError) {
//             this.logger.warn('OpenStreetMap geocoding failed, using cached/local data:', osmError);
            
//             // Tertiary: Check if we have cached area name
//             return await this.getCachedAreaName(latitude, longitude);
//             }
//         }
//     }

//     private async getAreaNameFromGoogleMaps(latitude: number, longitude: number): Promise<string> {
//         const apiKey = process.env.GOOGLE_MAPS_API_KEY;
//         if (!apiKey) {
//             throw new Error('Google Maps API key not configured');
//         }

//         const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
        
//         const response = await fetch(url);
//         const data = await response.json();

//         if (data.status === 'OK' && data.results.length > 0) {
//             const result = data.results[0];
//             const addressComponents = result.address_components;
            
//             // Priority order for area names
//             const areaTypes = [
//             'neighborhood',
//             'sublocality',
//             'sublocality_level_1',
//             'locality',
//             'administrative_area_level_2',
//             'route',
//             'administrative_area_level_1'
//             ];

//             for (const type of areaTypes) {
//             const component = addressComponents.find(comp => comp.types.includes(type));
//             if (component) {
//                 return component.long_name;
//             }
//             }

//             // Fallback to first part of formatted address
//             return result.formatted_address.split(',')[0];
//         } else {
//             throw new Error(`Google Maps geocoding failed: ${data.status}`);
//         }
//     }

//     private async getAreaNameFromOpenStreetMap(latitude: number, longitude: number): Promise<string> {
//         const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`;
        
//         const response = await fetch(url, {
//             headers: {
//             'User-Agent': 'EmergencyReportingSystem/1.0 (contact@yourapp.com)'
//             }
//         });
        
//         const data = await response.json();

//         if (data && data.address) {
//             const address = data.address;
            
//             // Priority order for area names
//             const areaFields = [
//             'neighbourhood',
//             'suburb',
//             'village',
//             'town',
//             'city',
//             'municipality',
//             'county',
//             'road',
//             'state'
//             ];

//             for (const field of areaFields) {
//             if (address[field]) {
//                 return address[field];
//             }
//             }

//             return data.display_name.split(',')[0];
//         } else {
//             throw new Error('OpenStreetMap geocoding failed');
//         }
//     }

//     private async getCachedAreaName(latitude: number, longitude: number): Promise<string> {
//         // Check if we have this location in our database cache
//         const cachedLocation = await this.locationAnalyticsRepository.findOne({
//             where: {
//             latitude: Math.round(latitude * 100000) / 100000, // 5 decimal precision
//             longitude: Math.round(longitude * 100000) / 100000
//             }
//         });

//         if (cachedLocation && cachedLocation.areaName && !cachedLocation.areaName.startsWith('Area_')) {
//             return cachedLocation.areaName;
//         }

//         // Final fallback - use major city based on coordinates
//         return await this.getMajorCityName(latitude, longitude);
//     }

//     private async getMajorCityName(latitude: number, longitude: number): Promise<string> {
//         // For Zimbabwe coordinates, return approximate city names
//         // This is a simplified implementation for demonstration
//         const cities = [
//             { name: "Harare", lat: -17.8292, lng: 31.0539, radius: 0.5 },
//             { name: "Bulawayo", lat: -20.1325, lng: 28.6265, radius: 0.5 },
//             { name: "Chitungwiza", lat: -18.0000, lng: 31.1000, radius: 0.3 },
//             { name: "Mutare", lat: -18.9667, lng: 32.6333, radius: 0.4 },
//             { name: "Gweru", lat: -19.4500, lng: 29.8167, radius: 0.4 },
//             { name: "Kwekwe", lat: -18.9167, lng: 29.8167, radius: 0.3 },
//             { name: "Kadoma", lat: -18.3333, lng: 29.9167, radius: 0.3 },
//             { name: "Masvingo", lat: -20.0667, lng: 30.8333, radius: 0.4 }
//         ];

//         for (const city of cities) {
//             const distance = this.calculateDistance(latitude, longitude, city.lat, city.lng);
//             if (distance <= city.radius) {
//             return city.name;
//             }
//         }

//         // Ultimate fallback
//         return `Area_${Math.round(latitude * 1000)}_${Math.round(longitude * 1000)}`;
//     }

//     private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
//         const R = 6371; // Earth's radius in kilometers
//         const dLat = (lat2 - lat1) * Math.PI / 180;
//         const dLon = (lon2 - lon1) * Math.PI / 180;
//         const a = 
//             Math.sin(dLat/2) * Math.sin(dLat/2) +
//             Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
//             Math.sin(dLon/2) * Math.sin(dLon/2);
//         const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//         return R * c;
//     }
// } 

// // issue-reporting.service.ts
// /* eslint-disable @typescript-eslint/no-unsafe-argument */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/no-require-imports */
// /* eslint-disable no-case-declarations */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/restrict-template-expressions */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/require-await */
// /* eslint-disable @typescript-eslint/no-unsafe-call */
// /* eslint-disable prettier/prettier */

// import { Injectable, Logger } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { IssueReport, IssueType, IssueStatus } from '../../database/issue-report.entity';
// import { User } from '../../database/user.entity';
// import { MessagingService } from './messaging.service';
// import { StorageService } from "./storage.service"
// import { writeFileSync, mkdirSync, existsSync } from 'fs';
// import { join } from 'path';
// import * as crypto from 'crypto';

// interface UserReportingSession {
//   phoneNumber: string;
//   currentStep: number;
//   issueType: IssueType;
//   data: {
//     description?: string;
//     location?: string;
//     latitude?: number;
//     longitude?: number;
//     imageUrl?: string;
//     voiceNoteUrl?: string;
//     videoUrl?: string;
//   };
//   lastActive: number;
// }

// @Injectable()
// export class IssueReportingService {
//   private readonly logger = new Logger(IssueReportingService.name);
//   private readonly reportingSessions = new Map<string, UserReportingSession>();
//   private readonly SESSION_TTL = 30 * 60 * 1000; // 30 minutes

//   // Add media storage directories
//   private readonly baseDir = 'C:/Users/ACER/Documents/CourseGenerator/chatbot/uploads';
//   private readonly issueImagesDir = join(this.baseDir, 'issue_images');
//   private readonly issueVoiceNotesDir = join(this.baseDir, 'issue_voice_notes');
//   private readonly issueVideosDir = join(this.baseDir, 'issue_videos');

//   constructor(
//     @InjectRepository(IssueReport)
//     private issueReportRepository: Repository<IssueReport>,
//     @InjectRepository(User)
//     private userRepository: Repository<User>,
//     private readonly messagingService: MessagingService, // FIXED: Changed from messagingService to whatsappService
//     private readonly storageService: StorageService,
//   ) {
//     this.ensureMediaDirs();
//   }

//   private ensureMediaDirs() {
//     try {
//       if (!existsSync(this.baseDir)) mkdirSync(this.baseDir);
//       if (!existsSync(this.issueImagesDir)) mkdirSync(this.issueImagesDir);
//       if (!existsSync(this.issueVoiceNotesDir)) mkdirSync(this.issueVoiceNotesDir);
//       if (!existsSync(this.issueVideosDir)) mkdirSync(this.issueVideosDir);
//     } catch (error) {
//       this.logger.error('Error creating media directories', error);
//     }
//   }

//   private async saveMediaFile(buffer: Buffer, phoneNumber: string, mediaType: 'image' | 'voice' | 'video', originalMimeType: string): Promise<string> {
//     try {
//       const timestamp = Date.now();
//       const extension = this.getFileExtensionFromMimeType(originalMimeType);
      
//       let filename: string;
//       let dir: string;

//       switch (mediaType) {
//         case 'image':
//           filename = `issue_image_${phoneNumber}_${timestamp}.${extension}`;
//           dir = this.issueImagesDir;
//           break;
//         case 'voice':
//           filename = `issue_voice_${phoneNumber}_${timestamp}.${extension}`;
//           dir = this.issueVoiceNotesDir;
//           break;
//         case 'video':
//           filename = `issue_video_${phoneNumber}_${timestamp}.${extension}`;
//           dir = this.issueVideosDir;
//           break;
//         default:
//           throw new Error(`Unsupported media type: ${mediaType}`);
//       }

//       const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
//       const filePath = join(dir, sanitizedFilename);
      
//       writeFileSync(filePath, buffer);
//       return filePath;
//     } catch (error) {
//       this.logger.error(`Error saving ${mediaType} file for ${phoneNumber}`, error);
//       throw new Error(`Failed to save ${mediaType} file`);
//     }
//   }

//   private getFileExtensionFromMimeType(mimeType: string): string {
//     const extensionMap: { [key: string]: string } = {
//       'image/jpeg': 'jpg',
//       'image/png': 'png',
//       'image/gif': 'gif',
//       'audio/ogg': 'ogg',
//       'audio/aac': 'aac',
//       'audio/mp4': 'm4a',
//       'audio/mpeg': 'mp3',
//       'audio/amr': 'amr',
//       'video/mp4': 'mp4',
//       'video/3gpp': '3gp',
//       'video/quicktime': 'mov'
//     };
    
//     return extensionMap[mimeType] || 'bin';
//   }

//   async handleIssueReporting(phoneNumber: string, message: string, messageID: string): Promise<boolean> {
//     const normalizedMessage = message.toLowerCase().trim();

//     // Check if user is in active reporting session
//     const activeSession = this.reportingSessions.get(phoneNumber);
//     if (activeSession) {
//       return this.handleReportingStepInner(phoneNumber, normalizedMessage, activeSession, messageID);
//     }

//     // Check for issue keywords
//     if (this.containsIssueKeywords(normalizedMessage)) {
//       const issueType = this.detectIssueType(normalizedMessage);
//       return this.startReportingFlow(phoneNumber, issueType, messageID);
//     }

//     return false;
//   }

//   async getReportingSession(phoneNumber: string): Promise<UserReportingSession | null> {
//     return this.reportingSessions.get(phoneNumber) || null;
//   }

//   async cancelReportingSession(phoneNumber: string): Promise<void> {
//     this.reportingSessions.delete(phoneNumber);
//   }

//   async hasActiveReportingSession(phoneNumber: string): Promise<boolean> {
//     const reportingSession = this.reportingSessions.get(phoneNumber);
//     if (!reportingSession) return false;
    
//     const isActive = (Date.now() - reportingSession.lastActive) < this.SESSION_TTL;
//     if (!isActive) {
//       this.reportingSessions.delete(phoneNumber);
//       return false;
//     }
//     return true;
//   }

//   private containsIssueKeywords(message: string): boolean {
//     const keywords = {
//       [IssueType.POTHOLE]: ['pothole', 'potholes', 'road damage', 'road repair'],
//       [IssueType.LITTER]: ['litter', 'garbage', 'trash', 'rubbish', 'dumping'],
//       [IssueType.SEWER]: ['sewer', 'drainage', 'blocked drain', 'sewage'],
//       [IssueType.WATER_PIPE_BURST]: ['water pipe burst', 'burst pipe', 'water leak', 'broken pipe']
//     };

//     return Object.values(keywords).some(keywordList => 
//       keywordList.some(keyword => message.includes(keyword))
//     );
//   }

//   private detectIssueType(message: string): IssueType {
//     if (message.includes('pothole')) return IssueType.POTHOLE;
//     if (message.includes('litter') || message.includes('garbage') || message.includes('trash')) return IssueType.LITTER;
//     if (message.includes('sewer') || message.includes('drainage')) return IssueType.SEWER;
//     if (message.includes('water pipe burst') || message.includes('burst pipe')) return IssueType.WATER_PIPE_BURST;
//     return IssueType.OTHER;
//   }

//   /**
//    * Start issue report with NLP context
//    */
//   async startIssueReportWithContext(
//     phoneNumber: string,
//     messageID: string,
//     context: {
//       detectedType: string;
//       originalMessage: string;
//       confidence: number;
//       keywords: string[];
//       nlpMetadata?: any;
//     }
//   ): Promise<boolean> {
//     try {
//       // Map detected type to IssueType
//       const issueType = this.mapNlpTypeToIssueType(context.detectedType);
      
//       const session: UserReportingSession = {
//         phoneNumber,
//         currentStep: 2, // Skip type selection since we detected it
//         issueType,
//         data: {
//           description: `NLP Detected: ${context.originalMessage}\nIssue Type: ${context.detectedType}\nConfidence: ${context.confidence}\nKeywords: ${context.keywords.join(', ')}`
//         },
//         lastActive: Date.now()
//       };

//       this.reportingSessions.set(phoneNumber, session);

//       const issueTitles = {
//         [IssueType.POTHOLE]: 'pothole',
//         [IssueType.LITTER]: 'littered area',
//         [IssueType.SEWER]: 'sewer issue',
//         [IssueType.WATER_PIPE_BURST]: 'burst water pipe',
//         [IssueType.OTHER]: 'issue'
//       };

//       const welcomeMessage = `📝 *Issue Detected: ${issueTitles[issueType].toUpperCase()}* 📝\n\nI understand you're reporting a ${context.detectedType} issue.\n\n📍 *Step 2/4:* Please provide the location (street name, area, or landmark):`;

//       return await this.messagingService.sendTextMessage(phoneNumber, welcomeMessage, messageID);
//     } catch (error) {
//       this.logger.error('Error starting issue report with context:', error);
//       // Fallback to regular issue flow
//       return await this.startIssueReport(phoneNumber, messageID);
//     }
//   }

//   /**
//    * Start regular issue report (for REPORT command)
//    */
//   async startIssueReport(phoneNumber: string, messageID: string): Promise<boolean> {
//     try {
//       const session: UserReportingSession = {
//         phoneNumber,
//         currentStep: 1,
//         issueType: IssueType.OTHER, // Default type, will be determined in step 1
//         data: {},
//         lastActive: Date.now()
//       };

//       this.reportingSessions.set(phoneNumber, session);

//       const welcomeMessage = `📝 *Citizen Reporting* 📝\n\nI'll help you report an issue. Please follow the steps:\n\n1. *Describe the issue* - What problem are you reporting?\n2. *Location* - Where is this located?\n3. *Coordinates* - Share your location or describe precisely\n4. *Media* - Upload photos, videos or send voice notes\n\n*Step 1/4:* Please describe the issue in detail:`;

//       return await this.messagingService.sendTextMessage(phoneNumber, welcomeMessage, messageID);
//     } catch (error) {
//       this.logger.error('Error starting issue report:', error);
//       return false;
//     }
//   }

//   /**
//    * Map NLP detected type to IssueType enum
//    */
//   private mapNlpTypeToIssueType(nlpType: string): IssueType {
//     const typeMap: { [key: string]: IssueType } = {
//       'water': IssueType.WATER_PIPE_BURST,
//       'sewerage': IssueType.SEWER,
//       'electricity': IssueType.OTHER,
//       'roads': IssueType.POTHOLE,
//       'sanitation': IssueType.LITTER,
//       'public': IssueType.OTHER,
//       'noise': IssueType.OTHER,
//       'general': IssueType.OTHER
//     };

//     return typeMap[nlpType] || IssueType.OTHER;
//   }

//   private async startReportingFlow(phoneNumber: string, issueType: IssueType, messageID: string): Promise<boolean> {
//     const session: UserReportingSession = {
//       phoneNumber,
//       currentStep: 1,
//       issueType,
//       data: {},
//       lastActive: Date.now()
//     };

//     this.reportingSessions.set(phoneNumber, session);

//     const issueTitles = {
//       [IssueType.POTHOLE]: 'pothole',
//       [IssueType.LITTER]: 'littered area',
//       [IssueType.SEWER]: 'sewer issue',
//       [IssueType.WATER_PIPE_BURST]: 'burst water pipe',
//       [IssueType.OTHER]: 'issue'
//     };

//     const welcomeMessage = `🚨 *Citizen Reporting - ${issueTitles[issueType].toUpperCase()}* 🚨

// I'll help you report this issue. Please follow the steps:

// 1. *Describe the issue* - Provide details about what you're seeing
// 2. *Location* - Share the street name or area
// 3. *Coordinates* - Share your location or describe precisely
// 4. *Media* - Upload photos, videos or send voice notes

// *Step 1/4:* Please describe the ${issueTitles[issueType]} in detail:`;

//     return await this.messagingService.sendTextMessage(phoneNumber, welcomeMessage, messageID);
//   }

//   async handleReportingStep(phoneNumber: string, message: string, messageID: string): Promise<boolean> {
//     const session = this.reportingSessions.get(phoneNumber);
//     if (!session) return false;

//     return this.handleReportingStepInner(phoneNumber, message, session, messageID);
//   }

//   private async handleReportingStepInner(
//     phoneNumber: string, 
//     message: string, 
//     session: UserReportingSession, 
//     messageID: string
//   ): Promise<boolean> {
//     session.lastActive = Date.now();

//     switch (session.currentStep) {
//       case 1: // Description
//         session.data.description = message;
//         session.currentStep = 2;
//         return await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '📍 *Step 2/4:* Please provide the location (street name, area, or landmark):',
//           messageID
//         );

//       case 2: // Location
//         session.data.location = message;
//         session.currentStep = 3;
//         return await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '🗺️ *Step 3/4:* Please share your location or describe the exact coordinates. You can:\n\n• Share your live location\n• Or type coordinates like: -17.8292, 31.0539\n• Or describe the exact spot',
//           messageID
//         );

//       case 3: // Coordinates
//         // Try to parse coordinates from message
//         const coords = this.parseCoordinates(message);
//         if (coords) {
//           session.data.latitude = coords.lat;
//           session.data.longitude = coords.lng;
//         }
//         session.currentStep = 4;
//         return await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '📸 *Step 4/4:* Please upload a photo/video of the issue or send a voice note with additional details.\n\nIf you don\'t have media, type "skip" or "submit" to complete your report.',
//           messageID
//         );

//       case 4: // Media or final submission
//         const normalizedMessage = message.toLowerCase().trim();
//         if (normalizedMessage === 'skip' || normalizedMessage === 'submit') {
//           return await this.completeReport(phoneNumber, session, messageID);
//         }
//         // For media, we'll handle in controller
//         return await this.messagingService.sendTextMessage(
//           phoneNumber,
//           'Please upload a photo, video or send a voice note, or type "skip" to submit without media.',
//           messageID
//         );
        
//       default:
//         return false;
//     }
//   }

//   private parseCoordinates(message: string): { lat: number; lng: number } | null {
//     // Try to parse coordinates like: -17.8292, 31.0539
//     const coordRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
//     const match = message.match(coordRegex);
    
//     if (match) {
//       return {
//         lat: parseFloat(match[1]),
//         lng: parseFloat(match[2])
//       };
//     }
//     return null;
//   }

//   async handleMediaInReport(phoneNumber: string, mediaType: 'image' | 'voice' | 'video', mediaUrl: string, messageID: string, mimeType?: string): Promise<boolean> {
//     const session = this.reportingSessions.get(phoneNumber);
//     if (!session || session.currentStep !== 4) {
//       return false;
//     }

//     try {
//       // Download media from WhatsApp
//       const mediaBuffer = await this.downloadMediaFromWhatsApp(mediaUrl);
      
//       // Save to local file system
//       const localFilePath = await this.saveMediaFile(mediaBuffer, phoneNumber, mediaType, mimeType || this.getDefaultMimeType(mediaType));

//       // Update session with local file path
//       if (mediaType === 'image') {
//         session.data.imageUrl = localFilePath;
//       } else if (mediaType === 'voice') {
//         session.data.voiceNoteUrl = localFilePath;
//       } else if (mediaType === 'video') {
//         session.data.videoUrl = localFilePath;
//       }

//       this.reportingSessions.set(phoneNumber, session);

//       // Update message to include video option
//       return await this.messagingService.sendTextMessage(
//         phoneNumber,
//         `✅ ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} received! You can:\n• Upload another photo/video\n• Send another voice note\n• Or type "submit" to complete your report`,
//         messageID
//       );
//     } catch (error) {
//       this.logger.error(`Error handling ${mediaType} in report:`, error);
//       return await this.messagingService.sendTextMessage(
//         phoneNumber,
//         `❌ Failed to process your ${mediaType}. Please try again or type "submit" to continue without media.`,
//         messageID
//       );
//     }
//   }

//   private async downloadMediaFromWhatsApp(mediaUrl: string): Promise<Buffer> {
//     const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

//     try {
//       const axios = require('axios');
//       const response = await axios.get(mediaUrl, {
//         responseType: 'arraybuffer',
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//         timeout: 30000,
//       });
//       return Buffer.from(response.data);
//     } catch (error) {
//       this.logger.error('Media download failed:', error);
//       throw new Error('Failed to download media from WhatsApp');
//     }
//   }

//   private getDefaultMimeType(mediaType: 'image' | 'voice' | 'video'): string {
//     const defaultMimeTypes: { [key: string]: string } = {
//       'image': 'image/jpeg',
//       'voice': 'audio/ogg', 
//       'video': 'video/mp4'
//     };
//     return defaultMimeTypes[mediaType];
//   }

//   async completeReport(phoneNumber: string, session: UserReportingSession, messageID?: string): Promise<boolean> {
//     try {
//       this.logger.log(`Completing report for ${phoneNumber}`);

//       // Validate required fields
//       if (!session.issueType || !session.data.description) {
//         this.logger.error('Missing required fields for report completion');
//         if (messageID) {
//           await this.messagingService.sendTextMessage(phoneNumber, '❌ Report incomplete. Please provide both issue type and description.', messageID);
//         }
//         return false;
//       }

//       // Find user
//       let user: User | null = null;
//       try {
//         const hashedPhone = await this.hashPhoneNumber(phoneNumber);
//         user = await this.userRepository.findOne({ 
//           where: { phoneNumber: hashedPhone } 
//         });
//       } catch (error) {
//         this.logger.debug(`User not found for ${phoneNumber}, proceeding as guest`);
//       }

//       // Create issue report
//       const issueReport = this.issueReportRepository.create({
//         user: user,
//         reportingPhoneNumber: phoneNumber,
//         type: session.issueType,
//         description: session.data.description,
//         location: session.data.location,
//         latitude: session.data.latitude,
//         longitude: session.data.longitude,
//         imageUrl: session.data.imageUrl,
//         voiceNoteUrl: session.data.voiceNoteUrl,
//         videoUrl: session.data.videoUrl,
//         status: IssueStatus.REPORTED,
//         createdAt: new Date(),
//         updatedAt: new Date()
//       });

//       await this.issueReportRepository.save(issueReport);

//       // Clear session - RELEASE USER FROM SESSION LOCK
//       this.reportingSessions.delete(phoneNumber);

//       // Send confirmation
//       const confirmationMessage = user 
//         ? `✅ Report submitted successfully!\n\n📋 Report #${issueReport.id}\n📝 Type: ${this.formatIssueType(session.issueType)}\n📍 Location: ${session.data.location || 'Not specified'}\n\nYou can view your reports anytime by sending "MY REPORTS".`
//         : `✅ Report submitted successfully!\n\n📋 Report #${issueReport.id}\n📝 Type: ${this.formatIssueType(session.issueType)}\n📍 Location: ${session.data.location || 'Not specified'}\n\n💡 Register to track your reports and access premium features. Send "REGISTER" to get started.`;

//       if (messageID) {
//         await this.messagingService.sendTextMessage(phoneNumber, confirmationMessage, messageID);
//       }
      
//       // Send final message indicating user can now use other services
//       if (messageID) {
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '🔄 *Session ended*\n\nYour issue report has been submitted successfully. You can now use other services like:\n\n• Report another issue\n• Report emergency\n• Check your reports\n• Register your account\n\nJust type what you need help with!',
//           messageID
//         );
//       }
      
//       this.logger.log(`Report completed successfully for ${phoneNumber}, Report ID: ${issueReport.id}. User is now free to use other services.`);
//       return true;

//     } catch (error) {
//       this.logger.error('Error completing report:', error);
//       if (messageID) {
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '❌ Failed to submit report. Please try again or contact support if the problem persists.',
//           messageID
//         );
//       }
//       return false;
//     }
//   }

//   // ADD THIS MISSING METHOD
//   private formatIssueType(issueType: IssueType): string {
//     const issueTypeMap: { [key in IssueType]: string } = {
//       [IssueType.POTHOLE]: 'Pothole',
//       [IssueType.LITTER]: 'Litter',
//       [IssueType.SEWER]: 'Sewer Issue',
//       [IssueType.WATER_PIPE_BURST]: 'Burst Water Pipe',
//       [IssueType.OTHER]: 'Issue'
//     };
//     return issueTypeMap[issueType] || 'Issue';
//   }

//   async handleTextAfterMedia(phoneNumber: string, message: string, messageID: string): Promise<boolean> {
//     const session = this.reportingSessions.get(phoneNumber);
//     if (!session || session.currentStep !== 4) {
//       return false;
//     }

//     const normalizedMessage = message.toLowerCase().trim();
    
//     // Handle submission commands
//     if (normalizedMessage === 'submit' || normalizedMessage === 'skip') {
//       return await this.completeReport(phoneNumber, session, messageID);
//     }

//     // If it's not a submission command, treat it as additional description
//     if (session.data.description) {
//       session.data.description += `\n\nAdditional note: ${message}`;
//       this.reportingSessions.set(phoneNumber, session);
      
//       return await this.messagingService.sendTextMessage(
//         phoneNumber,
//         '📝 Note added to your report. Type "submit" to complete your report or upload more media.',
//         messageID
//       );
//     }

//     // If we reach here, the message wasn't handled
//     return false;
//   }

//   async getUserReports(phoneNumber: string, messageID?: string): Promise<void> {
//     try {
//       let reports: IssueReport[] = [];

//       const hashedPhone = await this.hashPhoneNumber(phoneNumber);
//       const user = await this.userRepository.findOne({ 
//         where: { phoneNumber: hashedPhone } 
//       });

//       if (user) {
//         // Single query using QueryBuilder to get all relevant reports
//         reports = await this.issueReportRepository
//           .createQueryBuilder('report')
//           .where('report.userId = :userId', { userId: user.id })
//           .orWhere('(report.reportingPhoneNumber = :phoneNumber AND report.userId IS NULL)', { 
//             phoneNumber 
//           })
//           .orderBy('report.createdAt', 'DESC')
//           .take(10)
//           .getMany();

//         // Background process to link orphaned reports for future queries
//         this.linkOrphanedReportsToUser(phoneNumber, user.id).catch(error => {
//           this.logger.error('Background linking failed:', error);
//         });

//       } else {
//         // User is not registered - only get reports by phone number
//         reports = await this.issueReportRepository.find({
//           where: { reportingPhoneNumber: phoneNumber },
//           order: { createdAt: 'DESC' },
//           take: 10
//         });
//       }

//       // Rest of your method remains unchanged...
//       if (reports.length === 0) {
//         const message = user 
//           ? "📋 You haven't submitted any reports yet.\n\nSend 'REPORT' to start reporting an issue."
//           : "📋 You haven't submitted any reports yet, or your reports were submitted as a guest.\n\nSend 'REPORT' to start a new issue report.";
        
//         if (messageID) {
//           await this.messagingService.sendTextMessage(phoneNumber, message, messageID);
//         }
//         return;
//       }

//       let reportsMessage = `📋 *Your Recent Reports (${reports.length})*\n\n`;

//       reports.forEach((report, index) => {
//         const statusEmoji: { [key in IssueStatus]: string } = {
//           [IssueStatus.REPORTED]: '📝',
//           [IssueStatus.IN_PROGRESS]: '🔄',
//           [IssueStatus.RESOLVED]: '✅',
//           [IssueStatus.CLOSED]: '🔒'
//         };

//         reportsMessage += `${index + 1}. ${statusEmoji[report.status]} *${this.formatIssueType(report.type)}*\n`;
//         reportsMessage += `   📍 ${report.location || 'Location not specified'}\n`;
//         reportsMessage += `   🆔 #${report.id} | ${report.createdAt.toLocaleDateString()}\n`;
//         reportsMessage += `   📊 Status: ${report.status.replace('_', ' ').toUpperCase()}\n\n`;
//       });

//       if (!user) {
//         reportsMessage += "💡 *Register to:*\n• Track all your reports in one place\n• Get status updates\n• Access premium features\n\nSend 'REGISTER' to get started!";
//       }

//       if (messageID) {
//         await this.messagingService.sendTextMessage(phoneNumber, reportsMessage, messageID);
//       }
//     } catch (error) {
//       this.logger.error('Error fetching user reports:', error);
//       if (messageID) {
//         await this.messagingService.sendTextMessage(
//           phoneNumber,
//           '❌ Failed to fetch your reports. Please try again later.',
//           messageID
//         );
//       }
//     }
//   }

//   // NEW METHOD: Link orphaned reports to user account
//   private async linkOrphanedReportsToUser(phoneNumber: string, userId: number): Promise<void> {
//     try {
//       // Find all reports with this phone number that aren't linked to any user using QueryBuilder
//       const orphanedReports = await this.issueReportRepository
//         .createQueryBuilder('report')
//         .where('report.reportingPhoneNumber = :phoneNumber', { phoneNumber })
//         .andWhere('report.userId IS NULL')
//         .getMany();

//       if (orphanedReports.length > 0) {
//         // Update these reports to link them to the user
//         await this.issueReportRepository
//           .createQueryBuilder()
//           .update(IssueReport)
//           .set({ user: { id: userId } })
//           .where('reportingPhoneNumber = :phoneNumber', { phoneNumber })
//           .andWhere('userId IS NULL')
//           .execute();

//         this.logger.log(`Linked ${orphanedReports.length} orphaned reports to user ${userId}`);
//       }
//     } catch (error) {
//       this.logger.error('Error linking orphaned reports to user:', error);
//       // Don't throw error - this is a background process and shouldn't affect the main flow
//     }
//   }

//   private async hashPhoneNumber(phoneNumber: string): Promise<string> {
//     const salt = process.env.PHONE_HASH_SALT || 'default-salt';
//     const normalizedPhone = phoneNumber.replace(/\D/g, '');
//     return crypto.createHmac('sha256', salt).update(normalizedPhone).digest('hex');
//   }

//   // Cleanup old sessions
//   cleanupOldSessions(): void {
//     const now = Date.now();
//     for (const [phoneNumber, session] of this.reportingSessions.entries()) {
//       if (now - session.lastActive > this.SESSION_TTL) {
//         this.reportingSessions.delete(phoneNumber);
//         this.logger.log(`Cleaned up expired reporting session for ${phoneNumber}`);
//       }
//     }
//   }
// }

// // messaging.service.ts
// /* eslint-disable prettier/prettier */
// import { Injectable } from '@nestjs/common';
// import { HttpService } from '@nestjs/axios';
// import { ConfigService } from '@nestjs/config';
// import { firstValueFrom } from 'rxjs';

// interface MessageData {
//   messaging_product: string;
//   recipient_type: string;
//   to: string;
//   type: string;
//   text?: {
//     preview_url: boolean;
//     body: string;
//   };
//   interactive?: any;
// }

// @Injectable()
// export class MessagingService {
//   constructor(
//     private httpService: HttpService,
//     private configService: ConfigService,
//   ) {}

//   async sendTextMessage(recipient: string, message: string, messageID?: string): Promise<boolean> {
//     try {
//       const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
//       const version = this.configService.get<string>('WHATSAPP_API_VERSION');
//       const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

//       if (!phoneNumberId || !version || !accessToken) {
//         throw new Error('Missing WhatsApp configuration');
//       }

//       const messageData: MessageData = {
//         messaging_product: 'whatsapp',
//         recipient_type: 'individual',
//         to: recipient,
//         type: 'text',
//         text: {
//           preview_url: false,
//           body: message,
//         },
//       };

//       // Add context if provided
//       if (messageID) {
//         messageData['context'] = { message_id: messageID };
//       }

//       const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

//       const response$ = this.httpService.post(url, messageData, {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           'Content-Type': 'application/json',
//         },
//       });

//       await firstValueFrom(response$);
//       return true;
//     } catch (error) {
//       console.error('Error sending text message:', error);
//       return false;
//     }
//   }

//   async sendWhatsappMessage(messageData: MessageData, contextMessageId?: string): Promise<boolean> {
//     try {
//       const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
//       const version = this.configService.get<string>('WHATSAPP_API_VERSION');
//       const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

//       if (!phoneNumberId || !version || !accessToken) {
//         throw new Error('Missing WhatsApp configuration');
//       }

//       // Add context if provided
//       if (contextMessageId) {
//         messageData['context'] = { message_id: contextMessageId };
//       }

//       const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

//       const response$ = this.httpService.post(url, messageData, {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           'Content-Type': 'application/json',
//         },
//       });

//       await firstValueFrom(response$);
//       return true;
//     } catch (error) {
//       console.error('Error sending WhatsApp message:', error);
//       return false;
//     }
//   }
// }

// // nlp.service.ts
// /* eslint-disable @typescript-eslint/no-unsafe-return */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-call */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/require-await */
// /* eslint-disable prettier/prettier */
// import { Injectable, Logger } from '@nestjs/common';
// import { MessagingService } from './messaging.service';
// import { IssueReportingService } from './issue-reporting.service';
// import { EmergencyReportingService } from './emergency-reporting.service';

// @Injectable()
// export class NlpService {
//     private readonly logger = new Logger(NlpService.name);
    
//     // Natural Language Processing patterns
//     private readonly emergencyPatterns = {
//         robbery: ['mugging', 'theft', 'break in', 'breaking in', "robbery", "robber", "robbers", "robbed", "robbing", 
//             "armed robbery", "theft", "thief", "thieves", "stolen", "steal", "stealing", "stole", "burglary", "burglar", 
//             "burglars", "burgled", "break in", "break-in", "breaking-in", "larceny", "heist", "looting", "loot", "looted",
//             "looters", "looting incident", "hold up", "hold-up", "held up", "home invasion", "housebreaking", "house break-in",
//             "shoplifting", "pickpocket", "pickpocketing", "pickpocketed", "carjacking", "carjacked", "carjacker", "car hijack", 
//             "vehicle theft", "snatching", "snatched", "snatch", "purse snatching", "phone snatching", "pilfering", "pilfered", 
//             "stealing incident", "thievery", "embezzlement", "embezzled", "swindling", "extortion", "banditry", "bandits", 
//             "hijacking", "hijacked", "hijacker", "raid", "raided", "raiders", "smash and grab", "smash n grab", "smash 'n grab",
//             "smash & grab",
    
//             // --- English (colloquial / slang) ---
//             "got robbed", "got jacked", "got mugged", "got ripped off", "got my stuff taken", "my place got hit", 
//             "they cleaned me out", "someone broke into my house", "they took my phone", "they took my stuff", 
//             "they ran off with it", "someone swiped it", "my stuff's gone", "they smashed and grabbed", "smash and grab", 
//             "cleaned out", "got jumped", "they raided my place", "my wallet got lifted", "got nicked", "nicked my phone", 
//             "stole my phone", "took everything", "robbed me", "they broke my lock", "they hit my shop", "hit my house", 
//             "they robbed the shop", "robbed the store",
    
//             // --- Shona (formal) ---
//             "kuba", "kubirwa", "kubigwa", "mbavha", "matsotsi", "ndiri kubigwa", "ndiri kubirwa", "kutora chisiri chako", "kupinda nechisimba", 
//             "kupinda muchivande", "chinhu chakabiwa", "mhosva yekuba", "mhosva yekupamba",  "makororo andibira",  "makororo anditsotsa",
//             "makoronyera anditsotsa", "makoronyera andibira",

//             // --- Shona (colloquial / slang) ---
//             "akabiwa", "vakandibira", "vakandipamba", "vakandirova vakatora zvinhu", "mbavha dzakapinda", "vakandibata ngunzu",
//             "vakandibata huro", "huru work", "mbavha dzandibira", "vakanditora zvinhu zvangu", "akapambwa", "vakapinda mumba", 
//             "mbavha dzakapinda husiku", "zvandibira", "vakandibira nharembozha", "vakandipamba mumugwagwa", "akatorerwa zvinhu",
//             "vakandirova", "ndakabiwa", "ndakabirwa", "ndakatorerwa", "vakandipamba",

//             // --- Ndebele (formal) ---
//             "ukweba", "umtsotsi", "amatsotsi", "umbobho", "ukuphanga", "ukuphanga ngezibhamu", "ukutshontsha", "umkhohlisi", 
//             "igebengu", "umgulukudu", "umphangi", "ukugqekeza", "ugesiwe", "isela", "ukuphanga endlini", "ukweba imoto",
//             "ukwebiwa", "ukwebiwa impahla", "ukwebiwa imali",

//             // --- Ndebele (colloquial / slang) ---
//             "bangitshintshile", "bangithathe izinto zami", "bangiphanga", "bangiwebile", "bangigqekezile", "bangithathe ifoni", 
//             "amasela", "umtsotsi ungithathe", "umtsotsi ungiphanga", "bangiqhekeze ekhaya", "bangiqekeze", "bangiphanga ebusuku",
//             "amasela angene endlini", "bangiwebile imoto", "bangiwebile imali", "bangithathe izinto zami zonke",
//             "ngiphangiwe", "ngitshontshiwe", "ngibiwe",

//             // --- English + African hybrid (mixed language use) ---
//             "mbavha dzandirobha", "umtsotsi robbed me", "ndakabiwa phone", "phone yangu yakabiwa", "umtsotsi took my bag", 
//             "mbavha dzakapinda ndodzibata", "amatsotsi stole it", "vakandipamba last night", "bangiphanga ngo busuku", 
//             "ndakabiwa last night", "ndakabirwa zvinhu zvangu", "bangithathe izinto zami zonke", "mbavha dzandirobber",
//             "mbavha dzandi robber", "matsotsi andirobha", "matsotsi andi robber", "matsotsi andirobber", "makororo andi robber",
//             "makororo andirobber",  "makororo andirobha",

//             // --- Contextual phrases (multiword, used in real speech) ---
//             "they broke into my house", "they broke into my car", "someone entered my house", "thieves entered", "armed men came",
//             "gunmen attacked", "my home was robbed", "i was attacked and robbed", "they took everything from me", 
//             "they cleaned out my place", "vakandipamba nematombo", "mbavha dzakapinda mangwanani", "amasela angene ebusuku"],
//         violence: ['assault', 'attack', 'fighting', 'violence', 'abuse', 'beating', 'hurt me', 'threatening'],
//         medical: ['heart attack', 'stroke', 'bleeding', 'unconscious', 'not breathing', 'seizure', 'overdose'],
//         fire: ['fire', 'burning', 'smoke', 'flames', 'blaze'],
//         accident: ['accident', 'crash', 'collision', 'hit by', 'run over'],
//         danger: ['help me', 'emergency', 'urgent', 'danger', 'dangerous', 'scared', 'fear', 'threat'],
//         kidnapping: ['kidnap', 'abduction', 'taken', 'hostage'],
//         weapons: ['gun', 'knife', 'weapon', 'shot', 'stabbed']
//     };

//     private readonly issuePatterns = {
//         water: ['burst pipe', 'water leak', 'leaking pipe', 'water main', 'broken pipe', 'flooding', 'water flooding'],
//         sewerage: ['sewerage', 'sewage', 'sewer overflow', 'drainage', 'blocked drain', 'sewer backup', 'toilet backup'],
//         electricity: ['power outage', 'no electricity', 'blackout', 'electrical fault', 'sparking wires', 'downed power lines'],
//         roads: ['pothole', 'road damage', 'sinkhole', 'road hazard', 'broken road'],
//         sanitation: ['garbage', 'trash', 'rubbish', 'waste', 'dumping', 'litter', 'cleanup'],
//         public: ['vandalism', 'graffiti', 'broken bench', 'park damage', 'public facility'],
//         noise: ['noise complaint', 'loud noise', 'disturbance', 'noisy neighbors']
//     };

//     // Research/information queries that should NOT be treated as emergencies
//     private readonly researchPatterns = [
//         'search', 'article', 'query', 'find', 'information about', 'tell me about', 
//         'research', 'study', 'data', 'report on', 'analyze', 'explain in detail',
//         'comprehensive', 'deep dive', 'what is', 'how does', 'why is', 'when was',
//         'where can i find', 'can you help me with', 'i need information on',
//         'looking for', 'details about', 'more about', 'background on', 'knowledge',
//         'learn about', 'understand', 'information', 'resources', 'material'
//     ];

//     constructor(
//             private readonly messagingService: MessagingService,
//             private readonly issueReportingService: IssueReportingService,
//             private readonly emergencyReportingService: EmergencyReportingService,
//         ) {}

//     /**
//      * Natural Language Processing to detect emergencies and issues from natural language
//      */
//     async processNaturalLanguage(text: string, phoneNumber: string): Promise<{ handled: boolean; type?: string; data?: any }> {
//         try {
//             const normalizedText = text.toLowerCase().trim();
            
//             // Skip NLP for research queries (already handled above)
//             if (this.isResearchQuery(normalizedText)) {
//                 return { handled: false };
//             }

//             // Check for emergency patterns
//             const emergencyMatch = this.detectEmergency(normalizedText);
//             if (emergencyMatch) {
//                 this.logger.log(`NLP detected emergency: ${emergencyMatch.type} for user ${phoneNumber}`);
//                 return { 
//                     handled: true, 
//                     type: 'emergency',
//                     data: emergencyMatch
//                 };
//             }

//             // Check for issue reporting patterns
//             const issueMatch = this.detectIssue(normalizedText);
//             if (issueMatch) {
//                 this.logger.log(`NLP detected issue: ${issueMatch.type} for user ${phoneNumber}`);
//                 return { 
//                     handled: true, 
//                     type: 'issue',
//                     data: issueMatch
//                 };
//             }

//             return { handled: false };
//         } catch (error) {
//             this.logger.error('Error in natural language processing:', error);
//             return { handled: false };
//         }
//     }

//     /**
//      * Detect emergency situations from natural language
//      */
//     private detectEmergency(text: string): { type: string; confidence: number; keywords: string[] } | null {
//         const detectedKeywords: string[] = [];
//         let confidence = 0;

//         // Check each emergency category
//         for (const [category, patterns] of Object.entries(this.emergencyPatterns)) {
//             const matches = patterns.filter(pattern => text.includes(pattern));
//             if (matches.length > 0) {
//                 detectedKeywords.push(...matches);
//                 confidence += matches.length * 0.3; // Increase confidence based on number of matches
                
//                 // High confidence for specific dangerous situations
//                 if (['robbery', 'violence', 'weapons', 'kidnapping'].includes(category)) {
//                     confidence += 0.5;
//                 }
//             }
//         }

//         // Additional context-based detection
//         if (text.includes('help') && (text.includes('now') || text.includes('urgent') || text.includes('please'))) {
//             confidence += 0.4;
//             detectedKeywords.push('urgent_help');
//         }

//         if (confidence > 0.3) {
//             const primaryType = this.getPrimaryEmergencyType(detectedKeywords);
//             return {
//                 type: primaryType,
//                 confidence: Math.min(confidence, 1.0),
//                 keywords: detectedKeywords
//             };
//         }

//         return null;
//     }

//     /**
//      * Detect issue reporting from natural language
//      */
//     private detectIssue(text: string): { type: string; confidence: number; keywords: string[] } | null {
//         const detectedKeywords: string[] = [];
//         let confidence = 0;

//         // Check each issue category
//         for (const [category, patterns] of Object.entries(this.issuePatterns)) {
//             const matches = patterns.filter(pattern => text.includes(pattern));
//             if (matches.length > 0) {
//                 detectedKeywords.push(...matches);
//                 confidence += matches.length * 0.4; // Higher base confidence for issues
//             }
//         }

//         // Context clues for issues
//         if ((text.includes('broken') || text.includes('damaged') || text.includes('leaking')) && 
//             !this.containsEmergencyWords(text)) {
//             confidence += 0.3;
//         }

//         if (confidence > 0.4) {
//             const primaryType = this.getPrimaryIssueType(detectedKeywords);
//             return {
//                 type: primaryType,
//                 confidence: Math.min(confidence, 1.0),
//                 keywords: detectedKeywords
//             };
//         }

//         return null;
//     }

//     /**
//      * Check if text contains emergency-related words that might override issue detection
//      */
//     private containsEmergencyWords(text: string): boolean {
//         const emergencyWords = ['emergency', 'urgent', 'help', 'danger', 'dangerous', 'accident', 'hurt', 'injured'];
//         return emergencyWords.some(word => text.includes(word));
//     }

//     /**
//      * Determine primary emergency type based on detected keywords
//      */
//     private getPrimaryEmergencyType(keywords: string[]): string {
//         const priorityOrder = [
//             'kidnapping', 'weapons', 'violence', 'robbery', 
//             'medical', 'fire', 'accident', 'danger'
//         ];

//         for (const type of priorityOrder) {
//             if (keywords.some(keyword => this.emergencyPatterns[type]?.includes(keyword))) {
//                 return type;
//             }
//         }

//         return 'general';
//     }

//     getEmergencyTypeDisplay(type: string): string {
//         const emergencyTypes = {
//             robbery: 'Robbery/Theft',
//             violence: 'Violence/Assault',
//             medical: 'Medical Emergency',
//             fire: 'Fire',
//             accident: 'Accident',
//             kidnapping: 'Kidnapping/Abduction',
//             weapons: 'Armed Incident',
//             danger: 'General Danger',
//             general: 'Emergency Situation'
//         };
//         return emergencyTypes[type] || 'Emergency Situation';
//     }

//     getIssueTypeDisplay(type: string): string {
//         const issueTypes = {
//             water: 'Water Leak/Burst Pipe',
//             sewerage: 'Sewerage Overflow',
//             electricity: 'Power/Electricity Issue',
//             roads: 'Road Damage',
//             sanitation: 'Sanitation/Garbage',
//             public: 'Public Facility Damage',
//             noise: 'Noise Complaint',
//             general: 'General Issue'
//         };
//         return issueTypes[type] || 'General Issue';
//     }

//     /**
//      * Determine primary issue type based on detected keywords
//      */
//     private getPrimaryIssueType(keywords: string[]): string {
//         const priorityOrder = [
//             'water', 'sewerage', 'electricity', 'roads', 
//             'sanitation', 'public', 'noise'
//         ];

//         for (const type of priorityOrder) {
//             if (keywords.some(keyword => this.issuePatterns[type]?.includes(keyword))) {
//                 return type;
//             }
//         }

//         return 'general';
//     }

//     /**
//      * Check if query is a research/information query that should not be treated as emergency
//      */
//     isResearchQuery(text: string): boolean {
//         const normalizedText = text.toLowerCase().trim();
        
//         // Check for research/information patterns
//         const hasResearchIndicator = this.researchPatterns.some(pattern => 
//             normalizedText.includes(pattern)
//         );

//         // Check for topic indicators that are clearly informational
//         const topicIndicators = [
//             'drug', 'substance', 'abuse', 'health', 'education', 'treatment',
//             'prevention', 'awareness', 'counseling', 'rehabilitation', 'mental health',
//             'addiction', 'recovery', 'therapy', 'medical', 'psychological'
//         ];

//         const hasTopicIndicator = topicIndicators.some(topic => 
//             normalizedText.includes(topic)
//         );

//         // It's a research query if it has research indicators AND doesn't contain emergency words
//         if (hasResearchIndicator && !this.containsEmergencyWords(normalizedText)) {
//             return true;
//         }

//         // It's also a research query if it has both research and topic indicators
//         if (hasResearchIndicator && hasTopicIndicator) {
//             return true;
//         }

//         return false;
//     }
// } 


// // session-manager.service.ts
// /* eslint-disable @typescript-eslint/no-unsafe-call */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable prettier/prettier */
// /* eslint-disable @typescript-eslint/no-unsafe-argument */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// import { Injectable, Logger } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
// import { 
//   AuthSession, 
//   LoginSession, 
//   UserSession, 
//   RegistrationSession, 
//   ActiveSession, 
//   SessionType, 
//   SessionStatus 
// } from '../../database/session.entity';

// @Injectable()
// export class SessionManagerService {
//   private readonly logger = new Logger(SessionManagerService.name);
  
//   // Session timeouts (in milliseconds)
//   private readonly SESSION_TIMEOUTS = {
//     [SessionType.EMERGENCY]: 15 * 60 * 1000, // 15 minutes
//     [SessionType.ISSUE_REPORTING]: 15 * 60 * 1000, // 15 minutes
//     [SessionType.REGISTRATION]: 30 * 60 * 1000, // 30 minutes
//     [SessionType.LOGIN]: 24 * 60 * 60 * 1000, // 24 hours
//     [SessionType.USER]: 30 * 60 * 1000, // 30 minutes
//     [SessionType.AUTH]: 15 * 60 * 1000, // 15 minutes
//   };

//   // Message deduplication
//   private readonly processedMessages = new Map<string, number>();
//   private readonly MESSAGE_TTL = 300000; // 5 minutes TTL

//   // In-memory registration sessions
//   private readonly usersInRegistration = new Map<string, any>();

//   constructor(
//     @InjectRepository(AuthSession)
//     private authSessionRepository: Repository<AuthSession>,
    
//     @InjectRepository(LoginSession)
//     private loginSessionRepository: Repository<LoginSession>,
    
//     @InjectRepository(UserSession)
//     private userSessionRepository: Repository<UserSession>,
    
//     @InjectRepository(RegistrationSession)
//     private registrationSessionRepository: Repository<RegistrationSession>,
    
//     @InjectRepository(ActiveSession)
//     private activeSessionRepository: Repository<ActiveSession>,
//   ) {}

//   // ==================== AUTH SESSION METHODS (from session.ts) ====================
//   async createAuthSession(phoneNumber: string): Promise<string> {
//     await this.cleanupExpiredAuthSessions();
    
//     const sessionID = this.generateSessionId();
//     const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

//     const session = this.authSessionRepository.create({
//       sessionID,
//       phoneNumber,
//       verified: false,
//       lastActivity: new Date(),
//       expiresAt,
//     });
    
//     await this.authSessionRepository.save(session);
//     return sessionID;
//   }

//   async updateAuthActivity(sessionID: string): Promise<void> {
//     const session = await this.authSessionRepository.findOne({
//       where: { sessionID, expiresAt: MoreThanOrEqual(new Date()) }
//     });
//     if (session) {
//       session.lastActivity = new Date();
//       await this.authSessionRepository.save(session);
//     }
//   }

//   async verifyAuthSession(sessionID: string): Promise<boolean> {
//     const session = await this.authSessionRepository.findOne({
//       where: { sessionID, expiresAt: MoreThanOrEqual(new Date()) }
//     });

//     if (!session) return false;
    
//     session.verified = true;
//     session.lastActivity = new Date();
//     await this.authSessionRepository.save(session);
//     return true;
//   }

//   async isAuthSessionVerified(sessionID: string): Promise<boolean> {
//     const session = await this.authSessionRepository.findOne({
//       where: { sessionID, expiresAt: MoreThanOrEqual(new Date()) }
//     });

//     if (!session || !session.verified) return false;
    
//     // Update last activity
//     session.lastActivity = new Date();
//     await this.authSessionRepository.save(session);
    
//     return true;
//   }

//   async getPhoneNumberByAuthSession(sessionID: string): Promise<string | null> {
//     const session = await this.authSessionRepository.findOne({
//       where: { sessionID, expiresAt: MoreThanOrEqual(new Date()) }
//     });
    
//     return session?.phoneNumber || null;
//   }

//   // ==================== ACTIVE SESSION MANAGEMENT ====================
//   async createOrUpdateActiveSession(
//     phoneNumber: string,
//     sessionType: SessionType,
//     currentStep: number,
//     sessionData: any,
//     messageId?: string
//   ): Promise<ActiveSession> {
//     await this.cleanupExpiredActiveSessions();

//     const expiresAt = new Date(Date.now() + this.SESSION_TIMEOUTS[sessionType]);
    
//     let session = await this.activeSessionRepository.findOne({
//       where: { 
//         phoneNumber,
//         sessionType,
//         status: SessionStatus.ACTIVE
//       }
//     });

//     const sessionDataString = JSON.stringify({
//       ...sessionData,
//       currentStep,
//       lastMessageId: messageId,
//       createdAt: session?.createdAt || new Date()
//     });

//     if (session) {
//       session.currentStep = currentStep;
//       session.sessionData = sessionDataString;
//       session.lastActive = new Date();
//       session.expiresAt = expiresAt;
//       session.updatedAt = new Date();
//     } else {
//       session = this.activeSessionRepository.create({
//         phoneNumber,
//         sessionType,
//         currentStep,
//         sessionData: sessionDataString,
//         status: SessionStatus.ACTIVE,
//         lastActive: new Date(),
//         expiresAt,
//         createdAt: new Date()
//       });
//     }

//     return await this.activeSessionRepository.save(session);
//   }

//   async hasActiveGuidedSession(phoneNumber: string): Promise<boolean> {
//     const guidedSessionTypes = [
//       SessionType.REGISTRATION,
//       SessionType.EMERGENCY,
//       SessionType.ISSUE_REPORTING
//     ];

//     const session = await this.activeSessionRepository.findOne({
//       where: {
//         phoneNumber,
//         sessionType: In(guidedSessionTypes),
//         status: SessionStatus.ACTIVE,
//         expiresAt: MoreThanOrEqual(new Date())
//       }
//     });

//     return !!session;
//   }

//   async getActiveSession(phoneNumber: string, sessionType?: SessionType): Promise<ActiveSession | null> {
//     const where: any = {
//       phoneNumber,
//       status: SessionStatus.ACTIVE,
//       expiresAt: MoreThanOrEqual(new Date())
//     };

//     if (sessionType) {
//       where.sessionType = sessionType;
//     }

//     return await this.activeSessionRepository.findOne({
//       where,
//       order: { lastActive: 'DESC' }
//     });
//   }

//   async completeSession(phoneNumber: string, sessionType: SessionType): Promise<boolean> {
//     try {
//       const result = await this.activeSessionRepository.update(
//         {
//           phoneNumber,
//           sessionType,
//           status: SessionStatus.ACTIVE
//         },
//         {
//           status: SessionStatus.COMPLETED,
//           updatedAt: new Date()
//         }
//       );

//       return result.affected! > 0;
//     } catch (error) {
//       this.logger.error('Error completing session:', error);
//       return false;
//     }
//   }

//   async cancelSession(phoneNumber: string, sessionType?: SessionType): Promise<boolean> {
//     try {
//       const where: any = {
//         phoneNumber,
//         status: SessionStatus.ACTIVE
//       };

//       if (sessionType) {
//         where.sessionType = sessionType;
//       }

//       const result = await this.activeSessionRepository.update(
//         where,
//         {
//           status: SessionStatus.CANCELLED,
//           updatedAt: new Date()
//         }
//       );

//       const cancelled = result.affected! > 0;
//       if (cancelled) {
//         this.logger.log(`Session cancelled for ${phoneNumber}: ${sessionType || 'all'}`);
//       }

//       return cancelled;
//     } catch (error) {
//       this.logger.error('Error cancelling session:', error);
//       return false;
//     }
//   }

//   // ==================== REGISTRATION SESSION METHODS ====================
//   hasActiveRegistrationSession(phoneNumber: string): boolean {
//     const registrationData = this.usersInRegistration.get(phoneNumber);
//     if (!registrationData) return false;
    
//     const isActive = (Date.now() - registrationData.lastActive) < (30 * 60 * 1000);
//     if (!isActive) {
//       if (registrationData.sessionId) {
//         this.deleteRegistrationSession(registrationData.sessionId.toString()).catch(error => {
//           this.logger.error('Error removing expired registration session:', error);
//         });
//       }
//       this.usersInRegistration.delete(phoneNumber);
//     }
//     return isActive;
//   }

//   setRegistrationSession(phoneNumber: string, data: any): void {
//     this.usersInRegistration.set(phoneNumber, {
//       ...data,
//       lastActive: Date.now()
//     });
//   }

//   removeRegistrationSession(phoneNumber: string): void {
//     this.usersInRegistration.delete(phoneNumber);
//   }

//   async getRegistrationSession(phoneNumber: string): Promise<RegistrationSession | null> {
//     await this.cleanupExpiredRegistrationSessions();
    
//     return await this.registrationSessionRepository.findOne({
//       where: { 
//         phoneNumber, 
//         expiresAt: MoreThanOrEqual(new Date()) 
//       }
//     });
//   }

//   async createOrUpdateRegistrationSession(
//     phoneNumber: string, 
//     step: number, 
//     data: Record<string, any>
//   ): Promise<{ session: RegistrationSession; activeSession: ActiveSession }> {
//     await this.cleanupExpiredRegistrationSessions();
    
//     const expiresAt = new Date(Date.now() + this.SESSION_TIMEOUTS[SessionType.REGISTRATION]);
//     const dataString = JSON.stringify(data);
    
//     let session = await this.registrationSessionRepository.findOne({
//       where: { phoneNumber }
//     });

//     if (session) {
//       session.step = step;
//       session.data = dataString;
//       session.lastActive = new Date();
//       session.expiresAt = expiresAt;
//     } else {
//       session = this.registrationSessionRepository.create({
//         phoneNumber,
//         step,
//         data: dataString,
//         lastActive: new Date(),
//         expiresAt
//       });
//     }

//     const savedSession = await this.registrationSessionRepository.save(session);
    
//     // Create active session for locking
//     const activeSession = await this.createOrUpdateActiveSession(
//       phoneNumber,
//       SessionType.REGISTRATION,
//       step,
//       data
//     );

//     return { session: savedSession, activeSession };
//   }

//   async deleteRegistrationSession(phoneNumber: string): Promise<void> {
//     try {
//       const result = await this.registrationSessionRepository.delete({ 
//         phoneNumber: phoneNumber.toString() 
//       });
      
//       if (result.affected! > 0) {
//         this.logger.log(`Registration session deleted for ${phoneNumber}`);
//       }
      
//       // Also remove from memory
//       this.usersInRegistration.delete(phoneNumber);
//     } catch (error) {
//       this.logger.error('Error deleting registration session:', error);
//       throw error;
//     }
//   }

//   // ==================== LOGIN SESSION METHODS ====================
//   async createLoginSession(phoneNumber: string): Promise<string> {
//     await this.cleanupExpiredLoginSessions();
    
//     const sessionToken = this.generateSessionId();
//     const now = new Date();
//     const expiresAt = new Date(now.getTime() + this.SESSION_TIMEOUTS[SessionType.LOGIN]);

//     const loginSession = this.loginSessionRepository.create({
//       phoneNumber,
//       sessionToken,
//       expiresAt,
//       lastActive: now,
//       status: 'active'
//     });

//     await this.loginSessionRepository.save(loginSession);
//     this.logger.log(`Login session created for ${phoneNumber}`);
    
//     return sessionToken;
//   }

//   async hasValidLoginSession(phoneNumber: string): Promise<boolean> {
//     try {
//       const now = new Date();
      
//       const activeSession = await this.loginSessionRepository.findOne({
//         where: {
//           phoneNumber,
//           status: 'active',
//           expiresAt: MoreThanOrEqual(now)
//         }
//       });

//       if (activeSession) {
//         // Update last active time
//         activeSession.lastActive = now;
//         await this.loginSessionRepository.save(activeSession);
//         return true;
//       }

//       return false;
//     } catch (error) {
//       this.logger.error('Error checking login session:', error);
//       return false;
//     }
//   }

//   async removeLoginSession(phoneNumber: string): Promise<boolean> {
//     try {
//       const result = await this.loginSessionRepository.update(
//         { 
//           phoneNumber, 
//           status: 'active' 
//         },
//         { 
//           status: 'logged_out',
//           updatedAt: new Date()
//         }
//       );

//       const wasRemoved = result.affected! > 0;
//       if (wasRemoved) {
//         this.logger.log(`Login session removed for ${phoneNumber}`);
//       }
      
//       return wasRemoved;
//     } catch (error) {
//       this.logger.error('Error removing login session:', error);
//       return false;
//     }
//   }

//   async getActiveLoginSession(phoneNumber: string): Promise<LoginSession | null> {
//     try {
//       const now = new Date();
      
//       return await this.loginSessionRepository.findOne({
//         where: {
//           phoneNumber,
//           status: 'active',
//           expiresAt: MoreThanOrEqual(now)
//         },
//         order: { createdAt: 'DESC' }
//       });
//     } catch (error) {
//       this.logger.error('Error getting active login session:', error);
//       return null;
//     }
//   }

//   // ==================== USER SESSION METHODS ====================
//   async getUserSession(phoneNumber: string): Promise<UserSession | null> {
//     await this.cleanupExpiredUserSessions();
    
//     return await this.userSessionRepository.findOne({
//       where: { 
//         phoneNumber, 
//         expiresAt: MoreThanOrEqual(new Date()) 
//       }
//     });
//   }

//   async updateUserSession(phoneNumber: string, organisation?: string, sessionData?: any): Promise<void> {
//     await this.cleanupExpiredUserSessions();
    
//     const expiresAt = new Date(Date.now() + this.SESSION_TIMEOUTS[SessionType.USER]);
    
//     let session = await this.userSessionRepository.findOne({
//       where: { phoneNumber }
//     });

//     const sessionDataString = sessionData ? JSON.stringify(sessionData) : null;

//     if (session) {
//       session.organisation = organisation!;
//       session.sessionData = sessionDataString!;
//       session.expiresAt = expiresAt;
//       session.updatedAt = new Date();
//     } else {
//       session = this.userSessionRepository.create({
//         phoneNumber,
//         organisation,
//         sessionData: sessionDataString!,
//         expiresAt
//       });
//     }

//     await this.userSessionRepository.save(session);
//   }

//   async clearUserSession(phoneNumber: string): Promise<void> {
//     await this.userSessionRepository.delete({ phoneNumber });
//   }

//   // ==================== MESSAGE DEDUPLICATION ====================
//   isMessageProcessedRecently(messageID: string): boolean {
//     const now = Date.now();
//     if (this.processedMessages.has(messageID)) {
//       const processedTime = this.processedMessages.get(messageID) || 0;
//       if (now - processedTime < this.MESSAGE_TTL) {
//         this.logger.debug(`Message ${messageID} processed recently`);
//         return true;
//       }
//     }
//     return false;
//   }

//   markMessageAsProcessed(messageID: string): void {
//     this.processedMessages.set(messageID, Date.now());
//   }

//   // ==================== CLEANUP METHODS ====================
//   private async cleanupExpiredAuthSessions() {
//     await this.authSessionRepository
//       .createQueryBuilder()
//       .delete()
//       .where('expiresAt < :now', { now: new Date() })
//       .execute();
//   }

//   async cleanupExpiredActiveSessions(): Promise<void> {
//     const now = new Date();
    
//     await this.activeSessionRepository.update(
//       {
//         status: SessionStatus.ACTIVE,
//         expiresAt: LessThanOrEqual(now)
//       },
//       {
//         status: SessionStatus.EXPIRED,
//         updatedAt: now
//       }
//     );
//   }

//   async cleanupExpiredLoginSessions(): Promise<number> {
//     try {
//       const now = new Date();
      
//       const result = await this.loginSessionRepository.update(
//         {
//           status: 'active',
//           expiresAt: LessThanOrEqual(now)
//         },
//         {
//           status: 'expired',
//           updatedAt: now
//         }
//       );

//       const cleanedCount = result.affected!;
//       if (cleanedCount > 0) {
//         this.logger.log(`Cleaned up ${cleanedCount} expired login sessions`);
//       }
      
//       return cleanedCount;
//     } catch (error) {
//       this.logger.error('Error cleaning up expired login sessions:', error);
//       return 0;
//     }
//   }

//   private async cleanupExpiredUserSessions() {
//     await this.userSessionRepository
//       .createQueryBuilder()
//       .delete()
//       .where('expiresAt < :now', { now: new Date() })
//       .execute();
//   }

//   private async cleanupExpiredRegistrationSessions() {
//     const now = new Date();
//     await this.registrationSessionRepository
//       .createQueryBuilder()
//       .delete()
//       .where('expiresAt < :now', { now })
//       .execute();
    
//     // Also clean up in-memory sessions
//     for (const [phoneNumber, data] of this.usersInRegistration.entries()) {
//       if (Date.now() - data.lastActive > this.SESSION_TIMEOUTS[SessionType.REGISTRATION]) {
//         this.usersInRegistration.delete(phoneNumber);
//       }
//     }
//   }

//   private cleanupProcessedMessages() {
//     const now = Date.now();
//     for (const [messageId, timestamp] of this.processedMessages.entries()) {
//       if (now - timestamp > this.MESSAGE_TTL) {
//         this.processedMessages.delete(messageId);
//       }
//     }
//   }

//   private cleanupStaleRegistrations(): void {
//     const now = Date.now();
//     const staleThreshold = 30 * 60 * 1000; // 30 minutes
    
//     for (const [phoneNumber, data] of this.usersInRegistration.entries()) {
//       if (now - data.lastActive > staleThreshold) {
//         if (data.sessionId) {
//           this.deleteRegistrationSession(data.sessionId.toString()).catch(error => {
//             this.logger.error('Error removing stale registration session:', error);
//           });
//         }
//         this.usersInRegistration.delete(phoneNumber);
//         this.logger.log(`Cleaned up stale registration session for ${phoneNumber}`);
//       }
//     }
//   }

//   // ==================== COMPREHENSIVE CLEANUP ====================
//   async performAllCleanup(): Promise<void> {
//     await Promise.all([
//       this.cleanupExpiredAuthSessions(),
//       this.cleanupExpiredActiveSessions(),
//       this.cleanupExpiredLoginSessions(),
//       this.cleanupExpiredUserSessions(),
//       this.cleanupExpiredRegistrationSessions()
//     ]);
    
//     this.cleanupProcessedMessages();
//     this.cleanupStaleRegistrations();
    
//     this.logger.log('Completed all session cleanup tasks');
//   }

//   // ==================== UTILITY METHODS ====================
//   private generateSessionId(): string {
//     return Array.from({ length: 32 }, () => 
//       Math.floor(Math.random() * 16).toString(16)
//     ).join('');
//   }

//   async logoutUserCompletely(phoneNumber: string): Promise<boolean> {
//     try {
//       await Promise.all([
//         this.removeLoginSession(phoneNumber),
//         this.clearUserSession(phoneNumber),
//         this.deleteRegistrationSession(phoneNumber),
//         this.cancelSession(phoneNumber),
//         this.authSessionRepository.delete({ phoneNumber })
//       ]);

//       this.logger.log(`Complete logout performed for ${phoneNumber}`);
//       return true;
//     } catch (error) {
//       this.logger.error('Error during complete logout:', error);
//       return false;
//     }
//   }

//   // ==================== SESSION LOCKING & NLP PROTECTION ====================
//   async shouldBypassNLP(phoneNumber: string): Promise<boolean> {
//     return await this.hasActiveGuidedSession(phoneNumber);
//   }

//   async getCurrentStep(phoneNumber: string): Promise<{ step: number; data: any } | null> {
//     const session = await this.getActiveSession(phoneNumber);
//     if (!session) return null;

//     const sessionData = JSON.parse(session.sessionData || '{}');
//     return {
//       step: session.currentStep,
//       data: sessionData
//     };
//   }
// }

// // storage.service.ts
// /* eslint-disable @typescript-eslint/restrict-template-expressions */
// /* eslint-disable @typescript-eslint/require-await */
// /* eslint-disable prettier/prettier */
// import { Injectable, Logger } from '@nestjs/common';
// import { writeFileSync, mkdirSync, existsSync } from 'fs';
// import { join } from 'path';

// @Injectable()
// export class StorageService {
//     private readonly logger = new Logger(StorageService.name);
//     private readonly baseDir = 'C:/Users/ACER/Documents/CourseGenerator/chatbot/uploads';
//     private readonly idDir = join(this.baseDir, 'ids');
//     private readonly porDir = join(this.baseDir, 'por');
//     private readonly issueImagesDir = join(this.baseDir, 'issue_images');
//     private readonly issueVoiceNotesDir = join(this.baseDir, 'issue_voice_notes');
//     private readonly issueVideosDir = join(this.baseDir, 'issue_videos');

//     constructor() {
//         this.ensureDirs();
//     }

//     private ensureDirs() {
//         try {
//             if (!existsSync(this.baseDir)) mkdirSync(this.baseDir);
//             if (!existsSync(this.idDir)) mkdirSync(this.idDir);
//             if (!existsSync(this.porDir)) mkdirSync(this.porDir);
//             if (!existsSync(this.issueImagesDir)) mkdirSync(this.issueImagesDir);
//             if (!existsSync(this.issueVoiceNotesDir)) mkdirSync(this.issueVoiceNotesDir);
//             if (!existsSync(this.issueVideosDir)) mkdirSync(this.issueVideosDir);
//         } catch (error) {
//             this.logger.error('Error creating storage directories', error);
//             throw error;
//         }
//     }

//     async saveMediaFile(phoneNumber: string, buffer: Buffer, filename: string, mediaType: 'image' | 'voice' | 'video'): Promise<string> {
//         try {
//             const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            
//             let filePath: string;
            
//             switch (mediaType) {
//                 case 'image':
//                 filePath = join(this.issueImagesDir, sanitizedFilename);
//                 break;
//                 case 'voice':
//                 filePath = join(this.issueVoiceNotesDir, sanitizedFilename);
//                 break;
//                 case 'video':
//                 filePath = join(this.issueVideosDir, sanitizedFilename);
//                 break;
//                 default:
//                 throw new Error(`Unsupported media type: ${mediaType}`);
//             }
            
//             writeFileSync(filePath, buffer);
//             return filePath;
//         } catch (error) {
//             this.logger.error(`Error saving ${mediaType} file for ${phoneNumber}`, error);
//             throw new Error(`Failed to save ${mediaType} file`);
//         }
//     }

//     async saveIdDocument(phoneNumber: string, buffer: Buffer, filename: string): Promise<string> {
//         try {
//             const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
//             const filePath = join(this.idDir, `${sanitizedFilename}`);
            
//             writeFileSync(filePath, buffer);
//             return filePath;
//         } catch (error) {
//             this.logger.error(`Error saving ID document for ${phoneNumber}`, error);
//             throw new Error('Failed to save ID document');
//         }
//     }

//     async saveProofOfResidence(phoneNumber: string, buffer: Buffer, filename: string): Promise<string> {
//         try {
//             const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
//             const filePath = join(this.porDir, `${sanitizedFilename}`);
            
//             writeFileSync(filePath, buffer);
//             return filePath;
//         } catch (error) {
//             this.logger.error(`Error saving proof of residence for ${phoneNumber}`, error);
//             throw new Error('Failed to save proof of residence');
//         }
//     }
// }

// // emergency-reporting.module.ts
// /* eslint-disable prettier/prettier */
// import { Module, forwardRef } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { EmergencyReportingService } from '../services/emergency-reporting.service';
// import { EmergencyReport } from '../../database/emergency-report.entity';
// import { User } from '../../database/user.entity';
// import { WhatsappModule } from '../whatsapp.module'; 
// import { AnalyticsDaily, LocationAnalytics, UserAnalytics, DepartmentAnalytics } from '../../database/analytics.entity';
// import { SessionModule } from './session.module';

// @Module({
//   imports: [
//     TypeOrmModule.forFeature([
//       EmergencyReport, 
//       User,
//       AnalyticsDaily,
//       LocationAnalytics,
//       UserAnalytics,
//       DepartmentAnalytics
//     ]),
//     forwardRef(() => WhatsappModule),
//     SessionModule
//   ],
//   providers: [EmergencyReportingService],
//   exports: [EmergencyReportingService],
// })
// export class EmergencyReportingModule {}

// // issue-reporting.module.ts
// /* eslint-disable prettier/prettier */
// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { IssueReportingService } from '../services/issue-reporting.service';
// import { IssueReport } from '../../database/issue-report.entity';
// import { User } from '../../database/user.entity';
// import { StorageModule } from './storage.module';

// @Module({
//   imports: [
//     TypeOrmModule.forFeature([IssueReport, User]),
//     StorageModule,
//   ],
//   providers: [
//     IssueReportingService,
//   ],
//   exports: [IssueReportingService]
// })
// export class IssueReportingModule {}

// // session.module.ts
// /* eslint-disable prettier/prettier */
// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { SessionManagerService } from '../services/session-manager.service';
// import { AuthSession, LoginSession, UserSession, RegistrationSession, ActiveSession } from '../../database/session.entity';

// @Module({
//   imports: [
//     TypeOrmModule.forFeature([
//       AuthSession,
//       LoginSession,
//       UserSession,
//       RegistrationSession,
//       ActiveSession
//     ]),
//   ],
//   providers: [SessionManagerService],
//   exports: [SessionManagerService],
// })
// export class SessionModule {}

// // storage.module.ts
// /* eslint-disable prettier/prettier */
// import { Module } from '@nestjs/common';
// import { StorageService } from '../services/storage.service';

// @Module({
//   providers: [StorageService],
//   exports: [StorageService],
// })
// export class StorageModule {}

// // emergency-report.entity.ts
// /* eslint-disable @typescript-eslint/no-unsafe-return */
// /* eslint-disable prettier/prettier */
// import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
// import { User } from './user.entity';
// import { DashboardActivity } from 'src/database/dashboard.entity'

// export enum EmergencyType {
//   FIRE = 'fire',
//   AMBULANCE = 'ambulance',
//   ROBBERY = 'robbery',
//   ACCIDENT = 'accident',
//   MEDICAL = 'medical',
//   CRIME = 'crime',
//   NATURAL_DISASTER = 'natural_disaster',
//   OTHER = 'other'
// }

// export enum EmergencyStatus {
//   REPORTED = 'reported',
//   DISPATCHED = 'dispatched',
//   IN_PROGRESS = 'in_progress',
//   RESOLVED = 'resolved',
//   CANCELLED = 'cancelled'
// }

// export enum EmergencyPriority {
//   LOW = 'low',
//   MEDIUM = 'medium',
//   HIGH = 'high',
//   CRITICAL = 'critical'
// }

// @Entity('emergency_reports')
// export class EmergencyReport {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @ManyToOne(() => User, user => user.emergencyReports, { nullable: true })
//   user: User | null;

//   @Column({ type: 'varchar', length: 20, nullable: true })
//   reportingPhoneNumber: string;

//   @Column({ type: 'varchar', enum: EmergencyType })
//   type: EmergencyType;

//   @Column({ type: 'varchar', enum: EmergencyPriority, default: EmergencyPriority.MEDIUM })
//   priority: EmergencyPriority;

//   @Column('text')
//   description: string;

//   @Column('varchar')
//   location: string;

//   @Column('decimal', { precision: 10, scale: 8 })
//   latitude: number;

//   @Column('decimal', { precision: 11, scale: 8 })
//   longitude: number;

//   @Column('varchar', { nullable: true })
//   imageUrl: string;

//   @Column('varchar', { nullable: true })
//   voiceNoteUrl: string;

//   @Column('varchar', { nullable: true }) // Changed from just nullable: true
//   videoUrl: string;

//   @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) // Fixed SQL Server syntax
//   mediaUrlsJson: string;

//   @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) // Fixed SQL Server syntax
//   additionalNotesJson: string;

//   @Column({ type: 'varchar', enum: EmergencyStatus, default: EmergencyStatus.REPORTED })
//   status: EmergencyStatus;

//   @Column('text', { nullable: true })
//   adminNotes: string;

//   @Column('text', { nullable: true })
//   userFeedback: string;

//   @Column({ type: 'int', default: 0 })
//   rating: number;

//   @Column({ type: 'varchar', length: 200, nullable: true })
//   assignedDepartment: string;

//   @Column({ type: 'varchar', length: 100, nullable: true })
//   assignedUnit: string;

//   @Column({ type: 'datetime', nullable: true })
//   dispatchedAt: Date;

//   @Column({ type: 'datetime', nullable: true })
//   resolvedAt: Date;

//   @CreateDateColumn({ type: 'datetime' })
//   createdAt: Date;

//   @UpdateDateColumn({ type: 'datetime' })
//   updatedAt: Date;

//   @Column({ type: 'bit', default: false })
//   isConsolidated: boolean;

//   @Column({ type: 'int', nullable: true })
//   consolidatedReportId: number;

//   get mediaUrls(): string[] {
//     try {
//       return this.mediaUrlsJson ? JSON.parse(this.mediaUrlsJson) : [];
//     } catch {
//       return [];
//     }
//   }

//   set mediaUrls(urls: string[]) {
//     this.mediaUrlsJson = JSON.stringify(urls);
//   }

//   get additionalNotes(): string[] {
//     try {
//       return this.additionalNotesJson ? JSON.parse(this.additionalNotesJson) : [];
//     } catch {
//       return [];
//     }
//   }

//   set additionalNotes(notes: string[]) {
//     this.additionalNotesJson = JSON.stringify(notes);
//   }
// }

// evaluate and modify to achieve the below 
// 1. Modify emergency reporting not to throw error after successful submission
// 2. modify to allow auto filtering of issues to relevant department as follows
// - Criminal cases should go to police dashboard 
// - Accidents require police, fire brigade, ambulance
// - medical emergencies require ambulance
// - fire emergencies require fire brigade 
// - service issues require City Authorities
// - potholes require ministry of roads and city authorities
// - Litter issues require city authorities and geopomona 
// 3. Confirmation message of successful submission to include departments/authorities submission has been sent to 
// 4. Update database entry on assignedDepartment to capture authorities responsible
// 5. Allow for user feedback and edition on their submissions like adding extra media or notes or add feedback, add menu for editing submission both issue reporting and emegerncy reporting 
// 6. Find a way after user submits a report, a notification is generated to all responsible authorities for new submission made and depending on priority prompt for action based on threshold time limits for action