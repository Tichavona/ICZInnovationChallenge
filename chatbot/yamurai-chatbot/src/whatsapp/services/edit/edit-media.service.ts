/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { MessagingService } from '../messaging/messaging.service';
import { StorageService } from '../storage.service';

export interface ProcessedMedia {
  type: 'image' | 'voice' | 'video' | 'document';
  url: string;
  mimeType: string;
  filename: string;
  size: number;
  timestamp: number;
}

@Injectable()
export class EditMediaService {
  private readonly logger = new Logger(EditMediaService.name);
  private readonly baseDir = 'C:/Users/ACER/Documents/CourseGenerator/chatbot/uploads';
  private readonly editMediaDir: string;

  constructor(
    private readonly messagingService: MessagingService,
    private readonly storageService: StorageService,
  ) {
    this.editMediaDir = join(this.baseDir, 'edit_media');
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    const dirs = [
      this.editMediaDir,
      join(this.editMediaDir, 'emergency'),
      join(this.editMediaDir, 'issue'),
    ];
    
    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        this.logger.log(`Created directory: ${dir}`);
      }
    });
  }

  /**
   * Handle media upload for edit
   */
  async handleMediaUpload(
    phoneNumber: string,
    message: any,
    reportId: number,
    reportType: 'EMERGENCY' | 'ISSUE'
  ): Promise<ProcessedMedia | null> {
    try {
      const mediaInfo = this.extractMediaInfo(message);
      
      if (!mediaInfo) {
        this.logger.warn('No media found in message');
        return null;
      }

      const { mediaId, mediaType, mimeType } = mediaInfo;

      // Get media from WhatsApp
      const mediaUrl = await this.messagingService.getMediaUrl(mediaId);
      const mediaBuffer = await this.messagingService.downloadMedia(mediaUrl);
      
      // Generate filename
      const extension = this.getFileExtensionFromMimeType(mimeType);
      const timestamp = Date.now();
      const filename = `edit_${mediaType}_${phoneNumber}_${timestamp}.${extension}`;
      
      // Save media
      const savedPath = await this.saveEditMedia(
        mediaBuffer,
        filename,
        reportId,
        reportType
      );

      // Create processed media object
      const processedMedia: ProcessedMedia = {
        type: mediaType,
        url: savedPath,
        mimeType,
        filename,
        size: mediaBuffer.length,
        timestamp
      };

      this.logger.log(`Media uploaded for edit: ${filename} (${mediaType})`);
      
      return processedMedia;

    } catch (error) {
      this.logger.error('Error handling media upload:', error);
      return null;
    }
  }

  /**
   * Extract media information from message
   */
  private extractMediaInfo(message: any): { mediaId: string; mediaType: 'image' | 'voice' | 'video' | 'document'; mimeType: string } | null {
    if (message.image) {
      return {
        mediaId: message.image.id,
        mediaType: 'image',
        mimeType: message.image.mime_type
      };
    } else if (message.audio) {
      return {
        mediaId: message.audio.id,
        mediaType: 'voice',
        mimeType: message.audio.mime_type
      };
    } else if (message.video) {
      return {
        mediaId: message.video.id,
        mediaType: 'video',
        mimeType: message.video.mime_type
      };
    } else if (message.document) {
      return {
        mediaId: message.document.id,
        mediaType: 'document',
        mimeType: message.document.mime_type
      };
    }
    
    return null;
  }

  /**
   * Save edit media to disk
   */
  async saveEditMedia(
    buffer: Buffer,
    filename: string,
    reportId: number,
    reportType: 'EMERGENCY' | 'ISSUE'
  ): Promise<string> {
    try {
      const reportDir = join(this.editMediaDir, reportType.toLowerCase(), reportId.toString());
      
      if (!existsSync(reportDir)) {
        mkdirSync(reportDir, { recursive: true });
      }

      const filePath = join(reportDir, filename);
      writeFileSync(filePath, buffer);

      return filePath;
    } catch (error) {
      this.logger.error('Error saving edit media:', error);
      throw error;
    }
  }

  /**
   * Validate media type for edit
   */
  validateMediaType(mimeType: string, reportType: 'EMERGENCY' | 'ISSUE'): boolean {
    const allowedTypes = {
      emergency: [
        'image/jpeg', 'image/png', 'image/gif',
        'audio/ogg', 'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr',
        'video/mp4', 'video/3gpp', 'video/quicktime'
      ],
      issue: [
        'image/jpeg', 'image/png', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'text/csv'
      ]
    };

    const types = reportType === 'EMERGENCY' ? allowedTypes.emergency : allowedTypes.issue;
    return types.includes(mimeType);
  }

  /**
   * Get file extension from MIME type
   */
  getFileExtensionFromMimeType(mimeType: string): string {
    const extensionMap: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'audio/ogg': 'ogg',
      'audio/aac': 'aac',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/amr': 'amr',
      'video/mp4': 'mp4',
      'video/3gpp': '3gp',
      'video/quicktime': 'mov',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/plain': 'txt',
      'text/csv': 'csv'
    };
    
    return extensionMap[mimeType] || 'bin';
  }

  /**
   * Get media file size in readable format
   */
  getReadableFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if media file is within size limits
   */
  isWithinSizeLimit(mimeType: string, size: number): boolean {
    const limits: { [key: string]: number } = {
      'image': 5 * 1024 * 1024, // 5MB
      'audio': 10 * 1024 * 1024, // 10MB
      'video': 16 * 1024 * 1024, // 16MB
      'document': 10 * 1024 * 1024, // 10MB
    };

    const type = mimeType.split('/')[0];
    const limit = limits[type] || 5 * 1024 * 1024;
    
    return size <= limit;
  }

  /**
   * Clean up old edit media files
   */
  async cleanupOldMedia(daysOld: number = 7): Promise<void> {
    try {
      const fs = require('fs');
      const path = require('path');
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;

      const cleanupDir = (dir: string) => {
        if (!existsSync(dir)) return;

        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            cleanupDir(filePath);
            
            // Remove empty directories
            if (fs.readdirSync(filePath).length === 0) {
              fs.rmdirSync(filePath);
            }
          } else if (now - stat.mtimeMs > maxAge) {
            fs.unlinkSync(filePath);
            this.logger.log(`Cleaned up old media file: ${filePath}`);
          }
        }
      };

      cleanupDir(this.editMediaDir);
    } catch (error) {
      this.logger.error('Error cleaning up old media:', error);
    }
  }
} 
