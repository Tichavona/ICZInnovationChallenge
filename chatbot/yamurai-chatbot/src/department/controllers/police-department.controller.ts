/* eslint-disable prettier/prettier */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DepartmentGuard, DepartmentRole } from '../guards/department.guard';
import { PoliceDashboardService } from '../services/police-dashboard.service';
import { FireBrigadeDashboardService } from '../services/fire-brigade-dashboard.service';
import { WasteManagementDashboardService } from '../services/waste-management-dashboard.service';

@Controller('dashboard/police')
@UseGuards(JwtAuthGuard, DepartmentGuard)
export class PoliceDepartmentController {
  constructor(private readonly policeService: PoliceDashboardService) {}

  @Get('incidents')
  @DepartmentRole('manager', 'supervisor', 'director')
  async getPoliceIncidents(
    @Query('status') status?: string,
    @Query('timeframe') timeframe?: '24h' | '7d' | '30d',
    @Query('zone') zone?: string,
  ) {
    const filters = {
      status,
      timeframe,
      zone,
      types: ['robbery', 'crime', 'accident'], // Police-specific incident types
    };
    return this.policeService.getIncidents(filters);
  }

  @Get('analytics/response-times')
  @DepartmentRole('manager', 'director', 'admin')
  async getResponseTimeAnalytics(@Query('period') period = '30d') {
    return this.policeService.getResponseTimeAnalytics(period);
  }

  @Get('analytics/crime-types')
  @DepartmentRole('manager', 'supervisor', 'director')
  async getCrimeTypeAnalytics(@Query('zone') zone?: string) {
    return this.policeService.getCrimeTypeBreakdown(zone);
  }

  @Get('staff/performance')
  @DepartmentRole('manager', 'director')
  async getStaffPerformance() {
    return this.policeService.getStaffPerformanceMetrics();
  }

  @Get('resources/status')
  @DepartmentRole('manager', 'supervisor')
  async getResourceStatus() {
    return this.policeService.getResourceAvailability();
  }
}

// src/department/controllers/fire-brigade.controller.ts
@Controller('dashboard/fire-brigade')
@UseGuards(JwtAuthGuard, DepartmentGuard)
export class FireBrigadeController {
  constructor(private readonly fireService: FireBrigadeDashboardService) {}

  @Get('incidents')
  @DepartmentRole('manager', 'supervisor', 'field_chief')
  async getFireIncidents(
    @Query('severity') severity?: string,
    @Query('type') type?: 'structural' | 'vehicle' | 'wildfire',
  ) {
    const filters = { severity, type };
    return this.fireService.getFireIncidents(filters);
  }

  @Get('analytics/containment-times')
  @DepartmentRole('manager', 'director')
  async getContainmentAnalytics() {
    return this.fireService.getFireContainmentTimes();
  }

  @Get('equipment/status')
  @DepartmentRole('manager', 'supervisor')
  async getEquipmentStatus() {
    return this.fireService.getEquipmentAvailability();
  }

  @Get('staff/readiness')
  @DepartmentRole('manager', 'field_chief')
  async getStaffReadiness() {
    return this.fireService.getStaffReadinessLevel();
  }
}

// src/department/controllers/waste-management.controller.ts
@Controller('dashboard/waste-management')
@UseGuards(JwtAuthGuard, DepartmentGuard)
export class WasteManagementController {
  constructor(private readonly wasteService: WasteManagementDashboardService) {}

  @Get('issues')
  @DepartmentRole('manager', 'supervisor', 'coordinator')
  async getWasteIssues(
    @Query('type') type?: 'litter' | 'dumping' | 'collection',
    @Query('zone') zone?: string,
  ) {
    const filters = { type, zone };
    return this.wasteService.getWasteIssues(filters);
  }

  @Get('analytics/collection-efficiency')
  @DepartmentRole('manager', 'director')
  async getCollectionEfficiency() {
    return this.wasteService.getCollectionEfficiencyMetrics();
  }

  @Get('routes/optimization')
  @DepartmentRole('manager', 'coordinator')
  async getRouteOptimization() {
    return this.wasteService.getRouteOptimizationSuggestions();
  }
}