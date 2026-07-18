// /* eslint-disable @typescript-eslint/no-unsafe-call */
// /* eslint-disable @typescript-eslint/no-base-to-string */
// /* eslint-disable @typescript-eslint/restrict-template-expressions */
// /* eslint-disable @typescript-eslint/no-redundant-type-constituents */
// /* eslint-disable @typescript-eslint/no-unsafe-return */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-unsafe-argument */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/require-await */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable prettier/prettier */

// import { Injectable, Logger } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, MoreThan, EntityManager } from 'typeorm';
// import {  User, UserRole, UserStatus } from '../database/user.entity';
// import { KycData } from '../database/kyc.entity';
// import { SessionManagerService } from '../whatsapp/services/session-manager.service';
// import * as bcrypt from 'bcrypt';
// import * as crypto from 'crypto';
// import { join } from 'path';
// import { existsSync, mkdirSync, writeFileSync } from 'fs';

// // Define Multer File interface since Express.Multer.File is not available
// interface MulterFile {
//   fieldname: string;
//   originalname: string;
//   encoding: string;
//   mimetype: string;
//   buffer: Buffer;
//   size: number;
// }

// @Injectable()
// export class AuthService {
//   private readonly logger = new Logger(AuthService.name);
//   private readonly UPLOAD_DIR = join(__dirname, '../../uploads');
//   private readonly ID_DIR = join(this.UPLOAD_DIR, 'IDs');
//   private readonly POR_DIR = join(this.UPLOAD_DIR, 'POR');
//   private readonly phoneHashSalt: string;
//   private readonly LOGIN_SESSION_TTL = 60 * 60 * 1000; // 1Hour

//   constructor(
//     private readonly sessionService: SessionManagerService,
//     @InjectRepository(User)
//     private userRepository: Repository<User>, 
//     @InjectRepository(KycData) // Add this repository
//     private readonly kycRepository: Repository<KycData>,
//     private readonly entityManager: EntityManager,
//   ) {
//     this.ensureUploadDirs();
//     this.phoneHashSalt = process.env.PHONE_HASH_SALT || this.generateSecureSalt();
//   }

//   private generateSecureSalt(): string {
//     return crypto.randomBytes(32).toString('hex');
//   }

//   private ensureUploadDirs() {
//     if (!existsSync(this.UPLOAD_DIR)) {
//       mkdirSync(this.UPLOAD_DIR);
//     }
//     if (!existsSync(this.ID_DIR)) {
//       mkdirSync(this.ID_DIR);
//     }
//     if (!existsSync(this.POR_DIR)) {
//       mkdirSync(this.POR_DIR);
//     }
//   }

//   private saveDocument(file: MulterFile, phoneNumber: string, type: 'ID' | 'POR'): string {
//     const ext = file.originalname.split('.').pop();
//     const prefix = type === 'ID' ? 'id_document' : 'proof_of_residence';
//     const filename = `${prefix}_${phoneNumber}_${Date.now()}.${ext}`;
//     const dir = type === 'ID' ? this.ID_DIR : this.POR_DIR;
//     const path = join(dir, filename);
    
//     writeFileSync(path, file.buffer);
//     return `C:/Users/ACER/Documents/CourseGenerator/chatbot/uploads/${type === 'ID' ? 'IDs' : 'POR'}/${filename}`;
//   }

//   async findUserByPhone(phoneNumber: string): Promise<User | null> {
//     try {
//       const hashedPhone = await this.hashPhoneNumber(phoneNumber);
//       return await this.userRepository.findOne({ 
//         where: { phoneNumber: hashedPhone } 
//       });
//     } catch (error) {
//       this.logger.debug(`User not found for phone: ${phoneNumber}`);
//       return null;
//     }
//   }

//   async isUserRegistered(phoneNumber: string): Promise<boolean> {
//     try {
//       const hashedPhone = await this.hashPhoneNumber(phoneNumber);
//       const count = await this.userRepository.count({ where: { phoneNumber: hashedPhone } });
//       return count > 0;
//     } catch (error) {
//       this.logger.error('Database error checking user registration', error);
//       throw new Error('Failed to check user registration');
//     }
//   }

//   async hashPassword(password: string): Promise<string> {
//     const saltRounds = 12;
//     return await bcrypt.hash(password, saltRounds);
//   }

//   async hashPhoneNumber(phoneNumber: string): Promise<string> {
//     try {
//       if (!phoneNumber) {
//         throw new Error('Phone number is required for hashing');
//       }
      
//       const normalizedPhone = phoneNumber.replace(/\D/g, '');
      
//       if (!this.phoneHashSalt) {
//         throw new Error('Phone hash salt is not configured');
//       }
      
//       return crypto
//         .createHmac('sha256', this.phoneHashSalt)
//         .update(normalizedPhone)
//         .digest('hex');
//     } catch (error) {
//       this.logger.error('Phone number hashing failed', error);
//       throw new Error('Failed to hash phone number');
//     }
//   }

//   async completeRegistration(userData: any): Promise<boolean> {
//     try {
//       // Validate required fields for User entity
//       const userRequiredFields = ['firstName', 'lastName', 'email', 'phoneNumber', 'password'];
//       const missingUserFields = userRequiredFields.filter(field => !userData[field]);
      
//       if (missingUserFields.length > 0) {
//         throw new Error(`Missing required user fields: ${missingUserFields.join(', ')}`);
//       }

//       // Validate required fields for KYC data
//       const kycRequiredFields = ['idNumber', 'address', 'idLink', 'porLink'];
//       const missingKycFields = kycRequiredFields.filter(field => !userData.kycData?.[field]);
      
//       if (missingKycFields.length > 0) {
//         throw new Error(`Missing required KYC fields: ${missingKycFields.join(', ')}`);
//       }

//       const hashedPhone = await this.hashPhoneNumber(userData.phoneNumber);

//       const existingUser = await this.entityManager.findOne(User, {
//         where: [
//           { email: userData.email },
//           { phoneNumber: hashedPhone } 
//         ],
//         relations: ['kycData']
//       });

//       if (existingUser) {
//         if (existingUser.email === userData.email) throw new Error('Email already registered');
//         if (existingUser.phoneNumber === hashedPhone) throw new Error('Phone number already registered');
//       }

//       const existingKyc = await this.entityManager.findOne(KycData, {
//         where: { idNumber: userData.kycData.idNumber }
//       });

//       if (existingKyc) {
//         throw new Error('ID number already registered');
//       }

//       return await this.entityManager.transaction(async (transactionalEntityManager) => {
//         const user = transactionalEntityManager.create(User, {
//           firstName: userData.firstName,
//           lastName: userData.lastName,
//           email: userData.email,
//           phoneNumber: hashedPhone,
//           password: userData.password,
//           role: userData.role || UserRole.USER,
//           status: userData.status || UserStatus.PENDING_VERIFICATION,
//           isActive: userData.isActive !== undefined ? userData.isActive : true,
//           emailVerified: userData.emailVerified || false,
//           phoneVerified: userData.phoneVerified || false,
//           lastActivityAt: new Date(),
//           lastLoginAt: new Date(),
//         });

//         const savedUser = await transactionalEntityManager.save(user);

//         // Create KYC Data entity
//         const kycData = transactionalEntityManager.create(KycData, {
//           idNumber: userData.kycData.idNumber,
//           address: userData.kycData.address,
//           idLink: userData.kycData.idLink,
//           porLink: userData.kycData.porLink,
//           user: savedUser,
//         });

//         await transactionalEntityManager.save(kycData);

