/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
// src/whatsapp/services/report-consolidation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { EmergencyReport, EmergencyType, EmergencyPriority } from '../../database/emergency-report.entity';
import { IssueReport, IssueType } from '../../database/issue-report.entity';
import { ReportConsolidation, ConsolidationMatch } from '../../database/dashboard.entity';
import { DepartmentRoutingService } from './department-routing.service';
import { NlpService } from './nlp.service';

@Injectable()
export class ReportConsolidationService {
  private readonly logger = new Logger(ReportConsolidationService.name);
  
  // Consolidation thresholds
  private readonly DISTANCE_THRESHOLD = 100; // meters
  private readonly TIME_THRESHOLD = 30 * 60 * 1000; // 30 minutes
  private readonly SIMILARITY_THRESHOLD = 60; // percentage
  private readonly MIN_CONFIDENCE = 70; // percentage

  constructor(
    @InjectRepository(EmergencyReport)
    private emergencyRepository: Repository<EmergencyReport>,
    
    @InjectRepository(IssueReport)
    private issueRepository: Repository<IssueReport>,
    
    @InjectRepository(ReportConsolidation)
    private consolidationRepository: Repository<ReportConsolidation>,
    
    private readonly departmentRouting: DepartmentRoutingService,
    private readonly nlpService: NlpService,
  ) {}

  /**
   * Check if a new report should be consolidated with existing reports
   */
  async checkForConsolidation(
    reportType: 'EMERGENCY' | 'ISSUE',
    reportData: any
  ): Promise<ConsolidationMatch> {
    try {
      // Get potential matches based on time and location
      const potentialMatches = await this.getPotentialMatches(reportType, reportData);
      
      if (potentialMatches.length === 0) {
        return {
          isMatch: false,
          confidence: 0,
          matchReasons: ['No existing reports found in proximity']
        };
      }

      // Evaluate each potential match
      const matches: Array<ConsolidationMatch & { consolidation: ReportConsolidation }> = [];
      
      for (const consolidation of potentialMatches) {
        const matchResult = await this.evaluateMatch(reportType, reportData, consolidation);
        if (matchResult.confidence >= this.MIN_CONFIDENCE) {
          matches.push({ ...matchResult, consolidation });
        }
      }

      // Return the best match
      if (matches.length > 0) {
        const bestMatch = matches.sort((a, b) => b.confidence - a.confidence)[0];
        return {
          isMatch: true,
          consolidationId: bestMatch.consolidation.id,
          confidence: bestMatch.confidence,
          matchReasons: bestMatch.matchReasons,
          distance: bestMatch.distance,
          similarityScore: bestMatch.similarityScore
        };
      }

      return {
        isMatch: false,
        confidence: 0,
        matchReasons: ['No matches found above confidence threshold']
      };

    } catch (error) {
      this.logger.error('Error checking for consolidation:', error);
      return {
        isMatch: false,
        confidence: 0,
        matchReasons: ['Error processing consolidation check']
      };
    }
  }

  /**
   * Get potential matches based on time and location
   */
  private async getPotentialMatches(
    reportType: 'EMERGENCY' | 'ISSUE',
    reportData: any
  ): Promise<ReportConsolidation[]> {
    const timeThreshold = new Date(Date.now() - this.TIME_THRESHOLD);
    
    // Basic query for recent consolidations
    const queryBuilder = this.consolidationRepository
      .createQueryBuilder('consolidation')
      .where('consolidation.consolidationType = :type', { 
        type: reportType.toLowerCase() 
      })
      .andWhere('consolidation.createdAt >= :time', { time: timeThreshold })
      .andWhere('consolidation.status != :closed', { closed: 'closed' });

    // If we have coordinates, filter by distance
    if (reportData.latitude && reportData.longitude) {
      const earthRadius = 6371000; // meters
      
      // Haversine formula for distance calculation
      queryBuilder.andWhere(`
        (${earthRadius} * ACOS(
          COS(RADIANS(:lat)) * COS(RADIANS(consolidation.latitude)) *
          COS(RADIANS(consolidation.longitude) - RADIANS(:lng)) +
          SIN(RADIANS(:lat)) * SIN(RADIANS(consolidation.latitude))
        )) <= :distance
      `, {
        lat: reportData.latitude,
        lng: reportData.longitude,
        distance: this.DISTANCE_THRESHOLD
      });
    }

    return await queryBuilder
      .orderBy('consolidation.reportCount', 'DESC')
      .limit(10) // Use limit() instead of take()
      .getMany();
  }

