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

import { Injectable, Logger } from '@nestjs/common';
import { MessagingService } from '../messaging/messaging.service';
import { SessionManagerService } from '../session-manager.service';
import { EmergencyReportingService } from '../reporting/emergency-reporting.service';
import { IssueReportingService } from '../reporting/issue-reporting.service';
import { RAGSessionService } from '../rag/rag-session.service';
import { FlaskRagService } from '../flask-rag.service';
import { SessionType } from '../../../database/session.entity';
import { EcoFarmerService } from '../ecoFarmer/ecofarmer.service';
import { RAGOrganisation } from '../interfaces/webhook.interface';

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

@Injectable()
export class MenuCommandService {
  private readonly logger = new Logger(MenuCommandService.name);

  constructor(
    private readonly messagingService: MessagingService,
    private readonly sessionManager: SessionManagerService,
    private readonly emergencyReportingService: EmergencyReportingService,
    private readonly issueReportingService: IssueReportingService,
    private readonly ragSessionService: RAGSessionService,
    private readonly flaskRagService: FlaskRagService,
    private readonly ecofarmerService: EcoFarmerService,
  ) {}

  /**
   * Handle text messages - matches unrefactored processMessageFlow
   */
  async handleTextMessage(phoneNumber: string, message: any, messageID: string): Promise<void> {
    const text = message.text?.body?.trim();
    if (!text) return;

    const normalizedText = text.toLowerCase().trim();
    
    // Check for cancel command
    if (this.isCancelCommand(normalizedText)) {
      await this.handleCancelCommand(phoneNumber, messageID);
      return;
    }

    // Check for basic queries or salutations
    const isBasicQuery = this.isBasicQuery(normalizedText);
    const isSalutation = this.isSalutation(normalizedText);
    
    if (isBasicQuery || isSalutation) {
      this.logger.log(`User ${phoneNumber} sent basic query/salutation: ${text}`);
      await this.sendWelcomeMessage(phoneNumber, messageID);
      return;
    }

    // Check for menu commands
    const menuCommand = this.detectMenuCommand(normalizedText);
    if (menuCommand) {
      this.logger.log(`User ${phoneNumber} used menu command: ${menuCommand}`);
      await this.handleMenuCommand(phoneNumber, menuCommand, text, messageID);
      return;
    }

    // If no command matched, send clarity message (matches unrefactored NLP failed case)
    await this.sendClarityMessage(phoneNumber, text, messageID);
  }

  /**
   * Handle interactive button messages - matches unrefactored handleInteractiveMessage
   */
  async handleInteractiveMessage(phoneNumber: string, message: any, messageID: string): Promise<boolean> {
    try {
      if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
        const buttonId = message.interactive.button_reply?.id;
        
        this.logger.log(`Interactive button clicked: ${buttonId} by ${phoneNumber}`);

        const currentSession = await this.sessionManager.getActiveSession(phoneNumber);
        const isEditButton = ['edit_emergency', 'edit_issue', 'edit_cancel'].includes(buttonId);

        if (currentSession) {
          if (currentSession.sessionType === SessionType.EDIT_FEEDBACK && isEditButton) {
            // Continue edit flow
          } else if (['btn_emergency', 'btn_report_issue', 'btn_farmer', 'btn_government', 'btn_menu'].includes(buttonId)) {
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
          case 'btn_ecocash':
            await this.ecofarmerService.startEcofarmer(phoneNumber, messageID);
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
            // This will be handled by edit session service
            return true;
          case 'edit_issue':
            // This will be handled by edit session service
            return true;
          case 'edit_cancel':
            await this.handleCancelCommand(phoneNumber, messageID);
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

  /**
   * Handle government inquiries - matches unrefactored handleGovernmentInquiries
   */
  async handleGovernmentInquiries(phoneNumber: string, messageID: string): Promise<void> {
    try {
      const isHealthy = await this.flaskRagService.healthCheck();
      
      if (!isHealthy) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '⚠️ Government knowledge base service is currently unavailable. Please try again later.',
          messageID
        );
        return;
      }

      const currentSession = await this.sessionManager.getActiveSession(phoneNumber);
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

      const existingRAGSession = await this.ragSessionService.getRAGSession(phoneNumber);
      if (existingRAGSession?.organisation === 'Government') {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `🏛️ *Continuing Government Services*\n\nYou're already in a Government information session. Ask me anything about government services.`,
          messageID
        );
        return;
      }

      if (existingRAGSession) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `⚠️ You're currently in a ${existingRAGSession.organisation} session. Please type "CANCEL" to exit that session first.`,
          messageID
        );
        return;
      }

      await this.ragSessionService.createRAGSession(phoneNumber, 'Government', messageID);

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

  /**
   * Handle farmer support - matches unrefactored handleFarmerSupport
   */
  async handleFarmerSupport(phoneNumber: string, messageID: string): Promise<void> {
    try {
      const isHealthy = await this.flaskRagService.healthCheck();
      
      if (!isHealthy) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '⚠️ Agriculture knowledge base service is currently unavailable. Please try again later.',
          messageID
        );
        return;
      }

      const currentSession = await this.sessionManager.getActiveSession(phoneNumber);
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

      const existingRAGSession = await this.ragSessionService.getRAGSession(phoneNumber);
      if (existingRAGSession?.organisation === 'Agriculture') {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `🌾 *Continuing Farmer Support*\n\nYou're already in an Agriculture information session. Ask me anything about farming.`,
          messageID
        );
        return;
      }

