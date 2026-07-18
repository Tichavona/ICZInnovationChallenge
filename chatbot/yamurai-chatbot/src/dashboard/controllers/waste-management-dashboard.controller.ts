/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DepartmentGuard } from '../../department/guards/department.guard';
import { Roles } from '../rbac/roles.decorator';
import { WasteManagementDashboardService } from '../services/waste-management-dashboard.service';
import { UserRole } from '../rbac/roles.enum';
import { CurrentUser } from '../../auth/current-user.decorator';
import { IssueStatus } from '../../database/issue-report.entity';

// Define the types locally since they're not exported from the service
export enum WasteIssueType {
  LITTER = 'litter',
  ILLEGAL_DUMPING = 'illegal_dumping',
  MISSED_COLLECTION = 'missed_collection',
  BIN_OVERFLOW = 'bin_overflow',
  RECYCLING = 'recycling',
  BULKY_WASTE = 'bulky_waste',
  HAZARDOUS_WASTE = 'hazardous_waste',
  STREET_SWEEPING = 'street_sweeping'
}

export enum WastePriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum WasteIssueStatus {
  REPORTED = 'reported',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export type WasteTimeframe = '24h' | '7d' | '30d';

export enum VehicleStatus {
  AVAILABLE = 'available',
  ON_ROUTE = 'on_route',
  MAINTENANCE = 'maintenance',
  REFUELING = 'refueling'
}

export enum VehicleType {
  COLLECTION_TRUCK = 'collection_truck',
  RECYCLING_TRUCK = 'recycling_truck',
  STREET_SWEEPER = 'street_sweeper',
  SMALL_VEHICLE = 'small_vehicle',
  MEDIUM_TRUCK = 'medium_truck',
  LARGE_TRUCK = 'large_truck'
}

export enum CrewStatus {
  AVAILABLE = 'available',
  ON_ROUTE = 'on_route',
  BREAK = 'break',
  OFF_DUTY = 'off_duty'
}

export enum FillLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum BinType {
  GENERAL = 'general',
  RECYCLING = 'recycling',
  ORGANIC = 'organic'
}

export enum ComplaintType {
  MISSED_PICKUP = 'missed_pickup',
  OVERFLOWING = 'overflowing',
  ILLEGAL_DUMPING = 'illegal_dumping',
  ODOR = 'odor',
  OTHER = 'other'
}

export enum ComplaintStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved'
}

export enum FacilityType {
  LANDFILL = 'landfill',
  TRANSFER_STATION = 'transfer_station',
  RECYCLING_CENTER = 'recycling_center'
}

// Interface definitions
export interface WasteIssue {
  id: number;
  type: WasteIssueType;
  status: IssueStatus;
  priority: WastePriority;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  assignedTo?: string;
  estimatedVolume?: number;
  requiresHazardousHandling?: boolean;
  collectionRoute?: string;
  isEmergency?: boolean;
}

export interface CollectionRoute {
  id: string;
  name: string;
  zone: string;
  dayOfWeek: number;
  status: 'active' | 'completed' | 'cancelled';
  stops: RouteStop[];
  vehicleId?: string;
  crewId?: string;
  estimatedDuration: number;
  estimatedWasteVolume: number;
}

export interface RouteStop {
  order: number;
  issueId: number;
  location: string;
  estimatedArrival: Date;
  estimatedWasteVolume: number;
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  status: VehicleStatus;
  zone?: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  fuelLevel?: number;
  wasteCapacity?: number;
  estimatedAvailable?: Date;
  notes?: string;
}

export interface Crew {
  id: string;
  name: string;
  status: CrewStatus;
  zone?: string;
  members: CrewMember[];
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  vehicleId?: string;
  estimatedAvailable?: Date;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
}

export interface CrewPerformance {
  crewId: string;
  crewName: string;
  period: string;
  completedCollections: number;
  avgCompletionTime: number;
  efficiency: number;
}

export interface Bin {
  id: string;
  location: string;
  fillLevel: number;
  type: BinType;
  lastEmptied: Date;
  temperature?: number;
}

export interface RecyclingMetric {
  period: string;
  material: string;
  volume: number;
  rate: number;
}

export interface Complaint {
  id: string;
  type: ComplaintType;
  status: ComplaintStatus;
  description: string;
  location: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  satisfactionRating?: number;
}

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  location: string;
  capacity: number;
  currentLoad: number;
  status: 'operational' | 'at_capacity' | 'maintenance';
}

