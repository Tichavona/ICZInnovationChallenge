import { Injectable, Logger } from '@nestjs/common';
import { MessagingService } from '../messaging/messaging.service';
import { DeduplicationService } from '../utils/deduplication.service';
import { RAGOrganisation } from '../interfaces/webhook.interface';

@Injectable()
export class RAGTimeoutService {
  private readonly logger = new Logger(RAGTimeoutService.name);
  private readonly RAG_TIMEOUT = 900000; // 15 minutes

  constructor(
    private readonly messagingService: MessagingService,
    private readonly deduplicationService: DeduplicationService,
  ) {}

  /**
   * Create timeout handler for RAG request
   */
  createTimeoutHandler(
    phoneNumber: string,
    organisation: RAGOrganisation,
    messageID: string
  ): () => void {
    return () => {
      this.logger.warn(`RAG request timeout for ${phoneNumber} (${organisation}) after ${this.RAG_TIMEOUT}ms`);
      this.deduplicationService.clearRAGRequest(phoneNumber, organisation);
      
      this.messagingService.sendTextMessage(
        phoneNumber,
        `⏱️ The ${organisation} knowledge base is taking longer than expected to respond. Please try again in a few moments.`,
        messageID
      ).catch(err => this.logger.error('Error sending timeout message:', err));
    };
  }
} 
