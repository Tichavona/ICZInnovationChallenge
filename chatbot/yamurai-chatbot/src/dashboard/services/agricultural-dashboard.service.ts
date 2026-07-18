/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, MoreThan, LessThan, Raw } from 'typeorm';
import { UnifiedDashboardService } from './base-dashboard.service';
import { 
  CropDiseaseReport, 
  FarmDisasterReport, 
  AgriculturalAdvisory,
  FarmType,  // Keep this if used elsewhere, otherwise remove
  CropType 
} from '../../database/farmer.entity';
import { 
  AgriculturalIncident, 
  AgriculturalIncidentType,
  AgriculturalSeverity,
  AgriculturalStatus,
  AdvisoryType,
  CropDiseaseIncident,
  FarmDisasterIncident 
} from '../interfaces/agricultural.types';
import { FarmerProfile } from '../../database/farmer.entity';
import { EmergencyReport } from '../../database/emergency-report.entity';
import { IssueReport } from '../../database/issue-report.entity';
import { Station } from '../../database/station.entity';
import { IncidentAssignment } from '../../database/incident-assignment.entity';
import { SLAConfig } from '../../database/sla-config.entity';
import { DepartmentStaff, Department } from '../../database/department.entity';
import { GeoDistanceUtil } from '../../shared/utils/geo-distance.util';
import { SLACalculatorUtil } from '../../shared/utils/sla-calculator.util';
import { DashboardUser, DashboardNotification } from '../../database/dashboard.entity';
import { NotificationGateway } from '../notifications/notification.gateway';

@Injectable()
export class AgriculturalDashboardService extends UnifiedDashboardService {
  protected readonly logger = new Logger(AgriculturalDashboardService.name);

  constructor(
    @InjectRepository(CropDiseaseReport)
    private cropDiseaseRepo: Repository<CropDiseaseReport>,
    @InjectRepository(FarmDisasterReport)
    private farmDisasterRepo: Repository<FarmDisasterReport>,
    @InjectRepository(AgriculturalAdvisory)
    private advisoryRepo: Repository<AgriculturalAdvisory>,
    @InjectRepository(FarmerProfile)
    private farmerRepo: Repository<FarmerProfile>,
    @InjectRepository(EmergencyReport)
    protected emergencyRepo: Repository<EmergencyReport>,
    @InjectRepository(IssueReport)
    protected issueRepo: Repository<IssueReport>,
    @InjectRepository(Station)
    protected stationRepo: Repository<Station>,
    @InjectRepository(IncidentAssignment)
    protected assignmentRepo: Repository<IncidentAssignment>,
    @InjectRepository(DepartmentStaff)
    protected staffRepo: Repository<DepartmentStaff>,
    @InjectRepository(Department)
    protected departmentRepo: Repository<Department>,
    @InjectRepository(DashboardUser)
    protected dashboardUserRepo: Repository<DashboardUser>,
    @InjectRepository(SLAConfig)
    protected slaConfigRepo: Repository<SLAConfig>,
    @InjectRepository(DashboardNotification)
    protected notificationRepo: Repository<DashboardNotification>,
    protected geoUtil: GeoDistanceUtil,
    protected slaUtil: SLACalculatorUtil,
    protected notificationGateway: NotificationGateway,
  ) {
    super(
      emergencyRepo,
      issueRepo,
      assignmentRepo,
      departmentRepo,
      stationRepo,
      staffRepo,
      dashboardUserRepo,
      slaConfigRepo,
      notificationRepo,
      notificationGateway
    );
  }

  /**
   * Get all agricultural incidents (crop diseases, farm disasters)
   */
  async getAgriculturalIncidents(filters: {
    type?: AgriculturalIncidentType | string;
    severity?: AgriculturalSeverity | string;
    status?: AgriculturalStatus | string;
    cropType?: CropType | string;
    region?: string;
    district?: string;
    farmerId?: number;
    timeframe?: '24h' | '7d' | '30d' | '90d' | 'year';
    startDate?: Date;
    endDate?: Date;
  }): Promise<AgriculturalIncident[]> {
    const timeframeMap = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      'year': 365 * 24 * 60 * 60 * 1000
    };

