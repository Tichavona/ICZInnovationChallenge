import { Injectable, Logger } from '@nestjs/common';
import { SessionManagerService } from '../session-manager.service';
import { MessagingService } from './messaging.service';
import { DeduplicationService } from '../utils/deduplication.service';
import { RAGSessionService } from '../rag/rag-session.service';
import { RAGQueryService } from '../rag/rag-query.service';
import { RAGTimeoutService } from '../rag/rag-timeout.service';
import { MenuCommandService } from '../menu/menu-command.service';
import { SessionType } from '../../../database/session.entity';
import { WebhookPayload } from '../interfaces/webhook.interface';
import { EcoFarmerService } from '../ecoFarmer/ecofarmer.service';

@Injectable()
export class MessageHandlerService {
  private readonly logger = new Logger(MessageHandlerService.name);

  constructor(
    private readonly sessionManager: SessionManagerService,
    private readonly messagingService: MessagingService,
    private readonly deduplicationService: DeduplicationService,
    private readonly ragSessionService: RAGSessionService,
    private readonly ragQueryService: RAGQueryService,
    private readonly ragTimeoutService: RAGTimeoutService,
    private readonly menuCommandService: MenuCommandService,
    private readonly ecofarmerService: EcoFarmerService,
  ) {}

  /**
   * Main message handler
   */
  async handleIncomingMessage(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.debug('Received webhook payload');
      
      const changes = payload?.entry?.[0]?.changes?.[0]?.value;
      
      if (!changes) {
        this.logger.warn('No changes found in webhook payload');
        return;
      }

      // Handle status updates
      if (await this.handleStatusUpdates(changes)) {
        return;
      }

      // Extract message data
      const { message, messageID, messageSender } = await this.extractMessage(changes);
      
      if (!message || !messageID || !messageSender) {
        this.logger.warn('Failed to extract valid message from payload');
        return;
      }

      // Deduplication checks
      if (await this.shouldIgnoreMessage(messageID, messageSender)) {
        return;
      }

      // Process message
      await this.processMessage(messageSender, message, messageID);

    } catch (error) {
      this.logger.error('Error handling incoming message:', error);
    }
  }

  /**
   * Handle status updates (sent, delivered, read)
   */
  private async handleStatusUpdates(changes: any): Promise<boolean> {
    if (changes.statuses && changes.statuses.length > 0) {
      changes.statuses.forEach(status => {
        if (status.id) {
          this.deduplicationService.markStatusUpdateProcessed(status.id);
        }
      });
      this.logger.debug(`Ignored ${changes.statuses.length} status update(s)`);
      return true;
    }
    return false;
  }

  /**
   * Extract message from payload
   */
  private async extractMessage(changes: any): Promise<{ message: any; messageID: string; messageSender: string }> {
    const messages = changes.messages;
    const interactive = changes.interactive;
    const messageFromMetadata = changes.message;
    
    let messageID = '';
    let messageSender = '';
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
    }

    return { message, messageID, messageSender };
  }

  /**
   * Check if message should be ignored (duplicate, etc.)
   */
  private async shouldIgnoreMessage(messageID: string, phoneNumber: string): Promise<boolean> {
    // Check if already processed as status update
    if (this.deduplicationService.isStatusUpdateProcessed(messageID)) {
      this.logger.debug(`Message ${messageID} already processed as status update`);
      return true;
    }

    // Check if currently processing
    if (this.deduplicationService.isMessageProcessing(messageID)) {
      this.logger.warn(`Message ${messageID} is already being processed`);
      return true;
    }

    // Check if processed recently
    if (this.deduplicationService.isMessageProcessed(messageID)) {
      this.logger.log(`Duplicate message ${messageID} ignored`);
      return true;
    }

    // Mark as processing
    this.deduplicationService.startProcessing(messageID);
    
    // Mark as read
    if (!messageID.startsWith('interactive_')) {
      await this.messagingService.markMessageAsRead(messageID);
    }

    return false;
  }

  /**
   * Process the actual message
   */
  private async processMessage(phoneNumber: string, message: any, messageID: string): Promise<void> {
    try {
      this.logger.log(`Processing message from ${phoneNumber}, type: ${message.type}, ID: ${messageID}`);
      
      // Route to appropriate handler based on session and message type
      await this.routeMessage(phoneNumber, message, messageID);
      
      // Mark as successfully processed
      this.deduplicationService.markMessageAsProcessed(messageID);
      
    } catch (error) {
      this.logger.error(`Error processing message ${messageID}:`, error);
    } finally {
      this.deduplicationService.finishProcessing(messageID);
    }
  }

  /**
   * Route message to appropriate handler
   */
  private async routeMessage(phoneNumber: string, message: any, messageID: string): Promise<void> {
    // Interactive messages
    if (message.type === 'interactive') {
      await this.menuCommandService.handleInteractiveMessage(phoneNumber, message, messageID);
      return;
    }

    const ecofarmerSession = await this.sessionManager.getActiveSession(phoneNumber, SessionType.AGROMATE);
    if (ecofarmerSession) {
      if (message.type === 'text') {
        const text = message.text?.body?.trim();
        if (text) {
          await this.ecofarmerService.handleEcoFarmerMessage(phoneNumber, text, messageID);
        } else {
          await this.messagingService.sendTextMessage(
            phoneNumber,
            'Please send a text message. Type "CANCEL" to exit Ecofarmer.',
            messageID,
          );
        }
      }
    }

    // Check for edit session
    const editSession = await this.sessionManager.getActiveSession(phoneNumber, SessionType.EDIT_FEEDBACK);
    if (editSession) {
      this.logger.log(`User ${phoneNumber} in edit session`);
      // TODO: Route to edit handler
      return;
    }

    // Check for RAG session
    const ragSession = await this.ragSessionService.getRAGSession(phoneNumber);
    if (ragSession && message.type === 'text') {
      await this.handleRAGMessage(phoneNumber, message, ragSession.organisation, messageID);
      return;
    }

    // Check for other guided sessions
    const hasActiveSession = await this.sessionManager.hasActiveGuidedSession(phoneNumber);
    if (hasActiveSession) {
      this.logger.log(`User ${phoneNumber} has active guided session`);
      // TODO: Route to session handler
      return;
    }

    // Text messages
    if (message.type === 'text') {
      await this.menuCommandService.handleTextMessage(phoneNumber, message, messageID);
      return;
    }

    // Default: show welcome message
    await this.menuCommandService.sendWelcomeMessage(phoneNumber, messageID);
  }

  /**
   * Handle RAG session messages
   */
  private async handleRAGMessage(
    phoneNumber: string,
    message: any,
    organisation: any,
    messageID: string
  ): Promise<void> {
    const text = message.text?.body?.trim();
    if (!text) return;

    const menuCommand = this.menuCommandService.detectMenuCommand(text.toLowerCase().trim());
    
    // Handle cancel command
    if (menuCommand === 'CANCEL') {
      this.deduplicationService.clearRAGRequest(phoneNumber, organisation);
      await this.menuCommandService.handleCancelCommand(phoneNumber, messageID);
      return;
    }
    
    // Handle other commands - require cancel first
    if (menuCommand) {
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `⚠️ You're currently in a ${organisation} session. Please type "CANCEL" to exit this session first.`,
        messageID
      );
      return;
    }

    // Check for duplicate query
    if (this.deduplicationService.isDuplicateQuery(phoneNumber, organisation, text)) {
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `⏳ Your previous query is still being processed. Please wait for the response.`,
        messageID
      );
      return;
    }

    // Check for pending request
    if (this.deduplicationService.hasPendingRAGRequest(phoneNumber, organisation)) {
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `⏳ Your previous ${organisation} query is still being processed. Please wait.`,
        messageID
      );
      return;
    }

    this.logger.log(`User ${phoneNumber} in ${organisation} session, handling query: "${text.substring(0, 50)}..."`);
    
    // Execute RAG query with timeout handling
    const ragPromise = this.ragQueryService.handleQuery(phoneNumber, text, organisation, messageID);
    
    const timeoutHandler = this.ragTimeoutService.createTimeoutHandler(phoneNumber, organisation, messageID);
    
    this.deduplicationService.registerRAGRequest(
      phoneNumber,
      organisation,
      messageID,
      ragPromise,
      text,
      timeoutHandler
    );
    
    try {
      await ragPromise;
    } finally {
      this.deduplicationService.clearRAGRequest(phoneNumber, organisation);
    }
  }
} 