      if (existingRAGSession) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `⚠️ You're currently in a ${existingRAGSession.organisation} session. Please type "CANCEL" to exit that session first.`,
          messageID
        );
        return;
      }

      await this.ragSessionService.createRAGSession(phoneNumber, 'Agriculture', messageID);

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

  /**
   * Handle cancel command - matches unrefactored handleCancelCommand
   */
  async handleCancelCommand(phoneNumber: string, messageID: string): Promise<void> {
    try {
      // Clear any pending RAG requests (will be handled by deduplication service)

      const activeSession = await this.sessionManager.getActiveSession(phoneNumber);
      const allActiveSessions = await this.sessionManager.getAllActiveSessions(phoneNumber);

      let cancellationMessage = '';
      let cancelledCount = 0;
      let wasRAGSession = false;
      
      if (activeSession) {
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
              // Will be handled by registration service
              cancellationMessage += '📝 Registration cancelled.\n';
              cancelledCount++;
              break;
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
        if (session.sessionType !== activeSession?.sessionType) {
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
      
      if (cancelledCount > 0 || wasRAGSession) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `✅ *Session Cancelled*\n\n${cancellationMessage}You can now start a new service.`,
          messageID
        );
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

  /**
   * Send welcome message - matches unrefactored sendWelcomeMessage
   */
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

🌾 *ECOFARMER - SMART FARMING*
• Real-time crop health monitoring
• Smart irrigation scheduling
• AI-powered farming insights
• Weather-based recommendations

🏛️ *GOVERNMENT SERVICES*
• Civil registration
• Passport/ID applications
• Social welfare

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

    // Send interactive menu after a delay
    setTimeout(async () => {
      await this.sendMainMenu(phoneNumber, messageID);
    }, 1000);
  }

  /**
   * Send main menu with interactive buttons - matches unrefactored sendMainMenu
   */
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
                  id: 'btn_ecofarmer',
                  title: '🌾ECOFARMER'
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

      return await this.messagingService.sendWhatsappMessage(messageData, messageID);
    } catch (error) {
      this.logger.error('Error sending main menu:', error);
      
      const fallbackMessage = `📱 *MUYAMURI/SEZANI CIVIL PROTECTION MENU* 📱

*Available Commands:*
🚨 EMERGENCY - Report urgent emergencies
📝 REPORT - Report civic issues
🌾 FARMER - Start farmer support
🏛️ GOVERNMENT - Start government related queries
🌾 ECOFARMER - Smart farming assistant
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

  /**
   * Send help message - matches unrefactored sendHelpMessage
   */
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

🌾 *ECOFARMER - SMART FARMING*
• Real-time crop health monitoring
• Smart irrigation scheduling
• AI-powered farming insights
• Weather-based recommendations

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
• "ECOFARMER" - Smart farming Insights
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

  /**
   * Send clarity message - matches unrefactored sendClarityMessage
   */
  async sendClarityMessage(phoneNumber: string, originalMessage: string, messageID: string): Promise<void> {
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

🌾 *ECOFARMER - SMART FARMING*
• Real-time crop health monitoring
• Smart irrigation scheduling
• AI-powered farming insights
• Weather-based recommendations

🏛️ *GOVERNMENT SERVICES*
• Civil registration
• Passport/ID applications
• Social welfare

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

  /**
   * Start emergency reporting - matches unrefactored startEmergencyReporting
   */
  async startEmergencyReporting(phoneNumber: string, messageID: string): Promise<void> {
    try {
      const currentSession = await this.sessionManager.getActiveSession(phoneNumber);
      if (currentSession) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `⚠️ You already have an active ${currentSession.sessionType} session. Please complete it or type "CANCEL" to exit first.`,
          messageID
        );
        return;
      }

      await this.emergencyReportingService.startEmergencyReport(phoneNumber, messageID);
      
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      
      await this.sessionManager.createOrUpdateActiveSession(
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
      
    } catch (error) {
      this.logger.error('Error starting emergency reporting:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Unable to start emergency reporting. Please try again or call emergency services directly.',
        messageID
      );
    }
  }

  /**
   * Start issue reporting - matches unrefactored startIssueReporting
   */
  async startIssueReporting(phoneNumber: string, messageID: string): Promise<void> {
    try {
      const currentSession = await this.sessionManager.getActiveSession(phoneNumber);
      if (currentSession) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `⚠️ You already have an active ${currentSession.sessionType} session. Please complete it or type "CANCEL" to exit first.`,
          messageID
        );
        return;
      }

      await this.issueReportingService.startIssueReport(phoneNumber, messageID);
      
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      
      await this.sessionManager.createOrUpdateActiveSession(
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
      
    } catch (error) {
      this.logger.error('Error starting issue reporting:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Unable to start issue reporting. Please try again.',
        messageID
      );
    }
  }

  /**
   * Handle menu commands - matches unrefactored handleMenuCommand
   */
  private async handleMenuCommand(phoneNumber: string, command: string, originalText: string, messageID: string): Promise<void> {
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
      case 'ECOFARMER':
        await this.ecofarmerService.startEcofarmer(phoneNumber, messageID);
        break;
      case 'REGISTER':
        // Will be handled by registration service
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '📝 *REGISTRATION* 📝\n\nI\'ll help you create your account. Please follow these steps:\n\n*Step 1/9:* What is your First Name?',
          messageID
        );
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
        await this.messagingService.sendTextMessage(
          phoneNumber,
          'ℹ️ You are not in a session that supports back navigation.',
          messageID
        );
        break;
      case 'MY_REPORTS':
        // Will be handled by issue reporting service
        const reports = await this.issueReportingService.getUserReports(phoneNumber, messageID);
        break;
      case 'MY_EMERGENCIES':
        // Will be handled by emergency reporting service
        const emergencies = await this.emergencyReportingService.getUserEmergencyReports(phoneNumber, messageID);
        break;
      case 'HELP':
        await this.sendHelpMessage(phoneNumber, messageID);
        break;
      case 'MENU':
        await this.sendMainMenu(phoneNumber, messageID);
        break;
      case 'EDIT':
        // Will be handled by edit session service
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '📝 *EDIT REPORTS* 📝\n\nChoose report type to edit:\n\n• Type "EMERGENCY" for emergency reports\n• Type "ISSUE" for issue reports\n\nOr type "CANCEL" to exit.',
          messageID
        );
        break;
      case 'EDIT_REPORT':
        // Will be handled by edit session service
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
      default:
        await this.sendWelcomeMessage(phoneNumber, messageID);
    }
  }

  /**
   * Handle login command - matches unrefactored handleLoginCommand
   */
  private async handleLoginCommand(phoneNumber: string, text: string, messageID: string): Promise<void> {
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
    // Auth logic will be handled by auth service
    await this.messagingService.sendTextMessage(
      phoneNumber,
      '🔐 Login functionality will be handled by the auth service.',
      messageID
    );
  }

  /**
   * Handle logout command - matches unrefactored handleLogoutCommand
   */
  private async handleLogoutCommand(phoneNumber: string, messageID: string): Promise<void> {
    await this.sessionManager.removeLoginSession(phoneNumber);
    await this.messagingService.sendTextMessage(
      phoneNumber,
      '✅ You have been logged out successfully.',
      messageID
    );
    await this.sendWelcomeMessage(phoneNumber, messageID);
  }

  /**
   * Handle status command - matches unrefactored handleStatusCommand
   */
  private async handleStatusCommand(phoneNumber: string, messageID: string): Promise<void> {
    await this.messagingService.sendTextMessage(
      phoneNumber,
      '📊 Status check functionality will be handled by the reporting services.',
      messageID
    );
  }

  /**
   * Handle status query - matches unrefactored handleStatusQuery
   */
  private async handleStatusQuery(phoneNumber: string, text: string, messageID: string): Promise<void> {
    await this.messagingService.sendTextMessage(
      phoneNumber,
      '📊 Status query functionality will be handled by the reporting services.',
      messageID
    );
  }

  /**
   * Handle verification command - matches unrefactored handleVerificationCommand
   */
  private async handleVerificationCommand(phoneNumber: string, messageID: string): Promise<void> {
    await this.messagingService.sendTextMessage(
      phoneNumber,
      '⚠️ Verification functionality will be handled by the reporting services.',
      messageID
    );
  }

  /**
   * Check if text is cancel command - matches unrefactored isCancelCommand
   */
  private isCancelCommand(text: string): boolean {
    const normalizedText = text.toLowerCase().trim();
    return normalizedText === 'cancel' || 
          normalizedText === 'stop' || 
          normalizedText === 'exit' || 
          normalizedText === 'abort' ||
          normalizedText === 'quit'||
          normalizedText === 'x';
  }

  /**
   * Check if text is basic query - matches unrefactored isBasicQuery
   */
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
      'would you',

      // Ecofarmer related
      'ecofarmer',
      'farming advice',
      'crop health',
      'irrigation advice',
      'what is agromate',
      'how does agromate work'
    ];

    if (text.endsWith('?')) {
      return true;
    }

    return basicQueries.some(query => text.includes(query));
  }

  /**
   * Check if text is salutation - matches unrefactored isSalutation
   */
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

  /**
   * Detect menu command from text - matches unrefactored detectMenuCommand
   */
  detectMenuCommand(text: string): string | null {
    const normalizedText = text.trim().toLowerCase();
    const menuCommands: Record<string, string> = {
      '1': 'EMERGENCY',
      '2': 'REPORT',
      '3': 'FARMER',
      '4': 'GOVERNMENT',
      '5': 'MENU',
      '6': 'MY_REPORTS',
      '7': 'MY_EMERGENCIES',
      '8': 'EDIT',
      '9': 'REGISTER',
      '10': 'ECOFARMER',
      '0': 'STATUS',
      'x': 'CANCEL',
      '?': 'HELP',

      'emergency': 'EMERGENCY',
      'report': 'REPORT',
      'farmer': 'FARMER',
      'farming': 'FARMER',
      'agriculture': 'FARMER',
      'government': 'GOVERNMENT',
      'ecofarmer': 'ECOFARMER',
      'eco farmer': 'ECOFARMER',
      'eco_farmer': 'ECOFARMER',
      'smart farming': 'ECOFARMER',
      'crop advisor': 'ECOFARMER',
      'irrigation': 'ECOFARMER',
      'gvt': 'GOVERNMENT',
      'govt': 'GOVERNMENT',
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
      'back': 'BACK'
    };

    if (menuCommands[normalizedText]) {
      return menuCommands[normalizedText];
    }

    if (text.length === 1) {
      const singleChar = text.charAt(0);
      if (singleChar === 'X' || singleChar === 'x') return 'CANCEL';
      if (singleChar === '?') return 'HELP';
      if (singleChar >= '0' && singleChar <= '9') {
        return menuCommands[singleChar] || null;
      }
    }

    // Check for two-digit commands like '10'
    if (text.length === 2 && /^\d{2}$/.test(text)) {
      const twoDigitCommand = text;
      if (menuCommands[twoDigitCommand]) {
        return menuCommands[twoDigitCommand];
      }
    }

    // Check for patterns like "10" in the normalized text
    if (normalizedText === '10') {
      return 'ECOFARMER';
    }

    if (normalizedText.includes('issue')) return 'ISSUE';
    if (normalizedText.includes('emergency')) return 'EMERGENCY';
    if (normalizedText.includes('report')) return 'REPORT';
    if (normalizedText.includes('farmer') || normalizedText.includes('farm') || normalizedText.includes('agriculture')) return 'FARMER';
    if (normalizedText.includes('government') || normalizedText.includes('gvt') || normalizedText.includes('govt')) return 'GOVERNMENT';
    if (normalizedText.includes('menu')) return 'MENU';
    if (normalizedText.includes('my reports') || normalizedText.includes('myreports')) return 'MY_REPORTS';
    if (normalizedText.includes('my emergencies') || normalizedText.includes('myemergencies')) return 'MY_EMERGENCIES';
    if (normalizedText.includes('edit')) return 'EDIT';
    if (normalizedText.includes('register')) return 'REGISTER';
    if (normalizedText.includes('status')) return 'STATUS';
    if (normalizedText.includes('cancel')) return 'CANCEL';
    if (normalizedText.includes('help')) return 'HELP';
    
    if (normalizedText.startsWith('edit ')) {
      const parts = normalizedText.split(' ');
      if (parts.length >= 2) {
        return 'EDIT_REPORT';
      }
      return 'EDIT';
    }

    return null;
  }
}