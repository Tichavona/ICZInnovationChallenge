/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { EmergencyReport, EmergencyType, EmergencyStatus, EmergencyPriority } from '../../../database/emergency-report.entity';
import { User } from '../../../database/user.entity';
import { AnalyticsDaily, LocationAnalytics, UserAnalytics, DepartmentAnalytics } from '../../../database/analytics.entity';
import { SessionManagerService } from '../session-manager.service';
import { SessionType } from '../../../database/session.entity';
import { MessagingService } from '../messaging/messaging.service';
import { StorageService } from '../storage.service';
import * as crypto from 'crypto';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { AssignedDepartments, DepartmentRoutingService } from '../department-routing.service';
import { NotificationService } from '../notification.service';
import { EditFeedbackService } from '../edit/edit-feedback.service';
import { ReportConsolidationService } from '../report-consolidation.service';
import { IncidentManagementService } from '../incident-management.service';
import { BloodDetectionService } from '../blood-detection.service';
import { FireHazardDetectionService } from '../fire-hazard-detection.service';
import { ReportConsolidation, ConsolidationMatch, IncidentGroup, IncidentAnalytics } from '../../../database/dashboard.entity';
import { join } from 'path';

// Define a custom session data type that extends Partial<EmergencyReport> with additional properties
interface EmergencySessionData extends Partial<EmergencyReport> {
  mediaUrls?: string[];
  additionalNotes?: string[];
  isReadyToSubmit?: boolean;
  bloodDetected?: {
    keywords: string[];
    severity: string;
    severityScore: number;
    detectedAt: string;
    originalMessage: string;
    originalType?: EmergencyType;
  };
  fireHazardDetected?: {
    keywords: string[];
    severity: string;
    severityScore: number;
    detectedAt: string;
    originalMessage: string;
    originalType?: EmergencyType;
    fireType?: string;
  };
  mediaFiles?: Array<{
    type: 'image' | 'voice' | 'video';
    url: string;
    mimeType: string;
    timestamp: number;
    mediaHash: string;
  }>;
  images?: string[];
  voiceNotes?: string[];
  videos?: string[];
  // Track multiple department assignments
  assignedDepartmentsList?: string[];
}

interface EmergencySession {
  phoneNumber: string;
  currentStep: number;
  data: EmergencySessionData;
  lastActive: number;
  messageID: string;
}

@Injectable()
export class EmergencyReportingService {
  private readonly logger = new Logger(EmergencyReportingService.name);
  private readonly emergencySessions = new Map<string, EmergencySession>();
  private readonly CONSOLIDATION_DISTANCE = 0.0001; // Approximately 10 meters
  private readonly SESSION_TTL = 30 * 60 * 1000; // 30 minutes

  // Add media storage directories
  private readonly baseDir = 'C:/Users/ACER/Documents/CourseGenerator/chatbot/uploads';
  private readonly emergencyImagesDir = join(this.baseDir, 'emergency_images');
  private readonly emergencyVoiceNotesDir = join(this.baseDir, 'emergency_voice_notes');
  private readonly emergencyVideosDir = join(this.baseDir, 'emergency_videos');

  // Enhanced emergency type mapping with natural language keywords
  private readonly emergencyTypeKeywords = {
    [EmergencyType.FIRE]: [
      'fire', 'fire emergency', 'there is a fire', 'building fire', 'house fire', 'kutsva', 'kupisa', 
      'forest fire', 'fire outbreak', 'fire incident', 'reporting on fire', 'zhenje emoto', 'pisa',
      '🔥', 'flames', 'burning', 'smoke', 'moto', 'kupfuta', 'pfuta', 'chiutsi', 'chivutsi',
    ],
    [EmergencyType.AMBULANCE]: [
      'ambulance', 'medical emergency', 'need ambulance', 'medical help',
      'heart attack', 'stroke', 'seizure', 'unconscious', 'bleeding',
      'medical assistance', '🚑', 'paramedic'
    ],
    [EmergencyType.ROBBERY]: [
      'robbery', 'robbery in progress', 'being robbed', 'theft', 'burglary',
      'break in', 'stolen', 'robbers', 'armed robbery', '🚔', 'crime'
    ],
    [EmergencyType.ACCIDENT]: [
      'accident', 'traffic accident', 'car accident', 'road accident',
      'vehicle accident', 'crash', 'collision', '🚗', 'car crash'
    ],
    [EmergencyType.MEDICAL]: [
      'medical', 'medical emergency', 'health emergency', 'sick', 'illness',
      'injury', 'wound', 'pain', 'emergency medical', '🏥', 'doctor',
      'blood', 'bleeding', 'kubuda ropa', 'ropa', 'kujuja ropa', 
      'kukuvara', 'injured', 'injury', 'ronda', 'maronda', 
      'kuvadza', 'kuvadzwa', 'bleed', 'bleeds', 'bleeder',
      'cut', 'cuts', 'cutting', 'gash', 'laceration', 'wound',
      'hemorrhage', 'haemorrhage', 'blood loss', 'losing blood',
      'bloody', 'bloodied', 'profuse bleeding', 'severe bleeding',
      'uncontrolled bleeding', 'stop the bleeding', 'bleeding heavily'
    ],
    [EmergencyType.CRIME]: [
      'crime', 'criminal activity', 'criminal', 'assault', 'violence',
      'attack', 'fighting', 'disturbance', 'public disorder', '👮', 'police'
    ],
    [EmergencyType.NATURAL_DISASTER]: [
      'natural disaster', 'earthquake', 'flood', 'storm', 'cyclone',
      'hurricane', 'tornado', 'landslide', 'tsunami', '🌪️', 'disaster'
    ],
    [EmergencyType.OTHER]: [
      'other', 'unknown', 'unsure', 'miscellaneous', 'general emergency',
      'help needed', 'emergency situation'
    ]
  };

  constructor(
    @InjectRepository(EmergencyReport)
    private emergencyRepository: Repository<EmergencyReport>,
    @InjectRepository(AnalyticsDaily)
    private analyticsRepository: Repository<AnalyticsDaily>,
    @InjectRepository(LocationAnalytics)
    private locationAnalyticsRepository: Repository<LocationAnalytics>,
    @InjectRepository(UserAnalytics)
    private userAnalyticsRepository: Repository<UserAnalytics>,
    @InjectRepository(DepartmentAnalytics)
    private departmentAnalyticsRepository: Repository<DepartmentAnalytics>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly messagingService: MessagingService,
    private readonly sessionManager: SessionManagerService,
    private readonly departmentRouting: DepartmentRoutingService,
    private readonly notificationService: NotificationService,
    private readonly editFeedbackService: EditFeedbackService,
    private readonly consolidationService: ReportConsolidationService,
    private readonly incidentService: IncidentManagementService,
    private readonly bloodDetectionService: BloodDetectionService,
    private readonly fireHazardDetectionService: FireHazardDetectionService, // New service
    private readonly storageService: StorageService,
  ) {
    this.ensureMediaDirs();
  }

  private ensureMediaDirs() {
    try {
      if (!existsSync(this.baseDir)) mkdirSync(this.baseDir);
      if (!existsSync(this.emergencyImagesDir)) mkdirSync(this.emergencyImagesDir);
      if (!existsSync(this.emergencyVoiceNotesDir)) mkdirSync(this.emergencyVoiceNotesDir);
      if (!existsSync(this.emergencyVideosDir)) mkdirSync(this.emergencyVideosDir);
    } catch (error) {
      this.logger.error('Error creating media directories', error);
    }
  }

  private isCancelCommand(text: string): boolean {
    const normalizedText = text.toLowerCase().trim();
    return normalizedText === 'cancel' || 
          normalizedText === 'stop' || 
          normalizedText === 'exit' || 
          normalizedText === 'abort';
  }

  // Check if user has active emergency session
  hasActiveEmergencySession(phoneNumber: string): boolean {
    const session = this.emergencySessions.get(phoneNumber);
    if (!session) return false;
    
    const isActive = (Date.now() - session.lastActive) < this.SESSION_TTL;
    if (!isActive) {
      this.emergencySessions.delete(phoneNumber);
      return false;
    }
    return true;
  }

  async getEmergencySession(phoneNumber: string): Promise<EmergencySession | null> {
    return this.emergencySessions.get(phoneNumber) || null;
  }

  async cancelEmergencyReport(phoneNumber: string): Promise<void> {
    this.emergencySessions.delete(phoneNumber);
    await this.sessionManager.cancelSession(phoneNumber, SessionType.EMERGENCY);
  }