@Controller('dashboard/waste-management')
@UseGuards(JwtAuthGuard, DepartmentGuard)
export class WasteManagementDashboardController {
  constructor(private readonly wasteService: WasteManagementDashboardService) {}

  /**
   * Get waste collection issues
   */
  @Get('issues')
  @Roles(
    UserRole.WASTE_MANAGEMENT_OFFICER, 
    UserRole.WASTE_MANAGEMENT_SUPERVISOR, 
    UserRole.WASTE_MANAGEMENT_MANAGER,
    UserRole.WASTE_COLLECTION_OFFICER,
    UserRole.WASTE_RECYCLING_SPECIALIST
  )
  async getWasteIssues(
    @Query('type') type?: WasteIssueType,
    @Query('status') status?: IssueStatus,
    @Query('zone') zone?: string,
    @Query('route') route?: string,
    @Query('timeframe') timeframe?: WasteTimeframe,
    @Query('priority') priority?: WastePriority
  ): Promise<any> {;
    const filters = { 
      type: type?.toString(), 
      status, 
      zone, 
      route, 
      timeframe, 
      priority,
      includeEmergency: false 
    };
    const result = await this.wasteService.getWasteIssues(filters);
    return result;
  }

  /**
   * Get illegal dumping reports
   */
  @Get('issues/illegal-dumping')
  @Roles(
    UserRole.WASTE_MANAGEMENT_OFFICER, 
    UserRole.WASTE_MANAGEMENT_SUPERVISOR,
    UserRole.WASTE_COLLECTION_OFFICER
  )
  async getIllegalDumping(
    @Query('zone') zone?: string,
    @Query('days') days: number = 7,
    @Query('severity') severity?: 'minor' | 'moderate' | 'severe'
  ): Promise<any> {
    const result = await this.wasteService.getIllegalDumping(zone, days, severity);
    return result;
  }

  /**
   * Get issue details
   */
  @Get('issues/:id')
  @Roles(
    UserRole.WASTE_MANAGEMENT_OFFICER, 
    UserRole.WASTE_MANAGEMENT_SUPERVISOR,
    UserRole.WASTE_COLLECTION_OFFICER
  )
  async getIssueDetails(@Param('id') id: string): Promise<any> {
    const result = await this.wasteService.getIssueDetails(id);
    return result;
  }

  /**
   * Update waste issue status
   */
  @Put('issues/:id/status')
  @Roles(
    UserRole.WASTE_MANAGEMENT_OFFICER, 
    UserRole.WASTE_MANAGEMENT_SUPERVISOR,
    UserRole.WASTE_COLLECTION_OFFICER
  )
  async updateIssueStatus(
    @Param('id') id: string,
    @Body() updateDto: {
      status: IssueStatus;
      resolutionNotes?: string;
      wasteAmount?: number;
      disposalLocation?: string;
      resolvedAt?: Date;
    },
    @CurrentUser() user: any
  ): Promise<any> {
    const result = await this.wasteService.updateIssueStatus(id, updateDto, user.id);
    return result;
  }

  /**
   * Assign collection crew
   */
  @Post('issues/:id/assign')
  @Roles(UserRole.WASTE_MANAGEMENT_SUPERVISOR, UserRole.WASTE_MANAGEMENT_MANAGER)
  async assignCollectionCrew(
    @Param('id') id: string,
    @Body() assignDto: {
      crewId: string;
      vehicleId: string;
      estimatedArrival: Date;
      estimatedCompletion: Date;
      priority: 'high' | 'medium' | 'low';
    }
  ): Promise<any> {
    const result = await this.wasteService.assignCollectionCrew(id, assignDto);
    return result;
  }

  /**
   * Get collection efficiency analytics
   */
  @Get('analytics/collection-efficiency')
  @Roles(UserRole.WASTE_MANAGEMENT_SUPERVISOR, UserRole.WASTE_MANAGEMENT_MANAGER)
  async getCollectionEfficiency(
    @Query('period') period: WasteTimeframe = '30d',
    @Query('zone') zone?: string,
    @Query('route') route?: string
  ): Promise<any> {
    const result = await this.wasteService.getCollectionEfficiencyMetrics(undefined, zone, route, period);
    return result;
  }

