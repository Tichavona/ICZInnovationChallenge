/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */

import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IssueReport, IssueType, IssueStatus } from '../../../database/issue-report.entity';
import { User } from '../../../database/user.entity';
import { MessagingService } from '../messaging/messaging.service';
import { StorageService } from "../storage.service"
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { DepartmentRoutingService } from '../department-routing.service';
import { NotificationService } from '../notification.service';
import { EditFeedbackService } from '../edit/edit-feedback.service';
import { ReportConsolidationService } from '../report-consolidation.service';
import { SessionManagerService } from '../session-manager.service';  
import { join } from 'path';
import * as crypto from 'crypto';
import { SessionType } from '../../../database/session.entity';

interface UserReportingSession {
  phoneNumber: string;
  currentStep: number;
  issueType: IssueType;
  data: {
    description?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    imageUrl?: string;
    voiceNoteUrl?: string;
    videoUrl?: string;
    mediaUrls?: string[];
  };
  lastActive: number;
  messageID?: string;
}

@Injectable()
export class IssueReportingService {
  private readonly logger = new Logger(IssueReportingService.name);
  private readonly reportingSessions = new Map<string, UserReportingSession>();
  private readonly SESSION_TTL = 30 * 60 * 1000; // 30 minutes

  // Add media storage directories
  private readonly baseDir = 'C:/Users/ACER/Documents/CourseGenerator/chatbot/uploads';
  private readonly issueImagesDir = join(this.baseDir, 'issue_images');
  private readonly issueVoiceNotesDir = join(this.baseDir, 'issue_voice_notes');
  private readonly issueVideosDir = join(this.baseDir, 'issue_videos');

  constructor(
    @InjectRepository(IssueReport)
    private issueReportRepository: Repository<IssueReport>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly messagingService: MessagingService,
    private readonly departmentRouting: DepartmentRoutingService,
    private readonly notificationService: NotificationService,
    private readonly editFeedbackService: EditFeedbackService,
    @Inject(forwardRef(() => ReportConsolidationService))
    private readonly consolidationService: ReportConsolidationService,
    private readonly sessionManager: SessionManagerService,
    private readonly storageService: StorageService,
  ) {
    this.ensureMediaDirs();
  }