  /**
   * Evaluate match between report and consolidation
   */
  private async evaluateMatch(
    reportType: 'EMERGENCY' | 'ISSUE',
    reportData: any,
    consolidation: ReportConsolidation
  ): Promise<ConsolidationMatch> {
    const matchReasons: string[] = [];
    let confidence = 0;
    let distance = 0;
    let similarityScore = 0;

    // 1. Check location proximity
    if (reportData.latitude && reportData.longitude) {
      distance = this.calculateDistance(
        reportData.latitude,
        reportData.longitude,
        consolidation.latitude,
        consolidation.longitude
      );

      if (distance <= this.DISTANCE_THRESHOLD) {
        const proximityScore = 100 * (1 - (distance / this.DISTANCE_THRESHOLD));
        confidence += proximityScore * 0.4; // 40% weight
        
        if (distance <= 50) {
          matchReasons.push(`Very close proximity (${Math.round(distance)}m)`);
        } else {
          matchReasons.push(`Close proximity (${Math.round(distance)}m)`);
        }
      }
    }

    // 2. Check location description similarity
    if (reportData.location && consolidation.location) {
      const locationSimilarity = this.calculateStringSimilarity(
        reportData.location.toLowerCase(),
        consolidation.location.toLowerCase()
      );

      if (locationSimilarity > 50) {
        similarityScore = locationSimilarity;
        confidence += locationSimilarity * 0.3; // 30% weight
        
        if (locationSimilarity > 80) {
          matchReasons.push(`Very similar location description (${Math.round(locationSimilarity)}% match)`);
        } else if (locationSimilarity > 60) {
          matchReasons.push(`Similar location description (${Math.round(locationSimilarity)}% match)`);
        }
      }
    }

    // 3. Check report type/description similarity
    if (reportData.description && consolidation.description) {
      const descriptionSimilarity = this.analyzeDescriptionSimilarity(
        reportData.description,
        consolidation.description
      );

      if (descriptionSimilarity > 40) {
        confidence += descriptionSimilarity * 0.2; // 20% weight
        
        if (descriptionSimilarity > 70) {
          matchReasons.push(`Very similar description (${Math.round(descriptionSimilarity)}% match)`);
        } else if (descriptionSimilarity > 50) {
          matchReasons.push(`Similar description (${Math.round(descriptionSimilarity)}% match)`);
        }
      }

      // Check for keywords
      const keywordMatch = this.checkKeywordMatch(reportData.description, consolidation.description);
      if (keywordMatch.matches > 0) {
        confidence += 10;
        matchReasons.push(`Shared keywords: ${keywordMatch.keywords.join(', ')}`);
      }
    }

    // 4. Check department overlap
    const departments = reportType === 'EMERGENCY'
      ? this.departmentRouting.routeEmergency(
          reportData.type as EmergencyType,
          reportData.priority as EmergencyPriority || EmergencyPriority.MEDIUM
        ).departments
      : this.departmentRouting.routeIssue(reportData.type as IssueType).departments;

    const departmentOverlap = this.calculateDepartmentOverlap(departments, consolidation.departments);
    if (departmentOverlap > 0) {
      confidence += departmentOverlap * 10; // Up to 10% weight
      matchReasons.push(`Shared departments: ${Math.round(departmentOverlap * 100)}% overlap`);
    }

    // 5. Check temporal proximity (bonus for very recent)
    const timeDiff = Date.now() - consolidation.createdAt.getTime();
    if (timeDiff < 5 * 60 * 1000) { // Within 5 minutes
      confidence += 5;
      matchReasons.push('Very recent report (within 5 minutes)');
    } else if (timeDiff < 15 * 60 * 1000) { // Within 15 minutes
      confidence += 3;
      matchReasons.push('Recent report (within 15 minutes)');
    }

    // Cap confidence at 100
    confidence = Math.min(confidence, 100);

    return {
      isMatch: confidence >= this.MIN_CONFIDENCE,
      confidence: Math.round(confidence),
      matchReasons,
      distance: Math.round(distance),
      similarityScore: Math.round(similarityScore)
    };
  }

