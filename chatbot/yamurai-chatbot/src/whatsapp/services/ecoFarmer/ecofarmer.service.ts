// src/whatsapp/services/ecofarmer/ecofarmer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MessagingService } from '../messaging/messaging.service';
import { FieldContextService } from '../field-context/field-context.service';
import { SessionManagerService } from '../session-manager.service';
import { SessionType } from '../../../database/session.entity';

export interface FarmMapping {
  name: string;
  id: string;
}

export interface EcoFarmerSessionData {
  fieldId?: string;
  fieldName?: string;
  conversationId?: string;
  fieldContext?: any;
  farms?: FarmMapping[];  // Store available farms for the user
  startedAt: Date;
  messageId?: string;
  lastActivity?: Date;
}

@Injectable()
export class EcoFarmerService {
  private readonly logger = new Logger(EcoFarmerService.name);
  
  // In-memory session tracking
  private readonly currentSessions = new Map<string, {
    sessionId: string;
    sessionType: SessionType;
    expiresAt: Date;
  }>();

  // Predefined farm mappings (in production, fetch from database)
  private readonly farmMappings: FarmMapping[] = [
    { name: "Block 0", id: "ab8fd93b-4267-43ef-a03b-5b48fe4ebb17" },
    { name: "Block 1", id: "ab8fd93b-4267-43ef-a03b-5b48fe4ebb17" },
  ];

  constructor(
    private readonly messagingService: MessagingService,
    private readonly fieldContextService: FieldContextService,
    private readonly sessionManager: SessionManagerService,
  ) {}

  private async setCurrentSession(phoneNumber: string, sessionId: string, sessionType: SessionType, expiresAt: Date): Promise<void> {
    this.currentSessions.set(phoneNumber, { sessionId, sessionType, expiresAt });
  }

  private async clearCurrentSession(phoneNumber: string): Promise<void> {
    this.currentSessions.delete(phoneNumber);
  }

  /**
   * Get farms for a user (in production, fetch from database)
   */
  async getUserFarms(phoneNumber: string): Promise<FarmMapping[]> {
    // In production, you would fetch from a database based on user's phone number
    // For now, return all predefined farms
    return this.farmMappings;
  }

  /**
   * Start ECOFARMER AI - Show farm selection
   */
  async startEcofarmer(phoneNumber: string, messageId: string): Promise<void> {
    try {
      // Check for existing session
      const existingSession = await this.sessionManager.getActiveSession(phoneNumber, SessionType.AGROMATE);
      if (existingSession) {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `🌾 *Continuing AGROMATE AI Session*\n\nYou're already in an AGROMATE session. Type "CANCEL" to exit or continue with your questions.`,
          messageId,
        );
        return;
      }

      // Get user's farms
      const farms = await this.getUserFarms(phoneNumber);

      // Create new session
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      const sessionData: EcoFarmerSessionData = {
        farms,
        startedAt: new Date(),
        messageId,
      };

      const activeSession = await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.AGROMATE,
        1,
        sessionData,
        messageId,
        expiresAt,
      );

      await this.setCurrentSession(phoneNumber, activeSession.id.toString(), SessionType.AGROMATE, expiresAt);

