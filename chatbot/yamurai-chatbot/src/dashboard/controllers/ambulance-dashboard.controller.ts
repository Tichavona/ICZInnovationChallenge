/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DepartmentGuard } from '../../department/guards/department.guard';
import { Roles } from '../rbac/roles.decorator';
import { AmbulanceDashboardService } from '../services/ambulance-dashboard.service';
import { UserRole } from '../rbac/roles.enum';
import { CurrentUser } from '../../auth/current-user.decorator';

@Controller('dashboard/ambulance')
@UseGuards(JwtAuthGuard, DepartmentGuard)
export class AmbulanceDashboardController {
  constructor(private readonly ambulanceService: AmbulanceDashboardService) {}

  /**
   * Get medical emergencies with filters
   */
  @Get('incidents')
  @Roles(UserRole.AMBULANCE_FIELD_AGENT, UserRole.AMBULANCE_SUPERVISOR, UserRole.AMBULANCE_MANAGER)
  async getMedicalIncidents(
    @Query('severity') severity?: string,
    @Query('type') type?: 'accident' | 'medical' | 'cardiac' | 'trauma' | 'respiratory',
    @Query('stationId') stationId?: string,
    @Query('status') status?: string,
    @Query('timeframe') timeframe?: '24h' | '7d' | '30d'
  ) {
    const filters = { severity, type, stationId, status, timeframe };
    return this.ambulanceService.getMedicalIncidents(filters);
  }

  /**
   * Get critical/priority incidents
   */
  @Get('incidents/critical')
  @Roles(UserRole.AMBULANCE_FIELD_AGENT, UserRole.AMBULANCE_SUPERVISOR)
  async getCriticalIncidents(
    @Query('stationId') stationId?: string
  ) {
    return this.ambulanceService.getCriticalIncidents(stationId);
  }

  /**
   * Get incident details with medical info
   */
  @Get('incidents/:id')
  @Roles(UserRole.AMBULANCE_FIELD_AGENT, UserRole.AMBULANCE_SUPERVISOR)
  async getMedicalIncidentDetails(@Param('id') id: string) {
    return this.ambulanceService.getMedicalIncidentDetails(id);
  }

  /**
   * Update medical incident with triage info
   */
  @Put('incidents/:id/triage')
  @Roles(UserRole.AMBULANCE_SUPERVISOR, UserRole.AMBULANCE_MANAGER)
  async updateTriage(
    @Param('id') id: string,
    @Body() triageDto: {
      triageLevel: 'red' | 'yellow' | 'green' | 'black';
      vitalSigns?: {
        bloodPressure?: string;
        heartRate?: number;
        respiratoryRate?: number;
        oxygenSaturation?: number;
        temperature?: number;
        consciousness?: 'alert' | 'verbal' | 'pain' | 'unresponsive';
      };
      notes?: string;
    },
    @CurrentUser() user: any
  ) {
    return this.ambulanceService.updateTriage(id, triageDto, user.id);
  }

  /**
   * Dispatch ambulance to incident
   */
  @Post('incidents/:id/dispatch')
  @Roles(UserRole.AMBULANCE_SUPERVISOR, UserRole.AMBULANCE_MANAGER)
  async dispatchAmbulance(
    @Param('id') id: string,
    @Body() dispatchDto: {
      stationId: string;
      ambulanceId: string;
      crew: string[];
      estimatedArrival: Date;
      equipment?: string[];
    }
  ) {
    return this.ambulanceService.dispatchAmbulance(id, dispatchDto);
  }

  /**
   * Get response time analytics
   */
  @Get('analytics/response-times')
  @Roles(UserRole.AMBULANCE_MANAGER, UserRole.AMBULANCE_DIRECTOR)
  async getResponseTimeAnalytics(
    @Query('period') period: '24h' | '7d' | '30d' | '90d' = '30d',
    @Query('stationId') stationId?: string,
    @Query('priority') priority?: 'critical' | 'high' | 'medium' | 'low'
  ) {
    return this.ambulanceService.getResponseTimeAnalytics(period, stationId, priority);
  }

  /**
   * Get patient outcomes analytics
   */
  @Get('analytics/patient-outcomes')
  @Roles(UserRole.AMBULANCE_MANAGER, UserRole.AMBULANCE_DIRECTOR)
  async getPatientOutcomes(
    @Query('stationId') stationId?: string,
    @Query('days') days: number = 30
  ) {
    return this.ambulanceService.getPatientOutcomes(stationId, days);
  }

  /**
   * Get ambulance fleet status
   */
  @Get('fleet/status')
  @Roles(UserRole.AMBULANCE_SUPERVISOR, UserRole.AMBULANCE_MANAGER)
  async getFleetStatus(
    @Query('stationId') stationId?: string,
    @Query('status') status?: 'available' | 'en_route' | 'on_scene' | 'transporting' | 'maintenance'
  ) {
    return this.ambulanceService.getFleetStatus(stationId, status);
  }

  /**
   * Update ambulance status
   */
  @Put('fleet/:ambulanceId/status')
  @Roles(UserRole.AMBULANCE_SUPERVISOR, UserRole.AMBULANCE_MANAGER)
  async updateAmbulanceStatus(
    @Param('ambulanceId') ambulanceId: string,
    @Body() updateDto: {
      status: 'available' | 'en_route' | 'on_scene' | 'transporting' | 'maintenance';
      currentLocation?: {
        latitude: number;
        longitude: number;
      };
      estimatedAvailable?: Date;
      notes?: string;
    }
  ) {
    return this.ambulanceService.updateAmbulanceStatus(ambulanceId, updateDto);
  }

