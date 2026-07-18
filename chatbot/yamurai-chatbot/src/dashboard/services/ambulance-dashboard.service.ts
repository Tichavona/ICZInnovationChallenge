/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
// src/dashboard/services/ambulance-dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { UnifiedDashboardService } from './base-dashboard.service';
import { EmergencyReport, EmergencyType, EmergencyStatus, EmergencyPriority } from '../../database/emergency-report.entity';
import { AssignmentStatus } from '../../database/incident-assignment.entity';
import { Station } from '../../database/station.entity';
import { DepartmentType } from '../../database/department.entity';

export enum MedicalEmergencyType {
  CARDIAC_ARREST = 'cardiac_arrest',
  STROKE = 'stroke',
  TRAUMA = 'trauma',
  BREATHING_DIFFICULTY = 'breathing_difficulty',
  CHEST_PAIN = 'chest_pain',
  SEIZURE = 'seizure',
  ALLERGIC_REACTION = 'allergic_reaction',
  DIABETIC_EMERGENCY = 'diabetic_emergency',
  PREGNANCY = 'pregnancy',
  PEDIATRIC = 'pediatric',
  GERIATRIC = 'geriatric',
  PSYCHIATRIC = 'psychiatric',
  OVERDOSE = 'overdose',
  OTHER = 'other'
}

export enum ResponseCode {
  CODE_RED = 'code_red',       // Life-threatening, immediate response
  CODE_YELLOW = 'code_yellow',  // Serious but stable
  CODE_GREEN = 'code_green',     // Non-emergency transport
  CODE_BLACK = 'code_black'      // Mass casualty incident
}

interface ResponseTimeData {
  dispatchTime: number;
  travelTime: number;
  onSceneTime: number;
  transportTime: number;
  totalResponseTime: number;
  priority: EmergencyPriority;
  code: ResponseCode;
}

interface HandoverData {
  date: Date;
  hospital: string;
  handoverMinutes: number;
  delayReason: string | null;
}

@Injectable()
export class AmbulanceDashboardService extends UnifiedDashboardService {
  getMedicalIncidents(filters: { severity: string | undefined; type: "accident" | "medical" | "cardiac" | "trauma" | "respiratory" | undefined; stationId: string | undefined; status: string | undefined; timeframe: "24h" | "7d" | "30d" | undefined; }) {
      throw new Error('Method not implemented.');
  }
  getCriticalIncidents(stationId: string | undefined) {
      throw new Error('Method not implemented.');
  }
  getMedicalIncidentDetails(id: string) {
      throw new Error('Method not implemented.');
  }
  updateTriage(id: string, triageDto: { triageLevel: "red" | "yellow" | "green" | "black"; vitalSigns?: { bloodPressure?: string; heartRate?: number; respiratoryRate?: number; oxygenSaturation?: number; temperature?: number; consciousness?: "alert" | "verbal" | "pain" | "unresponsive"; }; notes?: string; }, id1: any) {
      throw new Error('Method not implemented.');
  }
  dispatchAmbulance(id: string, dispatchDto: { stationId: string; ambulanceId: string; crew: string[]; estimatedArrival: Date; equipment?: string[]; }) {
      throw new Error('Method not implemented.');
  }
  getResponseTimeAnalytics(period: string, stationId: string | undefined, priority: string | undefined) {
      throw new Error('Method not implemented.');
  }
  getFleetStatus(stationId: string | undefined, status: string | undefined) {
      throw new Error('Method not implemented.');
  }
  updateAmbulanceStatus(ambulanceId: string, updateDto: { status: "available" | "en_route" | "on_scene" | "transporting" | "maintenance"; currentLocation?: { latitude: number; longitude: number; }; estimatedAvailable?: Date; notes?: string; }) {
      throw new Error('Method not implemented.');
  }
  getEquipmentInventory(stationId: string | undefined, type: string | undefined) {
      throw new Error('Method not implemented.');
  }
  recordEquipmentUsage(usageDto: { incidentId: string; equipmentUsed: Array<{ id: string; quantity: number; }>; notes?: string; }) {
      throw new Error('Method not implemented.');
  }
  getStaffAvailability(stationId: string | undefined, skill: string | undefined) {
      throw new Error('Method not implemented.');
  }
  getNearbyHospitals(latitude: number, longitude: number, radius: number, specialty: string | undefined) {
      throw new Error('Method not implemented.');
  }
  getAllHospitalsCapacity() {
      throw new Error('Method not implemented.');
  }
  updateHospitalCapacity(hospitalId: string, capacityDto: { emergencyBeds: number; icuBeds: number; cardiacBeds: number; pediatricBeds: number; burnBeds: number; updatedAt: Date; }) {
      throw new Error('Method not implemented.');
  }
  getCardiacArrestMetrics(stationId: string | undefined, days: number) {
      throw new Error('Method not implemented.');
  }
  getMCIReadiness(stationId: string | undefined) {
      throw new Error('Method not implemented.');
  }
  activateMCIProtocol(mciDto: { incidentId: string; estimatedPatients: number; severityLevel: "level1" | "level2" | "level3"; hospitalsNotified: string[]; }) {
      throw new Error('Method not implemented.');
  }
  getPharmacyInventory(stationId: string | undefined, expiringWithinDays: number | undefined) {
      throw new Error('Method not implemented.');
  }
  requestDrugRestock(restockDto: { stationId: string; items: Array<{ drugId: string; quantity: number; priority: "high" | "medium" | "low"; }>; reason?: string; }) {
      throw new Error('Method not implemented.');
  }
  private readonly ambulanceIncidentTypes = [
    EmergencyType.AMBULANCE,
    EmergencyType.MEDICAL,
    EmergencyType.ACCIDENT
  ];