      // Send farm selection message
      const farmSelectionMessage = this.formatFarmSelectionMessage(farms);
      await this.messagingService.sendTextMessage(phoneNumber, farmSelectionMessage, messageId);
      
    } catch (error) {
      this.logger.error('Error starting AGROMATE:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error starting AGROMATE AI service. Please try again.',
        messageId,
      );
    }
  }

  /**
   * Format farm selection message
   */
  private formatFarmSelectionMessage(farms: FarmMapping[]): string {
    let message = `🌾 *AGROMATE AI - SMART FARMING ASSISTANT* 🌾\n\n`;
    message += `Welcome to Agromate, your AI-powered farming advisor! I can help you with:\n\n`;
    message += `• 📊 *Real-time crop health monitoring* (NDVI analysis)\n`;
    message += `• 💧 *Smart irrigation scheduling* (precise water management)\n`;
    message += `• 🌱 *Crop growth stage analysis* (BBCH scale tracking)\n`;
    message += `• 🌤️ *Weather-based recommendations* (7-day forecasts)\n`;
    message += `• 🚨 *Early warning alerts* (pests, diseases, weather risks)\n`;
    message += `• 📈 *Performance insights* (yield predictions, efficiency metrics)\n\n`;
    message += `*Select your farm:*\n\n`;
    
    farms.forEach((farm, index) => {
      message += `${index + 1}. *${farm.name}*\n`;
    });
    
    message += `\n*How to use:*\n`;
    message += `• Type the farm number (e.g., "1")\n`;
    message += `• Or type the farm name (e.g., "${farms[0].name}")\n\n`;
    message += `*Commands:*\n`;
    message += `• Type "CANCEL" to exit\n`;
    message += `• Type "HELP" for assistance\n\n`;
    message += `Please select your farm:`;
    
    return message;
  }

  /**
   * Handle ECOFARMER messages
   */
  async handleEcoFarmerMessage(phoneNumber: string, text: string, messageId: string): Promise<void> {
    try {
      const session = await this.sessionManager.getActiveSession(phoneNumber, SessionType.AGROMATE);
      
      if (!session) {
        await this.startEcofarmer(phoneNumber, messageId);
        return;
      }

      const sessionData: EcoFarmerSessionData = session.sessionData
        ? typeof session.sessionData === 'string'
          ? JSON.parse(session.sessionData)
          : session.sessionData
        : { startedAt: new Date(), farms: [] };

      const normalizedText = text.toLowerCase().trim();

      // Handle commands
      if (normalizedText === 'cancel') {
        await this.clearCurrentSession(phoneNumber);
        await this.sessionManager.cancelSession(phoneNumber, SessionType.AGROMATE);
        await this.messagingService.sendTextMessage(
          phoneNumber,
          '❌ AGROMATE AI session ended. Type "AGROMATE" to start again.',
          messageId,
        );
        return;
      }

      if (normalizedText === 'help') {
        await this.sendHelpMessage(phoneNumber, messageId);
        return;
      }

      // If no field selected yet, handle as farm selection
      if (!sessionData.fieldId) {
        await this.handleFarmSelection(phoneNumber, text, sessionData, messageId);
        return;
      }

      // If field selected, handle as query
      await this.handleIrrigationQuery(phoneNumber, text, sessionData, messageId);

    } catch (error) {
      this.logger.error('Error handling AGROMATE message:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error processing your request. Please try again.',
        messageId,
      );
    }
  }

  /**
   * Handle farm selection (by number or name)
   */
  private async handleFarmSelection(
    phoneNumber: string,
    text: string,
    sessionData: EcoFarmerSessionData,
    messageId: string
  ): Promise<void> {
    const farms = sessionData.farms || [];
    
    if (farms.length === 0) {
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ No farms found in your account.\n\nPlease contact your administrator.\n\nType "CANCEL" to exit.',
        messageId,
      );
      return;
    }

    // Try to parse as number (1-indexed)
    const numberMatch = text.match(/^\d+$/);
    let selectedFarm: FarmMapping | undefined;

    if (numberMatch) {
      const index = parseInt(numberMatch[0]) - 1;
      if (index >= 0 && index < farms.length) {
        selectedFarm = farms[index];
      }
    } else {
      // Try to match by name (case-insensitive)
      const searchName = text.toLowerCase();
      selectedFarm = farms.find(f => 
        f.name.toLowerCase() === searchName || 
        f.name.toLowerCase().includes(searchName)
      );
    }

    if (!selectedFarm) {
      // Show available farms again
      const farmList = farms.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `❌ Farm "${text}" not found.\n\n*Available farms:*\n${farmList}\n\n` +
        `Please select by number (1-${farms.length}) or farm name.\n\n` +
        `Type "CANCEL" to exit.`,
        messageId,
      );
      return;
    }

    // Show loading message
    await this.messagingService.sendTextMessage(
      phoneNumber,
      `✅ *Selected Farm:* ${selectedFarm.name}\n\n` +
      `🔍 Fetching field data...\n⏳ This may take a moment.`,
      messageId,
    );
    
    try {
      // Fetch field context using the mapped field ID
      const context = await this.fieldContextService.getFieldContext(selectedFarm.id);
      
      // Update session with field data
      const updatedSessionData = {
        ...sessionData,
        fieldId: selectedFarm.id,
        fieldName: selectedFarm.name,
        fieldContext: context,
      };

      await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.AGROMATE,
        2,
        updatedSessionData,
        messageId,
      );

      // Format and send field context
      const contextMessage = this.fieldContextService.formatFieldContextForWhatsApp(context);
      await this.messagingService.sendTextMessage(phoneNumber, contextMessage, messageId);

      // Ask for questions
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `💡 *What would you like to know about ${selectedFarm.name}?*\n\n` +
        `• "Should I irrigate today?"\n` +
        `• "What's the crop water requirement?"\n` +
        `• "When should I irrigate next?"\n` +
        `• "Any weather alerts for my field?"\n` +
        `• "How is my crop health?"\n` +
        `• "What's the yield forecast?"\n\n` +
        `Ask any farming question about this field.\n\n` +
        `Type "CANCEL" to exit AGROMATE AI.`,
        messageId,
      );
      
    } catch (error:any) {
      this.logger.error('Error fetching field context:', error);
      
      const errorMessage = this.fieldContextService.formatErrorMessage(
        error.message || 'Failed to fetch field data. Please try again.'
      );
      await this.messagingService.sendTextMessage(phoneNumber, errorMessage, messageId);
    }
  }

  /**
   * Handle irrigation query
   */
  private async handleIrrigationQuery(
    phoneNumber: string,
    query: string,
    sessionData: EcoFarmerSessionData,
    messageId: string
  ): Promise<void> {
    try {
      // Show thinking message
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `🤔 *AGROMATE AI Analyzing*\n\nAnalyzing your question about *${sessionData.fieldName}*...\n⏳ Consulting irrigation AI...`,
        messageId,
      );

      // Call the irrigation orchestrator with the mapped field ID
      const response = await this.fieldContextService.askIrrigationAssistant(
        sessionData.fieldId!,
        query,
        sessionData.conversationId,
        phoneNumber // Use phone number as user ID
      );

      // Store conversation ID for follow-up
      if (response.conversation_id) {
        const updatedSessionData = {
          ...sessionData,
          conversationId: response.conversation_id,
        };
        await this.sessionManager.createOrUpdateActiveSession(
          phoneNumber,
          SessionType.AGROMATE,
          3,
          updatedSessionData,
          messageId,
        );
      }

      // Format and send response
      const formattedResponse = this.fieldContextService.formatAssistantResponse(response);
      await this.messagingService.sendTextMessage(phoneNumber, formattedResponse, messageId);

    } catch (error:any) {
      this.logger.error('Error handling irrigation query:', error);
      
      const errorMessage = this.fieldContextService.formatErrorMessage(
        error.message || 'Failed to get irrigation recommendation. Please try again.'
      );
      await this.messagingService.sendTextMessage(phoneNumber, errorMessage, messageId);
    }
  }

  /**
   * Send help message
   */
  private async sendHelpMessage(phoneNumber: string, messageId: string): Promise<void> {
    const helpMessage = `🆘 *AGROMATE AI - HELP* 🆘

*What is AGROMATE AI?*
AGROMATE AI is your intelligent farming assistant powered by AI. It provides:

• 📊 *Real-time crop health monitoring*
• 💧 *Smart irrigation scheduling*
• 🌱 *Crop growth stage analysis*
• 🌤️ *Weather-based recommendations*
• 🚨 *Early warning alerts*
• 📈 *Performance insights*

*How to use:*
1. Type "AGROMATE" to start
2. Select your farm from the list (by number or name)
3. Ask any farming question
4. Get AI-powered recommendations

*Example questions:*
• "Should I irrigate today?"
• "What's the crop water requirement?"
• "When should I irrigate next?"
• "Any weather alerts for my field?"
• "How is my crop health?"

*Commands:*
• "CANCEL" - Exit current session
• "HELP" - Show this help

Start by typing "AGROMATE"! 🌾`;

    await this.messagingService.sendTextMessage(phoneNumber, helpMessage, messageId);
  }
}