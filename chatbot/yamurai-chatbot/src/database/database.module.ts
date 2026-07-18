/* eslint-disable prettier/prettier */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable prettier/prettier */
// import { Module } from '@nestjs/common';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { User } from './user.entity';
// import { DataSource, DataSourceOptions } from 'typeorm';
// import { KycData } from './kyc.entity';
// import { IssueReport } from './issue-report.entity';
// import { UserSession, AuthSession, RegistrationSession, LoginSession, ActiveSession } from './session.entity';
// import { EmergencyReport } from './emergency-report.entity';
// import { AnalyticsDaily, LocationAnalytics, UserAnalytics, DepartmentAnalytics } from './analytics.entity';
// import { FarmerProfile, CropDiseaseReport, FarmDisasterReport, AgriculturalAdvisory } from './farmer.entity';
// import { Message } from './message.entity';
// import { Region } from './region.entity';
// import { Province } from './province.entity';
// import { District } from './district.entity';
// import { Station } from './station.entity';
// import { SLAConfig } from './sla-config.entity';
// import { IncidentAssignment } from './incident-assignment.entity';
// import { EscalationLog } from './escalation-log.entity';
// import { DepartmentStaff } from './department.entity';
// import { IncidentRoutingRule } from './incident-routing-rule.entity';
// import { 
//   ReportConsolidation,
//   IncidentGroup, 
//   IncidentUpdate, 
//   StatusVerification,
//   DashboardNotification,
//   DashboardUser,
//   Department,
//   DashboardActivity,
//   TicketAssignment,
//   NotificationEscalation
// } from './dashboard.entity';

// @Module({
//   imports: [
//     TypeOrmModule.forRootAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (config: ConfigService): DataSourceOptions => {
//         return {
//           type: config.get<any>('DB_TYPE') || 'mssql',
//           host: config.get<string>('DB_HOST'),
//           port: config.get<number>('OPT', 1433), // Default to 1433 if not set
//           username: config.get<string>('DB_USERNAME'),
//           password: config.get<string>('DB_PASSWORD'),
//           database: config.get<string>('DB_NAME'),
//           entities: [
//             User, 
//             KycData, 
//             IssueReport, 
//             UserSession, 
//             AuthSession, 
//             RegistrationSession, 
//             LoginSession,
//             ActiveSession, 
//             EmergencyReport,
//             AnalyticsDaily,
//             LocationAnalytics,
//             UserAnalytics,
//             DepartmentAnalytics,
//             FarmerProfile,
//             CropDiseaseReport,
//             FarmDisasterReport, 
//             AgriculturalAdvisory,
//             ReportConsolidation,
//             IncidentGroup,
//             IncidentUpdate,
//             StatusVerification,
//             DashboardNotification,
//             DashboardUser,
//             Department,
//             DashboardActivity,
//             TicketAssignment,
//             NotificationEscalation,
//             Message,
//             Region,
//             Province,
//             District,
//             Station,
//             SLAConfig,
//             IncidentAssignment,
//             EscalationLog,
//             DepartmentStaff, 
//             IncidentRoutingRule
//           ],
//           synchronize: false,
//           migrationsRun: false,
//           options: {
//             encrypt: config.get<boolean>('DB_ENCRYPT', false),
//             trustServerCertificate: config.get<boolean>('DB_TRUST_CERT', true),
//             connectTimeout: config.get<number>('DB_CONNECT_TIMEOUT', 30000)
//           },
//           extra: {
//             trustServerCertificate: true,
//             connectionTimeout: 5000
//           },
//           pool: {
//             max: 10,
//             min: 2,
//             idleTimeoutMillis: 30000
//           }
//         };
//       },
//       dataSourceFactory: async (options: DataSourceOptions) => {
//         const dataSource = new DataSource(options);
//         await dataSource.initialize();
//         return dataSource;
//       }
//     }),
//     TypeOrmModule.forFeature([
//       User, 
//       KycData, 
//       IssueReport, 
//       UserSession, 
//       AuthSession, 
//       RegistrationSession, 
//       LoginSession, 
//       EmergencyReport,
//       AnalyticsDaily,
//       LocationAnalytics,
//       UserAnalytics,
//       DepartmentAnalytics,
//       ReportConsolidation,
//       IncidentGroup,
//       IncidentUpdate,
//       StatusVerification,
//       DashboardNotification,
//       DashboardUser,
//       Department,
//       DashboardActivity,
//       TicketAssignment,
//       NotificationEscalation,
//       Message,
//       Region,
//       Province,
//       District,
//       Station,
//       SLAConfig,
//       IncidentAssignment,
//       EscalationLog,
//       DepartmentStaff, 
//       IncidentRoutingRule
//     ])
//   ],
//   exports: [TypeOrmModule],
// })
// export class DatabaseModule {}

