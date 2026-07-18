/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, Get, Query, UseGuards, Param, Post, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DepartmentGuard, DepartmentRole } from '../../department/guards/department.guard';
import { AgriculturalDashboardService } from '../services/agricultural-dashboard.service';
import { CropType } from '../../database/farmer.entity';
import { 
  AgriculturalIncident, 
  AgriculturalIncidentType,
  AgriculturalSeverity,
  AgriculturalStatus,
  AdvisoryType 
} from '../interfaces/agricultural.types';

@Controller('dashboard/agricultural')
@UseGuards(JwtAuthGuard, DepartmentGuard)
export class AgriculturalDashboardController {
  constructor(private readonly agriculturalService: AgriculturalDashboardService) {}

  @Get('incidents')
  @DepartmentRole('agricultural_officer', 'agricultural_supervisor', 'agricultural_manager')
  async getAgriculturalIncidents(
    @Query('type') type?: AgriculturalIncidentType | string,
    @Query('severity') severity?: AgriculturalSeverity | string,
    @Query('status') status?: AgriculturalStatus | string,
    @Query('cropType') cropType?: CropType,
    @Query('region') region?: string,
    @Query('district') district?: string,
    @Query('farmerId') farmerId?: number,
    @Query('timeframe') timeframe?: '24h' | '7d' | '30d' | '90d' | 'year',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AgriculturalIncident[]> {
    return this.agriculturalService.getAgriculturalIncidents({
      type,
      severity: severity as any,
      status: status as any,
      cropType,
      region,
      district,
      farmerId: farmerId ? Number(farmerId) : undefined,
      timeframe,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });
  }

  @Get('incidents/:id')
  @DepartmentRole('agricultural_officer', 'agricultural_supervisor')
  async getIncidentDetails(@Param('id') id: string): Promise<AgriculturalIncident | null> {
    const incidents = await this.agriculturalService.getAgriculturalIncidents({});
    return incidents.find(i => i.id.toString() === id) || null;
  }

  @Get('heatmap')
  @DepartmentRole('agricultural_officer', 'agricultural_supervisor', 'agricultural_manager')
  async getOutbreakHeatmap(
    @Query('cropType') cropType?: CropType,
    @Query('diseaseName') diseaseName?: string,
    @Query('region') region?: string,
    @Query('days') days?: number,
    @Query('minSeverity') minSeverity?: AgriculturalSeverity,
  ): Promise<any[]> {
    return this.agriculturalService.getOutbreakHeatmap({
      cropType,
      diseaseName,
      region,
      days: days ? parseInt(days.toString()) : 30,
      minSeverity: minSeverity as any
    });
  }

  @Get('prediction/:diseaseName')
  @DepartmentRole('agricultural_manager', 'agricultural_supervisor')
  async getDiseaseSpreadPrediction(
    @Param('diseaseName') diseaseName: string,
    @Query('region') region: string,
  ): Promise<any> {
    return this.agriculturalService.getDiseaseSpreadPrediction(diseaseName, region);
  }

  @Get('advisories')
  @DepartmentRole('agricultural_officer', 'agricultural_supervisor', 'agricultural_manager')
  async getAdvisories(
    @Query('type') type?: AdvisoryType,
    @Query('targetCrop') targetCrop?: string,
    @Query('region') region?: string,
    @Query('season') season?: string,
    @Query('priority') priority?: string,
    @Query('isActive') isActive?: string,
    @Query('limit') limit?: number,
  ): Promise<any[]> {
    return this.agriculturalService.getAdvisories({
      type: type as any,
      targetCrop,
      region,
      season,
      priority,
      isActive: isActive === 'true',
      limit: limit ? parseInt(limit.toString()) : undefined
    });
  }

  @Get('farmers/statistics')
  @DepartmentRole('agricultural_manager', 'agricultural_supervisor')
  async getFarmerStatistics(
    @Query('region') region?: string,
    @Query('district') district?: string,
  ): Promise<any> {
    return this.agriculturalService.getFarmerStatistics(region, district);
  }

  @Get('crop-health')
  @DepartmentRole('agricultural_officer', 'agricultural_supervisor')
  async getCropHealthOverview(
    @Query('region') region?: string,
    @Query('cropType') cropType?: CropType,
  ): Promise<any> {
    return this.agriculturalService.getCropHealthOverview(region, cropType);
  }

  @Get('resources')
  @DepartmentRole('agricultural_manager', 'agricultural_supervisor')
  async getResourceNeeds(
    @Query('region') region?: string,
    @Query('status') status?: string,
  ): Promise<any> {
    return this.agriculturalService.getResourceNeeds(region, status);
  }

  @Get('metrics')
  @DepartmentRole('agricultural_manager', 'agricultural_supervisor')
  async getDashboardMetrics(
    @Query('region') region?: string,
    @Query('timeframe') timeframe?: '24h' | '7d' | '30d' | '90d' | 'year',
  ): Promise<any> {
    return this.agriculturalService.getDashboardMetrics(region, timeframe);
  }

  @Post('incidents/:id/update-status')
  @DepartmentRole('agricultural_officer', 'agricultural_supervisor')
  async updateIncidentStatus(
    @Param('id') id: string,
    @Body() body: { status: AgriculturalStatus; notes?: string }
  ): Promise<any> {
    // This would update the status in the database
    return {
      message: 'Incident status updated',
      incidentId: id,
      newStatus: body.status,
      timestamp: new Date()
    };
  }

  @Post('advisories')
  @DepartmentRole('agricultural_manager')
  async createAdvisory(@Body() body: any): Promise<any> {
    // This would create a new advisory
    return {
      message: 'Advisory created successfully',
      advisory: body,
      timestamp: new Date()
    };
  }
}