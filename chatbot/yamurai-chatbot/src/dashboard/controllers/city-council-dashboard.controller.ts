/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DepartmentGuard } from '../../department/guards/department.guard';
import { Roles } from '../rbac/roles.decorator';
import { CityCouncilDashboardService } from '../services/city-council-dashboard.service';
import { UserRole } from '../rbac/roles.enum';
import { CurrentUser } from '../../auth/current-user.decorator';

@Controller('dashboard/city-council')
@UseGuards(JwtAuthGuard, DepartmentGuard)
export class CityCouncilDashboardController {
  constructor(private readonly cityService: CityCouncilDashboardService) {}

  /**
   * Get civic issues with filters
   */
  @Get('issues')
  @Roles(UserRole.CITY_COUNCIL_OFFICER, UserRole.CITY_COUNCIL_SUPERVISOR, UserRole.CITY_COUNCIL_MANAGER)
  async getCivicIssues(
    @Query('type') type?: 'pothole' | 'street_light' | 'sewer' | 'water_pipe' | 'sidewalk' | 'graffiti' | 'other',
    @Query('status') status?: string,
    @Query('district') district?: string,
    @Query('ward') ward?: string,
    @Query('timeframe') timeframe?: '24h' | '7d' | '30d' | '90d',
    @Query('priority') priority?: 'critical' | 'high' | 'medium' | 'low'
  ) {
    const filters = { type, status, district, ward, timeframe, priority };
    return this.cityService.getCivicIssues(filters);
  }

  /**
   * Get issues by district/ward
   */
  @Get('issues/by-district')
  @Roles(UserRole.CITY_COUNCIL_OFFICER, UserRole.CITY_COUNCIL_SUPERVISOR)
  async getIssuesByDistrict(
    @Query('district') district: string,
    @Query('status') status?: string
  ) {
    return this.cityService.getIssuesByDistrict(district, status);
  }

  /**
   * Get issue details
   */
  @Get('issues/:id')
  @Roles(UserRole.CITY_COUNCIL_OFFICER, UserRole.CITY_COUNCIL_SUPERVISOR)
  async getIssueDetails(@Param('id') id: string) {
    return this.cityService.getIssueDetails(id);
  }

  /**
   * Update issue status
   */
  @Put('issues/:id/status')
  @Roles(UserRole.CITY_COUNCIL_OFFICER, UserRole.CITY_COUNCIL_SUPERVISOR)
  async updateIssueStatus(
    @Param('id') id: string,
    @Body() updateDto: {
      status: 'reported' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
      notes?: string;
      resolutionNotes?: string;
      resolvedAt?: Date;
    },
    @CurrentUser() user: any
  ) {
    return this.cityService.updateIssueStatus(id, updateDto, user.id);
  }

  /**
   * Assign issue to work crew
   */
  @Post('issues/:id/assign')
  @Roles(UserRole.CITY_COUNCIL_SUPERVISOR, UserRole.CITY_COUNCIL_MANAGER)
  async assignIssue(
    @Param('id') id: string,
    @Body() assignDto: {
      crewId: string;
      supervisorId: string;
      estimatedCompletion: Date;
      priority: 'high' | 'medium' | 'low';
      equipmentNeeded?: string[];
    }
  ) {
    return this.cityService.assignIssue(id, assignDto);
  }

  /**
   * Get resolution time analytics
   */
  @Get('analytics/resolution-times')
  @Roles(UserRole.CITY_COUNCIL_SUPERVISOR, UserRole.CITY_COUNCIL_MANAGER)
  async getResolutionTimeAnalytics(
    @Query('period') period: '30d' | '90d' | '1y' = '30d',
    @Query('issueType') issueType?: string,
    @Query('district') district?: string
  ) {
    return this.cityService.getResolutionTimeAnalytics(period, issueType, district);
  }