  private ensureMediaDirs() {
    try {
      if (!existsSync(this.baseDir)) mkdirSync(this.baseDir);
      if (!existsSync(this.issueImagesDir)) mkdirSync(this.issueImagesDir);
      if (!existsSync(this.issueVoiceNotesDir)) mkdirSync(this.issueVoiceNotesDir);
      if (!existsSync(this.issueVideosDir)) mkdirSync(this.issueVideosDir);
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

  private async saveMediaFile(buffer: Buffer, phoneNumber: string, mediaType: 'image' | 'voice' | 'video', originalMimeType: string): Promise<string> {
    try {
      const timestamp = Date.now();
      const extension = this.getFileExtensionFromMimeType(originalMimeType);
      
      let filename: string;
      let dir: string;

      switch (mediaType) {
        case 'image':
          filename = `issue_image_${phoneNumber}_${timestamp}.${extension}`;
          dir = this.issueImagesDir;
          break;
        case 'voice':
          filename = `issue_voice_${phoneNumber}_${timestamp}.${extension}`;
          dir = this.issueVoiceNotesDir;
          break;
        case 'video':
          filename = `issue_video_${phoneNumber}_${timestamp}.${extension}`;
          dir = this.issueVideosDir;
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

  async handleIssueReporting(phoneNumber: string, message: string, messageID: string): Promise<boolean> {
    const normalizedMessage = message.toLowerCase().trim();

    // Check if user is in active reporting session
    const activeSession = this.reportingSessions.get(phoneNumber);
    if (activeSession) {
      return this.handleReportingStepInner(phoneNumber, normalizedMessage, activeSession, messageID);
    }

    // Check for issue keywords
    if (this.containsIssueKeywords(normalizedMessage)) {
      const issueType = this.detectIssueType(normalizedMessage);
      return this.startReportingFlow(phoneNumber, issueType, messageID);
    }

    return false;
  }

  async getReportingSession(phoneNumber: string): Promise<UserReportingSession | null> {
    return this.reportingSessions.get(phoneNumber) || null;
  }

  async cancelReportingSession(phoneNumber: string): Promise<void> {
    this.reportingSessions.delete(phoneNumber);
  }

  async hasActiveReportingSession(phoneNumber: string): Promise<boolean> {
    const reportingSession = this.reportingSessions.get(phoneNumber);
    if (!reportingSession) return false;
    
    const isActive = (Date.now() - reportingSession.lastActive) < this.SESSION_TTL;
    if (!isActive) {
      this.reportingSessions.delete(phoneNumber);
      return false;
    }
    return true;
  }

  private containsIssueKeywords(message: string): boolean {
    const keywords = {
      [IssueType.POTHOLE]: ['pothole', 'potholes', 'road damage', 'road repair'],
      [IssueType.LITTER]: ['litter', 'garbage', 'trash', 'rubbish', 'dumping'],
      [IssueType.SEWER]: ['sewer', 'drainage', 'blocked drain', 'sewage'],
      [IssueType.WATER_PIPE_BURST]: ['water pipe burst', 'burst pipe', 'water leak', 'broken pipe']
    };

    return Object.values(keywords).some(keywordList => 
      keywordList.some(keyword => message.includes(keyword))
    );
  }

  private detectIssueType(message: string): IssueType {
    if (message.includes('pothole')) return IssueType.POTHOLE;
    if (message.includes('litter') || message.includes('garbage') || message.includes('trash')) return IssueType.LITTER;
    if (message.includes('sewer') || message.includes('drainage')) return IssueType.SEWER;
    if (message.includes('water pipe burst') || message.includes('burst pipe')) return IssueType.WATER_PIPE_BURST;
    return IssueType.OTHER;
  }

  /**
   * Start issue report with NLP context
   */
  async startIssueReportWithContext(
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
      // Map detected type to IssueType
      const issueType = this.mapNlpTypeToIssueType(context.detectedType);
      
      const session: UserReportingSession = {
        phoneNumber,
        currentStep: 2, // Skip type selection since we detected it
        issueType,
        data: {
          description: `NLP Detected: ${context.originalMessage}\nIssue Type: ${context.detectedType}\nConfidence: ${context.confidence}\nKeywords: ${context.keywords.join(', ')}`
        },
        lastActive: Date.now()
      };

      this.reportingSessions.set(phoneNumber, session);

      const issueTitles = {
        [IssueType.POTHOLE]: 'pothole',
        [IssueType.LITTER]: 'littered area',
        [IssueType.SEWER]: 'sewer issue',
        [IssueType.WATER_PIPE_BURST]: 'burst water pipe',
        [IssueType.OTHER]: 'issue'
      };

      const welcomeMessage = `📝 *Issue Detected: ${issueTitles[issueType].toUpperCase()}* 📝\n\nI understand you're reporting a ${context.detectedType} issue.\n\n📍 *Step 2/4:* Please provide the location (street name, area, or landmark):`;

      return await this.messagingService.sendTextMessage(phoneNumber, welcomeMessage, messageID);
    } catch (error) {
      this.logger.error('Error starting issue report with context:', error);
      // Fallback to regular issue flow
      return await this.startIssueReport(phoneNumber, messageID);
    }
  }

  /**
   * Start regular issue report (for REPORT command)
   */
  async startIssueReport(phoneNumber: string, messageID: string): Promise<boolean> {
    try {
      const session: UserReportingSession = {
        phoneNumber,
        currentStep: 1,
        issueType: IssueType.OTHER, // Default type, will be determined in step 1
        data: {},
        lastActive: Date.now()
      };

      this.reportingSessions.set(phoneNumber, session);

      const welcomeMessage = `📝 *Citizen Reporting* 📝\n\nI'll help you report an issue. Please follow the steps:\n\n1. *Describe the issue* - What problem are you reporting?\n2. *Location* - Where is this located?\n3. *Coordinates* - Share your location or describe precisely\n4. *Media* - Upload photos, videos or send voice notes\n\n*Step 1/4:* Please describe the issue in detail:`;

      return await this.messagingService.sendTextMessage(phoneNumber, welcomeMessage, messageID);
    } catch (error) {
      this.logger.error('Error starting issue report:', error);
      return false;
    }
  }

  /**
   * Map NLP detected type to IssueType enum
   */
  private mapNlpTypeToIssueType(nlpType: string): IssueType {
    const typeMap: { [key: string]: IssueType } = {
      'water': IssueType.WATER_PIPE_BURST,
      'sewerage': IssueType.SEWER,
      'electricity': IssueType.OTHER,
      'roads': IssueType.POTHOLE,
      'sanitation': IssueType.LITTER,
      'public': IssueType.OTHER,
      'noise': IssueType.OTHER,
      'general': IssueType.OTHER
    };

    return typeMap[nlpType] || IssueType.OTHER;
  }

  private async startReportingFlow(phoneNumber: string, issueType: IssueType, messageID: string): Promise<boolean> {
    const session: UserReportingSession = {
      phoneNumber,
      currentStep: 1,
      issueType,
      data: {},
      lastActive: Date.now()
    };

    this.reportingSessions.set(phoneNumber, session);

    const issueTitles = {
      [IssueType.POTHOLE]: 'pothole',
      [IssueType.LITTER]: 'littered area',
      [IssueType.SEWER]: 'sewer issue',
      [IssueType.WATER_PIPE_BURST]: 'burst water pipe',
      [IssueType.OTHER]: 'issue'
    };

    const welcomeMessage = `🚨 *Citizen Reporting - ${issueTitles[issueType].toUpperCase()}* 🚨

I'll help you report this issue. Please follow the steps:

1. *Describe the issue* - Provide details about what you're seeing
2. *Location* - Share the street name or area
3. *Coordinates* - Share your location or describe precisely
4. *Media* - Upload photos, videos or send voice notes

*Step 1/4:* Please describe the ${issueTitles[issueType]} in detail:`;

    return await this.messagingService.sendTextMessage(phoneNumber, welcomeMessage, messageID);
  }

  async handleReportingStep(phoneNumber: string, message: string, messageID: string): Promise<boolean> {
    const session = this.reportingSessions.get(phoneNumber);
    if (!session) return false;

    return this.handleReportingStepInner(phoneNumber, message, session, messageID);
  }

  private async handleReportingStepInner(
    phoneNumber: string, 
    message: string, 
    session: UserReportingSession, 
    messageID: string
  ): Promise<boolean> {
    try {
      if (this.isCancelCommand(message)) {
        await this.cancelReportingSession(phoneNumber);
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Issue reporting cancelled. You can start again by typing "REPORT".',
          messageID
        );
        return true;
      }

      session.lastActive = Date.now();

      switch (session.currentStep) {
        case 1: // Description
          session.data.description = message;
          session.currentStep = 2;
          return await this.messagingService.sendTextMessage(
            phoneNumber,
            '📍 *Step 2/4:* Please provide the location (street name, area, or landmark):',
            messageID
          );

        case 2: // Location
          session.data.location = message;
          session.currentStep = 3;
          return await this.messagingService.sendTextMessage(
            phoneNumber,
            '🗺️ *Step 3/4:* Please share your location or describe the exact coordinates. You can:\n\n• Share your live location\n• Or type coordinates like: -17.8292, 31.0539\n• Or describe the exact spot',
            messageID
          );

        case 3: // Coordinates
          // Try to parse coordinates from message
          const coords = this.parseCoordinates(message);
          if (coords) {
            session.data.latitude = coords.lat;
            session.data.longitude = coords.lng;
          }
          session.currentStep = 4;
          return await this.messagingService.sendTextMessage(
            phoneNumber,
            '📸 *Step 4/4:* Please upload a photo/video of the issue or send a voice note with additional details.\n\nIf you don\'t have media, type "skip" or "submit" to complete your report.',
            messageID
          );

        case 4: // Media or final submission
          const normalizedMessage = message.toLowerCase().trim();
          if (normalizedMessage === 'skip' || normalizedMessage === 'submit') {
            return await this.completeReport(phoneNumber, session, messageID);
          }
          // For media, we'll handle in controller
          return await this.messagingService.sendTextMessage(
            phoneNumber,
            'Please upload a photo, video or send a voice note, or type "skip" to submit without media.',
            messageID
          );
          
        default:
          return false;
      }
    } catch (error) {
      this.logger.error('Error handling reporting step:', error);
      return false;
    }
  }

  private parseCoordinates(message: string): { lat: number; lng: number } | null {
    // Try to parse coordinates like: -17.8292, 31.0539
    const coordRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
    const match = message.match(coordRegex);
    
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2])
      };
    }
    return null;
  }

  async handleMediaInReport(phoneNumber: string, mediaType: 'image' | 'voice' | 'video', mediaUrl: string, messageID: string, mimeType?: string): Promise<boolean> {
    const session = this.reportingSessions.get(phoneNumber);
    if (!session || session.currentStep !== 4) {
      return false;
    }

    try {
      // Download media from WhatsApp
      const mediaBuffer = await this.downloadMediaFromWhatsApp(mediaUrl);
      
      // Save to local file system
      const localFilePath = await this.saveMediaFile(mediaBuffer, phoneNumber, mediaType, mimeType || this.getDefaultMimeType(mediaType));

      // Update session with local file path
      if (mediaType === 'image') {
        session.data.imageUrl = localFilePath;
      } else if (mediaType === 'voice') {
        session.data.voiceNoteUrl = localFilePath;
      } else if (mediaType === 'video') {
        session.data.videoUrl = localFilePath;
      }

      this.reportingSessions.set(phoneNumber, session);

      // Update message to include video option
      return await this.messagingService.sendTextMessage(
        phoneNumber,
        `✅ ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} received! You can:\n• Upload another photo/video\n• Send another voice note\n• Or type "submit" to complete your report`,
        messageID
      );
    } catch (error) {
      this.logger.error(`Error handling ${mediaType} in report:`, error);
      return await this.messagingService.sendTextMessage(
        phoneNumber,
        `❌ Failed to process your ${mediaType}. Please try again or type "submit" to continue without media.`,
        messageID
      );
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

  private getDefaultMimeType(mediaType: 'image' | 'voice' | 'video'): string {
    const defaultMimeTypes: { [key: string]: string } = {
      'image': 'image/jpeg',
      'voice': 'audio/ogg', 
      'video': 'video/mp4'
    };
    return defaultMimeTypes[mediaType];
  }

  async completeReport(phoneNumber: string, session: UserReportingSession, messageID?: string): Promise<boolean> {
    try {
      this.logger.log(`Completing report for ${phoneNumber}`);

      // Validate required fields
      if (!session.issueType || !session.data.description) {
        this.logger.error('Missing required fields for report completion');
        if (messageID) {
          await this.messagingService.sendTextMessage(phoneNumber, '❌ Report incomplete. Please provide both issue type and description.', messageID);
        }
        return false;
      }

      // Find user
      let user: User | null = null;
      try {
        const hashedPhone = await this.hashPhoneNumber(phoneNumber);
        user = await this.userRepository.findOne({ 
          where: { phoneNumber: hashedPhone } 
        });
      } catch (error) {
        this.logger.debug(`User not found for ${phoneNumber}, proceeding as guest`);
      }

      // Prepare media URLs
      const mediaUrls = session.data.mediaUrls || [];
      const mediaFiles = [];

      if (session.data.imageUrl) mediaUrls.push(session.data.imageUrl);
      if (session.data.voiceNoteUrl) mediaUrls.push(session.data.voiceNoteUrl);
      if (session.data.videoUrl) mediaUrls.push(session.data.videoUrl);

      // Get assigned departments
      const assignedDepartments = this.departmentRouting.routeIssue(session.issueType);

      // Create issue report with department info
      const issueReport = this.issueReportRepository.create({
        user: user,
        reportingPhoneNumber: phoneNumber,
        type: session.issueType,
        description: session.data.description,
        location: session.data.location,
        latitude: session.data.latitude,
        longitude: session.data.longitude,
        imageUrl: session.data.imageUrl,
        voiceNoteUrl: session.data.voiceNoteUrl,
        videoUrl: session.data.videoUrl,
        assignedDepartmentsJson: JSON.stringify(assignedDepartments.departments),
        status: IssueStatus.REPORTED,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedReport = await this.issueReportRepository.save(issueReport);

      // Check for consolidation
      const consolidationMatch = await this.consolidationService.checkForConsolidation(
        'ISSUE',
        {
          type: session.issueType,
          description: session.data.description,
          location: session.data.location,
          latitude: session.data.latitude,
          longitude: session.data.longitude
        }
      );

      const consolidationResult = await this.consolidationService.consolidateReport(
        'ISSUE',
        savedReport.id,
        {
          type: session.issueType,
          description: session.data.description,
          location: session.data.location,
          latitude: session.data.latitude,
          longitude: session.data.longitude
        },
        consolidationMatch
      );

      // Create notifications
      await this.notificationService.createIssueNotifications(
        savedReport,
        assignedDepartments.departments
      );

      // Clear session - RELEASE USER FROM SESSION LOCK
      this.reportingSessions.delete(phoneNumber);

      // Send confirmation with department info
      const departmentDescription = this.departmentRouting.getDepartmentDescription(assignedDepartments.departments);
      
      let confirmationMessage = `✅ Report submitted successfully!\n\n` +
      `📋 Report #${issueReport.id}\n` +
      `📝 Type: ${this.formatIssueType(session.issueType)}\n` +
      `📍 Location: ${session.data.location || 'Not specified'}\n` +
      `🏢 Notified: ${departmentDescription}\n\n`;

      // Add consolidation info for issues
      if (consolidationResult && !consolidationResult.isNew) {
        confirmationMessage += `📊 *Related Issue Found*\n` +
          `• This issue has been reported before and added to existing incident #${consolidationResult.consolidation.id}\n` +
          `• Total reports for this incident: ${consolidationResult.consolidation.reportCount}\n` +
          `• Your report helps authorities track ongoing issues\n\n`;
        
        if (consolidationResult.matchDetails?.confidence) {
          confirmationMessage += `• Match confidence: ${consolidationResult.matchDetails.confidence}%\n`;
        }
      } else if (consolidationResult?.isNew && consolidationResult.consolidation.reportCount === 1) {
        confirmationMessage += `📊 You are the first to report this issue in your area.\n\n`;
      }

      confirmationMessage += `✏️ You can edit this report by typing "EDIT ${issueReport.id}"\n\n`;

      if (!user) {
        confirmationMessage += `💡 Register to track your reports and access premium features. Send "REGISTER" to get started.`;
      } else {
        confirmationMessage += `You can view your reports anytime by sending "MY REPORTS".`;
      }

      if (messageID) {
        await this.messagingService.sendTextMessage(phoneNumber, confirmationMessage, messageID);
      }
      
      // Send edit menu after a delay
      if (messageID) {
        setTimeout(async () => {
          await this.sendEditMenu(phoneNumber, savedReport.id, 'ISSUE', messageID);
        }, 2000);
      }
      
      this.logger.log(`Report completed successfully for ${phoneNumber}, Report ID: ${issueReport.id}`);
      return true;

    } catch (error) {
      this.logger.error('Error completing report:', error);
      if (messageID) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Failed to submit report. Please try again or contact support if the problem persists.',
          messageID
        );
      }
      return false;
    }
  }

  // Add new method
  private async sendEditMenu(
    phoneNumber: string,
    reportId: number,
    reportType: 'EMERGENCY' | 'ISSUE',
    messageID: string
  ): Promise<void> {
    try {
      const editMenu = this.editFeedbackService.getEditMenu(reportType, reportId);
      
      await this.messagingService.sendTextMessage(
        phoneNumber,
        editMenu,
        messageID
      );

      // Store edit session
      if (this.sessionManager) {
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
      } else {
        this.logger.error('sessionManager is undefined in sendEditMenu');
      }
    } catch (error) {
      this.logger.error('Error sending edit menu:', error);
    }
  }

  async getIssueReportById(id: number): Promise<IssueReport | null> {
    try {
      const report = await this.issueReportRepository.findOne({ 
        where: { id },
        relations: ['user'] // Include user relation if needed
      });
      return report;
    } catch (error) {
      this.logger.error(`Error getting issue report by ID ${id}:`, error);
      return null;
    }
  }

  // ADD THIS MISSING METHOD
  private formatIssueType(issueType: IssueType): string {
    const issueTypeMap: { [key in IssueType]: string } = {
      [IssueType.POTHOLE]: 'Pothole',
      [IssueType.LITTER]: 'Litter',
      [IssueType.SEWER]: 'Sewer Issue',
      [IssueType.WATER_PIPE_BURST]: 'Burst Water Pipe',
      [IssueType.OTHER]: 'Issue'
    };
    return issueTypeMap[issueType] || 'Issue';
  }

  async handleTextAfterMedia(phoneNumber: string, message: string, messageID: string): Promise<boolean> {
    const session = this.reportingSessions.get(phoneNumber);
    if (!session || session.currentStep !== 4) {
      return false;
    }

    const normalizedMessage = message.toLowerCase().trim();
    
    // Handle submission commands
    if (normalizedMessage === 'submit' || normalizedMessage === 'skip') {
      return await this.completeReport(phoneNumber, session, messageID);
    }

    // If it's not a submission command, treat it as additional description
    if (session.data.description) {
      session.data.description += `\n\nAdditional note: ${message}`;
      this.reportingSessions.set(phoneNumber, session);
      
      return await this.messagingService.sendTextMessage(
        phoneNumber,
        '📝 Note added to your report. Type "submit" to complete your report or upload more media.',
        messageID
      );
    }

    // If we reach here, the message wasn't handled
    return false;
  }

  async getUserReports(phoneNumber: string, messageID?: string): Promise<IssueReport[]> {
    try {
      let reports: IssueReport[] = [];

      const hashedPhone = await this.hashPhoneNumber(phoneNumber);
      const user = await this.userRepository.findOne({ 
        where: { phoneNumber: hashedPhone } 
      });

      if (user) {
        // Single query using QueryBuilder to get all relevant reports
        reports = await this.issueReportRepository
          .createQueryBuilder('report')
          .where('report.userId = :userId', { userId: user.id })
          .orWhere('(report.reportingPhoneNumber = :phoneNumber AND report.userId IS NULL)', { 
            phoneNumber 
          })
          .orderBy('report.createdAt', 'DESC')
          .take(10)
          .getMany();

        // Background process to link orphaned reports for future queries
        this.linkOrphanedReportsToUser(phoneNumber, user.id).catch(error => {
          this.logger.error('Background linking failed:', error);
        });

      } else {
        // User is not registered - only get reports by phone number
        reports = await this.issueReportRepository.find({
          where: { reportingPhoneNumber: phoneNumber },
          order: { createdAt: 'DESC' },
          take: 10
        });
      }

      // Rest of your method remains unchanged...
      if (reports.length === 0) {
        const message = user 
          ? "📋 You haven't submitted any reports yet.\n\nSend 'REPORT' to start reporting an issue."
          : "📋 You haven't submitted any reports yet, or your reports were submitted as a guest.\n\nSend 'REPORT' to start a new issue report.";
        
        if (messageID) {
          await this.messagingService.sendTextMessage(phoneNumber, message, messageID);
        }
        return reports;
      }

      let reportsMessage = `📋 *Your Recent Reports (${reports.length})*\n\n`;

      reports.forEach((report, index) => {
        const statusEmoji: { [key in IssueStatus]: string } = {
          [IssueStatus.REPORTED]: '📝',
          [IssueStatus.IN_PROGRESS]: '🔄',
          [IssueStatus.RESOLVED]: '✅',
          [IssueStatus.CLOSED]: '🔒'
        };

        reportsMessage += `${index + 1}. ${statusEmoji[report.status]} *${this.formatIssueType(report.type)}*\n`;
        reportsMessage += `   📍 ${report.location || 'Location not specified'}\n`;
        reportsMessage += `   🆔 #${report.id} | ${report.createdAt.toLocaleDateString()}\n`;
        reportsMessage += `   📊 Status: ${report.status.replace('_', ' ').toUpperCase()}\n\n`;
      });

      if (!user) {
        reportsMessage += "💡 *Register to:*\n• Track all your reports in one place\n• Get status updates\n• Access premium features\n\nSend 'REGISTER' to get started!";
      }

      if (messageID) {
        await this.messagingService.sendTextMessage(phoneNumber, reportsMessage, messageID);
      }
    return reports
    } catch (error) {
      this.logger.error('Error fetching user reports:', error);
      if (messageID) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Failed to fetch your reports. Please try again later.',
          messageID
        );
      }
      return []
    }
  }

  // NEW METHOD: Link orphaned reports to user account
  private async linkOrphanedReportsToUser(phoneNumber: string, userId: number): Promise<void> {
    try {
      // Find all reports with this phone number that aren't linked to any user using QueryBuilder
      const orphanedReports = await this.issueReportRepository
        .createQueryBuilder('report')
        .where('report.reportingPhoneNumber = :phoneNumber', { phoneNumber })
        .andWhere('report.userId IS NULL')
        .getMany();

      if (orphanedReports.length > 0) {
        // Update these reports to link them to the user
        await this.issueReportRepository
          .createQueryBuilder()
          .update(IssueReport)
          .set({ user: { id: userId } })
          .where('reportingPhoneNumber = :phoneNumber', { phoneNumber })
          .andWhere('userId IS NULL')
          .execute();

        this.logger.log(`Linked ${orphanedReports.length} orphaned reports to user ${userId}`);
      }
    } catch (error) {
      this.logger.error('Error linking orphaned reports to user:', error);
      // Don't throw error - this is a background process and shouldn't affect the main flow
    }
  }

  private async hashPhoneNumber(phoneNumber: string): Promise<string> {
    const salt = process.env.PHONE_HASH_SALT || 'default-salt';
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    return crypto.createHmac('sha256', salt).update(normalizedPhone).digest('hex');
  }

  // Cleanup old sessions
  cleanupOldSessions(): void {
    const now = Date.now();
    for (const [phoneNumber, session] of this.reportingSessions.entries()) {
      if (now - session.lastActive > this.SESSION_TTL) {
        this.reportingSessions.delete(phoneNumber);
        this.logger.log(`Cleaned up expired reporting session for ${phoneNumber}`);
      }
    }
  }
}