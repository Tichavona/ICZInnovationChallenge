/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DepartmentGuard } from '../../department/guards/department.guard';
import { Roles } from '../rbac/roles.decorator';
import { FireBrigadeDashboardService } from '../services/fire-brigade-dashboard.service';
import { UserRole } from '../rbac/roles.enum';
import { CurrentUser } from '../../auth/current-user.decorator';
import { EmergencyPriority, EmergencyStatus } from '../../database/emergency-report.entity';

// Define types for fire-specific filters
export type FireIncidentType = 'structural' | 'vehicle' | 'wildfire' | 'industrial';
export type TimeframeType = '24h' | '7d' | '30d' | '90d';

export interface FireIncidentFilters {
  severity?: EmergencyPriority;
  type?: FireIncidentType;
  stationId?: string;
  status?: EmergencyStatus;
  timeframe?: TimeframeType;
}

@Controller('dashboard/fire-brigade')
@UseGuards(JwtAuthGuard, DepartmentGuard)
export class FireBrigadeDashboardController {
  constructor(private readonly fireService: FireBrigadeDashboardService) {}

  /**
   * Get fire incidents with specific filters
   */
  @Get('incidents')
  @Roles(UserRole.FIRE_FIELD_AGENT, UserRole.FIRE_SUPERVISOR, UserRole.FIRE_MANAGER, UserRole.FIRE_CHIEF)
  async getFireIncidents(
    @Query('severity') severity?: EmergencyPriority,
    @Query('type') type?: FireIncidentType,
    @Query('stationId') stationId?: string,
    @Query('status') status?: EmergencyStatus,
    @Query('timeframe') timeframe?: TimeframeType
  ) {
    const filters: FireIncidentFilters = { 
      severity, 
      type, 
      stationId, 
      status,
      timeframe 
    };
    return this.fireService.getFireIncidents(filters);
  }

  /**
   * Get active fire incidents (highest priority)
   */
  @Get('incidents/active')
  @Roles(UserRole.FIRE_FIELD_AGENT, UserRole.FIRE_SUPERVISOR, UserRole.FIRE_MANAGER)
  async getActiveFireIncidents(
    @Query('stationId') stationId?: string
  ) {
    return this.fireService.getActiveFireIncidents(stationId);
  }

  /**
   * Get fire incident details
   */
  @Get('incidents/:id')
  @Roles(UserRole.FIRE_FIELD_AGENT, UserRole.FIRE_SUPERVISOR, UserRole.FIRE_MANAGER)
  async getFireIncidentDetails(@Param('id') id: string) {
    return this.fireService.getFireIncidentDetails(id);
  }

  /**
   * Update fire incident status with fire-specific actions
   */
  @Put('incidents/:id/status')
  @Roles(UserRole.FIRE_SUPERVISOR, UserRole.FIRE_MANAGER, UserRole.FIRE_CHIEF)
  async updateFireIncidentStatus(
    @Param('id') id: string,
    @Body() updateDto: {
      status: EmergencyStatus;
      resourcesDeployed?: {
        fireEngines: number;
        waterTankers: number;
        firefighters: number;
        specialUnits?: string[];
      };
      containmentLevel?: number;
      notes?: string;
    },
    @CurrentUser() user: any
  ) {
    return this.fireService.updateFireIncidentStatus(
      id,
      updateDto,
      user.id
    );
  }

  /**
   * Dispatch resources to fire incident
   */
  @Post('incidents/:id/dispatch')
  @Roles(UserRole.FIRE_SUPERVISOR, UserRole.FIRE_MANAGER, UserRole.FIRE_CHIEF)
  async dispatchResources(
    @Param('id') id: string,
    @Body() dispatchDto: {
      stationId: string;
      fireEngines: number;
      waterTankers: number;
      firefighters: number;
      officers: number;
      specialUnits?: string[];
      estimatedArrival: Date;
    }
  ) {
    return this.fireService.dispatchResources(id, dispatchDto);
  }

  /**
   * Get containment analytics
   */
  @Get('analytics/containment-times')
  @Roles(UserRole.FIRE_MANAGER, UserRole.FIRE_CHIEF)
  async getContainmentAnalytics(
    @Query('stationId') stationId?: string,
    @Query('days') days: number = 30
  ) {
    return this.fireService.getFireContainmentTimes(stationId, days);
  }

  /**
   * Get response time analytics
   */
  @Get('analytics/response-times')
  @Roles(UserRole.FIRE_MANAGER, UserRole.FIRE_CHIEF)
  async getResponseTimeAnalytics(
    @Query('period') period: TimeframeType = '30d',
    @Query('stationId') stationId?: string
  ) {
    return this.fireService.getResponseTimeAnalytics(period, stationId);
  }