  /**
   * Get route optimization suggestions
   */
  @Get('routes/optimization')
  @Roles(UserRole.WASTE_MANAGEMENT_SUPERVISOR, UserRole.WASTE_MANAGEMENT_MANAGER)
  async getRouteOptimization(
    @Query('zone') zone?: string,
    @Query('dayOfWeek') dayOfWeek?: number,
    @Query('includeHistorical') includeHistorical: boolean = true
  ): Promise<any> {
    const result = await this.wasteService.getRouteOptimizationSuggestions(zone, dayOfWeek, includeHistorical);
    return result;
  }

  /**
   * Get collection routes
   */
  @Get('routes')
  @Roles(
    UserRole.WASTE_MANAGEMENT_OFFICER, 
    UserRole.WASTE_MANAGEMENT_SUPERVISOR,
    UserRole.WASTE_COLLECTION_OFFICER
  )
  async getCollectionRoutes(
    @Query('zone') zone?: string,
    @Query('dayOfWeek') dayOfWeek?: number,
    @Query('status') status?: 'active' | 'completed' | 'cancelled'
  ): Promise<any> {
    const result = await this.wasteService.getCollectionRoutes(zone, dayOfWeek, status);
    return result;
  }

  /**
   * Get route details with stops
   */
  @Get('routes/:id')
  @Roles(
    UserRole.WASTE_MANAGEMENT_OFFICER, 
    UserRole.WASTE_MANAGEMENT_SUPERVISOR,
    UserRole.WASTE_COLLECTION_OFFICER
  )
  async getRouteDetails(@Param('id') id: string): Promise<any> {
    const result = await this.wasteService.getRouteDetails(id);
    return result;
  }

  /**
   * Optimize specific route
   */
  @Post('routes/:id/optimize')
  @Roles(UserRole.WASTE_MANAGEMENT_SUPERVISOR, UserRole.WASTE_MANAGEMENT_MANAGER)
  async optimizeRoute(
    @Param('id') id: string,
    @Body() optimizeDto: {
      considerTraffic: boolean;
      prioritizeOverflowing: boolean;
      maxStops?: number;
    }
  ): Promise<any> {
    const result = await this.wasteService.optimizeRoute(id, optimizeDto);
    return result;
  }

  /**
   * Get vehicle fleet status
   */
  @Get('fleet/status')
  @Roles(UserRole.WASTE_MANAGEMENT_SUPERVISOR, UserRole.WASTE_MANAGEMENT_MANAGER)
  async getFleetStatus(
    @Query('zone') zone?: string,
    @Query('status') status?: VehicleStatus,
    @Query('type') type?: VehicleType
  ): Promise<any> {
    const result = await this.wasteService.getFleetStatus(zone, status, type);
    return result;
  }

  /**
   * Update vehicle status
   */
  @Put('fleet/:vehicleId/status')
  @Roles(UserRole.WASTE_MANAGEMENT_SUPERVISOR, UserRole.WASTE_MANAGEMENT_MANAGER)
  async updateVehicleStatus(
    @Param('vehicleId') vehicleId: string,
    @Body() updateDto: {
      status: VehicleStatus;
      currentLocation?: {
        latitude: number;
        longitude: number;
      };
      fuelLevel?: number;
      wasteCapacity?: number;
      estimatedAvailable?: Date;
      notes?: string;
    }
  ): Promise<any> {
    const result = await this.wasteService.updateVehicleStatus(vehicleId, updateDto);
    return result;
  }

  /**
   * Get bin fill levels (smart bins)
   */
  @Get('bins/status')
  @Roles(
    UserRole.WASTE_MANAGEMENT_OFFICER, 
    UserRole.WASTE_MANAGEMENT_SUPERVISOR,
    UserRole.WASTE_COLLECTION_OFFICER
  )
  async getBinStatus(
    @Query('zone') zone?: string,
    @Query('fillLevel') fillLevel?: FillLevel,
    @Query('type') type?: BinType
  ): Promise<any> {
    const result = await this.wasteService.getBinStatus(zone, fillLevel, type);
    return result;
  }

  /**
   * Get bins needing immediate collection
   */
  @Get('bins/critical')
  @Roles(
    UserRole.WASTE_MANAGEMENT_OFFICER, 
    UserRole.WASTE_MANAGEMENT_SUPERVISOR,
    UserRole.WASTE_COLLECTION_OFFICER
  )
  async getCriticalBins(
    @Query('zone') zone?: string,
    @Query('threshold') threshold: number = 90
  ): Promise<any> {
    const result = await this.wasteService.getCriticalBins(zone, threshold);
    return result;
  }