//         this.logger.log(`User registered successfully: ${user.email}`);
//         return true;
//       });
//     } catch (error) {
//       this.logger.error('Error completing registration:', error);
//       throw error;
//     }
//   }

//   async registerUserWithKyc(
//     sessionId: string,
//     firstName: string,
//     lastName: string,
//     email: string,
//     password: string,
//     confirmPassword: string,
//     idNumber: string,
//     address: string,
//     idDocument: MulterFile,
//     porDocument: MulterFile
//   ): Promise<boolean> {
//     try {
//       if (!this.validateEmail(email)) {
//         throw new Error('Please provide a valid email address');
//       }

//       if (password !== confirmPassword) {
//         throw new Error('Passwords do not match');
//       }

//       const phoneNumber = await this.sessionService.getPhoneNumberByAuthSession(sessionId);
//       if (!phoneNumber) {
//         throw new Error('Invalid session or session expired');
//       }

//       // Validate all fields
//       if (!firstName || !lastName || !email || !password || !idNumber || !address || !idDocument || !porDocument) {
//         throw new Error('All fields are required');
//       }

//       // Validate password strength
//       if (!this.validatePasswordStrength(password)) {
//         throw new Error('Password must be at least 10 characters long and contain a number, uppercase, lowercase, and special character with no more than 3 repetitive characters');
//       }

//       const hashedPhone = await this.hashPhoneNumber(phoneNumber);

//       const existingUser = await this.userRepository.findOne({
//         where: [
//           { email },
//           { phoneNumber: hashedPhone }, // ← Already using hashed phone
//           { kycData: { idNumber } }
//         ],
//         relations: ['kycData']
//       });

//       if (existingUser) {
//         if (existingUser.email === email) throw new Error('Email already registered');
//         if (existingUser.phoneNumber === hashedPhone) throw new Error('Phone number already registered');
//         if (existingUser.kycData?.idNumber === idNumber) throw new Error('ID number already registered');
//       }

//       return await this.userRepository.manager.transaction(async transactionalEntityManager => {
//         const idLink = this.saveDocument(idDocument, phoneNumber, 'ID');
//         const porLink = this.saveDocument(porDocument, phoneNumber, 'POR');

//         if (!idNumber || !address || !idLink || !porLink) {
//             throw new Error('All KYC fields are required');
//         }

//         const newUser = this.userRepository.create({
//           firstName,
//           lastName,
//           email,
//           phoneNumber: hashedPhone, 
//           password: password, 
//           kycData: {
//             idNumber,
//             address,
//             idLink,
//             porLink
//           }
//         });

//         await transactionalEntityManager.save(newUser);
//         return this.sessionService.verifyAuthSession(sessionId);
//       });
//     } catch (error) {
//       this.logger.error('Error registering user with KYC', error);
//       throw error;
//     }
//   }

//   /**
//    * Get user by phone number with configurable relations
//    * @param phoneNumber - The phone number to search for
//    * @param options - Additional options for the query
//    * @returns User object with specified relations or null if not found
//    */
//   async getUserByPhone(
//     phoneNumber: string, 
//     options: { 
//       includeKyc?: boolean; 
//       includeSessions?: boolean;
//       selectFields?: (keyof User)[];
//     } = {}
//   ): Promise<User | null> {
//     try {
//       this.logger.debug(`Getting user by phone: ${phoneNumber}`, { options });
      
//       const hashedPhone = await this.hashPhoneNumber(phoneNumber);
      
//       // Build relations array based on options
//       const relations: string[] = [];
//       if (options.includeKyc) {
//         relations.push('kycData');
//       }
//       if (options.includeSessions) {
//         relations.push('sessions');
//       }

//       // Build query
//       const queryOptions: any = {
//         where: { phoneNumber: hashedPhone }
//       };

//       if (relations.length > 0) {
//         queryOptions.relations = relations;
//       }

//       if (options.selectFields && options.selectFields.length > 0) {
//         queryOptions.select = options.selectFields.reduce((acc, field) => {
//           acc[field] = true;
//           return acc;
//         }, {} as any);
//       }

//       const user = await this.userRepository.findOne(queryOptions);

//       if (!user) {
//         this.logger.debug(`User not found for phone: ${phoneNumber}`);
//         return null;
//       }

//       // Don't log sensitive information
//       this.logger.debug(`User found: ${user.email} (ID: ${user.id}, Status: ${user.status})`);
//       return user;
//     } catch (error) {
//       this.logger.error(`Error getting user by phone ${phoneNumber}:`, error);
//       throw new Error('Failed to retrieve user information');
//     }
//   }

//   /**
//    * Get user profile by phone number (safe for external use)
//    * @param phoneNumber - The phone number to search for
//    * @returns User profile without sensitive data or null if not found
//    */
//   async getUserProfileByPhone(phoneNumber: string): Promise<any | null> {
//     try {
//       const user = await this.getUserByPhone(phoneNumber, {
//         includeKyc: true,
//         selectFields: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'role', 'status', 'isActive', 'lastActivityAt', 'lastLoginAt']
//       });

//       if (!user) {
//         return null;
//       }

//       // Return safe user profile data
//       return {
//         id: user.id,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         email: user.email,
//         phoneNumber: user.phoneNumber,
//         role: user.role,
//         status: user.status,
//         isActive: user.isActive,
//         lastActivityAt: user.lastActivityAt,
//         lastLoginAt: user.lastLoginAt,
//         kycData: user.kycData ? {
//           idNumber: user.kycData.idNumber,
//           address: user.kycData.address,
//         } : undefined // Use undefined instead of null
//       };
//     } catch (error) {
//       this.logger.error(`Error getting user profile by phone ${phoneNumber}:`, error);
//       throw new Error('Failed to retrieve user profile');
//     }
//   }

//   /**
//    * Check if user exists and is active by phone number
//    * @param phoneNumber - The phone number to check
//    * @returns Boolean indicating if user exists and is active
//    */
//   async isUserActive(phoneNumber: string): Promise<boolean> {
//     try {
//       const user = await this.getUserByPhone(phoneNumber, {
//         selectFields: ['id', 'isActive', 'status']
//       });
      
//       return !!(user && user.isActive && user.status === UserStatus.ACTIVE);
//     } catch (error) {
//       this.logger.error(`Error checking if user is active for phone ${phoneNumber}:`, error);
//       return false;
//     }
//   }

//   /**
//    * Get user status by phone number
//    * @param phoneNumber - The phone number to check
//    * @returns User status information
//    */
//   async getUserStatus(phoneNumber: string): Promise<{ 
//     exists: boolean; 
//     isActive: boolean; 
//     status: UserStatus | null;
//     isVerified: boolean;
//   }> {
//     try {
//       const user = await this.getUserByPhone(phoneNumber, {
//         selectFields: ['id', 'isActive', 'status', 'emailVerified', 'phoneVerified']
//       });

//       if (!user) {
//         return {
//           exists: false,
//           isActive: false,
//           status: null,
//           isVerified: false
//         };
//       }

//       return {
//         exists: true,
//         isActive: user.isActive,
//         status: user.status,
//         isVerified: user.emailVerified && user.phoneVerified
//       };
//     } catch (error) {
//       this.logger.error(`Error getting user status for phone ${phoneNumber}:`, error);
//       throw new Error('Failed to retrieve user status');
//     }
//   }

//   async login(phoneNumber: string, password: string): Promise<User | null> {
//     try {
//       this.logger.debug(`Login attempt for phone: ${phoneNumber}, ${password}`);
      
//       const hashedPhone = await this.hashPhoneNumber(phoneNumber);
//       this.logger.debug(`Hashed phone: ${hashedPhone}`);
      