  /**
   * Create or update consolidation - FIXED VERSION
   */
  async consolidateReport(
    reportType: 'EMERGENCY' | 'ISSUE',
    reportId: number,
    reportData: any,
    match?: ConsolidationMatch
  ): Promise<{
    consolidation: ReportConsolidation;
    isNew: boolean;
    matchDetails?: ConsolidationMatch;
  }> {
    try {
      let consolidation: ReportConsolidation;
      let isNew = false;

      if (match?.isMatch && match.consolidationId) {
        // Add to existing consolidation
        const existingConsolidation = await this.consolidationRepository.findOne({
          where: { id: match.consolidationId }
        });

        if (existingConsolidation) {
          consolidation = existingConsolidation;
          const departments = reportType === 'EMERGENCY'
            ? this.departmentRouting.routeEmergency(
                reportData.type as EmergencyType,
                reportData.priority as EmergencyPriority || EmergencyPriority.MEDIUM
              ).departments
            : this.departmentRouting.routeIssue(reportData.type as IssueType).departments;

          consolidation.addReport(reportId, reportData.reporterPhone || 'unknown', departments[0] || 'General');
          await this.consolidationRepository.save(consolidation);

          // Update the original report with consolidation reference
          await this.updateReportWithConsolidation(reportType, reportId, consolidation.id);
        } else {
          // If consolidation not found, create new one
          isNew = true;
          consolidation = await this.createNewConsolidation(reportType, reportId, reportData, match);
        }
      } else {
        // Create new consolidation
        isNew = true;
        consolidation = await this.createNewConsolidation(reportType, reportId, reportData, match);
      }

      return {
        consolidation,
        isNew,
        matchDetails: match
      };

    } catch (error) {
      this.logger.error('Error consolidating report:', error);
      throw error;
    }
  }

  /**
   * Helper method to create new consolidation
   */
  private async createNewConsolidation(
    reportType: 'EMERGENCY' | 'ISSUE',
    reportId: number,
    reportData: any,
    match?: ConsolidationMatch
  ): Promise<ReportConsolidation> {
    const departments = reportType === 'EMERGENCY'
      ? this.departmentRouting.routeEmergency(
          reportData.type as EmergencyType,
          reportData.priority as EmergencyPriority || EmergencyPriority.MEDIUM
        ).departments
      : this.departmentRouting.routeIssue(reportData.type as IssueType).departments;

    const consolidation = this.consolidationRepository.create({
      consolidationType: reportType.toLowerCase() as 'emergency' | 'issue',
      primaryDepartment: departments[0] || 'General',
      departmentsJson: JSON.stringify(departments),
      description: reportData.description || 'No description provided',
      location: reportData.location || 'Location not specified',
      latitude: reportData.latitude || 0,
      longitude: reportData.longitude || 0,
      status: 'active',
      reportCount: 1,
      reportIdsJson: JSON.stringify([reportId]),
      metadata: JSON.stringify({
        originalReportType: reportData.type,
        priority: reportData.priority,
        createdAt: new Date().toISOString(),
        matchConfidence: match?.confidence || 0
      })
    });

    await this.consolidationRepository.save(consolidation);

    // Update the report with consolidation reference
    await this.updateReportWithConsolidation(reportType, reportId, consolidation.id);

    return consolidation;
  }

