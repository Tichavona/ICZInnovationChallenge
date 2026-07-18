/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import {
  DashboardModule,
  PoliceDashboardModule,
  FireBrigadeDashboardModule,
  AmbulanceDashboardModule,
  CityCouncilDashboardModule,
  WasteManagementDashboardModule,
  AgriculturalDashboardModule,
} from './dashboard';
import { RoutingModule } from './routing/routing.module';
import { EscalationModule } from './escalation/escalation.module';
import { TrackingModule } from './tracking/tracking.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UtilsModule } from './shared/utils/utils.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }), 
    DatabaseModule,
    DashboardModule,
    PoliceDashboardModule,
    FireBrigadeDashboardModule,
    AmbulanceDashboardModule,
    CityCouncilDashboardModule,
    WasteManagementDashboardModule,
    AgriculturalDashboardModule,
    WhatsappModule,
    RoutingModule,
    EscalationModule,
    TrackingModule,
    AnalyticsModule,
    UtilsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}