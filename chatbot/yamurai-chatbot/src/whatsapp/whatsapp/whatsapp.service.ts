/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, map, timeout } from 'rxjs/operators';
import type { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { EmergencyReportingService } from '../services/reporting/emergency-reporting.service';
import { IssueReportingService } from '../services/reporting/issue-reporting.service';
import { NlpService } from '../services/nlp.service';
import { SessionManagerService } from '../services/session-manager.service';
import { StorageService } from '../services/storage.service';
import { AuthService } from '../../auth/auth.service';
import { SessionStatus, SessionType } from '../../database/session.entity';
import { User, UserRole, UserStatus } from '../../database/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { existsSync } from 'fs';
import { MessagingService } from '../services/messaging/messaging.service';
import { EditFeedbackService } from '../services/edit/edit-feedback.service';
import { NotificationService } from '../services/notification.service';
import { DepartmentRoutingService } from '../services/department-routing.service';
import { BloodDetectionService } from '../services/blood-detection.service';
import { FireHazardDetectionService } from '../services/fire-hazard-detection.service';
import { ReportConsolidationService } from '../services/report-consolidation.service';
import { EmergencyType, EmergencyPriority } from '../../database/emergency-report.entity';
import { IncidentManagementService } from '../services/incident-management.service';
import { FlaskRagService } from '../services/flask-rag.service';
import { EcoFarmerService } from '../services/ecoFarmer/ecofarmer.service';
import { Blob } from 'buffer';

interface WebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from: string;
          id: string;
          type: string;
          text?: { body: string };
          image?: { id: string; mime_type: string };
          audio?: { id: string; mime_type: string };
          video?: { id: string; mime_type: string };
          document?: { id: string; mime_type: string };
          location?: { latitude: number; longitude: number };
        }>;
        interactive?: {
          type: string;
          button_reply?: {
            id: string;
            title: string;
          };
          list_reply?: {
            id: string;
            title: string;
            description?: string;
          };
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        metadata?: {
          display_phone_number: string;
          phone_number_id: string;
        };
        message?: any;
        statuses?: Array<any>;
      };
    }>;
  }>;
}

interface MessageData {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: string;
  text?: {
    preview_url: boolean;
    body: string;
  };
  interactive?: {
    type: string;
    body: {
      text: string;
    };
    action: {
      buttons?: Array<{
        type: string;
        reply: {
          id: string;
          title: string;
        };
      }>;
      sections?: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}

interface RegistrationData {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  idNumber?: string;
  address?: string;
  idDocumentUrl?: string;
  proofOfResidenceUrl?: string;
  step?: number;
}

interface EditSessionData {
  step: 'SELECT_REPORT_TYPE' | 'SELECT_REPORT_ID' | 'SHOW_EDIT_MENU' | 'EDIT_IN_PROGRESS' | 'CONFIRM_EDIT';
  reportType?: 'EMERGENCY' | 'ISSUE';
  reportId?: number;
  reportData?: any;
  editAction?: string;
  editData?: any;
  userReports?: any[];
  requiresInput?: boolean;
  startedAt?: Date;
  messageId?: string;
  data?: any;
}

interface PendingRAGRequest {
  promise: Promise<void>;
  timeout: NodeJS.Timeout;
  startTime: number;
  messageId: string;
  organisation: RAGOrganisation;
  query: string; // Store the query to detect duplicates
}

type RAGOrganisation = 'Government' | 'Agriculture';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly API_TIMEOUT = 15000;

  // ==================== MESSAGE DEDUPLICATION ====================
  // Track processed message IDs with timestamp
  private readonly processedMessages = new Map<string, number>();
  private readonly MESSAGE_DEDUP_TTL = 300000; // 5 minutes (WhatsApp may resend within this window)
  
  // Track messages that are currently being processed
  private readonly processingMessages = new Set<string>();
  
  // Track duplicate queries within the same session
  private readonly recentUserQueries = new Map<string, { 
    query: string; 
    timestamp: number;
    messageId: string;
  }>();
  private readonly QUERY_DEDUP_TTL = 10000; // 10 seconds - prevent same query being processed twice
  
  // Track pending RAG requests
  private readonly pendingRAGRequests = new Map<string, PendingRAGRequest>();
  private readonly RAG_TIMEOUT = 900000; // 15 minutes (900,000 ms)
  
  // Track webhook delivery receipts to ignore them
  private readonly processedStatusUpdates = new Set<string>();
  
  // In-memory registration sessions
  private readonly usersInRegistration = new Map<string, {
    step: number;
    data: RegistrationData;
    lastActive: number;
  }>();

  // Track auto-downloaded sources for each user
  private readonly autoDownloadedSources = new Map<string, {
    sources: any[];
    timestamp: number;
  }>();
  private readonly AUTO_DOWNLOAD_TTL = 30 * 60 * 1000;
  
  // Track current session ID for each user
  private readonly currentUserSessions = new Map<string, {
    sessionId: string;
    sessionType: SessionType;
    expiresAt: Date;
  }>();
  
  incidentService: any;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private readonly emergencyReportingService: EmergencyReportingService,
    private readonly issueReportingService: IssueReportingService,
    private readonly nlpService: NlpService,
    private readonly sessionManager: SessionManagerService,
    private readonly storageService: StorageService,
    private readonly authService: AuthService,
    private readonly messagingService: MessagingService,
    private readonly editFeedbackService: EditFeedbackService,
    private readonly notificationService: NotificationService,
    private readonly departmentRoutingService: DepartmentRoutingService,
    private readonly bloodDetectionService: BloodDetectionService,
    private readonly fireHazardDetectionService: FireHazardDetectionService,
    private readonly reportConsolidationService: ReportConsolidationService,
    private readonly flaskRagService: FlaskRagService,
    private readonly ecofarmerService: EcoFarmerService,
    private readonly incidentManagementService: IncidentManagementService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  getTestMessage(): string {
    return 'Muyamuri/Sezani Civil Protection Bot - Ready to serve!';
  }

  verifyWebhook(
    mode: string,
    token: string,
    challenge: string,
  ): string | undefined {
    const verificationToken = process.env.WHATSAPP_CLOUD_API_WEBHOOK_VERIFICATION_TOKEN;

    if (!mode || !token) {
      return 'Error verifying token';
    }

    if (mode === 'subscribe' && token === verificationToken) {
      return challenge;
    }
    return undefined;
  }

  private isCancelCommand(text: string): boolean {
    const normalizedText = text.toLowerCase().trim();
    return normalizedText === 'cancel' || 
          normalizedText === 'stop' || 
          normalizedText === 'exit' || 
          normalizedText === 'abort' ||
          normalizedText === 'quit'||
          normalizedText === 'x';
  }

  async handleIncomingMessage(payload: WebhookPayload): Promise<any> {
    try {
      this.logger.debug('Received webhook payload:', JSON.stringify(payload, null, 2));
      
      const changes = payload?.entry?.[0]?.changes?.[0]?.value;
      
      if (!changes) {
        this.logger.warn('No changes found in webhook payload');
        return;
      }

      // ==================== CRITICAL: IGNORE ALL STATUS UPDATES ====================
      // WhatsApp sends status updates (sent, delivered, read) as separate webhooks
      // These should be completely ignored - they are NOT user messages
      if (changes.statuses && changes.statuses.length > 0) {
        const statusIds = changes.statuses.map(s => s.id).join(', ');
        this.logger.debug(`Ignoring ${changes.statuses.length} status update(s): ${statusIds}`);
        
        // Track these status IDs to prevent future processing
        changes.statuses.forEach(status => {
          if (status.id) {
            this.processedStatusUpdates.add(status.id);
          }
        });
        return;
      }

      // ==================== EXTRACT MESSAGE DATA ====================
      const messages = changes.messages;
      const interactive = changes.interactive;
      const messageFromMetadata = changes.message;
      
      let messageID: string;
      let messageSender: string;
      let message: any;

      if (messages && messages.length > 0) {
        message = messages[0];
        messageID = message.id;
        messageSender = message.from;
      } 
      else if (interactive) {
        const contacts = changes.contacts;
        messageSender = contacts && contacts.length > 0 ? contacts[0].wa_id : 'unknown';
        messageID = `interactive_${Date.now()}`;
        message = {
          id: messageID,
          from: messageSender,
          type: 'interactive',
          interactive: interactive
        };
      }
      else if (messageFromMetadata) {
        message = messageFromMetadata;
        messageID = message.id;
        messageSender = message.from;
      }
      else {
        this.logger.warn('No valid message found in webhook payload');
        return;
      }

      // ==================== MESSAGE DEDUPLICATION CHECKS ====================
      
      // Check 1: Was this already processed as a status update?
      if (this.processedStatusUpdates.has(messageID)) {
        this.logger.debug(`Message ${messageID} already processed as status update, ignoring`);
        return;
      }

      // Check 2: Is this message already being processed?
      if (this.processingMessages.has(messageID)) {
        this.logger.warn(`Message ${messageID} is already being processed, ignoring duplicate`);
        return;
      }

      // Check 3: Was this message processed recently?
      if (this.processedMessages.has(messageID)) {
        const processedTime = this.processedMessages.get(messageID) || 0;
        const age = Date.now() - processedTime;
        
        if (age < this.MESSAGE_DEDUP_TTL) {
          this.logger.log(`Duplicate message ${messageID} ignored (processed ${age}ms ago)`);
          return;
        } else {
          // TTL expired, remove from map
          this.processedMessages.delete(messageID);
        }
      }

      // Mark message as processing
      this.processingMessages.add(messageID);

      try {
        // Mark as read (only for real messages)
        if (messageID && !messageID.startsWith('interactive_') && message.type !== 'interactive') {
          await this.markMessageAsRead(messageID);
        }
        
        this.logger.log(`Processing message from ${messageSender}, type: ${message.type}, ID: ${messageID}`);
        
        // Process the message
        await this.processMessageFlow(messageSender, message, messageID);
        
        // Mark as successfully processed
        this.processedMessages.set(messageID, Date.now());
        
      } catch (error) {
        this.logger.error(`Error processing message ${messageID}:`, error);
      } finally {
        // Always remove from processing set when done
        this.processingMessages.delete(messageID);
      }
      
    } catch (error) {
      this.logger.error('Error handling incoming message:', error);
    }
  }

  private async setCurrentSession(phoneNumber: string, sessionId: string, sessionType: SessionType, expiresAt: Date): Promise<void> {
    this.currentUserSessions.set(phoneNumber, {
      sessionId,
      sessionType,
      expiresAt
    });
  }

  private async getCurrentSession(phoneNumber: string): Promise<{ sessionId: string; sessionType: SessionType; expiresAt: Date } | null> {
    const session = this.currentUserSessions.get(phoneNumber);
    if (!session) return null;
    
    if (session.expiresAt < new Date()) {
      this.currentUserSessions.delete(phoneNumber);
      return null;
    }
    
    return session;
  }

  private async clearCurrentSession(phoneNumber: string): Promise<void> {
    this.currentUserSessions.delete(phoneNumber);
  }

  private async handleInteractiveMessage(phoneNumber: string, message: any, messageID: string): Promise<boolean> {
    try {
      if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
        const buttonId = message.interactive.button_reply?.id;
        
        this.logger.log(`Interactive button clicked: ${buttonId} by ${phoneNumber}`);

        const currentSession = await this.getCurrentSession(phoneNumber);
        const isEditButton = ['edit_emergency', 'edit_issue', 'edit_cancel'].includes(buttonId);
        // const isAgromateButton = ['btn_agromate'].includes(buttonId);

        if (currentSession) {
          if (currentSession.sessionType === SessionType.EDIT_FEEDBACK && isEditButton) {
            // Continue edit flow
          } else if (['btn_emergency', 'btn_report_issue', 'btn_farmer', 'btn_government', 'btn_menu', 'btn_agromate'].includes(buttonId)) {
            await this.messagingService.sendTextMessage(
              phoneNumber,
              `⚠️ You already have an active ${currentSession.sessionType} session. Please complete it or type "CANCEL" to exit first.`,
              messageID
            );
            return true;
          }
        }
        
        switch (buttonId) {
          case 'btn_emergency':
            await this.startEmergencyReporting(phoneNumber, messageID);
            return true;
          case 'btn_report_issue':
            await this.startIssueReporting(phoneNumber, messageID);
            return true;
          case 'btn_farmer':
            await this.handleFarmerSupport(phoneNumber, messageID);
            return true;
          case 'btn_government':
            await this.handleGovernmentInquiries(phoneNumber, messageID);
            return true;
          case 'btn_menu':
            await this.sendMainMenu(phoneNumber, messageID);
            return true;
          case 'edit_emergency':
            await this.handleEditReportTypeSelection(phoneNumber, 'EMERGENCY', messageID);
            return true;
          case 'edit_issue':
            await this.handleEditReportTypeSelection(phoneNumber, 'ISSUE', messageID);
            return true;
          case 'edit_cancel':
            await this.handleCancelCommand(phoneNumber, messageID);
            return true;
          case 'btn_agromate': 
            await this.ecofarmerService.startEcofarmer(phoneNumber, messageID);
            return true;
          default:
            this.logger.warn(`Unknown button ID: ${buttonId}`);
            return false;
        }
      }
      return false;
    } catch (error) {
      this.logger.error('Error handling interactive message:', error);
      return false;
    }
  }

  private async handleEditReportTypeSelection(phoneNumber: string, reportType: 'EMERGENCY' | 'ISSUE', messageID: string): Promise<void> {
    try {
      // Get current edit session
      let activeSession = await this.sessionManager.getActiveSession(phoneNumber, SessionType.EDIT_FEEDBACK);
      
      // If no session exists, create one
      if (!activeSession) {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        activeSession = await this.sessionManager.createOrUpdateActiveSession(
          phoneNumber,
          SessionType.EDIT_FEEDBACK,
          1,
          {
            step: 'SELECT_REPORT_TYPE',
            startedAt: new Date(),
            messageId: messageID,
            data: {}
          },
          messageID,
          expiresAt
        );
        
        // Track as current session
        await this.setCurrentSession(phoneNumber, activeSession.id.toString(), SessionType.EDIT_FEEDBACK, expiresAt);
      }

      // Parse session data
      const sessionData: EditSessionData = activeSession.sessionData ? 
        (typeof activeSession.sessionData === 'string' ? 
          JSON.parse(activeSession.sessionData) : 
          activeSession.sessionData) as EditSessionData : 
        { step: 'SELECT_REPORT_TYPE' };
      
      // Fetch user's reports of the selected type
      let reports: any[] = [];
      let reportTypeText = '';
      
      if (reportType === 'EMERGENCY') {
        reports = await this.emergencyReportingService.getUserEmergencyReports(phoneNumber, messageID);
        reportTypeText = 'emergency reports';
      } else {
        reports = await this.issueReportingService.getUserReports(phoneNumber, messageID);
        reportTypeText = 'issue reports';
      }

      if (reports.length === 0) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `📭 You don't have any ${reportTypeText} to edit.\n\nYou can create one by typing "${reportType === 'EMERGENCY' ? 'EMERGENCY' : 'REPORT'}"`,
          messageID
        );
        // Stay in edit session but reset to type selection
        await this.sessionManager.createOrUpdateActiveSession(
          phoneNumber,
          SessionType.EDIT_FEEDBACK,
          1,
          {
            ...sessionData,
            step: 'SELECT_REPORT_TYPE',
            reportType: undefined,
            userReports: undefined,
            reportId: undefined
          },
          messageID
        );
        await this.sendEditReportTypeMenu(phoneNumber, messageID);
        return;
      }