  // Start emergency reporting flow
  async startEmergencyReport(phoneNumber: string, messageID: string): Promise<boolean> {
    try {
      // Create in-memory session
      const sessionData: EmergencySessionData = {
        reportingPhoneNumber: phoneNumber,
        status: EmergencyStatus.REPORTED,
        priority: EmergencyPriority.MEDIUM,
        mediaUrls: [],
        additionalNotes: [],
        isReadyToSubmit: false,
        assignedDepartmentsList: [],
      };

      this.emergencySessions.set(phoneNumber, {
        phoneNumber,
        currentStep: 1,
        data: sessionData,
        lastActive: Date.now(),
        messageID
      });

      // Create database active session for NLP locking
      await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.EMERGENCY,
        1, // Starting step
        {
          ...sessionData,
          startedAt: new Date(),
          messageId: messageID,
          emergencyType: 'user_initiated'
        },
        messageID
      );

      const welcomeMessage = `🚨 *EMERGENCY REPORTING* 🚨

We're here to help! Please tell us what type of emergency you're reporting:

*You can say:*
• "Fire" or "There's a fire" 🔥
• "Ambulance" or "Medical emergency" 🚑
• "Robbery" or "Crime in progress" 👮
• "Accident" or "Car crash" 🚗
• "Medical help" or "Someone is sick" 🏥
• "Natural disaster" or "Flood" 🌪️
• "Other emergency"

*Or choose from:*
1️⃣ FIRE - Fire emergency
2️⃣ AMBULANCE - Medical transport needed
3️⃣ ROBBERY - Robbery/theft in progress
4️⃣ ACCIDENT - Traffic accident
5️⃣ MEDICAL - Medical emergency
6️⃣ CRIME - Criminal activity
7️⃣ NATURAL_DISASTER - Natural disaster
8️⃣ OTHER - Other emergency

*Examples:* "Fire emergency", "Reporting a robbery", "Need ambulance", "There's been an accident"`;

      await this.messagingService.sendTextMessage(phoneNumber, welcomeMessage, messageID);
      this.logger.log(`Emergency session started for ${phoneNumber} with database session`);
      return true;
    } catch (error) {
      this.logger.error('Error starting emergency report:', error);
      return false;
    }
  }

  /**
   * Enhanced method to check and upgrade emergency type with multiple department assignments
   * Now adds departments instead of replacing
   */
  private async checkAndUpgradeEmergencyType(
    phoneNumber: string,
    session: EmergencySession,
    text: string,
    messageID: string
  ): Promise<boolean> {
    let upgraded = false;
    const upgradeMessages: string[] = [];
    const newDepartments: string[] = [];
    
    // Initialize assignedDepartmentsList if not present
    if (!session.data.assignedDepartmentsList) {
      session.data.assignedDepartmentsList = [];
    }

    // Check for blood/bleeding keywords
    if (this.bloodDetectionService.containsBloodKeywords(text)) {
      const keywords = this.bloodDetectionService.extractBloodKeywords(text);
      const severity = this.bloodDetectionService.assessSeverity(text);
      const medicalResponse = this.bloodDetectionService.getMedicalResponse(severity.level);
      
      this.logger.log(`Blood keywords detected in step ${session.currentStep}: ${keywords.join(', ')}`);
      
      // Only add medical/ambulance if not already present
      if (session.data.type !== EmergencyType.MEDICAL && 
          session.data.type !== EmergencyType.AMBULANCE) {
        
        // Store original type
        if (!session.data.bloodDetected) {
          session.data.bloodDetected = {
            keywords,
            severity: severity.level,
            severityScore: severity.score,
            detectedAt: new Date().toISOString(),
            originalMessage: text,
            originalType: session.data.type
          };
        }
        
        // Add medical departments to the list
        const medicalDepartments = this.departmentRouting.routeEmergency(
          EmergencyType.MEDICAL,
          EmergencyPriority.HIGH
        );
        
        // Add medical departments to the list (avoid duplicates)
        medicalDepartments.departments.forEach(dept => {
          if (!session.data.assignedDepartmentsList!.includes(dept)) {
            session.data.assignedDepartmentsList!.push(dept);
            newDepartments.push(dept);
          }
        });
        
        upgradeMessages.push(`• Medical services added due to blood/bleeding detected`);
        upgraded = true;
      }
    }
    
    // Check for fire hazard keywords (new)
    if (this.fireHazardDetectionService.containsFireHazardKeywords(text)) {
      const keywords = this.fireHazardDetectionService.extractFireHazardKeywords(text);
      const severity = this.fireHazardDetectionService.assessSeverity(text);
      const fireType = this.fireHazardDetectionService.detectFireType(text);
      const fireResponse = this.fireHazardDetectionService.getFireResponse(severity.level, fireType);
      
      this.logger.log(`Fire hazard keywords detected in step ${session.currentStep}: ${keywords.join(', ')}`);
      
      // Only add fire department if not already a fire emergency
      if (session.data.type !== EmergencyType.FIRE) {
        
        // Store fire hazard detection
        if (!session.data.fireHazardDetected) {
          session.data.fireHazardDetected = {
            keywords,
            severity: severity.level,
            severityScore: severity.score,
            detectedAt: new Date().toISOString(),
            originalMessage: text,
            originalType: session.data.type,
            fireType
          };
        }
        
        // Add fire department to the list
        const fireDepartments = this.departmentRouting.routeEmergency(
          EmergencyType.FIRE,
          severity.level === 'critical' ? EmergencyPriority.CRITICAL : 
          severity.level === 'high' ? EmergencyPriority.HIGH : EmergencyPriority.MEDIUM
        );
        
        // Add fire departments to the list (avoid duplicates)
        fireDepartments.departments.forEach(dept => {
          if (!session.data.assignedDepartmentsList!.includes(dept)) {
            session.data.assignedDepartmentsList!.push(dept);
            newDepartments.push(dept);
          }
        });
        
        upgradeMessages.push(`• Fire services added due to fire hazard detected`);
        upgraded = true;
      }
    }

    // Send alert if upgraded with new departments
    if (upgraded && upgradeMessages.length > 0) {
      const alertMessage = `🚨 *ADDITIONAL SERVICES DISPATCHED*\n\n` +
        `Based on your description, additional emergency services have been notified:\n\n` +
        upgradeMessages.join('\n') + '\n\n' +
        `🏥 *Newly Notified Departments:*\n` +
        newDepartments.map(dept => `• ${dept}`).join('\n') + '\n\n' +
        `Please continue with your report.`;
      
      await this.messagingService.sendTextMessage(phoneNumber, alertMessage, messageID);
      
      // Update session
      this.emergencySessions.set(phoneNumber, session);
      await this.updateEmergencySession(phoneNumber, session);
    }
    
    return upgraded;
  }

  // Handle emergency reporting steps
  async handleEmergencyReporting(phoneNumber: string, text: string, messageID: string): Promise<boolean> {
    try {

      // Check for cancel command first
      if (this.isCancelCommand(text)) {
        await this.cancelEmergencySession(phoneNumber);
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Issue reporting cancelled. You can start again by typing "REPORT".',
          messageID
        );
        return true;
      }

      const session = this.emergencySessions.get(phoneNumber);
      if (!session) {
        // Start new emergency report if user types "EMERGENCY" or emergency-related phrases
        const normalizedText = text.toLowerCase().trim();
        if (normalizedText === 'emergency' || 
            normalizedText.includes('emergency') ||
            normalizedText.includes('help') ||
            normalizedText.includes('urgent')) {
          return await this.startEmergencyReport(phoneNumber, messageID);
        }
        return false;
      }

      // Update session activity
      session.lastActive = Date.now();
      session.messageID = messageID;
      this.emergencySessions.set(phoneNumber, session);

      // Update database session activity
      await this.updateEmergencySession(phoneNumber, session);

      // Check if user wants to submit
      if (session.currentStep >= 4 && text.toLowerCase().trim() === 'submit') {
        await this.completeEmergencyReport(phoneNumber, session);
        return true;
      }

      // Check if user wants to add more media
      if (session.currentStep === 4 && text.toLowerCase().trim() === 'add more') {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '📸 You can send more photos, videos, or voice notes.\n\nWhen you\'re ready to submit, type "SUBMIT"',
          messageID
        );
        return true;
      }

      switch (session.currentStep) {
        case 1: // Emergency Type
          return await this.handleEmergencyType(phoneNumber, text, session);
        case 2: // Description
          return await this.handleDescription(phoneNumber, text, session);
        case 3: // Location
          return await this.handleLocation(phoneNumber, text, session);
        case 4: // Media and final confirmation
          return await this.handleMediaStep(phoneNumber, text, session);
        default:
          await this.completeEmergencyReport(phoneNumber, session);
          return true;
      }
    } catch (error) {
      this.logger.error('Error handling emergency reporting:', error);
      return false;
    }
  }

  async cancelEmergencySession(phoneNumber: string): Promise<void> {
    this.emergencySessions.delete(phoneNumber);
  }

  // Update database emergency session
  private async updateEmergencySession(phoneNumber: string, session: EmergencySession): Promise<void> {
    try {
      await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.EMERGENCY,
        session.currentStep,
        {
          ...session.data,
          currentStep: session.currentStep,
          lastActive: new Date(session.lastActive),
          messageId: session.messageID
        },
        session.messageID
      );
    } catch (error) {
      this.logger.error('Error updating emergency session in database:', error);
      // Don't throw - continue with in-memory session
    }
  }

  // Enhanced emergency type detection with natural language processing
  private detectEmergencyTypeFromText(text: string): EmergencyType | null {
    const normalizedText = text.toLowerCase().trim();
    
    // Check for exact matches first
    const validTypes = Object.values(EmergencyType);
    if (validTypes.includes(normalizedText.toUpperCase() as EmergencyType)) {
      return normalizedText.toUpperCase() as EmergencyType;
    }

    // Check for number selections (1-8)
    const numberMap = {
      '1': EmergencyType.FIRE,
      '1️⃣': EmergencyType.FIRE,
      '2': EmergencyType.AMBULANCE,
      '2️⃣': EmergencyType.AMBULANCE,
      '3': EmergencyType.ROBBERY,
      '3️⃣': EmergencyType.ROBBERY,
      '4': EmergencyType.ACCIDENT,
      '4️⃣': EmergencyType.ACCIDENT,
      '5': EmergencyType.MEDICAL,
      '5️⃣': EmergencyType.MEDICAL,
      '6': EmergencyType.CRIME,
      '6️⃣': EmergencyType.CRIME,
      '7': EmergencyType.NATURAL_DISASTER,
      '7️⃣': EmergencyType.NATURAL_DISASTER,
      '8': EmergencyType.OTHER,
      '8️⃣': EmergencyType.OTHER
    };

    if (numberMap[normalizedText]) {
      return numberMap[normalizedText];
    }

    // Check keyword matches
    for (const [emergencyType, keywords] of Object.entries(this.emergencyTypeKeywords)) {
      for (const keyword of keywords) {
        if (normalizedText.includes(keyword.toLowerCase())) {
          return emergencyType as EmergencyType;
        }
      }
    }

    return null;
  }

  /**
   * Start emergency report with NLP context
   */
  async startEmergencyReportWithContext(
    phoneNumber: string, 
    messageID: string,
    context: {
      detectedType: string;
      originalMessage: string;
      confidence: number;
      keywords: string[];
      nlpMetadata?: any;
    }
  ): Promise<boolean> {
    try {
      // Map detected type to EmergencyType
      const emergencyType = this.mapNlpTypeToEmergencyType(context.detectedType);

      const sessionData: EmergencySessionData = {
        reportingPhoneNumber: phoneNumber,
        status: EmergencyStatus.REPORTED,
        priority: this.getPriorityFromType(emergencyType),
        type: emergencyType,
        description: `NLP Detected: ${context.originalMessage}\nConfidence: ${context.confidence}\nKeywords: ${context.keywords.join(', ')}`,
        mediaUrls: [],
        additionalNotes: [],
        isReadyToSubmit: false,
        assignedDepartmentsList: [],
      };
      
      // Create in-memory session
      this.emergencySessions.set(phoneNumber, {
        phoneNumber,
        currentStep: 2, // Skip type selection since we detected it
        data: sessionData,
        lastActive: Date.now(),
        messageID
      });

      // Create database active session
      await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.EMERGENCY,
        2, // Starting at step 2
        {
          ...sessionData,
          startedAt: new Date(),
          messageId: messageID,
          emergencyType: 'nlp_detected',
          nlpContext: context
        },
        messageID
      );

      const confirmationMessage = `🚨 *EMERGENCY DETECTED: ${emergencyType}* 🚨\n\nI understand you're reporting a ${context.detectedType} emergency.\n\n${this.getEmergencyTypeConfirmation(emergencyType)}`;

      await this.messagingService.sendTextMessage(phoneNumber, confirmationMessage, messageID);
      this.logger.log(`NLP-triggered emergency session started for ${phoneNumber}`);
      return true;
    } catch (error) {
      this.logger.error('Error starting emergency report with context:', error);
      // Fallback to regular emergency flow
      return await this.startEmergencyReport(phoneNumber, messageID);
    }
  }

  /**
   * Map NLP detected type to EmergencyType enum
   */
  private mapNlpTypeToEmergencyType(nlpType: string): EmergencyType {
    const typeMap: { [key: string]: EmergencyType } = {
      'robbery': EmergencyType.ROBBERY,
      'violence': EmergencyType.CRIME,
      'medical': EmergencyType.MEDICAL,
      'fire': EmergencyType.FIRE,
      'accident': EmergencyType.ACCIDENT,
      'danger': EmergencyType.OTHER,
      'kidnapping': EmergencyType.CRIME,
      'weapons': EmergencyType.CRIME,
      'general': EmergencyType.OTHER
    };

    return typeMap[nlpType] || EmergencyType.OTHER;
  }

  /**
   * Get priority based on emergency type
   */
  private getPriorityFromType(emergencyType: EmergencyType): EmergencyPriority {
    switch (emergencyType) {
      case EmergencyType.FIRE:
      case EmergencyType.ROBBERY:
      case EmergencyType.CRIME:
        return EmergencyPriority.CRITICAL;
      case EmergencyType.AMBULANCE:
      case EmergencyType.MEDICAL:
      case EmergencyType.ACCIDENT:
        return EmergencyPriority.HIGH;
      default:
        return EmergencyPriority.MEDIUM;
    }
  }

  private async handleEmergencyType(phoneNumber: string, text: string, session: EmergencySession): Promise<boolean> {
    const detectedType = this.detectEmergencyTypeFromText(text);
    
    if (!detectedType) {
      const typeList = Object.entries(this.emergencyTypeKeywords)
        .map(([type, keywords]) => {
          const mainKeywords = keywords.slice(0, 3).join(', ');
          return `• *${type}* - Examples: "${mainKeywords}"`;
        })
        .join('\n');

      await this.messagingService.sendTextMessage(
        phoneNumber,
        `❌ I couldn't identify the emergency type from your message.\n\nPlease choose from:\n\n${typeList}\n\n*Examples:* "Fire emergency", "Need ambulance", "Reporting a robbery", "There's been an accident"`,
        session.messageID
      );
      return true;
    }

    session.data.type = detectedType;

    // Initialize assignedDepartmentsList
    if (!session.data.assignedDepartmentsList) {
      session.data.assignedDepartmentsList = [];
    }

    // Set priority based on emergency type
    switch (detectedType) {
      case EmergencyType.FIRE:
      case EmergencyType.ROBBERY:
      case EmergencyType.CRIME:
        session.data.priority = EmergencyPriority.CRITICAL;
        break;
      case EmergencyType.AMBULANCE:
      case EmergencyType.MEDICAL:
      case EmergencyType.ACCIDENT:
        session.data.priority = EmergencyPriority.HIGH;
        break;
      default:
        session.data.priority = EmergencyPriority.MEDIUM;
    }

    // Add primary departments based on type
    const primaryDepartments = this.departmentRouting.routeEmergency(
      detectedType,
      session.data.priority
    );
    
    primaryDepartments.departments.forEach(dept => {
      if (!session.data.assignedDepartmentsList!.includes(dept)) {
        session.data.assignedDepartmentsList!.push(dept);
      }
    });

    // Check for blood or fire keywords even in type selection
    await this.checkAndUpgradeEmergencyType(phoneNumber, session, text, session.messageID);

    session.currentStep = 2;

    const confirmationMessage = this.getEmergencyTypeConfirmation(detectedType);
    await this.messagingService.sendTextMessage(
      phoneNumber,
      confirmationMessage,
      session.messageID
    );

    return true;
  }

  // Get appropriate confirmation message based on emergency type
  private getEmergencyTypeConfirmation(emergencyType: EmergencyType): string {
    const baseMessage = `✅ Emergency type confirmed: ${emergencyType}\n\n📝 *Step 2: Please describe the emergency*\n\n`;
    
    const typeSpecificPrompts = {
      [EmergencyType.FIRE]: `${baseMessage}Provide details about:\n• Location of the fire\n• Size and intensity\n• Any people trapped\n• Visible smoke or flames\n• Nearby buildings at risk`,
      [EmergencyType.AMBULANCE]: `${baseMessage}Provide details about:\n• Number of people affected\n• Nature of medical issue\n• Conscious/unconscious status\n• Any visible injuries\n• Current condition`,
      [EmergencyType.ROBBERY]: `${baseMessage}Provide details about:\n• Location of incident\n• Number of suspects\n• Weapons involved\n• Suspect descriptions\n• Current situation`,
      [EmergencyType.ACCIDENT]: `${baseMessage}Provide details about:\n• Number of vehicles involved\n• Injuries observed\n• Road blockage\n• Hazardous materials\n• Exact location details`,
      [EmergencyType.MEDICAL]: `${baseMessage}Provide details about:\n• Symptoms observed\n• Duration of condition\n• Age of affected person\n• Any known medical conditions\n• Current consciousness level`,
      [EmergencyType.CRIME]: `${baseMessage}Provide details about:\n• Type of criminal activity\n• Suspect information\n• Weapons involved\n• Time incident occurred\n• Witness information`,
      [EmergencyType.NATURAL_DISASTER]: `${baseMessage}Provide details about:\n• Type of natural disaster\n• Area affected\n• People in danger\n• Infrastructure damage\n• Immediate threats`,
      [EmergencyType.OTHER]: `${baseMessage}Provide details about:\n• What happened\n• Number of people involved\n• Current situation\n• Any immediate dangers\n• Specific assistance needed`
    };

    return typeSpecificPrompts[emergencyType] || typeSpecificPrompts[EmergencyType.OTHER];
  }

  private async handleDescription(phoneNumber: string, text: string, session: EmergencySession): Promise<boolean> {
    if (text.length < 10) {
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Please provide a more detailed description (at least 10 characters). This helps emergency services respond appropriately.',
        session.messageID
      );
      return true;
    }

    let upgraded;

    // In handleMediaStep, after checking for blood/fire keywords:
    if (text.toLowerCase().trim() !== 'submit' && text.toLowerCase().trim() !== 'add more') {
      // Check for blood and fire keywords in additional notes
      upgraded = await this.checkAndUpgradeEmergencyType(phoneNumber, session, text, session.messageID);
    }

    // Append detection info to description if upgraded
    let enhancedDescription = text;
    if (upgraded) {
      const enhancements: string[] = [];
      if (session.data.bloodDetected) {
        enhancements.push(`[Blood detected: ${session.data.bloodDetected.keywords.join(', ')} - Severity: ${session.data.bloodDetected.severity}]`);
      }
      if (session.data.fireHazardDetected) {
        enhancements.push(`[Fire hazard detected: ${session.data.fireHazardDetected.keywords.join(', ')} - Severity: ${session.data.fireHazardDetected.severity} - Type: ${session.data.fireHazardDetected.fireType}]`);
      }
      if (enhancements.length > 0) {
        enhancedDescription = `${text}\n\n${enhancements.join('\n')}`;
      }
    }
    
    session.data.description = enhancedDescription;
    session.currentStep = 3;

    // Update database session
    await this.updateEmergencySession(phoneNumber, session);

    await this.messagingService.sendTextMessage(
      phoneNumber,
      `✅ Description received.\n\n📍 *Step 3: Please provide your location*\n\nYou can:\n• Type your current address/location\n• Or send your location using WhatsApp's location sharing\n• Or send coordinates (latitude, longitude)\n\n*Examples:* "123 Main Street, City" or "17.8292, 31.0522" or "Near the shopping center"`,
      session.messageID
    );

    return true;
  }

  private async handleLocation(phoneNumber: string, text: string, session: EmergencySession): Promise<boolean> {
    if (text.length < 5) {
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Please provide a valid location or address (at least 5 characters). Accurate location helps emergency services find you quickly.',
        session.messageID
      );
      return true;
    }

    session.data.location = text;
    session.currentStep = 4;

    // Update database session
    await this.updateEmergencySession(phoneNumber, session);

    await this.messagingService.sendTextMessage(
      phoneNumber,
      `✅ Location received: ${text}\n\n📸 *Step 4: Media & Final Review*\n\nYou can now:\n• Send photos/videos of the situation\n• Send voice notes with additional details\n• Type additional notes if needed\n• When ready, type "SUBMIT" to send your emergency report\n\nYou can send multiple media files. After each media, you'll have the option to add more or submit.`,
      session.messageID
    );

    return true;
  }

  private async handleMediaStep(phoneNumber: string, text: string, session: EmergencySession): Promise<boolean> {
    const normalizedText = text.toLowerCase().trim();

    // In handleMediaStep, after checking for blood/fire keywords:
    if (normalizedText !== 'submit' && normalizedText !== 'add more') {
      // Check for blood and fire keywords in additional notes
      await this.checkAndUpgradeEmergencyType(phoneNumber, session, text, session.messageID);
    }
    
    // Handle submission
    if (normalizedText === 'submit') {
      if (!session.data.isReadyToSubmit) {
        session.data.isReadyToSubmit = true;
        await this.showSubmissionConfirmation(phoneNumber, session);
        return true;
      }
      // If already confirmed, proceed with submission
      await this.completeEmergencyReport(phoneNumber, session);
      return true;
    }

    // Handle cancel submission
    if (normalizedText === 'cancel') {
      session.data.isReadyToSubmit = false;
      await this.messagingService.sendTextMessage(
        phoneNumber,
        'Submission cancelled. You can continue adding media or type "SUBMIT" when ready.',
        session.messageID
      );
      return true;
    }

    // Handle add more media
    if (normalizedText === 'add more') {
      await this.messagingService.sendTextMessage(
        phoneNumber,
        'You can send more photos, videos, or voice notes.\n\nWhen ready, type "SUBMIT"',
        session.messageID
      );
      return true;
    }

    // If it's not a command, treat as additional note
    session.data.additionalNotes = session.data.additionalNotes || [];
    session.data.additionalNotes.push(text);
    
    await this.messagingService.sendTextMessage(
      phoneNumber,
      `📝 Note added. You have ${session.data.additionalNotes.length} note(s).\n\nSend more media, add more notes, or type "SUBMIT" when ready.`,
      session.messageID
    );

    return true;
  }

  private async showSubmissionConfirmation(phoneNumber: string, session: EmergencySession): Promise<void> {
    const mediaCount = session.data.mediaUrls?.length || 0;
    const noteCount = session.data.additionalNotes?.length || 0;
    const departmentCount = session.data.assignedDepartmentsList?.length || 0;
    
    let confirmationMessage = `🚨 *REVIEW YOUR EMERGENCY REPORT* 🚨\n\n`;
    confirmationMessage += `📋 *Type:* ${session.data.type}\n`;
    confirmationMessage += `🚨 *Priority:* ${session.data.priority}\n`;
    confirmationMessage += `📍 *Location:* ${session.data.location}\n`;
    confirmationMessage += `📝 *Description:* ${session.data.description?.substring(0, 100)}${session.data.description && session.data.description.length > 100 ? '...' : ''}\n`;
    confirmationMessage += `📸 *Media files:* ${mediaCount}\n`;
    confirmationMessage += `📝 *Additional notes:* ${noteCount}\n`;
    confirmationMessage += `🏢 *Departments notified:* ${departmentCount}\n\n`;
    confirmationMessage += `*Are you ready to submit this emergency report?*\n\n`;
    confirmationMessage += `Type "SUBMIT" again to confirm and send to emergency services\n`;
    confirmationMessage += `Type "CANCEL" to go back and add more information\n`;
    confirmationMessage += `Type "ADD MORE" to add more media or notes`;

    await this.messagingService.sendTextMessage(phoneNumber, confirmationMessage, session.messageID);
  }

  // Handle media in emergency reporting
  async handleMediaInEmergency(
    phoneNumber: string, 
    mediaType: 'image' | 'voice' | 'video', 
    mediaUrl: string, 
    messageID: string, 
    mimeType?: string
  ): Promise<boolean> {
    const session = this.emergencySessions.get(phoneNumber);
    if (!session || session.currentStep !== 4) {
      return false;
    }

    try {
      // Check if this media was already processed (deduplication)
      const mediaHash = crypto.createHash('md5').update(mediaUrl).digest('hex');

      // Initialize mediaUrls array if it doesn't exist
      if (!session.data.mediaUrls) {
        session.data.mediaUrls = [];
      }

      // Check for duplicate media URL
      if (session.data.mediaUrls.includes(mediaUrl)) {
        this.logger.log(`Duplicate media detected for ${phoneNumber}, skipping`);
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `⚠️ This ${mediaType} was already uploaded. You now have ${session.data.mediaUrls.length} media file(s).\n\nType "SUBMIT" when ready or send new media.`,
          messageID
        );
        return true;
      }

      // Download media from WhatsApp
      const mediaBuffer = await this.downloadMediaFromWhatsApp(mediaUrl);
      
      // Save to local file system
      const localFilePath = await this.saveMediaFile(
        mediaBuffer, 
        phoneNumber, 
        mediaType, 
        mimeType || this.getDefaultMimeType(mediaType)
      );

      // Add to media URLs array
      session.data.mediaUrls.push(mediaUrl);

      // Initialize mediaFiles array if it doesn't exist
      if (!session.data.mediaFiles) {
        session.data.mediaFiles = [];
      }

      // Store the media file path separately by type for backward compatibility
      session.data.mediaFiles.push({
        type: mediaType,
        url: localFilePath,
        mimeType: mimeType || this.getDefaultMimeType(mediaType),
        timestamp: Date.now(),
        mediaHash
      });

      // Update specific media type field
      if (mediaType === 'image') {
        // If multiple images, store as array
        if (!session.data.images) {
          session.data.images = [];
        }
        session.data.images.push(localFilePath);
        session.data.imageUrl = localFilePath; // Keep last one for backward compatibility
      } else if (mediaType === 'voice') {
        if (!session.data.voiceNotes) {
          session.data.voiceNotes = [];
        }
        session.data.voiceNotes.push(localFilePath);
        session.data.voiceNoteUrl = localFilePath;
      } else if (mediaType === 'video') {
        if (!session.data.videos) {
          session.data.videos = [];
        }
        session.data.videos.push(localFilePath);
        session.data.videoUrl = localFilePath;
      }

      session.lastActive = Date.now();
      this.emergencySessions.set(phoneNumber, session);

      // Update database session
      await this.updateEmergencySession(phoneNumber, session);

      const mediaCount = session.data.mediaUrls?.length || 0;
      
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `✅ ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} received! You now have ${mediaCount} media file(s).\n\nYou can:\n• Send more photos/videos/voice notes\n• Type additional notes\n• Type "SUBMIT" when ready to send the report`,
        messageID
      );
      return true;
    } catch (error) {
      this.logger.error('Error handling media in emergency:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `❌ Failed to process your ${mediaType}. Please try again or type "submit" to continue without media.`,
        messageID
      );
      return false;
    }
  }

  private async downloadMediaFromWhatsApp(mediaUrl: string): Promise<Buffer> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    try {
      const axios = require('axios');
      const response = await axios.get(mediaUrl, {
        responseType: 'arraybuffer',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 30000,
      });
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error('Media download failed:', error);
      throw new Error('Failed to download media from WhatsApp');
    }
  }

  // Optional: Add audio transcription for voice notes
  async transcribeVoiceNote(audioBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      // Integration with speech-to-text service (e.g., Google Speech-to-Text, AWS Transcribe)
      // This would need to be implemented based on your chosen service
      this.logger.log('Voice note received, would transcribe for blood and fire keywords');
      return ''; // Placeholder
    } catch (error) {
      this.logger.error('Error transcribing voice note:', error);
      return '';
    }
  }

  private getDefaultMimeType(mediaType: 'image' | 'voice' | 'video'): string {
    const defaultMimeTypes: { [key: string]: string } = {
      'image': 'image/jpeg',
      'voice': 'audio/ogg', 
      'video': 'video/mp4'
    };
    return defaultMimeTypes[mediaType];
  }

  private async saveMediaFile(buffer: Buffer, phoneNumber: string, mediaType: 'image' | 'voice' | 'video', originalMimeType: string): Promise<string> {
    try {
      const timestamp = Date.now();
      const extension = this.getFileExtensionFromMimeType(originalMimeType);
      
      let filename: string;
      let dir: string;

      switch (mediaType) {
        case 'image':
          filename = `emergency_image_${phoneNumber}_${timestamp}.${extension}`;
          dir = this.emergencyImagesDir;
          break;
        case 'voice':
          filename = `emergency_voice_${phoneNumber}_${timestamp}.${extension}`;
          dir = this.emergencyVoiceNotesDir;
          break;
        case 'video':
          filename = `emergency_video_${phoneNumber}_${timestamp}.${extension}`;
          dir = this.emergencyVideosDir;
          break;
        default:
          throw new Error(`Unsupported media type: ${mediaType}`);
      }

      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = join(dir, sanitizedFilename);
      
      writeFileSync(filePath, buffer);
      return filePath;
    } catch (error) {
      this.logger.error(`Error saving ${mediaType} file for ${phoneNumber}`, error);
      throw new Error(`Failed to save ${mediaType} file`);
    }
  }

  private getFileExtensionFromMimeType(mimeType: string): string {
    const extensionMap: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'audio/ogg': 'ogg',
      'audio/aac': 'aac',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/amr': 'amr',
      'video/mp4': 'mp4',
      'video/3gpp': '3gp',
      'video/quicktime': 'mov'
    };
    
    return extensionMap[mimeType] || 'bin';
  }

  // Handle location in emergency reporting
  async handleLocationInEmergency(phoneNumber: string, latitude: number, longitude: number, messageID: string): Promise<boolean> {
    const session = this.emergencySessions.get(phoneNumber);
    if (!session || session.currentStep !== 3) {
      return false;
    }

    try {
      session.data.latitude = latitude;
      session.data.longitude = longitude;
      session.data.location = `${latitude}, ${longitude}`;
      session.currentStep = 4;

      // Update database session
      await this.updateEmergencySession(phoneNumber, session);

      await this.messagingService.sendTextMessage(
        phoneNumber,
        `✅ Location coordinates received.\n\n📸 *Step 4: Media & Final Review*\n\nYou can now:\n• Send photos/videos of the situation\n• Send voice notes with additional details\n• Type additional notes if needed\n• When ready, type "SUBMIT" to send your emergency report\n\nYou can send multiple media files. After each media, you'll have the option to add more or submit.`,
        messageID
      );

      return true;
    } catch (error) {
      this.logger.error('Error handling location in emergency:', error);
      return false;
    }
  }

  async getEmergencyReportById(id: number): Promise<EmergencyReport | null> {
    try {
      const report = await this.emergencyRepository.findOne({ 
        where: { id },
        relations: ['user'] // Include user relation if needed
      });
      return report;
    } catch (error) {
      this.logger.error(`Error getting emergency report by ID ${id}:`, error);
      return null;
    }
  }

  // Complete and save emergency report
  private async completeEmergencyReport(phoneNumber: string, session: EmergencySession): Promise<void> {
    try {
      this.logger.log(`Completing emergency report for ${phoneNumber}`);

      // Combine description with additional notes if any
      let fullDescription = session.data.description || '';
      if (session.data.additionalNotes && session.data.additionalNotes.length > 0) {
        fullDescription += '\n\nAdditional Notes:\n' + session.data.additionalNotes.join('\n');
      }

      // Check for blood/bleeding keywords in description and ensure medical departments are added
      if (this.containsBloodKeywords(fullDescription)) {
        this.logger.log(`Blood keywords detected, adding medical departments`);
        const medicalDepartments = this.departmentRouting.routeEmergency(
          EmergencyType.MEDICAL,
          EmergencyPriority.HIGH
        );
        
        if (!session.data.assignedDepartmentsList) {
          session.data.assignedDepartmentsList = [];
        }
        
        medicalDepartments.departments.forEach(dept => {
          if (!session.data.assignedDepartmentsList!.includes(dept)) {
            session.data.assignedDepartmentsList!.push(dept);
          }
        });
      }

      // Check for fire hazard keywords in description and ensure fire departments are added
      if (this.containsFireHazardKeywords(fullDescription)) {
        this.logger.log(`Fire hazard keywords detected, adding fire departments`);
        const fireDepartments = this.departmentRouting.routeEmergency(
          EmergencyType.FIRE,
          EmergencyPriority.HIGH
        );
        
        if (!session.data.assignedDepartmentsList) {
          session.data.assignedDepartmentsList = [];
        }
        
        fireDepartments.departments.forEach(dept => {
          if (!session.data.assignedDepartmentsList!.includes(dept)) {
            session.data.assignedDepartmentsList!.push(dept);
          }
        });
      }

      // Find user if registered
      let user: User | null = null;
      try {
        const hashedPhone = await this.hashPhoneNumber(phoneNumber);
        user = await this.userRepository.findOne({ where: { phoneNumber: hashedPhone } });
      } catch (error) {
        this.logger.debug('User not found or not registered, proceeding with anonymous report');
      }

      // Prepare media URLs for JSON storage
      const mediaUrls = session.data.mediaUrls || [];
      const mediaFiles = session.data.mediaFiles || [];
      const additionalNotes = session.data.additionalNotes || [];
      
      // // Get assigned departments (now using the accumulated list)
      // const assignedDepartmentsList = session.data.assignedDepartmentsList || [];

      // Get assigned departments using the routing service
      let assignedDepartmentsResult: AssignedDepartments;

      if (session.data.type) {
        assignedDepartmentsResult = this.departmentRouting.routeEmergency(
          session.data.type,
          session.data.priority || EmergencyPriority.MEDIUM
        );
      } else {
        assignedDepartmentsResult = {
          primary: 'General Emergency',
          secondary: [],
          departments: []
        };
      }
      
      // // Determine primary department (first in list or based on original type)
      // const primaryDepartment = session.data.type ? 
      //   this.departmentRouting.routeEmergency(session.data.type, session.data.priority || EmergencyPriority.MEDIUM).primary :
      //   (assignedDepartmentsList.length > 0 ? assignedDepartmentsList[0] : 'General Emergency');

      // Merge with any additional departments from blood/fire detection
        const allDepartments = new Set<string>([
          ...assignedDepartmentsResult.departments,
          ...(session.data.assignedDepartmentsList || [])
        ]);

        // Ensure primary department is included
        if (assignedDepartmentsResult.primary && !allDepartments.has(assignedDepartmentsResult.primary)) {
          allDepartments.add(assignedDepartmentsResult.primary);
        }

        const finalDepartmentsList = Array.from(allDepartments);
        const primaryDepartment = assignedDepartmentsResult.primary || finalDepartmentsList[0] || 'General Emergency';


      // Create emergency report with JSON fields
      const emergencyReportData = {
        ...session.data,
        description: fullDescription,
        user: user || null,
        reportingPhoneNumber: phoneNumber,
        latitude: session.data.latitude || 0,
        longitude: session.data.longitude || 0,
        assignedDepartment: primaryDepartment,
        assignedDepartmentsJson: JSON.stringify(finalDepartmentsList), // Store all departments
        mediaUrlsJson: JSON.stringify(mediaUrls),
        mediaFilesJson: JSON.stringify(mediaFiles),
        additionalNotesJson: JSON.stringify(additionalNotes),

        // Add blood detection metadata if present
        bloodDetectedJson: session.data.bloodDetected ? 
          JSON.stringify(session.data.bloodDetected) : null,
        
        // Add fire hazard detection metadata if present
        fireHazardDetectedJson: session.data.fireHazardDetected ? 
          JSON.stringify(session.data.fireHazardDetected) : null,
        
        // Track if type was upgraded
        wasTypeUpgraded: !!(session.data.bloodDetected || session.data.fireHazardDetected),
        originalType: session.data.bloodDetected?.originalType || session.data.fireHazardDetected?.originalType,
        
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create and save the report
      const emergencyReport = this.emergencyRepository.create(emergencyReportData);
      const savedReport = await this.emergencyRepository.save(emergencyReport);

      // Check for consolidation
      const consolidationMatch = await this.consolidationService.checkForConsolidation(
        'EMERGENCY',
        {
          type: session.data.type,
          priority: session.data.priority,
          description: fullDescription,
          location: session.data.location,
          latitude: session.data.latitude,
          longitude: session.data.longitude
        }
      );

      const consolidationResult = await this.consolidationService.consolidateReport(
        'EMERGENCY',
        savedReport.id,
        {
          type: session.data.type,
          priority: session.data.priority,
          description: fullDescription,
          location: session.data.location,
          latitude: session.data.latitude,
          longitude: session.data.longitude
        },
        consolidationMatch
      );

      // Process with incident management
      const incidentResult = await this.incidentService.processReport(
        'EMERGENCY',
        savedReport.id,
        {
          type: session.data.type,
          priority: session.data.priority,
          description: fullDescription,
          location: session.data.location,
          latitude: session.data.latitude,
          longitude: session.data.longitude
        },
        phoneNumber
      );

      // Create notifications for all departments in the list
      await this.notificationService.createEmergencyNotifications(
        savedReport,
        finalDepartmentsList // Pass all departments
      );

      // Send confirmation message with department info
      const confirmationMessage = this.getConfirmationMessage(
        savedReport,
        session.data.type!,
        finalDepartmentsList,
        consolidationResult,
        incidentResult
      );

      // If verification is needed, add warning
      if (incidentResult.requiresVerification) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '\n⚠️ *ATTENTION:* This incident was previously marked as resolved. Authorities will verify if this is a new case or related issue.',
          session.messageID
        );
      }
      
      // Send the main confirmation message
      await this.messagingService.sendTextMessage(phoneNumber, confirmationMessage, session.messageID);

      // Update analytics
      await this.updateAllAnalytics();

      // Clean up sessions AFTER sending success message
      this.emergencySessions.delete(phoneNumber);
      await this.sessionManager.completeSession(phoneNumber, SessionType.EMERGENCY);

      this.logger.log(`Emergency report completed for ${phoneNumber}. Report ID: ${savedReport.id}`);

      // Send edit menu option
      setTimeout(async () => {
        await this.sendEditMenu(phoneNumber, savedReport.id, 'EMERGENCY', session.messageID);
      }, 2000);

    } catch (error:any) {
      this.logger.error('Error completing emergency report:', error);
      
      // Check if report was saved successfully - if error is not about already saved/duplicate
      if (!error.message?.includes('already saved') && !error.message?.includes('duplicate')) {
        // Check if we still have the session and it's valid
        const currentSession = this.emergencySessions.get(phoneNumber);
        if (currentSession) {
          await this.messagingService.sendTextMessage(
            phoneNumber,
            '❌ An error occurred while submitting your report. Please try again or call emergency services directly.',
            currentSession.messageID
          );
        }
      }

      // Clean up sessions on error
      this.emergencySessions.delete(phoneNumber);
      await this.sessionManager.cancelSession(phoneNumber, SessionType.EMERGENCY);
    }
  }

  // Add helper method to detect blood/bleeding keywords
  private containsBloodKeywords(text: string): boolean {
    const bloodKeywords = [
      'blood', 'bleeding', 'kubuda ropa', 'ropa', 'kujuja ropa', 
      'kukuvara', 'injured', 'injury', 'ronda', 'maronda', 
      'kuvadza', 'kuvadzwa', 'bleed', 'bleeds', 'bleeder',
      'cut', 'cuts', 'cutting', 'gash', 'laceration', 'wound',
      'hemorrhage', 'haemorrhage', 'blood loss', 'losing blood',
      'bloody', 'bloodied', 'profuse bleeding', 'severe bleeding'
    ];
    
    const normalizedText = text.toLowerCase();
    return bloodKeywords.some(keyword => normalizedText.includes(keyword));
  }

  // Add helper method to detect fire hazard keywords
  private containsFireHazardKeywords(text: string): boolean {
    const fireKeywords = [
      'fire', 'burning', 'smoke', 'flames', 'blaze', 'inferno',
      'burn', 'burns', 'burned', 'burnt', 'fire hazard',
      'kutsva', 'kupisa', 'moto', 'kupfuta', 'pfuta', 'chiutsi',
      'chivutsi', 'fire outbreak', 'fire emergency', 'fire incident',
      'forest fire', 'house fire', 'building fire', 'wildfire',
      '🔥', 'smoke inhalation', 'fire spreading', 'fire alarm',
      'fire extinguisher', 'fire department', 'fire brigade'
    ];
    
    const normalizedText = text.toLowerCase();
    return fireKeywords.some(keyword => normalizedText.includes(keyword));
  }

  // Add new method for edit menu
  private async sendEditMenu(
    phoneNumber: string,
    reportId: number,
    reportType: 'EMERGENCY' | 'ISSUE',
    messageID: string
  ): Promise<void> {
    const editMenu = this.editFeedbackService.getEditMenu(reportType, reportId);
    
    await this.messagingService.sendTextMessage(
      phoneNumber,
      editMenu,
      messageID
    );

    // Store edit session
    await this.sessionManager.createOrUpdateActiveSession(
      phoneNumber,
      SessionType.EDIT_FEEDBACK,
      1,
      {
        reportId,
        reportType,
        step: 'MENU',
        startedAt: new Date()
      },
      messageID
    );
  }

  // Get appropriate confirmation message based on emergency type
  private getConfirmationMessage(
    report: EmergencyReport,
    emergencyType: EmergencyType,
    assignedDepartments: string[],
    consolidationResult?: {
      consolidation: ReportConsolidation;
      isNew: boolean;
      matchDetails?: ConsolidationMatch;
    },
    incidentResult?: {
      incidentGroup: IncidentGroup;
      isNewIncident: boolean;
      analytics: IncidentAnalytics;
      requiresVerification: boolean;
    }
  ): string {
    const departmentList = assignedDepartments.map(dept => `• ${dept}`).join('\n');
    
    let baseMessage = `🚨 *EMERGENCY REPORT SUBMITTED* 🚨\n\n` +
      `Your emergency report has been received and help is on the way!\n\n` +
      `📋 *Report Details:*\n` +
      `• Type: ${emergencyType}\n` +
      `• Priority: ${report.priority}\n` +
      `• Location: ${report.location}\n` +
      `• Reference: #EM${report.id.toString().padStart(6, '0')}\n\n` +
      `🏢 *Notified Authorities:*\n${departmentList}\n\n`;
      
      // Add consolidation info if applicable
      if (consolidationResult) {
        if (consolidationResult.isNew) {
          baseMessage += `📊 *New Incident Created*\n`;
        } else {
          baseMessage += `📊 *Incident Update*\n` +
            `• This report has been added to existing incident #${consolidationResult.consolidation.id}\n` +
            `• Total reports for this incident: ${consolidationResult.consolidation.reportCount}\n`;
          
          if (consolidationResult.matchDetails) {
            baseMessage += `• Match confidence: ${consolidationResult.matchDetails.confidence}%\n`;
            if (consolidationResult.matchDetails.matchReasons.length > 0) {
              baseMessage += `• Match reasons: ${consolidationResult.matchDetails.matchReasons[0]}\n`;
            }
          }
        }
        baseMessage += '\n';
      }

      // Add incident grouping info
      if (incidentResult?.isNewIncident) {
        baseMessage += `📊 *New Incident Created*\n` +
          `• Incident ID: #${incidentResult.incidentGroup.id}\n` +
          `• You are the first reporter\n\n`;
      } else if (incidentResult) {
        baseMessage += `📊 *Incident Update*\n` +
          `• Added to existing incident #${incidentResult.incidentGroup.id}\n` +
          `• Total reports: ${incidentResult.incidentGroup.reportCount}\n` +
          `• Unique reporters: ${incidentResult.incidentGroup.uniqueReporters}\n`;
        
        // Add analytics if interesting
        const analytics = incidentResult.analytics;
        if (analytics.reportDensity && analytics.reportDensity > 2) {
          baseMessage += `• Report frequency: ${Math.round(analytics.reportDensity)} reports/hour\n`;
        }
        if (analytics.confidenceScores?.overall && analytics.confidenceScores.overall > 80) {
          baseMessage += `• Match confidence: ${analytics.confidenceScores.overall}%\n`;
        }
        baseMessage += '\n';
      }

      baseMessage += `🆘 *What to do next:*\n` +
        `1. Stay safe and follow emergency protocols\n` +
        `2. Keep your phone accessible for updates\n` +
        `3. Emergency services have been notified\n\n` +
        `📞 If this is a life-threatening emergency, please also call your local emergency number.\n\n` +
        `✏️ You can edit this report or add feedback by typing "EDIT ${report.id}"\n\n` +
        `Thank you for reporting!`;

      const typeSpecificAdvice = {
        [EmergencyType.FIRE]: `\n\n🔥 *FIRE SAFETY TIPS:*\n• Evacuate immediately if safe to do so\n• Alert others in the building\n• Do not use elevators\n• Stay low to avoid smoke inhalation`,
        [EmergencyType.AMBULANCE]: `\n\n🚑 *MEDICAL ASSISTANCE:*\n• Do not move the injured person unless necessary\n• Keep the person warm and comfortable\n• Have medical information ready if available`,
        [EmergencyType.ROBBERY]: `\n\n👮 *SAFETY ADVICE:*\n• Do not confront the suspects\n• Move to a safe location if possible\n• Note any distinguishing features\n• Cooperate if confronted, your safety comes first`,
        [EmergencyType.ACCIDENT]: `\n\n🚗 *ACCIDENT SCENE:*\n• Turn on hazard lights\n• Set up warning triangles if available\n• Do not move injured people\n• Watch for traffic hazards`,
        [EmergencyType.MEDICAL]: `\n\n🏥 *MEDICAL CARE:*\n• Stay with the person if safe\n• Monitor breathing and consciousness\n• Have any medications ready for paramedics`,
        [EmergencyType.CRIME]: `\n\n🚔 *CRIME SCENE:*\n• Move to a safe location\n• Do not touch anything at the scene\n• Note suspect descriptions and direction of travel`,
        [EmergencyType.NATURAL_DISASTER]: `\n\n🌪️ *DISASTER SAFETY:*\n• Follow local emergency broadcasts\n• Move to higher ground if flooding\n• Stay away from damaged structures`,
        [EmergencyType.OTHER]: `\n\n⚠️ *GENERAL SAFETY:*\n• Follow instructions from emergency services\n• Keep yourself and others safe\n• Stay alert to changing conditions`
      };

      return baseMessage + (typeSpecificAdvice[emergencyType] || typeSpecificAdvice[EmergencyType.OTHER]);
    }

  // Get user's emergency reports - UPDATED FOR JSON FIELDS
  async getUserEmergencyReports(phoneNumber: string, messageID: string): Promise<EmergencyReport[]> {
    try {
      let reports: EmergencyReport[] = [];

      // Hash phone number for user lookup
      const hashedPhone = await this.hashPhoneNumber(phoneNumber);
      const user = await this.userRepository.findOne({ 
        where: { phoneNumber: hashedPhone } 
      });

      if (user) {
        // Single query using QueryBuilder to get all relevant reports
        reports = await this.emergencyRepository
          .createQueryBuilder('report')
          .leftJoinAndSelect('report.user', 'user')
          .where('report.userId = :userId', { userId: user.id })
          .orWhere('(report.reportingPhoneNumber = :phoneNumber AND report.userId IS NULL)', { 
            phoneNumber 
          })
          .orderBy('report.createdAt', 'DESC')
          .take(10)
          .getMany();

        // Background process to link orphaned emergency reports for future queries
        this.linkOrphanedEmergencyReportsToUser(phoneNumber, user.id).catch(error => {
          this.logger.error('Background linking of emergency reports failed:', error);
        });

      } else {
        // User is not registered - only get reports by phone number
        reports = await this.emergencyRepository.find({
          where: { reportingPhoneNumber: phoneNumber },
          order: { createdAt: 'DESC' },
          take: 10
        });
      }

      if (reports.length === 0) {
        const message = user 
          ? "🚨 You haven't submitted any emergency reports yet.\n\nSend 'EMERGENCY' to report an emergency situation."
          : "🚨 You haven't submitted any emergency reports yet, or your reports were submitted as a guest.\n\nSend 'EMERGENCY' to report an emergency situation.";
        
        await this.messagingService.sendTextMessage(phoneNumber, message, messageID);
        return reports;
      }

      let reportsMessage = `🚨 *Your Emergency Reports (${reports.length})*\n\n`;

      reports.forEach((report, index) => {
        // Fixed status emoji mapping with correct EmergencyStatus values
        const statusEmoji: { [key in EmergencyStatus]: string } = {
          [EmergencyStatus.REPORTED]: '📝',
          [EmergencyStatus.IN_PROGRESS]: '🔄',
          [EmergencyStatus.DISPATCHED]: '🚗',
          [EmergencyStatus.RESOLVED]: '✅',
          [EmergencyStatus.CANCELLED]: '❌'
        };

        const priorityEmoji: { [key in EmergencyPriority]: string } = {
          [EmergencyPriority.LOW]: '🟢',
          [EmergencyPriority.MEDIUM]: '🟡',
          [EmergencyPriority.HIGH]: '🟠',
          [EmergencyPriority.CRITICAL]: '🔴'
        };

        // Get media count from JSON
        const mediaCount = report.mediaUrls ? report.mediaUrls.length : 0;
        
        // Get departments from JSON
        const departments = report.assignedDepartments ? 
          (typeof report.assignedDepartments === 'string' ? 
            JSON.parse(report.assignedDepartments).length : 0) : 0;

        reportsMessage += `*${index + 1}. ${statusEmoji[report.status]} ${report.type}*\n`;
        reportsMessage += `   ${priorityEmoji[report.priority]} Priority: ${report.priority}\n`;
        reportsMessage += `   🆔 #EM${report.id.toString().padStart(6, '0')}\n`;
        reportsMessage += `   📅 ${report.createdAt.toLocaleDateString()}\n`;
        reportsMessage += `   📍 ${report.location || 'Location not specified'}\n`;
        reportsMessage += `   📸 Media files: ${mediaCount}\n`;
        reportsMessage += `   🏢 Departments notified: ${departments}\n`;
        
        if (report.status === EmergencyStatus.RESOLVED && report.resolvedAt) {
          reportsMessage += `   ✅ Resolved: ${report.resolvedAt.toLocaleDateString()}\n`;
        }
        
        reportsMessage += '\n';
      });

      if (!user) {
        reportsMessage += "💡 *Register your account to:*\n• Track all your emergency reports in one place\n• Get real-time status updates\n• Receive priority response\n• Access historical data\n\nSend 'REGISTER' to get started!";
      }

      await this.messagingService.sendTextMessage(phoneNumber, reportsMessage, messageID);
      return reports;
    } catch (error) {
      this.logger.error('Error fetching user emergency reports:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Failed to fetch your emergency reports. Please try again later.',
        messageID
      );
      return [];
    }
  }

  // Link orphaned emergency reports to user account
  private async linkOrphanedEmergencyReportsToUser(phoneNumber: string, userId: number): Promise<void> {
    try {
      // Find all emergency reports with this phone number that aren't linked to any user
      const orphanedReports = await this.emergencyRepository
        .createQueryBuilder('report')
        .where('report.reportingPhoneNumber = :phoneNumber', { phoneNumber })
        .andWhere('report.userId IS NULL')
        .getMany();

      if (orphanedReports.length > 0) {
        // Update these reports to link them to the user
        await this.emergencyRepository
          .createQueryBuilder()
          .update(EmergencyReport)
          .set({ user: { id: userId } })
          .where('reportingPhoneNumber = :phoneNumber', { phoneNumber })
          .andWhere('userId IS NULL')
          .execute();

        this.logger.log(`Linked ${orphanedReports.length} orphaned emergency reports to user ${userId}`);
      }
    } catch (error) {
      this.logger.error('Error linking orphaned emergency reports to user:', error);
      // Don't throw error - this is a background process
    }
  }

  // Helper method to hash phone numbers
  private async hashPhoneNumber(phoneNumber: string): Promise<string> {
      const salt = process.env.PHONE_HASH_SALT || 'default-salt';
      const normalizedPhone = phoneNumber.replace(/\D/g, '');
      return crypto.createHmac('sha256', salt).update(normalizedPhone).digest('hex');
    }

  // Cleanup old sessions
  cleanupOldSessions(): void {
    const now = Date.now();
    for (const [phoneNumber, session] of this.emergencySessions.entries()) {
      if (now - session.lastActive > this.SESSION_TTL) {
        this.emergencySessions.delete(phoneNumber);
        this.logger.log(`Cleaned up expired emergency session for ${phoneNumber}`);

        // Also clean up database session
        this.sessionManager.cancelSession(phoneNumber, SessionType.EMERGENCY)
          .catch(error => this.logger.error('Error cleaning up database emergency session:', error));
      }
    }
  }

  async createEmergencyReport(reportData: Partial<EmergencyReport>): Promise<EmergencyReport> {
    const report = this.emergencyRepository.create(reportData);
    const savedReport = await this.emergencyRepository.save(report);

    // Check for consolidation
    await this.consolidateReports(savedReport);

    // Update all analytics
    await this.updateAllAnalytics();

    return savedReport;
  }

  async consolidateReports(newReport: EmergencyReport): Promise<void> {
    if (!newReport.latitude || !newReport.longitude) return;

    const nearbyReports = await this.emergencyRepository
      .createQueryBuilder('report')
      .where('report.id != :id', { id: newReport.id })
      .andWhere('report.type = :type', { type: newReport.type })
      .andWhere('report.createdAt >= :time', { 
        time: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
      })
      .andWhere(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(report.latitude)) * 
        cos(radians(report.longitude) - radians(:lng)) + 
        sin(radians(:lat)) * sin(radians(report.latitude)))) < :distance`,
        {
          lat: newReport.latitude,
          lng: newReport.longitude,
          distance: 0.01 // ~10 meters
        }
      )
      .getMany();

    if (nearbyReports.length > 0) {
      // Mark as consolidated
      newReport.isConsolidated = true;
      newReport.consolidatedReportId = nearbyReports[0].id;
      await this.emergencyRepository.save(newReport);
      
      // Update location analytics for consolidated reports
      await this.updateLocationAnalytics(newReport.latitude, newReport.longitude, newReport.type);
    }
  }

  async updateReportStatus(id: number, status: EmergencyStatus, adminNotes?: string): Promise<EmergencyReport> {
    const report = await this.emergencyRepository.findOne({ where: { id } });
    
    if (!report) {
      throw new Error('Report not found');
    }

    report.status = status;
    report.adminNotes = adminNotes!;

    if (status === EmergencyStatus.DISPATCHED) {
      report.dispatchedAt = new Date();
    } else if (status === EmergencyStatus.RESOLVED) {
      report.resolvedAt = new Date();
      // Update analytics when report is resolved
      await this.updateDepartmentAnalytics(report);
    }

    const updatedReport = await this.emergencyRepository.save(report);
    
    // Update analytics after status change
    await this.updateAllAnalytics();

    return updatedReport;
  }

  async assignToDepartment(id: number, department: string, unit: string): Promise<EmergencyReport> {
    const report = await this.emergencyRepository.findOne({ where: { id } });
    
    if (!report) {
      throw new Error('Report not found');
    }

    report.assignedDepartment = department;
    report.assignedUnit = unit;
    report.status = EmergencyStatus.DISPATCHED;
    report.dispatchedAt = new Date();

    const updatedReport = await this.emergencyRepository.save(report);
    
    // Update department analytics
    await this.updateDepartmentAnalytics(updatedReport);

    return updatedReport;
  }

  async addUserFeedback(id: number, feedback: string, rating: number): Promise<EmergencyReport> {
    const report = await this.emergencyRepository.findOne({ where: { id } });
    
    if (!report) {
      throw new Error('Report not found');
    }

    report.userFeedback = feedback;
    report.rating = rating;

    const updatedReport = await this.emergencyRepository.save(report);
    
    // Update analytics with user feedback
    await this.updateAllAnalytics();

    return updatedReport;
  }

  async getDashboardStats() {
    const totalReports = await this.emergencyRepository.count();
    const activeReports = await this.emergencyRepository.count({ 
      where: { status: EmergencyStatus.REPORTED } 
    });
    const resolvedReports = await this.emergencyRepository.count({ 
      where: { status: EmergencyStatus.RESOLVED } 
    });

    const reportsByType = await this.emergencyRepository
      .createQueryBuilder('report')
      .select('report.type, COUNT(*) as count')
      .groupBy('report.type')
      .getRawMany();

    const averageResolutionTime = await this.emergencyRepository
      .createQueryBuilder('report')
      .select('AVG(DATEDIFF(MINUTE, report.createdAt, report.resolvedAt)) as avgTime')
      .where('report.resolvedAt IS NOT NULL')
      .getRawOne();

    const averageRating = await this.emergencyRepository
      .createQueryBuilder('report')
      .select('AVG(report.rating) as avgRating')
      .where('report.rating > 0')
      .getRawOne();

    return {
      totalReports,
      activeReports,
      resolvedReports,
      reportsByType,
      averageResolutionTime: averageResolutionTime?.avgTime || 0,
      averageRating: averageRating?.avgRating || 0
    };
  }

  async getLocationAnalytics(): Promise<any> {
    const locations = await this.locationAnalyticsRepository.find({
      order: { reportCount: 'DESC' },
      take: 10
    });

    const heatmapData = await this.emergencyRepository
      .createQueryBuilder('report')
      .select(['latitude', 'longitude', 'type', 'COUNT(*) as count'])
      .groupBy('latitude, longitude, type')
      .getRawMany();

    return { locations, heatmapData };
  }

  async getUserAnalytics(): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userAnalytics = await this.userAnalyticsRepository.find({
      where: {
        date: MoreThanOrEqual(thirtyDaysAgo)
      },
      order: { date: 'ASC' }
    });

    return userAnalytics;
  }

  async getDepartmentAnalytics(): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const departmentAnalytics = await this.departmentAnalyticsRepository.find({
      where: {
        date: MoreThanOrEqual(thirtyDaysAgo)
      },
      order: { date: 'ASC', department: 'ASC' }
    });

    return departmentAnalytics;
  }

  private async updateAllAnalytics(): Promise<void> {
    await this.updateDailyAnalytics();
    await this.updateUserAnalytics();
  }

  private async updateDailyAnalytics(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await this.analyticsRepository.findOne({ 
      where: { date: today } 
    });

    if (!analytics) {
      analytics = this.analyticsRepository.create({ date: today });
    }

    // Update analytics data with comprehensive stats
    const stats = await this.getDashboardStats();
    
    // Set type-specific counts
    analytics.fireReports = stats.reportsByType.find(r => r.type === EmergencyType.FIRE)?.count || 0;
    analytics.ambulanceReports = stats.reportsByType.find(r => r.type === EmergencyType.AMBULANCE)?.count || 0;
    analytics.robberyReports = stats.reportsByType.find(r => r.type === EmergencyType.ROBBERY)?.count || 0;
    analytics.accidentReports = stats.reportsByType.find(r => r.type === EmergencyType.ACCIDENT)?.count || 0;
    analytics.medicalReports = stats.reportsByType.find(r => r.type === EmergencyType.MEDICAL)?.count || 0;
    analytics.crimeReports = stats.reportsByType.find(r => r.type === EmergencyType.CRIME)?.count || 0;
    analytics.naturalDisasterReports = stats.reportsByType.find(r => r.type === EmergencyType.NATURAL_DISASTER)?.count || 0;
    analytics.otherReports = stats.reportsByType.find(r => r.type === EmergencyType.OTHER)?.count || 0;
    
    // Set general stats
    analytics.totalReports = stats.totalReports;
    analytics.emergencyReports = stats.totalReports; // Assuming all are emergency reports in this service
    analytics.resolvedReports = stats.resolvedReports;
    analytics.averageResolutionTime = stats.averageResolutionTime;
    analytics.averageRating = stats.averageRating;

    await this.analyticsRepository.save(analytics);
  }

  private async updateLocationAnalytics(latitude: number, longitude: number, type: EmergencyType): Promise<void> {
    const areaName = await this.getAreaName(latitude, longitude);
    const today = new Date();
    const periodStart = new Date(today);
    periodStart.setDate(periodStart.getDate() - 7); // Weekly period

    let locationAnalytics = await this.locationAnalyticsRepository.findOne({
      where: {
        latitude: Math.round(latitude * 1000000) / 1000000, // Round to 6 decimal places for grouping
        longitude: Math.round(longitude * 1000000) / 1000000,
        periodStart: Between(periodStart, today)
      }
    });

    if (!locationAnalytics) {
      locationAnalytics = this.locationAnalyticsRepository.create({
        latitude: Math.round(latitude * 1000000) / 1000000,
        longitude: Math.round(longitude * 1000000) / 1000000,
        areaName,
        periodStart,
        periodEnd: today
      });
    }

    // Update counts based on type
    locationAnalytics.reportCount += 1;
    locationAnalytics.emergencyCount += 1;

    switch (type) {
      case EmergencyType.FIRE:
        locationAnalytics.fireCount += 1;
        break;
      case EmergencyType.AMBULANCE:
      case EmergencyType.MEDICAL:
        locationAnalytics.medicalCount += 1;
        break;
      case EmergencyType.ROBBERY:
      case EmergencyType.CRIME:
        locationAnalytics.crimeCount += 1;
        break;
      case EmergencyType.ACCIDENT:
        locationAnalytics.accidentCount += 1;
        break;
    }

    await this.locationAnalyticsRepository.save(locationAnalytics);
  }

  private async updateUserAnalytics(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let userAnalytics = await this.userAnalyticsRepository.findOne({
      where: { date: today }
    });

    if (!userAnalytics) {
      userAnalytics = this.userAnalyticsRepository.create({ date: today });
    }

    // Calculate user statistics
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.emergencyRepository
      .createQueryBuilder('report')
      .select('COUNT(DISTINCT report.userId) as activeUsers')
      .where('report.createdAt >= :date', { date: today })
      .getRawOne();

    userAnalytics.totalUsers = totalUsers;
    userAnalytics.activeUsers = parseInt(activeUsers?.activeUsers) || 0;
    
    // Calculate reports per user
    if (totalUsers > 0) {
      userAnalytics.reportsPerUser = userAnalytics.activeUsers > 0 ? 
        Math.round((userAnalytics.activeUsers / totalUsers) * 100) / 100 : 0;
    }

    await this.userAnalyticsRepository.save(userAnalytics);
  }

  private async updateDepartmentAnalytics(report: EmergencyReport): Promise<void> {
    if (!report.assignedDepartment) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let departmentAnalytics = await this.departmentAnalyticsRepository.findOne({
      where: {
        department: report.assignedDepartment,
        date: today
      }
    });

    if (!departmentAnalytics) {
      departmentAnalytics = this.departmentAnalyticsRepository.create({
        department: report.assignedDepartment,
        date: today
      });
    }

    departmentAnalytics.assignedReports += 1;

    if (report.status === EmergencyStatus.RESOLVED) {
      departmentAnalytics.resolvedReports += 1;
      
      // Calculate resolution time in minutes
      if (report.createdAt && report.resolvedAt) {
        const resolutionTime = (report.resolvedAt.getTime() - report.createdAt.getTime()) / (1000 * 60);
        
        // Update average resolution time
        if (departmentAnalytics.averageResolutionTime === 0) {
          departmentAnalytics.averageResolutionTime = resolutionTime;
        } else {
          departmentAnalytics.averageResolutionTime = 
            (departmentAnalytics.averageResolutionTime + resolutionTime) / 2;
        }
      }

      // Update average rating
      if (report.rating > 0) {
        if (departmentAnalytics.averageRating === 0) {
          departmentAnalytics.averageRating = report.rating;
        } else {
          departmentAnalytics.averageRating = 
            (departmentAnalytics.averageRating + report.rating) / 2;
        }
      }
    }

    await this.departmentAnalyticsRepository.save(departmentAnalytics);
  }

  private async getAreaName(latitude: number, longitude: number): Promise<string> {
        // Try Google Maps first, fallback to OpenStreetMap, then to cached/local data
        try {
            // Primary: Google Maps Geocoding
            return await this.getAreaNameFromGoogleMaps(latitude, longitude);
        } catch (googleError) {
            this.logger.warn('Google Maps geocoding failed, trying OpenStreetMap:', googleError);
            
            try {
            // Secondary: OpenStreetMap Nominatim
            return await this.getAreaNameFromOpenStreetMap(latitude, longitude);
            } catch (osmError) {
            this.logger.warn('OpenStreetMap geocoding failed, using cached/local data:', osmError);
            
            // Tertiary: Check if we have cached area name
            return await this.getCachedAreaName(latitude, longitude);
            }
        }
    }

    private async getAreaNameFromGoogleMaps(latitude: number, longitude: number): Promise<string> {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            throw new Error('Google Maps API key not configured');
        }

        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            const result = data.results[0];
            const addressComponents = result.address_components;
            
            // Priority order for area names
            const areaTypes = [
            'neighborhood',
            'sublocality',
            'sublocality_level_1',
            'locality',
            'administrative_area_level_2',
            'route',
            'administrative_area_level_1'
            ];

            for (const type of areaTypes) {
            const component = addressComponents.find(comp => comp.types.includes(type));
            if (component) {
                return component.long_name;
            }
            }

            // Fallback to first part of formatted address
            return result.formatted_address.split(',')[0];
        } else {
            throw new Error(`Google Maps geocoding failed: ${data.status}`);
        }
    }

    private async getAreaNameFromOpenStreetMap(latitude: number, longitude: number): Promise<string> {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`;
        
        const response = await fetch(url, {
            headers: {
            'User-Agent': 'EmergencyReportingSystem/1.0 (contact@yourapp.com)'
            }
        });
        
        const data = await response.json();

        if (data && data.address) {
            const address = data.address;
            
            // Priority order for area names
            const areaFields = [
            'neighbourhood',
            'suburb',
            'village',
            'town',
            'city',
            'municipality',
            'county',
            'road',
            'state'
            ];

            for (const field of areaFields) {
            if (address[field]) {
                return address[field];
            }
            }

            return data.display_name.split(',')[0];
        } else {
            throw new Error('OpenStreetMap geocoding failed');
        }
    }

    private async getCachedAreaName(latitude: number, longitude: number): Promise<string> {
        // Check if we have this location in our database cache
        const cachedLocation = await this.locationAnalyticsRepository.findOne({
            where: {
            latitude: Math.round(latitude * 100000) / 100000, // 5 decimal precision
            longitude: Math.round(longitude * 100000) / 100000
            }
        });

        if (cachedLocation && cachedLocation.areaName && !cachedLocation.areaName.startsWith('Area_')) {
            return cachedLocation.areaName;
        }

        // Final fallback - use major city based on coordinates
        return await this.getMajorCityName(latitude, longitude);
    }

    private async getMajorCityName(latitude: number, longitude: number): Promise<string> {
        // For Zimbabwe coordinates, return approximate city names
        // This is a simplified implementation for demonstration
        const cities = [
            { name: "Harare", lat: -17.8292, lng: 31.0539, radius: 0.5 },
            { name: "Bulawayo", lat: -20.1325, lng: 28.6265, radius: 0.5 },
            { name: "Chitungwiza", lat: -18.0000, lng: 31.1000, radius: 0.3 },
            { name: "Mutare", lat: -18.9667, lng: 32.6333, radius: 0.4 },
            { name: "Gweru", lat: -19.4500, lng: 29.8167, radius: 0.4 },
            { name: "Kwekwe", lat: -18.9167, lng: 29.8167, radius: 0.3 },
            { name: "Kadoma", lat: -18.3333, lng: 29.9167, radius: 0.3 },
            { name: "Masvingo", lat: -20.0667, lng: 30.8333, radius: 0.4 }
        ];

        for (const city of cities) {
            const distance = this.calculateDistance(latitude, longitude, city.lat, city.lng);
            if (distance <= city.radius) {
            return city.name;
            }
        }

        // Ultimate fallback
        return `Area_${Math.round(latitude * 1000)}_${Math.round(longitude * 1000)}`;
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
}