//       const user = await this.userRepository.findOne({ 
//         where: { phoneNumber: hashedPhone }, 
//         relations: ['kycData'] 
//       });
      
//       if (!user) {
//         this.logger.warn(`Login failed: User not found for phone ${phoneNumber}`);
//         return null;
//       }

//       this.logger.debug(`Found user: ${user.email}, checking password...`);
      
//       // DEBUG: Log the actual password comparison
//       this.logger.debug(`Input password: [${password}]`);
//       this.logger.debug(`Stored password hash: [${user.password}]`);
      
//       const isPasswordValid = await bcrypt.compare(password, user.password);
      
//       this.logger.debug(`Password comparison result: ${isPasswordValid}`);
      
//       if (!isPasswordValid) {
//         this.logger.warn(`Login failed: Invalid password for user ${user.email}`);
//         return null;
//       }

//       this.logger.log(`Login successful for user ${user.email}`);
//       return user;
//     } catch (error) {
//       this.logger.error('Login error', error);
//       throw new Error('Login failed');
//     }
//   }

//   async loginByEmail(email: string, password: string): Promise<User | null> {
//     try {
//       this.logger.debug(`Email login attempt for: ${email}`);
      
//       const user = await this.userRepository.findOne({ 
//         where: { email }, 
//         relations: ['kycData'] 
//       });
      
//       if (!user) {
//         this.logger.warn(`Login failed: User not found for email ${email}`);
//         return null;
//       }

//       this.logger.debug(`Found user with phone: ${user.phoneNumber}, checking password...`);
      
//       // DEBUG: Log the actual password comparison
//       this.logger.debug(`Input password: [${password}]`);
//       this.logger.debug(`Stored password hash: [${user.password}]`);
      
//       const isPasswordValid = await bcrypt.compare(password, user.password);
      
//       this.logger.debug(`Password comparison result: ${isPasswordValid}`);
      
//       if (!isPasswordValid) {
//         this.logger.warn(`Login failed: Invalid password for user ${email}`);
//         return null;
//       }

//       this.logger.log(`Login successful for user ${email}`);
//       return user;
//     } catch (error) {
//       this.logger.error('Login by email error', error);
//       throw new Error('Login failed');
//     }
//   }

//   async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
//     try {
//       const user = await this.userRepository.findOne({ where: { id: userId } });
//       if (!user) throw new Error('User not found');

//       // Use bcrypt.compare directly to avoid User entity hook issues
//       const isValid = await bcrypt.compare(currentPassword, user.password);
//       if (!isValid) throw new Error('Current password is incorrect');

//       if (!this.validatePasswordStrength(newPassword)) {
//         throw new Error('Password must be at least 8 characters long and contain a number, uppercase, and lowercase letter');
//       }

//       // Set plain password - User entity @BeforeUpdate will hash it
//       user.password = newPassword;
//       await this.userRepository.save(user);
//       return true;
//     } catch (error) {
//       this.logger.error('Password change error', error);
//       throw error;
//     }
//   }

//   async resetPassword(token: string, newPassword: string): Promise<boolean> {
//       try {
//         const user = await this.userRepository.findOne({ 
//           where: { 
//             passwordResetToken: token,
//             passwordResetExpires: MoreThan(new Date()) // Check if expiration date is in the future
//           } 
//         });

//         if (!user) throw new Error('Invalid or expired token');

//         if (!this.validatePasswordStrength(newPassword)) {
//           throw new Error('Password must be at least 8 characters long and contain a number, uppercase, and lowercase letter');
//         }

//         // Set plain password - User entity @BeforeUpdate will hash it
//         user.password = newPassword;
//         user.passwordResetToken = null;
//         user.passwordResetExpires = null;
//         await this.userRepository.save(user);
//         return true;
//       } catch (error) {
//         this.logger.error('Password reset error', error);
//         throw error;
//       }
//   }

//   // Update the requestPasswordReset method to properly type the where clause
//   async requestPasswordReset(email: string): Promise<string> {
//       try {
//         const user = await this.userRepository.findOne({ where: { email } });
//         if (!user) throw new Error('Email not found');

//         const token = crypto.randomBytes(32).toString('hex');
//         user.passwordResetToken = token;
//         user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
//         await this.userRepository.save(user);

//         return token;
//       } catch (error) {
//         this.logger.error('Password reset request error', error);
//         throw error;
//       }
//   }

//   async startAuthenticationFlow(phoneNumber: string): Promise<string> {
//     const sessionId = this.sessionService.createAuthSession(phoneNumber);
//     return `${process.env.AUTH_BASE_URL}/auth/whatsapp?session=${sessionId}&phone=${encodeURIComponent(phoneNumber)}`;
//   }

//   async verifyAuthentication(sessionId: string): Promise<boolean> {
//     return this.sessionService.verifyAuthSession(sessionId);
//   }

//   private validateEmail(email: string): boolean {
//     const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return re.test(email);
//   }

//   private validatePasswordStrength(password: string): boolean {
//     // At least 10 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char, no more than 3 repetitive chars
//     const re = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{10,}$/;
//     if (!re.test(password)) return false;
    
//     // Check for more than 3 repetitive characters
//     return !/(.)\1\1\1/.test(password);
//   }

//   // ADD THIS METHOD FOR DEBUGGING
//   async debugUserPassword(identifier: string): Promise<void> {
//     try {
//       let user: User | null = null;
      
//       if (this.validateEmail(identifier)) {
//         user = await this.userRepository.findOne({ where: { email: identifier } });
//       } else {
//         const hashedPhone = await this.hashPhoneNumber(identifier);
//         user = await this.userRepository.findOne({ where: { phoneNumber: hashedPhone } });
//       }
      
//       if (user) {
//         this.logger.debug(`DEBUG - User: ${user.email}`);
//         this.logger.debug(`DEBUG - Phone: ${user.phoneNumber}`);
//         this.logger.debug(`DEBUG - Password Hash: ${user.password}`);
//         this.logger.debug(`DEBUG - Password Length: ${user.password?.length}`);
//       } else {
//         this.logger.debug(`DEBUG - User not found for identifier: ${identifier}`);
//       }
//     } catch (error) {
//       this.logger.error('Debug error:', error);
//     }
//   }
// }

// // import { Injectable, Logger } from '@nestjs/common';
// // import { InjectRepository } from '@nestjs/typeorm';
// // import { Repository, MoreThan, EntityManager } from 'typeorm';
// // import {  User, UserRole, UserStatus } from '../database/user.entity';
// // import { KycData } from '../database/kyc.entity';
// // import { SessionService } from '../whatsapp/services/session';
// // import * as bcrypt from 'bcrypt';
// // import * as crypto from 'crypto';
// // import { join } from 'path';
// // import { existsSync, mkdirSync, writeFileSync } from 'fs';

// // interface MulterFile {
// //     fieldname: string;
// //     originalName: string;
// //     encoding: string;
// //     mimetype: string;
// //     buffer: string;
// //     size: string;
// // }

// // @Injectable()
// // export class AuthService {
// //   private readonly logger = new Logger(AuthService.name);
// //   private readonly UPLOAD_DIR = join(__dirname, '../../uploads');
// //   private readonly ID_DIR = join(this.UPLOAD_DIR, 'IDs');
// //   private readonly POR_DIR = join(this.UPLOAD_DIR, 'POR');
// //   private readonly phoneHashSalt: string;
// //   private readonly LOGIN_SESSION_TTL = 60 * 60 * 1000; // 1Hour

