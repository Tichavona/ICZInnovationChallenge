import { Injectable, Logger } from '@nestjs/common';
import { SessionManagerService } from '../session-manager.service';
import { SessionType } from '../../../database/session.entity';
import { RAGOrganisation, RAGSessionData } from '../interfaces/webhook.interface';

// Default session data for new sessions
const DEFAULT_SESSION_DATA: Omit<RAGSessionData, 'organisation' | 'startedAt' | 'messageId'> = {
  history: [],
  lastActive: new Date(),
};

@Injectable()
export class RAGSessionService {
  private readonly logger = new Logger(RAGSessionService.name);

  constructor(
    private readonly sessionManager: SessionManagerService
  ) {}

  /**
   * Get active RAG session for a user
   */
  async getRAGSession(phoneNumber: string): Promise<{ organisation: RAGOrganisation } | null> {
    try {
      const activeSession = await this.sessionManager.getActiveSession(phoneNumber);
      
      if (!activeSession) return null;
      
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

  /**
   * Create a new RAG session
   */
  async createRAGSession(
    phoneNumber: string,
    organisation: RAGOrganisation,
    messageID: string
  ): Promise<void> {
    try {
      const sessionType = organisation === 'Government' ? SessionType.GOVERNMENT : SessionType.FARMER;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      const sessionData: RAGSessionData = {
        organisation,
        history: [],
        startedAt: new Date(),
        messageId: messageID
      };

      await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        sessionType,
        1,
        sessionData,
        messageID,
        expiresAt
      );
      
      this.logger.log(`Created ${organisation} RAG session for ${phoneNumber}`);
    } catch (error) {
      this.logger.error('Error creating RAG session:', error);
      throw error;
    }
  }

  /**
   * Update RAG session with new conversation
   */
  async updateRAGSession(
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

      const existingData = activeSession.sessionData ? 
        (typeof activeSession.sessionData === 'string' ? 
          JSON.parse(activeSession.sessionData) : 
          activeSession.sessionData) as Partial<RAGSessionData> : {};
      
      // Create session data with proper defaults
      const sessionData: RAGSessionData = {
        organisation: existingData.organisation || organisation,
        history: existingData.history || [],
        startedAt: existingData.startedAt || new Date(),
        messageId: existingData.messageId,
        lastSources: existingData.lastSources,
        lastActive: new Date(),
        lastMessageId: messageID,
      };

      // Initialize history if not present
      if (!sessionData.history) {
        sessionData.history = [];
      }

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

  /**
   * Get conversation context for RAG query
   */
  async getConversationContext(phoneNumber: string, organisation: RAGOrganisation): Promise<string> {
    try {
      const sessionType = organisation === 'Government' ? SessionType.GOVERNMENT : SessionType.FARMER;
      const activeSession = await this.sessionManager.getActiveSession(phoneNumber, sessionType);
      
      if (!activeSession || !activeSession.sessionData) {
        return '';
      }

      const sessionData = typeof activeSession.sessionData === 'string' 
        ? JSON.parse(activeSession.sessionData) 
        : activeSession.sessionData as RAGSessionData;

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
      this.logger.error('Error getting conversation context:', error);
      return '';
    }
  }
} 
