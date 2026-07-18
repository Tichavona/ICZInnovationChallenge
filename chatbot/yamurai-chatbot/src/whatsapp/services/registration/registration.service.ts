/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { User, UserRole, UserStatus } from '../../../database/user.entity';
import { SessionManagerService } from '../session-manager.service';
import { StorageService } from '../storage.service';
import { ValidationService } from '../utils/validation.service';
import { AuthService } from '../../../auth/auth.service';
import { SessionType } from '../../../database/session.entity';

export interface RegistrationData {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  idNumber?: string;
  address?: string;
  idDocumentUrl?: string;
  proofOfResidenceUrl?: string;
  step: number;
}

export interface RegistrationSession {
  phoneNumber: string;
  step: number;
  data: RegistrationData;
  lastActive: number;
  sessionId?: string;
}

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);
  private readonly SESSION_TTL = 30 * 60 * 1000; // 30 minutes
  
  // In-memory registration sessions
  private readonly usersInRegistration = new Map<string, RegistrationSession>();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly sessionManager: SessionManagerService,
    private readonly storageService: StorageService,
    private readonly validationService: ValidationService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Start registration flow for a user
   */
  async startRegistration(phoneNumber: string, messageID: string): Promise<RegistrationSession> {
    try {
      // Check if already in registration
      const existing = this.getRegistrationSession(phoneNumber);
      if (existing) {
        return existing;
      }

      // Initialize registration data
      const registrationData: RegistrationData = {
        step: 1
      };

      const session: RegistrationSession = {
        phoneNumber,
        step: 1,
        data: registrationData,
        lastActive: Date.now()
      };

      // Store in memory
      this.usersInRegistration.set(phoneNumber, session);

      // Create database session for locking
      await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.REGISTRATION,
        1,
        registrationData,
        messageID
      );

      this.logger.log(`Started registration for ${phoneNumber}`);
      
      return session;
    } catch (error) {
      this.logger.error('Error starting registration:', error);
      throw error;
    }
  }

  /**
   * Get registration session
   */
  getRegistrationSession(phoneNumber: string): RegistrationSession | null {
    const session = this.usersInRegistration.get(phoneNumber);
    
    if (!session) return null;
    
    // Check if session is still valid
    if (Date.now() - session.lastActive > this.SESSION_TTL) {
      this.usersInRegistration.delete(phoneNumber);
      this.sessionManager.cancelSession(phoneNumber, SessionType.REGISTRATION)
        .catch(error => this.logger.error('Error cancelling expired session:', error));
      return null;
    }
    
    return session;
  }

  /**
   * Update registration session
   */
  updateRegistrationSession(phoneNumber: string, updates: Partial<RegistrationSession>): void {
    const session = this.usersInRegistration.get(phoneNumber);
    
    if (session) {
      Object.assign(session, updates);
      session.lastActive = Date.now();
      this.usersInRegistration.set(phoneNumber, session);
    }
  }

  /**
   * Handle registration step
   */
  async handleStep(
    phoneNumber: string,
    text: string,
    messageID: string
  ): Promise<{ handled: boolean; message?: string; completed?: boolean }> {
    try {
      const session = this.getRegistrationSession(phoneNumber);
      
      if (!session) {
        return {
          handled: false,
          message: 'No active registration session. Please start over with "REGISTER".'
        };
      }

      session.lastActive = Date.now();

      switch (session.step) {
        case 1: // First Name
          return await this.handleFirstName(phoneNumber, text, session);
          
        case 2: // Last Name
          return await this.handleLastName(phoneNumber, text, session);
          
        case 3: // Email
          return await this.handleEmail(phoneNumber, text, session);
          
        case 4: // Password
          return await this.handlePassword(phoneNumber, text, session);
          
        case 5: // Confirm Password
          return await this.handleConfirmPassword(phoneNumber, text, session);
          
        case 6: // ID Number
          return await this.handleIdNumber(phoneNumber, text, session);
          
        case 7: // Address
          return await this.handleAddress(phoneNumber, text, session);
          
        case 8: // ID Document
          return {
            handled: true,
            message: '📄 *Step 8/9:* Please upload your ID Document (photo of your ID):\n\nYou can send a photo or document.'
          };
          
        case 9: // Proof of Residence
          return {
            handled: true,
            message: '📄 *Step 9/9:* Please upload your Proof of Residence (document or photo):\n\nThis could be a utility bill, bank statement, or other official document with your address.'
          };
          
        default:
          return {
            handled: false,
            message: 'Invalid registration step. Please start over with "REGISTER".'
          };
      }
    } catch (error) {
      this.logger.error('Error handling registration step:', error);
      return {
        handled: false,
        message: '❌ Error processing registration. Please try again.'
      };
    }
  }

  /**
   * Handle first name
   */
  private async handleFirstName(
    phoneNumber: string,
    text: string,
    session: RegistrationSession
  ): Promise<{ handled: boolean; message?: string; completed?: boolean }> {
    if (!text.trim()) {
      return {
        handled: true,
        message: '❌ First name cannot be empty. Please try again:'
      };
    }

    session.data.firstName = text.trim();
    session.step = 2;
    this.updateRegistrationSession(phoneNumber, session);

    await this.sessionManager.createOrUpdateActiveSession(
      phoneNumber,
      SessionType.REGISTRATION,
      2,
      session.data,
      session.sessionId
    );

    return {
      handled: true,
      message: '👤 *Step 2/9:* What is your Last Name?'
    };
  }

  /**
   * Handle last name
   */
  private async handleLastName(
    phoneNumber: string,
    text: string,
    session: RegistrationSession
  ): Promise<{ handled: boolean; message?: string; completed?: boolean }> {
    if (!text.trim()) {
      return {
        handled: true,
        message: '❌ Last name cannot be empty. Please try again:'
      };
    }

    session.data.lastName = text.trim();
    session.step = 3;
    this.updateRegistrationSession(phoneNumber, session);

    await this.sessionManager.createOrUpdateActiveSession(
      phoneNumber,
      SessionType.REGISTRATION,
      3,
      session.data,
      session.sessionId
    );

    return {
      handled: true,
      message: '📧 *Step 3/9:* What is your Email Address?'
    };
  }

  /**
   * Handle email
   */
  private async handleEmail(
    phoneNumber: string,
    text: string,
    session: RegistrationSession
  ): Promise<{ handled: boolean; message?: string; completed?: boolean }> {
    if (!this.validationService.validateEmail(text)) {
      return {
        handled: true,
        message: '❌ Please provide a valid email address. Try again:'
      };
    }

    // Check if email already exists
    const existingUser = await this.userRepository.findOne({ where: { email: text.trim() } });
    if (existingUser) {
      return {
        handled: true,
        message: '❌ This email is already registered. Please use a different email or try logging in.'
      };
    }

    session.data.email = text.trim();
    session.step = 4;
    this.updateRegistrationSession(phoneNumber, session);

    await this.sessionManager.createOrUpdateActiveSession(
      phoneNumber,
      SessionType.REGISTRATION,
      4,
      session.data,
      session.sessionId
    );

    return {
      handled: true,
      message: '🔐 *Step 4/9:* Create a Password (minimum 10 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character):'
    };
  }

  /**
   * Handle password
   */
  private async handlePassword(
    phoneNumber: string,
    text: string,
    session: RegistrationSession
  ): Promise<{ handled: boolean; message?: string; completed?: boolean }> {
    if (!this.validationService.validatePassword(text)) {
      return {
        handled: true,
        message: '❌ Password must be at least 10 characters with:\n• 1 uppercase letter\n• 1 lowercase letter\n• 1 number\n• 1 special character (@$!%*?&)\n\nPlease try again:'
      };
    }

    session.data.password = text;
    session.step = 5;
    this.updateRegistrationSession(phoneNumber, session);

    await this.sessionManager.createOrUpdateActiveSession(
      phoneNumber,
      SessionType.REGISTRATION,
      5,
      session.data,
      session.sessionId
    );

    return {
      handled: true,
      message: '🔐 *Step 5/9:* Please confirm your password:'
    };
  }

  /**
   * Handle confirm password
   */
  private async handleConfirmPassword(
    phoneNumber: string,
    text: string,
    session: RegistrationSession
  ): Promise<{ handled: boolean; message?: string; completed?: boolean }> {
    if (text !== session.data.password) {
      return {
        handled: true,
        message: '❌ Passwords do not match. Please re-enter your password:'
      };
    }

    session.step = 6;
    this.updateRegistrationSession(phoneNumber, session);

    await this.sessionManager.createOrUpdateActiveSession(
      phoneNumber,
      SessionType.REGISTRATION,
      6,
      session.data,
      session.sessionId
    );

    return {
      handled: true,
      message: '🆔 *Step 6/9:* What is your ID Number?'
    };
  }

  /**
   * Handle ID number
   */
  private async handleIdNumber(
    phoneNumber: string,
    text: string,
    session: RegistrationSession
  ): Promise<{ handled: boolean; message?: string; completed?: boolean }> {
    if (!this.validationService.validateIdNumber(text)) {
      return {
        handled: true,
        message: '❌ Please provide a valid ID number (6-20 characters). Try again:'
      };
    }

    session.data.idNumber = text.trim();
    session.step = 7;
    this.updateRegistrationSession(phoneNumber, session);

    await this.sessionManager.createOrUpdateActiveSession(
      phoneNumber,
      SessionType.REGISTRATION,
      7,
      session.data,
      session.sessionId
    );

    return {
      handled: true,
      message: '📍 *Step 7/9:* What is your Address?'
    };
  }

  /**
   * Handle address
   */
  private async handleAddress(
    phoneNumber: string,
    text: string,
    session: RegistrationSession
  ): Promise<{ handled: boolean; message?: string; completed?: boolean }> {
    if (!text.trim()) {
      return {
        handled: true,
        message: '❌ Address cannot be empty. Please try again:'
      };
    }

    session.data.address = text.trim();
    session.step = 8;
    this.updateRegistrationSession(phoneNumber, session);

    await this.sessionManager.createOrUpdateActiveSession(
      phoneNumber,
      SessionType.REGISTRATION,
      8,
      session.data,
      session.sessionId
    );

    return {
      handled: true,
      message: '📄 *Step 8/9:* Please upload your ID Document (photo of your ID):\n\nYou can send a photo or document.'
    };
  }

  /**
   * Handle ID document upload
   */
  async handleIdDocument(
    phoneNumber: string,
    mediaBuffer: Buffer,
    mimeType: string,
    filename: string,
    messageID: string
  ): Promise<{ handled: boolean; message?: string; completed?: boolean }> {
    try {
      const session = this.getRegistrationSession(phoneNumber);
      
      if (!session || session.step !== 8) {
        return {
          handled: false,
          message: '❌ No active registration session or incorrect step.'
        };
      }

      // Validate document type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(mimeType)) {
        return {
          handled: true,
          message: '❌ Please upload a valid ID document (PDF, JPEG, PNG). Try again:'
        };
      }

      // Save document
      const filePath = await this.storageService.saveIdDocument(
        phoneNumber,
        mediaBuffer,
        filename
      );

      if (!filePath || !existsSync(filePath)) {
        throw new Error('Failed to save ID document');
      }

      session.data.idDocumentUrl = filePath;
      session.step = 9;
      this.updateRegistrationSession(phoneNumber, session);

      await this.sessionManager.createOrUpdateActiveSession(
        phoneNumber,
        SessionType.REGISTRATION,
        9,
        session.data,
        messageID
      );

      return {
        handled: true,
        message: '✅ ID Document received!\n\n📄 *Step 9/9:* Please upload your Proof of Residence (document or photo):\n\nThis could be a utility bill, bank statement, or other official document with your address.'
      };
    } catch (error) {
      this.logger.error('Error handling ID document:', error);
      return {
        handled: true,
        message: '❌ Failed to process ID document. Please try again.'
      };
    }
  }

  /**
   * Handle proof of residence upload
   */
  async handleProofOfResidence(
    phoneNumber: string,
    mediaBuffer: Buffer,
    mimeType: string,
    filename: string,
    messageID: string
  ): Promise<{ handled: boolean; message?: string; completed?: boolean }> {
    try {
      const session = this.getRegistrationSession(phoneNumber);
      
      if (!session || session.step !== 9) {
        return {
          handled: false,
          message: '❌ No active registration session or incorrect step.'
        };
      }

      // Validate document type
      const validTypes = [
        'application/pdf', 'image/jpeg', 'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'text/csv'
      ];
      
      if (!validTypes.includes(mimeType)) {
        return {
          handled: true,
          message: '❌ Please upload a valid proof of residence document. Try again:'
        };
      }

      // Save document
      const filePath = await this.storageService.saveProofOfResidence(
        phoneNumber,
        mediaBuffer,
        filename
      );

      if (!filePath || !existsSync(filePath)) {
        throw new Error('Failed to save proof of residence');
      }

      session.data.proofOfResidenceUrl = filePath;
      
      // Complete registration
      const completed = await this.completeRegistration(phoneNumber, session.data, messageID);
      
      if (completed) {
        return {
          handled: true,
          completed: true,
          message: '✅ Registration completed successfully!'
        };
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      this.logger.error('Error handling proof of residence:', error);
      return {
        handled: true,
        message: '❌ Failed to process document. Please try again.'
      };
    }
  }

  /**
   * Complete registration
   */
  private async completeRegistration(
    phoneNumber: string,
    userData: RegistrationData,
    messageID: string
  ): Promise<boolean> {
    try {
      // Validate all required fields
      const requiredFields: (keyof RegistrationData)[] = [
        'firstName', 'lastName', 'email', 'password',
        'idNumber', 'address', 'idDocumentUrl', 'proofOfResidenceUrl'
      ];
      
      for (const field of requiredFields) {
        if (!userData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
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
        this.cancelRegistration(phoneNumber);
        await this.sessionManager.createLoginSession(phoneNumber);
        
        this.logger.log(`Registration completed for ${phoneNumber}`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Error completing registration:', error);
      return false;
    }
  }

  /**
   * Cancel registration
   */
  cancelRegistration(phoneNumber: string): void {
    this.usersInRegistration.delete(phoneNumber);
    this.sessionManager.cancelSession(phoneNumber, SessionType.REGISTRATION)
      .catch(error => this.logger.error('Error cancelling registration session:', error));
  }

  /**
   * Clean up old registration sessions
   */
  cleanupOldSessions(): void {
    const now = Date.now();
    
    for (const [phoneNumber, session] of this.usersInRegistration.entries()) {
      if (now - session.lastActive > this.SESSION_TTL) {
        this.usersInRegistration.delete(phoneNumber);
        this.logger.log(`Cleaned up expired registration session for ${phoneNumber}`);
        
        this.sessionManager.cancelSession(phoneNumber, SessionType.REGISTRATION)
          .catch(error => this.logger.error('Error cleaning up database session:', error));
      }
    }
  }
} 
