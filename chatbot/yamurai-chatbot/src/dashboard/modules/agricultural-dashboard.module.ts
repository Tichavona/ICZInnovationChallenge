/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardModule } from './dashboard.module';
import { AgriculturalDashboardController } from '../controllers/agricultural-dashboard.controller';
import { AgriculturalDashboardService } from '../services/agricultural-dashboard.service';
import { CropDiseaseReport } from '../../database/farmer.entity';
import { FarmDisasterReport } from '../../database/farmer.entity';
import { AgriculturalAdvisory } from '../../database/farmer.entity';
import { FarmerProfile } from '../../database/farmer.entity';
import { EmergencyReport } from '../../database/emergency-report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CropDiseaseReport,
      FarmDisasterReport,
      AgriculturalAdvisory,
      FarmerProfile,
      EmergencyReport
    ]),
    DashboardModule
  ],
  controllers: [AgriculturalDashboardController],
  providers: [AgriculturalDashboardService],
  exports: [AgriculturalDashboardService]
})
export class AgriculturalDashboardModule {}