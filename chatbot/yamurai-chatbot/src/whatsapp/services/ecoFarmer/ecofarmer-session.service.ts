// src/whatsapp/services/ecofarmer/ecofarmer-session.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SessionManagerService } from '../session-manager.service';
import { FieldContextService, FieldContextResponse } from '../field-context/field-context.service';
import { SessionType } from '../../../database/session.entity';

export interface FarmMapping {
  name: string;
  id: string;
}

export interface EcoFarmerSessionData {
  step: 'FARM_SELECTION' | 'CONVERSATION';
  fieldId?: string;
  fieldName?: string;
  conversationId?: string;
  fieldContext?: FieldContextResponse;
  farms?: FarmMapping[];
  startedAt: Date;
  messageId?: string;
  lastActivity?: Date;
}

@Injectable()
export class EcoFarmerSessionService {
  private readonly logger = new Logger(EcoFarmerSessionService.name);
  
  // In-memory session tracking for quick access
  private readonly currentSessions = new Map<string, {
    sessionId: string;
    sessionType: SessionType;
    expiresAt: Date;
  }>();

  constructor(
    private readonly sessionManager: SessionManagerService,
    private readonly fieldContextService: FieldContextService,
  ) {}

  /**
   * Set current session in memory
   */
  async setCurrentSession(
    phoneNumber: string,
    sessionId: string,
    sessionType: SessionType,
    expiresAt: Date
  ): Promise<void> {
    this.currentSessions.set(phoneNumber, {
      sessionId,
      sessionType,
      expiresAt
    });
    this.logger.debug(`Set current session for ${phoneNumber}: ${sessionType}`);
  }

  /**
   * Get current session from memory
   */
  async getCurrentSession(phoneNumber: string): Promise<{ sessionId: string; sessionType: SessionType; expiresAt: Date } | null> {
    const session = this.currentSessions.get(phoneNumber);
    if (!session) return null;
    
    if (session.expiresAt < new Date()) {
      this.currentSessions.delete(phoneNumber);
      return null;
    }
    
    return session;
  }

  /**
   * Clear current session
   */
  async clearCurrentSession(phoneNumber: string): Promise<void> {
    this.currentSessions.delete(phoneNumber);
    this.logger.debug(`Cleared current session for ${phoneNumber}`);
  }

  /**
   * Start a new ECOFARMER session
   */
  async startSession(phoneNumber: string, messageId: string, farms: FarmMapping[]): Promise<EcoFarmerSessionData> {
    try {
      const sessionData: EcoFarmerSessionData = {
        step: 'FARM_SELECTION',
        farms,
        startedAt: new Date(),
        messageId,
        lastActivity: new Date(),
      };

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      const activeSession = await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.AGROMATE,
        1,
        sessionData,
        messageId,
        expiresAt,
      );

      await this.setCurrentSession(phoneNumber, activeSession.id.toString(), SessionType.AGROMATE, expiresAt);
      
      return sessionData;
    } catch (error) {
      this.logger.error('Error starting AGROMATE session:', error);
      throw error;
    }
  }

  /**
   * Get current session data
   */
  async getSession(phoneNumber: string): Promise<EcoFarmerSessionData | null> {
    try {
      const session = await this.sessionManager.getActiveSession(phoneNumber, SessionType.AGROMATE);
      
      if (!session) return null;

      const sessionData = session.sessionData
        ? typeof session.sessionData === 'string'
          ? JSON.parse(session.sessionData)
          : session.sessionData
        : null;

      return sessionData as EcoFarmerSessionData;
    } catch (error) {
      this.logger.error('Error getting AGROMATE session:', error);
      return null;
    }
  }

  /**
   * Update session data
   */
  async updateSession(
    phoneNumber: string,
    data: Partial<EcoFarmerSessionData>,
    messageId?: string,
  ): Promise<void> {
    try {
      const currentSession = await this.getSession(phoneNumber);
      if (!currentSession) return;

      const updatedData = {
        ...currentSession,
        ...data,
        lastActivity: new Date(),
      };

      await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.AGROMATE,
        2,
        updatedData,
        messageId,
      );
    } catch (error) {
      this.logger.error('Error updating AGROMATE session:', error);
      throw error;
    }
  }

  /**
   * End session
   */
  async endSession(phoneNumber: string): Promise<void> {
    try {
      await this.clearCurrentSession(phoneNumber);
      await this.sessionManager.cancelSession(phoneNumber, SessionType.AGROMATE);
      this.logger.log(`Ended AGROMATE session for ${phoneNumber}`);
    } catch (error) {
      this.logger.error('Error ending AGROMATE session:', error);
    }
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [phoneNumber, session] of this.currentSessions.entries()) {
      if (session.expiresAt < now) {
        this.currentSessions.delete(phoneNumber);
        this.logger.debug(`Cleaned up expired session for ${phoneNumber}`);
      }
    }
  }
}