// //   constructor(
// //     private readonly sessionService: SessionService,
// //     @InjectRepository(User)
// //     private userRepository: Repository<User>, 
// //     @InjectRepository(KycData) // Add this repository
// //     private readonly kycRepository: Repository<KycData>,
// //     private readonly entityManager: EntityManager,
// //   ) {
// //     this.ensureUploadDirs();
// //     this.phoneHashSalt = process.env.PHONE_HASH_SALT || this.generateSecureSalt();
// //   }

// //   private generateSecureSalt(): string {
// //     return crypto.randomBytes(32).toString('hex');
// //   }

// //   private ensureUploadDirs() {
// //     if (!existsSync(this.UPLOAD_DIR)) {
// //       mkdirSync(this.UPLOAD_DIR);
// //     }
// //     if (!existsSync(this.ID_DIR)) {
// //       mkdirSync(this.ID_DIR);
// //     }
// //     if (!existsSync(this.POR_DIR)) {
// //       mkdirSync(this.POR_DIR);
// //     }
// //   }

// //   private saveDocument(file: Express.Multer.File, phoneNumber: string, type: 'ID' | 'POR'): string {
// //     const ext = file.originalname.split('.').pop();
// //     const prefix = type === 'ID' ? 'id_document' : 'proof_of_residence';
// //     const filename = `${prefix}_${phoneNumber}_${Date.now()}.${ext}`;
// //     const dir = type === 'ID' ? this.ID_DIR : this.POR_DIR;
// //     const path = join(dir, filename);
    
// //     writeFileSync(path, file.buffer);
// //     return `C:/Users/ACER/Documents/CourseGenerator/chatbot/uploads/${type === 'ID' ? 'IDs' : 'POR'}/${filename}`;
// //   }

// //   async findUserByPhone(phoneNumber: string): Promise<User | null> {
// //     try {
// //       const hashedPhone = await this.hashPhoneNumber(phoneNumber);
// //       return await this.userRepository.findOne({ 
// //         where: { phoneNumber: hashedPhone } 
// //       });
// //     } catch (error) {
// //       this.logger.debug(`User not found for phone: ${phoneNumber}`);
// //       return null;
// //     }
// //   }

// //   async isUserRegistered(phoneNumber: string): Promise<boolean> {
// //     try {
// //       const hashedPhone = await this.hashPhoneNumber(phoneNumber);
// //       const count = await this.userRepository.count({ where: { phoneNumber: hashedPhone } });
// //       return count > 0;
// //     } catch (error) {
// //       this.logger.error('Database error checking user registration', error);
// //       throw new Error('Failed to check user registration');
// //     }
// //   }

// //   async hashPassword(password: string): Promise<string> {
// //     const saltRounds = 12;
// //     return await bcrypt.hash(password, saltRounds);
// //   }

// //   async hashPhoneNumber(phoneNumber: string): Promise<string> {
// //     try {
// //       if (!phoneNumber) {
// //         throw new Error('Phone number is required for hashing');
// //       }
      
// //       const normalizedPhone = phoneNumber.replace(/\D/g, '');
      
// //       if (!this.phoneHashSalt) {
// //         throw new Error('Phone hash salt is not configured');
// //       }
      
// //       return crypto
// //         .createHmac('sha256', this.phoneHashSalt)
// //         .update(normalizedPhone)
// //         .digest('hex');
// //     } catch (error) {
// //       this.logger.error('Phone number hashing failed', error);
// //       throw new Error('Failed to hash phone number');
// //     }
// //   }

// //   async completeRegistration(userData: any): Promise<boolean> {
// //     try {
// //       // Validate required fields for User entity
// //       const userRequiredFields = ['firstName', 'lastName', 'email', 'phoneNumber', 'password'];
// //       const missingUserFields = userRequiredFields.filter(field => !userData[field]);
      
// //       if (missingUserFields.length > 0) {
// //         throw new Error(`Missing required user fields: ${missingUserFields.join(', ')}`);
// //       }

// //       // Validate required fields for KYC data
// //       const kycRequiredFields = ['idNumber', 'address', 'idLink', 'porLink'];
// //       const missingKycFields = kycRequiredFields.filter(field => !userData.kycData?.[field]);
      
// //       if (missingKycFields.length > 0) {
// //         throw new Error(`Missing required KYC fields: ${missingKycFields.join(', ')}`);
// //       }

// //       const hashedPhone = await this.hashPhoneNumber(userData.phoneNumber);

// //       const existingUser = await this.entityManager.findOne(User, {
// //         where: [
// //           { email: userData.email },
// //           { phoneNumber: hashedPhone } 
// //         ],
// //         relations: ['kycData']
// //       });

// //       if (existingUser) {
// //         if (existingUser.email === userData.email) throw new Error('Email already registered');
// //         if (existingUser.phoneNumber === hashedPhone) throw new Error('Phone number already registered');
// //       }

// //       const existingKyc = await this.entityManager.findOne(KycData, {
// //         where: { idNumber: userData.kycData.idNumber }
// //       });

// //       if (existingKyc) {
// //         throw new Error('ID number already registered');
// //       }

// //       return await this.entityManager.transaction(async (transactionalEntityManager) => {
// //         const user = transactionalEntityManager.create(User, {
// //           firstName: userData.firstName,
// //           lastName: userData.lastName,
// //           email: userData.email,
// //           phoneNumber: hashedPhone,
// //           password: userData.password,
// //           role: userData.role || UserRole.USER,
// //           status: userData.status || UserStatus.PENDING_VERIFICATION,
// //           isActive: userData.isActive !== undefined ? userData.isActive : true,
// //           emailVerified: userData.emailVerified || false,
// //           phoneVerified: userData.phoneVerified || false,
// //           lastActivityAt: new Date(),
// //           lastLoginAt: new Date(),
// //         });

// //         const savedUser = await transactionalEntityManager.save(user);

// //         // Create KYC Data entity
// //         const kycData = transactionalEntityManager.create(KycData, {
// //           idNumber: userData.kycData.idNumber,
// //           address: userData.kycData.address,
// //           idLink: userData.kycData.idLink,
// //           porLink: userData.kycData.porLink,
// //           user: savedUser,
// //         });

// //         await transactionalEntityManager.save(kycData);

// //         this.logger.log(`User registered successfully: ${user.email}`);
// //         return true;
// //       });
// //     } catch (error) {
// //       this.logger.error('Error completing registration:', error);
// //       throw error;
// //     }
// //   }

// //   async registerUserWithKyc(
// //     sessionId: string,
// //     firstName: string,
// //     lastName: string,
// //     email: string,
// //     password: string,
// //     confirmPassword: string,
// //     idNumber: string,
// //     address: string,
// //     idDocument: Express.Multer.File,
// //     porDocument: Express.Multer.File
// //   ): Promise<boolean> {
// //     try {
// //       if (!this.validateEmail(email)) {
// //         throw new Error('Please provide a valid email address');
// //       }

// //       if (password !== confirmPassword) {
// //         throw new Error('Passwords do not match');
// //       }

// //       const phoneNumber = await this.sessionService.getPhoneNumberBySession(sessionId);
// //       if (!phoneNumber) {
// //         throw new Error('Invalid session or session expired');
// //       }

// //       // Validate all fields
// //       if (!firstName || !lastName || !email || !password || !idNumber || !address || !idDocument || !porDocument) {
// //         throw new Error('All fields are required');
// //       }

// //       // Validate password strength
// //       if (!this.validatePasswordStrength(password)) {
// //         throw new Error('Password must be at least 10 characters long and contain a number, uppercase, lowercase, and special character with no more than 3 repetitive characters');
// //       }