  /**
   * Get medical equipment inventory
   */
  @Get('equipment/inventory')
  @Roles(UserRole.AMBULANCE_SUPERVISOR, UserRole.AMBULANCE_MANAGER)
  async getEquipmentInventory(
    @Query('stationId') stationId?: string,
    @Query('type') type?: 'medication' | 'supplies' | 'devices'
  ) {
    return this.ambulanceService.getEquipmentInventory(stationId, type);
  }

  /**
   * Update equipment usage/restock
   */
  @Post('equipment/usage')
  @Roles(UserRole.AMBULANCE_FIELD_AGENT, UserRole.AMBULANCE_SUPERVISOR)
  async recordEquipmentUsage(
    @Body() usageDto: {
      incidentId: string;
      equipmentUsed: Array<{
        id: string;
        quantity: number;
      }>;
      notes?: string;
    }
  ) {
    return this.ambulanceService.recordEquipmentUsage(usageDto);
  }

  /**
   * Get staff availability and skills
   */
  @Get('staff/availability')
  @Roles(UserRole.AMBULANCE_SUPERVISOR, UserRole.AMBULANCE_MANAGER)
  async getStaffAvailability(
    @Query('stationId') stationId?: string,
    @Query('skill') skill?: 'paramedic' | 'emt' | 'critical_care' | 'flight'
  ) {
    return this.ambulanceService.getStaffAvailability(stationId, skill);
  }

  /**
   * Get hospital capacity and status
   */
  @Get('hospitals/capacity')
  @Roles(UserRole.AMBULANCE_FIELD_AGENT, UserRole.AMBULANCE_SUPERVISOR)
  async getHospitalCapacity(
    @Query('lat') latitude?: number,
    @Query('lng') longitude?: number,
    @Query('radius') radius?: number,
    @Query('specialty') specialty?: 'trauma' | 'cardiac' | 'pediatric' | 'burn'
  ) {
    if (latitude && longitude && radius) {
      return this.ambulanceService.getNearbyHospitals(latitude, longitude, radius, specialty);
    }
    return this.ambulanceService.getAllHospitalsCapacity();
  }

  /**
   * Update hospital bed availability
   */
  @Put('hospitals/:hospitalId/capacity')
  @Roles(UserRole.AMBULANCE_MANAGER, UserRole.AMBULANCE_DIRECTOR)
  async updateHospitalCapacity(
    @Param('hospitalId') hospitalId: string,
    @Body() capacityDto: {
      emergencyBeds: number;
      icuBeds: number;
      cardiacBeds: number;
      pediatricBeds: number;
      burnBeds: number;
      updatedAt: Date;
    }
  ) {
    return this.ambulanceService.updateHospitalCapacity(hospitalId, capacityDto);
  }

  /**
   * Get handover times (ambulance to hospital)
   */
  @Get('analytics/handover-times')
  @Roles(UserRole.AMBULANCE_MANAGER, UserRole.AMBULANCE_DIRECTOR)
  async getHandoverTimes(
    @Query('hospitalId') hospitalId?: string,
    @Query('days') days: number = 30
  ) {
    return this.ambulanceService.getHandoverTimes(hospitalId, days);
  }

  /**
   * Get cardiac arrest response metrics (key performance indicator)
   */
  @Get('analytics/cardiac-arrest')
  @Roles(UserRole.AMBULANCE_MANAGER, UserRole.AMBULANCE_DIRECTOR)
  async getCardiacArrestMetrics(
    @Query('stationId') stationId?: string,
    @Query('days') days: number = 90
  ) {
    return this.ambulanceService.getCardiacArrestMetrics(stationId, days);
  }

  /**
   * Get mass casualty incident readiness
   */
  @Get('preparedness/mci')
  @Roles(UserRole.AMBULANCE_MANAGER, UserRole.AMBULANCE_DIRECTOR)
  async getMCIReadiness(@Query('stationId') stationId?: string) {
    return this.ambulanceService.getMCIReadiness(stationId);
  }

  /**
   * Activate mass casualty protocol
   */
  @Post('preparedness/mci/activate')
  @Roles(UserRole.AMBULANCE_MANAGER, UserRole.AMBULANCE_DIRECTOR)
  async activateMCIProtocol(
    @Body() mciDto: {
      incidentId: string;
      estimatedPatients: number;
      severityLevel: 'level1' | 'level2' | 'level3';
      hospitalsNotified: string[];
    }
  ) {
    return this.ambulanceService.activateMCIProtocol(mciDto);
  }

  /**
   * Get drug inventory with expiration tracking
   */
  @Get('pharmacy/inventory')
  @Roles(UserRole.AMBULANCE_SUPERVISOR, UserRole.AMBULANCE_MANAGER)
  async getPharmacyInventory(
    @Query('stationId') stationId?: string,
    @Query('expiringWithin') expiringWithinDays?: number
  ) {
    return this.ambulanceService.getPharmacyInventory(stationId, expiringWithinDays);
  }

  /**
   * Request drug restock
   */
  @Post('pharmacy/restock-request')
  @Roles(UserRole.AMBULANCE_SUPERVISOR, UserRole.AMBULANCE_MANAGER)
  async requestDrugRestock(
    @Body() restockDto: {
      stationId: string;
      items: Array<{
        drugId: string;
        quantity: number;
        priority: 'high' | 'medium' | 'low';
      }>;
      reason?: string;
    }
  ) {
    return this.ambulanceService.requestDrugRestock(restockDto);
  }
} 