  /**
   * Update original report with consolidation reference
   */
  private async updateReportWithConsolidation(
    reportType: 'EMERGENCY' | 'ISSUE',
    reportId: number,
    consolidationId: number
  ): Promise<void> {
    try {
      if (reportType === 'EMERGENCY') {
        await this.emergencyRepository.update(
          { id: reportId },
          { 
            isConsolidated: true,
            consolidationId: consolidationId,
            updatedAt: new Date()
          }
        );
      } else {
        await this.issueRepository.update(
          { id: reportId },
          { 
            isConsolidated: true,
            consolidatedReportId: consolidationId,
            updatedAt: new Date()
          }
        );
      }
    } catch (error) {
      this.logger.error('Error updating report with consolidation:', error);
    }
  }

  /**
   * Get consolidation details
   */
  async getConsolidationDetails(consolidationId: number): Promise<{
    consolidation: ReportConsolidation;
    reports: Array<EmergencyReport | IssueReport>;
    statistics: any;
  }> {
    const consolidation = await this.consolidationRepository.findOne({
      where: { id: consolidationId }
    });

    if (!consolidation) {
      throw new Error('Consolidation not found');
    }

    // Get all reports in this consolidation
    const reportIds = consolidation.reportIds;
    let reports: Array<EmergencyReport | IssueReport> = [];

    if (consolidation.consolidationType === 'emergency') {
      reports = await this.emergencyRepository
        .createQueryBuilder('report')
        .where('report.id IN (:...ids)', { ids: reportIds })
        .orderBy('report.createdAt', 'ASC')
        .getMany();
    } else {
      reports = await this.issueRepository
        .createQueryBuilder('report')
        .where('report.id IN (:...ids)', { ids: reportIds })
        .orderBy('report.createdAt', 'ASC')
        .getMany();
    }

    // Calculate statistics
    const statistics = {
      totalReports: consolidation.reportCount,
      firstReportTime: reports[0]?.createdAt,
      lastReportTime: reports[reports.length - 1]?.createdAt,
      timeSpan: this.calculateTimeSpan(reports),
      departmentSpread: consolidation.departments.length,
      averageConfidence: this.calculateAverageConfidence(reports),
      mediaCount: reports.reduce((count, report) => {
        return count + ((report as any).mediaUrls?.length || 0);
      }, 0)
    };

    return { consolidation, reports, statistics };
  }

  /**
   * Get similar consolidations for a report
   */
  async findSimilarConsolidations(
    reportType: 'EMERGENCY' | 'ISSUE',
    reportData: any,
    limit: number = 5
  ): Promise<Array<{
    consolidation: ReportConsolidation;
    match: ConsolidationMatch;
  }>> {
    const potentialMatches = await this.getPotentialMatches(reportType, reportData);
    const results: Array<{
      consolidation: ReportConsolidation;
      match: ConsolidationMatch;
    }> = [];

    for (const consolidation of potentialMatches.slice(0, 10)) { // Limit evaluation
      const match = await this.evaluateMatch(reportType, reportData, consolidation);
      if (match.confidence >= 50) { // Lower threshold for "similar"
        results.push({ consolidation, match });
      }
    }

    // Sort by confidence and return top results
    return results
      .sort((a, b) => b.match.confidence - a.match.confidence)
      .slice(0, limit);
  }