    // Get crop disease reports
    const cropDiseaseQuery = this.cropDiseaseRepo
      .createQueryBuilder('cropDisease')
      .leftJoinAndSelect('cropDisease.user', 'user')
      .leftJoinAndSelect('user.farmerProfile', 'farmerProfile');

    if (filters.timeframe) {
      const since = new Date(Date.now() - timeframeMap[filters.timeframe]);
      cropDiseaseQuery.andWhere('cropDisease.createdAt >= :since', { since });
    } else if (filters.startDate && filters.endDate) {
      cropDiseaseQuery.andWhere('cropDisease.createdAt BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }

    if (filters.cropType) {
      cropDiseaseQuery.andWhere('cropDisease.cropType = :cropType', { 
        cropType: filters.cropType 
      });
    }

    if (filters.severity) {
      cropDiseaseQuery.andWhere('cropDisease.severity = :severity', { 
        severity: filters.severity 
      });
    }

    if (filters.status) {
      cropDiseaseQuery.andWhere('cropDisease.status = :status', { 
        status: filters.status 
      });
    }

    if (filters.farmerId) {
      cropDiseaseQuery.andWhere('user.id = :farmerId', { 
        farmerId: filters.farmerId 
      });
    }

    if (filters.region) {
      cropDiseaseQuery.andWhere('cropDisease.location LIKE :region', { 
        region: `%${filters.region}%` 
      });
    }

    const cropDiseases = await cropDiseaseQuery.getMany();

    // Get farm disaster reports
    const disasterQuery = this.farmDisasterRepo
      .createQueryBuilder('disaster')
      .leftJoinAndSelect('disaster.user', 'user')
      .leftJoinAndSelect('user.farmerProfile', 'farmerProfile');

    if (filters.timeframe) {
      const since = new Date(Date.now() - timeframeMap[filters.timeframe]);
      disasterQuery.andWhere('disaster.createdAt >= :since', { since });
    } else if (filters.startDate && filters.endDate) {
      disasterQuery.andWhere('disaster.createdAt BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate
      });
    }

    if (filters.type) {
      disasterQuery.andWhere('disaster.disasterType = :type', { 
        type: filters.type 
      });
    }

    if (filters.severity) {
      disasterQuery.andWhere('disaster.severity = :severity', { 
        severity: filters.severity 
      });
    }

    if (filters.status) {
      disasterQuery.andWhere('disaster.status = :status', { 
        status: filters.status 
      });
    }

    if (filters.region) {
      disasterQuery.andWhere('disaster.location LIKE :region', { 
        region: `%${filters.region}%` 
      });
    }

    const disasters = await disasterQuery.getMany();

    // Combine and sort by date with proper typing
    const allIncidents: AgriculturalIncident[] = [
      ...cropDiseases.map(d => ({
        id: d.id,
        incidentType: 'crop_disease' as const,
        user: d.user,
        cropType: d.cropType,
        diseaseName: d.diseaseName,
        symptoms: d.symptoms,
        affectedArea: d.affectedArea || 0,
        severity: d.severity || 'medium',
        status: d.status,
        location: d.location || '',
        latitude: d.latitude || 0,
        longitude: d.longitude || 0,
        imageUrl: d.imageUrl || '',
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        originalData: d
      })),
      ...disasters.map(d => ({
        id: d.id,
        incidentType: 'farm_disaster' as const,
        user: d.user,
        disasterType: d.disasterType,
        description: d.description,
        estimatedLoss: d.estimatedLoss || 0,
        needsAssistance: d.needsAssistance || false,
        assistanceType: d.assistanceType || '',
        severity: d.severity || 'medium',
        status: d.status,
        location: d.location,
        latitude: d.latitude || 0,
        longitude: d.longitude || 0,
        imageUrl: d.imageUrl || '',
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        originalData: d
      }))
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Enrich with additional data
    const enrichedIncidents = await Promise.all(
      allIncidents.map(async incident => {
        const farmer = await this.farmerRepo.findOne({
          where: { user: { id: incident.user?.id } },
          relations: ['user']
        });

        // Base properties common to all incidents
        const baseProps = {
          id: incident.id,
          type: incident.incidentType,
          description: this.getIncidentDescription(incident),
          severity: incident.severity,
          status: incident.status,
          location: incident.location,
          latitude: incident.latitude,
          longitude: incident.longitude,
          farmerName: farmer?.farmName || incident.user?.name || 'Unknown',
          farmerContact: incident.user?.phone,
          farmType: farmer?.farmType,
          farmSize: farmer?.farmSize,
          imageUrl: incident.imageUrl,
          createdAt: incident.createdAt,
          updatedAt: incident.updatedAt,
          daysOpen: Math.floor((Date.now() - incident.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        };

        // Add type-specific properties
        if (incident.incidentType === 'crop_disease') {
          return {
            ...baseProps,
            subType: incident.diseaseName,
            cropType: incident.cropType,
            affectedArea: incident.affectedArea
          };
        } else {
          return {
            ...baseProps,
            subType: incident.disasterType,
            estimatedLoss: incident.estimatedLoss,
            needsAssistance: incident.needsAssistance,
            assistanceType: incident.assistanceType
          };
        }
      })
    );

    return enrichedIncidents as any;
  }

  private getIncidentDescription(incident: AgriculturalIncident): string {
    if (incident.incidentType === 'crop_disease') {
      return incident.symptoms || `Disease: ${incident.diseaseName}`;
    } else {
      return incident.description || `Disaster: ${incident.disasterType}`;
    }
  }

  /**
   * Get disease/pest outbreak heatmap data
   */
  async getOutbreakHeatmap(filters: {
    cropType?: CropType;
    diseaseName?: string;
    region?: string;
    days?: number;
    minSeverity?: AgriculturalSeverity;
  }): Promise<any[]> {
    const days = filters.days || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const queryBuilder = this.cropDiseaseRepo
      .createQueryBuilder('disease')
      .where('disease.createdAt >= :since', { since });

    if (filters.cropType) {
      queryBuilder.andWhere('disease.cropType = :cropType', { 
        cropType: filters.cropType 
      });
    }

    if (filters.diseaseName) {
      queryBuilder.andWhere('disease.diseaseName LIKE :diseaseName', { 
        diseaseName: `%${filters.diseaseName}%` 
      });
    }

    const outbreaks = await queryBuilder.getMany();

    // Group by location for heatmap
    const heatmapData = outbreaks.reduce((acc: any, outbreak) => {
      const key = `${outbreak.latitude},${outbreak.longitude}`;
      if (!acc[key]) {
        acc[key] = {
          latitude: outbreak.latitude,
          longitude: outbreak.longitude,
          count: 0,
          diseases: {},
          severity: 'low',
          location: outbreak.location
        };
      }
      
      acc[key].count++;
      acc[key].diseases[outbreak.diseaseName] = 
        (acc[key].diseases[outbreak.diseaseName] || 0) + 1;
      
      // Update max severity for this location
      const severityLevel: Record<string, number> = {
        'low': 1,
        'medium': 2,
        'high': 3,
        'critical': 4,
        'epidemic': 5
      };
      const currentLevel = severityLevel[acc[key].severity] || 1;
      const newLevel = severityLevel[outbreak.severity] || 1;
      
      if (newLevel > currentLevel) {
        acc[key].severity = outbreak.severity;
      }
      
      return acc;
    }, {});

    return Object.values(heatmapData);
  }

  /**
   * Get disease spread prediction
   */
  async getDiseaseSpreadPrediction(diseaseName: string, region: string): Promise<any> {
    // Get recent outbreaks of this disease in the region
    const recentOutbreaks = await this.cropDiseaseRepo
      .createQueryBuilder('disease')
      .where('disease.diseaseName LIKE :diseaseName', { 
        diseaseName: `%${diseaseName}%` 
      })
      .andWhere('disease.location LIKE :region', { region: `%${region}%` })
      .andWhere('disease.createdAt >= :since', { 
        since: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // Last 60 days
      })
      .orderBy('disease.createdAt', 'DESC')
      .getMany();

    if (recentOutbreaks.length === 0) {
      return {
        diseaseName,
        region,
        prediction: 'No recent data available',
        riskLevel: 'low'
      };
    }

    // Calculate spread rate
    const outbreaksByWeek = this.groupByWeek(recentOutbreaks);
    const spreadRate = this.calculateSpreadRate(outbreaksByWeek);

    // Get weather data that might affect spread (simplified)
    const favorableConditions = this.checkFavorableConditions(region);

    // Identify at-risk areas
    const atRiskAreas = await this.identifyAtRiskAreas(diseaseName, region, recentOutbreaks);

    return {
      diseaseName,
      region,
      currentOutbreaks: recentOutbreaks.length,
      spreadRate: `${spreadRate > 0 ? '+' : ''}${spreadRate}% per week`,
      riskLevel: spreadRate > 50 ? 'critical' : spreadRate > 20 ? 'high' : spreadRate > 5 ? 'medium' : 'low',
      favorableConditions,
      atRiskAreas,
      recommendedActions: this.generateRecommendedActions(spreadRate, favorableConditions),
      lastUpdated: new Date()
    };
  }

  /**
   * Get agricultural advisories
   */
  async getAdvisories(filters: {
    type?: AdvisoryType;
    targetCrop?: string;
    region?: string;
    season?: string;
    priority?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<any[]> {
    const queryBuilder = this.advisoryRepo
      .createQueryBuilder('advisory')
      .orderBy('advisory.priority', 'DESC')
      .addOrderBy('advisory.createdAt', 'DESC');

    if (filters.targetCrop) {
      queryBuilder.andWhere('advisory.targetCrop = :targetCrop', {
        targetCrop: filters.targetCrop
      });
    }

    if (filters.region) {
      queryBuilder.andWhere('advisory.region = :region', {
        region: filters.region
      });
    }

    if (filters.season) {
      queryBuilder.andWhere('advisory.season = :season', {
        season: filters.season
      });
    }

    if (filters.priority) {
      queryBuilder.andWhere('advisory.priority = :priority', {
        priority: filters.priority
      });
    }

    if (filters.isActive !== undefined) {
      const now = new Date();
      if (filters.isActive) {
        queryBuilder.andWhere('advisory.isActive = :isActive', { isActive: true })
          .andWhere('(advisory.validFrom IS NULL OR advisory.validFrom <= :now)', { now })
          .andWhere('(advisory.validTo IS NULL OR advisory.validTo >= :now)', { now });
      }
    }

    if (filters.limit) {
      queryBuilder.limit(filters.limit);
    }

    const advisories = await queryBuilder.getMany();

    // Enrich with metadata
    return advisories.map(advisory => ({
      ...advisory,
      isExpired: advisory.validTo && advisory.validTo < new Date(),
      daysUntilExpiry: advisory.validTo ? 
        Math.ceil((advisory.validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
    }));
  }

  /**
   * Get farmer statistics
   */
  async getFarmerStatistics(region?: string, district?: string): Promise<any> {
    const queryBuilder = this.farmerRepo
      .createQueryBuilder('farmer')
      .leftJoinAndSelect('farmer.user', 'user');

    if (region) {
      queryBuilder.andWhere('farmer.location LIKE :region', { region: `%${region}%` });
    }

    const farmers = await queryBuilder.getMany();

    // Get crop disease stats for these farmers
    const farmerIds = farmers.map(f => f.user.id);
    
    const diseaseStats = await this.cropDiseaseRepo
      .createQueryBuilder('disease')
      .where('disease.userId IN (:...farmerIds)', { farmerIds })
      .getMany();

    const disasterStats = await this.farmDisasterRepo
      .createQueryBuilder('disaster')
      .where('disaster.userId IN (:...farmerIds)', { farmerIds })
      .getMany();

    // Calculate statistics
    const farmTypeBreakdown = farmers.reduce((acc: Record<string, number>, farmer) => {
      acc[farmer.farmType] = (acc[farmer.farmType] || 0) + 1;
      return acc;
    }, {});

    const totalFarmSize = farmers.reduce((sum, f) => sum + (f.farmSize || 0), 0);
    const avgFarmSize = farmers.length ? totalFarmSize / farmers.length : 0;

    const farmersWithIssues = new Set<number>();
    diseaseStats.forEach(d => farmersWithIssues.add((d as any).userId));
    disasterStats.forEach(d => farmersWithIssues.add((d as any).userId));

    return {
      totalFarmers: farmers.length,
      registeredFarmers: farmers.filter(f => f.user.isActive).length,
      totalFarmSize: Math.round(totalFarmSize * 100) / 100,
      averageFarmSize: Math.round(avgFarmSize * 100) / 100,
      farmTypeBreakdown,
      farmersWithActiveIssues: farmersWithIssues.size,
      percentageAffected: farmers.length ? 
        Math.round((farmersWithIssues.size / farmers.length) * 100) : 0,
      topCrops: this.getTopCrops(farmers),
      recentActivity: {
        last7Days: diseaseStats.filter(d => 
          d.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        last30Days: diseaseStats.filter(d => 
          d.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length
      }
    };
  }

  /**
   * Get crop health overview
   */
  async getCropHealthOverview(region?: string, cropType?: CropType): Promise<any> {
    const queryBuilder = this.cropDiseaseRepo
      .createQueryBuilder('disease')
      .leftJoinAndSelect('disease.user', 'user')
      .leftJoinAndSelect('user.farmerProfile', 'farmer');

    if (region) {
      queryBuilder.andWhere('disease.location LIKE :region', { region: `%${region}%` });
    }

    if (cropType) {
      queryBuilder.andWhere('disease.cropType = :cropType', { cropType });
    }

    const diseases = await queryBuilder.getMany();

    // Group by crop type
    const cropHealth: Record<string, any> = {};
    
    diseases.forEach(disease => {
      if (!cropHealth[disease.cropType]) {
        cropHealth[disease.cropType] = {
          totalReports: 0,
          bySeverity: { low: 0, medium: 0, high: 0, critical: 0, epidemic: 0 },
          byDisease: {},
          affectedArea: 0,
          farmers: new Set()
        };
      }
      
      const stats = cropHealth[disease.cropType];
      stats.totalReports++;
      stats.bySeverity[disease.severity] = (stats.bySeverity[disease.severity] || 0) + 1;
      stats.byDisease[disease.diseaseName] = (stats.byDisease[disease.diseaseName] || 0) + 1;
      stats.affectedArea += disease.affectedArea || 0;
      stats.farmers.add(disease.user?.id);
    });

    // Calculate health score (0-100)
    Object.keys(cropHealth).forEach(crop => {
      const stats = cropHealth[crop];
      const severityScore = (
        (stats.bySeverity.low * 0.2) +
        (stats.bySeverity.medium * 0.4) +
        (stats.bySeverity.high * 0.6) +
        (stats.bySeverity.critical * 0.8) +
        (stats.bySeverity.epidemic * 1.0)
      ) / stats.totalReports;
      
      stats.healthScore = Math.round(100 - (severityScore * 100));
      stats.farmerCount = stats.farmers.size;
      const topDisease = Object.entries(stats.byDisease)
        .sort((a: any, b: any) => b[1] - a[1])[0];
      stats.topDisease = topDisease ? topDisease[0] : null;
      
      delete stats.farmers; // Remove Set from response
    });

    return cropHealth;
  }

  /**
   * Get resource needs and assistance requests
   */
  async getResourceNeeds(region?: string, status?: string): Promise<any> {
    const queryBuilder = this.farmDisasterRepo
      .createQueryBuilder('disaster')
      .leftJoinAndSelect('disaster.user', 'user')
      .leftJoinAndSelect('user.farmerProfile', 'farmer')
      .where('disaster.needsAssistance = :needsAssistance', { needsAssistance: true });

    if (region) {
      queryBuilder.andWhere('disaster.location LIKE :region', { region: `%${region}%` });
    }

    if (status) {
      queryBuilder.andWhere('disaster.status = :status', { status });
    }

    const needs = await queryBuilder.getMany();

    // Group by assistance type
    const assistanceNeeds: Record<string, any> = {
      financial: { count: 0, totalEstimatedLoss: 0, farmers: [] },
      inputs: { count: 0, farmers: [] },
      technical: { count: 0, farmers: [] },
      emergency: { count: 0, farmers: [] }
    };

    needs.forEach(need => {
      if (need.assistanceType) {
        const types = need.assistanceType.split(',').map(t => t.trim());
        types.forEach(type => {
          if (assistanceNeeds[type]) {
            assistanceNeeds[type].count++;
            assistanceNeeds[type].farmers.push({
              farmerId: need.user?.id,
              farmName: need.user?.farmerProfile?.farmName,
              location: need.location,
              disasterType: need.disasterType,
              estimatedLoss: need.estimatedLoss,
              status: need.status
            });
            
            if (type === 'financial') {
              assistanceNeeds[type].totalEstimatedLoss += need.estimatedLoss || 0;
            }
          }
        });
      }
    });

    return {
      totalRequests: needs.length,
      byAssistanceType: assistanceNeeds,
      urgentRequests: needs.filter(n => 
        n.status === 'reported' && n.createdAt > new Date(Date.now() - 48 * 60 * 60 * 1000)
      ).length,
      lastUpdated: new Date()
    };
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(
    region?: string,
    timeframe?: '24h' | '7d' | '30d' | '90d' | 'year'
  ): Promise<any> {
    const timeframeMap = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      'year': 365
    };

    const days = timeframe ? timeframeMap[timeframe] : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get incidents
    const incidents = await this.getAgriculturalIncidents({
      timeframe,
      region
    });

    // Get advisories
    const activeAdvisories = await this.advisoryRepo.count({
      where: {
        isActive: true,
        validFrom: LessThan(new Date()),
        validTo: MoreThan(new Date())
      }
    });

    // Get farmer statistics
    const farmerStats = await this.getFarmerStatistics(region);

    // Calculate outbreak trends
    const outbreaksByDay = await this.getOutbreakTrend(days, region);

    // Get resource needs
    const resourceNeeds = await this.getResourceNeeds(region);

    // Calculate severity distribution
    const severityDistribution = {
      low: incidents.filter((i: any) => i.severity === 'low').length,
      medium: incidents.filter((i: any) => i.severity === 'medium').length,
      high: incidents.filter((i: any) => i.severity === 'high').length,
      critical: incidents.filter((i: any) => i.severity === 'critical').length,
      epidemic: incidents.filter((i: any) => i.severity === 'epidemic').length
    };

    // Get top diseases
    const topDiseases = await this.getTopDiseases(region, days);

    return {
      summary: {
        totalIncidents: incidents.length,
        activeIncidents: incidents.filter((i: any) => 
          !['resolved', 'contained'].includes(i.status)
        ).length,
        farmersAffected: new Set(incidents.map((i: any) => i.farmerName)).size,
        totalFarmers: farmerStats.totalFarmers,
        activeAdvisories,
        resourceRequests: resourceNeeds.totalRequests
      },
      incidents: {
        byType: this.groupByType(incidents),
        bySeverity: severityDistribution,
        byStatus: this.groupByStatus(incidents),
        byCrop: this.groupByCrop(incidents)
      },
      trends: {
        daily: outbreaksByDay,
        weekly: this.calculateWeeklyTrend(incidents, days)
      },
      resources: resourceNeeds,
      topDiseases: topDiseases.slice(0, 5),
      healthScore: await this.calculateOverallHealthScore(region),
      alerts: await this.generateAlerts(region),
      lastUpdated: new Date()
    };
  }

  // Helper methods

  private calculateSeverity(incident: any): string {
    if (incident.severity) return incident.severity;
    
    // Calculate based on affected area or other factors
    if (incident.affectedArea) {
      if (incident.affectedArea > 100) return 'critical';
      if (incident.affectedArea > 50) return 'high';
      if (incident.affectedArea > 10) return 'medium';
    }
    
    return 'low';
  }

  private groupByWeek(outbreaks: any[]): any[] {
    const weekMap = new Map();

    outbreaks.forEach(outbreak => {
      const date = new Date(outbreak.createdAt);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          week: weekKey,
          count: 0,
          outbreaks: []
        });
      }
      
      const weekData = weekMap.get(weekKey);
      weekData.count++;
      weekData.outbreaks.push(outbreak);
    });

    return Array.from(weekMap.values()).sort((a: any, b: any) => a.week.localeCompare(b.week));
  }

  private calculateSpreadRate(weeks: any[]): number {
    if (weeks.length < 2) return 0;
    
    const lastWeek = weeks[weeks.length - 1].count;
    const prevWeek = weeks[weeks.length - 2].count;
    
    if (prevWeek === 0) return lastWeek > 0 ? 100 : 0;
    
    return Math.round(((lastWeek - prevWeek) / prevWeek) * 100);
  }

  private checkFavorableConditions(region: string): any {
    // This would integrate with weather API
    // Simplified implementation
    return {
      temperature: 'optimal for spread',
      humidity: 'high',
      rainfall: 'moderate',
      riskFactor: 'medium'
    };
  }

  private async identifyAtRiskAreas(
    diseaseName: string, 
    region: string, 
    recentOutbreaks: any[]
  ): Promise<any[]> {
    // Get all farms in the region
    const farms = await this.farmerRepo
      .createQueryBuilder('farmer')
      .leftJoinAndSelect('farmer.user', 'user')
      .where('farmer.location LIKE :region', { region: `%${region}%` })
      .getMany();

    // Calculate risk for each farm based on proximity to outbreaks
    const atRiskAreas = farms.map(farm => {
      let riskLevel = 'low';
      let nearestDistance = Infinity;

      recentOutbreaks.forEach(outbreak => {
        if (outbreak.latitude && outbreak.longitude && farm.latitude && farm.longitude) {
          const distance = this.calculateDistance(
            farm.latitude,
            farm.longitude,
            outbreak.latitude,
            outbreak.longitude
          );

          if (distance < nearestDistance) {
            nearestDistance = distance;
          }
        }
      });

      if (nearestDistance < 5) riskLevel = 'critical';
      else if (nearestDistance < 10) riskLevel = 'high';
      else if (nearestDistance < 20) riskLevel = 'medium';

      return {
        farmId: farm.id,
        farmName: farm.farmName,
        location: farm.location,
        latitude: farm.latitude,
        longitude: farm.longitude,
        riskLevel,
        nearestOutbreakDistance: nearestDistance < Infinity ? 
          Math.round(nearestDistance * 10) / 10 : null
      };
    });

    return atRiskAreas
      .filter(area => area.riskLevel !== 'low')
      .sort((a, b) => {
        const riskOrder: Record<string, number> = { critical: 3, high: 2, medium: 1 };
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private generateRecommendedActions(spreadRate: number, conditions: any): string[] {
    const actions: string[] = [];

    if (spreadRate > 50) {
      actions.push('IMMEDIATE: Implement quarantine measures');
      actions.push('URGENT: Deploy rapid response teams');
      actions.push('ALERT: Notify all farmers within 10km radius');
    } else if (spreadRate > 20) {
      actions.push('Increase monitoring frequency');
      actions.push('Distribute preventive treatments');
      actions.push('Conduct farmer education sessions');
    } else if (spreadRate > 5) {
      actions.push('Continue regular monitoring');
      actions.push('Update disease management guidelines');
    }

    if (conditions.humidity === 'high') {
      actions.push('Apply fungicides preventively');
      actions.push('Improve field ventilation');
    }

    return actions;
  }

  private getTopCrops(farmers: FarmerProfile[]): any[] {
    const cropCount: Record<string, number> = {};
    
    farmers.forEach(farmer => {
      if (farmer.crops) {
        const crops = farmer.crops.split(',').map(c => c.trim());
        crops.forEach(crop => {
          cropCount[crop] = (cropCount[crop] || 0) + 1;
        });
      }
    });

    return Object.entries(cropCount)
      .map(([crop, count]) => ({ crop, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);
  }

  private async getOutbreakTrend(days: number, region?: string): Promise<any[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const outbreaks = await this.cropDiseaseRepo
      .createQueryBuilder('disease')
      .where('disease.createdAt >= :since', { since })
      .getMany();

    const daily: Record<string, number> = {};
    
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      daily[dateStr] = 0;
    }

    outbreaks.forEach(outbreak => {
      const dateStr = outbreak.createdAt.toISOString().split('T')[0];
      if (daily[dateStr] !== undefined) {
        daily[dateStr]++;
      }
    });

    return Object.entries(daily)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private groupByType(incidents: any[]): Record<string, number> {
    const types: Record<string, number> = {};
    
    incidents.forEach(incident => {
      const type = incident.type;
      if (!types[type]) {
        types[type] = 0;
      }
      types[type]++;
    });

    return types;
  }

  private groupByStatus(incidents: any[]): Record<string, number> {
    const statuses: Record<string, number> = {};
    
    incidents.forEach(incident => {
      const status = incident.status;
      if (!statuses[status]) {
        statuses[status] = 0;
      }
      statuses[status]++;
    });

    return statuses;
  }

  private groupByCrop(incidents: any[]): Record<string, number> {
    const crops: Record<string, number> = {};
    
    incidents.forEach(incident => {
      if (incident.cropType) {
        if (!crops[incident.cropType]) {
          crops[incident.cropType] = 0;
        }
        crops[incident.cropType]++;
      }
    });

    return crops;
  }

  private calculateWeeklyTrend(incidents: any[], days: number): any[] {
    const weeks = Math.ceil(days / 7);
    const weekly: any[] = [];

    for (let i = 0; i < weeks; i++) {
      const endDate = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const count = incidents.filter(incident => {
        const date = new Date(incident.createdAt);
        return date >= startDate && date < endDate;
      }).length;

      weekly.push({
        week: `Week ${weeks - i}`,
        count,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
    }

    return weekly.reverse();
  }

  private async getTopDiseases(region?: string, days: number = 30): Promise<any[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const queryBuilder = this.cropDiseaseRepo
      .createQueryBuilder('disease')
      .select('disease.diseaseName', 'diseaseName')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(disease.affectedArea)', 'avgAffectedArea')
      .where('disease.createdAt >= :since', { since })
      .groupBy('disease.diseaseName')
      .orderBy('count', 'DESC');

    if (region) {
      queryBuilder.andWhere('disease.location LIKE :region', { region: `%${region}%` });
    }

    const results = await queryBuilder.getRawMany();

    return results.map(r => ({
      diseaseName: r.diseaseName,
      count: parseInt(r.count),
      avgAffectedArea: Math.round(r.avgAffectedArea * 10) / 10
    }));
  }

  private async calculateOverallHealthScore(region?: string): Promise<number> {
    const incidents = await this.getAgriculturalIncidents({ region, timeframe: '30d' });
    
    if (incidents.length === 0) return 100;

    const severityWeights: Record<string, number> = {
      'low': 0.2,
      'medium': 0.4,
      'high': 0.6,
      'critical': 0.8,
      'epidemic': 1.0
    };

    const totalWeight = incidents.reduce((sum, incident: any) => {
      return sum + (severityWeights[incident.severity] || 0.5);
    }, 0);

    const avgSeverity = totalWeight / incidents.length;
    const healthScore = 100 - (avgSeverity * 100);

    return Math.round(healthScore);
  }

  private async generateAlerts(region?: string): Promise<any[]> {
    const alerts: any[] = [];

    // Check for critical outbreaks
    const criticalOutbreaks = await this.cropDiseaseRepo
      .createQueryBuilder('disease')
      .where('disease.severity IN (:...severities)', { 
        severities: ['critical', 'epidemic'] 
      })
      .andWhere('disease.createdAt >= :since', { 
        since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
      })
      .getMany();

    if (criticalOutbreaks.length > 0) {
      alerts.push({
        type: 'critical_outbreak',
        severity: 'high',
        title: 'Critical Disease Outbreak Detected',
        description: `${criticalOutbreaks.length} critical disease outbreaks in the last 7 days`,
        count: criticalOutbreaks.length,
        timestamp: new Date()
      });
    }

    // Check for resource needs
    const urgentNeeds = await this.farmDisasterRepo
      .createQueryBuilder('disaster')
      .where('disaster.needsAssistance = :needsAssistance', { needsAssistance: true })
      .andWhere('disaster.status = :status', { status: 'reported' })
      .andWhere('disaster.createdAt >= :since', { 
        since: new Date(Date.now() - 48 * 60 * 60 * 1000) 
      })
      .getMany();

    if (urgentNeeds.length > 0) {
      alerts.push({
        type: 'resource_needs',
        severity: 'medium',
        title: 'Urgent Resource Requests',
        description: `${urgentNeeds.length} farmers requesting assistance in the last 48 hours`,
        count: urgentNeeds.length,
        timestamp: new Date()
      });
    }

    return alerts;
  }
}