  async getMedicalEmergencies(filters: {
    type?: MedicalEmergencyType;
    code?: ResponseCode;
    status?: EmergencyStatus;
    priority?: EmergencyPriority;
    stationId?: string;
    district?: string;
    timeframe?: '24h' | '7d' | '30d';
  }) {
    const timeframeMap = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const queryBuilder = this.emergencyRepo
      .createQueryBuilder('emergency')
      .leftJoinAndSelect('emergency.assignments', 'assignments')
      .leftJoinAndSelect('assignments.assignedStation', 'station')
      .where('emergency.type IN (:...types)', { types: this.ambulanceIncidentTypes });

    if (filters.status) {
      queryBuilder.andWhere('emergency.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      queryBuilder.andWhere('emergency.priority = :priority', { priority: filters.priority });
    }

    if (filters.timeframe) {
      const since = new Date(Date.now() - timeframeMap[filters.timeframe]);
      queryBuilder.andWhere('emergency.createdAt >= :since', { since });
    }

    if (filters.stationId) {
      queryBuilder.andWhere('station.id = :stationId', { stationId: filters.stationId });
    }

    const emergencies = await queryBuilder.getMany();

    // Triage and classify
    return emergencies.map(emergency => ({
      ...emergency,
      medicalType: this.classifyMedicalEmergency(emergency),
      responseCode: this.determineResponseCode(emergency),
      requiresAdvancedLifeSupport: this.needsALS(emergency),
      requiresBasicLifeSupport: this.needsBLS(emergency),
      estimatedHospital: this.findNearestHospital(emergency),
      transportTime: this.estimateTransportTime(emergency),
      requiredCrew: this.determineRequiredCrew(emergency)
    }));
  }

  async getResponseTimeMetrics(
    stationId?: string,
    period: '24h' | '7d' | '30d' | '90d' = '30d'
  ): Promise<any> {
    const periodMap = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };

    const days = periodMap[period];
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const assignments = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.emergency', 'emergency')
      .leftJoinAndSelect('assignment.assignedStation', 'station')
      .where('emergency.type IN (:...types)', { types: this.ambulanceIncidentTypes })
      .andWhere('assignment.assignedAt >= :since', { since })
      .getMany();

    // Calculate response time components
    const responseTimes: ResponseTimeData[] = assignments.map(a => ({
      dispatchTime: this.calculateDispatchTime(a),
      travelTime: this.calculateTravelTime(a),
      onSceneTime: this.calculateOnSceneTime(a),
      transportTime: this.calculateTransportTime(a),
      totalResponseTime: this.calculateTotalResponseTime(a),
      priority: a.emergency.priority,
      code: this.determineResponseCode(a.emergency)
    }));

    const validResponseTimes = responseTimes.filter(r => r.totalResponseTime > 0);

    return {
      period,
      summary: {
        averageDispatchMinutes: this.calculateAverage(validResponseTimes.map(r => r.dispatchTime)),
        averageTravelMinutes: this.calculateAverage(validResponseTimes.map(r => r.travelTime)),
        averageOnSceneMinutes: this.calculateAverage(validResponseTimes.map(r => r.onSceneTime)),
        averageTransportMinutes: this.calculateAverage(validResponseTimes.map(r => r.transportTime)),
        averageTotalMinutes: this.calculateAverage(validResponseTimes.map(r => r.totalResponseTime)),
        totalIncidents: assignments.length
      },
      byPriority: this.groupResponseTimesByPriority(validResponseTimes),
      byCode: this.groupResponseTimesByCode(validResponseTimes),
      byHour: this.groupResponseTimesByHour(validResponseTimes),
      benchmarkComparison: this.compareToBenchmarks(validResponseTimes)
    };
  }