// src/database/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Import all entities
import { User } from './user.entity';
import { Department, DepartmentStaff } from './department.entity';
import { Station } from './station.entity';
import { EmergencyReport } from './emergency-report.entity';
import { IssueReport } from './issue-report.entity';
import { FarmerProfile, CropDiseaseReport, FarmDisasterReport, AgriculturalAdvisory } from './farmer.entity';
import { KycData } from './kyc.entity';
import { Message } from './message.entity';
import { 
  AuthSession, 
  LoginSession, 
  UserSession, 
  RegistrationSession, 
  ActiveSession 
} from './session.entity';
// import { Analytics } from './analytics.entity';
import { IncidentAssignment } from './incident-assignment.entity';
import { SLAConfig } from './sla-config.entity';
import { Province } from './province.entity';
import { Region } from './region.entity';
import { District } from './district.entity';
import { 
  DashboardUser, 
  TicketAssignment, 
  DashboardNotification, 
  DashboardActivity,
  Department as DashboardDepartment,
  NotificationEscalation,
  ReportConsolidation,
  IncidentGroup,
  IncidentUpdate,
  StatusVerification 
} from './dashboard.entity';
import { IncidentRoutingRule } from './incident-routing-rule.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mssql',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 1433),
        username: configService.get('DB_USERNAME', 'sa'),
        password: configService.get('DB_PASSWORD', 'password'),
        database: configService.get('DB_NAME', 'chatbot'),
        entities: [
          User,
          Department,
          DepartmentStaff,
          Station,
          EmergencyReport,
          IssueReport,
          FarmerProfile,
          CropDiseaseReport,
          FarmDisasterReport,
          AgriculturalAdvisory,
          KycData,
          Message,
          AuthSession,
          LoginSession,
          UserSession,
          RegistrationSession,
          ActiveSession,
          ActiveSession,
          // Analytics,
          IncidentAssignment,
          SLAConfig,
          Province,
          Region,
          District,
          DashboardUser,
          TicketAssignment,
          DashboardNotification,
          DashboardActivity,
          DashboardDepartment,
          NotificationEscalation,
          ReportConsolidation,
          IncidentGroup,
          IncidentUpdate,
          StatusVerification,
          IncidentRoutingRule,
        ],
        synchronize: false,
        options: {
          encrypt: true,
          trustServerCertificate: true,
        },
        extra: {
          trustServerCertificate: true,
        },
        logging: configService.get('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      Department,
      DepartmentStaff,
      Station,
      EmergencyReport,
      IssueReport,
      FarmerProfile,
      CropDiseaseReport,
      FarmDisasterReport,
      AgriculturalAdvisory,
      KycData,
      Message,
      AuthSession,
      LoginSession,
      UserSession,
      RegistrationSession,
      ActiveSession,
      ActiveSession,
      // Analytics,
      IncidentAssignment,
      SLAConfig,
      Province,
      Region,
      District,
      DashboardUser,
      TicketAssignment,
      DashboardNotification,
      DashboardActivity,
      DashboardDepartment,
      NotificationEscalation,
      ReportConsolidation,
      IncidentGroup,
      IncidentUpdate,
      StatusVerification,
      IncidentRoutingRule,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}