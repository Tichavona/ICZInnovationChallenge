import { Injectable } from '@nestjs/common';

@Injectable()
export class ValidationService {
  
  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   * Requirements:
   * - At least 10 characters
   * - At least 1 uppercase letter
   * - At least 1 lowercase letter
   * - At least 1 number
   * - At least 1 special character (@$!%*?&)
   */
  validatePassword(password: string): boolean {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;
    return passwordRegex.test(password);
  }

  /**
   * Validate ID number
   * Basic validation - can be customized per country
   */
  validateIdNumber(idNumber: string): boolean {
    return idNumber.length >= 6 && idNumber.length <= 20 && /^[a-zA-Z0-9-]+$/.test(idNumber);
  }

  /**
   * Validate phone number
   * Basic international format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid international number (10-15 digits)
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * Validate name
   */
  validateName(name: string): boolean {
    return name.length >= 2 && name.length <= 50 && /^[a-zA-Z\s-']+$/.test(name);
  }

  /**
   * Validate address
   */
  validateAddress(address: string): boolean {
    return address.length >= 5 && address.length <= 200;
  }

  /**
   * Validate location coordinates
   */
  validateLocation(latitude: number, longitude: number): boolean {
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  /**
   * Validate rating (1-5)
   */
  validateRating(rating: number): boolean {
    return Number.isInteger(rating) && rating >= 1 && rating <= 5;
  }

  /**
   * Validate emergency type
   */
  validateEmergencyType(type: string): boolean {
    const validTypes = ['FIRE', 'MEDICAL', 'CRIME', 'ACCIDENT', 'DISASTER', 'OTHER'];
    return validTypes.includes(type.toUpperCase());
  }

  /**
   * Validate issue type
   */
  validateIssueType(type: string): boolean {
    const validTypes = ['ROADS', 'WATER', 'SEWER', 'SANITATION', 'ELECTRICITY', 'OTHER'];
    return validTypes.includes(type.toUpperCase());
  }

  /**
   * Validate file MIME type for ID documents
   */
  validateIdDocumentMimeType(mimeType: string): boolean {
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    return validTypes.includes(mimeType);
  }

  /**
   * Validate file MIME type for proof of residence
   */
  validateProofOfResidenceMimeType(mimeType: string): boolean {
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv'
    ];
    return validTypes.includes(mimeType);
  }

  /**
   * Validate file size (in bytes)
   */
  validateFileSize(size: number, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return size <= maxSizeBytes;
  }

  /**
   * Validate session step
   */
  validateStep(step: number, maxStep: number): boolean {
    return step >= 1 && step <= maxStep;
  }

  /**
   * Validate report ID format
   */
  validateReportId(reportId: string): boolean {
    return /^\d+$/.test(reportId);
  }

  /**
   * Validate date
   */
  validateDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Validate future date
   */
  validateFutureDate(date: Date): boolean {
    return this.validateDate(date) && date > new Date();
  }

  /**
   * Validate past date
   */
  validatePastDate(date: Date): boolean {
    return this.validateDate(date) && date < new Date();
  }

  /**
   * Validate URL
   */
  validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate JSON string
   */
  validateJsonString(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate that value is not empty
   */
  isNotEmpty(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  /**
   * Validate length range
   */
  validateLength(value: string, min: number, max: number): boolean {
    return value.length >= min && value.length <= max;
  }

  /**
   * Validate numeric range
   */
  validateNumberRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  /**
   * Validate against regex pattern
   */
  validatePattern(value: string, pattern: RegExp): boolean {
    return pattern.test(value);
  }

  /**
   * Validate email domain
   */
  validateEmailDomain(email: string, allowedDomains: string[]): boolean {
    const domain = email.split('@')[1];
    return allowedDomains.includes(domain);
  }

  /**
   * Check if string contains only letters
   */
  isAlpha(value: string): boolean {
    return /^[a-zA-Z]+$/.test(value);
  }

  /**
   * Check if string contains only alphanumeric
   */
  isAlphanumeric(value: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(value);
  }

  /**
   * Sanitize input (remove potentially dangerous characters)
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/[&$%]/, '') // Remove special characters
      .trim();
  }

  /**
   * Mask sensitive data
   */
  maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars) return data;
    const masked = '*'.repeat(data.length - visibleChars);
    return masked + data.slice(-visibleChars);
  }
} 