  /**
   * Update bin fill level
   */
  @Put('bins/:binId/fill-level')
  @Roles(
    UserRole.WASTE_MANAGEMENT_OFFICER,
    UserRole.WASTE_COLLECTION_OFFICER
  )
  async updateBinFillLevel(
    @Param('binId') binId: string,
    @Body() updateDto: {
      fillLevel: number;
      temperature?: number;
      lastEmptied?: Date;
      notes?: string;
    }
  ): Promise<any> {
    const result = await this.wasteService.updateBinFillLevel(binId, updateDto);
    return result;
  }

  /**
   * Get recycling metrics
   */
  @Get('analytics/recycling')
  @Roles(
    UserRole.WASTE_MANAGEMENT_SUPERVISOR, 
    UserRole.WASTE_MANAGEMENT_MANAGER,
    UserRole.WASTE_RECYCLING_SPECIALIST
  )
  async getRecyclingMetrics(
    @Query('period') period: '30d' | '90d' | '1y' = '30d',
    @Query('zone') zone?: string,
    @Query('material') material?: 'plastic' | 'paper' | 'glass' | 'metal' | 'organic'
  ): Promise<any> {
    const result = await this.wasteService.getRecyclingMetrics(period, zone, material);
    return result;
  }

  /**
   * Get diversion rate (waste diverted from landfill)
   */
  @Get('analytics/diversion-rate')
  @Roles(UserRole.WASTE_MANAGEMENT_MANAGER, UserRole.WASTE_RECYCLING_SPECIALIST)
  async getDiversionRate(
    @Query('period') period: '30d' | '90d' | '1y' | 'ytd' = '30d',
    @Query('zone') zone?: string
  ): Promise<any> {
    const result = await this.wasteService.getDiversionRate(period, zone);
    return result;
  }

  /**
   * Get waste composition analysis
   */
  @Get('analytics/composition')
  @Roles(
    UserRole.WASTE_MANAGEMENT_SUPERVISOR, 
    UserRole.WASTE_MANAGEMENT_MANAGER,
    UserRole.WASTE_RECYCLING_SPECIALIST
  )
  async getWasteComposition(
    @Query('zone') zone?: string,
    @Query('days') days: number = 30
  ): Promise<any> {
    const result = await this.wasteService.getWasteComposition(zone, days);
    return result;
  }

  /**
   * Get collection crews
   */
  @Get('crews')
  @Roles(
    UserRole.WASTE_MANAGEMENT_OFFICER, 
    UserRole.WASTE_MANAGEMENT_SUPERVISOR,
    UserRole.WASTE_COLLECTION_OFFICER
  )
  async getCollectionCrews(
    @Query('zone') zone?: string,
    @Query('status') status?: CrewStatus
  ): Promise<any> {
    const result = await this.wasteService.getCollectionCrews(zone, status);
    return result;
  }

  /**
   * Get crew performance
   */
  @Get('crews/performance')
  @Roles(UserRole.WASTE_MANAGEMENT_SUPERVISOR, UserRole.WASTE_MANAGEMENT_MANAGER)
  async getCrewPerformance(
    @Query('zone') zone?: string,
    @Query('period') period: '7d' | '30d' | '90d' = '30d'
  ): Promise<any> {
    const result = await this.wasteService.getCrewPerformance(zone, period);
    return result;
  }

  /**
   * Update crew status
   */
  @Put('crews/:crewId/status')
  @Roles(UserRole.WASTE_MANAGEMENT_SUPERVISOR)
  async updateCrewStatus(
    @Param('crewId') crewId: string,
    @Body() updateDto: {
      status: CrewStatus;
      currentLocation?: {
        latitude: number;
        longitude: number;
      };
      estimatedAvailable?: Date;
    }
  ): Promise<any> {
    const result = await this.wasteService.updateCrewStatus(crewId, updateDto);
    return result;
  }

  /**
   * Get landfill/transfer station status
   */
  @Get('facilities/status')
  @Roles(UserRole.WASTE_MANAGEMENT_SUPERVISOR, UserRole.WASTE_MANAGEMENT_MANAGER)
  async getFacilityStatus(
    @Query('type') type?: FacilityType,
    @Query('zone') zone?: string
  ): Promise<any> {
    const result = await this.wasteService.getFacilityStatus(type, zone);
    return result;
  }

