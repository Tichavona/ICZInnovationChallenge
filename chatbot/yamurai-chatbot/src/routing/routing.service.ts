// backend/src/routing/routing.service.ts (fixed version)
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between, In, FindOptionsWhere } from 'typeorm';
import { EmergencyReport, EmergencyType, EmergencyPriority } from '../database/emergency-report.entity';
import { IssueReport, IssueType } from '../database/issue-report.entity';
import { IncidentRoutingRule, IncidentType } from '../database/incident-routing-rule.entity';
import { Department, DepartmentType, DepartmentStaff } from '../database/department.entity';
import { Station } from '../database/station.entity';
import { GeoDistanceUtil } from '../shared/utils/geo-distance.util';

export interface RoutingResult {
  primaryDepartment: Department;
  secondaryDepartments: Department[];
  assignedStation?: Station;
  assignedStaff?: DepartmentStaff[];
  estimatedResponseTime: number; // minutes
  confidence: number;
  routingPath: string[];
  requiresCoordination: boolean;
  routingMetadata: {
    distanceToStation?: number;
    stationLoad: number;
    staffAvailability: number;
    timeOfDay: Date;
    weatherConditions?: string;
    trafficConditions?: string;
  };
}

export interface DepartmentCapability {
  departmentId: string;
  departmentName: string;
  capabilities: string[];
  currentLoad: number;
  availableStaff: number;
  availableVehicles: number;
  averageResponseTime: number;
  successRate: number;
  jurisdiction: {
    districts: string[];
    provinces: string[];
    regions: string[];
  };
}

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  constructor(
    @InjectRepository(IncidentRoutingRule)
    private routingRuleRepo: Repository<IncidentRoutingRule>,
    @InjectRepository(Department)
    private departmentRepo: Repository<Department>,
    @InjectRepository(Station)
    private stationRepo: Repository<Station>,
    @InjectRepository(DepartmentStaff)
    private staffRepo: Repository<DepartmentStaff>,
    private geoUtil: GeoDistanceUtil,
  ) {}

  /**
   * Route an emergency to appropriate departments with intelligence
   */
  async routeEmergency(
    emergency: EmergencyReport,
    options?: {
      preferNearestStation?: boolean;
      considerLoadBalancing?: boolean;
      maxDistance?: number;
    }
  ): Promise<RoutingResult> {
    try {
      // Get routing rules for this emergency type
      const routingRules = await this.routingRuleRepo.find({
        where: {
          incidentType: IncidentType.EMERGENCY,
          category: emergency.type,
          isActive: true
        } as FindOptionsWhere<IncidentRoutingRule>,
        relations: ['primaryDepartment'],
        order: { priority: 'ASC' }
      });

      let primaryDepartment: Department;
      let secondaryDepartments: Department[] = [];
      let assignedStation: Station | null = null;
      let assignedStaff: DepartmentStaff[] = [];

      // If specific rules exist, use them
      if (routingRules.length > 0) {
        const primaryRule = routingRules[0];
        primaryDepartment = primaryRule.primaryDepartment;
        
        // Get secondary departments from rule
        if (primaryRule.secondaryDepartments?.length) {
          const secondaryDeptIds = primaryRule.secondaryDepartments.map(d => d.departmentId);
          secondaryDepartments = await this.departmentRepo.findByIds(secondaryDeptIds);
        }
      } else {
        // Fallback to default routing based on type
        const routing = this.getDefaultEmergencyRouting(emergency.type);
        primaryDepartment = await this.departmentRepo.findOne({
          where: { type: routing.primary }
        }) as Department;
        
        if (routing.secondary?.length) {
          secondaryDepartments = await this.departmentRepo.find({
            where: { type: In(routing.secondary) }
          });
        }
      }

      // Find nearest station with capacity
      if (options?.preferNearestStation && emergency.latitude && emergency.longitude) {
        assignedStation = await this.findOptimalStation(
          emergency.latitude,
          emergency.longitude,
          primaryDepartment.id,
          emergency.priority
        );

        if (assignedStation) {
          // Find available staff at this station
          assignedStaff = await this.findAvailableStaff(
            assignedStation.id,
            this.getRequiredStaffCount(emergency.priority)
          );
        }
      }

      // Calculate estimated response time
      const estimatedResponseTime = await this.calculateResponseTime(
        emergency,
        assignedStation,
        primaryDepartment
      );

      // Get current department capabilities
      const capabilities = await this.getDepartmentCapabilities(primaryDepartment.id);

      return {
        primaryDepartment,
        secondaryDepartments,
        assignedStation: assignedStation || undefined,
        assignedStaff,
        estimatedResponseTime,
        confidence: this.calculateRoutingConfidence(emergency, capabilities),
        routingPath: this.buildRoutingPath(primaryDepartment, secondaryDepartments, assignedStation),
        requiresCoordination: secondaryDepartments.length > 0,
        routingMetadata: {
          distanceToStation: assignedStation ? this.geoUtil.calculateDistance(
            emergency.latitude,
            emergency.longitude,
            assignedStation.latitude,
            assignedStation.longitude
          ) : undefined,
          stationLoad: assignedStation?.operationalCapacity?.currentIncidents || 0,
          staffAvailability: assignedStaff.length,
          timeOfDay: new Date(),
          weatherConditions: await this.getWeatherConditions(emergency.latitude, emergency.longitude),
          trafficConditions: await this.getTrafficConditions(emergency.latitude, emergency.longitude)
        }
      };
    } catch (error) {
      this.logger.error('Error routing emergency:', error);
      throw error;
    }
  }

  /**
   * Route an issue to appropriate departments
   */
  async routeIssue(issue: IssueReport): Promise<RoutingResult> {
    try {
      const routingRules = await this.routingRuleRepo.find({
        where: {
          incidentType: IncidentType.ISSUE,
          category: issue.type,
          isActive: true
        } as FindOptionsWhere<IncidentRoutingRule>,
        relations: ['primaryDepartment']
      });

      let primaryDepartment: Department;
      
      if (routingRules.length > 0) {
        primaryDepartment = routingRules[0].primaryDepartment;
      } else {
        const routing = this.getDefaultIssueRouting(issue.type);
        primaryDepartment = await this.departmentRepo.findOne({
          where: { type: routing.primary }
        }) as Department;
      }

      return {
        primaryDepartment,
        secondaryDepartments: [],
        estimatedResponseTime: 120, // Default 2 hours for issues
        confidence: 85,
        routingPath: [primaryDepartment.name],
        requiresCoordination: false,
        routingMetadata: {
          stationLoad: 0,
          staffAvailability: 0,
          timeOfDay: new Date()
        }
      };
    } catch (error) {
      this.logger.error('Error routing issue:', error);
      throw error;
    }
  }

  /**
   * Find optimal station based on location, capacity, and priority
   */
  private async findOptimalStation(
    latitude: number,
    longitude: number,
    departmentId: string,
    priority: EmergencyPriority
  ): Promise<Station | null> {
    // Get all active stations in department
    const stations = await this.stationRepo.find({
      where: {
        department: { id: departmentId },
        status: 'active'
      }
    });

    if (!stations.length) return null;

    // Calculate distances and filter by coverage radius
    const stationsWithMetrics = stations.map(station => ({
      station,
      distance: this.geoUtil.calculateDistance(
        latitude,
        longitude,
        station.latitude,
        station.longitude
      ),
      load: station.operationalCapacity?.currentIncidents || 0,
      maxLoad: station.operationalCapacity?.maxConcurrentIncidents || 10
    }))
    .filter(s => s.distance <= (s.station.coverageRadiusKm || 10))
    .map(s => ({
      ...s,
      loadFactor: s.load / s.maxLoad,
      distanceScore: 1 - (s.distance / (s.station.coverageRadiusKm || 10))
    }));

    if (!stationsWithMetrics.length) return null;

    // Calculate weighted score based on priority
    const priorityWeights = {
      [EmergencyPriority.CRITICAL]: { distance: 0.6, load: 0.4 },
      [EmergencyPriority.HIGH]: { distance: 0.5, load: 0.5 },
      [EmergencyPriority.MEDIUM]: { distance: 0.4, load: 0.6 },
      [EmergencyPriority.LOW]: { distance: 0.3, load: 0.7 }
    };

    const weights = priorityWeights[priority] || priorityWeights[EmergencyPriority.MEDIUM];

    stationsWithMetrics.forEach(s => {
      (s as any).score = (s.distanceScore * weights.distance) + 
                         ((1 - s.loadFactor) * weights.load);
    });

    // Sort by score and return best station
    stationsWithMetrics.sort((a, b) => (b as any).score - (a as any).score);
    
    return stationsWithMetrics[0].station;
  }

  /**
   * Find available staff at a station
   */
  private async findAvailableStaff(
    stationId: string,
    requiredCount: number
  ): Promise<DepartmentStaff[]> {
    return await this.staffRepo.find({
      where: {
        station: { id: stationId },
        isActive: true,
        isOnDuty: true
      },
      relations: ['user'],
      order: { currentAssignments: 'ASC' },
      take: requiredCount
    });
  }

  /**
   * Calculate estimated response time
   */
  private async calculateResponseTime(
    emergency: EmergencyReport,
    station: Station | null,
    department: Department
  ): Promise<number> {
    let baseTime = 5; // Base 5 minutes

    if (station && emergency.latitude && emergency.longitude) {
      // Travel time based on distance
      const distance = this.geoUtil.calculateDistance(
        emergency.latitude,
        emergency.longitude,
        station.latitude,
        station.longitude
      );
      
      // Assume average speed 40 km/h in urban areas
      const travelTime = (distance / 40) * 60; // minutes
      baseTime += travelTime;
    }

    // Add dispatch time based on current load
    const dispatchTime = station?.operationalCapacity?.currentIncidents 
      ? station.operationalCapacity.currentIncidents * 0.5 
      : 0;

    // Priority-based adjustment
    const priorityMultiplier = {
      [EmergencyPriority.CRITICAL]: 0.8,
      [EmergencyPriority.HIGH]: 1.0,
      [EmergencyPriority.MEDIUM]: 1.2,
      [EmergencyPriority.LOW]: 1.5
    };

    return Math.round((baseTime + dispatchTime) * 
      (priorityMultiplier[emergency.priority] || 1));
  }

  /**
   * Get default emergency routing based on type
   */
  private getDefaultEmergencyRouting(type: EmergencyType): { 
    primary: DepartmentType; 
    secondary?: DepartmentType[] 
  } {
    const routingMap = {
      [EmergencyType.FIRE]: { 
        primary: DepartmentType.FIRE_BRIGADE, 
        secondary: [DepartmentType.AMBULANCE, DepartmentType.POLICE] 
      },
      [EmergencyType.AMBULANCE]: { 
        primary: DepartmentType.AMBULANCE,
        secondary: [DepartmentType.EMERGENCY_COORDINATION]
      },
      [EmergencyType.MEDICAL]: { 
        primary: DepartmentType.AMBULANCE,
        secondary: [DepartmentType.EMERGENCY_COORDINATION]
      },
      [EmergencyType.ROBBERY]: { 
        primary: DepartmentType.POLICE,
        secondary: [DepartmentType.EMERGENCY_COORDINATION]
      },
      [EmergencyType.CRIME]: { 
        primary: DepartmentType.POLICE,
        secondary: [DepartmentType.EMERGENCY_COORDINATION]
      },
      [EmergencyType.ACCIDENT]: { 
        primary: DepartmentType.AMBULANCE,
        secondary: [DepartmentType.POLICE, DepartmentType.FIRE_BRIGADE]
      },
      [EmergencyType.NATURAL_DISASTER]: { 
        primary: DepartmentType.EMERGENCY_COORDINATION,
        secondary: [DepartmentType.FIRE_BRIGADE, DepartmentType.AMBULANCE, DepartmentType.POLICE]
      },
      [EmergencyType.OTHER]: { 
        primary: DepartmentType.CITY_COUNCIL,
        secondary: [DepartmentType.EMERGENCY_COORDINATION]
      }
    };

    return routingMap[type] || routingMap[EmergencyType.OTHER];
  }

  /**
   * Get default issue routing based on type
   */
  private getDefaultIssueRouting(type: IssueType): { primary: DepartmentType } {
    const routingMap = {
      [IssueType.POTHOLE]: { primary: DepartmentType.CITY_COUNCIL },
      [IssueType.LITTER]: { primary: DepartmentType.WASTE_MANAGEMENT },
      [IssueType.SEWER]: { primary: DepartmentType.CITY_COUNCIL },
      [IssueType.WATER_PIPE_BURST]: { primary: DepartmentType.CITY_COUNCIL },
      [IssueType.OTHER]: { primary: DepartmentType.CITY_COUNCIL }
    };

    return routingMap[type] || routingMap[IssueType.OTHER];
  }

  /**
   * Get required staff count based on priority
   */
  private getRequiredStaffCount(priority: EmergencyPriority): number {
    const staffMap = {
      [EmergencyPriority.CRITICAL]: 4,
      [EmergencyPriority.HIGH]: 3,
      [EmergencyPriority.MEDIUM]: 2,
      [EmergencyPriority.LOW]: 1
    };
    return staffMap[priority] || 2;
  }

  /**
   * Get department capabilities
   */
  async getDepartmentCapabilities(departmentId: string): Promise<DepartmentCapability> {
    const department = await this.departmentRepo.findOne({
      where: { id: departmentId },
      relations: ['staff', 'stations']
    });

    if (!department) {
      throw new Error(`Department with ID ${departmentId} not found`);
    }

    const staff = await this.staffRepo.find({
      where: { 
        department: { id: departmentId },
        isActive: true 
      }
    });

    const stations = await this.stationRepo.find({
      where: { department: { id: departmentId } }
    });

    const availableStaff = staff.filter(s => s.isOnDuty).length;
    const totalVehicles = stations.reduce((sum, s) => 
      sum + (s.operationalCapacity?.totalVehicles || 0), 0);
    const availableVehicles = stations.reduce((sum, s) => 
      sum + (s.operationalCapacity?.availableVehicles || 0), 0);

    // Parse service areas safely
    let jurisdiction = { districts: [], provinces: [], regions: [] };
    try {
      if (department.serviceAreasJson) {
        jurisdiction = JSON.parse(department.serviceAreasJson);
      }
    } catch (e) {
      this.logger.warn(`Failed to parse service areas for department ${departmentId}`);
    }

    return {
      departmentId,
      departmentName: department.name,
      capabilities: this.inferCapabilities(department),
      currentLoad: department.activeIncidents || 0,
      availableStaff,
      availableVehicles,
      averageResponseTime: await this.calculateAverageResponseTime(departmentId),
      successRate: await this.calculateSuccessRate(departmentId),
      jurisdiction
    };
  }

  /**
   * Calculate routing confidence
   */
  private calculateRoutingConfidence(
    emergency: EmergencyReport,
    capabilities: DepartmentCapability
  ): number {
    let confidence = 80; // Base confidence

    // Adjust based on availability
    if (capabilities.availableStaff < this.getRequiredStaffCount(emergency.priority)) {
      confidence -= 20;
    }

    if (capabilities.availableVehicles < 1) {
      confidence -= 15;
    }

    // Adjust based on current load
    if (capabilities.currentLoad > 10) {
      confidence -= 10;
    }

    // Adjust based on historical performance
    if (capabilities.successRate < 80) {
      confidence -= 10;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Build routing path description
   */
  private buildRoutingPath(
    primary: Department,
    secondary: Department[],
    station?: Station | null
  ): string[] {
    const path = [
      `Primary: ${primary.name}`,
      ...secondary.map(s => `Secondary: ${s.name}`)
    ];

    if (station) {
      path.push(`Assigned Station: ${station.name}`);
    }

    return path;
  }

  /**
   * Infer department capabilities from type and staff
   */
  private inferCapabilities(department: Department): string[] {
    const capabilities: string[] = [];

    switch (department.type) {
      case DepartmentType.FIRE_BRIGADE:
        capabilities.push('Fire Suppression', 'Rescue Operations', 'Hazmat Response');
        break;
      case DepartmentType.AMBULANCE:
        capabilities.push('Emergency Medical Response', 'Patient Transport', 'ALS/BLS');
        break;
      case DepartmentType.POLICE:
        capabilities.push('Law Enforcement', 'Crime Scene Security', 'Traffic Control');
        break;
      case DepartmentType.CITY_COUNCIL:
        capabilities.push('Infrastructure Maintenance', 'Public Works', 'Permit Enforcement');
        break;
      case DepartmentType.WASTE_MANAGEMENT:
        capabilities.push('Waste Collection', 'Recycling', 'Street Cleaning');
        break;
      case DepartmentType.AGRICULTURAL:
        capabilities.push('Crop Disease Management', 'Livestock Health', 'Extension Services');
        break;
      case DepartmentType.EMERGENCY_COORDINATION:
        capabilities.push('Multi-agency Coordination', 'Resource Management', 'Incident Command');
        break;
    }

    return capabilities;
  }

  /**
   * Calculate average response time for department
   */
  private async calculateAverageResponseTime(departmentId: string): Promise<number> {
    // This would query historical assignments
    // For now, return a reasonable default
    return 15;
  }

  /**
   * Calculate success rate for department
   */
  private async calculateSuccessRate(departmentId: string): Promise<number> {
    // This would query historical resolutions
    // For now, return a reasonable default
    return 90;
  }

  /**
   * Get weather conditions (mock - would integrate with weather API)
   */
  private async getWeatherConditions(lat?: number, lng?: number): Promise<string> {
    if (!lat || !lng) return 'unknown';
    // Integrate with weather API
    return 'clear';
  }

  /**
   * Get traffic conditions (mock - would integrate with traffic API)
   */
  private async getTrafficConditions(lat?: number, lng?: number): Promise<string> {
    if (!lat || !lng) return 'unknown';
    // Integrate with traffic API
    return 'moderate';
  }
}