      // Update session to step 2
      const updatedSession = await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.EDIT_FEEDBACK,
        2,
        {
          ...sessionData,
          step: 'SELECT_REPORT_ID',
          reportType,
          userReports: reports.slice(0, 10), // Store only first 10 reports
          startedAt: new Date()
        },
        messageID
      );

      // Update current session tracking
      await this.setCurrentSession(phoneNumber, updatedSession.id.toString(), SessionType.EDIT_FEEDBACK, updatedSession.expiresAt);

      // Show reports list and prompt for report ID
      await this.showUserReportsList(phoneNumber, reportType, reports, messageID);

    } catch (error) {
      this.logger.error(`Error handling edit report type selection for ${phoneNumber}:`, error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error processing selection. Please try again.',
        messageID
      );
    }
  }

  private async showUserReportsList(phoneNumber: string, reportType: 'EMERGENCY' | 'ISSUE', reports: any[], messageID: string): Promise<void> {
    try {
      const reportTypeEmoji = reportType === 'EMERGENCY' ? '🚨' : '📝';
      
      let reportsMessage = `${reportTypeEmoji} *YOUR ${reportType.toUpperCase()} REPORTS*\n\n`;
      
      reports.slice(0, 10).forEach((report, index) => {
        const reportId = report.id || report.reportId;
        const status = report.status || 'unknown';
        const description = report.description ? 
          (report.description.substring(0, 50) + (report.description.length > 50 ? '...' : '')) : 
          'No description';
        const date = report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Unknown date';
        const statusEmoji = this.getStatusEmoji(status);
        
        reportsMessage += `*${index + 1}.* #${reportId}\n`;
        reportsMessage += `   ${statusEmoji} *Status:* ${status.toUpperCase()}\n`;
        reportsMessage += `   📝 *Description:* ${description}\n`;
        reportsMessage += `   📅 *Date:* ${date}\n\n`;
      });

      if (reports.length > 10) {
        reportsMessage += `... and ${reports.length - 10} more reports\n\n`;
      }

      reportsMessage += `📝 *To edit a report:*\n`;
      reportsMessage += `Simply type the report number:\n`;
      reportsMessage += `• Example: "${reports[0].id || reports[0].reportId}"\n\n`;
      reportsMessage += `Or type "EDIT <report-id>" if you prefer:\n`;
      reportsMessage += `• Example: "EDIT ${reports[0].id || reports[0].reportId}"\n\n`;
      reportsMessage += `Type "BACK" to choose a different report type.\n`;
      reportsMessage += `Type "CANCEL" to exit edit mode.`;

      await this.messagingService.sendTextMessage(phoneNumber, reportsMessage, messageID);

    } catch (error) {
      this.logger.error('Error showing reports list:', error);
      throw error;
    }
  }

  private async processMessageFlow(phoneNumber: string, message: any, messageID: string): Promise<void> {
    try {
      // ==================== STEP 0: Check for interactive button messages ====================
      if (message.type === 'interactive') {
        const handled = await this.handleInteractiveMessage(phoneNumber, message, messageID);
        if (handled) return;
      }

      // CHECK FOR AGROMATE SESSION FIRST
      const ecofarmerSession = await this.sessionManager.getActiveSession(phoneNumber, SessionType.AGROMATE);
      if (ecofarmerSession) {
        this.logger.log(`User ${phoneNumber} is in Agromate session, routing to Agromate handler`);
        if (message.type === 'text') {
          const text = message.text?.body?.trim();
          if (text) {
            await this.ecofarmerService.handleEcoFarmerMessage(phoneNumber, text, messageID);
          } else {
            await this.messagingService.sendTextMessage(
              phoneNumber,
              'Please send a text message. Type "CANCEL" to exit Agromate.',
              messageID
            );
          }
        } else {
          await this.messagingService.sendTextMessage(
            phoneNumber,
            'Please send text messages for Agromate commands. Type "CANCEL" to exit.',
            messageID
          );
        }
        return;
      }

      // ==================== STEP 1: Check if user is in EDIT session ====================
      const editSession = await this.sessionManager.getActiveSession(phoneNumber, SessionType.EDIT_FEEDBACK);
      if (editSession) {
        this.logger.log(`User ${phoneNumber} is in edit session, routing to edit handler`);
        await this.routeToEditFeedback(phoneNumber, message, messageID);
        return;
      }

      // ==================== STEP 2: Check for RAG session (Government/Farmer) ====================
      const ragSession = await this.getRAGSession(phoneNumber);
      if (ragSession) {
        if (message.type === 'text') {
          const text = message.text?.body?.trim();
          if (text) {
            const normalizedText = text.toLowerCase().trim();
            const menuCommand = this.detectMenuCommand(normalizedText);
            
            // Handle SOURCES command
            if (normalizedText === 'sources' || normalizedText === 'source') {
              await this.handleSourcesRequest(phoneNumber, ragSession.organisation, messageID);
              return;
            }
            
            // Handle DOWNLOAD command
            if (normalizedText.startsWith('download ')) {
              await this.handleDownloadRequest(phoneNumber, text, ragSession.organisation, messageID);
              return;
            }
            
            // Handle cancel command
            if (menuCommand === 'CANCEL') {
              this.clearPendingRAGRequest(phoneNumber, ragSession.organisation);
              await this.handleCancelCommand(phoneNumber, messageID);
              return;
            }
            
            // Handle other menu commands
            if (menuCommand && menuCommand !== 'CANCEL') {
              await this.messagingService.sendTextMessage(
                phoneNumber,
                `⚠️ You're currently in a ${ragSession.organisation} session. Please type "CANCEL" to exit this session first before using other commands.`,
                messageID
              );
              return;
            }
            
            // Handle as RAG query
            await this.handleRAGQuery(phoneNumber, text, ragSession.organisation, messageID);
            return;
          }
        } else {
          // Handle non-text messages
          await this.processRAGSession(phoneNumber, message, messageID, ragSession);
          return;
        }
      }

      // ==================== STEP 3: Check if user has other locked session ====================
      const hasActiveGuidedSession = await this.sessionManager.hasActiveGuidedSession(phoneNumber);
      
      if (hasActiveGuidedSession) {
        this.logger.log(`User ${phoneNumber} has active guided session, routing to session handler`);
        await this.routeMessageToSessionHandler(phoneNumber, message, messageID);
        return;
      }

      // ==================== STEP 4: Check for text messages ====================
      if (message.type === 'text') {
        const text = message.text?.body?.trim();
        if (!text) return;

        // Check for cancel command
        if (this.isCancelCommand(text)) {
          await this.handleCancelCommand(phoneNumber, messageID);
          return;
        }

        // Normalize text for processing
        const normalizedText = text.toLowerCase().trim();
        
        // ==================== STEP 4A: Check for basic queries or salutations ====================
        const isBasicQuery = this.isBasicQuery(normalizedText);
        const isSalutation = this.isSalutation(normalizedText);
        
        if (isBasicQuery || isSalutation) {
          this.logger.log(`User ${phoneNumber} sent basic query/salutation: ${text}`);
          await this.sendWelcomeMessage(phoneNumber, messageID);
          return;
        }

        // ==================== STEP 4B: Check for menu commands ====================
        const menuCommand = this.detectMenuCommand(normalizedText);
        if (menuCommand) {
          this.logger.log(`User ${phoneNumber} used menu command: ${menuCommand}`);
          await this.handleMenuCommand(phoneNumber, menuCommand, text, messageID);
          return;
        }

        // ==================== STEP 5: NLP check for emergency ====================
        const nlpResult = await this.nlpService.processNaturalLanguage(text, phoneNumber);
        
        if (nlpResult.handled && nlpResult.type === 'emergency') {
          this.logger.log(`NLP detected emergency for ${phoneNumber}: ${nlpResult.data.type}`);
          
          // Create emergency session and lock user
          await this.emergencyReportingService.startEmergencyReportWithContext(
            phoneNumber,
            messageID,
            {
              detectedType: nlpResult.data.type,
              originalMessage: text,
              confidence: nlpResult.data.confidence,
              keywords: nlpResult.data.keywords
            }
          );
          
          // Create session lock
          await this.sessionManager.createOrUpdateActiveSession(
            phoneNumber,
            SessionType.EMERGENCY,
            2, // Start at step 2 (type already detected)
            {
              emergencyType: nlpResult.data.type,
              startedAt: new Date(),
              messageId: messageID
            },
            messageID
          );
          
          return;
        }

        // ==================== STEP 6: NLP check for issue reporting ====================
        if (nlpResult.handled && nlpResult.type === 'issue') {
          this.logger.log(`NLP detected issue for ${phoneNumber}: ${nlpResult.data.type}`);
          
          // Create issue reporting session and lock user
          await this.issueReportingService.startIssueReportWithContext(
            phoneNumber,
            messageID,
            {
              detectedType: nlpResult.data.type,
              originalMessage: text,
              confidence: nlpResult.data.confidence,
              keywords: nlpResult.data.keywords
            }
          );
          
          // Create session lock (we need to add issue reporting session type)
          await this.sessionManager.createOrUpdateActiveSession(
            phoneNumber,
            SessionType.ISSUE_REPORTING,
            2, // Start at step 2 (type already detected)
            {
              issueType: nlpResult.data.type,
              startedAt: new Date(),
              messageId: messageID
            },
            messageID
          );
          
          return;
        }

        // ==================== STEP 7: NLP failed - seek clarity ====================
        this.logger.log(`NLP failed for ${phoneNumber}, seeking clarity: ${text}`);
        await this.sendClarityMessage(phoneNumber, text, messageID);
        return;
      }

      // ==================== STEP 8: Handle non-text messages when no active session ====================
      // If user sends media/location without starting a session, show main menu
      if (['image', 'audio', 'video', 'document', 'location'].includes(message.type)) {
        await this.sendWelcomeMessage(phoneNumber, messageID);
        return;
      }

      // ==================== STEP 9: Default fallback ====================
      await this.sendWelcomeMessage(phoneNumber, messageID);

    } catch (error) {
      this.logger.error('Error processing message flow:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        'Sorry, I encountered an error processing your message. Please try again.',
        messageID
      );
    }
  }

  // ==================== RAG SESSION HANDLING ====================
  private async processRAGSession(phoneNumber: string, message: any, messageID: string, ragSession: { organisation: RAGOrganisation }): Promise<void> {
    try {
      // Check for cancel command
      if (message.type === 'text') {
        const text = message.text?.body?.trim();
        if (text && this.isCancelCommand(text)) {
          this.clearPendingRAGRequest(phoneNumber, ragSession.organisation);
          await this.handleCancelCommand(phoneNumber, messageID);
          return;
        }
      }

      // Check for menu commands that would exit the session
      if (message.type === 'text') {
        const text = message.text?.body?.trim();
        if (text) {
          const menuCommand = this.detectMenuCommand(text.toLowerCase().trim());
          if (menuCommand && menuCommand !== 'CANCEL') {
            await this.messagingService.sendTextMessage(
              phoneNumber,
              `⚠️ You're currently in a ${ragSession.organisation} session. Please type "CANCEL" to exit this session first before using other commands.`,
              messageID
            );
            return;
          }
        }
      }

      // Route ALL message types to Flask service
      await this.routeToFlaskRagService(phoneNumber, message, messageID, ragSession.organisation);
      
    } catch (error) {
      this.logger.error(`Error processing RAG session for ${phoneNumber}:`, error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `❌ Error processing your ${ragSession.organisation} request. Please try again or type "CANCEL" to exit.`,
        messageID
      );
    }
  }

  private async routeToFlaskRagService(
    phoneNumber: string, 
    message: any, 
    messageID: string,
    organisation: RAGOrganisation
  ): Promise<void> {
    try {
      // Handle different message types
      switch (message.type) {
        case 'text':
          await this.handleRAGTextQuery(phoneNumber, message.text?.body?.trim(), organisation, messageID);
          break;
          
        case 'image':
        case 'document':
        case 'audio':
        case 'video':
          await this.handleRAGMedia(phoneNumber, message, organisation, messageID);
          break;
          
        case 'location':
          await this.handleRAGLocation(phoneNumber, message.location, organisation, messageID);
          break;
          
        case 'interactive':
          await this.handleRAGInteractive(phoneNumber, message.interactive, organisation, messageID);
          break;
          
        default:
          await this.messagingService.sendTextMessage(
            phoneNumber,
            `❌ Unsupported message type for ${organisation} session. Please send text, images, or location.`,
            messageID
          );
      }
    } catch (error) {
      this.logger.error('Error routing to Flask RAG service:', error);
      throw error;
    }
  }

  private async handleRAGTextQuery(
    phoneNumber: string, 
    query: string, 
    organisation: RAGOrganisation,
    messageID: string
  ): Promise<void> {
    if (!query) return;

    // QUERY DEDUPLICATION
    const userQueryKey = `${phoneNumber}:${organisation}`;
    const lastQuery = this.recentUserQueries.get(userQueryKey);
    
    if (lastQuery && 
        lastQuery.query === query && 
        (Date.now() - lastQuery.timestamp) < this.QUERY_DEDUP_TTL) {
      this.logger.warn(`Duplicate query from ${phoneNumber}: "${query.substring(0, 30)}..." ignored`);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `⏳ Your previous query is still being processed. Please wait for the response.`,
        messageID
      );
      return;
    }

    // Update last query
    this.recentUserQueries.set(userQueryKey, {
      query,
      timestamp: Date.now(),
      messageId: messageID
    });

    // Check for pending request
    if (this.hasPendingRAGRequest(phoneNumber, organisation)) {
      this.logger.warn(`User ${phoneNumber} already has a pending ${organisation} request`);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `⏳ Your previous ${organisation} query is still being processed. Please wait.`,
        messageID
      );
      return;
    }

    // Show searching message
    await this.messagingService.sendTextMessage(
      phoneNumber,
      `🔍 Searching the ${organisation} knowledge base...`,
      messageID
    );

    // Get conversation context
    const context = await this.getRAGConversationContext(phoneNumber, organisation);
    
    // Enhance query with context
    const enhancedQuery = context ? `${context}\nCurrent query: ${query}` : query;

    // Process with Flask RAG service
    const ragPromise = this.processRAGQueryWithAutoDownload(phoneNumber, enhancedQuery, organisation, messageID);
    this.registerPendingRAGRequest(phoneNumber, organisation, messageID, ragPromise, query);
    
    try {
      await ragPromise;
    } finally {
      this.clearPendingRAGRequest(phoneNumber, organisation);
    }
  }

  private async processRAGQueryWithAutoDownload(
    phoneNumber: string,
    query: string,
    organisation: RAGOrganisation,
    messageID: string
  ): Promise<void> {
    try {
      // Query Flask RAG service
      const response = await this.flaskRagService.queryRAG(query, organisation);

      // Send response text
      if (response.answer) {
        const answerParts = await this.splitMessage(response.answer);
        for (let i = 0; i < answerParts.length; i++) {
          const part = answerParts[i];
          const partPrefix = answerParts.length > 1 ? `[Part ${i + 1}/${answerParts.length}]\n\n` : '';
          await this.messagingService.sendTextMessage(phoneNumber, partPrefix + part, messageID);
        }
      } else {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `I couldn't find specific information about that in the ${organisation} knowledge base. Could you rephrase your question?`,
          messageID
        );
      }

      // Update session with history
      await this.updateRAGSession(
        phoneNumber,
        organisation,
        query,
        response.answer || 'No answer found',
        response.sources,
        messageID
      );

      // Handle auto-download of first 3 sources
      if (response.sources && response.sources.length > 0) {
        await this.handleAutoDownloadSources(phoneNumber, response.sources, organisation, messageID);
      }

      // Send follow-up prompt
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `💡 You can ask another ${organisation} question, send an image, or share your location.\n` +
        `Type "SOURCES" to see all sources.\n` +
        `Type "DOWNLOAD <number>" to get a specific source.\n` +
        `Type "CANCEL" to exit.`,
        messageID
      );

    } catch (error) {
      this.logger.error(`Error processing ${organisation} RAG query:`, error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        this.flaskRagService.getErrorMessage(organisation),
        messageID
      );
    }
  }

  private async handleAutoDownloadSources(
    phoneNumber: string,
    sources: any[],
    organisation: string,
    messageID: string
  ): Promise<void> {
    try {
      const result = await this.flaskRagService.prepareAutoDownloadSources(phoneNumber, sources);

      // Store remaining sources for later manual download
      if (result.manualDownloadSources.length > 0) {
        this.autoDownloadedSources.set(phoneNumber, {
          sources: result.manualDownloadSources,
          timestamp: Date.now()
        });
      }

      // Send message about auto-downloads
      if (result.autoDownloadFiles.length > 0) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `⬇️ *Auto-downloading ${result.autoDownloadFiles.length} source(s)...*`,
          messageID
        );

        // Send each auto-downloaded file
        for (let i = 0; i < result.autoDownloadFiles.length; i++) {
          const { source, buffer } = result.autoDownloadFiles[i];
          
          try {
            // Prepare file for WhatsApp
            const fileData = this.flaskRagService.prepareWhatsAppFile(
              buffer,
              source.source,
              source.document_type ? 
                this.flaskRagService.getMimeTypeFromExtension(source.document_type) : 
                undefined
            );

            // Send file via WhatsApp
            await this.sendDocumentViaWhatsApp(
              phoneNumber,
              fileData.buffer,
              fileData.filename,
              fileData.mimetype,
              messageID
            );

            // Small delay between files
            await this.delay(1000);

          } catch (fileError) {
            this.logger.error(`Failed to send auto-downloaded file ${source.source}:`, fileError);
            
            // Send download link as fallback
            const downloadUrl = await this.flaskRagService.getSourceDownloadUrl(source.source);
            await this.messagingService.sendTextMessage(
              phoneNumber,
              `⚠️ Couldn't send file directly. Download here: ${downloadUrl}`,
              messageID
            );
          }
        }

        // Send summary of remaining sources
        if (result.manualDownloadSources.length > 0) {
          await this.messagingService.sendTextMessage(
            phoneNumber,
            `📚 *${result.manualDownloadSources.length} more source(s) available*\n` +
            `Type "SOURCES" to see all sources or "DOWNLOAD <number>" to get specific ones.`,
            messageID
          );
        }
      }

      // Send sources list if no auto-downloads
      if (result.autoDownloadFiles.length === 0 && sources.length > 0) {
        await this.sendSourcesMessage(phoneNumber, sources, messageID, organisation);
      }

    } catch (error) {
      this.logger.error('Error in auto-download handling:', error);
    }
  }

  // New method to handle SOURCES command
  private async handleSourcesRequest(phoneNumber: string, organisation: string, messageID: string): Promise<void> {
    try {
      // Get stored sources
      const stored = this.autoDownloadedSources.get(phoneNumber);
      
      if (!stored || !stored.sources || stored.sources.length === 0) {
        // Try to get from active session
        const activeSession = await this.sessionManager.getActiveSession(phoneNumber);
        if (activeSession && activeSession.sessionData) {
          const sessionData = typeof activeSession.sessionData === 'string' 
            ? JSON.parse(activeSession.sessionData) 
            : activeSession.sessionData;
          
          if (sessionData.lastSources && sessionData.lastSources.length > 0) {
            // Use FlaskRagService to format sources list
            const sourcesMessage = await this.flaskRagService.formatSourcesList(
              sessionData.lastSources, 
              organisation
            );
            
            const messageParts = await this.splitMessage(sourcesMessage);
            for (const part of messageParts) {
              await this.messagingService.sendTextMessage(phoneNumber, part, messageID);
            }
            return;
          }
        }
        
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '📚 No sources available. Try asking a question first.',
          messageID
        );
        return;
      }

      // Check if stored sources are still valid
      if (Date.now() - stored.timestamp > this.AUTO_DOWNLOAD_TTL) {
        this.autoDownloadedSources.delete(phoneNumber);
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '📚 Sources have expired. Please ask a new question.',
          messageID
        );
        return;
      }

      // Format and send sources list
      const sourcesMessage = await this.flaskRagService.formatSourcesList(stored.sources, organisation);
      const messageParts = await this.splitMessage(sourcesMessage);
      
      for (const part of messageParts) {
        await this.messagingService.sendTextMessage(phoneNumber, part, messageID);
      }

    } catch (error) {
      this.logger.error('Error handling sources request:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error retrieving sources. Please try again.',
        messageID
      );
    }
  }

  // New method to handle DOWNLOAD command
  private async handleDownloadRequest(
    phoneNumber: string, 
    text: string, 
    organisation: string, 
    messageID: string
  ): Promise<void> {
    try {
      // Parse download command (e.g., "DOWNLOAD 1" or "download 1")
      const match = text.match(/download\s+(\d+)/i);
      if (!match) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Invalid download command. Please use: DOWNLOAD <number>\nExample: DOWNLOAD 1',
          messageID
        );
        return;
      }

      const sourceIndex = parseInt(match[1]) - 1; // Convert to 0-based index

      // Get stored sources
      const stored = this.autoDownloadedSources.get(phoneNumber);
      
      if (!stored || !stored.sources || stored.sources.length === 0) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ No sources available. Please ask a question first or type "SOURCES" to see available sources.',
          messageID
        );
        return;
      }

      // Check if stored sources are still valid
      if (Date.now() - stored.timestamp > this.AUTO_DOWNLOAD_TTL) {
        this.autoDownloadedSources.delete(phoneNumber);
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Sources have expired. Please ask a new question.',
          messageID
        );
        return;
      }

      if (sourceIndex < 0 || sourceIndex >= stored.sources.length) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `❌ Invalid source number. Please choose between 1 and ${stored.sources.length}.`,
          messageID
        );
        
        // Show available sources again
        const sourcesMessage = await this.flaskRagService.formatSourcesList(stored.sources, organisation);
        await this.messagingService.sendTextMessage(phoneNumber, sourcesMessage, messageID);
        return;
      }

      const source = stored.sources[sourceIndex];
      
      // Show downloading message
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `⏳ Preparing source ${sourceIndex + 1}: ${source.source}...`,
        messageID
      );

      try {
        // Download the file
        const fileBuffer = await this.flaskRagService.downloadSourceFile(source.source);
        
        // Prepare file for WhatsApp
        const fileData = this.flaskRagService.prepareWhatsAppFile(
          fileBuffer,
          source.source,
          source.document_type ? 
            this.flaskRagService.getMimeTypeFromExtension(source.document_type) : 
            undefined
        );

        // Send file via WhatsApp
        await this.sendDocumentViaWhatsApp(
          phoneNumber,
          fileData.buffer,
          fileData.filename,
          fileData.mimetype,
          messageID
        );

        // Format and send download confirmation
        const downloadMessage = await this.flaskRagService.formatSourceDownload(source, sourceIndex + 1);
        await this.messagingService.sendTextMessage(phoneNumber, downloadMessage, messageID);

      } catch (downloadError) {
        this.logger.error('Error downloading source:', downloadError);
        
        // Fallback to download URL
        const downloadUrl = await this.flaskRagService.getSourceDownloadUrl(source.source);
        const fallbackMessage = await this.flaskRagService.formatSourceDownload(source, sourceIndex + 1);
        
        await this.messagingService.sendTextMessage(
          phoneNumber,
          fallbackMessage + `\n\n⚠️ Direct download failed. You can still use the link above.`,
          messageID
        );
      }

    } catch (error) {
      this.logger.error('Error handling download request:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        this.flaskRagService.getErrorMessage(organisation),
        messageID
      );
    }
  }

  // New method to send document via WhatsApp
  // private async sendDocumentViaWhatsApp(
  //   phoneNumber: string,
  //   fileBuffer: Buffer,
  //   filename: string,
  //   mimetype: string,
  //   messageID: string
  // ): Promise<boolean> {
  //   try {
  //     const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
  //     const version = this.configService.get<string>('WHATSAPP_API_VERSION');
  //     const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

  //     if (!phoneNumberId || !version || !accessToken) {
  //       throw new BadRequestException('Missing WhatsApp configuration');
  //     }

  //     const arrayBuffer = fileBuffer.buffer.slice(
  //       fileBuffer.byteOffset,
  //       fileBuffer.byteOffset + fileBuffer.byteLength
  //     );

  //     const blob = new Blob([new Uint8Array(arrayBuffer)], { type: mimetype });

  //     // First, upload the media to WhatsApp
  //     const uploadUrl = `https://graph.facebook.com/${version}/${phoneNumberId}/media`;
      
  //     const formData = new FormData();
  //     formData.append('file', blob, filename);
  //     formData.append('messaging_product', 'whatsapp');
  //     formData.append('type', mimetype);

  //     const uploadResponse = await firstValueFrom(
  //       this.httpService.post(uploadUrl, formData, {
  //         headers: {
  //           Authorization: `Bearer ${accessToken}`,
  //         },
  //       })
  //     );

  //     const mediaId = uploadResponse.data.id;

  //     // Then send the media as a document
  //     const messageData: any = {
  //       messaging_product: 'whatsapp',
  //       recipient_type: 'individual',
  //       to: phoneNumber,
  //       type: 'document',
  //       document: {
  //         id: mediaId,
  //         filename: filename,
  //         caption: `📄 Source: ${filename}`
  //       }
  //     };

  //     if (messageID) {
  //       messageData['context'] = { message_id: messageID };
  //     }

  //     const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

  //     const response$ = this.httpService.post(url, messageData, {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //         'Content-Type': 'application/json',
  //       },
  //     });

  //     await firstValueFrom(response$);
  //     this.logger.log(`Document sent successfully to ${phoneNumber}: ${filename}`);
  //     return true;

  //   } catch (error) {
  //     this.logger.error('Error sending document via WhatsApp:', error);
  //     return false;
  //   }
  // }

  private async sendDocumentViaWhatsApp(
    phoneNumber: string,
    fileBuffer: Buffer,
    filename: string,
    mimetype: string,
    messageID: string
  ): Promise<boolean> {
    try {
      const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
      const version = this.configService.get<string>('WHATSAPP_API_VERSION');
      const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

      if (!phoneNumberId || !version || !accessToken) {
        throw new BadRequestException('Missing WhatsApp configuration');
      }

      // Create form data manually
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      let body = '';
      
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`;
      body += `Content-Type: ${mimetype}\r\n\r\n`;
      
      // Convert body string to buffer
      const bodyBuffer = Buffer.from(body, 'utf-8');
      const fileContentBuffer = fileBuffer;
      const footerBuffer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
      
      // Add messaging_product field
      const mpField = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="messaging_product"\r\n\r\n` +
        `whatsapp\r\n`, 'utf-8'
      );
      
      // Add type field
      const typeField = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="type"\r\n\r\n` +
        `${mimetype}\r\n`, 'utf-8'
      );

      // Combine all parts
      const finalBuffer = Buffer.concat([
        mpField,
        typeField,
        bodyBuffer,
        fileContentBuffer,
        footerBuffer
      ]);

      const uploadUrl = `https://graph.facebook.com/${version}/${phoneNumberId}/media`;

      const uploadResponse = await firstValueFrom(
        this.httpService.post(uploadUrl, finalBuffer, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': finalBuffer.length.toString()
          },
        })
      );

      const mediaId = uploadResponse.data.id;

      // Send the media as a document
      const messageData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'document',
        document: {
          id: mediaId,
          filename: filename,
          caption: `📄 Source: ${filename}`
        },
        ...(messageID && { context: { message_id: messageID } })
      };

      const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

      await firstValueFrom(
        this.httpService.post(url, messageData, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })
      );

      this.logger.log(`Document sent successfully to ${phoneNumber}: ${filename}`);
      return true;

    } catch (error) {
      this.logger.error('Error sending document via WhatsApp:', error);
      return false;
    }
  }

  private async handleRAGMedia(
    phoneNumber: string,
    message: any,
    organisation: RAGOrganisation,
    messageID: string
  ): Promise<void> {
    try {
      let mediaType: string;
      let mediaDescription = '';

      if (message.image) {
        mediaType = 'image';
        mediaDescription = 'Image uploaded';
      } else if (message.document) {
        mediaType = 'document';
        mediaDescription = `Document uploaded: ${message.document.filename || 'document'}`;
      } else if (message.audio) {
        mediaType = 'audio';
        mediaDescription = 'Voice note uploaded';
      } else if (message.video) {
        mediaType = 'video';
        mediaDescription = 'Video uploaded';
      } else {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `❌ Unsupported media type for ${organisation} session.`,
          messageID
        );
        return;
      }

      // Show processing message
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `📤 Your ${mediaType} has been received. I'll let the ${organisation} knowledge base know you shared media.`,
        messageID
      );

      // Send to Flask RAG service with description only
      const response = await this.flaskRagService.processMedia(
        mediaType,
        mediaDescription,
        organisation
      );

      // Send response
      if (response.answer) {
        await this.messagingService.sendTextMessage(phoneNumber, response.answer, messageID);
      }

      // Update session
      await this.updateRAGSession(
        phoneNumber,
        organisation,
        `[${mediaType} uploaded]`,
        response.answer || 'Media received',
        response.sources,
        messageID
      );

      // Send follow-up prompt
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `💡 You can ask another ${organisation} question. Type "CANCEL" to exit.`,
        messageID
      );

    } catch (error) {
      this.logger.error('Error handling RAG media:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `❌ Failed to process your media. Please try again or send a text query.`,
        messageID
      );
    }
  }

  private async handleRAGLocation(
    phoneNumber: string,
    location: any,
    organisation: RAGOrganisation,
    messageID: string
  ): Promise<void> {
    try {
      if (!location || !location.latitude || !location.longitude) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `❌ Invalid location data.`,
          messageID
        );
        return;
      }

      // Show processing message
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `📍 Your location has been received. I'll let the ${organisation} knowledge base know.`,
        messageID
      );

      // Create location description
      const locationDescription = `Location shared: ${location.latitude}, ${location.longitude}`;

      // Send location description to Flask RAG service
      const response = await this.flaskRagService.processLocation(
        locationDescription,
        organisation
      );

      // Send response
      if (response.answer) {
        await this.messagingService.sendTextMessage(phoneNumber, response.answer, messageID);
      }

      // Update session
      await this.updateRAGSession(
        phoneNumber,
        organisation,
        `[Location: ${location.latitude}, ${location.longitude}]`,
        response.answer || 'Location received',
        response.sources,
        messageID
      );

      // Send follow-up prompt
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `💡 You can ask another ${organisation} question. Type "CANCEL" to exit.`,
        messageID
      );

    } catch (error) {
      this.logger.error('Error handling RAG location:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `❌ Failed to process your location. Please try again.`,
        messageID
      );
    }
  }

  private async handleRAGInteractive(
    phoneNumber: string,
    interactive: any,
    organisation: RAGOrganisation,
    messageID: string
  ): Promise<void> {
    try {
      const buttonId = interactive?.button_reply?.id;
      
      if (buttonId === 'rag_cancel') {
        await this.handleCancelCommand(phoneNumber, messageID);
        return;
      }

      // For other interactive elements, send to Flask
      const response = await this.flaskRagService.processInteractive(interactive, organisation);
      
      if (response.answer) {
        await this.messagingService.sendTextMessage(phoneNumber, response.answer, messageID);
      }

    } catch (error) {
      this.logger.error('Error handling RAG interactive:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `❌ Error processing your selection.`,
        messageID
      );
    }
  }

  /**
   * Check if there's a pending RAG request for this user/organisation
   * @param phoneNumber - The user's phone number
   * @param organisation - The RAG organisation (Government or Agriculture)
   * @returns boolean indicating if a request is pending
   */
  private hasPendingRAGRequest(phoneNumber: string, organisation: RAGOrganisation): boolean {
    const key = `${phoneNumber}:${organisation}`;
    const hasPending = this.pendingRAGRequests.has(key);
    
    if (hasPending) {
      const request = this.pendingRAGRequests.get(key);
      const elapsedTime = Date.now() - (request?.startTime || 0);
      this.logger.debug(`Pending ${organisation} request for ${phoneNumber} (${Math.round(elapsedTime / 1000)}s elapsed)`);
    }
    
    return hasPending;
  }

  /**
   * Clear a pending RAG request for a user/organisation
   * @param phoneNumber - The user's phone number
   * @param organisation - The RAG organisation (Government or Agriculture)
   */
  private clearPendingRAGRequest(phoneNumber: string, organisation: RAGOrganisation): void {
    const key = `${phoneNumber}:${organisation}`;
    const pending = this.pendingRAGRequests.get(key);
    
    if (pending) {
      // Clear the timeout to prevent it from firing
      clearTimeout(pending.timeout);
      
      // Remove from the map
      this.pendingRAGRequests.delete(key);
      
      this.logger.debug(`Cleared pending RAG request for ${phoneNumber} (${organisation})`);
    }
  }

  /**
   * Clear ALL pending RAG requests for a user (both Government and Agriculture)
   * @param phoneNumber - The user's phone number
   */
  private clearAllPendingRAGRequests(phoneNumber: string): void {
    // Clear Government request if exists
    this.clearPendingRAGRequest(phoneNumber, 'Government');
    
    // Clear Agriculture request if exists
    this.clearPendingRAGRequest(phoneNumber, 'Agriculture');
    
    this.logger.debug(`Cleared all pending RAG requests for ${phoneNumber}`);
  }

  /**
   * Get details of a pending RAG request
   * @param phoneNumber - The user's phone number
   * @param organisation - The RAG organisation
   * @returns The pending request details or undefined if none exists
   */
  private getPendingRAGRequest(phoneNumber: string, organisation: RAGOrganisation): PendingRAGRequest | undefined {
    const key = `${phoneNumber}:${organisation}`;
    return this.pendingRAGRequests.get(key);
  }

  /**
   * Check if a specific message corresponds to a pending RAG request
   * @param messageId - The message ID to check
   * @returns boolean indicating if this message has a pending request
   */
  private isMessagePending(messageId: string): boolean {
    for (const [_, request] of this.pendingRAGRequests.entries()) {
      if (request.messageId === messageId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get statistics about pending RAG requests (useful for monitoring)
   */
  private getPendingRAGStats(): { count: number; details: Array<{ phone: string; org: string; elapsed: number }> } {
    const now = Date.now();
    const details: Array<{ phone: string; org: string; elapsed: number }> = [];
    
    for (const [key, request] of this.pendingRAGRequests.entries()) {
      const [phone, org] = key.split(':');
      details.push({
        phone,
        org,
        elapsed: Math.round((now - request.startTime) / 1000) // seconds
      });
    }
    
    return {
      count: this.pendingRAGRequests.size,
      details
    };
  }

  private registerPendingRAGRequest(
    phoneNumber: string, 
    organisation: RAGOrganisation,
    messageID: string,
    promise: Promise<void>,
    query: string
  ): void {
    const key = `${phoneNumber}:${organisation}`;
    
    this.clearPendingRAGRequest(phoneNumber, organisation);
    
    const timeout = setTimeout(() => {
      this.logger.warn(`RAG request timeout for ${phoneNumber} (${organisation}) after ${this.RAG_TIMEOUT}ms`);
      this.pendingRAGRequests.delete(key);
      
      this.messagingService.sendTextMessage(
        phoneNumber,
        `⏱️ The ${organisation} knowledge base is taking longer than expected to respond. Please try again in a few moments.`,
        messageID
      ).catch(err => this.logger.error('Error sending timeout message:', err));
    }, this.RAG_TIMEOUT);
    
    this.pendingRAGRequests.set(key, {
      promise,
      timeout,
      startTime: Date.now(),
      messageId: messageID,
      organisation,
      query
    });
  }

  public cleanupOldData(): void {
    // Clean up processed messages
    const now = Date.now();
    for (const [messageId, timestamp] of this.processedMessages.entries()) {
      if (now - timestamp > this.MESSAGE_DEDUP_TTL) {
        this.processedMessages.delete(messageId);
      }
    }

    // Clean up recent queries
    for (const [key, data] of this.recentUserQueries.entries()) {
      if (now - data.timestamp > this.QUERY_DEDUP_TTL) {
        this.recentUserQueries.delete(key);
      }
    }

    // Clean up status updates (keep last 1000 to prevent memory leak)
    if (this.processedStatusUpdates.size > 1000) {
      const toDelete = Array.from(this.processedStatusUpdates).slice(0, 500);
      toDelete.forEach(id => this.processedStatusUpdates.delete(id));
    }

    // Clean up stale pending requests
    for (const [key, request] of this.pendingRAGRequests.entries()) {
      if (now - request.startTime > this.RAG_TIMEOUT) {
        this.logger.warn(`Cleaning up stale RAG request: ${key}`);
        clearTimeout(request.timeout);
        this.pendingRAGRequests.delete(key);
      }
    }

    // Clean up auto-downloaded sources
    for (const [phoneNumber, data] of this.autoDownloadedSources.entries()) {
      if (now - data.timestamp > this.AUTO_DOWNLOAD_TTL) {
        this.autoDownloadedSources.delete(phoneNumber);
        this.logger.debug(`Cleaned up auto-downloaded sources for ${phoneNumber}`);
      }
    }

    // Clean up FlaskRagService sent sources
    this.flaskRagService.cleanupSentSources();
  }

  private async getRAGSession(phoneNumber: string): Promise<{ organisation: RAGOrganisation } | null> {
    try {
      const activeSession = await this.sessionManager.getActiveSession(phoneNumber);
      
      if (!activeSession) return null;
      
      // Check if it's a RAG session type
      if (activeSession.sessionType === SessionType.GOVERNMENT || 
          activeSession.sessionType === SessionType.FARMER) {
        
        const sessionData = activeSession.sessionData ? 
          (typeof activeSession.sessionData === 'string' ? 
            JSON.parse(activeSession.sessionData) : 
            activeSession.sessionData) : null;
        
        if (sessionData?.organisation) {
          return { organisation: sessionData.organisation };
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('Error getting RAG session:', error);
      return null;
    }
  }

  private async createRAGSession(
    phoneNumber: string,
    organisation: RAGOrganisation,
    messageID: string
  ): Promise<void> {
    try {
      const sessionType = organisation === 'Government' ? SessionType.GOVERNMENT : SessionType.FARMER;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      const sessionData = {
        organisation,
        history: [],
        startedAt: new Date(),
        messageId: messageID
      };

      const activeSession = await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        sessionType,
        1,
        sessionData,
        messageID,
        expiresAt
      );

      await this.setCurrentSession(phoneNumber, activeSession.id.toString(), sessionType, expiresAt);
      
      this.logger.log(`Created ${organisation} RAG session for ${phoneNumber}`);
    } catch (error) {
      this.logger.error('Error creating RAG session:', error);
      throw error;
    }
  }

  private async routeMessageToSessionHandler(phoneNumber: string, message: any, messageID: string): Promise<void> {
    try {
      const activeSession = await this.sessionManager.getActiveSession(phoneNumber);
      
      if (!activeSession) {
        this.logger.log(`No active session found for ${phoneNumber}, sending welcome message`);
        await this.sendWelcomeMessage(phoneNumber, messageID);
        return;
      }

      // Check for cancel command
      if (message.type === 'text') {
        const text = message.text?.body?.trim();
        if (text && this.isCancelCommand(text)) {
          await this.handleCancelCommand(phoneNumber, messageID);
          return;
        }
      }

      this.logger.log(`Routing message to session handler for ${phoneNumber}, session type: ${activeSession.sessionType}`);

      // Route based on session type
      switch (activeSession.sessionType) {
        case SessionType.EMERGENCY:
          await this.routeToEmergencyReporting(phoneNumber, message, messageID);
          break;
        
        case SessionType.ISSUE_REPORTING:
          await this.routeToIssueReporting(phoneNumber, message, messageID);
          break;
        
        case SessionType.REGISTRATION:
          await this.routeToRegistration(phoneNumber, message, messageID);
          break;
        
        case SessionType.EDIT_FEEDBACK:
          await this.routeToEditFeedback(phoneNumber, message, messageID);
          break;

        case SessionType.AGROMATE: 
          if (message.type === 'text') {
            const text = message.text?.body?.trim();
            if (text) {
              await this.ecofarmerService.handleEcoFarmerMessage(phoneNumber, text, messageID);
            } else {
              await this.messagingService.sendTextMessage(
                phoneNumber,
                'Please send a text message. Type "CANCEL" to exit Agromate.',
                messageID
              );
            }
          } else {
            await this.messagingService.sendTextMessage(
              phoneNumber,
              'Please send text messages for Agromate commands. Type "CANCEL" to exit.',
              messageID
            );
          }
          break;
        
        default:
          this.logger.warn(`Unhandled session type: ${activeSession.sessionType} for ${phoneNumber}`);
          await this.sendWelcomeMessage(phoneNumber, messageID);
          break;
      }
    } catch (error) {
      this.logger.error(`Error routing message to session handler for ${phoneNumber}:`, error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ An error occurred while processing your message. Please try again.',
        messageID
      );
    }
  }

  private async routeToEditFeedback(phoneNumber: string, message: any, messageID: string): Promise<void> {
    try {
      const activeSession = await this.sessionManager.getActiveSession(phoneNumber);
      
      // If no active edit session but user typed "EDIT <reportID>", handle it specially
      if (!activeSession || activeSession.sessionType !== SessionType.EDIT_FEEDBACK) {
        // Check if this is a direct edit command with report ID
        if (message.type === 'text') {
          const text = message.text?.body?.trim();
          if (text) {
            const normalizedText = text.toLowerCase().trim();
            
            // Check for "EDIT <reportID>" pattern
            if (normalizedText.startsWith('edit ')) {
              const parts = text.split(' ');
              if (parts.length >= 2) {
                const reportId = parseInt(parts[1]);
                if (!isNaN(reportId)) {
                  // Start edit flow directly with this report ID
                  await this.startDirectEditWithReportId(phoneNumber, reportId, messageID);
                  return;
                }
              }
            }
            
            // Check for just a number (report ID) - user might be responding to previous prompt
            if (/^\d+$/.test(normalizedText)) {
              const reportId = parseInt(normalizedText);
              // Check if user was just shown a list of reports
              const lastMessage = await this.messagingService.getLastMessage(phoneNumber);
              // Only treat as report selection if the last message contained report listings
              // or if we're explicitly in the SELECT_REPORT_ID step
              if (lastMessage && lastMessage.includes('YOUR REPORTS') && lastMessage.includes('To edit a report')) {
                await this.startDirectEditWithReportId(phoneNumber, reportId, messageID);
                return;
              }
            }
          }
        }
        
        // No edit session, send to welcome
        await this.sendWelcomeMessage(phoneNumber, messageID);
        return;
      }

      // Parse session data with proper type
      const sessionData: EditSessionData = activeSession.sessionData ? 
        (typeof activeSession.sessionData === 'string' ? 
          JSON.parse(activeSession.sessionData) : 
          activeSession.sessionData) as EditSessionData : 
        { step: 'SELECT_REPORT_TYPE' };
      
      const step = sessionData.step || 'SELECT_REPORT_TYPE';

      // Handle text messages
      if (message.type === 'text') {
        const text = message.text?.body?.trim();
        if (!text) return;

        const normalizedText = text.toLowerCase().trim();

        // Check for cancel command
        if (this.isCancelCommand(normalizedText)) {
          await this.sessionManager.cancelSession(phoneNumber, SessionType.EDIT_FEEDBACK);
          await this.clearCurrentSession(phoneNumber);
          await this.messagingService.sendTextMessage(
            phoneNumber,
            '❌ Edit process cancelled.',
            messageID
          );
          await this.sendWelcomeMessage(phoneNumber, messageID);
          return;
        }

        // Check for back command
        if (normalizedText === 'back') {
          await this.handleEditBackCommand(phoneNumber, sessionData, messageID);
          return;
        }

        // Handle based on current step
        switch (step) {
          case 'SELECT_REPORT_TYPE':
            // User can type "EMERGENCY" or "ISSUE" to select report type
            if (text === 'emergency' || text === 'issue') {
              await this.handleEditReportTypeSelection(phoneNumber, text.toUpperCase() as 'EMERGENCY' | 'ISSUE', messageID);
            } else {
              await this.messagingService.sendTextMessage(
                phoneNumber,
                '❌ Please select a report type. Type "EMERGENCY" or "ISSUE", or use the buttons above.\n\nOr type "CANCEL" to exit.',
                messageID
              );
            }
            break;
          
          case 'SELECT_REPORT_ID':
            // Handle direct report ID entry (user-friendly approach)
            if (/^\d+$/.test(text)) {
              const reportId = parseInt(text);
              
              // Validate report belongs to user
              const canEdit = await this.canUserEditReport(phoneNumber, reportId, sessionData.reportType!);
              
              if (canEdit) {
                // Get report details
                let report: any;
                if (sessionData.reportType === 'EMERGENCY') {
                  report = await this.emergencyReportingService.getEmergencyReportById(reportId);
                } else {
                  report = await this.issueReportingService.getIssueReportById(reportId);
                }
                
                if (!report) {
                  await this.messagingService.sendTextMessage(
                    phoneNumber,
                    '❌ Report not found. Please try again.',
                    messageID
                  );
                  return;
                }
                
                // Update session with selected report
                await this.sessionManager.createOrUpdateActiveSession(
                  phoneNumber,
                  SessionType.EDIT_FEEDBACK,
                  3,
                  {
                    ...sessionData,
                    reportId,
                    reportData: report,
                    step: 'SHOW_EDIT_MENU'
                  },
                  messageID
                );
                
                // Show edit menu
                const editMenu = this.editFeedbackService.getEditMenu(sessionData.reportType!, reportId, report);
                await this.messagingService.sendTextMessage(phoneNumber, editMenu, messageID);
              } else {
                await this.messagingService.sendTextMessage(
                  phoneNumber,
                  '❌ You cannot edit this report. You can only edit reports you submitted.',
                  messageID
                );
              }
            }
            // Handle "EDIT <report-id>" pattern as alternative
            else if (text.startsWith('edit ')) {
              const parts = text.split(' ');
              if (parts.length >= 2) {
                const reportId = parseInt(parts[1]);
                if (isNaN(reportId)) {
                  await this.messagingService.sendTextMessage(
                    phoneNumber,
                    '❌ Invalid report ID. Please use a number.',
                    messageID
                  );
                  return;
                }
                
                // Validate report belongs to user
                const canEdit = await this.canUserEditReport(phoneNumber, reportId, sessionData.reportType!);
                if (!canEdit) {
                  await this.messagingService.sendTextMessage(
                    phoneNumber,
                    '❌ You cannot edit this report. You can only edit reports you submitted.',
                    messageID
                  );
                  return;
                }
                
                // Get report details
                let report: any;
                if (sessionData.reportType === 'EMERGENCY') {
                  report = await this.emergencyReportingService.getEmergencyReportById(reportId);
                } else {
                  report = await this.issueReportingService.getIssueReportById(reportId);
                }
                
                if (!report) {
                  await this.messagingService.sendTextMessage(
                    phoneNumber,
                    '❌ Report not found.',
                    messageID
                  );
                  return;
                }
                
                // Update session with selected report
                await this.sessionManager.createOrUpdateActiveSession(
                  phoneNumber,
                  SessionType.EDIT_FEEDBACK,
                  3, // Step 3: Show edit menu
                  {
                    ...sessionData,
                    reportId,
                    reportData: report,
                    step: 'SHOW_EDIT_MENU'
                  },
                  messageID
                );
                
                // Show edit menu
                const editMenu = this.editFeedbackService.getEditMenu(sessionData.reportType!, reportId, report);
                await this.messagingService.sendTextMessage(phoneNumber, editMenu, messageID);
              } else {
                await this.messagingService.sendTextMessage(
                  phoneNumber,
                  '❌ Please specify report ID. Usage: EDIT <report-id>\nExample: EDIT 123',
                  messageID
                );
              }
            } else {
              // Show help for this step
              await this.messagingService.sendTextMessage(
                phoneNumber,
                '📝 *Select a report to edit*\n\n' +
                'To edit a report, simply type the report number:\n' +
                '• Type the report ID (e.g., "123")\n\n' +
                'Or type "EDIT <report-id>" if you prefer:\n' +
                '• Example: "EDIT 123"\n\n' +
                'Or type "BACK" to choose a different report type.\n' +
                'Type "CANCEL" to exit.',
                messageID
              );
            }
            break;
          
          case 'SHOW_EDIT_MENU':
            // Handle edit menu selection (1-5)
            if (/^[1-5]$/.test(text)) {
              const selection = text;
              const result = await this.editFeedbackService.handleEditSelection(
                selection,
                sessionData.reportType!,
                sessionData.reportId!
              );
              
              if (!result.requiresInput) {
                await this.messagingService.sendTextMessage(phoneNumber, result.message, messageID);
                return;
              }
              
              // Update session for edit in progress
              await this.sessionManager.createOrUpdateActiveSession(
                phoneNumber,
                SessionType.EDIT_FEEDBACK,
                4,
                {
                  ...sessionData,
                  step: 'EDIT_IN_PROGRESS',
                  editAction: result.action,
                  editData: {},
                  requiresInput: true
                },
                messageID
              );
              
              await this.messagingService.sendTextMessage(phoneNumber, result.message, messageID);
            } else if (text === 'menu') {
              // Show edit menu again
              const editMenu = this.editFeedbackService.getEditMenu(sessionData.reportType!, sessionData.reportId!, sessionData.reportData);
              await this.messagingService.sendTextMessage(phoneNumber, editMenu, messageID);
            } else {
              await this.messagingService.sendTextMessage(
                phoneNumber,
                '❌ Please choose a valid option (1-5) from the edit menu.\n\nOr type "MENU" to see options again.\nType "BACK" to return.\nType "CANCEL" to exit.',
                messageID
              );
            }
            break;
          
          case 'EDIT_IN_PROGRESS':
            await this.handleEditInProgress(phoneNumber, message, messageID);
            break;
          
          case 'CONFIRM_EDIT':
            const normalizedText = text.toLowerCase().trim();
            
            if (normalizedText === '2' || normalizedText === 'submit' || normalizedText === 'submit all changes') {
              await this.handleEditSubmit(phoneNumber, messageID);
            } else if (normalizedText === '1' || normalizedText === 'make another edit' || normalizedText === 'another edit') {
              // Go back to edit menu
              await this.sessionManager.createOrUpdateActiveSession(
                phoneNumber,
                SessionType.EDIT_FEEDBACK,
                3,
                {
                  ...sessionData,
                  step: 'SHOW_EDIT_MENU',
                  editAction: undefined,
                  editData: {},
                  requiresInput: undefined
                },
                messageID
              );
              
              const editMenu = this.editFeedbackService.getEditMenu(
                sessionData.reportType!,
                sessionData.reportId!,
                sessionData.reportData
              );
              await this.messagingService.sendTextMessage(phoneNumber, editMenu, messageID);
            } else if (normalizedText === '3' || normalizedText === 'cancel' || normalizedText === 'cancel all edits') {
              await this.sessionManager.cancelSession(phoneNumber, SessionType.EDIT_FEEDBACK);
              await this.clearCurrentSession(phoneNumber);
              await this.messagingService.sendTextMessage(
                phoneNumber,
                '❌ All edits cancelled. No changes were saved.',
                messageID
              );
              await this.sendWelcomeMessage(phoneNumber, messageID);
            } else if (normalizedText === 'back') {
              // Go back to edit menu
              await this.sessionManager.createOrUpdateActiveSession(
                phoneNumber,
                SessionType.EDIT_FEEDBACK,
                3,
                {
                  ...sessionData,
                  step: 'SHOW_EDIT_MENU',
                  editAction: undefined,
                  editData: {},
                  requiresInput: undefined
                },
                messageID
              );
              
              const editMenu = this.editFeedbackService.getEditMenu(
                sessionData.reportType!,
                sessionData.reportId!,
                sessionData.reportData
              );
              await this.messagingService.sendTextMessage(phoneNumber, editMenu, messageID);
            } else {
              // Show review again with options
              const editReview = await this.prepareEditReview(
                phoneNumber, 
                sessionData.reportType!, 
                sessionData.reportId!, 
                sessionData.editData || {}
              );
              await this.messagingService.sendTextMessage(phoneNumber, editReview, messageID);
            }
            break;
          
          default:
            await this.messagingService.sendTextMessage(
              phoneNumber,
              '❌ Invalid edit state. Please start over by typing "EDIT".',
              messageID
            );
            await this.sessionManager.cancelSession(phoneNumber, SessionType.EDIT_FEEDBACK);
            await this.clearCurrentSession(phoneNumber);
            break;
        }
      } 
      // Handle media uploads during edit
      else if (['image', 'audio', 'video', 'document'].includes(message.type)) {
        if (step === 'EDIT_IN_PROGRESS' && sessionData.editAction === 'ADD_MEDIA') {
          await this.handleEditMedia(phoneNumber, message, messageID);
        } else {
          await this.messagingService.sendTextMessage(
            phoneNumber,
            `❌ Please complete the current step before uploading media.\n\nCurrently in step: ${step}`,
            messageID
          );
        }
      } 
      // Handle location during edit
      else if (message.type === 'location') {
        if (step === 'EDIT_IN_PROGRESS' && sessionData.editAction === 'UPDATE_LOCATION') {
          await this.handleEditLocation(phoneNumber, message, messageID);
        } else {
          await this.messagingService.sendTextMessage(
            phoneNumber,
            `❌ Please complete the current step before sharing location.\n\nCurrently in step: ${step}`,
            messageID
          );
        }
      } 
      // Handle interactive messages (button clicks)
      else if (message.type === 'interactive') {
        const buttonId = message.interactive?.button_reply?.id;
        
        if (buttonId === 'edit_emergency') {
          await this.handleEditReportTypeSelection(phoneNumber, 'EMERGENCY', messageID);
        } else if (buttonId === 'edit_issue') {
          await this.handleEditReportTypeSelection(phoneNumber, 'ISSUE', messageID);
        } else if (buttonId === 'edit_cancel') {
          await this.sessionManager.cancelSession(phoneNumber, SessionType.EDIT_FEEDBACK);
          await this.clearCurrentSession(phoneNumber);
          await this.messagingService.sendTextMessage(
            phoneNumber,
            '❌ Edit process cancelled.',
            messageID
          );
          await this.sendWelcomeMessage(phoneNumber, messageID);
        } else {
          await this.messagingService.sendTextMessage(
            phoneNumber,
            '❌ Unknown button. Please use text commands.',
            messageID
          );
        }
      } 
      else {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Please use text, media, location, or interactive buttons for editing.',
          messageID
        );
      }
    } catch (error) {
      this.logger.error(`Error in edit feedback routing for ${phoneNumber}:`, error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ An error occurred during editing. Please try again.',
        messageID
      );
    }
  }

  private async startDirectEditWithReportId(phoneNumber: string, reportId: number, messageID: string): Promise<void> {
    try {
      this.logger.log(`Starting direct edit for report ID ${reportId} from ${phoneNumber}`);
      
      // Determine report type by checking both services
      let report: any;
      let reportType: 'EMERGENCY' | 'ISSUE' | null = null;
      
      // Check emergency reports first
      try {
        report = await this.emergencyReportingService.getEmergencyReportById(reportId);
        if (report && report.reportingPhoneNumber === phoneNumber) {
          reportType = 'EMERGENCY';
          this.logger.log(`Found emergency report #${reportId} for user ${phoneNumber}`);
        }
      } catch (e) {
        this.logger.debug(`No emergency report found for ID ${reportId}`);
      }
      
      if (!report || !reportType) {
        // Check issue reports
        try {
          report = await this.issueReportingService.getIssueReportById(reportId);
          if (report && report.reportingPhoneNumber === phoneNumber) {
            reportType = 'ISSUE';
            this.logger.log(`Found issue report #${reportId} for user ${phoneNumber}`);
          }
        } catch (e) {
          this.logger.debug(`No issue report found for ID ${reportId}`);
        }
      }
      
      if (!report || !reportType) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Report not found or you do not have permission to edit it.\n\n' +
          'Please start edit process by typing "EDIT" to see your reports.',
          messageID
        );
        return;
      }
      
      // Check if already in a different session type
      const currentSession = await this.getCurrentSession(phoneNumber);
      if (currentSession && currentSession.sessionType !== SessionType.EDIT_FEEDBACK) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `⚠️ You already have an active ${currentSession.sessionType} session. Please complete it or type "CANCEL" to exit first.`,
          messageID
        );
        return;
      }
      
      // Cancel any existing edit session
      await this.sessionManager.cancelSession(phoneNumber, SessionType.EDIT_FEEDBACK);
      
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      // Create edit session directly with the selected report
      const activeSession = await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.EDIT_FEEDBACK,
        3, // Start at step 3 (show edit menu)
        {
          step: 'SHOW_EDIT_MENU',
          reportType,
          reportId,
          reportData: report,
          startedAt: new Date(),
          messageId: messageID,
          data: {}
        },
        messageID,
        expiresAt
      );
      
      // Track as current session
      await this.setCurrentSession(phoneNumber, activeSession.id.toString(), SessionType.EDIT_FEEDBACK, expiresAt);
      
      // Show edit menu
      const editMenu = this.editFeedbackService.getEditMenu(reportType, reportId, report);
      await this.messagingService.sendTextMessage(phoneNumber, editMenu, messageID);
      
    } catch (error) {
      this.logger.error('Error starting direct edit with report ID:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error starting edit. Please try again by typing "EDIT".',
        messageID
      );
    }
  }

  private async handleEditBackCommand(phoneNumber: string, sessionData: EditSessionData, messageID: string): Promise<void> {
    try {
      const step = sessionData.step || 'SELECT_REPORT_TYPE';
      
      switch (step) {
        case 'SELECT_REPORT_ID':
          // Go back to select report type
          await this.sessionManager.createOrUpdateActiveSession(
            phoneNumber,
            SessionType.EDIT_FEEDBACK,
            1,
            {
              ...sessionData,
              step: 'SELECT_REPORT_TYPE',
              reportType: undefined,
              userReports: undefined,
              reportId: undefined
            },
            messageID
          );

          // Show interactive menu again
          await this.sendEditReportTypeMenu(phoneNumber, messageID);
          break;

        case 'SHOW_EDIT_MENU':
          // Go back to select report ID
          if (sessionData.userReports && sessionData.reportType) {
            await this.showUserReportsList(
              phoneNumber, 
              sessionData.reportType, 
              sessionData.userReports, 
              messageID
            );
            
            // Update session state
            await this.sessionManager.createOrUpdateActiveSession(
              phoneNumber,
              SessionType.EDIT_FEEDBACK,
              2,
              {
                ...sessionData,
                step: 'SELECT_REPORT_ID',
                reportId: undefined,
                reportData: undefined,
                editAction: undefined,
                editData: undefined
              },
              messageID
            );
          } else {
            await this.messagingService.sendTextMessage(
              phoneNumber,
              '❌ Cannot go back. Please start over by typing "EDIT".',
              messageID
            );
            await this.sessionManager.cancelSession(phoneNumber, SessionType.EDIT_FEEDBACK);
          }
          break;

        case 'EDIT_IN_PROGRESS':
        case 'CONFIRM_EDIT':
          // Go back to edit menu
          await this.sessionManager.createOrUpdateActiveSession(
            phoneNumber,
            SessionType.EDIT_FEEDBACK,
            3,
            {
              ...sessionData,
              step: 'SHOW_EDIT_MENU',
              editAction: undefined,
              editData: undefined,
              requiresInput: undefined
            },
            messageID
          );

          const editMenu = this.editFeedbackService.getEditMenu(
            sessionData.reportType!,
            sessionData.reportId!,
            sessionData.reportData
          );
          await this.messagingService.sendTextMessage(phoneNumber, editMenu, messageID);
          break;

        default:
          await this.messagingService.sendTextMessage(
            phoneNumber,
            '❌ Cannot go back from this step.',
            messageID
          );
          break;
      }
    } catch (error) {
      this.logger.error('Error handling edit back command:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error going back. Please try again.',
        messageID
      );
    }
  }

  private async sendEditReportTypeMenuInSession(phoneNumber: string, messageID: string): Promise<boolean> {
    try {
      const messageData: MessageData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: `📝 *EDIT REPORTS* 📝\n\nChoose report type to edit:\n\nYou can also type:\n• "EMERGENCY" for emergency reports\n• "ISSUE" for issue reports\n• "BACK" to return\n• "CANCEL" to exit`
          },
          action: {
            buttons: [
              {
                reply: {
                  id: 'edit_emergency',
                  title: '🚨 EMERGENCY'
                },
                type: 'reply'
              },
              {
                reply: {
                  id: 'edit_issue',
                  title: '📝 ISSUE'
                },
                type: 'reply',
              },
              {
                reply: {
                  id: 'edit_cancel',
                  title: '❌ CANCEL'
                },
                type: 'reply'
              }
            ]
          }
        }
      };

      return await this.sendWhatsappMessage(messageData, messageID);
    } catch (error) {
      this.logger.error('Error sending edit report type menu:', error);
      
      // Fallback to text message
      const fallbackMessage = `📝 *EDIT REPORTS* 📝\n\nChoose report type to edit:\n\n*Available commands:*\n• "EMERGENCY" - Edit emergency reports\n• "ISSUE" - Edit issue reports\n• "BACK" - Return to previous step\n• "CANCEL" - Exit edit mode\n\nPlease type your choice:`;
      
      return await this.messagingService.sendTextMessage(phoneNumber, fallbackMessage, messageID);
    }
  }

  private async handleEditInProgress(phoneNumber: string, message: any, messageID: string): Promise<void> {
    const activeSession = await this.sessionManager.getActiveSession(phoneNumber);
    if (!activeSession) return;

    // Parse session data with proper type
    const sessionData: EditSessionData = activeSession.sessionData ? 
      (typeof activeSession.sessionData === 'string' ? 
        JSON.parse(activeSession.sessionData) : 
        activeSession.sessionData) as EditSessionData : 
      { step: 'SELECT_REPORT_TYPE' };
    
    const editAction = sessionData.editAction;
    const editData = sessionData.editData || {};

    this.logger.log(`Edit in progress - Action: ${editAction}, Step: ${sessionData.step}`);

    // Handle text messages
    if (message.type === 'text') {
      const text = message.text?.body?.trim();
      if (!text) return;
      
      const normalizedText = text.toLowerCase().trim();

      // Check for cancel command
      if (this.isCancelCommand(normalizedText)) {
        await this.sessionManager.cancelSession(phoneNumber, SessionType.EDIT_FEEDBACK);
        await this.clearCurrentSession(phoneNumber);
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Edit process cancelled.',
          messageID
        );
        await this.sendWelcomeMessage(phoneNumber, messageID);
        return;
      }

      // Check for back command
      if (normalizedText === 'back') {
        await this.handleEditBackCommand(phoneNumber, sessionData, messageID);
        return;
      }

      // Handle based on edit action
      switch (editAction) {
        case 'ADD_MEDIA':
          if (normalizedText === 'done' || normalizedText === 'submit') {
            // User finished adding media
            const updatedEditData = editData;
            
            if (updatedEditData.media && updatedEditData.media.length > 0) {
              // Evaluate for hazards and similarity BEFORE moving to confirmation
              await this.evaluateEditForHazardsAndSimilarity(
                phoneNumber,
                sessionData.reportType!,
                sessionData.reportId!,
                updatedEditData
              );
              
              // Update session to confirmation step
              await this.sessionManager.createOrUpdateActiveSession(
                phoneNumber,
                SessionType.EDIT_FEEDBACK,
                4,
                {
                  ...sessionData,
                  editData: updatedEditData,
                  step: 'CONFIRM_EDIT'
                },
                messageID
              );
              
              // Show review
              const editReview = await this.prepareEditReview(
                phoneNumber, 
                sessionData.reportType!, 
                sessionData.reportId!, 
                updatedEditData
              );
              await this.messagingService.sendTextMessage(phoneNumber, editReview, messageID);
            } else {
              await this.messagingService.sendTextMessage(
                phoneNumber,
                '❌ No media files were added.\n\n' +
                'Options:\n' +
                '• Send media files to add them\n' +
                '• Type "BACK" to return to edit menu\n' +
                '• Type "CANCEL" to exit',
                messageID
              );
            }
            return;
          } else {
            // If they typed something else during media upload, remind them
            await this.messagingService.sendTextMessage(
              phoneNumber,
              '📸 Please send media files (photos, videos, or voice notes).\n\n' +
              'When finished, type "DONE" or "SUBMIT".\n\n' +
              'Type "BACK" to return to edit menu.\n' +
              'Type "CANCEL" to exit.',
              messageID
            );
            return;
          }
          
        case 'ADD_NOTE':
          if (text.length > 0) {
            const updatedEditData = { ...editData, note: text };
            
            // Evaluate for hazards and similarity BEFORE moving to confirmation
            await this.evaluateEditForHazardsAndSimilarity(
              phoneNumber,
              sessionData.reportType!,
              sessionData.reportId!,
              updatedEditData
            );
            
            // Update session
            await this.sessionManager.createOrUpdateActiveSession(
              phoneNumber,
              SessionType.EDIT_FEEDBACK,
              4,
              {
                ...sessionData,
                editData: updatedEditData,
                step: 'CONFIRM_EDIT'
              },
              messageID
            );
            
            // Show review
            const editReview = await this.prepareEditReview(
              phoneNumber, 
              sessionData.reportType!, 
              sessionData.reportId!, 
              updatedEditData
            );
            await this.messagingService.sendTextMessage(phoneNumber, editReview, messageID);
          }
          break;
          
        case 'UPDATE_LOCATION':
          if (text.length > 0) {
            const updatedEditData = { ...editData, location: text };
            
            // Evaluate for hazards and similarity BEFORE moving to confirmation
            await this.evaluateEditForHazardsAndSimilarity(
              phoneNumber,
              sessionData.reportType!,
              sessionData.reportId!,
              updatedEditData
            );
            
            // Update session
            await this.sessionManager.createOrUpdateActiveSession(
              phoneNumber,
              SessionType.EDIT_FEEDBACK,
              4,
              {
                ...sessionData,
                editData: updatedEditData,
                step: 'CONFIRM_EDIT'
              },
              messageID
            );
            
            // Show review
            const editReview = await this.prepareEditReview(
              phoneNumber, 
              sessionData.reportType!, 
              sessionData.reportId!, 
              updatedEditData
            );
            await this.messagingService.sendTextMessage(phoneNumber, editReview, messageID);
          }
          break;
          
        case 'UPDATE_DESCRIPTION':
          if (text.length > 0) {
            const updatedEditData = { ...editData, description: text };
            
            // Evaluate for hazards and similarity BEFORE moving to confirmation
            await this.evaluateEditForHazardsAndSimilarity(
              phoneNumber,
              sessionData.reportType!,
              sessionData.reportId!,
              updatedEditData
            );
            
            // Update session
            await this.sessionManager.createOrUpdateActiveSession(
              phoneNumber,
              SessionType.EDIT_FEEDBACK,
              4,
              {
                ...sessionData,
                editData: updatedEditData,
                step: 'CONFIRM_EDIT'
              },
              messageID
            );
            
            // Show review
            const editReview = await this.prepareEditReview(
              phoneNumber, 
              sessionData.reportType!, 
              sessionData.reportId!, 
              updatedEditData
            );
            await this.messagingService.sendTextMessage(phoneNumber, editReview, messageID);
          }
          break;
          
        case 'PROVIDE_FEEDBACK':
          const feedbackMatch = text.match(/^(\d+)\s*[-:]\s*(.+)$/);
          if (feedbackMatch) {
            const rating = parseInt(feedbackMatch[1]);
            if (rating >= 1 && rating <= 5) {
              const updatedEditData = { 
                ...editData, 
                rating: rating,
                feedback: feedbackMatch[2] 
              };
              
              // Update session
              await this.sessionManager.createOrUpdateActiveSession(
                phoneNumber,
                SessionType.EDIT_FEEDBACK,
                4,
                {
                  ...sessionData,
                  editData: updatedEditData,
                  step: 'CONFIRM_EDIT'
                },
                messageID
              );
              
              // Show review
              const editReview = await this.prepareEditReview(
                phoneNumber, 
                sessionData.reportType!, 
                sessionData.reportId!, 
                updatedEditData
              );
              await this.messagingService.sendTextMessage(phoneNumber, editReview, messageID);
            } else {
              await this.messagingService.sendTextMessage(
                phoneNumber,
                '❌ Please provide a rating between 1 and 5.\n\nExample: "4 - Quick response but need more updates"',
                messageID
              );
            }
          } else {
            await this.messagingService.sendTextMessage(
              phoneNumber,
              '❌ Please use format: "Rating - Feedback"\nExample: "4 - Quick response but need more updates"',
              messageID
            );
          }
          break;
          
        case 'STATUS_UPDATE':
          if (['1', '2', '3'].includes(text)) {
            const updatedEditData = { ...editData, statusChoice: text };
            
            // If user selected option 2, ask for comment
            if (text === '2') {
              await this.sessionManager.createOrUpdateActiveSession(
                phoneNumber,
                SessionType.EDIT_FEEDBACK,
                4,
                {
                  ...sessionData,
                  editAction: 'STATUS_UPDATE',
                  editData: updatedEditData,
                  step: 'EDIT_IN_PROGRESS'
                },
                messageID
              );
              
              await this.messagingService.sendTextMessage(
                phoneNumber,
                '💬 Please provide your follow-up comment:',
                messageID
              );
              return;
            } else {
              // For options 1 and 3, move to confirmation
              await this.sessionManager.createOrUpdateActiveSession(
                phoneNumber,
                SessionType.EDIT_FEEDBACK,
                4,
                {
                  ...sessionData,
                  editData: updatedEditData,
                  step: 'CONFIRM_EDIT'
                },
                messageID
              );
              
              const editReview = await this.prepareEditReview(
                phoneNumber, 
                sessionData.reportType!, 
                sessionData.reportId!, 
                updatedEditData
              );
              await this.messagingService.sendTextMessage(phoneNumber, editReview, messageID);
            }
          } else if (editData.statusChoice === '2') {
            // This is a follow-up comment for option 2
            const updatedEditData = { ...editData, followupComment: text };
            
            await this.sessionManager.createOrUpdateActiveSession(
              phoneNumber,
              SessionType.EDIT_FEEDBACK,
              4,
              {
                ...sessionData,
                editData: updatedEditData,
                step: 'CONFIRM_EDIT'
              },
              messageID
            );
            
            const editReview = await this.prepareEditReview(
              phoneNumber, 
              sessionData.reportType!, 
              sessionData.reportId!, 
              updatedEditData
            );
            await this.messagingService.sendTextMessage(phoneNumber, editReview, messageID);
          } else {
            await this.messagingService.sendTextMessage(
              phoneNumber,
              '❌ Please choose 1, 2, or 3.',
              messageID
            );
          }
          break;
          
        default:
          await this.messagingService.sendTextMessage(
            phoneNumber,
            '❌ Invalid edit action.',
            messageID
          );
      }
    } 
    // Handle media uploads
    else if (['image', 'audio', 'video', 'document'].includes(message.type)) {
      if (editAction === 'ADD_MEDIA') {
        await this.handleEditMedia(phoneNumber, message, messageID);
      } else {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Please complete the current step before uploading media.',
          messageID
        );
      }
    } 
    // Handle location
    else if (message.type === 'location') {
      if (editAction === 'UPDATE_LOCATION') {
        await this.handleEditLocation(phoneNumber, message, messageID);
      } else {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Please complete the current step before sharing location.',
          messageID
        );
      }
    } 
    else {
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Please provide valid input for this edit action.',
        messageID
      );
    }
  }

  private async evaluateEditForHazardsAndSimilarity(
    phoneNumber: string,
    reportType: 'EMERGENCY' | 'ISSUE',
    reportId: number,
    editData: any
  ): Promise<void> {
    try {
      // Only evaluate for emergency reports
      if (reportType !== 'EMERGENCY') return;
      
      // Get the original report
      let report: any;
      if (reportType === 'EMERGENCY') {
        report = await this.emergencyReportingService.getEmergencyReportById(reportId);
      } else {
        report = await this.issueReportingService.getIssueReportById(reportId);
      }
      
      if (!report) return;
      
      // Get current session and extract message ID safely
      const currentSession = await this.sessionManager.getActiveSession(phoneNumber);
      let sessionMessageId = 'unknown';
      
      if (currentSession) {
        // Try to get messageId from sessionData if it exists
        if (currentSession.sessionData) {
          try {
            const sessionData = typeof currentSession.sessionData === 'string' 
              ? JSON.parse(currentSession.sessionData) 
              : currentSession.sessionData;
            
            if (sessionData && sessionData.messageId) {
              sessionMessageId = sessionData.messageId;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
      
      // Combine existing description with any new notes/description
      let combinedText = report.description || '';
      
      if (editData.note) {
        combinedText += ' ' + editData.note;
      }
      
      if (editData.description) {
        combinedText = editData.description; // Replace with new description
      }
      
      // Check for blood/bleeding keywords
      const bloodDetection = this.bloodDetectionService?.containsBloodKeywords(combinedText);
      if (bloodDetection && report.bloodDetectedJson) {
        const bloodDetected = typeof report.bloodDetectedJson === 'string' 
          ? JSON.parse(report.bloodDetectedJson) 
          : report.bloodDetectedJson;
        
        if (!bloodDetected) {
          this.logger.log(`Blood keywords detected in edit for report #${reportId}`);
          
          // Get medical departments
          const medicalDepartments = this.departmentRoutingService.routeEmergency(
            EmergencyType.MEDICAL,
            EmergencyPriority.HIGH
          );
          
          // Add medical departments to report (this will be handled during submission)
          editData.newDepartments = editData.newDepartments || [];
          medicalDepartments.departments.forEach(dept => {
            if (!editData.newDepartments.includes(dept)) {
              editData.newDepartments.push(dept);
            }
          });
          
          editData.hazardDetected = {
            type: 'blood',
            message: 'Blood/bleeding detected in edit - Medical services added'
          };
        }
      }
      
      // Check for fire hazard keywords
      const fireDetection = this.fireHazardDetectionService?.containsFireHazardKeywords(combinedText);
      if (fireDetection && report.fireHazardDetectedJson) {
        const fireDetected = typeof report.fireHazardDetectedJson === 'string' 
          ? JSON.parse(report.fireHazardDetectedJson) 
          : report.fireHazardDetectedJson;
        
        if (!fireDetected) {
          this.logger.log(`Fire hazard keywords detected in edit for report #${reportId}`);
          
          // Get fire departments
          const fireDepartments = this.departmentRoutingService.routeEmergency(
            EmergencyType.FIRE,
            EmergencyPriority.HIGH
          );
          
          // Add fire departments to report
          editData.newDepartments = editData.newDepartments || [];
          fireDepartments.departments.forEach(dept => {
            if (!editData.newDepartments.includes(dept)) {
              editData.newDepartments.push(dept);
            }
          });
          
          if (!editData.hazardDetected) {
            editData.hazardDetected = {
              type: 'fire',
              message: 'Fire hazard detected in edit - Fire services added'
            };
          } else {
            editData.hazardDetected = {
              ...editData.hazardDetected,
              multiple: true
            };
          }
        }
      }
      
      // Check for consolidation/similarity changes
      if (editData.latitude || editData.longitude || editData.description || editData.note) {
        // Build updated report data for similarity check
        const updatedReportData = {
          type: report.type,
          priority: report.priority,
          description: editData.description || report.description,
          location: editData.location || report.location,
          latitude: editData.latitude || report.latitude,
          longitude: editData.longitude || report.longitude
        };
        
        // Check if this edit makes the report similar to other consolidations
        const similarConsolidations = await this.reportConsolidationService?.findSimilarConsolidations(
          reportType,
          updatedReportData,
          3
        );
        
        if (similarConsolidations && similarConsolidations.length > 0) {
          const bestMatch = similarConsolidations[0];
          if (bestMatch.match.confidence > 70) {
            editData.suggestedConsolidation = {
              consolidationId: bestMatch.consolidation.id,
              confidence: bestMatch.match.confidence,
              reasons: bestMatch.match.matchReasons
            };
          }
        }
        
        // Check if this edit makes the report dissimilar from its current consolidation
        if (report.consolidationId) {
          const consolidation = await this.reportConsolidationService?.getConsolidationDetails(report.consolidationId);
          if (consolidation) {
            const matchScore = await this.calculateSimilarityScore(
              updatedReportData,
              consolidation.consolidation
            );
            
            if (matchScore < 50) {
              editData.recommendSeparate = {
                currentConsolidationId: report.consolidationId,
                confidence: 100 - matchScore,
                reasons: ['Edit makes report significantly different from current group']
              };
            }
          }
        }
      }
      
      // If new departments were added, notify user
      if (editData.newDepartments && editData.newDepartments.length > 0) {
        const deptList = editData.newDepartments.map(dept => `• ${dept}`).join('\n');
        const hazardMessage = editData.hazardDetected?.message || 'Additional services may be needed based on your update.';
        
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `⚠️ *EDIT ANALYSIS*\n\n${hazardMessage}\n\n` +
          `🏥 *New departments that may be notified:*\n${deptList}\n\n` +
          `You'll see final department list when you submit.`,
          sessionMessageId  // Use the safely extracted messageId
        );
      }
      
      // If consolidation suggestion exists, notify user
      if (editData.suggestedConsolidation) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `📊 *GROUPING SUGGESTION*\n\n` +
          `Based on your update, this report matches another incident group ` +
          `(${editData.suggestedConsolidation.confidence}% confidence).\n\n` +
          `This will be evaluated when you submit your changes.`,
          sessionMessageId  // Use the safely extracted messageId
        );
      }
      
    } catch (error) {
      this.logger.error('Error evaluating edit for hazards:', error);
    }
  }

  // Helper method to calculate similarity score
  private async calculateSimilarityScore(reportData: any, consolidation: any): Promise<number> {
    try {
      let score = 0;
      let factors = 0;
      
      // Location similarity
      if (reportData.latitude && reportData.longitude && consolidation.latitude && consolidation.longitude) {
        const distance = this.calculateDistance(
          reportData.latitude,
          reportData.longitude,
          consolidation.latitude,
          consolidation.longitude
        );
        
        if (distance < 100) { // Within 100 meters
          score += 40 * (1 - distance / 100);
        }
        factors += 40;
      }
      
      // Description similarity
      if (reportData.description && consolidation.description) {
        const similarity = this.calculateStringSimilarity(
          reportData.description.toLowerCase(),
          consolidation.description.toLowerCase()
        );
        score += similarity * 0.3;
        factors += 30;
      }
      
      // Type similarity
      if (reportData.type === consolidation.primaryDepartment) {
        score += 20;
      }
      factors += 20;
      
      // Location name similarity
      if (reportData.location && consolidation.location) {
        const locationSimilarity = this.calculateStringSimilarity(
          reportData.location.toLowerCase(),
          consolidation.location.toLowerCase()
        );
        score += locationSimilarity * 0.1;
        factors += 10;
      }
      
      return factors > 0 ? (score / factors) * 100 : 0;
      
    } catch (error) {
      this.logger.error('Error calculating similarity score:', error);
      return 0;
    }
  }

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
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 100;
    
    // Simple Levenshtein distance
    const matrix: number[][] = [];
    
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
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    return 100 * (1 - distance / maxLen);
  }

  private async prepareEditReview(phoneNumber: string, reportType: 'EMERGENCY' | 'ISSUE', reportId: number, editData: any): Promise<string> {
    let reviewMessage = `📝 *REVIEW YOUR EDIT*\n\n`;
    
    if (editData.note) {
      reviewMessage += `📝 *Note:* ${editData.note.substring(0, 100)}${editData.note.length > 100 ? '...' : ''}\n`;
    }
    
    if (editData.location) {
      reviewMessage += `📍 *Location:* ${editData.location.substring(0, 100)}${editData.location.length > 100 ? '...' : ''}\n`;
    }
    
    if (editData.description) {
      reviewMessage += `📋 *Description:* ${editData.description.substring(0, 100)}${editData.description.length > 100 ? '...' : ''}\n`;
    }
    
    if (editData.rating) {
      reviewMessage += `⭐ *Rating:* ${editData.rating} stars\n`;
    }
    
    if (editData.feedback) {
      reviewMessage += `💬 *Feedback:* ${editData.feedback.substring(0, 100)}${editData.feedback.length > 100 ? '...' : ''}\n`;
    }
    
    if (editData.media && editData.media.length > 0) {
      reviewMessage += `📸 *Media files:* ${editData.media.length}\n`;
    }
    
    reviewMessage += `\n📋 *What would you like to do next?*\n\n`;
    reviewMessage += `1️⃣ Make another edit\n`;
    reviewMessage += `2️⃣ Submit all changes\n`;
    reviewMessage += `3️⃣ Cancel all edits\n\n`;
    reviewMessage += `Type your choice (1-3):\n`;
    reviewMessage += `• "1" or "make another edit"\n`;
    reviewMessage += `• "2" or "submit"\n`;
    reviewMessage += `• "3" or "cancel"\n\n`;
    reviewMessage += `Or type "BACK" to modify this edit.`;
    
    return reviewMessage;
  }

  private async handleEditMedia(phoneNumber: string, message: any, messageID: string): Promise<void> {
    const activeSession = await this.sessionManager.getActiveSession(phoneNumber);
    if (!activeSession) return;

    // Parse session data with proper type
    const sessionData: EditSessionData = activeSession.sessionData ? 
      (typeof activeSession.sessionData === 'string' ? 
        JSON.parse(activeSession.sessionData) : 
        activeSession.sessionData) as EditSessionData : 
      { step: 'SELECT_REPORT_TYPE' };
    
    let mediaId: string;
    let mediaType: 'image' | 'voice' | 'video';
    let mimeType: string;

    if (message.image) {
      mediaId = message.image.id;
      mediaType = 'image';
      mimeType = message.image.mime_type;
    } else if (message.audio) {
      mediaId = message.audio.id;
      mediaType = 'voice';
      mimeType = message.audio.mime_type;
    } else if (message.video) {
      mediaId = message.video.id;
      mediaType = 'video';
      mimeType = message.video.mime_type;
    } else if (message.document) {
      mediaId = message.document.id;
      mediaType = 'image'; // Treat documents as images for now
      mimeType = message.document.mime_type;
    } else {
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Unsupported media type.',
        messageID
      );
      return;
    }

    try {
      const mediaUrl = await this.getMediaUrl(mediaId);
      const mediaBuffer = await this.downloadMedia(mediaUrl);
      
      // Generate unique filename
      const timestamp = Date.now();
      const extension = this.getFileExtensionFromMimeType(mimeType);
      const filename = `edit_${mediaType}_${phoneNumber}_${timestamp}.${extension}`;
      
      // Save media
      const savedPath = await this.editFeedbackService.saveEditMedia(
        mediaBuffer,
        filename,
        sessionData.reportId!,
        sessionData.reportType!
      );

      // Update edit data
      const editData = sessionData.editData || {};
      editData.media = editData.media || [];
      editData.media.push({
        type: mediaType,
        url: savedPath,
        mimeType: mimeType,
        timestamp: timestamp
      });

      // Check if user wants to add more or submit
      await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.EDIT_FEEDBACK,
        4,
        {
          ...sessionData,
          editData: editData,
          step: 'EDIT_IN_PROGRESS' // Stay in edit in progress to allow more media
        },
        messageID
      );

      await this.messagingService.sendTextMessage(
        phoneNumber,
        `✅ ${mediaType} added. You now have ${editData.media.length} media file(s).\n\n` +
        `Options:\n` +
        `• Send more media files\n` +
        `• Type "DONE" when finished to review your changes\n` +
        `• Type "BACK" to return to edit menu`,
        messageID
      );

    } catch (error) {
      this.logger.error('Error handling edit media:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Failed to process media. Please try again.',
        messageID
      );
    }
  }

  private async handleEditLocation(phoneNumber: string, message: any, messageID: string): Promise<void> {
    const activeSession = await this.sessionManager.getActiveSession(phoneNumber);
    if (!activeSession) return;

    // Parse session data with proper type
    const sessionData: EditSessionData = activeSession.sessionData ? 
      (typeof activeSession.sessionData === 'string' ? 
        JSON.parse(activeSession.sessionData) : 
        activeSession.sessionData) as EditSessionData : 
      { step: 'SELECT_REPORT_TYPE' };

    const location = message.location;
    
    if (!location) {
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Invalid location data.',
        messageID
      );
      return;
    }

    const editData = sessionData.editData || {};
    editData.latitude = location.latitude;
    editData.longitude = location.longitude;
    editData.location = `${location.latitude}, ${location.longitude}`;

    // Evaluate for hazards and similarity BEFORE moving to confirmation
    await this.evaluateEditForHazardsAndSimilarity(
      phoneNumber,
      sessionData.reportType!,
      sessionData.reportId!,
      editData
    );

    await this.sessionManager.createOrUpdateActiveSession(
      phoneNumber,
      SessionType.EDIT_FEEDBACK,
      4,
      {
        ...sessionData,
        editData: editData,
        step: 'CONFIRM_EDIT'
      },
      messageID
    );

    const editReview = await this.prepareEditReview(
      phoneNumber, 
      sessionData.reportType!, 
      sessionData.reportId!, 
      editData
    );
    
    await this.messagingService.sendTextMessage(phoneNumber, editReview, messageID);
  }

  private async handleEditSubmit(phoneNumber: string, messageID: string): Promise<void> {
    const activeSession = await this.sessionManager.getActiveSession(phoneNumber);
    if (!activeSession) return;

    // Parse session data with proper type
    const sessionData: EditSessionData = activeSession.sessionData ? 
      (typeof activeSession.sessionData === 'string' ? 
        JSON.parse(activeSession.sessionData) : 
        activeSession.sessionData) as EditSessionData : 
      { step: 'SELECT_REPORT_TYPE' };
    
    const { reportType, reportId, editAction, editData } = sessionData;

    if (!reportType || !reportId || !editAction) {
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Missing edit information. Please start over.',
        messageID
      );
      await this.sessionManager.cancelSession(phoneNumber, SessionType.EDIT_FEEDBACK);
      await this.completeCurrentSession(phoneNumber);
      return;
    }

    try {
      // Apply the edit
      const result = await this.editFeedbackService.applyEdit(
        reportType,
        reportId,
        editAction,
        editData
      );

      if (result.success) {
        // If new departments were added due to hazard detection, create notifications
        if (editData.newDepartments && editData.newDepartments.length > 0 && reportType === 'EMERGENCY') {
          // Get the updated report
          const updatedReport = await this.emergencyReportingService.getEmergencyReportById(reportId);
          
          if (updatedReport) {
            // Create notifications for new departments
            await this.notificationService.createEmergencyNotifications(
              updatedReport,
              editData.newDepartments
            );
            
            // Send notification to user about new departments
            const deptList = editData.newDepartments.map(dept => `• ${dept}`).join('\n');
            await this.messagingService.sendTextMessage(
              phoneNumber,
              `🚨 *ADDITIONAL SERVICES NOTIFIED*\n\n` +
              `Based on your edit, the following departments have been added:\n${deptList}`,
              messageID
            );
          }
        }
        
        // If consolidation suggestion exists and user didn't opt out, suggest regrouping
        if (editData.suggestedConsolidation) {
          await this.messagingService.sendTextMessage(
            phoneNumber,
            `📊 *INCIDENT GROUPING*\n\n` +
            `This report matches an existing incident group ` +
            `(${editData.suggestedConsolidation.confidence}% confidence).\n\n` +
            `Authorities will review and may regroup this report for better coordination.`,
            messageID
          );
        }
        
        // If report was marked as separate from its current consolidation
        if (editData.recommendSeparate) {
          await this.messagingService.sendTextMessage(
            phoneNumber,
            `⚠️ *INCIDENT GROUPING UPDATE*\n\n` +
            `Based on your edit, this report may need to be separated from its current ` +
            `incident group (${editData.recommendSeparate.confidence}% different).\n\n` +
            `Authorities will review this update.`,
            messageID
          );
        }

        await this.messagingService.sendTextMessage(
          phoneNumber,
          `✅ ${result.message}\n\nYour changes have been saved successfully!`,
          messageID
        );
        
        // Provide clear next steps
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `📝 *What would you like to do next?*\n\n` +
          `• To edit another report, type "EDIT"\n` +
          `• To view your reports, type "MY REPORTS"\n` +
          `• To return to main menu, type "MENU"`,
          messageID
        );
      } else {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          result.message,
          messageID
        );
      }

      // Complete the session
      await this.sessionManager.completeSession(phoneNumber, SessionType.EDIT_FEEDBACK);
      await this.completeCurrentSession(phoneNumber);

    } catch (error) {
      this.logger.error('Error submitting edit:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Failed to save changes. Please try again.',
        messageID
      );
    }
  }

  private async completeCurrentSession(phoneNumber: string): Promise<void> {
    await this.clearCurrentSession(phoneNumber);
  }

  private async routeToEmergencyReporting(phoneNumber: string, message: any, messageID: string): Promise<void> {
    try {
      if (message.type === 'text') {
        const text = message.text?.body;
        if (text) {
          const handled = await this.emergencyReportingService.handleEmergencyReporting(phoneNumber, text, messageID);
          if (!handled) {
            await this.messagingService.sendTextMessage(
              phoneNumber,
              '🚨 Please continue with your emergency report or type "CANCEL" to exit.',
              messageID
            );
          }
        }
      } 
      else if (message.type === 'image' || message.type === 'audio' || message.type === 'video') {
        await this.handleMediaInEmergency(phoneNumber, message, messageID);
      } 
      else if (message.type === 'location') {
        await this.handleLocationInEmergency(phoneNumber, message, messageID);
      }
      else {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '🚨 Please send text, media, or location information for your emergency report, or type "CANCEL" to exit.',
          messageID
        );
      }
    } catch (error) {
      this.logger.error(`Error routing to emergency reporting for ${phoneNumber}:`, error);
      throw error;
    }
  }

  private async routeToIssueReporting(phoneNumber: string, message: any, messageID: string): Promise<void> {
    try {
      if (message.type === 'text') {
        const text = message.text?.body;
        if (text) {
          // Check for cancel command
          const normalizedText = text.toLowerCase().trim();
          if (normalizedText === 'cancel' || normalizedText === 'stop' || normalizedText === 'exit') {
            await this.issueReportingService.cancelReportingSession(phoneNumber);
            await this.sessionManager.cancelSession(phoneNumber, SessionType.ISSUE_REPORTING);
            await this.messagingService.sendTextMessage(
              phoneNumber,
              '❌ Issue reporting cancelled. You can start again by typing "REPORT".',
              messageID
            );
            await this.sendWelcomeMessage(phoneNumber, messageID);
            return;
          }
          
          const handled = await this.issueReportingService.handleReportingStep(phoneNumber, text, messageID);
          if (!handled) {
            await this.messagingService.sendTextMessage(
              phoneNumber,
              '📝 Please continue with your issue report or type "CANCEL" to exit.',
              messageID
            );
          }
        }
      } 
      else if (message.type === 'image' || message.type === 'audio' || message.type === 'video') {
        await this.handleMediaInReporting(phoneNumber, message, messageID);
      } 
      else if (message.type === 'location') {
        await this.handleLocationInReporting(phoneNumber, message, messageID);
      }
      else {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '📝 Please send text, media, or location information for your issue report, or type "CANCEL" to exit.',
          messageID
        );
      }
    } catch (error) {
      this.logger.error(`Error routing to issue reporting for ${phoneNumber}:`, error);
      throw error;
    }
  }

  private async routeToRegistration(phoneNumber: string, message: any, messageID: string): Promise<void> {
    try {
      if (message.type === 'text') {
        const text = message.text?.body;
        if (text) {
          // Check for cancel command
          const normalizedText = text.toLowerCase().trim();
          if (normalizedText === 'cancel' || normalizedText === 'stop' || normalizedText === 'exit') {
            await this.cancelRegistration(phoneNumber, messageID);
            return;
          }
          
          await this.handleRegistrationStep(phoneNumber, text, messageID);
        }
      } 
      else if (message.type === 'image' || message.type === 'document') {
        await this.handleRegistrationDocument(phoneNumber, message, messageID);
      }
      else {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '📝 Please send text or upload documents as requested for your registration.',
          messageID
        );
      }
    } catch (error) {
      this.logger.error(`Error routing to registration for ${phoneNumber}:`, error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error processing registration step. Please try again or type "CANCEL" to exit.',
        messageID
      );
    }
  }

  private async handleMediaInEmergency(phoneNumber: string, message: any, messageID: string): Promise<boolean> {
    try {
      let mediaId: string;
      let mediaType: 'image' | 'voice' | 'video';
      let mimeType: string;

      if (message.image) {
        mediaId = message.image.id;
        mediaType = 'image';
        mimeType = message.image.mime_type;
      } else if (message.audio) {
        mediaId = message.audio.id;
        mediaType = 'voice';
        mimeType = message.audio.mime_type;
      } else if (message.video) {
        mediaId = message.video.id;
        mediaType = 'video';
        mimeType = message.video.mime_type;
      } else {
        return false;
      }

      const mediaUrl = await this.getMediaUrl(mediaId);
      return await this.emergencyReportingService.handleMediaInEmergency(phoneNumber, mediaType, mediaUrl, messageID, mimeType);
    } catch (error) {
      this.logger.error('Error handling media in emergency:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Failed to process media. Please try again or type "CANCEL" to exit.',
        messageID
      );
      return false;
    }
  }

  private async handleLocationInEmergency(phoneNumber: string, message: any, messageID: string): Promise<boolean> {
    try {
      const location = message.location;
      if (!location) return false;

      const lat = location.latitude;
      const lng = location.longitude;

      return await this.emergencyReportingService.handleLocationInEmergency(phoneNumber, lat, lng, messageID);
    } catch (error) {
      this.logger.error('Error handling location in emergency:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Failed to process location. Please try again or type "CANCEL" to exit.',
        messageID
      );
      return false;
    }
  }

  private async handleMediaInReporting(phoneNumber: string, message: any, messageID: string): Promise<boolean> {
    try {
      let mediaId: string;
      let mediaType: 'image' | 'voice' | 'video';
      let mimeType: string;

      if (message.image) {
        mediaId = message.image.id;
        mediaType = 'image';
        mimeType = message.image.mime_type;
      } else if (message.audio) {
        mediaId = message.audio.id;
        mediaType = 'voice';
        mimeType = message.audio.mime_type;
      } else if (message.video) {
        mediaId = message.video.id;
        mediaType = 'video';
        mimeType = message.video.mime_type;
      } else {
        return false;
      }

      const mediaUrl = await this.getMediaUrl(mediaId);
      return await this.issueReportingService.handleMediaInReport(phoneNumber, mediaType, mediaUrl, messageID, mimeType);
    } catch (error) {
      this.logger.error('Error handling media in reporting:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Failed to process media. Please try again or type "CANCEL" to exit.',
        messageID
      );
      return false;
    }
  }

  private async handleLocationInReporting(phoneNumber: string, message: any, messageID: string): Promise<boolean> {
    try {
      const location = message.location;
      if (!location) return false;

      const lat = location.latitude;
      const lng = location.longitude;
      const locationMessage = `${lat}, ${lng}`;

      return await this.issueReportingService.handleReportingStep(phoneNumber, locationMessage, messageID);
    } catch (error) {
      this.logger.error('Error handling location in reporting:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Failed to process location. Please try again or type "CANCEL" to exit.',
        messageID
      );
      return false;
    }
  }

  private isBasicQuery(text: string): boolean {
    const basicQueries = [
      // Questions about the bot
      'who are you',
      'what are you',
      'what can you do',
      'help me',
      'what services',
      'how does this work',
      
      // Information requests
      'what is',
      'tell me about',
      'explain',
      'information about',
      'details about',
      
      // General inquiries
      'how to use',
      'how do i',
      'can i',
      'is there',
      'where can i',
      
      // Simple yes/no questions
      'can you help',
      'are you',
      'do you',
      'will you',
      'would you'
    ];

    // Check if text ends with question mark or contains basic query phrases
    if (text.endsWith('?')) {
      return true;
    }

    return basicQueries.some(query => text.includes(query));
  }

  private isSalutation(text: string): boolean {
    const salutations = [
      'hi', 'hello', 'hey', 'greetings',
      'good morning', 'good afternoon', 'good evening',
      'hi there', 'hello there', 'hey there',
      'howdy', 'whats up', 'sup',
      'hi bot', 'hello bot', 'hey bot'
    ];

    return salutations.some(salutation => text.includes(salutation));
  }

  private detectMenuCommand(text: string): string | null {
    const normalizedText = text.trim().toLowerCase();
    
    // Exact match commands (priority)
    const exactCommands: { [key: string]: string } = {
      '1': 'EMERGENCY',
      '2': 'REPORT',
      '3': 'FARMER',
      '4': 'GOVERNMENT',
      '5': 'MENU',
      '6': 'MY_REPORTS',
      '7': 'MY_EMERGENCIES',
      '8': 'EDIT',
      '9': 'REGISTER',
      '10': 'AGROMATE',
      '0': 'STATUS',
      'x': 'CANCEL',
      '?': 'HELP',
      
      // Word commands
      'emergency': 'EMERGENCY',
      'report': 'REPORT',
      'farmer': 'FARMER',
      'farming': 'FARMER',
      'agriculture': 'FARMER',
      'government': 'GOVERNMENT',
      'gvt': 'GOVERNMENT',
      'govt': 'GOVERNMENT',
      'agromate': 'AGROMATE', 
      'Agromate': 'AGROMATE', 
      'smart farming': 'AGROMATE',
      'agro mate': 'AGROMATE', 
      'smart_farming': 'AGROMATE', 
      'crop advisor': 'AGROMATE',
      'irrigation advisor': 'AGROMATE',
      'register': 'REGISTER',
      'login': 'LOGIN',
      'logout': 'LOGOUT',
      'cancel': 'CANCEL',
      'my reports': 'MY_REPORTS',
      'myreports': 'MY_REPORTS',
      'my emergencies': 'MY_EMERGENCIES',
      'myemergencies': 'MY_EMERGENCIES',
      'help': 'HELP',
      'menu': 'MENU',
      'edit': 'EDIT',
      'status': 'STATUS',
      'verify': 'VERIFY',
      'investigation': 'INVESTIGATION',
      'issue': 'ISSUE',
      'back': 'BACK',
      'sources': 'SOURCES',
      'source': 'SOURCES',
      'download': 'DOWNLOAD',
    };

    // Check exact matches first
    if (exactCommands[normalizedText]) {
      return exactCommands[normalizedText];
    }

    // Check for numeric commands (including '10')
    const numericMatch = normalizedText.match(/^\d+$/);
    if (numericMatch) {
      const number = numericMatch[0];
      if (exactCommands[number]) {
        return exactCommands[number];
      }
    }

    // Check for "10" specifically (fallback)
    if (normalizedText === '10') {
      return 'AGROMATE';
    }

    // Check single character commands
    if (text.length === 1) {
      const singleChar = text.charAt(0);
      if (singleChar === 'X' || singleChar === 'x') return 'CANCEL';
      if (singleChar === '?') return 'HELP';
      if (singleChar >= '0' && singleChar <= '9') {
        return exactCommands[singleChar] || null;
      }
    }

    // Check for "edit <number>" pattern
    if (normalizedText.startsWith('edit ')) {
      const parts = normalizedText.split(' ');
      if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
        return 'EDIT_REPORT';
      }
      return 'EDIT';
    }

    // Check for "download <number>" pattern
    if (normalizedText.startsWith('download ')) {
      const parts = normalizedText.split(' ');
      if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
        return 'DOWNLOAD_SPECIFIC';
      }
      return 'DOWNLOAD';
    }

    // Check for exact phrase matches
    if (normalizedText === 'my reports') return 'MY_REPORTS';
    if (normalizedText === 'my emergencies') return 'MY_EMERGENCIES';

    // Only return null for non-command text
    return null;
  }

  private async handleMenuCommand(phoneNumber: string, command: string, originalText: string, messageID: string): Promise<void> {
    // Check if user is in RAG session for SOURCES/DOWNLOAD commands
    const ragSession = await this.getRAGSession(phoneNumber);
    
    if (ragSession) {
      if (command === 'SOURCES') {
        await this.handleSourcesRequest(phoneNumber, ragSession.organisation, messageID);
        return;
      }
      
      if (command === 'DOWNLOAD_SPECIFIC' || command === 'DOWNLOAD') {
        await this.handleDownloadRequest(phoneNumber, originalText, ragSession.organisation, messageID);
        return;
      }
    }
    
    // Check if user is in edit session
    const editSession = await this.sessionManager.getActiveSession(phoneNumber, SessionType.EDIT_FEEDBACK);
    
    if (editSession && (command === 'EMERGENCY' || command === 'ISSUE')) {
      const sessionData: EditSessionData = editSession.sessionData ? 
        (typeof editSession.sessionData === 'string' ? 
          JSON.parse(editSession.sessionData) : 
          editSession.sessionData) as EditSessionData : 
        { step: 'SELECT_REPORT_TYPE' };
      
      if (sessionData.step === 'SELECT_REPORT_TYPE') {
        await this.handleEditReportTypeSelection(phoneNumber, command === 'EMERGENCY' ? 'EMERGENCY' : 'ISSUE', messageID);
        return;
      }
    }
    
    if (command === 'EDIT_REPORT') {
      const parts = originalText.split(' ');
      if (parts.length >= 2) {
        const reportId = parseInt(parts[1]);
        if (!isNaN(reportId)) {
          await this.startDirectEditWithReportId(phoneNumber, reportId, messageID);
          return;
        }
      }
    }

    switch (command) {
      case 'EMERGENCY':
        await this.startEmergencyReporting(phoneNumber, messageID);
        break;
      case 'REPORT':
      case 'ISSUE':
        await this.startIssueReporting(phoneNumber, messageID);
        break;
      case 'FARMER':
        await this.handleFarmerSupport(phoneNumber, messageID);
        break;
      case 'GOVERNMENT':
        await this.handleGovernmentInquiries(phoneNumber, messageID);
        break;
      case 'REGISTER':
        await this.startRegistrationFlow(phoneNumber, messageID);
        break;
      case 'LOGIN':
        await this.handleLoginCommand(phoneNumber, originalText, messageID);
        break;
      case 'LOGOUT':
        await this.handleLogoutCommand(phoneNumber, messageID);
        break;
      case 'CANCEL':
        await this.handleCancelCommand(phoneNumber, messageID);
        break;
      case 'BACK':
        await this.handleBackCommand(phoneNumber, messageID);
        break;
      case 'MY_REPORTS':
        await this.issueReportingService.getUserReports(phoneNumber, messageID);
        break;
      case 'MY_EMERGENCIES':
        await this.emergencyReportingService.getUserEmergencyReports(phoneNumber, messageID);
        break;
      case 'HELP':
        await this.sendHelpMessage(phoneNumber, messageID);
        break;
      case 'MENU':
        await this.sendMainMenu(phoneNumber, messageID);
        break;
      case 'EDIT':
        await this.startEditFlow(phoneNumber, messageID);
        break;
      case 'EDIT_REPORT':
        await this.handleEditReportCommand(phoneNumber, originalText, messageID);
        break;
      case 'STATUS':
        await this.handleStatusCommand(phoneNumber, messageID);
        break;
      case 'STATUS_QUERY':
        await this.handleStatusQuery(phoneNumber, originalText, messageID);
        break;
      case 'VERIFY':
        await this.handleVerificationCommand(phoneNumber, messageID);
        break;
      case 'AGROMATE': 
        await this.ecofarmerService.startEcofarmer(phoneNumber, messageID);
        break;
      default:
        await this.sendWelcomeMessage(phoneNumber, messageID);
    }
  }

    // ==================== GOVERNMENT SERVICES WITH RAG ====================

  private async handleGovernmentInquiries(phoneNumber: string, messageID: string): Promise<void> {
    try {
      // Check if Flask service is healthy
      const isHealthy = await this.flaskRagService.healthCheck();
      
      if (!isHealthy) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '⚠️ Government knowledge base service is currently unavailable. Please try again later.',
          messageID
        );
        return;
      }

      // Check if user has any active non-RAG session
      const currentSession = await this.getCurrentSession(phoneNumber);
      if (currentSession && 
          currentSession.sessionType !== SessionType.GOVERNMENT && 
          currentSession.sessionType !== SessionType.FARMER) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `⚠️ You already have an active ${currentSession.sessionType} session. Please complete it or type "CANCEL" to exit first.`,
          messageID
        );
        return;
      }

      // Check if already in Government session
      const existingRAGSession = await this.getRAGSession(phoneNumber);
      if (existingRAGSession?.organisation === 'Government') {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `🏛️ *Continuing Government Services*\n\nYou're already in a Government information session. Ask me anything about government services.`,
          messageID
        );
        return;
      }

      // If in a different RAG session, ask to cancel first
      if (existingRAGSession) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `⚠️ You're currently in a ${existingRAGSession.organisation} session. Please type "CANCEL" to exit that session first.`,
          messageID
        );
        return;
      }

      // Create new Government RAG session
      await this.createRAGSession(phoneNumber, 'Government', messageID);

      const governmentMessage = `🏛️ *GOVERNMENT SERVICES & INQUIRIES* 🏛️

I have access to the Government knowledge base. I can help you with:

• Civil registration (birth, death, marriage certificates)
• Passport and ID applications
• Driver's license inquiries
• Social welfare programs
• Tax information
• Business registration
• Land and housing issues
• Public service complaints
• Government tender information

*How it works:*
Simply ask your question, and I'll search the Government knowledge base for relevant information.

*Examples:*
• "How do I apply for a passport?"
• "What documents needed for birth certificate?"
• "Requirements for social welfare grants"
• "How to register my business?"

*Important:*
• Type "CANCEL" to exit this session at any time
• Type "MENU" to return to main menu (will cancel this session)

What would you like to know?`;

      await this.messagingService.sendTextMessage(phoneNumber, governmentMessage, messageID);

    } catch (error) {
      this.logger.error('Error handling government inquiries:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error accessing government services. Please try again.',
        messageID
      );
    }
  }

  private async handleFarmerSupport(phoneNumber: string, messageID: string): Promise<void> {
    try {
      // Check if Flask service is healthy
      const isHealthy = await this.flaskRagService.healthCheck();
      
      if (!isHealthy) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '⚠️ Agriculture knowledge base service is currently unavailable. Please try again later.',
          messageID
        );
        return;
      }

      // Check if user has any active non-RAG session
      const currentSession = await this.getCurrentSession(phoneNumber);
      if (currentSession && 
          currentSession.sessionType !== SessionType.GOVERNMENT && 
          currentSession.sessionType !== SessionType.FARMER) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `⚠️ You already have an active ${currentSession.sessionType} session. Please complete it or type "CANCEL" to exit first.`,
          messageID
        );
        return;
      }

      // Check if already in Agriculture session
      const existingRAGSession = await this.getRAGSession(phoneNumber);
      if (existingRAGSession?.organisation === 'Agriculture') {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `🌾 *Continuing Farmer Support*\n\nYou're already in an Agriculture information session. Ask me anything about farming.`,
          messageID
        );
        return;
      }

      // If in a different RAG session, ask to cancel first
      if (existingRAGSession) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `⚠️ You're currently in a ${existingRAGSession.organisation} session. Please type "CANCEL" to exit that session first.`,
          messageID
        );
        return;
      }

      // Create new Agriculture RAG session
      await this.createRAGSession(phoneNumber, 'Agriculture', messageID);

      const farmerMessage = `🌾 *FARMER SUPPORT SERVICES* 🌾

I have access to the Agriculture knowledge base. I can help you with:

• Crop disease identification and treatment
• Livestock health concerns and management
• Agricultural extension services
• Farm input availability and suppliers
• Weather alerts for farmers
• Pest outbreak reporting and control
• Irrigation techniques and water management
• Market price information for crops/livestock
• Sustainable farming techniques
• Soil management and fertilization

*How it works:*
Simply ask your farming question, and I'll search the Agriculture knowledge base for relevant information.

*Examples:*
• "How to treat maize leaf rust?"
• "Symptoms of foot and mouth disease in cattle"
• "Best practices for drip irrigation"
• "Current market price for tomatoes"
• "How to control fall armyworm"
• "Organic fertilizer recommendations"

*Important:*
• Type "CANCEL" to exit this session at any time
• Type "MENU" to return to main menu (will cancel this session)

What farming information do you need?`;

      await this.messagingService.sendTextMessage(phoneNumber, farmerMessage, messageID);

    } catch (error) {
      this.logger.error('Error handling farmer support:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error accessing farmer support. Please try again.',
        messageID
      );
    }
  }

  private async updateRAGSession(
    phoneNumber: string,
    organisation: RAGOrganisation,
    userMessage: string,
    assistantResponse: string,
    sources?: any[],
    messageID?: string
  ): Promise<void> {
    try {
      const sessionType = organisation === 'Government' ? SessionType.GOVERNMENT : SessionType.FARMER;
      const activeSession = await this.sessionManager.getActiveSession(phoneNumber, sessionType);
      
      if (!activeSession) {
        this.logger.warn(`No active ${organisation} session found for ${phoneNumber}`);
        return;
      }

      const sessionData = activeSession.sessionData ? 
        (typeof activeSession.sessionData === 'string' ? 
          JSON.parse(activeSession.sessionData) : 
          activeSession.sessionData) : 
        { organisation, history: [] };

      // Initialize history if not present
      if (!sessionData.history) {
        sessionData.history = [];
      }

      // Add messages to history
      sessionData.history.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantResponse }
      );

      // Keep last 10 exchanges (20 messages)
      const MAX_HISTORY = 20;
      if (sessionData.history.length > MAX_HISTORY) {
        sessionData.history = sessionData.history.slice(-MAX_HISTORY);
      }

      if (sources) {
        sessionData.lastSources = sources;
      }

      sessionData.lastActive = new Date();
      if (messageID) {
        sessionData.lastMessageId = messageID;
      }

      await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        sessionType,
        activeSession.currentStep + 1,
        sessionData,
        messageID
      );

    } catch (error) {
      this.logger.error('Error updating RAG session:', error);
    }
  }

  private async getRAGConversationContext(phoneNumber: string, organisation: RAGOrganisation): Promise<string> {
    try {
      const sessionType = organisation === 'Government' ? SessionType.GOVERNMENT : SessionType.FARMER;
      const activeSession = await this.sessionManager.getActiveSession(phoneNumber, sessionType);
      
      if (!activeSession || !activeSession.sessionData) {
        return '';
      }

      const sessionData = typeof activeSession.sessionData === 'string' 
        ? JSON.parse(activeSession.sessionData) 
        : activeSession.sessionData;

      if (!sessionData.history || sessionData.history.length === 0) {
        return '';
      }

      // Build context from last 3 exchanges
      let context = 'Previous conversation:\n';
      const lastMessages = sessionData.history.slice(-6); // Last 3 exchanges (user + assistant)
      
      for (const entry of lastMessages) {
        context += `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content}\n`;
      }
      
      return context;
    } catch (error) {
      this.logger.error('Error getting RAG conversation context:', error);
      return '';
    }
  }

  // Handle RAG queries for Government and Agriculture
  private async handleRAGQuery(
    phoneNumber: string, 
    query: string, 
    organisation: RAGOrganisation,
    messageID: string
  ): Promise<void> {
    try {
      // Show searching message
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `🔍 Searching the ${organisation} knowledge base...\n⏳ This may take a moment`,
        messageID
      );

      // Get conversation context
      const context = await this.getRAGConversationContext(phoneNumber, organisation);
      
      // Enhance query with context
      const enhancedQuery = context ? `${context}\nCurrent query: ${query}` : query;

      // Query Flask RAG
      const response = await this.flaskRagService.queryRAG(enhancedQuery, organisation);

      // Store sources in session for later use
      if (response.sources && response.sources.length > 0) {
        await this.updateRAGSession(
          phoneNumber,
          organisation,
          query,
          response.answer || 'No answer found',
          response.sources,
          messageID
        );
      }

      // Split and send message parts
      if (response.answer) {
        const messageParts = await this.flaskRagService.splitMessage(response.answer);
        
        for (let i = 0; i < messageParts.length; i++) {
          const part = messageParts[i];
          
          if (messageParts.length > 1) {
            const partHeader = `📌 *Part ${i + 1}/${messageParts.length}*\n\n`;
            await this.messagingService.sendTextMessage(
              phoneNumber,
              partHeader + part,
              messageID
            );
          } else {
            await this.messagingService.sendTextMessage(
              phoneNumber,
              part,
              messageID
            );
          }
          
          if (i < messageParts.length - 1) {
            await this.delay(500);
          }
        }
      } else {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `I couldn't find specific information about that in the ${organisation} knowledge base. Could you rephrase your question?`,
          messageID
        );
      }

    } catch (error) {
      this.logger.error(`Error handling ${organisation} RAG query:`, error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        this.flaskRagService.getErrorMessage(organisation),
        messageID
      );
    }
  }

  // private async sendRAGFollowUp(phoneNumber: string, organisation: string, messageID: string): Promise<void> {
  //   const followUpMessage = `💡 *Need more help?*\n\n` +
  //     `• Ask another ${organisation} question\n` +
  //     `• Type "SOURCES" to see all sources\n` +
  //     `• Type "CANCEL" to exit this session\n` +
  //     `• Type "MENU" for main menu`;

  //   await this.messagingService.sendTextMessage(phoneNumber, followUpMessage, messageID);
  // }

  // private getErrorMessage(organisation: string): string {
  //   const orgEmoji = organisation === 'Agriculture' ? '🌾' : '🏛️';
  //   return `${orgEmoji} *${organisation} Service Error*\n\n` +
  //     '❌ Sorry, I encountered an error processing your request.\n\n' +
  //     '📋 *Options:*\n' +
  //     '• Try again in a few moments\n' +
  //     '• Type "CANCEL" to exit\n' +
  //     '• Type "MENU" for other options';
  // }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // private async handleSourcesRequest(phoneNumber: string, organisation: string, messageID: string): Promise<void> {
  //   try {
  //     // Get the active session to retrieve sources
  //     const activeSession = await this.sessionManager.getActiveSession(phoneNumber);
  //     if (!activeSession) {
  //       await this.messagingService.sendTextMessage(
  //         phoneNumber,
  //         '❌ No active session found. Please start a new query first.',
  //         messageID
  //       );
  //       return;
  //     }

  //     const sessionData = activeSession.sessionData as any;
  //     const sources = sessionData?.lastSources || [];

  //     if (!sources || sources.length === 0) {
  //       await this.messagingService.sendTextMessage(
  //         phoneNumber,
  //         '📚 No sources available for the last query. Try asking a question first.',
  //         messageID
  //       );
  //       return;
  //     }

  //     // Use FlaskRagService to format sources list
  //     const sourcesMessage = await this.flaskRagService.formatSourcesList(sources, organisation);
      
  //     // Split if too long
  //     const messageParts = await this.flaskRagService.splitMessage(sourcesMessage);
      
  //     for (let i = 0; i < messageParts.length; i++) {
  //       const part = messageParts[i];
  //       if (messageParts.length > 1) {
  //         await this.messagingService.sendTextMessage(
  //           phoneNumber,
  //           `📌 *Sources Part ${i + 1}/${messageParts.length}*\n\n${part}`,
  //           messageID
  //         );
  //       } else {
  //         await this.messagingService.sendTextMessage(phoneNumber, part, messageID);
  //       }
        
  //       if (i < messageParts.length - 1) {
  //         await this.delay(500);
  //       }
  //     }

  //   } catch (error) {
  //     this.logger.error('Error handling sources request:', error);
  //     await this.messagingService.sendTextMessage(
  //       phoneNumber,
  //       this.flaskRagService.getErrorMessage(organisation),
  //       messageID
  //     );
  //   }
  // }

  // Add this to handle download requests
  // private async handleDownloadRequest(phoneNumber: string, text: string, organisation: string, messageID: string): Promise<void> {
  //   try {
  //     // Parse download command (e.g., "DOWNLOAD 1" or "download 1")
  //     const match = text.match(/download\s+(\d+)/i);
  //     if (!match) {
  //       await this.messagingService.sendTextMessage(
  //         phoneNumber,
  //         '❌ Invalid download command. Please use: DOWNLOAD <number>\nExample: DOWNLOAD 1',
  //         messageID
  //       );
  //       return;
  //     }

  //     const sourceIndex = parseInt(match[1]) - 1; // Convert to 0-based index

  //     // Get active session and sources
  //     const activeSession = await this.sessionManager.getActiveSession(phoneNumber);
  //     if (!activeSession) {
  //       await this.messagingService.sendTextMessage(
  //         phoneNumber,
  //         '❌ No active session found. Please start a new query first.',
  //         messageID
  //       );
  //       return;
  //     }

  //     const sessionData = activeSession.sessionData as any;
  //     const sources = sessionData?.lastSources || [];

  //     if (sourceIndex < 0 || sourceIndex >= sources.length) {
  //       await this.messagingService.sendTextMessage(
  //         phoneNumber,
  //         `❌ Invalid source number. Please choose between 1 and ${sources.length}.`,
  //         messageID
  //       );
  //       return;
  //     }

  //     const source = sources[sourceIndex];
      
  //     // Show downloading message
  //     await this.messagingService.sendTextMessage(
  //       phoneNumber,
  //       `⏳ Preparing source ${sourceIndex + 1}: ${source.source}...`,
  //       messageID
  //     );

  //     // Get download URL
  //     const downloadUrl = await this.flaskRagService.getSourceDownloadUrl(source.source);
      
  //     // Format download message
  //     const downloadMessage = await this.flaskRagService.formatSourceDownload(source, sourceIndex + 1);
      
  //     // Send download link
  //     await this.messagingService.sendTextMessage(phoneNumber, downloadMessage, messageID);

  //     // Optionally, download and send the file directly (if small enough)
  //     if (this.canSendFileDirectly(source)) {
  //       try {
  //         await this.messagingService.sendTextMessage(
  //           phoneNumber,
  //           '⏳ Downloading file to send directly...',
  //           messageID
  //         );
          
  //         const fileBuffer = await this.flaskRagService.downloadSourceFile(source.source);
          
  //         // Send file via WhatsApp (if your messaging service supports it)
  //         await this.sendFileViaWhatsApp(phoneNumber, fileBuffer, source.source, messageID);
          
  //       } catch (error) {
  //         this.logger.error('Error sending file directly:', error);
  //         // Download URL already sent, so it's ok
  //       }
  //     }

  //   } catch (error) {
  //     this.logger.error('Error handling download request:', error);
  //     await this.messagingService.sendTextMessage(
  //       phoneNumber,
  //       this.flaskRagService.getErrorMessage(organisation),
  //       messageID
  //     );
  //   }
  // }

  // Check if file can be sent directly via WhatsApp
  // private canSendFileDirectly(source: any): boolean {
  //   // WhatsApp has file size limits (usually 100MB for documents)
  //   // Add logic based on your needs
  //   const MAX_DIRECT_SEND_SIZE = 10 * 1024 * 1024; // 10MB
  //   return source.file_size ? source.file_size < MAX_DIRECT_SEND_SIZE : false;
  // }

  // // Send file via WhatsApp (implement based on your messaging service)
  // private async sendFileViaWhatsApp(
  //   phoneNumber: string, 
  //   fileBuffer: Buffer, 
  //   filename: string,
  //   messageID: string
  // ): Promise<void> {
  //   try {
  //     // Implement file sending logic based on your messaging service
  //     // This is a placeholder - implement according to your WhatsApp API
  //     this.logger.log(`Would send file ${filename} to ${phoneNumber}`);
      
  //     await this.messagingService.sendTextMessage(
  //       phoneNumber,
  //       `📎 File "${filename}" is ready. You can also download it using the link above.`,
  //       messageID
  //     );
  //   } catch (error) {
  //     this.logger.error('Error sending file via WhatsApp:', error);
  //     throw error;
  //   }
  // }

  private async sendSourcesMessage(
    phoneNumber: string, 
    sources: any[], 
    messageID: string,
    organisation: string
  ): Promise<void> {
    if (!sources || sources.length === 0) return;

    try {
      let sourcesMessage = `📚 *Sources (${sources.length}):*\n\n`;
      
      sources.slice(0, 5).forEach((source, index) => {
        sourcesMessage += `${index + 1}. *${source.source || 'Document'}*`;
        if (source['Page number']) {
          sourcesMessage += ` (Page ${source['Page number']})`;
        }
        sourcesMessage += '\n';
        
        if (source['Page Content']) {
          const preview = source['Page Content'].substring(0, 80);
          sourcesMessage += `   📄 ${preview}...\n`;
        }
        sourcesMessage += '\n';
      });

      if (sources.length > 5) {
        sourcesMessage += `... and ${sources.length - 5} more sources\n\n`;
      }

      sourcesMessage += `These sources are from the ${organisation} knowledge base.`;

      await this.messagingService.sendTextMessage(phoneNumber, sourcesMessage, messageID);
    } catch (error) {
      this.logger.error('Error sending sources message:', error);
    }
  }

  private async splitMessage(text: string, maxLength: number = 4096): Promise<string[]> {
    const messages: string[] = [];
    
    if (!text || text.length <= maxLength) {
      return [text];
    }

    const paragraphs = text.split('\n\n');
    let currentMessage = '';
    
    for (const paragraph of paragraphs) {
      const paragraphWithNewlines = paragraph + '\n\n';
      
      if ((currentMessage + paragraphWithNewlines).length > maxLength) {
        if (currentMessage) {
          messages.push(currentMessage.trim());
          currentMessage = paragraphWithNewlines;
        } else {
          const sentences = paragraph.split('. ');
          for (const sentence of sentences) {
            const sentenceWithPeriod = sentence + '. ';
            if ((currentMessage + sentenceWithPeriod).length > maxLength) {
              if (currentMessage) {
                messages.push(currentMessage.trim());
              }
              currentMessage = sentenceWithPeriod;
            } else {
              currentMessage += sentenceWithPeriod;
            }
          }
        }
      } else {
        currentMessage += paragraphWithNewlines;
      }
    }
    
    if (currentMessage.trim()) {
      messages.push(currentMessage.trim());
    }
    
    return messages;
  }

  private async handleBackCommand(phoneNumber: string, messageID: string): Promise<void> {
    try {
      // Check if user is in edit session
      const editSession = await this.sessionManager.getActiveSession(phoneNumber, SessionType.EDIT_FEEDBACK);
      
      if (editSession) {
        const sessionData: EditSessionData = editSession.sessionData ? 
          (typeof editSession.sessionData === 'string' ? 
            JSON.parse(editSession.sessionData) : 
            editSession.sessionData) as EditSessionData : 
          { step: 'SELECT_REPORT_TYPE' };
        
        // Handle back based on current step
        switch (sessionData.step) {
          case 'SELECT_REPORT_ID':
            // Go back to report type selection
            await this.sessionManager.createOrUpdateActiveSession(
              phoneNumber,
              SessionType.EDIT_FEEDBACK,
              1,
              {
                ...sessionData,
                step: 'SELECT_REPORT_TYPE',
                reportType: undefined,
                userReports: undefined,
                reportId: undefined
              },
              messageID
            );
            await this.sendEditReportTypeMenu(phoneNumber, messageID);
            break;
          
          case 'SHOW_EDIT_MENU':
            // Go back to report ID selection
            if (sessionData.userReports && sessionData.reportType) {
              await this.showUserReportsList(
                phoneNumber, 
                sessionData.reportType, 
                sessionData.userReports, 
                messageID
              );
              
              // Update session state
              await this.sessionManager.createOrUpdateActiveSession(
                phoneNumber,
                SessionType.EDIT_FEEDBACK,
                2,
                {
                  ...sessionData,
                  step: 'SELECT_REPORT_ID',
                  reportId: undefined,
                  reportData: undefined,
                  editAction: undefined,
                  editData: undefined
                },
                messageID
              );
            } else {
              await this.messagingService.sendTextMessage(
                phoneNumber,
                '❌ Cannot go back. Please start over by typing "EDIT".',
                messageID
              );
              await this.sessionManager.cancelSession(phoneNumber, SessionType.EDIT_FEEDBACK);
            }
            break;
          
          default:
            await this.messagingService.sendTextMessage(
              phoneNumber,
              '❌ Cannot go back from this step.',
              messageID
            );
        }
      } else {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          'ℹ️ You are not in a session that supports back navigation.',
          messageID
        );
      }
    } catch (error) {
      this.logger.error('Error handling back command:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error processing back command. Please try again.',
        messageID
      );
    }
  }

  private async handleEditReportCommand(phoneNumber: string, text: string, messageID: string): Promise<void> {
    try {
      const parts = text.split(' ');
      if (parts.length < 2) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Please specify report ID. Usage: EDIT <report-id>\nExample: EDIT 123',
          messageID
        );
        return;
      }

      const reportId = parseInt(parts[1]);
      if (isNaN(reportId)) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Invalid report ID. Please use a number.',
          messageID
        );
        return;
      }

      // Check active session to see what type of report we're editing
      const activeSession = await this.sessionManager.getActiveSession(phoneNumber);
      
      if (!activeSession || activeSession.sessionType !== SessionType.EDIT_FEEDBACK) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Please start the edit process first by typing "EDIT".',
          messageID
        );
        return;
      }

      const sessionData: EditSessionData = activeSession.sessionData ? 
        (typeof activeSession.sessionData === 'string' ? 
          JSON.parse(activeSession.sessionData) : 
          activeSession.sessionData) as EditSessionData : 
        { step: 'SELECT_REPORT_TYPE' };

      const reportType = sessionData.reportType;
      
      if (!reportType) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Please specify report type first.',
          messageID
        );
        return;
      }

      // Check if user has permission to edit this report
      const canEdit = await this.canUserEditReport(phoneNumber, reportId, reportType);
      
      if (!canEdit) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ You cannot edit this report. You can only edit reports you submitted.',
          messageID
        );
        return;
      }

      // Get the report
      let report: any;
      if (reportType === 'EMERGENCY') {
        report = await this.emergencyReportingService.getEmergencyReportById(reportId);
      } else {
        report = await this.issueReportingService.getIssueReportById(reportId);
      }

      if (!report) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Report not found.',
          messageID
        );
        return;
      }

      // Update session with selected report
      await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.EDIT_FEEDBACK,
        3, // Step 3: Show edit menu
        {
          ...sessionData,
          reportId,
          reportType,
          step: 'SHOW_EDIT_MENU',
          reportData: report
        },
        messageID
      );

      // Show edit menu
      const editMenu = this.editFeedbackService.getEditMenu(reportType, reportId, report);
      await this.messagingService.sendTextMessage(phoneNumber, editMenu, messageID);

    } catch (error) {
      this.logger.error('Error handling edit report command:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error processing edit command. Please try again.',
        messageID
      );
    }
  }

  private async startEditFlow(phoneNumber: string, messageID: string): Promise<void> {
    try {
      // Check if already in edit session
      const currentSession = await this.getCurrentSession(phoneNumber);
      if (currentSession && currentSession.sessionType !== SessionType.EDIT_FEEDBACK) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `⚠️ You already have an active ${currentSession.sessionType} session. Please complete it or type "CANCEL" to exit first.`,
          messageID
        );
        return;
      }

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Create edit session
      const activeSession = await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.EDIT_FEEDBACK,
        1,
        {
          step: 'SELECT_REPORT_TYPE',
          startedAt: new Date(),
          messageId: messageID,
          data: {}
        },
        messageID,
        expiresAt
      );

      // Track as current session
      await this.setCurrentSession(phoneNumber, activeSession.id.toString(), SessionType.EDIT_FEEDBACK, expiresAt);

      await this.sendEditReportTypeMenu(phoneNumber, messageID);
    } catch (error) {
      this.logger.error('Error starting edit flow:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error starting edit process. Please try again.',
        messageID
      );
    }
  }

  private async sendEditReportTypeMenu(phoneNumber: string, messageID: string): Promise<boolean> {
    return await this.sendEditReportTypeMenuInSession(phoneNumber, messageID);
  }

  private async handleStatusCommand(phoneNumber: string, messageID: string): Promise<void> {
    try {
      // Get user's recent reports
      const emergencyReports = await this.emergencyReportingService.getUserEmergencyReports(phoneNumber, messageID);
      const issueReports = await this.issueReportingService.getUserReports(phoneNumber, messageID);

      const emergencyReportsList = typeof emergencyReports === 'boolean' ? [] : emergencyReports;
      const issueReportsList = typeof issueReports === 'boolean' ? [] : issueReports;
      
      if (emergencyReportsList.length === 0 && issueReportsList?.length === 0) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '📭 You have no active reports. Submit a report to track its status.',
          messageID
        );
        return;
      }

      let message = `📊 *YOUR REPORT STATUS*\n\n`;
      
      if (emergencyReportsList.length > 0) {
        message += `🚨 *Emergency Reports:*\n`;
        emergencyReportsList.slice(0, 5).forEach((report: any) => {
          const statusEmoji = this.getStatusEmoji(report.status);
          message += `• ${statusEmoji} #EM${report.id}: ${report.type} - ${report.status}\n`;
        });
        message += '\n';
      }

      if (issueReportsList.length > 0) {
        message += `📝 *Issue Reports:*\n`;
        issueReportsList?.slice(0, 5).forEach((report: any) => {
          const statusEmoji = this.getStatusEmoji(report.status);
          message += `• ${statusEmoji} #${report.id}: ${report.type} - ${report.status}\n`;
        });
      }

      message += `\n📋 *Commands:*\n` +
        `• "STATUS <ID>" - Check specific report\n` +
        `• "VERIFY" - Report status discrepancy\n` +
        `• "HELP" - More information`;

      await this.messagingService.sendTextMessage(phoneNumber, message, messageID);

    } catch (error) {
      this.logger.error('Error handling status command:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error fetching status. Please try again.',
        messageID
      );
    }
  }

  private async handleStatusQuery(phoneNumber: string, text: string, messageID: string): Promise<void> {
    try {
      const parts = text.split(' ');
      if (parts.length < 2) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Please specify report ID. Usage: STATUS <report-id>\nExample: STATUS 123',
          messageID
        );
        return;
      }

      const reportId = parseInt(parts[1]);
      if (isNaN(reportId)) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Invalid report ID. Please use a number.',
          messageID
        );
        return;
      }

      // Get report details and incident info
      let report: any;
      let incidentGroup: any;
      
      // Try emergency report first
      report = await this.emergencyReportingService.getEmergencyReportById(reportId);
      if (report) {
        if (report.consolidationId) {
          incidentGroup = await this.incidentService.getIncidentGroup(report.consolidationId);
        }
      } else {
        // Try issue report
        report = await this.issueReportingService.getIssueReportById(reportId);
        if (report && report.consolidationId) {
          incidentGroup = await this.incidentService.getIncidentGroup(report.consolidationId);
        }
      }

      if (!report) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Report not found. Please check the report ID.',
          messageID
        );
        return;
      }

      const statusEmoji = this.getStatusEmoji(report.status);
      const date = new Date(report.createdAt).toLocaleDateString();
      
      let message = `📋 *REPORT STATUS - #${report.id}*\n\n` +
        `${statusEmoji} *Status:* ${report.status.toUpperCase()}\n` +
        `📝 *Type:* ${report.type}\n` +
        `📍 *Location:* ${report.location || 'Not specified'}\n` +
        `📅 *Reported:* ${date}\n`;

      if (incidentGroup) {
        message += `\n📊 *Incident Group #${incidentGroup.id}:*\n` +
          `• Total reports: ${incidentGroup.reportCount}\n` +
          `• Unique reporters: ${incidentGroup.uniqueReporters}\n` +
          `• Last update: ${new Date(incidentGroup.updatedAt).toLocaleDateString()}\n`;
        
        // Get recent updates
        const updates = await this.incidentService.getIncidentUpdates(incidentGroup.id);
        if (updates.length > 0) {
          message += `\n📝 *Recent Updates:*\n`;
          updates.slice(0, 3).forEach(update => {
            const time = new Date(update.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            message += `• ${time}: ${update.description.substring(0, 50)}...\n`;
          });
        }
      }

      message += `\n⚠️ If this status seems incorrect, use "VERIFY" to report a discrepancy.`;

      await this.messagingService.sendTextMessage(phoneNumber, message, messageID);

    } catch (error) {
      this.logger.error('Error handling status query:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error fetching report status. Please try again.',
        messageID
      );
    }
  }

  private async handleVerificationCommand(phoneNumber: string, messageID: string): Promise<void> {
    try {
      // Get user's recent reports that might need verification
      const emergencyReports = await this.emergencyReportingService.getUserEmergencyReports(phoneNumber, messageID);
      const issueReports = await this.issueReportingService.getUserReports(phoneNumber, messageID);
      
      const allReports = [...emergencyReports, ...issueReports];
      const resolvedReports = allReports.filter(r => 
        r.status === 'resolved' || r.status === 'closed'
      );

      if (resolvedReports.length === 0) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '📭 You have no resolved reports. This feature is for reporting discrepancies on resolved cases.',
          messageID
        );
        return;
      }

      let message = `⚠️ *STATUS VERIFICATION*\n\n` +
        `Use this to report if a resolved issue is still occurring.\n\n` +
        `*Your Resolved Reports:*\n`;
      
      resolvedReports.slice(0, 5).forEach((report, index) => {
        const date = new Date(report.createdAt).toLocaleDateString();
        message += `${index + 1}. #${report.id} - ${report.type} (${date})\n`;
      });

      message += `\n📋 *How to verify:*\n` +
        `1. Type the report number (1-${Math.min(resolvedReports.length, 5)})\n` +
        `2. Describe what you're still experiencing\n` +
        `3. Authorities will investigate\n\n` +
        `Type "CANCEL" to exit verification mode.`;

      // Create verification session
      await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.VERIFICATION,
        1,
        {
          step: 'SELECT_REPORT',
          reports: resolvedReports.slice(0, 5),
          startedAt: new Date()
        },
        messageID
      );

      await this.messagingService.sendTextMessage(phoneNumber, message, messageID);

    } catch (error) {
      this.logger.error('Error handling verification command:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error starting verification. Please try again.',
        messageID
      );
    }
  }

  private getStatusEmoji(status: string): string {
    const emojiMap: Record<string, string> = {
      'reported': '📝',
      'in_progress': '🔄',
      'dispatched': '🚗',
      'resolved': '✅',
      'closed': '🔒',
      'cancelled': '❌',
      'investigating': '🔍',
      'reopened': '🔄'
    };
    return emojiMap[status] || '📋';
  }

  private async canUserEditReport(phoneNumber: string, reportId: number, reportType: 'EMERGENCY' | 'ISSUE'): Promise<boolean> {
    try {
      if (reportType === 'EMERGENCY') {
        // Check emergency reports
        const emergencyReport = await this.emergencyReportingService.getEmergencyReportById(reportId);
        if (emergencyReport && emergencyReport.reportingPhoneNumber === phoneNumber) {
          return true;
        }
      } else {
        // Check issue reports
        const issueReport = await this.issueReportingService.getIssueReportById(reportId);
        if (issueReport && issueReport.reportingPhoneNumber === phoneNumber) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Error checking edit permission:', error);
      return false;
    }
  }

  // ==================== REGISTRATION METHODS ====================

  async startRegistrationFlow(phoneNumber: string, messageID: string): Promise<void> {
    try {
      // Check if user is already in registration
      if (this.usersInRegistration.has(phoneNumber)) {
        const registrationData = this.usersInRegistration.get(phoneNumber)!;
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `📝 You're already in registration. Please continue with step ${registrationData.step}.\n\nCurrent step: ${this.getRegistrationStepDescription(registrationData.step)}`,
          messageID
        );
        return;
      }

      // Initialize registration data
      const registrationData: RegistrationData = {
        step: 1
      };

      // Store in memory
      this.usersInRegistration.set(phoneNumber, {
        step: 1,
        data: registrationData,
        lastActive: Date.now()
      });

      // Create database session for locking
      await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.REGISTRATION,
        1,
        registrationData,
        messageID
      );

      const welcomeMessage = `📝 *REGISTRATION* 📝\n\nI'll help you create your account. Please follow these steps:\n\n*Step 1/9:* What is your First Name?`;
      
      await this.messagingService.sendTextMessage(phoneNumber, welcomeMessage, messageID);

    } catch (error) {
      this.logger.error('Error starting registration:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error starting registration. Please try again.',
        messageID
      );
    }
  }

  private getRegistrationStepDescription(step: number): string {
    const steps = [
      "Step 1: First Name",
      "Step 2: Last Name",
      "Step 3: Email",
      "Step 4: Password",
      "Step 5: Confirm Password",
      "Step 6: ID Number",
      "Step 7: Address",
      "Step 8: ID Document Upload",
      "Step 9: Proof of Residence Upload"
    ];
    return steps[step - 1] || "Unknown step";
  }

  private async handleRegistrationStep(phoneNumber: string, text: string, messageID: string): Promise<void> {
    try {
      if (!this.usersInRegistration.has(phoneNumber)) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          'No active registration session. Please start over with "REGISTER".',
          messageID
        );
        return;
      }

      const registration = this.usersInRegistration.get(phoneNumber)!;
      registration.lastActive = Date.now();

      switch (registration.step) {
        case 1: // First Name
          registration.data.firstName = text.trim();
          registration.step = 2;
          await this.messagingService.sendTextMessage(phoneNumber, '👤 *Step 2/9:* What is your Last Name?', messageID);
          break;
        
        case 2: // Last Name
          registration.data.lastName = text.trim();
          registration.step = 3;
          await this.messagingService.sendTextMessage(phoneNumber, '📧 *Step 3/9:* What is your Email Address?', messageID);
          break;
        
        case 3: // Email
          if (!this.validateEmail(text)) {
            await this.messagingService.sendTextMessage(
              phoneNumber,
              '❌ Please provide a valid email address. Try again:',
              messageID
            );
            return;
          }
          registration.data.email = text.trim();
          registration.step = 4;
          await this.messagingService.sendTextMessage(
            phoneNumber,
            '🔐 *Step 4/9:* Create a Password (minimum 10 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character):',
            messageID
          );
          break;
        
        case 4: // Password
          if (!this.validatePassword(text)) {
            await this.messagingService.sendTextMessage(
              phoneNumber,
              '❌ Password must be at least 10 characters with:\n• 1 uppercase letter\n• 1 lowercase letter\n• 1 number\n• 1 special character (@$!%*?&)\n\nPlease try again:',
              messageID
            );
            return;
          }
          registration.data.password = text;
          registration.step = 5;
          await this.messagingService.sendTextMessage(phoneNumber, '🔐 *Step 5/9:* Please confirm your password:', messageID);
          break;
        
        case 5: // Confirm Password
          if (text !== registration.data.password) {
            await this.messagingService.sendTextMessage(
              phoneNumber,
              '❌ Passwords do not match. Please re-enter your password:',
              messageID
            );
            registration.step = 4;
            delete registration.data.password;
            return;
          }
          registration.step = 6;
          await this.messagingService.sendTextMessage(phoneNumber, '🆔 *Step 6/9:* What is your ID Number?', messageID);
          break;
        
        case 6: // ID Number
          if (!this.validateIdNumber(text)) {
            await this.messagingService.sendTextMessage(
              phoneNumber,
              '❌ Please provide a valid ID number (6-20 characters). Try again:',
              messageID
            );
            return;
          }
          registration.data.idNumber = text.trim();
          registration.step = 7;
          await this.messagingService.sendTextMessage(phoneNumber, '📍 *Step 7/9:* What is your Address?', messageID);
          break;
        
        case 7: // Address
          registration.data.address = text.trim();
          registration.step = 8;
          await this.messagingService.sendTextMessage(
            phoneNumber,
            '📄 *Step 8/9:* Please upload your ID Document (photo of your ID):\n\nYou can send a photo or document.',
            messageID
          );
          break;
        
        default:
          await this.messagingService.sendTextMessage(
            phoneNumber,
            'Invalid registration step. Please start over with "REGISTER".',
            messageID
          );
          this.usersInRegistration.delete(phoneNumber);
          return;
      }

      // Update in-memory registration
      this.usersInRegistration.set(phoneNumber, registration);

      // Update database session
      await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.REGISTRATION,
        registration.step,
        registration.data,
        messageID
      );

    } catch (error) {
      this.logger.error('Error handling registration step:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error processing registration step. Please try again or type "CANCEL" to exit.',
        messageID
      );
    }
  }

  private async handleRegistrationDocument(phoneNumber: string, message: any, messageID: string): Promise<void> {
    try {
      if (!this.usersInRegistration.has(phoneNumber)) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          'No active registration session. Please start over with "REGISTER".',
          messageID
        );
        return;
      }

      const registration = this.usersInRegistration.get(phoneNumber)!;
      
      if (registration.step !== 8 && registration.step !== 9) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          'Please continue with the current text step first.',
          messageID
        );
        return;
      }

      const mediaId = message.image?.id || message.document?.id;
      const mimeType = message.image?.mime_type || message.document?.mime_type;

      if (!mediaId) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ No media found. Please try uploading again.',
          messageID
        );
        return;
      }

      const validDocumentTypes = [
        'application/pdf', 'image/jpeg', 'image/png', 
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!validDocumentTypes.includes(mimeType)) { 
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Please upload a valid document (PDF, JPEG, PNG, Word). Try again:',
          messageID
        );
        return;
      }

      const mediaUrl = await this.getMediaUrl(mediaId);
      const mediaBuffer = await this.downloadMedia(mediaUrl);
      const extension = this.getFileExtensionFromMimeType(mimeType);
      const timestamp = Date.now();

      if (registration.step === 8) {
        // ID Document
        const fileName = `id_document_${phoneNumber}_${timestamp}.${extension}`;
        const filePath = await this.storageService.saveIdDocument(
          phoneNumber, 
          mediaBuffer,
          fileName
        );

        if (!filePath || !existsSync(filePath)) {
          throw new Error('Failed to save ID document');
        }

        registration.data.idDocumentUrl = filePath;
        registration.step = 9;
        
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '✅ ID Document received!\n\n📄 *Step 9/9:* Please upload your Proof of Residence (document or photo):\n\nThis could be a utility bill, bank statement, or other official document with your address.',
          messageID
        );
      } 
      else if (registration.step === 9) {
        // Proof of Residence
        const fileName = `proof_of_residence_${phoneNumber}_${timestamp}.${extension}`;
        const filePath = await this.storageService.saveProofOfResidence(
          phoneNumber, 
          mediaBuffer,
          fileName
        );

        if (!filePath || !existsSync(filePath)) {
          throw new Error('Failed to save proof of residence');
        }
        
        registration.data.proofOfResidenceUrl = filePath;
        
        // Complete registration
        await this.completeRegistration(phoneNumber, registration.data, messageID);
        return;
      }

      // Update in-memory registration
      registration.lastActive = Date.now();
      this.usersInRegistration.set(phoneNumber, registration);

      // Update database session
      await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.REGISTRATION,
        registration.step,
        registration.data,
        messageID
      );

    } catch (error) {
      this.logger.error('Error handling registration document:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Failed to process document. Please try again or type "CANCEL" to exit.',
        messageID
      );
    }
  }

  private async completeRegistration(phoneNumber: string, userData: RegistrationData, messageID: string): Promise<void> {
    try {
      // Validate all required fields
      const requiredFields = [
        { field: 'firstName', name: 'First Name' },
        { field: 'lastName', name: 'Last Name' },
        { field: 'email', name: 'Email' },
        { field: 'password', name: 'Password' },
        { field: 'idNumber', name: 'ID Number' },
        { field: 'address', name: 'Address' },
        { field: 'idDocumentUrl', name: 'ID Document' },
        { field: 'proofOfResidenceUrl', name: 'Proof of Residence' }
      ];
      
      const missingFields: string[] = [];
      for (const { field, name } of requiredFields) {
        if (!userData[field as keyof RegistrationData]) {
          missingFields.push(name);
        }
      }

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Verify documents exist
      if (!existsSync(userData.idDocumentUrl!)) {
        throw new Error('ID document file not found');
      }
      if (!existsSync(userData.proofOfResidenceUrl!)) {
        throw new Error('Proof of residence file not found');
      }

      const userToCreate = {
        phoneNumber: phoneNumber.toString(),
        firstName: userData.firstName!,
        lastName: userData.lastName!,
        email: userData.email!,
        password: userData.password!,
        role: UserRole.USER,
        status: UserStatus.PENDING_VERIFICATION,
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
        kycData: {
          idNumber: userData.idNumber!,
          address: userData.address!,
          idLink: userData.idDocumentUrl!,
          porLink: userData.proofOfResidenceUrl!,
        },
        passwordResetToken: null,
        passwordResetExpires: null,
        emailVerificationToken: null,
        lastActivityAt: new Date(),
        lastLoginAt: new Date(),
        timezone: null,
        language: null
      };

      // Save to database
      const registrationSuccess = await this.authService.completeRegistration(userToCreate);

      if (registrationSuccess) {
        // Clean up sessions
        this.usersInRegistration.delete(phoneNumber);
        await this.sessionManager.completeSession(phoneNumber, SessionType.REGISTRATION);
        await this.sessionManager.createLoginSession(phoneNumber);

        await this.sendRegistrationSuccessMessage(phoneNumber, userData, messageID);
        await this.sendWelcomeMessageAfterRegistration(phoneNumber, messageID);
      } else {
        throw new Error('Registration failed in auth service');
      }
    } catch (error) {
      this.logger.error('Error completing registration:', error);
      
      // Clean up on error
      this.usersInRegistration.delete(phoneNumber);
      await this.sessionManager.cancelSession(phoneNumber, SessionType.REGISTRATION);
      
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Registration failed. Please start over by sending "REGISTER".',
        messageID
      );
    }
  }

  private async sendRegistrationSuccessMessage(phoneNumber: string, userData: RegistrationData, messageID: string): Promise<void> {
    await this.messagingService.sendTextMessage(
      phoneNumber,
      '🎉 *REGISTRATION COMPLETED SUCCESSFULLY!* 🎉\n\n' +
      'Your account has been created and is pending verification.\n\n' +
      '📋 *Your Details:*\n' +
      `• Name: ${userData.firstName} ${userData.lastName}\n` +
      `• Email: ${userData.email}\n` +
      `• Status: Pending Verification\n\n` +
      'You can now use basic features while we verify your documents.',
      messageID
    );
  }

  private async sendWelcomeMessageAfterRegistration(phoneNumber: string, messageID: string): Promise<void> {
    await this.messagingService.sendTextMessage(
      phoneNumber,
      '🎉 *Welcome to Muyamuri/Sezani Civil Protection Bot!* 🛡️\n\n' +
      'While your account is being verified, you can use:\n\n' +
      '🆓 *Free Features (Available now):*\n' +
      '• Report emergencies: "EMERGENCY"\n' +
      '• Report issues: "REPORT"\n' +
      '• View your reports: "MY REPORTS"\n' +
      '• Get basic assistance: "HELP"\n\n' +
      '🔐 *Premium Features (After verification):*\n' +
      '• Set organisations\n' +
      '• Chat with organisation AI\n' +
      '• Access custom knowledge bases\n\n' +
      'We will notify you once your account is verified!',
      messageID
    );

    // Send quick commands after a short delay
    setTimeout(async () => {
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '💡 *Quick Commands:*\n' +
        '• "HELP" - Show help menu\n' +
        '• "REPORT" - Report an issue\n' +
        '• "MY REPORTS" - View your reports\n' +
        '• "EMERGENCY" - Urgent help\n' +
        '• "LOGOUT" - End your session\n' +
        '• "CANCEL" - Cancel any active session',
        messageID
      );
    }, 2000);
  }

  private async cancelRegistration(phoneNumber: string, messageID: string): Promise<void> {
    this.usersInRegistration.delete(phoneNumber);
    await this.sessionManager.cancelSession(phoneNumber, SessionType.REGISTRATION);
    
    await this.messagingService.sendTextMessage(
      phoneNumber,
      '❌ Registration cancelled. You can start again by typing "REGISTER".',
      messageID
    );
    
    await this.sendWelcomeMessage(phoneNumber, messageID);
  }

  // ==================== LOGIN/LOGOUT METHODS ====================

  private async handleLoginCommand(phoneNumber: string, text: string, messageID: string): Promise<void> {
    try {
      const loginParts = text.split(' ');
      if (loginParts.length < 3) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Invalid login format.\n\n' +
          '💡 Usage: LOGIN <email/phone> <password>\n' +
          'Example: LOGIN myemail@example.com mypassword123\n' +
          'Example: LOGIN +263771234567 mypassword123',
          messageID
        );
        return;
      }

      const emailOrPhone = loginParts[1];
      const password = loginParts.slice(2).join(' ');

      const user = await this.tryMultipleLoginStrategies(emailOrPhone, password, phoneNumber);
      
      if (user) {
        await this.sessionManager.createLoginSession(phoneNumber);
        
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '✅ *LOGIN SUCCESSFUL!*\n\n' +
          `Welcome back, ${user.firstName} ${user.lastName}!\n\n` +
          'You now have access to all premium features.',
          messageID
        );
        
        this.logger.log(`User ${user.email} logged in successfully via WhatsApp`);
      } else {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ Login failed. Please check your credentials and try again.\n\n' +
          '💡 Tips:\n' +
          '• Use the exact email or phone number you registered with\n' +
          '• Ensure your password is correct\n' +
          '• Make sure you are registered first (type "REGISTER")\n' +
          '• If you forgot your password, contact support',
          messageID
        );
      }
    } catch (error) {
      this.logger.error('Error handling login command:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ An error occurred during login. Please try again.',
        messageID
      );
    }
  }

  private async tryMultipleLoginStrategies(identifier: string, password: string, whatsappPhone: string): Promise<User | null> {
    try {
      this.logger.debug(`Attempting login for identifier: ${identifier}`);
      
      // Try email login
      if (this.validateEmail(identifier)) {
        this.logger.debug('Trying email-based login');
        const userByEmail = await this.authService.loginByEmail(identifier, password);
        if (userByEmail) {
          this.logger.debug('Login successful via email');
          return userByEmail;
        }
      }
      
      // Try phone login (using the provided identifier)
      this.logger.debug('Trying phone-based login');
      const userByPhone = await this.authService.login(identifier, password);
      if (userByPhone) {
        this.logger.debug('Login successful via phone');
        return userByPhone;
      }
      
      // Try WhatsApp phone login
      this.logger.debug('Trying WhatsApp phone-based login');
      const userByWhatsAppPhone = await this.authService.login(whatsappPhone, password);
      if (userByWhatsAppPhone) {
        this.logger.debug('Login successful via WhatsApp phone');
        return userByWhatsAppPhone;
      }
      
      this.logger.warn(`All login strategies failed for identifier: ${identifier}`);
      return null;
      
    } catch (error) {
      this.logger.error('Error in login strategies:', error);
      return null;
    }
  }

  private async handleLogoutCommand(phoneNumber: string, messageID: string): Promise<void> {
    try {
      const hadSession = await this.sessionManager.hasValidLoginSession(phoneNumber);
      await this.sessionManager.removeLoginSession(phoneNumber);
      
      await this.messagingService.sendTextMessage(
        phoneNumber,
        hadSession ? 
        '✅ You have been logged out successfully.' :
        'ℹ️ You were not logged in.',
        messageID
      );
      
      await this.sendWelcomeMessage(phoneNumber, messageID);
    } catch (error) {
      this.logger.error('Error handling logout command:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error during logout. Please try again.',
        messageID
      );
    }
  }

  // ==================== OTHER METHODS ====================

  private async handleCancelCommand(phoneNumber: string, messageID: string): Promise<void> {
    try {
      // Clear current session tracking
      await this.clearCurrentSession(phoneNumber);

      const activeSession = await this.sessionManager.getActiveSession(phoneNumber);
      const allActiveSessions = await this.sessionManager.getAllActiveSessions(phoneNumber);

      let cancellationMessage = '';
      let cancelledCount = 0;
      let wasRAGSession = false;
      
      if (activeSession) {
        // Check if it's a RAG session
        if (activeSession.sessionType === SessionType.GOVERNMENT || 
            activeSession.sessionType === SessionType.FARMER) {
          wasRAGSession = true;
          const organisation = activeSession.sessionType === SessionType.GOVERNMENT ? 'Government' : 'Agriculture';
          cancellationMessage += `🏛️ ${organisation} session ended.\n`;
        } else {
          switch (activeSession.sessionType) {
            case SessionType.EMERGENCY:
              await this.emergencyReportingService.cancelEmergencyReport(phoneNumber);
              cancellationMessage += '🚨 Emergency reporting session cancelled.\n';
              cancelledCount++;
              break;
            case SessionType.ISSUE_REPORTING:
              await this.issueReportingService.cancelReportingSession(phoneNumber);
              cancellationMessage += '📝 Issue reporting session cancelled.\n';
              cancelledCount++;
              break;
            case SessionType.REGISTRATION:
              await this.cancelRegistration(phoneNumber, messageID);
              return;
            case SessionType.EDIT_FEEDBACK:
              await this.sessionManager.cancelSession(phoneNumber, SessionType.EDIT_FEEDBACK);
              cancellationMessage += '📝 Edit process cancelled.\n';
              cancelledCount++;
              break;
            case SessionType.VERIFICATION:
              await this.sessionManager.cancelSession(phoneNumber, SessionType.VERIFICATION);
              cancellationMessage += '⚠️ Verification process cancelled.\n';
              cancelledCount++;
              break;
          }
        }
      }
      
      for (const session of allActiveSessions) {
        if (session.status === SessionStatus.ACTIVE && session !== activeSession) {
          await this.sessionManager.cancelSession(phoneNumber, session.sessionType);
          if (session.sessionType === SessionType.GOVERNMENT || session.sessionType === SessionType.FARMER) {
            const org = session.sessionType === SessionType.GOVERNMENT ? 'Government' : 'Agriculture';
            cancellationMessage += `🏛️ ${org} session cancelled.\n`;
          } else {
            cancellationMessage += `📋 ${session.sessionType} session cancelled.\n`;
          }
          cancelledCount++;
        }
      }
      
      const cancelled = await this.sessionManager.cancelSession(phoneNumber);
      
      if (cancelled || wasRAGSession) {
        if (cancelledCount > 0 || wasRAGSession) {
          await this.messagingService.sendTextMessage(
            phoneNumber,
            `✅ *Session Cancelled*\n\n${cancellationMessage}You can now start a new service.`,
            messageID
          );
        } else {
          await this.messagingService.sendTextMessage(
            phoneNumber,
            '✅ All active sessions cancelled. You can now start a new service.',
            messageID
          );
        }
      } else {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          'ℹ️ No active sessions to cancel.',
          messageID
        );
      }
      
      await this.sendMainMenu(phoneNumber, messageID);
    } catch (error) {
      this.logger.error('Error handling cancel command:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error cancelling session. Please try again.',
        messageID
      );
    }
  }

  private async sendClarityMessage(phoneNumber: string, originalMessage: string, messageID: string): Promise<void> {
    const clarityMessage = `🤔 *I need more clarity*

I received your message: "*${originalMessage.substring(0, 50)}${originalMessage.length > 50 ? '...' : ''}*"

I'm your Muyamuri/Sezani Civil Protection Assistant and I can help you with:

🚨 *EMERGENCY SERVICES*
• Fire emergencies, medical emergencies
• Crime in progress, accidents
• Natural disasters

📝 *CIVIC ISSUE REPORTING*
• Potholes & road damage
• Water & sewer problems
• Sanitation & litter

🌾 *FARMER SUPPORT*
• Crop/livestock issues
• Agricultural advice
• Weather alerts

🏛️ *GOVERNMENT SERVICES*
• Civil registration
• Passport/ID applications
• Social welfare

🌾 *AGROMATE - SMART FARMING*
• Real-time crop health monitoring (NDVI)
• Smart irrigation scheduling
• Crop growth analysis
• AI-powered farming recommendations

💡 *OTHER SERVICES*
• View your reports
• Register for premium features
• Get help and information

*Please choose one of these options:*

1️⃣ *For emergencies:* Type "1" or "EMERGENCY" or describe the situation
2️⃣ *For civic issues:* Type "2" or "REPORT" 
3️⃣ *For farmer support:* Type "3" or "FARMER" 
4️⃣ *For government services:* Type "4" or "GOVERNMENT" 
5️⃣ *For menu:* Type "5" or "MENU" to see all options
6️⃣ *For reports:* Type "6" or "MY REPORTS" to view your civic reports
7️⃣ *For emergencies:* Type "7" or "MY EMERGENCIES" to view your emergency reports
8️⃣ *For editing:* Type "8" or "EDIT" to edit existing reports
9️⃣ *For registration:* Type "9" or "REGISTER" to create account
🔟 *For Agromate:* Type "10" or "AGROMATE" for smart farming insights
0️⃣ *For status:* Type "0" or "STATUS" to check report status
❌ *To cancel:* Type "X" or "CANCEL" to exit current session
❓ *To get Help:* Type "?" or "HELP" to get help on app operation

I'm here to help you! What would you like to do?`;

    await this.messagingService.sendTextMessage(phoneNumber, clarityMessage, messageID);
  }

  async sendWelcomeMessage(phoneNumber: string, messageID: string): Promise<void> {
    const welcomeMessage = `👋 *Welcome to Muyamuri/Sezani Civil Protection Bot!* 🛡️

I'm your community safety assistant. I can help you with:

🚨 *URGENT EMERGENCIES*
• Fire, medical, crime, accidents
• Natural disasters
• Life-threatening situations

📝 *CIVIC ISSUE REPORTING*
• Potholes & road damage
• Water & sewer problems
• Sanitation & litter

🌾 *FARMER SUPPORT*
• Crop/livestock issues
• Agricultural advice
• Weather alerts

🏛️ *GOVERNMENT SERVICES*
• Civil registration
• Passport/ID applications
• Social welfare

🌾 *AGROMATE - SMART FARMING*
• Real-time crop health monitoring
• Smart irrigation scheduling
• AI-powered farming insights
• Weather-based recommendations

📋 *OTHER SERVICES*
• View your reports
• Register account
• Get help & information

*How to use:*

1️⃣ *For emergencies:* Type "1" or "EMERGENCY" or describe the situation
2️⃣ *For civic issues:* Type "2" or "REPORT" 
3️⃣ *For farmer support:* Type "3" or "FARMER" 
4️⃣ *For government services:* Type "4" or "GOVERNMENT" 
5️⃣ *For menu:* Type "5" or "MENU" to see all options
6️⃣ *For reports:* Type "6" or "MY REPORTS" to view your civic reports
7️⃣ *For emergencies:* Type "7" or "MY EMERGENCIES" to view your emergency reports
8️⃣ *For editing:* Type "8" or "EDIT" to edit existing reports
9️⃣ *For registration:* Type "9" or "REGISTER" to create account
🔟 *For Agromate:* Type "10" or "AGROMATE" for smart farming insights
0️⃣ *For status:* Type "0" or "STATUS" to check report status
❌ *To cancel:* Type "X" or "CANCEL" to exit current session
❓ *To get Help:* Type "?" or "HELP" to get help on app operation

What would you like to do today?`;

    await this.messagingService.sendTextMessage(phoneNumber, welcomeMessage, messageID);

    // Then send an interactive menu with buttons for quick access
  setTimeout(async () => {
    await this.sendMainMenu(phoneNumber, messageID);
  }, 1000);
  }

  async sendMainMenu(phoneNumber: string, messageID: string): Promise<boolean> {
    try {
      const messageData: MessageData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: `📱 *MUYAMURI/SEZANI CIVIL PROTECTION MENU* 📱\n\nChoose an option below:\n\nYou can also type numbers or commands:\n1️⃣ EMERGENCY\n2️⃣ REPORT\n3️⃣ FARMER\n4️⃣ GOVERNMENT\n5️⃣ MENU\n6️⃣ MY REPORTS\n7️⃣ MY EMERGENCIES\n8️⃣ EDIT\n9️⃣ REGISTER\n🔟 AGROMATE\n0️⃣ STATUS\n❌ CANCEL\n❓ HELP`
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: 'btn_report_issue',
                  title: '📝 REPORT'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'btn_agromate',
                  title: '🌾AGROMATE'
                }
              },
              {
                type: 'reply',
                reply: {
                  id: 'btn_government',
                  title: '🏛️ GOVERNMENT'
                }
              }
            ]
          }
        }
      };

      return await this.sendWhatsappMessage(messageData, messageID);
    } catch (error) {
      this.logger.error('Error sending main menu:', error);
      
      // Fallback to text message
      const fallbackMessage = `📱 *MUYAMURI/SEZANI CIVIL PROTECTION MENU* 📱

*Available Commands:*
🚨 EMERGENCY - Report urgent emergencies
📝 REPORT - Report civic issues
🌾 FARMER - Start farmer support
🏛️ GOVERNMENT - Start government related queries
🌾 AGROMATE - Smart farming assistant
📝 EDIT - Edit existing reports
📋 MY REPORTS - View your reports
📋 MY EMERGENCIES - View emergency reports
📝 REGISTER - Create account
🔐 LOGIN email password - Sign in
🚪 LOGOUT - End session
❓ HELP - Get help
📱 MENU - Show this menu
❌ CANCEL - Cancel current session

*Quick Numbers:*
1️⃣ EMERGENCY | 2️⃣ REPORT | 3️⃣ FARMER | 4️⃣ GOVERNMENT
5️⃣ MENU | 6️⃣ MY REPORTS | 7️⃣ MY EMERGENCIES | 8️⃣ EDIT
9️⃣ REGISTER | 🔟 AGROMATE | 0️⃣ STATUS | ❌ CANCEL

Type your command or describe what you need help with.`;

      return await this.messagingService.sendTextMessage(phoneNumber, fallbackMessage, messageID);
    }
  }

  async sendHelpMessage(phoneNumber: string, messageID: string): Promise<boolean> {
    const helpMessage = `🆘 *Muyamuri/Sezani Civil Protection Bot - HELP* 🆘

*🚨 WHEN TO USE EMERGENCY:*
• FIRE - Building fire, forest fire, smoke
• MEDICAL - Heart attack, stroke, unconscious
• CRIME - Robbery in progress, assault, violence
• ACCIDENT - Car crash, serious injury
• DISASTER - Flood, earthquake, storm damage

*📝 WHAT YOU CAN REPORT:*
• ROADS - Potholes, sinkholes, road damage
• WATER - Burst pipes, leaks, flooding
• SEWER - Blockages, overflows, sewage
• SANITATION - Litter, garbage, illegal dumping

🌾 *FARMER SUPPORT*
• Crop/livestock issues
• Agricultural advice
• Weather alerts

🌾 *AGROMATE - SMART FARMING ASSISTANT*
• Real-time crop health monitoring (NDVI)
• Smart irrigation scheduling
• Crop growth stage analysis
• Weather-based recommendations
• Early warning alerts
• Performance insights
• AI-powered farming advice

🏛️ *GOVERNMENT SERVICES*
• Civil registration
• Passport/ID applications
• Social welfare

*📝 EDITING REPORTS:*
• Type "EDIT" to start edit process
• Choose report type (Emergency/Issue)
• Select report ID from your list
• Choose what to edit (media, notes, location, description)
• Submit changes when ready

*💡 HOW TO USE:*

*Option 1: Type Number or character corresponding to required service*
1️⃣ *For emergencies:* Type "1" or "EMERGENCY" or describe the situation
2️⃣ *For civic issues:* Type "2" or "REPORT" 
3️⃣ *For farmer support:* Type "3" or "FARMER" 
4️⃣ *For government services:* Type "4" or "GOVERNMENT" 
5️⃣ *For menu:* Type "5" or "MENU" to see all options
6️⃣ *For reports:* Type "6" or "MY REPORTS" to view your civic reports
7️⃣ *For emergencies:* Type "7" or "MY EMERGENCIES" to view your emergency reports
8️⃣ *For editing:* Type "8" or "EDIT" to edit existing reports
9️⃣ *For registration:* Type "9" or "REGISTER" to create account
🔟 *For Agromate:* Type "10" or "AGROMATE" for smart farming insights
0️⃣ *For status:* Type "0" or "STATUS" to check report status
❌ *To cancel:* Type "X" or "CANCEL" to exit current session
❓ *To get Help:* Type "?" or "HELP" to get help on app operation

*Option 2: Type Commands*
• "EMERGENCY" - Start emergency report
• "REPORT" - Start issue report
• "FARMER" - Start farmer support
• "AGROMATE" - Start smart farming assistant
• "GOVERNMENT" - Start government related inquiries
• "EDIT" - Start editing a report
• "MY REPORTS" - View your reports
• "MY EMERGENCIES" - View emergency reports
• "HELP" - Show this help
• "MENU" - Show main menu
• "STATUS" - To check report status
• "CANCEL" - Cancel current session

*Option 3: Describe The emergency Naturally*
• "There's a fire at 123 Main Street"
• "Need ambulance for chest pain"

*Option 4: Click Buttons*
Use the interactive menu buttons for quick access

*🌾 AGROMATE FEATURES:*
1. Start with "AGROMATE" or "10"
2. Enter your field ID (one time only)
3. Get instant insights:
   • Crop health status (NDVI)
   • Soil moisture levels
   • Irrigation recommendations
   • Weather forecasts and alerts
   • AI-powered farming advice
4. Quick commands within Agromate:
   • "CONTEXT" - View field data
   • "RECOMMENDATIONS" - Get AI insights
   • "REFRESH" - Update data
   • "CHANGE FIELD" - Switch fields

*📝 EDIT FLOW:*
1. Type "EDIT"
2. Choose report type (Emergency/Issue)
3. View your reports and their IDs
4. Type "EDIT <report-id>" for specific report
5. Choose what to edit
6. Make your changes
7. Type "SUBMIT" to save changes

*🆘 FOR LIFE-THREATENING EMERGENCIES:*
1. Use "EMERGENCY" immediately
2. Follow the prompts
3. If in immediate danger, CALL local emergency services

*📞 SUPPORT:*
For technical issues, contact support.

Stay safe! 🛡️`;

    return await this.messagingService.sendTextMessage(phoneNumber, helpMessage, messageID);
  }

  async startEmergencyReporting(phoneNumber: string, messageID: string): Promise<void> {
    try {
      const currentSession = await this.getCurrentSession(phoneNumber);
      if (currentSession) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `⚠️ You already have an active ${currentSession.sessionType} session. Please complete it or type "CANCEL" to exit first.`,
          messageID
        );
        return;
      }

      await this.emergencyReportingService.startEmergencyReport(phoneNumber, messageID);
      
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes for emergency
      // Create session lock
      const activeSession = await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.EMERGENCY,
        1,
        {
          startedAt: new Date(),
          messageId: messageID,
          emergencyType: 'user_initiated'
        },
        messageID,
        expiresAt
      );

      // Track as current session
      await this.setCurrentSession(phoneNumber, activeSession.id.toString(), SessionType.EMERGENCY, expiresAt);
      
    } catch (error) {
      this.logger.error('Error starting emergency reporting:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Unable to start emergency reporting. Please try again or call emergency services directly.',
        messageID
      );
    }
  }

  async startIssueReporting(phoneNumber: string, messageID: string): Promise<void> {
    try {
      const currentSession = await this.getCurrentSession(phoneNumber);
      if (currentSession) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `⚠️ You already have an active ${currentSession.sessionType} session. Please complete it or type "CANCEL" to exit first.`,
          messageID
        );
        return;
      }

      await this.issueReportingService.startIssueReport(phoneNumber, messageID);
      
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes for issue reporting
      // Create session lock
      const activeSession = await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.ISSUE_REPORTING,
        1,
        {
          startedAt: new Date(),
          messageId: messageID,
          issueType: 'user_initiated'
        },
        messageID,
        expiresAt
      );

      // Track as current session
      await this.setCurrentSession(phoneNumber, activeSession.id.toString(), SessionType.ISSUE_REPORTING, expiresAt);
      
    } catch (error) {
      this.logger.error('Error starting issue reporting:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Unable to start issue reporting. Please try again.',
        messageID
      );
    }
  }

  async sendTextMessage(recipient: string, message: string, messageID?: string): Promise<boolean> {
    try {
      const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
      const version = this.configService.get<string>('WHATSAPP_API_VERSION');
      const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

      if (!phoneNumberId || !version || !accessToken) {
        throw new BadRequestException('Missing WhatsApp configuration');
      }

      const messageData: MessageData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: {
          preview_url: false,
          body: message,
        },
      };

      // Add context if provided
      if (messageID) {
        messageData['context'] = { message_id: messageID };
      }

      const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

      const response$ = this.httpService.post(url, messageData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      .pipe(
        map((res: AxiosResponse) => res.data),
        catchError((error) => {
          this.logger.error('WhatsApp API Error:', error.response?.data || error.message);
          throw new BadRequestException('Error posting to WhatsApp Cloud API');
        }),
      );

      await firstValueFrom(response$);
      return true;
    } catch (error) {
      this.logger.error('Error sending text message:', error);
      return false;
    }
  }

  private async sendWhatsappMessage(messageData: MessageData, contextMessageId?: string): Promise<boolean> {
    try {
      const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
      const version = this.configService.get<string>('WHATSAPP_API_VERSION');
      const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

      if (!phoneNumberId || !version || !accessToken) {
        throw new BadRequestException('Missing WhatsApp configuration');
      }

      // Add context if provided
      if (contextMessageId) {
        messageData['context'] = { message_id: contextMessageId };
      }

      const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

      const response$ = this.httpService.post(url, messageData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      .pipe(
        map((res: AxiosResponse) => res.data),
        catchError((error) => {
          this.logger.error('WhatsApp API Error:', error.response?.data || error.message);
          throw new BadRequestException('Error posting to WhatsApp Cloud API');
        }),
      );

      await firstValueFrom(response$);
      return true;
    } catch (error) {
      this.logger.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  async markMessageAsRead(messageID: string): Promise<boolean> {
    try {
      const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
      const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
      const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION');

      if (!phoneNumberId || !accessToken) {
        this.logger.error('Missing WhatsApp configuration for mark as read');
        return false;
      }

      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

      const config = {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: this.API_TIMEOUT
      };

      const data = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageID.trim(),
      };

      this.logger.debug(`Marking message as read: ${messageID}`);

      const response = await firstValueFrom(
        this.httpService.post(url, data, config).pipe(
          timeout(this.API_TIMEOUT),
          catchError(error => {
            this.logger.error('Error marking message as read:', error.message);
            throw error;
          })
        )
      );

      if (response.status === 200) {
        this.logger.log(`Successfully marked message ${messageID} as read`);
        return true;
      } else {
        this.logger.warn(`Unexpected response when marking message as read: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logger.error('Error marking message as read:', error);
      return false;
    }
  }

  async getMediaUrl(mediaId: string): Promise<string> {
    try {
      const version = this.configService.get<string>('WHATSAPP_API_VERSION');
      const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

      const url = `https://graph.facebook.com/${version}/${mediaId}`;
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }).pipe(
          timeout(this.API_TIMEOUT),
          catchError(error => {
            this.logger.error('Error getting media URL:', error);
            throw error;
          })
        )
      );

      return response.data.url;
    } catch (error) {
      this.logger.error('Failed to get media URL:', error);
      throw error;
    }
  }

  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    try {
      const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

      const response = await firstValueFrom(
        this.httpService.get(mediaUrl, {
          responseType: 'arraybuffer',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }).pipe(
          timeout(this.API_TIMEOUT),
          catchError(error => {
            this.logger.error('Error downloading media:', error);
            throw error;
          })
        )
      );

      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error('Failed to download media:', error);
      throw error;
    }
  }

  getFileExtensionFromMimeType(mimeType: string): string {
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
      'video/quicktime': 'mov',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
    };
    
    return extensionMap[mimeType] || 'bin';
  }

  // Validation methods
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): boolean {
    // At least 10 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;
    return passwordRegex.test(password);
  }

  validateIdNumber(idNumber: string): boolean {
    // Basic validation - can be customized per country
    return idNumber.length >= 6 && idNumber.length <= 20;
  }

  // Cleanup old registration sessions
  cleanupOldRegistrationSessions(): void {
    const now = Date.now();
    const SESSION_TTL = 30 * 60 * 1000; // 30 minutes
    
    for (const [phoneNumber, registration] of this.usersInRegistration.entries()) {
      if (now - registration.lastActive > SESSION_TTL) {
        this.usersInRegistration.delete(phoneNumber);
        this.logger.log(`Cleaned up expired registration session for ${phoneNumber}`);
        
        // Also clean up database session
        this.sessionManager.cancelSession(phoneNumber, SessionType.REGISTRATION)
          .catch(error => this.logger.error('Error cleaning up database registration session:', error));
      }
    }
  }
}