  /**
   * Get fire type breakdown
   */
  @Get('analytics/fire-types')
  @Roles(UserRole.FIRE_SUPERVISOR, UserRole.FIRE_MANAGER)
  async getFireTypeBreakdown(
    @Query('stationId') stationId?: string,
    @Query('days') days: number = 30
  ) {
    return this.fireService.getFireTypeBreakdown(stationId, days);
  }

  /**
   * Get equipment status and availability
   */
  @Get('equipment/status')
  @Roles(UserRole.FIRE_SUPERVISOR, UserRole.FIRE_MANAGER, UserRole.FIRE_CHIEF)
  async getEquipmentStatus(
    @Query('stationId') stationId?: string
  ) {
    return this.fireService.getEquipmentAvailability(stationId);
  }

  /**
   * Update equipment status
   */
  @Put('equipment/:equipmentId/status')
  @Roles(UserRole.FIRE_SUPERVISOR, UserRole.FIRE_MANAGER)
  async updateEquipmentStatus(
    @Param('equipmentId') equipmentId: string,
    @Body() updateDto: {
      status: 'available' | 'in_use' | 'maintenance' | 'out_of_service';
      notes?: string;
      estimatedReturn?: Date;
    }
  ) {
    return this.fireService.updateEquipmentStatus(equipmentId, updateDto);
  }

  /**
   * Get staff readiness and availability
   */
  @Get('staff/readiness')
  @Roles(UserRole.FIRE_SUPERVISOR, UserRole.FIRE_MANAGER, UserRole.FIRE_CHIEF)
  async getStaffReadiness(
    @Query('stationId') stationId?: string
  ) {
    return this.fireService.getStaffReadinessLevel(stationId);
  }

  /**
   * Get fire hazard predictions/hotspots
   */
  @Get('analytics/hazard-prediction')
  @Roles(UserRole.FIRE_MANAGER, UserRole.FIRE_CHIEF)
  async getHazardPrediction(
    @Query('region') region?: string,
    @Query('days') days: number = 7
  ) {
    return this.fireService.getFireHazardPrediction(region, days);
  }

  /**
   * Get water source locations and status
   */
  @Get('resources/water-sources')
  @Roles(UserRole.FIRE_FIELD_AGENT, UserRole.FIRE_SUPERVISOR)
  async getWaterSources(
    @Query('stationId') stationId?: string,
    @Query('lat') latitude?: number,
    @Query('lng') longitude?: number,
    @Query('radius') radius?: number
  ) {
    if (latitude && longitude && radius) {
      return this.fireService.getNearbyWaterSources(latitude, longitude, radius);
    }
    return this.fireService.getWaterSourcesByStation(stationId);
  }

  /**
   * Get mutual aid agreements and status
   */
  @Get('resources/mutual-aid')
  @Roles(UserRole.FIRE_MANAGER, UserRole.FIRE_CHIEF)
  async getMutualAidStatus() {
    return this.fireService.getMutualAidAgreements();
  }

  /**
   * Request mutual aid from neighboring stations
   */
  @Post('resources/mutual-aid/request')
  @Roles(UserRole.FIRE_MANAGER, UserRole.FIRE_CHIEF)
  async requestMutualAid(
    @Body() requestDto: {
      incidentId: string;
      requiredResources: {
        fireEngines: number;
        firefighters: number;
        specialEquipment?: string[];
      };
      requestingStationId: string;
      duration: number;
    }
  ) {
    return this.fireService.requestMutualAid(requestDto);
  }

  /**
   * Get fire station performance metrics
   */
  @Get('stations/performance')
  @Roles(UserRole.FIRE_MANAGER, UserRole.FIRE_CHIEF)
  async getStationPerformance(
    @Query('stationId') stationId?: string,
    @Query('days') days: number = 30
  ) {
    return this.fireService.getStationPerformanceMetrics(stationId, days);
  }

  /**
   * Get firefighter fatigue monitoring
   */
  @Get('staff/fatigue')
  @Roles(UserRole.FIRE_SUPERVISOR, UserRole.FIRE_MANAGER)
  async getFatigueLevels(
    @Query('stationId') stationId?: string
  ) {
    return this.fireService.getStaffFatigueLevels(stationId);
  }

  /**
   * Rotate staff to prevent fatigue
   */
  @Post('staff/rotate')
  @Roles(UserRole.FIRE_MANAGER, UserRole.FIRE_CHIEF)
  async rotateStaff(
    @Body() rotationDto: {
      stationId: string;
      staffIds: string[];
      newShift: 'morning' | 'afternoon' | 'night' | 'rest';
    }
  ) {
    return this.fireService.rotateStaff(rotationDto);
  }
}