// //       const hashedPhone = await this.hashPhoneNumber(phoneNumber);

// //       const existingUser = await this.userRepository.findOne({
// //         where: [
// //           { email },
// //           { phoneNumber: hashedPhone }, // ← Already using hashed phone
// //           { kycData: { idNumber } }
// //         ],
// //         relations: ['kycData']
// //       });

// //       if (existingUser) {
// //         if (existingUser.email === email) throw new Error('Email already registered');
// //         if (existingUser.phoneNumber === hashedPhone) throw new Error('Phone number already registered');
// //         if (existingUser.kycData?.idNumber === idNumber) throw new Error('ID number already registered');
// //       }

// //       return await this.userRepository.manager.transaction(async transactionalEntityManager => {
// //         const idLink = this.saveDocument(idDocument, phoneNumber, 'ID');
// //         const porLink = this.saveDocument(porDocument, phoneNumber, 'POR');

// //         if (!idNumber || !address || !idLink || !porLink) {
// //             throw new Error('All KYC fields are required');
// //         }

// //         const newUser = this.userRepository.create({
// //           firstName,
// //           lastName,
// //           email,
// //           phoneNumber: hashedPhone, 
// //           password: password, 
// //           kycData: {
// //             idNumber,
// //             address,
// //             idLink,
// //             porLink
// //           }
// //         });

// //         await transactionalEntityManager.save(newUser);
// //         return this.sessionService.verifySession(sessionId);
// //       });
// //     } catch (error) {
// //       this.logger.error('Error registering user with KYC', error);
// //       throw error;
// //     }
// //   }

// //   /**
// //    * Get user by phone number with configurable relations
// //    * @param phoneNumber - The phone number to search for
// //    * @param options - Additional options for the query
// //    * @returns User object with specified relations or null if not found
// //    */
// //   async getUserByPhone(
// //     phoneNumber: string, 
// //     options: { 
// //       includeKyc?: boolean; 
// //       includeSessions?: boolean;
// //       selectFields?: (keyof User)[];
// //     } = {}
// //   ): Promise<User | null> {
// //     try {
// //       this.logger.debug(`Getting user by phone: ${phoneNumber}`, { options });
      
// //       const hashedPhone = await this.hashPhoneNumber(phoneNumber);
      
// //       // Build relations array based on options
// //       const relations: string[] = [];
// //       if (options.includeKyc) {
// //         relations.push('kycData');
// //       }
// //       if (options.includeSessions) {
// //         relations.push('sessions');
// //       }

// //       // Build query
// //       const queryOptions: any = {
// //         where: { phoneNumber: hashedPhone }
// //       };

// //       if (relations.length > 0) {
// //         queryOptions.relations = relations;
// //       }

// //       if (options.selectFields && options.selectFields.length > 0) {
// //         queryOptions.select = options.selectFields.reduce((acc, field) => {
// //           acc[field] = true;
// //           return acc;
// //         }, {} as any);
// //       }

// //       const user = await this.userRepository.findOne(queryOptions);

// //       if (!user) {
// //         this.logger.debug(`User not found for phone: ${phoneNumber}`);
// //         return null;
// //       }

// //       // Don't log sensitive information
// //       this.logger.debug(`User found: ${user.email} (ID: ${user.id}, Status: ${user.status})`);
// //       return user;
// //     } catch (error) {
// //       this.logger.error(`Error getting user by phone ${phoneNumber}:`, error);
// //       throw new Error('Failed to retrieve user information');
// //     }
// //   }

// //   /**
// //    * Get user profile by phone number (safe for external use)
// //    * @param phoneNumber - The phone number to search for
// //    * @returns User profile without sensitive data or null if not found
// //    */
// //   async getUserProfileByPhone(phoneNumber: string): Promise<any | null> {
// //     try {
// //       const user = await this.getUserByPhone(phoneNumber, {
// //         includeKyc: true,
// //         selectFields: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'role', 'status', 'isActive', 'lastActivityAt', 'lastLoginAt']
// //       });

// //       if (!user) {
// //         return null;
// //       }

// //       // Return safe user profile data
// //       return {
// //         id: user.id,
// //         firstName: user.firstName,
// //         lastName: user.lastName,
// //         email: user.email,
// //         phoneNumber: user.phoneNumber,
// //         role: user.role,
// //         status: user.status,
// //         isActive: user.isActive,
// //         lastActivityAt: user.lastActivityAt,
// //         lastLoginAt: user.lastLoginAt,
// //         kycData: user.kycData ? {
// //           idNumber: user.kycData.idNumber,
// //           address: user.kycData.address,
// //         } : undefined // Use undefined instead of null
// //       };
// //     } catch (error) {
// //       this.logger.error(`Error getting user profile by phone ${phoneNumber}:`, error);
// //       throw new Error('Failed to retrieve user profile');
// //     }
// //   }

// //   /**
// //    * Check if user exists and is active by phone number
// //    * @param phoneNumber - The phone number to check
// //    * @returns Boolean indicating if user exists and is active
// //    */
// //   async isUserActive(phoneNumber: string): Promise<boolean> {
// //     try {
// //       const user = await this.getUserByPhone(phoneNumber, {
// //         selectFields: ['id', 'isActive', 'status']
// //       });
      
// //       return !!(user && user.isActive && user.status === UserStatus.ACTIVE);
// //     } catch (error) {
// //       this.logger.error(`Error checking if user is active for phone ${phoneNumber}:`, error);
// //       return false;
// //     }
// //   }

// //   /**
// //    * Get user status by phone number
// //    * @param phoneNumber - The phone number to check
// //    * @returns User status information
// //    */
// //   async getUserStatus(phoneNumber: string): Promise<{ 
// //     exists: boolean; 
// //     isActive: boolean; 
// //     status: UserStatus | null;
// //     isVerified: boolean;
// //   }> {
// //     try {
// //       const user = await this.getUserByPhone(phoneNumber, {
// //         selectFields: ['id', 'isActive', 'status', 'emailVerified', 'phoneVerified']
// //       });

// //       if (!user) {
// //         return {
// //           exists: false,
// //           isActive: false,
// //           status: null,
// //           isVerified: false
// //         };
// //       }

// //       return {
// //         exists: true,
// //         isActive: user.isActive,
// //         status: user.status,
// //         isVerified: user.emailVerified && user.phoneVerified
// //       };
// //     } catch (error) {
// //       this.logger.error(`Error getting user status for phone ${phoneNumber}:`, error);
// //       throw new Error('Failed to retrieve user status');
// //     }
// //   }

// //   async login(phoneNumber: string, password: string): Promise<User | null> {
// //     try {
// //       this.logger.debug(`Login attempt for phone: ${phoneNumber}, ${password}`);
      
// //       const hashedPhone = await this.hashPhoneNumber(phoneNumber);
// //       this.logger.debug(`Hashed phone: ${hashedPhone}`);
      
// //       const user = await this.userRepository.findOne({ 
// //         where: { phoneNumber: hashedPhone }, 
// //         relations: ['kycData'] 
// //       });
      
// //       if (!user) {
// //         this.logger.warn(`Login failed: User not found for phone ${phoneNumber}`);
// //         return null;
// //       }

// //       this.logger.debug(`Found user: ${user.email}, checking password...`);
      
// //       // DEBUG: Log the actual password comparison
// //       this.logger.debug(`Input password: [${password}]`);
// //       this.logger.debug(`Stored password hash: [${user.password}]`);
      
// //       const isPasswordValid = await bcrypt.compare(password, user.password);
      