  /**
   * Get issue type distribution
   */
  @Get('analytics/issue-breakdown')
  @Roles(UserRole.CITY_COUNCIL_SUPERVISOR, UserRole.CITY_COUNCIL_MANAGER)
  async getIssueBreakdown(
    @Query('district') district?: string,
    @Query('ward') ward?: string,
    @Query('days') days: number = 30
  ) {
    return this.cityService.getIssueBreakdown(district, ward, days);
  }

  /**
   * Get work crews and their assignments
   */
  @Get('crews')
  @Roles(UserRole.CITY_COUNCIL_OFFICER, UserRole.CITY_COUNCIL_SUPERVISOR)
  async getWorkCrews(
    @Query('district') district?: string,
    @Query('status') status?: 'available' | 'assigned' | 'working' | 'off_duty'
  ) {
    return this.cityService.getWorkCrews(district, status);
  }

  /**
   * Get crew details with current assignments
   */
  @Get('crews/:id')
  @Roles(UserRole.CITY_COUNCIL_SUPERVISOR, UserRole.CITY_COUNCIL_MANAGER)
  async getCrewDetails(@Param('id') id: string) {
    return this.cityService.getCrewDetails(id);
  }

  /**
   * Update crew status
   */
  @Put('crews/:id/status')
  @Roles(UserRole.CITY_COUNCIL_SUPERVISOR, UserRole.CITY_COUNCIL_MANAGER)
  async updateCrewStatus(
    @Param('id') id: string,
    @Body() updateDto: {
      status: 'available' | 'assigned' | 'working' | 'off_duty';
      currentLocation?: {
        latitude: number;
        longitude: number;
      };
      estimatedAvailable?: Date;
    }
  ) {
    return this.cityService.updateCrewStatus(id, updateDto);
  }

  /**
   * Get equipment fleet status
   */
  @Get('equipment/fleet')
  @Roles(UserRole.CITY_COUNCIL_SUPERVISOR, UserRole.CITY_COUNCIL_MANAGER)
  async getEquipmentFleet(
    @Query('type') type?: 'excavator' | 'truck' | 'backhoe' | 'grader' | 'roller',
    @Query('status') status?: 'available' | 'in_use' | 'maintenance'
  ) {
    return this.cityService.getEquipmentFleet(type, status);
  }

  /**
   * Schedule preventive maintenance
   */
  @Post('equipment/maintenance/schedule')
  @Roles(UserRole.CITY_COUNCIL_MANAGER)
  async scheduleMaintenance(
    @Body() scheduleDto: {
      equipmentId: string;
      maintenanceType: 'routine' | 'repair' | 'inspection';
      scheduledDate: Date;
      estimatedDuration: number;
      notes?: string;
    }
  ) {
    return this.cityService.scheduleMaintenance(scheduleDto);
  }

  /**
   * Get budget utilization
   */
  @Get('budget/utilization')
  @Roles(UserRole.CITY_COUNCIL_MANAGER)
  async getBudgetUtilization(
    @Query('fiscalYear') fiscalYear: number,
    @Query('department') department?: string
  ) {
    return this.cityService.getBudgetUtilization(fiscalYear, department);
  }

  /**
   * Get cost per issue type
   */
  @Get('analytics/cost-analysis')
  @Roles(UserRole.CITY_COUNCIL_MANAGER)
  async getCostAnalysis(
    @Query('issueType') issueType?: string,
    @Query('period') period: '30d' | '90d' | '1y' = '90d'
  ) {
    return this.cityService.getCostAnalysis(issueType, period);
  }

  /**
   * Get citizen satisfaction metrics
   */
  @Get('analytics/satisfaction')
  @Roles(UserRole.CITY_COUNCIL_SUPERVISOR, UserRole.CITY_COUNCIL_MANAGER)
  async getSatisfactionMetrics(
    @Query('district') district?: string,
    @Query('days') days: number = 30
  ) {
    return this.cityService.getSatisfactionMetrics(district, days);
  }