  async getAmbulanceAvailability(stationId?: string): Promise<any> {
    let stations: Station[] = [];
    
    if (stationId) {
      const station = await this.stationRepo.findOne({ 
        where: { id: stationId } 
      });
      if (station) {
        stations = [station];
      }
    } else {
      stations = await this.stationRepo.find({
        where: {
          department: {
            type: DepartmentType.AMBULANCE
          }
        },
        relations: ['department']
      });
    }

    const availability = await Promise.all(stations.map(async (station) => {
      const activeAssignments = await this.assignmentRepo.count({
        where: {
          assignedStation: { id: station.id },
          status: In([AssignmentStatus.ACCEPTED, AssignmentStatus.EN_ROUTE, AssignmentStatus.ON_SCENE])
        }
      });

      const staff = await this.staffRepo.find({
        where: { 
          department: { type: DepartmentType.AMBULANCE }
        },
        relations: ['user']
      });

      const alsStaff = staff.filter(s => 
        s.specialization?.includes('ALS') || 
        s.specialization?.includes('Paramedic')
      ).length;

      const blsStaff = staff.filter(s => 
        s.specialization?.includes('BLS') || 
        s.specialization?.includes('EMT')
      ).length;

      return {
        stationId: station.id,
        stationName: station.name,
        status: station.status,
        vehicles: {
          total: station.operationalCapacity?.totalVehicles || 0,
          available: station.operationalCapacity?.availableVehicles || 0,
          inUse: activeAssignments,
          maintenance: (station.operationalCapacity?.totalVehicles || 0) - 
                      (station.operationalCapacity?.availableVehicles || 0) - 
                      activeAssignments
        },
        staff: {
          total: station.operationalCapacity?.totalStaff || 0,
          available: station.operationalCapacity?.availableStaff || 0,
          onDuty: staff.length,
          als: alsStaff,
          bls: blsStaff,
          inField: activeAssignments
        },
        coverage: {
          radiusKm: station.coverageRadiusKm || 0,
          currentLoad: ((activeAssignments / (station.operationalCapacity?.maxConcurrentIncidents || 1)) * 100) || 0
        },
        readinessScore: this.calculateReadinessScore(station, activeAssignments, staff.length)
      };
    }));

    return {
      timestamp: new Date(),
      summary: {
        totalStations: availability.length,
        totalAvailableVehicles: availability.reduce((sum, a) => sum + a.vehicles.available, 0),
        totalAvailableStaff: availability.reduce((sum, a) => sum + a.staff.available, 0),
        averageReadiness: availability.length ? 
          availability.reduce((sum, a) => sum + a.readinessScore, 0) / availability.length : 0
      },
      stations: availability
    };
  }

  async getPatientOutcomes(stationId?: string, days: number = 30): Promise<any> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const completedIncidents = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.emergency', 'emergency')
      .leftJoinAndSelect('assignment.assignedStation', 'station')
      .where('emergency.type IN (:...types)', { types: this.ambulanceIncidentTypes })
      .andWhere('assignment.status = :status', { status: AssignmentStatus.COMPLETED })
      .andWhere('assignment.completedAt >= :since', { since })
      .getMany();

    // Categorize outcomes based on emergency data and follow-up
    const outcomes = {
      cardiacArrest: {
        total: 0,
        rosc: 0, // Return of spontaneous circulation
        survival: 0
      },
      stroke: {
        total: 0,
        thrombolysis: 0,
        recovery: 0
      },
      trauma: {
        total: 0,
        critical: 0,
        stable: 0
      },
      respiratory: {
        total: 0,
        intubated: 0,
        improved: 0
      }
    };

