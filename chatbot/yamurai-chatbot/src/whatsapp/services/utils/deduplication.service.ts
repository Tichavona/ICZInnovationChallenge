import { Injectable, Logger } from '@nestjs/common';

export interface PendingRAGRequest {
  promise: Promise<void>;
  timeout: NodeJS.Timeout;
  startTime: number;
  messageId: string;
  organisation: string;
  query: string;
}

@Injectable()
export class DeduplicationService {
  private readonly logger = new Logger(DeduplicationService.name);
  
  // Track processed message IDs with timestamp
  private readonly processedMessages = new Map<string, number>();
  private readonly MESSAGE_DEDUP_TTL = 300000; // 5 minutes
  
  // Track messages that are currently being processed
  private readonly processingMessages = new Set<string>();
  
  // Track duplicate queries within the same session
  private readonly recentUserQueries = new Map<string, { 
    query: string; 
    timestamp: number;
    messageId: string;
  }>();
  private readonly QUERY_DEDUP_TTL = 10000; // 10 seconds
  
  // Track pending RAG requests
  private readonly pendingRAGRequests = new Map<string, PendingRAGRequest>();
  private readonly RAG_TIMEOUT = 900000; // 15 minutes
  
  // Track webhook delivery receipts
  private readonly processedStatusUpdates = new Set<string>();

  /**
   * Check if message was already processed
   */
  isMessageProcessed(messageID: string): boolean {
    const now = Date.now();
    
    if (this.processedMessages.has(messageID)) {
      const processedTime = this.processedMessages.get(messageID) || 0;
      
      if (now - processedTime < this.MESSAGE_DEDUP_TTL) {
        this.logger.debug(`Message ${messageID} processed recently, ignoring duplicate`);
        return true;
      } else {
        this.processedMessages.delete(messageID);
      }
    }
    
    return false;
  }

  /**
   * Mark message as processed
   */
  markMessageAsProcessed(messageID: string): void {
    this.processedMessages.set(messageID, Date.now());
  }

  /**
   * Check if message is currently being processed
   */
  isMessageProcessing(messageID: string): boolean {
    return this.processingMessages.has(messageID);
  }

  /**
   * Mark message as processing
   */
  startProcessing(messageID: string): void {
    this.processingMessages.add(messageID);
  }

  /**
   * Mark message as done processing
   */
  finishProcessing(messageID: string): void {
    this.processingMessages.delete(messageID);
  }

  /**
   * Check if status update was already processed
   */
  isStatusUpdateProcessed(statusId: string): boolean {
    return this.processedStatusUpdates.has(statusId);
  }

  /**
   * Mark status update as processed
   */
  markStatusUpdateProcessed(statusId: string): void {
    this.processedStatusUpdates.add(statusId);
  }

  /**
   * Check for duplicate user query
   */
  isDuplicateQuery(phoneNumber: string, organisation: string, query: string): boolean {
    const key = `${phoneNumber}:${organisation}`;
    const lastQuery = this.recentUserQueries.get(key);
    
    if (lastQuery && 
        lastQuery.query === query && 
        (Date.now() - lastQuery.timestamp) < this.QUERY_DEDUP_TTL) {
      return true;
    }
    
    // Update last query
    this.recentUserQueries.set(key, {
      query,
      timestamp: Date.now(),
      messageId: `${Date.now()}`
    });
    
    return false;
  }

  /**
   * Check if RAG request is pending
   */
  hasPendingRAGRequest(phoneNumber: string, organisation: string): boolean {
    const key = `${phoneNumber}:${organisation}`;
    return this.pendingRAGRequests.has(key);
  }

  /**
   * Register pending RAG request
   */
  registerRAGRequest(
    phoneNumber: string, 
    organisation: string,
    messageId: string,
    promise: Promise<void>,
    query: string,
    timeoutCallback: () => void
  ): void {
    const key = `${phoneNumber}:${organisation}`;
    
    // Clear any existing
    this.clearRAGRequest(phoneNumber, organisation);
    
    const timeout = setTimeout(timeoutCallback, this.RAG_TIMEOUT);
    
    this.pendingRAGRequests.set(key, {
      promise,
      timeout,
      startTime: Date.now(),
      messageId,
      organisation,
      query
    });
  }

  /**
   * Clear RAG request
   */
  clearRAGRequest(phoneNumber: string, organisation: string): void {
    const key = `${phoneNumber}:${organisation}`;
    const pending = this.pendingRAGRequests.get(key);
    
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRAGRequests.delete(key);
      this.logger.debug(`Cleared RAG request for ${phoneNumber} (${organisation})`);
    }
  }

  /**
   * Clean up old data
   */
  cleanupOldData(): void {
    const now = Date.now();
    
    // Clean up processed messages
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

    // Limit status updates set size
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
  }
} 