// import { Injectable, Logger } from '@nestjs/common';
// import { MessageHandlerService } from '../services/messaging/message-handler.service';
// import { DeduplicationService } from '../services/utils/deduplication.service';
// import { WebhookPayload } from '../services/interfaces/webhook.interface';

// @Injectable()
// export class WhatsappService {
//   private readonly logger = new Logger(WhatsappService.name);

//   constructor(
//     private readonly messageHandler: MessageHandlerService,
//     private readonly deduplicationService: DeduplicationService,
//   ) {}

//   getTestMessage(): string {
//     return 'Muyamuri/Sezani Civil Protection Bot - Ready to serve!';
//   }

//   verifyWebhook(mode: string, token: string, challenge: string): string | undefined {
//     const verificationToken = process.env.WHATSAPP_CLOUD_API_WEBHOOK_VERIFICATION_TOKEN;

//     if (!mode || !token) {
//       return 'Error verifying token';
//     }

//     if (mode === 'subscribe' && token === verificationToken) {
//       return challenge;
//     }
//     return undefined;
//   }

//   async handleIncomingMessage(payload: WebhookPayload): Promise<void> {
//     await this.messageHandler.handleIncomingMessage(payload);
//   }

//   public cleanupOldData(): void {
//     this.deduplicationService.cleanupOldData();
//   }
// }