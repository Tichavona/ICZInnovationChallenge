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
import { SessionManagerService } from '../services/session-manager.service';
import { MessagingService } from '../services/messaging/messaging.service';
import { SessionType } from '../../database/session.entity';
import { EcoFarmerService } from '../services/ecoFarmer/ecofarmer.service';

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

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly API_TIMEOUT = 15000;

  // Track processed message IDs with timestamp
  private readonly processedMessages = new Map<string, number>();
  private readonly MESSAGE_DEDUP_TTL = 300000; // 5 minutes
  
  // Track messages that are currently being processed
  private readonly processingMessages = new Set<string>();
  
  // Track webhook delivery receipts to ignore them
  private readonly processedStatusUpdates = new Set<string>();
  
  // Track current session ID for each user
  private readonly currentUserSessions = new Map<string, {
    sessionId: string;
    sessionType: SessionType;
    expiresAt: Date;
  }>();

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private readonly sessionManager: SessionManagerService,
    private readonly messagingService: MessagingService,
    private readonly ecofarmerService: EcoFarmerService,
  ) {}

  getTestMessage(): string {
    return 'ECOFARMER AI - Smart Farming Assistant';
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
      this.logger.debug('Received webhook payload');
      
      const changes = payload?.entry?.[0]?.changes?.[0]?.value;
      
      if (!changes) {
        this.logger.warn('No changes found in webhook payload');
        return;
      }

      // IGNORE ALL STATUS UPDATES
      if (changes.statuses && changes.statuses.length > 0) {
        const statusIds = changes.statuses.map(s => s.id).join(', ');
        this.logger.debug(`Ignoring ${changes.statuses.length} status update(s)`);
        
        changes.statuses.forEach(status => {
          if (status.id) {
            this.processedStatusUpdates.add(status.id);
          }
        });
        return;
      }

      // EXTRACT MESSAGE DATA
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

      // MESSAGE DEDUPLICATION CHECKS
      if (this.processedStatusUpdates.has(messageID)) {
        this.logger.debug(`Message ${messageID} already processed as status update, ignoring`);
        return;
      }

      if (this.processingMessages.has(messageID)) {
        this.logger.warn(`Message ${messageID} is already being processed, ignoring duplicate`);
        return;
      }

      if (this.processedMessages.has(messageID)) {
        const processedTime = this.processedMessages.get(messageID) || 0;
        const age = Date.now() - processedTime;
        
        if (age < this.MESSAGE_DEDUP_TTL) {
          this.logger.log(`Duplicate message ${messageID} ignored (processed ${age}ms ago)`);
          return;
        } else {
          this.processedMessages.delete(messageID);
        }
      }

      this.processingMessages.add(messageID);

      try {
        if (messageID && !messageID.startsWith('interactive_') && message.type !== 'interactive') {
          await this.markMessageAsRead(messageID);
        }
        
        this.logger.log(`Processing message from ${messageSender}, type: ${message.type}, ID: ${messageID}`);
        
        await this.processMessageFlow(messageSender, message, messageID);
        
        this.processedMessages.set(messageID, Date.now());
        
      } catch (error) {
        this.logger.error(`Error processing message ${messageID}:`, error);
      } finally {
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

  private async processMessageFlow(phoneNumber: string, message: any, messageID: string): Promise<void> {
    try {
      // Handle interactive button messages
      if (message.type === 'interactive') {
        const handled = await this.handleInteractiveMessage(phoneNumber, message, messageID);
        if (handled) return;
      }

      // Check for ECOFARMER session
      const ecofarmerSession = await this.sessionManager.getActiveSession(phoneNumber, SessionType.AGROMATE);
      if (ecofarmerSession) {
        this.logger.log(`User ${phoneNumber} is in ECOFARMER session`);
        if (message.type === 'text') {
          const text = message.text?.body?.trim();
          if (text) {
            await this.ecofarmerService.handleEcoFarmerMessage(phoneNumber, text, messageID);
          } else {
            await this.messagingService.sendTextMessage(
              phoneNumber,
              'Please send a text message. Type "CANCEL" to exit ECOFARMER AI.',
              messageID
            );
          }
        } else {
          await this.messagingService.sendTextMessage(
            phoneNumber,
            'Please send text messages for ECOFARMER AI commands. Type "CANCEL" to exit.',
            messageID
          );
        }
        return;
      }

      // Handle text messages
      if (message.type === 'text') {
        const text = message.text?.body?.trim();
        if (!text) return;

        const normalizedText = text.toLowerCase().trim();

        // Check for cancel command
        if (this.isCancelCommand(normalizedText)) {
          await this.handleCancelCommand(phoneNumber, messageID);
          return;
        }

        // Check for menu commands
        const menuCommand = this.detectMenuCommand(normalizedText);
        if (menuCommand) {
          await this.handleMenuCommand(phoneNumber, menuCommand, text, messageID);
          return;
        }

        // Default: start ECOFARMER AI
        await this.ecofarmerService.startEcofarmer(phoneNumber, messageID);
        return;
      }

      // Default fallback
      await this.ecofarmerService.startEcofarmer(phoneNumber, messageID);

    } catch (error) {
      this.logger.error('Error processing message flow:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        'Sorry, I encountered an error. Please try again.',
        messageID
      );
    }
  }

  private async handleInteractiveMessage(phoneNumber: string, message: any, messageID: string): Promise<boolean> {
    try {
      if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
        const buttonId = message.interactive.button_reply?.id;
        
        this.logger.log(`Interactive button clicked: ${buttonId} by ${phoneNumber}`);

        const currentSession = await this.getCurrentSession(phoneNumber);

        if (currentSession && currentSession.sessionType !== SessionType.AGROMATE) {
          await this.messagingService.sendTextMessage(
            phoneNumber,
            `⚠️ You already have an active session. Please complete it or type "CANCEL" to exit first.`,
            messageID
          );
          return true;
        }
        
        switch (buttonId) {
          case 'btn_ecofarmer':
            await this.ecofarmerService.startEcofarmer(phoneNumber, messageID);
            return true;
          case 'btn_cancel':
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

  private detectMenuCommand(text: string): string | null {
    const normalizedText = text.trim().toLowerCase();
    
    const exactCommands: { [key: string]: string } = {
      '1': 'ECOFARMER',
      '2': 'ECOFARMER',
      '3': 'ECOFARMER',
      '4': 'ECOFARMER',
      '5': 'ECOFARMER',
      '6': 'ECOFARMER',
      '7': 'ECOFARMER',
      '8': 'ECOFARMER',
      '9': 'ECOFARMER',
      '10': 'ECOFARMER',
      '0': 'ECOFARMER',
      'x': 'CANCEL',
      '?': 'HELP',
      
      'ecofarmer': 'ECOFARMER',
      'eco farmer': 'ECOFARMER',
      'smart farming': 'ECOFARMER',
      'farming': 'ECOFARMER',
      'agriculture': 'ECOFARMER',
      'irrigation': 'ECOFARMER',
      'crop advisor': 'ECOFARMER',
      'help': 'HELP',
      'cancel': 'CANCEL',
    };

    if (exactCommands[normalizedText]) {
      return exactCommands[normalizedText];
    }

    if (text.length === 1) {
      const singleChar = text.charAt(0);
      if (singleChar === 'X' || singleChar === 'x') return 'CANCEL';
      if (singleChar === '?') return 'HELP';
    }

    return null;
  }

  private async handleMenuCommand(phoneNumber: string, command: string, originalText: string, messageID: string): Promise<void> {
    switch (command) {
      case 'ECOFARMER':
        await this.ecofarmerService.startEcofarmer(phoneNumber, messageID);
        break;
      case 'CANCEL':
        await this.handleCancelCommand(phoneNumber, messageID);
        break;
      case 'HELP':
        await this.sendHelpMessage(phoneNumber, messageID);
        break;
      default:
        await this.ecofarmerService.startEcofarmer(phoneNumber, messageID);
    }
  }

  private async handleCancelCommand(phoneNumber: string, messageID: string): Promise<void> {
    try {
      await this.clearCurrentSession(phoneNumber);
      await this.sessionManager.cancelSession(phoneNumber, SessionType.AGROMATE);
      
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '✅ ECOFARMER AI session ended.\n\nType "ECOFARMER" or any farming question to start again.',
        messageID
      );
      
      await this.sendWelcomeMessage(phoneNumber, messageID);
    } catch (error) {
      this.logger.error('Error handling cancel command:', error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        '❌ Error cancelling session. Please try again.',
        messageID
      );
    }
  }

  private async sendHelpMessage(phoneNumber: string, messageID: string): Promise<void> {
    const helpMessage = `🆘 *ECOFARMER AI - HELP* 🆘

*What is ECOFARMER AI?*
ECOFARMER AI is your intelligent farming assistant powered by AI. It provides:

• 📊 *Real-time crop health monitoring*
• 💧 *Smart irrigation scheduling*
• 🌱 *Crop growth stage analysis*
• 🌤️ *Weather-based recommendations*
• 🚨 *Early warning alerts*
• 📈 *Performance insights*

*How to use:*
1. Type "ECOFARMER" or any farming question
2. Select your field from the list
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

*Need more help?*
Contact support for assistance.

Start by typing "ECOFARMER" or ask a farming question! 🌾`;

    await this.messagingService.sendTextMessage(phoneNumber, helpMessage, messageID);
  }

  private async sendWelcomeMessage(phoneNumber: string, messageID: string): Promise<void> {
    const welcomeMessage = `🌾 *ECOFARMER AI - SMART FARMING ASSISTANT* 🌾

Welcome to ECOFARMER AI, your intelligent farming companion!

I can help you with:
• 📊 Real-time crop health monitoring
• 💧 Smart irrigation scheduling
• 🌱 Crop growth stage analysis
• 🌤️ Weather-based recommendations
• 🚨 Early warning alerts
• 📈 Performance insights

*To get started:*
Simply type "ECOFARMER" or ask any farming question!

*Example:* "Should I irrigate today?"

Type "HELP" for more information.
Type "CANCEL" to exit at any time.

What would you like to know about your farm? 🌾`;

    await this.messagingService.sendTextMessage(phoneNumber, welcomeMessage, messageID);
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

  public cleanupOldData(): void {
    const now = Date.now();
    for (const [messageId, timestamp] of this.processedMessages.entries()) {
      if (now - timestamp > this.MESSAGE_DEDUP_TTL) {
        this.processedMessages.delete(messageId);
      }
    }

    if (this.processedStatusUpdates.size > 1000) {
      const toDelete = Array.from(this.processedStatusUpdates).slice(0, 500);
      toDelete.forEach(id => this.processedStatusUpdates.delete(id));
    }

    for (const [phoneNumber, session] of this.currentUserSessions.entries()) {
      if (session.expiresAt < new Date()) {
        this.currentUserSessions.delete(phoneNumber);
      }
    }
  }
}