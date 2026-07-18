/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { EmergencyReport, EmergencyType, EmergencyStatus, EmergencyPriority } from '../../database/emergency-report.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncidentAssignment } from '../../database/incident-assignment.entity';
import { Station } from '../../database/station.entity';
import { DepartmentStaff } from '../../database/department.entity';
import { FireIncidentFilters } from '../controllers/fire-brigade-dashboard.controller';

@Injectable()
export class FireBrigadeDashboardService {
  getActiveFireIncidents(stationId: string | undefined) {
      throw new Error('Method not implemented.');
  }
  getFireIncidentDetails(id: string) {
      throw new Error('Method not implemented.');
  }
  updateFireIncidentStatus(id: string, updateDto: { status: string; resourcesDeployed?: { fireEngines: number; waterTankers: number; firefighters: number; specialUnits?: string[]; }; containmentLevel?: number; notes?: string; }, id1: any) {
      throw new Error('Method not implemented.');
  }
  dispatchResources(id: string, dispatchDto: { stationId: string; fireEngines: number; waterTankers: number; firefighters: number; officers: number; specialUnits?: string[]; estimatedArrival: Date; }) {
      throw new Error('Method not implemented.');
  }
  getResponseTimeAnalytics(period: string, stationId: string | undefined) {
      throw new Error('Method not implemented.');
  }
  getFireTypeBreakdown(stationId: string | undefined, days: number) {
      throw new Error('Method not implemented.');
  }
  updateEquipmentStatus(equipmentId: string, updateDto: { status: "available" | "in_use" | "maintenance" | "out_of_service"; notes?: string; estimatedReturn?: Date; }) {
      throw new Error('Method not implemented.');
  }
  getFireHazardPrediction(region: string | undefined, days: number) {
      throw new Error('Method not implemented.');
  }
  getNearbyWaterSources(latitude: number, longitude: number, radius: number) {
      throw new Error('Method not implemented.');
  }
  getWaterSourcesByStation(stationId: string | undefined) {
      throw new Error('Method not implemented.');
  }
  getMutualAidAgreements() {
      throw new Error('Method not implemented.');
  }
  requestMutualAid(requestDto: { incidentId: string; requiredResources: { fireEngines: number; firefighters: number; specialEquipment?: string[]; }; requestingStationId: string; duration: number; }) {
      throw new Error('Method not implemented.');
  }
  getStationPerformanceMetrics(stationId: string | undefined, days: number) {
      throw new Error('Method not implemented.');
  }
  getStaffFatigueLevels(stationId: string | undefined) {
      throw new Error('Method not implemented.');
  }
  rotateStaff(rotationDto: { stationId: string; staffIds: string[]; newShift: "morning" | "afternoon" | "night" | "rest"; }) {
      throw new Error('Method not implemented.');
  }
  private readonly fireIncidentTypes = [
    EmergencyType.FIRE,
    EmergencyType.NATURAL_DISASTER,
    EmergencyType.ACCIDENT // For vehicle extraction
  ];

  constructor(
    @InjectRepository(EmergencyReport)
    private emergencyRepo: Repository<EmergencyReport>,
    @InjectRepository(IncidentAssignment)
    private assignmentRepo: Repository<IncidentAssignment>,
    @InjectRepository(Station)
    private stationRepo: Repository<Station>,
    @InjectRepository(DepartmentStaff)
    private staffRepo: Repository<DepartmentStaff>,
  ) {}

  async getFireIncidents(filters: FireIncidentFilters) {
    const { severity, type, stationId, status, timeframe } = filters;
    const queryBuilder = this.emergencyRepo
      .createQueryBuilder('emergency')
      .leftJoinAndSelect('emergency.assignments', 'assignments')
      .leftJoinAndSelect('assignments.assignedStation', 'station')
      .where('emergency.type = :fireType', { fireType: EmergencyType.FIRE });

    if (filters.severity) {
      queryBuilder.andWhere('emergency.priority = :severity', { severity: filters.severity });
    }

    if (filters.stationId) {
      queryBuilder.andWhere('station.id = :stationId', { stationId: filters.stationId });
    }

    if (filters.status) {
      queryBuilder.andWhere('emergency.status = :status', { status: filters.status });
    }

    const incidents = await queryBuilder.getMany();

    // Classify fire types based on description/location
    return incidents.map(incident => ({
      ...incident,
      fireType: this.classifyFireType(incident),
      resourceRequirements: this.calculateResourceRequirements(incident)
    }));
  }