  /**
   * Get facility capacity
   */
  @Get('facilities/:id/capacity')
  @Roles(UserRole.WASTE_MANAGEMENT_MANAGER)
  async getFacilityCapacity(@Param('id') id: string): Promise<any> {
    const result = await this.wasteService.getFacilityCapacity(id);
    return result;
  }

  /**
   * Schedule waste collection for special events
   */
  @Post('schedule/special-event')
  @Roles(UserRole.WASTE_MANAGEMENT_SUPERVISOR, UserRole.WASTE_MANAGEMENT_MANAGER)
  async scheduleSpecialEventCollection(
    @Body() eventDto: {
      eventName: string;
      location: string;
      date: Date;
      estimatedWasteVolume: number;
      requiredVehicles: number;
      requiredCrew: number;
      contactPerson: string;
      contactPhone: string;
    }
  ): Promise<any> {
    const result = await this.wasteService.scheduleSpecialEventCollection(eventDto);
    return result;
  }

  /**
   * Get holiday collection schedule
   */
  @Get('schedule/holidays')
  @Roles(
    UserRole.WASTE_MANAGEMENT_OFFICER, 
    UserRole.WASTE_MANAGEMENT_SUPERVISOR,
    UserRole.WASTE_COLLECTION_OFFICER
  )
  async getHolidaySchedule(
    @Query('year') year: number,
    @Query('zone') zone?: string
  ): Promise<any> {
    const result = await this.wasteService.getHolidaySchedule(year, zone);
    return result;
  }

  /**
   * Get customer complaints
   */
  @Get('complaints')
  @Roles(
    UserRole.WASTE_MANAGEMENT_OFFICER, 
    UserRole.WASTE_MANAGEMENT_SUPERVISOR,
    UserRole.WASTE_COLLECTION_OFFICER
  )
  async getComplaints(
    @Query('type') type?: ComplaintType,
    @Query('status') status?: ComplaintStatus,
    @Query('zone') zone?: string,
    @Query('days') days: number = 30
  ): Promise<any> {
    const result = await this.wasteService.getComplaints(type, status, zone, days);
    return result;
  }

  /**
   * Resolve complaint
   */
  @Put('complaints/:id/resolve')
  @Roles(
    UserRole.WASTE_MANAGEMENT_OFFICER, 
    UserRole.WASTE_MANAGEMENT_SUPERVISOR,
    UserRole.WASTE_COLLECTION_OFFICER
  )
  async resolveComplaint(
    @Param('id') id: string,
    @Body() resolveDto: {
      resolution: string;
      resolvedBy: string;
      feedbackProvided?: boolean;
      satisfactionRating?: number;
    }
  ): Promise<any> {
    const result = await this.wasteService.resolveComplaint(id, resolveDto);
    return result;
  }

  /**
   * Get cost per ton analytics
   */
  @Get('analytics/cost-per-ton')
  @Roles(UserRole.WASTE_MANAGEMENT_MANAGER)
  async getCostPerTon(
    @Query('period') period: '30d' | '90d' | '1y' = '30d',
    @Query('zone') zone?: string,
    @Query('operation') operation?: 'collection' | 'processing' | 'disposal'
  ): Promise<any> {
    const result = await this.wasteService.getCostPerTon(period, zone, operation);
    return result;
  }

  /**
   * Get environmental impact metrics
   */
  @Get('analytics/environmental-impact')
  @Roles(UserRole.WASTE_MANAGEMENT_MANAGER, UserRole.WASTE_RECYCLING_SPECIALIST)
  async getEnvironmentalImpact(
    @Query('period') period: '30d' | '90d' | '1y' = '30d',
    @Query('metric') metric?: 'co2_saved' | 'energy_recovered' | 'landfill_space_saved'
  ): Promise<any> {
    const result = await this.wasteService.getEnvironmentalImpact(period, metric);
    return result;
  }

  /**
   * Generate collection forecast
   */
  @Get('forecast/collection')
  @Roles(UserRole.WASTE_MANAGEMENT_MANAGER)
  async getCollectionForecast(
    @Query('zone') zone?: string,
    @Query('days') days: number = 7,
    @Query('includeSeasonal') includeSeasonal: boolean = true
  ): Promise<any> {
    const result = await this.wasteService.getCollectionForecast(zone, days, includeSeasonal);
    return result;
  }
}