// //       this.logger.debug(`Password comparison result: ${isPasswordValid}`);
      
// //       if (!isPasswordValid) {
// //         this.logger.warn(`Login failed: Invalid password for user ${user.email}`);
// //         return null;
// //       }

// //       this.logger.log(`Login successful for user ${user.email}`);
// //       return user;
// //     } catch (error) {
// //       this.logger.error('Login error', error);
// //       throw new Error('Login failed');
// //     }
// //   }

// //   async loginByEmail(email: string, password: string): Promise<User | null> {
// //     try {
// //       this.logger.debug(`Email login attempt for: ${email}`);
      
// //       const user = await this.userRepository.findOne({ 
// //         where: { email }, 
// //         relations: ['kycData'] 
// //       });
      
// //       if (!user) {
// //         this.logger.warn(`Login failed: User not found for email ${email}`);
// //         return null;
// //       }

// //       this.logger.debug(`Found user with phone: ${user.phoneNumber}, checking password...`);
      
// //       // DEBUG: Log the actual password comparison
// //       this.logger.debug(`Input password: [${password}]`);
// //       this.logger.debug(`Stored password hash: [${user.password}]`);
      
// //       const isPasswordValid = await bcrypt.compare(password, user.password);
      
// //       this.logger.debug(`Password comparison result: ${isPasswordValid}`);
      
// //       if (!isPasswordValid) {
// //         this.logger.warn(`Login failed: Invalid password for user ${email}`);
// //         return null;
// //       }

// //       this.logger.log(`Login successful for user ${email}`);
// //       return user;
// //     } catch (error) {
// //       this.logger.error('Login by email error', error);
// //       throw new Error('Login failed');
// //     }
// //   }

// //   async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
// //     try {
// //       const user = await this.userRepository.findOne({ where: { id: userId } });
// //       if (!user) throw new Error('User not found');

// //       // Use bcrypt.compare directly to avoid User entity hook issues
// //       const isValid = await bcrypt.compare(currentPassword, user.password);
// //       if (!isValid) throw new Error('Current password is incorrect');

// //       if (!this.validatePasswordStrength(newPassword)) {
// //         throw new Error('Password must be at least 8 characters long and contain a number, uppercase, and lowercase letter');
// //       }

// //       // Set plain password - User entity @BeforeUpdate will hash it
// //       user.password = newPassword;
// //       await this.userRepository.save(user);
// //       return true;
// //     } catch (error) {
// //       this.logger.error('Password change error', error);
// //       throw error;
// //     }
// //   }

// //   async resetPassword(token: string, newPassword: string): Promise<boolean> {
// //       try {
// //         const user = await this.userRepository.findOne({ 
// //           where: { 
// //             passwordResetToken: token,
// //             passwordResetExpires: MoreThan(new Date()) // Check if expiration date is in the future
// //           } 
// //         });

// //         if (!user) throw new Error('Invalid or expired token');

// //         if (!this.validatePasswordStrength(newPassword)) {
// //           throw new Error('Password must be at least 8 characters long and contain a number, uppercase, and lowercase letter');
// //         }

// //         // Set plain password - User entity @BeforeUpdate will hash it
// //         user.password = newPassword;
// //         user.passwordResetToken = null;
// //         user.passwordResetExpires = null;
// //         await this.userRepository.save(user);
// //         return true;
// //       } catch (error) {
// //         this.logger.error('Password reset error', error);
// //         throw error;
// //       }
// //   }

// //   // Update the requestPasswordReset method to properly type the where clause
// //   async requestPasswordReset(email: string): Promise<string> {
// //       try {
// //         const user = await this.userRepository.findOne({ where: { email } });
// //         if (!user) throw new Error('Email not found');

// //         const token = crypto.randomBytes(32).toString('hex');
// //         user.passwordResetToken = token;
// //         user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
// //         await this.userRepository.save(user);

// //         return token;
// //       } catch (error) {
// //         this.logger.error('Password reset request error', error);
// //         throw error;
// //       }
// //   }

// //   async startAuthenticationFlow(phoneNumber: string): Promise<string> {
// //     const sessionId = this.sessionService.createSession(phoneNumber);
// //     return `${process.env.AUTH_BASE_URL}/auth/whatsapp?session=${sessionId}&phone=${encodeURIComponent(phoneNumber)}`;
// //   }

// //   async verifyAuthentication(sessionId: string): Promise<boolean> {
// //     return this.sessionService.verifySession(sessionId);
// //   }

// //   private validateEmail(email: string): boolean {
// //     const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// //     return re.test(email);
// //   }

// //   private validatePasswordStrength(password: string): boolean {
// //     // At least 10 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char, no more than 3 repetitive chars
// //     const re = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{10,}$/;
// //     if (!re.test(password)) return false;
    
// //     // Check for more than 3 repetitive characters
// //     return !/(.)\1\1\1/.test(password);
// //   }

// //   // ADD THIS METHOD FOR DEBUGGING
// //   async debugUserPassword(identifier: string): Promise<void> {
// //     try {
// //       let user: User | null = null;
      
// //       if (this.validateEmail(identifier)) {
// //         user = await this.userRepository.findOne({ where: { email: identifier } });
// //       } else {
// //         const hashedPhone = await this.hashPhoneNumber(identifier);
// //         user = await this.userRepository.findOne({ where: { phoneNumber: hashedPhone } });
// //       }
      
// //       if (user) {
// //         this.logger.debug(`DEBUG - User: ${user.email}`);
// //         this.logger.debug(`DEBUG - Phone: ${user.phoneNumber}`);
// //         this.logger.debug(`DEBUG - Password Hash: ${user.password}`);
// //         this.logger.debug(`DEBUG - Password Length: ${user.password?.length}`);
// //       } else {
// //         this.logger.debug(`DEBUG - User not found for identifier: ${identifier}`);
// //       }
// //     } catch (error) {
// //       this.logger.error('Debug error:', error);
// //     }
// //   }
// // }

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, EntityManager } from 'typeorm';
import {  User, UserRole, UserStatus } from '../database/user.entity';
import { KycData } from '../database/kyc.entity';
import { SessionManagerService } from '../whatsapp/services/session-manager.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