    completedIncidents.forEach(incident => {
      const type = this.classifyMedicalEmergency(incident.emergency);
      
      // Mock outcome tracking - in production, this would link to hospital data
      if (type === MedicalEmergencyType.CARDIAC_ARREST) {
        outcomes.cardiacArrest.total++;
        if (Math.random() > 0.5) outcomes.cardiacArrest.rosc++;
        if (Math.random() > 0.7) outcomes.cardiacArrest.survival++;
      } else if (type === MedicalEmergencyType.STROKE) {
        outcomes.stroke.total++;
        if (Math.random() > 0.4) outcomes.stroke.thrombolysis++;
        if (Math.random() > 0.6) outcomes.stroke.recovery++;
      } else if (type === MedicalEmergencyType.TRAUMA) {
        outcomes.trauma.total++;
        if (Math.random() > 0.3) outcomes.trauma.critical++;
        if (Math.random() > 0.5) outcomes.trauma.stable++;
      } else if (type === MedicalEmergencyType.BREATHING_DIFFICULTY) {
        outcomes.respiratory.total++;
        if (Math.random() > 0.4) outcomes.respiratory.intubated++;
        if (Math.random() > 0.7) outcomes.respiratory.improved++;
      }
    });

    return {
      period: `${days} days`,
      outcomes,
      survivalRates: {
        cardiacArrest: outcomes.cardiacArrest.total ? 
          (outcomes.cardiacArrest.survival / outcomes.cardiacArrest.total) * 100 : 0,
        stroke: outcomes.stroke.total ? 
          (outcomes.stroke.recovery / outcomes.stroke.total) * 100 : 0,
        overall: this.calculateOverallSurvivalRate(outcomes)
      },
      qualityMetrics: await this.getQualityMetrics(completedIncidents),
      hospitalHandoverTimes: await this.getHandoverTimes(stationId, days)
    };
  }

  async getCrewPerformance(stationId?: string): Promise<any> {
    const staff = await this.staffRepo
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.user', 'user')
      .leftJoinAndSelect('staff.assignments', 'assignments')
      .leftJoinAndSelect('assignments.emergency', 'emergency')
      .where('staff.department.type = :type', { type: DepartmentType.AMBULANCE })
      .getMany();

    return staff.map(member => {
      const completedAssignments = member.assignments?.filter(
        a => a.status === AssignmentStatus.COMPLETED
      ) || [];

      const avgResponseTime = this.calculateAverage(
        completedAssignments.map(a => this.calculateTotalResponseTime(a))
      );

      const criticalIncidents = completedAssignments.filter(
        a => a.emergency?.priority === EmergencyPriority.CRITICAL
      ).length;

      return {
        staffId: member.id,
        name: member.user?.name || 'Unknown',
        role: member.role,
        certification: member.specialization,
        isOnDuty: member.isOnDuty,
        stats: {
          completedMissions: completedAssignments.length,
          criticalIncidents,
          avgResponseTimeMinutes: Math.round(avgResponseTime * 10) / 10,
          successRate: completedAssignments.length ? 
            (criticalIncidents / completedAssignments.length) * 100 : 100,
          patientSatisfaction: Math.floor(Math.random() * 20) + 80 // Mock data
        },
        recentPerformance: this.getRecentPerformance(member)
      };
    });
  }

  async getHospitalCoordinationMetrics(): Promise<any> {
    // Mock hospital data - in production, this would integrate with hospital systems
    const hospitals = [
      { name: 'City General Hospital', capacity: 85, traumaCenter: true },
      { name: 'St. Mary\'s Medical', capacity: 65, traumaCenter: false },
      { name: 'University Hospital', capacity: 45, traumaCenter: true },
      { name: 'Community Medical Center', capacity: 25, traumaCenter: false }
    ];

    const recentAssignments = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.emergency', 'emergency')
      .where('emergency.type IN (:...types)', { types: this.ambulanceIncidentTypes })
      .andWhere('assignment.completedAt >= :date', { 
        date: new Date(Date.now() - 24 * 60 * 60 * 1000) 
      })
      .getMany();

    return {
      hospitals: hospitals.map(h => ({
        ...h,
        status: h.capacity > 80 ? 'critical' : h.capacity > 60 ? 'busy' : 'available',
        acceptingPatients: h.capacity < 90,
        estimatedWaitMinutes: Math.floor(Math.random() * 60) + 15
      })),
      handoverMetrics: {
        averageHandoverMinutes: 12.5,
        delaysToday: 3,
        bypassEvents: 1
      },
      diversions: {
        activeDiversions: 1,
        diversionHospital: 'City General Hospital',
        diversionReason: 'Emergency Department at capacity'
      },
      coordinationScore: 85
    };
  }

  // Helper methods
  private classifyMedicalEmergency(emergency: EmergencyReport): MedicalEmergencyType {
    const description = emergency.description?.toLowerCase() || '';
    
    if (description.includes('cardiac') || description.includes('heart') || description.includes('cpr')) {
      return MedicalEmergencyType.CARDIAC_ARREST;
    } else if (description.includes('stroke') || description.includes('facial') || description.includes('slurred')) {
      return MedicalEmergencyType.STROKE;
    } else if (description.includes('trauma') || description.includes('injury') || description.includes('bleeding')) {
      return MedicalEmergencyType.TRAUMA;
    } else if (description.includes('breath') || description.includes('asthma') || description.includes('choking')) {
      return MedicalEmergencyType.BREATHING_DIFFICULTY;
    } else if (description.includes('chest') || description.includes('angina')) {
      return MedicalEmergencyType.CHEST_PAIN;
    } else if (description.includes('seizure') || description.includes('convulsion')) {
      return MedicalEmergencyType.SEIZURE;
    } else if (description.includes('allergic') || description.includes('anaphylaxis')) {
      return MedicalEmergencyType.ALLERGIC_REACTION;
    } else if (description.includes('diabetic') || description.includes('insulin') || description.includes('sugar')) {
      return MedicalEmergencyType.DIABETIC_EMERGENCY;
    } else if (description.includes('pregnant') || description.includes('labour') || description.includes('birth')) {
      return MedicalEmergencyType.PREGNANCY;
    } else if (description.includes('child') || description.includes('infant') || description.includes('baby')) {
      return MedicalEmergencyType.PEDIATRIC;
    } else if (description.includes('elderly') || description.includes('aged') || description.includes('senior')) {
      return MedicalEmergencyType.GERIATRIC;
    } else if (description.includes('overdose') || description.includes('poison')) {
      return MedicalEmergencyType.OVERDOSE;
    }
    
    return MedicalEmergencyType.OTHER;
  }

  private determineResponseCode(emergency: EmergencyReport): ResponseCode {
    const priority = emergency.priority;
    const type = this.classifyMedicalEmergency(emergency);

    if (priority === EmergencyPriority.CRITICAL) {
      return ResponseCode.CODE_RED;
    } else if (type === MedicalEmergencyType.CARDIAC_ARREST || 
               type === MedicalEmergencyType.STROKE ||
               type === MedicalEmergencyType.TRAUMA) {
      return ResponseCode.CODE_RED;
    } else if (priority === EmergencyPriority.HIGH) {
      return ResponseCode.CODE_YELLOW;
    } else if (priority === EmergencyPriority.MEDIUM) {
      return ResponseCode.CODE_GREEN;
    } else if (emergency.description?.toLowerCase().includes('multiple') || 
               emergency.description?.toLowerCase().includes('mass')) {
      return ResponseCode.CODE_BLACK;
    }

    return ResponseCode.CODE_GREEN;
  }

  private needsALS(emergency: EmergencyReport): boolean {
    const criticalTypes = [
      MedicalEmergencyType.CARDIAC_ARREST,
      MedicalEmergencyType.STROKE,
      MedicalEmergencyType.TRAUMA,
      MedicalEmergencyType.BREATHING_DIFFICULTY,
      MedicalEmergencyType.CHEST_PAIN
    ];
    
    const type = this.classifyMedicalEmergency(emergency);
    return criticalTypes.includes(type) || emergency.priority === EmergencyPriority.CRITICAL;
  }

  private needsBLS(emergency: EmergencyReport): boolean {
    return !this.needsALS(emergency);
  }

  private findNearestHospital(emergency: EmergencyReport): any {
    // Mock hospital data - in production, query actual hospitals
    const hospitals = [
      { name: 'City General Hospital', lat: 40.7128, lng: -74.0060, traumaCenter: true, distance: 3.2 },
      { name: 'St. Mary\'s Medical', lat: 40.7589, lng: -73.9851, traumaCenter: false, distance: 4.5 },
      { name: 'University Hospital', lat: 40.6782, lng: -73.9442, traumaCenter: true, distance: 5.1 }
    ];

    // Sort by distance
    return hospitals.sort((a, b) => a.distance - b.distance)[0];
  }

  private estimateTransportTime(emergency: EmergencyReport): number {
    const hospital = this.findNearestHospital(emergency);
    // Rough estimate: 2 minutes per km
    return Math.round(hospital.distance * 2 * 10) / 10;
  }

  private determineRequiredCrew(emergency: EmergencyReport): any {
    const needsALS = this.needsALS(emergency);
    
    return {
      alsRequired: needsALS,
      blsRequired: !needsALS,
      crewCount: needsALS ? 2 : 1,
      specialEquipment: this.getSpecialEquipment(emergency)
    };
  }

  private getSpecialEquipment(emergency: EmergencyReport): string[] {
    const equipment: string[] = [];
    const type = this.classifyMedicalEmergency(emergency);

    if (type === MedicalEmergencyType.CARDIAC_ARREST) {
      equipment.push('defibrillator');
      equipment.push('cpr_device');
    } else if (type === MedicalEmergencyType.BREATHING_DIFFICULTY) {
      equipment.push('ventilator');
      equipment.push('oxygen');
    } else if (type === MedicalEmergencyType.TRAUMA) {
      equipment.push('spinal_board');
      equipment.push('bleeding_control');
    } else if (type === MedicalEmergencyType.PREGNANCY) {
      equipment.push('obstetric_kit');
    }

    return equipment;
  }

  private calculateDispatchTime(assignment: any): number {
    if (!assignment.acknowledgedAt) return 0;
    return (assignment.acknowledgedAt.getTime() - assignment.assignedAt.getTime()) / (1000 * 60);
  }

  private calculateTravelTime(assignment: any): number {
    if (!assignment.enRouteAt || !assignment.onSceneAt) return 0;
    return (assignment.onSceneAt.getTime() - assignment.enRouteAt.getTime()) / (1000 * 60);
  }

  private calculateOnSceneTime(assignment: any): number {
    if (!assignment.onSceneAt || !assignment.completedAt) return 0;
    return (assignment.completedAt.getTime() - assignment.onSceneAt.getTime()) / (1000 * 60);
  }

  private calculateTransportTime(assignment: any): number {
    // Simplified - in reality, would have separate transport tracking
    return this.calculateOnSceneTime(assignment) * 0.5; // Assume 50% of on-scene time is transport
  }

  private calculateTotalResponseTime(assignment: any): number {
    return this.calculateDispatchTime(assignment) + 
           this.calculateTravelTime(assignment) + 
           this.calculateOnSceneTime(assignment);
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((a, b) => a + b, 0);
    return Math.round((sum / numbers.length) * 10) / 10;
  }

  private groupResponseTimesByPriority(responseTimes: ResponseTimeData[]): any {
    interface PriorityGroup {
        count: number;
        totalTime: number;
        times: number[];
        average?: number;  // Add average as optional property
    }

    const groups: Record<string, PriorityGroup> = {};
    
    responseTimes.forEach(rt => {
        const priority = rt.priority;
        if (!groups[priority]) {
        groups[priority] = { count: 0, totalTime: 0, times: [] };
        }
        groups[priority].count++;
        groups[priority].totalTime += rt.totalResponseTime;
        groups[priority].times.push(rt.totalResponseTime);
    });

    Object.keys(groups).forEach(key => {
        groups[key].average = groups[key].totalTime / groups[key].count;
    });

    return groups;
    }

  private groupResponseTimesByCode(responseTimes: ResponseTimeData[]): any {
    const groups: Record<string, { count: number; totalTime: number; average?: number }> = {};
    
    responseTimes.forEach(rt => {
      const code = rt.code;
      if (!groups[code]) {
        groups[code] = { count: 0, totalTime: 0 };
      }
      groups[code].count++;
      groups[code].totalTime += rt.totalResponseTime;
    });

    Object.keys(groups).forEach(key => {
      groups[key].average = groups[key].totalTime / groups[key].count;
    });

    return groups;
  }

  private groupResponseTimesByHour(responseTimes: ResponseTimeData[]): any[] {
    const hourlyData = Array(24).fill(0).map(() => ({ count: 0, totalTime: 0 }));
    
    responseTimes.forEach(rt => {
      // This would use actual timestamp
      const hour = Math.floor(Math.random() * 24);
      hourlyData[hour].count++;
      hourlyData[hour].totalTime += rt.totalResponseTime;
    });

    return hourlyData.map((data, hour) => ({
      hour,
      average: data.count ? data.totalTime / data.count : 0,
      count: data.count
    }));
  }

  private compareToBenchmarks(responseTimes: ResponseTimeData[]): any {
    const benchmarks: Record<ResponseCode, number> = {
      [ResponseCode.CODE_RED]: 8, // minutes
      [ResponseCode.CODE_YELLOW]: 15,
      [ResponseCode.CODE_GREEN]: 30,
      [ResponseCode.CODE_BLACK]: 5 // Mass casualty - different benchmark
    };

    const comparison: Record<string, { actual: number; benchmark: number; variance: number; withinBenchmark: boolean }> = {};
    
    for (const [code, benchmark] of Object.entries(benchmarks)) {
      const codeTimes = responseTimes.filter(rt => rt.code === code);
      if (codeTimes.length > 0) {
        const avgTime = codeTimes.reduce((sum, rt) => sum + rt.totalResponseTime, 0) / codeTimes.length;
        comparison[code] = {
          actual: avgTime,
          benchmark,
          variance: avgTime - benchmark,
          withinBenchmark: avgTime <= benchmark
        };
      }
    }

    return comparison;
  }

  private calculateReadinessScore(station: Station, activeAssignments: number, onDutyStaff: number): number {
    const vehicleScore = ((station.operationalCapacity?.availableVehicles || 0) / (station.operationalCapacity?.totalVehicles || 1)) * 40;
    const staffScore = (onDutyStaff / (station.operationalCapacity?.totalStaff || 1)) * 30;
    const capacityScore = (1 - (activeAssignments / (station.operationalCapacity?.maxConcurrentIncidents || 1))) * 30;
    
    return Math.round(vehicleScore + staffScore + capacityScore);
  }

  private calculateOverallSurvivalRate(outcomes: any): number {
    const totalPatients = 
      outcomes.cardiacArrest.total +
      outcomes.stroke.total +
      outcomes.trauma.total +
      outcomes.respiratory.total;

    const totalSurvived = 
      outcomes.cardiacArrest.survival +
      outcomes.stroke.recovery +
      outcomes.trauma.stable +
      outcomes.respiratory.improved;

    return totalPatients ? (totalSurvived / totalPatients) * 100 : 0;
  }

  private async getQualityMetrics(assignments: any[]): Promise<any> {
    return {
      clinicalAuditScore: 94,
      documentationCompliance: 98,
      equipmentChecksCompleted: 100,
      continuingEducationHours: 120,
      lastAuditDate: new Date()
    };
  }

  async getHandoverTimes(stationId?: string, days: number = 30): Promise<any> {
    const handovers: HandoverData[] = [];
    const now = new Date();

    for (let i = 0; i < 50; i++) {
      handovers.push({
        date: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
        hospital: 'City General Hospital',
        handoverMinutes: Math.floor(Math.random() * 20) + 5,
        delayReason: Math.random() > 0.7 ? 'ED busy' : null
      });
    }

    const avgHandover = handovers.reduce((sum, h) => sum + h.handoverMinutes, 0) / handovers.length;

    return {
      averageHandoverMinutes: Math.round(avgHandover * 10) / 10,
      byHospital: this.groupHandoversByHospital(handovers),
      delayedHandovers: handovers.filter(h => h.handoverMinutes > 15).length,
      trend: this.getHandoverTrend(handovers)
    };
  }

  private groupHandoversByHospital(handovers: HandoverData[]): any {
    const groups: Record<string, { total: number; sum: number; average?: number }> = {};
    
    handovers.forEach(h => {
      if (!groups[h.hospital]) {
        groups[h.hospital] = { total: 0, sum: 0 };
      }
      groups[h.hospital].total++;
      groups[h.hospital].sum += h.handoverMinutes;
    });

    Object.keys(groups).forEach(hospital => {
      groups[hospital].average = groups[hospital].sum / groups[hospital].total;
    });

    return groups;
  }

  private getHandoverTrend(handovers: HandoverData[]): any[] {
    return handovers.slice(0, 7).map(h => ({
      date: h.date.toISOString().split('T')[0],
      handoverMinutes: h.handoverMinutes
    }));
  }

  private getRecentPerformance(member: any): any {
    return {
      lastShift: '2024-01-15',
      incidentsHandled: 4,
      avgResponseTime: 8.5,
      commendations: 1
    };
  }
}