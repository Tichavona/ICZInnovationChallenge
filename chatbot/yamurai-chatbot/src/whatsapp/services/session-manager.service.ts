/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import { 
  AuthSession, 
  LoginSession, 
  UserSession, 
  RegistrationSession, 
  ActiveSession, 
  SessionType, 
  SessionStatus 
} from '../../database/session.entity';

@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);
  
  // Session timeouts (in milliseconds)
  private readonly SESSION_TIMEOUTS = {
    [SessionType.EMERGENCY]: 15 * 60 * 1000, // 15 minutes
    [SessionType.ISSUE_REPORTING]: 15 * 60 * 1000, // 15 minutes
    [SessionType.REGISTRATION]: 30 * 60 * 1000, // 30 minutes
    [SessionType.LOGIN]: 24 * 60 * 60 * 1000, // 24 hours
    [SessionType.USER]: 30 * 60 * 1000, // 30 minutes
    [SessionType.AUTH]: 15 * 60 * 1000, // 15 minutes
    [SessionType.EDIT_FEEDBACK]: 60 * 60 * 1000, // 60 minutes for edit sessions
    [SessionType.VERIFICATION]: 30 * 60 * 1000, // 30 minutes for verification
  };

  // Message deduplication
  private readonly processedMessages = new Map<string, number>();
  private readonly MESSAGE_TTL = 300000; // 5 minutes TTL

  // In-memory registration sessions
  private readonly usersInRegistration = new Map<string, any>();

  constructor(
    @InjectRepository(AuthSession)
    private authSessionRepository: Repository<AuthSession>,
    
    @InjectRepository(LoginSession)
    private loginSessionRepository: Repository<LoginSession>,
    
    @InjectRepository(UserSession)
    private userSessionRepository: Repository<UserSession>,
    
    @InjectRepository(RegistrationSession)
    private registrationSessionRepository: Repository<RegistrationSession>,
    
    @InjectRepository(ActiveSession)
    private activeSessionRepository: Repository<ActiveSession>,
  ) {}

  // ==================== AUTH SESSION METHODS (from session.ts) ====================
  async createAuthSession(phoneNumber: string): Promise<string> {
    await this.cleanupExpiredAuthSessions();
    
    const sessionID = this.generateSessionId();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const session = this.authSessionRepository.create({
      sessionID,
      phoneNumber,
      verified: false,
      lastActivity: new Date(),
      expiresAt,
    });
    
    await this.authSessionRepository.save(session);
    return sessionID;
  }

  async updateAuthActivity(sessionID: string): Promise<void> {
    const session = await this.authSessionRepository.findOne({
      where: { sessionID, expiresAt: MoreThanOrEqual(new Date()) }
    });
    if (session) {
      session.lastActivity = new Date();
      await this.authSessionRepository.save(session);
    }
  }

  async verifyAuthSession(sessionID: string): Promise<boolean> {
    const session = await this.authSessionRepository.findOne({
      where: { sessionID, expiresAt: MoreThanOrEqual(new Date()) }
    });

    if (!session) return false;
    
    session.verified = true;
    session.lastActivity = new Date();
    await this.authSessionRepository.save(session);
    return true;
  }

  async isAuthSessionVerified(sessionID: string): Promise<boolean> {
    const session = await this.authSessionRepository.findOne({
      where: { sessionID, expiresAt: MoreThanOrEqual(new Date()) }
    });

    if (!session || !session.verified) return false;
    
    // Update last activity
    session.lastActivity = new Date();
    await this.authSessionRepository.save(session);
    
    return true;
  }

  async getPhoneNumberByAuthSession(sessionID: string): Promise<string | null> {
    const session = await this.authSessionRepository.findOne({
      where: { sessionID, expiresAt: MoreThanOrEqual(new Date()) }
    });
    
    return session?.phoneNumber || null;
  }

  // ==================== ACTIVE SESSION MANAGEMENT ====================
  async createOrUpdateActiveSession(
    phoneNumber: string, 
    sessionType: SessionType, 
    currentStep: number, 
    sessionData: any, 
    messageId?: string, 
    expiresAt?: Date  
  ): Promise<ActiveSession> {
    await this.cleanupExpiredActiveSessions();
    
    let session = await this.activeSessionRepository.findOne({
      where: { 
        phoneNumber,
        sessionType,
        status: SessionStatus.ACTIVE
      }
    });

    const sessionTimeout = this.SESSION_TIMEOUTS[sessionType] || (30 * 60 * 1000);
    const calculatedExpiresAt = expiresAt || new Date(Date.now() +  sessionTimeout);

    const processedSessionData = this.processSessionDataForStorage(sessionData);

    const sessionDataString = JSON.stringify({
      ...processedSessionData,
      currentStep,
      lastMessageId: messageId,
      createdAt: session?.createdAt || new Date()
    });

    if (session) {
      session.currentStep = currentStep;
      session.sessionData = sessionDataString;
      session.lastActive = new Date();
      session.expiresAt = calculatedExpiresAt;
      session.updatedAt = new Date();
    } else {
      session = this.activeSessionRepository.create({
        phoneNumber,
        sessionType,
        currentStep,
        sessionData: sessionDataString,
        status: SessionStatus.ACTIVE,
        lastActive: new Date(),
        expiresAt: calculatedExpiresAt,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return await this.activeSessionRepository.save(session);
  }

  async hasActiveGuidedSession(phoneNumber: string): Promise<boolean> {
    const guidedSessionTypes = [
      SessionType.REGISTRATION,
      SessionType.EMERGENCY,
      SessionType.ISSUE_REPORTING
    ];

    const session = await this.activeSessionRepository.findOne({
      where: {
        phoneNumber,
        sessionType: In(guidedSessionTypes),
        status: SessionStatus.ACTIVE,
        expiresAt: MoreThanOrEqual(new Date())
      }
    });

    return !!session;
  }

  /**
   * Process session data to ensure all dates are converted to ISO strings
   * for proper JSON serialization
   */
  private processSessionDataForStorage(data: any): any {
    if (!data) return data;
    
    if (Array.isArray(data)) {
      return data.map(item => this.processSessionDataForStorage(item));
    }
    
    if (data instanceof Date) {
      return data.toISOString();
    }
    
    if (typeof data === 'object') {
      const processed: any = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          processed[key] = this.processSessionDataForStorage(data[key]);
        }
      }
      return processed;
    }
    
    return data;
  }

  async getActiveSession(phoneNumber: string, sessionType?: SessionType): Promise<ActiveSession | null> {
    const where: any = {
      phoneNumber,
      status: SessionStatus.ACTIVE,
      expiresAt: MoreThanOrEqual(new Date())
    };

    if (sessionType) {
      where.sessionType = sessionType;
    }

    return await this.activeSessionRepository.findOne({
      where,
      order: { lastActive: 'DESC' }
    });
  }

  async getAllActiveSessions(phoneNumber: string): Promise<ActiveSession[]> {
    return await this.activeSessionRepository.find({
      where: {
        phoneNumber,
        status: SessionStatus.ACTIVE,
        expiresAt: MoreThanOrEqual(new Date())
      },
      order: { lastActive: 'DESC' }
    });
  }

  async completeSession(phoneNumber: string, sessionType: SessionType): Promise<boolean> {
    try {
      const result = await this.activeSessionRepository.update(
        {
          phoneNumber,
          sessionType,
          status: SessionStatus.ACTIVE
        },
        {
          status: SessionStatus.COMPLETED,
          endedBy: 'system',
          updatedAt: new Date()
        }
      );

      return result.affected! > 0;
    } catch (error) {
      this.logger.error('Error completing session:', error);
      return false;
    }
  }

  async cancelSession(phoneNumber: string, sessionType?: SessionType): Promise<boolean> {
    try {
      const where: any = {
        phoneNumber,
        status: SessionStatus.ACTIVE
      };

      if (sessionType) {
        where.sessionType = sessionType;
      }

      const result = await this.activeSessionRepository.update(
        where,
        {
          status: SessionStatus.CANCELLED,
          endedBy: 'user',
          cancellationReason: 'User requested cancellation',
          updatedAt: new Date()
        }
      );

      const cancelled = result.affected! > 0;
      if (cancelled) {
        this.logger.log(`Session cancelled for ${phoneNumber}: ${sessionType || 'all'}`);
        
        // Also cancel related registration sessions if any
        if (!sessionType || sessionType === SessionType.REGISTRATION) {
          await this.cancelRegistrationSession(phoneNumber);
        }
        
        // Cancel related login sessions if cancelling all sessions
        if (!sessionType) {
          await this.cancelLoginSession(phoneNumber);
        }
      }

      return cancelled;
    } catch (error) {
      this.logger.error('Error cancelling session:', error);
      return false;
    }
  }

  private async cancelRegistrationSession(phoneNumber: string): Promise<void> {
    try {
      // Update registration session if exists
      const registrationSession = await this.registrationSessionRepository.findOne({
        where: { phoneNumber }
      });
      
      if (registrationSession) {
        registrationSession.status = 'cancelled';
        registrationSession.cancelledAt = new Date();
        registrationSession.cancellationReason = 'User requested cancellation';
        await this.registrationSessionRepository.save(registrationSession);
      }
      
      // Remove from memory
      this.usersInRegistration.delete(phoneNumber);
    } catch (error) {
      this.logger.error('Error cancelling registration session:', error);
    }
  }

  private async cancelLoginSession(phoneNumber: string): Promise<void> {
    try {
      await this.loginSessionRepository.update(
        { 
          phoneNumber, 
          status: 'active' 
        },
        { 
          status: 'logged_out',
          endedBy: 'user',
          updatedAt: new Date()
        }
      );
    } catch (error) {
      this.logger.error('Error cancelling login session:', error);
    }
  }

  async cancelAllSessions(phoneNumber: string): Promise<boolean> {
    try {
      // Cancel all active sessions
      const cancelResult = await this.cancelSession(phoneNumber);
      
      // Cancel auth sessions
      await this.authSessionRepository.update(
        { phoneNumber },
        { 
          cancelled: true,
          cancelledAt: new Date(),
          cancellationReason: 'User requested cancellation'
        }
      );
      
      // Cancel user sessions
      await this.userSessionRepository.update(
        { phoneNumber },
        { 
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: 'User requested cancellation'
        }
      );
      
      return cancelResult;
    } catch (error) {
      this.logger.error('Error cancelling all sessions:', error);
      return false;
    }
  }

  // ==================== REGISTRATION SESSION METHODS ====================
  hasActiveRegistrationSession(phoneNumber: string): boolean {
    const registrationData = this.usersInRegistration.get(phoneNumber);
    if (!registrationData) return false;
    
    const isActive = (Date.now() - registrationData.lastActive) < (30 * 60 * 1000);
    if (!isActive) {
      if (registrationData.sessionId) {
        this.deleteRegistrationSession(registrationData.sessionId.toString()).catch(error => {
          this.logger.error('Error removing expired registration session:', error);
        });
      }
      this.usersInRegistration.delete(phoneNumber);
    }
    return isActive;
  }

  setRegistrationSession(phoneNumber: string, data: any): void {
    this.usersInRegistration.set(phoneNumber, {
      ...data,
      lastActive: Date.now()
    });
  }

  removeRegistrationSession(phoneNumber: string): void {
    this.usersInRegistration.delete(phoneNumber);
  }

  async getRegistrationSession(phoneNumber: string): Promise<RegistrationSession | null> {
    await this.cleanupExpiredRegistrationSessions();
    
    return await this.registrationSessionRepository.findOne({
      where: { 
        phoneNumber, 
        expiresAt: MoreThanOrEqual(new Date()) 
      }
    });
  }

  async createOrUpdateRegistrationSession(
    phoneNumber: string, 
    step: number, 
    data: Record<string, any>
  ): Promise<{ session: RegistrationSession; activeSession: ActiveSession }> {
    await this.cleanupExpiredRegistrationSessions();
    
    const expiresAt = new Date(Date.now() + this.SESSION_TIMEOUTS[SessionType.REGISTRATION]);
    const dataString = JSON.stringify(data);
    
    let session = await this.registrationSessionRepository.findOne({
      where: { phoneNumber }
    });

    if (session) {
      session.step = step;
      session.data = dataString;
      session.lastActive = new Date();
      session.expiresAt = expiresAt;
      session.status = 'active';
    } else {
      session = this.registrationSessionRepository.create({
        phoneNumber,
        step,
        data: dataString,
        lastActive: new Date(),
        expiresAt,
        status: 'active'
      });
    }

    const savedSession = await this.registrationSessionRepository.save(session);
    
    // Create active session for locking
    const activeSession = await this.createOrUpdateActiveSession(
      phoneNumber,
      SessionType.REGISTRATION,
      step,
      data
    );

    return { session: savedSession, activeSession };
  }

  async deleteRegistrationSession(phoneNumber: string): Promise<void> {
    try {
      // Update status instead of deleting
      const result = await this.registrationSessionRepository.update(
        { phoneNumber },
        {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: 'Session cancelled by user'
        }
      );
      
      if (result.affected! > 0) {
        this.logger.log(`Registration session cancelled for ${phoneNumber}`);
      }
      
      // Also remove from memory
      this.usersInRegistration.delete(phoneNumber);
    } catch (error) {
      this.logger.error('Error cancelling registration session:', error);
      throw error;
    }
  }

  // ==================== LOGIN SESSION METHODS ====================
  async createLoginSession(phoneNumber: string): Promise<string> {
    await this.cleanupExpiredLoginSessions();
    
    const sessionToken = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_TIMEOUTS[SessionType.LOGIN]);

    const loginSession = this.loginSessionRepository.create({
      phoneNumber,
      sessionToken,
      expiresAt,
      lastActive: now,
      status: 'active'
    });

    await this.loginSessionRepository.save(loginSession);
    this.logger.log(`Login session created for ${phoneNumber}`);
    
    return sessionToken;
  }

  async hasValidLoginSession(phoneNumber: string): Promise<boolean> {
    try {
      const now = new Date();
      
      const activeSession = await this.loginSessionRepository.findOne({
        where: {
          phoneNumber,
          status: 'active',
          expiresAt: MoreThanOrEqual(now)
        }
      });

      if (activeSession) {
        // Update last active time
        activeSession.lastActive = now;
        await this.loginSessionRepository.save(activeSession);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Error checking login session:', error);
      return false;
    }
  }

  async removeLoginSession(phoneNumber: string): Promise<boolean> {
    try {
      const result = await this.loginSessionRepository.update(
        { 
          phoneNumber, 
          status: 'active' 
        },
        { 
          status: 'logged_out',
          endedBy: 'user',
          updatedAt: new Date()
        }
      );

      const wasRemoved = result.affected! > 0;
      if (wasRemoved) {
        this.logger.log(`Login session removed for ${phoneNumber}`);
      }
      
      return wasRemoved;
    } catch (error) {
      this.logger.error('Error removing login session:', error);
      return false;
    }
  }

  async getActiveLoginSession(phoneNumber: string): Promise<LoginSession | null> {
    try {
      const now = new Date();
      
      return await this.loginSessionRepository.findOne({
        where: {
          phoneNumber,
          status: 'active',
          expiresAt: MoreThanOrEqual(now)
        },
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      this.logger.error('Error getting active login session:', error);
      return null;
    }
  }

  // ==================== USER SESSION METHODS ====================
  async getUserSession(phoneNumber: string): Promise<UserSession | null> {
    await this.cleanupExpiredUserSessions();
    
    return await this.userSessionRepository.findOne({
      where: { 
        phoneNumber, 
        expiresAt: MoreThanOrEqual(new Date()) 
      }
    });
  }

  async updateUserSession(phoneNumber: string, organisation?: string, sessionData?: any): Promise<void> {
    await this.cleanupExpiredUserSessions();
    
    const expiresAt = new Date(Date.now() + this.SESSION_TIMEOUTS[SessionType.USER]);
    
    let session = await this.userSessionRepository.findOne({
      where: { phoneNumber }
    });

    const sessionDataString = sessionData ? JSON.stringify(sessionData) : null;

    if (session) {
      session.organisation = organisation!;
      session.sessionData = sessionDataString!;
      session.expiresAt = expiresAt;
      session.status = 'active';
      session.updatedAt = new Date();
    } else {
      session = this.userSessionRepository.create({
        phoneNumber,
        organisation,
        sessionData: sessionDataString!,
        expiresAt,
        status: 'active'
      });
    }

    await this.userSessionRepository.save(session);
  }

  async clearUserSession(phoneNumber: string): Promise<void> {
    await this.userSessionRepository.update(
      { phoneNumber },
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: 'Session cleared by user'
      }
    );
  }

  // ==================== MESSAGE DEDUPLICATION ====================
  isMessageProcessedRecently(messageID: string): boolean {
    const now = Date.now();
    if (this.processedMessages.has(messageID)) {
      const processedTime = this.processedMessages.get(messageID) || 0;
      if (now - processedTime < this.MESSAGE_TTL) {
        this.logger.debug(`Message ${messageID} processed recently`);
        return true;
      }
    }
    return false;
  }

  markMessageAsProcessed(messageID: string): void {
    this.processedMessages.set(messageID, Date.now());
  }

  // ==================== CLEANUP METHODS ====================
  private async cleanupExpiredAuthSessions() {
    await this.authSessionRepository
      .createQueryBuilder()
      .update()
      .set({
        cancelled: true,
        cancelledAt: new Date(),
        cancellationReason: 'Session expired'
      })
      .where('expiresAt < :now', { now: new Date() })
      .andWhere('cancelled = :cancelled', { cancelled: false })
      .execute();
  }

  async cleanupExpiredActiveSessions(): Promise<void> {
    const now = new Date();
    
    await this.activeSessionRepository.update(
      {
        status: SessionStatus.ACTIVE,
        expiresAt: LessThanOrEqual(now)
      },
      {
        status: SessionStatus.EXPIRED,
        endedBy: 'system',
        updatedAt: now
      }
    );
  }

  async cleanupExpiredLoginSessions(): Promise<number> {
    try {
      const now = new Date();
      
      const result = await this.loginSessionRepository.update(
        {
          status: 'active',
          expiresAt: LessThanOrEqual(now)
        },
        {
          status: 'expired',
          endedBy: 'system',
          updatedAt: now
        }
      );

      const cleanedCount = result.affected!;
      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} expired login sessions`);
      }
      
      return cleanedCount;
    } catch (error) {
      this.logger.error('Error cleaning up expired login sessions:', error);
      return 0;
    }
  }

  private async cleanupExpiredUserSessions() {
    await this.userSessionRepository
      .createQueryBuilder()
      .update()
      .set({
        status: 'expired',
        cancelledAt: new Date(),
        cancellationReason: 'Session expired'
      })
      .where('expiresAt < :now', { now: new Date() })
      .andWhere('status = :status', { status: 'active' })
      .execute();
  }

  private async cleanupExpiredRegistrationSessions() {
    const now = new Date();
    await this.registrationSessionRepository
      .createQueryBuilder()
      .update()
      .set({
        status: 'expired',
        cancelledAt: now,
        cancellationReason: 'Session expired'
      })
      .where('expiresAt < :now', { now })
      .andWhere('status = :status', { status: 'active' })
      .execute();
    
    // Also clean up in-memory sessions
    for (const [phoneNumber, data] of this.usersInRegistration.entries()) {
      if (Date.now() - data.lastActive > this.SESSION_TIMEOUTS[SessionType.REGISTRATION]) {
        this.usersInRegistration.delete(phoneNumber);
      }
    }
  }

  private cleanupProcessedMessages() {
    const now = Date.now();
    for (const [messageId, timestamp] of this.processedMessages.entries()) {
      if (now - timestamp > this.MESSAGE_TTL) {
        this.processedMessages.delete(messageId);
      }
    }
  }

  private cleanupStaleRegistrations(): void {
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes
    
    for (const [phoneNumber, data] of this.usersInRegistration.entries()) {
      if (now - data.lastActive > staleThreshold) {
        if (data.sessionId) {
          this.deleteRegistrationSession(data.sessionId.toString()).catch(error => {
            this.logger.error('Error removing stale registration session:', error);
          });
        }
        this.usersInRegistration.delete(phoneNumber);
        this.logger.log(`Cleaned up stale registration session for ${phoneNumber}`);
      }
    }
  }

  // ==================== COMPREHENSIVE CLEANUP ====================
  async performAllCleanup(): Promise<void> {
    await Promise.all([
      this.cleanupExpiredAuthSessions(),
      this.cleanupExpiredActiveSessions(),
      this.cleanupExpiredLoginSessions(),
      this.cleanupExpiredUserSessions(),
      this.cleanupExpiredRegistrationSessions()
    ]);
    
    this.cleanupProcessedMessages();
    this.cleanupStaleRegistrations();
    
    this.logger.log('Completed all session cleanup tasks');
  }

  // ==================== UTILITY METHODS ====================
  private generateSessionId(): string {
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  async logoutUserCompletely(phoneNumber: string): Promise<boolean> {
    try {
      await this.cancelAllSessions(phoneNumber);

      this.logger.log(`Complete logout performed for ${phoneNumber}`);
      return true;
    } catch (error) {
      this.logger.error('Error during complete logout:', error);
      return false;
    }
  }

  // ==================== SESSION LOCKING & NLP PROTECTION ====================
  async shouldBypassNLP(phoneNumber: string): Promise<boolean> {
    return await this.hasActiveGuidedSession(phoneNumber);
  }

  async getCurrentStep(phoneNumber: string): Promise<{ step: number; data: any } | null> {
    const session = await this.getActiveSession(phoneNumber);
    if (!session) return null;

    const sessionData = JSON.parse(session.sessionData || '{}');
    return {
      step: session.currentStep,
      data: sessionData
    };
  }
}