  /**
   * Get recurring issue hotspots
   */
  @Get('analytics/hotspots')
  @Roles(UserRole.CITY_COUNCIL_SUPERVISOR, UserRole.CITY_COUNCIL_MANAGER)
  async getIssueHotspots(
    @Query('issueType') issueType?: string,
    @Query('days') days: number = 90,
    @Query('minOccurrences') minOccurrences: number = 3
  ) {
    return this.cityService.getIssueHotspots(issueType, days, minOccurrences);
  }

  /**
   * Schedule preventive maintenance based on hotspots
   */
  @Post('maintenance/preventive/schedule')
  @Roles(UserRole.CITY_COUNCIL_MANAGER)
  async schedulePreventiveMaintenance(
    @Body() scheduleDto: {
      hotspotId: string;
      issueType: string;
      scheduledDate: Date;
      crewId: string;
      estimatedCost: number;
      priority: 'high' | 'medium' | 'low';
    }
  ) {
    return this.cityService.schedulePreventiveMaintenance(scheduleDto);
  }

  /**
   * Get contractor performance
   */
  @Get('contractors/performance')
  @Roles(UserRole.CITY_COUNCIL_MANAGER)
  async getContractorPerformance(
    @Query('contractorId') contractorId?: string,
    @Query('period') period: '30d' | '90d' | '1y' = '90d'
  ) {
    return this.cityService.getContractorPerformance(contractorId, period);
  }

  /**
   * Get public works project status
   */
  @Get('projects')
  @Roles(UserRole.CITY_COUNCIL_OFFICER, UserRole.CITY_COUNCIL_SUPERVISOR)
  async getPublicWorksProjects(
    @Query('status') status?: 'planned' | 'in_progress' | 'completed' | 'delayed',
    @Query('district') district?: string
  ) {
    return this.cityService.getPublicWorksProjects(status, district);
  }

  /**
   * Create new public works project
   */
  @Post('projects')
  @Roles(UserRole.CITY_COUNCIL_MANAGER)
  async createProject(
    @Body() projectDto: {
      name: string;
      description: string;
      location: string;
      district: string;
      ward: string;
      startDate: Date;
      estimatedEndDate: Date;
      budget: number;
      contractor?: string;
      projectManager: string;
    }
  ) {
    return this.cityService.createProject(projectDto);
  }

  /**
   * Update project progress
   */
  @Put('projects/:id/progress')
  @Roles(UserRole.CITY_COUNCIL_SUPERVISOR, UserRole.CITY_COUNCIL_MANAGER)
  async updateProjectProgress(
    @Param('id') id: string,
    @Body() progressDto: {
      percentageComplete: number;
      status: 'planned' | 'in_progress' | 'completed' | 'delayed';
      actualEndDate?: Date;
      notes: string;
      updatedBy: string;
    }
  ) {
    return this.cityService.updateProjectProgress(id, progressDto);
  }

  /**
   * Get weather impact on operations
   */
  @Get('operations/weather-impact')
  @Roles(UserRole.CITY_COUNCIL_SUPERVISOR, UserRole.CITY_COUNCIL_MANAGER)
  async getWeatherImpact(
    @Query('days') days: number = 7,
    @Query('operation') operation?: 'road_repair' | 'sewer' | 'street_lighting'
  ) {
    return this.cityService.getWeatherImpact(days, operation);
  }

  /**
   * Get holiday/weekend schedule adjustments
   */
  @Get('operations/holiday-schedule')
  @Roles(UserRole.CITY_COUNCIL_SUPERVISOR, UserRole.CITY_COUNCIL_MANAGER)
  async getHolidaySchedule(
    @Query('date') date?: Date,
    @Query('service') service?: 'waste_collection' | 'road_maintenance' | 'all'
  ) {
    return this.cityService.getHolidaySchedule(date, service);
  }
}