  async getFireContainmentTimes(stationId?: string, days: number = 30): Promise<any> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const queryBuilder = this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.emergency', 'emergency')
      .leftJoinAndSelect('assignment.assignedStation', 'station')
      .where('emergency.type = :fireType', { fireType: EmergencyType.FIRE })
      .andWhere('emergency.createdAt >= :since', { since })
      .andWhere('assignment.status = :completed', { completed: 'completed' });

    if (stationId) {
      queryBuilder.andWhere('station.id = :stationId', { stationId });
    }

    const assignments = await queryBuilder.getMany();

    const containmentTimes = assignments.map(a => ({
      incidentId: a.incidentId,
      stationName: a.assignedStation.name,
      responseTime: this.calculateResponseTime(a),
      containmentTime: this.calculateContainmentTime(a),
      totalDuration: this.calculateTotalDuration(a),
      priority: a.emergency.priority,
      fireType: this.classifyFireType(a.emergency)
    }));

    // Calculate averages
    const avgResponseTime = this.calculateAverage(containmentTimes.map(c => c.responseTime));
    const avgContainmentTime = this.calculateAverage(containmentTimes.map(c => c.containmentTime));

    return {
      averageResponseTimeMinutes: avgResponseTime,
      averageContainmentTimeMinutes: avgContainmentTime,
      byFireType: this.groupByFireType(containmentTimes),
      byPriority: this.groupByPriority(containmentTimes),
      byStation: this.groupByStation(containmentTimes),
      detailed: containmentTimes
    };
  }

  async getEquipmentAvailability(stationId?: string): Promise<any> {
    // This would connect to an equipment management system
    // For now, return mock data structure
    const stations = await this.stationRepo.find({
      where: stationId ? { id: stationId } : {},
      relations: ['department']
    });

    return stations.map(station => ({
      stationId: station.id,
      stationName: station.name,
      fireEngines: {
        total: 3,
        available: 2,
        inMaintenance: 1,
        deployed: 0
      },
      waterTankers: {
        total: 2,
        available: 1,
        inMaintenance: 1,
        deployed: 0
      },
      rescueVehicles: {
        total: 2,
        available: 1,
        inMaintenance: 0,
        deployed: 1
      },
      equipment: {
        breathingApparatus: {
          total: 20,
          available: 15,
          inUse: 5
        },
        thermalCameras: {
          total: 4,
          available: 3,
          inUse: 1
        },
        hydraulicRescueTools: {
          total: 3,
          available: 2,
          inUse: 1
        }
      },
      lastUpdated: new Date()
    }));
  }

  async getStaffReadinessLevel(stationId?: string): Promise<any> {
    const queryBuilder = this.staffRepo
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.user', 'user')
      .leftJoinAndSelect('staff.department', 'department')
      .where('department.type = :deptType', { deptType: 'fire_brigade' });

    if (stationId) {
      queryBuilder.andWhere('staff.stationId = :stationId', { stationId });
    }

    const staff = await queryBuilder.getMany();

    const readiness = {
      totalStaff: staff.length,
      onDuty: staff.filter(s => s.isOnDuty).length,
      offDuty: staff.filter(s => !s.isOnDuty).length,
      bySpecialization: {} as any,
      byShift: {} as any
    };

    staff.forEach(member => {
      // By specialization
      if (member.specialization) {
        if (!readiness.bySpecialization[member.specialization]) {
          readiness.bySpecialization[member.specialization] = {
            total: 0,
            onDuty: 0
          };
        }
        readiness.bySpecialization[member.specialization].total++;
        if (member.isOnDuty) {
          readiness.bySpecialization[member.specialization].onDuty++;
        }
      }

      // By shift
      if (member.shiftSchedule?.shift) {
        const shift = member.shiftSchedule.shift;
        if (!readiness.byShift[shift]) {
          readiness.byShift[shift] = {
            total: 0,
            onDuty: 0
          };
        }
        readiness.byShift[shift].total++;
        if (member.isOnDuty) {
          readiness.byShift[shift].onDuty++;
        }
      }
    });

    return readiness;
  }

  // Helper methods
  private classifyFireType(incident: EmergencyReport): string {
    const description = incident.description?.toLowerCase() || '';
    
    if (description.includes('structural') || description.includes('building') || description.includes('house')) {
      return 'structural';
    } else if (description.includes('vehicle') || description.includes('car') || description.includes('truck')) {
      return 'vehicle';
    } else if (description.includes('wildfire') || description.includes('forest') || description.includes('bush')) {
      return 'wildfire';
    } else if (description.includes('industrial') || description.includes('factory')) {
      return 'industrial';
    }
    
    return 'other';
  }

  private calculateResourceRequirements(incident: EmergencyReport): any {
    const priority = incident.priority;
    
    const baseRequirements = {
      fireEngines: 1,
      firefighters: 4,
      officers: 1
    };

    if (priority === EmergencyPriority.CRITICAL) {
      return {
        ...baseRequirements,
        fireEngines: 3,
        firefighters: 12,
        officers: 3,
        specialUnits: ['hazmat_team', 'rescue_team']
      };
    } else if (priority === EmergencyPriority.HIGH) {
      return {
        ...baseRequirements,
        fireEngines: 2,
        firefighters: 8,
        officers: 2,
        specialUnits: ['rescue_team']
      };
    }

    return baseRequirements;
  }

  private calculateResponseTime(assignment: any): number {
    if (!assignment.acknowledgedAt) return 0;
    return (assignment.acknowledgedAt.getTime() - assignment.assignedAt.getTime()) / (1000 * 60);
  }

  private calculateContainmentTime(assignment: any): number {
    if (!assignment.onSceneAt || !assignment.completedAt) return 0;
    return (assignment.completedAt.getTime() - assignment.onSceneAt.getTime()) / (1000 * 60);
  }

  private calculateTotalDuration(assignment: any): number {
    if (!assignment.completedAt) return 0;
    return (assignment.completedAt.getTime() - assignment.assignedAt.getTime()) / (1000 * 60);
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((a, b) => a + b, 0);
    return Math.round((sum / numbers.length) * 10) / 10;
  }

  private groupByFireType(containmentTimes: any[]): any {
    const groups = {};
    
    containmentTimes.forEach(ct => {
      if (!groups[ct.fireType]) {
        groups[ct.fireType] = {
          count: 0,
          avgResponseTime: 0,
          avgContainmentTime: 0
        };
      }
      
      groups[ct.fireType].count++;
      groups[ct.fireType].avgResponseTime += ct.responseTime;
      groups[ct.fireType].avgContainmentTime += ct.containmentTime;
    });

    Object.keys(groups).forEach(key => {
      groups[key].avgResponseTime /= groups[key].count;
      groups[key].avgContainmentTime /= groups[key].count;
      groups[key].avgResponseTime = Math.round(groups[key].avgResponseTime * 10) / 10;
      groups[key].avgContainmentTime = Math.round(groups[key].avgContainmentTime * 10) / 10;
    });

    return groups;
  }

  private groupByPriority(containmentTimes: any[]): any {
    const groups = {};
    
    containmentTimes.forEach(ct => {
      const priority = ct.priority || 'medium';
      if (!groups[priority]) {
        groups[priority] = {
          count: 0,
          avgResponseTime: 0,
          avgContainmentTime: 0
        };
      }
      
      groups[priority].count++;
      groups[priority].avgResponseTime += ct.responseTime;
      groups[priority].avgContainmentTime += ct.containmentTime;
    });

    Object.keys(groups).forEach(key => {
      groups[key].avgResponseTime /= groups[key].count;
      groups[key].avgContainmentTime /= groups[key].count;
      groups[key].avgResponseTime = Math.round(groups[key].avgResponseTime * 10) / 10;
      groups[key].avgContainmentTime = Math.round(groups[key].avgContainmentTime * 10) / 10;
    });

    return groups;
  }

  private groupByStation(containmentTimes: any[]): any {
    const groups = {};
    
    containmentTimes.forEach(ct => {
      if (!groups[ct.stationName]) {
        groups[ct.stationName] = {
          count: 0,
          avgResponseTime: 0,
          avgContainmentTime: 0
        };
      }
      
      groups[ct.stationName].count++;
      groups[ct.stationName].avgResponseTime += ct.responseTime;
      groups[ct.stationName].avgContainmentTime += ct.containmentTime;
    });

    Object.keys(groups).forEach(key => {
      groups[key].avgResponseTime /= groups[key].count;
      groups[key].avgContainmentTime /= groups[key].count;
      groups[key].avgResponseTime = Math.round(groups[key].avgResponseTime * 10) / 10;
      groups[key].avgContainmentTime = Math.round(groups[key].avgContainmentTime * 10) / 10;
    });

    return groups;
  }
}