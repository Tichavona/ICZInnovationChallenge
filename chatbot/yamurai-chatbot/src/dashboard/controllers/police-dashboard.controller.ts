/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Controller, Get, Query, UseGuards, Param, Post, Body, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DepartmentGuard, DepartmentRole } from '../../department/guards/department.guard';
import { PoliceDashboardService } from '../services/police-dashboard.service';
import { DepartmentType } from '../../database/department.entity'; // Import the enum
import { Roles } from '../../dashboard/rbac/roles.decorator';

@Controller('dashboard/police')
@UseGuards(JwtAuthGuard, DepartmentGuard)
export class PoliceDashboardController {
  constructor(private readonly policeService: PoliceDashboardService) {}

  @Get('incidents')
  @DepartmentRole('manager', 'supervisor', 'director', 'field_agent')
  async getPoliceIncidents(
    @Query('status') status?: string,
    @Query('timeframe') timeframe?: '24h' | '7d' | '30d',
    @Query('stationId') stationId?: string,
    @Query('district') district?: string,
    @Query('type') type?: string,
  ) {
    const incidentTypes = type ? [type] : undefined;
    
    return this.policeService.getPoliceIncidents({
      status,
      timeframe,
      stationId,
      district,
      incidentType: incidentTypes as any
    });
  }

  @Get('incidents/:id')
  @DepartmentRole('manager', 'supervisor', 'field_agent')
  async getIncidentDetails(@Param('id') id: string) {
    const incidents = await this.policeService.getPoliceIncidents({});
    const incident = incidents.find(i => i.id.toString() === id);
    
    if (!incident) {
      throw new NotFoundException(`Incident with ID ${id} not found`);
    }
    
    return incident;
  }

  @Post('incidents/:id/assign')
  @DepartmentRole('manager', 'supervisor')
  async assignIncident(
    @Param('id') id: string,
    @Body() body: { stationId: string; staffIds?: string[] }
  ) {
    // Get incident
    const incidents = await this.policeService.getPoliceIncidents({});
    const incident = incidents.find(i => i.id.toString() === id);
    
    if (!incident) {
      throw new NotFoundException(`Incident with ID ${id} not found`);
    }

    // Auto-assign to station
    const assignment = await this.policeService.autoAssignIncident(
      incident,
      body.stationId
    );

    return {
      message: 'Incident assigned successfully',
      assignment
    };
  }

  @Post('incidents/:id/status')
  @DepartmentRole('manager', 'supervisor', 'field_agent')
  async updateIncidentStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string }
  ) {
    // Update incident status
    // This would trigger notifications and update assignments
    
    return {
      message: 'Incident status updated',
      incidentId: id,
      newStatus: body.status,
      timestamp: new Date()
    };
  }

  @Get('analytics/heatmap')
  @DepartmentRole('manager', 'director')
  async getCrimeHeatmap(
    @Query('stationId') stationId?: string,
    @Query('days') days: number = 30
  ) {
    return this.policeService.getCrimeHeatmap(stationId, days);
  }

  @Get('analytics/response-times')
  @DepartmentRole('manager', 'director', 'admin')
  async getResponseTimeAnalytics(@Query('period') period: '24h' | '7d' | '30d' | '90d' = '30d') {
    return this.policeService.getResponseTimeAnalytics(period);
  }

  @Get('analytics/crime-types')
  @DepartmentRole('manager', 'supervisor', 'director')
  async getCrimeTypeAnalytics(
    @Query('stationId') stationId?: string,
    @Query('days') days: number = 30
  ) {
    return this.policeService.getCrimeTypeBreakdown(stationId, days);
  }

  @Get('staff/performance')
  @DepartmentRole('manager', 'director')
  async getStaffPerformance(@Query('stationId') stationId?: string) {
    return this.policeService.getStaffPerformanceMetrics(stationId);
  }

  @Get('resources/status')
  @DepartmentRole('manager', 'supervisor')
  async getResourceStatus(@Query('stationId') stationId?: string) {
    return this.policeService.getResourceAvailability(stationId);
  }

  @Get('metrics')
  @DepartmentRole('manager', 'director')
  async getDashboardMetrics(
    @Query('stationId') stationId?: string,
    @Query('timeframe') timeframe?: '24h' | '7d' | '30d'
  ) {
    const timeframeMap = {
      '24h': { start: new Date(Date.now() - 24*60*60*1000), end: new Date() },
      '7d': { start: new Date(Date.now() - 7*24*60*60*1000), end: new Date() },
      '30d': { start: new Date(Date.now() - 30*24*60*60*1000), end: new Date() }
    };

    // Get department ID from context or user
    const deptId = await this.getPoliceDepartmentId();
    
    return this.policeService.getDashboardMetrics(
      deptId,
      stationId,
      timeframe ? timeframeMap[timeframe] : undefined
    );
  }

  @Get('stations')
  @DepartmentRole('manager', 'supervisor', 'director')
  async getStations() {
    // Get all police stations - using proper TypeORM query with enum
    const stations = await this.policeService['stationRepo'].find({
      where: {
        department: {
          type: DepartmentType.POLICE  // Use the enum value
        }
      },
      relations: ['parentStation', 'subStations']
    });

    return stations;
  }

  @Get('stations/:id')
  @DepartmentRole('manager', 'supervisor', 'field_agent')
  async getStationDetails(@Param('id') id: string) {
    const station = await this.policeService['stationRepo'].findOne({
      where: { id },
      relations: ['parentStation', 'subStations', 'assignments', 'department']
    });

    if (!station) {
      throw new NotFoundException(`Station with ID ${id} not found`);
    }

    // Get station performance
    const metrics = await this.policeService.getDashboardMetrics(
      station.department?.id,
      station.id
    );

    return {
      ...station,
      metrics
    };
  }

  /**
   * Helper method to get police department ID
   * This could be cached or retrieved from a configuration
   */
  private async getPoliceDepartmentId(): Promise<string> {
    // Try to get from cache or config first
    // For now, query the database
    const policeDept = await this.policeService['departmentRepo'].findOne({
      where: { type: DepartmentType.POLICE }
    });
    
    if (!policeDept) {
      throw new NotFoundException('Police department not found in system');
    }
    
    return policeDept.id;
  }
}