  // Helper methods

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const earthRadius = 6371000; // meters
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.degreesToRadians(lat1)) * 
              Math.cos(this.degreesToRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 100;
    
    // Calculate Levenshtein distance - FIXED: Properly initialize matrix
    const matrix: number[][] = [];
    
    // Initialize first row and column
    for (let i = 0; i <= len1; i++) {
      matrix[i] = new Array(len2 + 1);
      matrix[i][0] = i;
    }
    
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[len1][len2];
    return 100 * (1 - distance / maxLen);
  }

  private analyzeDescriptionSimilarity(desc1: string, desc2: string): number {
    // Tokenize and compare
    const tokens1 = this.tokenizeText(desc1);
    const tokens2 = this.tokenizeText(desc2);
    
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
  }

  private tokenizeText(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2); // Ignore short words
  }

  private checkKeywordMatch(desc1: string, desc2: string): { matches: number; keywords: string[] } {
    const keywords = [
      'fire', 'burning', 'smoke', 'flames',
      'accident', 'crash', 'collision', 'hit',
      'robbery', 'theft', 'stolen', 'robbers',
      'medical', 'ambulance', 'hospital', 'doctor',
      'water', 'pipe', 'burst', 'leak',
      'pothole', 'road', 'damage', 'hole',
      'litter', 'garbage', 'trash', 'dumping',
      'sewer', 'drainage', 'blocked', 'overflow'
    ];

    const desc1Lower = desc1.toLowerCase();
    const desc2Lower = desc2.toLowerCase();
    
    const matchedKeywords = keywords.filter(keyword => 
      desc1Lower.includes(keyword) && desc2Lower.includes(keyword)
    );

    return {
      matches: matchedKeywords.length,
      keywords: matchedKeywords
    };
  }

  private calculateDepartmentOverlap(depts1: string[], depts2: string[]): number {
    const set1 = new Set(depts1);
    const set2 = new Set(depts2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateTimeSpan(reports: Array<{ createdAt: Date }>): number {
    if (reports.length < 2) return 0;
    
    const first = new Date(reports[0].createdAt).getTime();
    const last = new Date(reports[reports.length - 1].createdAt).getTime();
    
    return Math.round((last - first) / (1000 * 60)); // minutes
  }

  private calculateAverageConfidence(reports: Array<any>): number {
    if (reports.length === 0) return 0;
    
    const confidences = reports.map(report => {
      try {
        const metadata = report.metadataJson ? JSON.parse(report.metadataJson) : {};
        return metadata.matchConfidence || 0;
      } catch {
        return 0;
      }
    });
    
    const sum = confidences.reduce((a, b) => a + b, 0);
    return Math.round(sum / confidences.length);
  }

  /**
   * Get consolidation statistics
   */
  async getConsolidationStatistics(): Promise<any> {
    const totalConsolidations = await this.consolidationRepository.count();
    
    const byType = await this.consolidationRepository
      .createQueryBuilder('consolidation')
      .select('consolidation.consolidationType, COUNT(*) as count, AVG(consolidation.reportCount) as avg_reports')
      .groupBy('consolidation.consolidationType')
      .getRawMany();

    const byStatus = await this.consolidationRepository
      .createQueryBuilder('consolidation')
      .select('consolidation.status, COUNT(*) as count')
      .groupBy('consolidation.status')
      .getRawMany();

    const topConsolidations = await this.consolidationRepository
      .createQueryBuilder('consolidation')
      .where('consolidation.reportCount > 1')
      .orderBy('consolidation.reportCount', 'DESC')
      .take(10)
      .getMany();

    return {
      totalConsolidations,
      byType,
      byStatus,
      topConsolidations: topConsolidations.map(c => ({
        id: c.id,
        type: c.consolidationType,
        reportCount: c.reportCount,
        location: c.location,
        createdAt: c.createdAt
      })),
      efficiency: await this.calculateConsolidationEfficiency()
    };
  }

  private async calculateConsolidationEfficiency(): Promise<number> {
    const totalReports = await this.emergencyRepository.count() + await this.issueRepository.count();
    const consolidatedReports = await this.consolidationRepository
      .createQueryBuilder('consolidation')
      .select('SUM(consolidation.reportCount)', 'total')
      .where('consolidation.reportCount > 1')
      .getRawOne();

    const consolidatedCount = parseInt(consolidatedReports?.total || '0');
    
    if (totalReports === 0) return 0;
    
    return Math.round((consolidatedCount / totalReports) * 100);
  }
}