// Define Multer File interface since Express.Multer.File is not available
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly UPLOAD_DIR = join(__dirname, '../../uploads');
  private readonly ID_DIR = join(this.UPLOAD_DIR, 'IDs');
  private readonly POR_DIR = join(this.UPLOAD_DIR, 'POR');
  private readonly phoneHashSalt: string;
  private readonly LOGIN_SESSION_TTL = 60 * 60 * 1000; // 1Hour

  constructor(
    private readonly sessionManager: SessionManagerService, // Changed from sessionService to sessionManager
    @InjectRepository(User)
    private userRepository: Repository<User>, 
    @InjectRepository(KycData)
    private readonly kycRepository: Repository<KycData>,
    private readonly entityManager: EntityManager,
  ) {
    this.ensureUploadDirs();
    this.phoneHashSalt = process.env.PHONE_HASH_SALT || this.generateSecureSalt();
  }

  private generateSecureSalt(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private ensureUploadDirs() {
    if (!existsSync(this.UPLOAD_DIR)) {
      mkdirSync(this.UPLOAD_DIR);
    }
    if (!existsSync(this.ID_DIR)) {
      mkdirSync(this.ID_DIR);
    }
    if (!existsSync(this.POR_DIR)) {
      mkdirSync(this.POR_DIR);
    }
  }

  private saveDocument(file: MulterFile, phoneNumber: string, type: 'ID' | 'POR'): string {
    const ext = file.originalname.split('.').pop();
    const prefix = type === 'ID' ? 'id_document' : 'proof_of_residence';
    const filename = `${prefix}_${phoneNumber}_${Date.now()}.${ext}`;
    const dir = type === 'ID' ? this.ID_DIR : this.POR_DIR;
    const path = join(dir, filename);
    
    writeFileSync(path, file.buffer);
    return `C:/Users/ACER/Documents/CourseGenerator/chatbot/uploads/${type === 'ID' ? 'IDs' : 'POR'}/${filename}`;
  }

  async findUserByPhone(phoneNumber: string): Promise<User | null> {
    try {
      const hashedPhone = await this.hashPhoneNumber(phoneNumber);
      return await this.userRepository.findOne({ 
        where: { phoneNumber: hashedPhone } 
      });
    } catch (error) {
      this.logger.debug(`User not found for phone: ${phoneNumber}`);
      return null;
    }
  }

  async isUserRegistered(phoneNumber: string): Promise<boolean> {
    try {
      const hashedPhone = await this.hashPhoneNumber(phoneNumber);
      const count = await this.userRepository.count({ where: { phoneNumber: hashedPhone } });
      return count > 0;
    } catch (error) {
      this.logger.error('Database error checking user registration', error);
      throw new Error('Failed to check user registration');
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  async hashPhoneNumber(phoneNumber: string): Promise<string> {
    try {
      if (!phoneNumber) {
        throw new Error('Phone number is required for hashing');
      }
      
      const normalizedPhone = phoneNumber.replace(/\D/g, '');
      
      if (!this.phoneHashSalt) {
        throw new Error('Phone hash salt is not configured');
      }
      
      return crypto
        .createHmac('sha256', this.phoneHashSalt)
        .update(normalizedPhone)
        .digest('hex');
    } catch (error) {
      this.logger.error('Phone number hashing failed', error);
      throw new Error('Failed to hash phone number');
    }
  }

  async completeRegistration(userData: any): Promise<boolean> {
    try {
      // Validate required fields for User entity
      const userRequiredFields = ['firstName', 'lastName', 'email', 'phoneNumber', 'password'];
      const missingUserFields = userRequiredFields.filter(field => !userData[field]);
      
      if (missingUserFields.length > 0) {
        throw new Error(`Missing required user fields: ${missingUserFields.join(', ')}`);
      }

      // Validate required fields for KYC data
      const kycRequiredFields = ['idNumber', 'address', 'idLink', 'porLink'];
      const missingKycFields = kycRequiredFields.filter(field => !userData.kycData?.[field]);
      
      if (missingKycFields.length > 0) {
        throw new Error(`Missing required KYC fields: ${missingKycFields.join(', ')}`);
      }

      const hashedPhone = await this.hashPhoneNumber(userData.phoneNumber);

      const existingUser = await this.entityManager.findOne(User, {
        where: [
          { email: userData.email },
          { phoneNumber: hashedPhone } 
        ],
        relations: ['kycData']
      });

      if (existingUser) {
        if (existingUser.email === userData.email) throw new Error('Email already registered');
        if (existingUser.phoneNumber === hashedPhone) throw new Error('Phone number already registered');
      }

      const existingKyc = await this.entityManager.findOne(KycData, {
        where: { idNumber: userData.kycData.idNumber }
      });

      if (existingKyc) {
        throw new Error('ID number already registered');
      }

      return await this.entityManager.transaction(async (transactionalEntityManager) => {
        const user = transactionalEntityManager.create(User, {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phoneNumber: hashedPhone,
          password: userData.password,
          role: userData.role || UserRole.USER,
          status: userData.status || UserStatus.PENDING_VERIFICATION,
          isActive: userData.isActive !== undefined ? userData.isActive : true,
          emailVerified: userData.emailVerified || false,
          phoneVerified: userData.phoneVerified || false,
          lastActivityAt: new Date(),
          lastLoginAt: new Date(),
        });

        const savedUser = await transactionalEntityManager.save(user);

        // Create KYC Data entity
        const kycData = transactionalEntityManager.create(KycData, {
          idNumber: userData.kycData.idNumber,
          address: userData.kycData.address,
          idLink: userData.kycData.idLink,
          porLink: userData.kycData.porLink,
          user: savedUser,
        });

        await transactionalEntityManager.save(kycData);

        this.logger.log(`User registered successfully: ${user.email}`);
        return true;
      });
    } catch (error) {
      this.logger.error('Error completing registration:', error);
      throw error;
    }
  }

  async registerUserWithKyc(
    sessionId: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    confirmPassword: string,
    idNumber: string,
    address: string,
    idDocument: MulterFile,
    porDocument: MulterFile
  ): Promise<boolean> {
    try {
      if (!this.validateEmail(email)) {
        throw new Error('Please provide a valid email address');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Use getPhoneNumberByAuthSession instead of getPhoneNumberBySession
      const phoneNumber = await this.sessionManager.getPhoneNumberByAuthSession(sessionId);
      if (!phoneNumber) {
        throw new Error('Invalid session or session expired');
      }

      // Validate all fields
      if (!firstName || !lastName || !email || !password || !idNumber || !address || !idDocument || !porDocument) {
        throw new Error('All fields are required');
      }

      // Validate password strength
      if (!this.validatePasswordStrength(password)) {
        throw new Error('Password must be at least 10 characters long and contain a number, uppercase, lowercase, and special character with no more than 3 repetitive characters');
      }

      const hashedPhone = await this.hashPhoneNumber(phoneNumber);

      const existingUser = await this.userRepository.findOne({
        where: [
          { email },
          { phoneNumber: hashedPhone },
          { kycData: { idNumber } }
        ],
        relations: ['kycData']
      });

      if (existingUser) {
        if (existingUser.email === email) throw new Error('Email already registered');
        if (existingUser.phoneNumber === hashedPhone) throw new Error('Phone number already registered');
        if (existingUser.kycData?.idNumber === idNumber) throw new Error('ID number already registered');
      }

      return await this.userRepository.manager.transaction(async transactionalEntityManager => {
        const idLink = this.saveDocument(idDocument, phoneNumber, 'ID');
        const porLink = this.saveDocument(porDocument, phoneNumber, 'POR');

        if (!idNumber || !address || !idLink || !porLink) {
            throw new Error('All KYC fields are required');
        }

        const newUser = this.userRepository.create({
          firstName,
          lastName,
          email,
          phoneNumber: hashedPhone, 
          password: password, 
          kycData: {
            idNumber,
            address,
            idLink,
            porLink
          }
        });

        await transactionalEntityManager.save(newUser);
        // Use verifyAuthSession instead of verifySession
        return this.sessionManager.verifyAuthSession(sessionId);
      });
    } catch (error) {
      this.logger.error('Error registering user with KYC', error);
      throw error;
    }
  }

  /**
   * Get user by phone number with configurable relations
   */
  async getUserByPhone(
    phoneNumber: string, 
    options: { 
      includeKyc?: boolean; 
      includeSessions?: boolean;
      selectFields?: (keyof User)[];
    } = {}
  ): Promise<User | null> {
    try {
      this.logger.debug(`Getting user by phone: ${phoneNumber}`, { options });
      
      const hashedPhone = await this.hashPhoneNumber(phoneNumber);
      
      const relations: string[] = [];
      if (options.includeKyc) {
        relations.push('kycData');
      }
      if (options.includeSessions) {
        relations.push('sessions');
      }

      const queryOptions: any = {
        where: { phoneNumber: hashedPhone }
      };

      if (relations.length > 0) {
        queryOptions.relations = relations;
      }

      if (options.selectFields && options.selectFields.length > 0) {
        queryOptions.select = options.selectFields.reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {} as any);
      }

      const user = await this.userRepository.findOne(queryOptions);

      if (!user) {
        this.logger.debug(`User not found for phone: ${phoneNumber}`);
        return null;
      }

      this.logger.debug(`User found: ${user.email} (ID: ${user.id}, Status: ${user.status})`);
      return user;
    } catch (error) {
      this.logger.error(`Error getting user by phone ${phoneNumber}:`, error);
      throw new Error('Failed to retrieve user information');
    }
  }

  /**
   * Get user profile by phone number (safe for external use)
   */
  async getUserProfileByPhone(phoneNumber: string): Promise<any | null> {
    try {
      const user = await this.getUserByPhone(phoneNumber, {
        includeKyc: true,
        selectFields: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'role', 'status', 'isActive', 'lastActivityAt', 'lastLoginAt']
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        status: user.status,
        isActive: user.isActive,
        lastActivityAt: user.lastActivityAt,
        lastLoginAt: user.lastLoginAt,
        kycData: user.kycData ? {
          idNumber: user.kycData.idNumber,
          address: user.kycData.address,
        } : undefined
      };
    } catch (error) {
      this.logger.error(`Error getting user profile by phone ${phoneNumber}:`, error);
      throw new Error('Failed to retrieve user profile');
    }
  }

  /**
   * Check if user exists and is active by phone number
   */
  async isUserActive(phoneNumber: string): Promise<boolean> {
    try {
      const user = await this.getUserByPhone(phoneNumber, {
        selectFields: ['id', 'isActive', 'status']
      });
      
      return !!(user && user.isActive && user.status === UserStatus.ACTIVE);
    } catch (error) {
      this.logger.error(`Error checking if user is active for phone ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Get user status by phone number
   */
  async getUserStatus(phoneNumber: string): Promise<{ 
    exists: boolean; 
    isActive: boolean; 
    status: UserStatus | null;
    isVerified: boolean;
  }> {
    try {
      const user = await this.getUserByPhone(phoneNumber, {
        selectFields: ['id', 'isActive', 'status', 'emailVerified', 'phoneVerified']
      });

      if (!user) {
        return {
          exists: false,
          isActive: false,
          status: null,
          isVerified: false
        };
      }

      return {
        exists: true,
        isActive: user.isActive,
        status: user.status,
        isVerified: user.emailVerified && user.phoneVerified
      };
    } catch (error) {
      this.logger.error(`Error getting user status for phone ${phoneNumber}:`, error);
      throw new Error('Failed to retrieve user status');
    }
  }

  async login(phoneNumber: string, password: string): Promise<User | null> {
    try {
      this.logger.debug(`Login attempt for phone: ${phoneNumber}, ${password}`);
      
      const hashedPhone = await this.hashPhoneNumber(phoneNumber);
      this.logger.debug(`Hashed phone: ${hashedPhone}`);
      
      const user = await this.userRepository.findOne({ 
        where: { phoneNumber: hashedPhone }, 
        relations: ['kycData'] 
      });
      
      if (!user) {
        this.logger.warn(`Login failed: User not found for phone ${phoneNumber}`);
        return null;
      }

      this.logger.debug(`Found user: ${user.email}, checking password...`);
      
      this.logger.debug(`Input password: [${password}]`);
      this.logger.debug(`Stored password hash: [${user.password}]`);
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      this.logger.debug(`Password comparison result: ${isPasswordValid}`);
      
      if (!isPasswordValid) {
        this.logger.warn(`Login failed: Invalid password for user ${user.email}`);
        return null;
      }

      this.logger.log(`Login successful for user ${user.email}`);
      return user;
    } catch (error) {
      this.logger.error('Login error', error);
      throw new Error('Login failed');
    }
  }

  async loginByEmail(email: string, password: string): Promise<User | null> {
    try {
      this.logger.debug(`Email login attempt for: ${email}`);
      
      const user = await this.userRepository.findOne({ 
        where: { email }, 
        relations: ['kycData'] 
      });
      
      if (!user) {
        this.logger.warn(`Login failed: User not found for email ${email}`);
        return null;
      }

      this.logger.debug(`Found user with phone: ${user.phoneNumber}, checking password...`);
      
      this.logger.debug(`Input password: [${password}]`);
      this.logger.debug(`Stored password hash: [${user.password}]`);
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      this.logger.debug(`Password comparison result: ${isPasswordValid}`);
      
      if (!isPasswordValid) {
        this.logger.warn(`Login failed: Invalid password for user ${email}`);
        return null;
      }

      this.logger.log(`Login successful for user ${email}`);
      return user;
    } catch (error) {
      this.logger.error('Login by email error', error);
      throw new Error('Login failed');
    }
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new Error('User not found');

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) throw new Error('Current password is incorrect');

      if (!this.validatePasswordStrength(newPassword)) {
        throw new Error('Password must be at least 8 characters long and contain a number, uppercase, and lowercase letter');
      }

      user.password = newPassword;
      await this.userRepository.save(user);
      return true;
    } catch (error) {
      this.logger.error('Password change error', error);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
      try {
        const user = await this.userRepository.findOne({ 
          where: { 
            passwordResetToken: token,
            passwordResetExpires: MoreThan(new Date())
          } 
        });

        if (!user) throw new Error('Invalid or expired token');

        if (!this.validatePasswordStrength(newPassword)) {
          throw new Error('Password must be at least 8 characters long and contain a number, uppercase, and lowercase letter');
        }

        user.password = newPassword;
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await this.userRepository.save(user);
        return true;
      } catch (error) {
        this.logger.error('Password reset error', error);
        throw error;
      }
  }

  async requestPasswordReset(email: string): Promise<string> {
      try {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) throw new Error('Email not found');

        const token = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = token;
        user.passwordResetExpires = new Date(Date.now() + 3600000);
        await this.userRepository.save(user);

        return token;
      } catch (error) {
        this.logger.error('Password reset request error', error);
        throw error;
      }
  }

  async startAuthenticationFlow(phoneNumber: string): Promise<string> {
    const sessionId = this.sessionManager.createAuthSession(phoneNumber);
    return `${process.env.AUTH_BASE_URL}/auth/whatsapp?session=${sessionId}&phone=${encodeURIComponent(phoneNumber)}`;
  }

  async verifyAuthentication(sessionId: string): Promise<boolean> {
    return this.sessionManager.isAuthSessionVerified(sessionId);
  }

  private validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  private validatePasswordStrength(password: string): boolean {
    const re = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{10,}$/;
    if (!re.test(password)) return false;
    
    return !/(.)\1\1\1/.test(password);
  }

  async debugUserPassword(identifier: string): Promise<void> {
    try {
      let user: User | null = null;
      
      if (this.validateEmail(identifier)) {
        user = await this.userRepository.findOne({ where: { email: identifier } });
      } else {
        const hashedPhone = await this.hashPhoneNumber(identifier);
        user = await this.userRepository.findOne({ where: { phoneNumber: hashedPhone } });
      }
      
      if (user) {
        this.logger.debug(`DEBUG - User: ${user.email}`);
        this.logger.debug(`DEBUG - Phone: ${user.phoneNumber}`);
        this.logger.debug(`DEBUG - Password Hash: ${user.password}`);
        this.logger.debug(`DEBUG - Password Length: ${user.password?.length}`);
      } else {
        this.logger.debug(`DEBUG - User not found for identifier: ${identifier}`);
      }
    } catch (error) {
      this.logger.error('Debug error:', error);
    }
  }
}