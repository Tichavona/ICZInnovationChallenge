/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private readonly baseDir = 'C:/Users/ACER/Documents/CourseGenerator/chatbot/uploads';
    private readonly idDir = join(this.baseDir, 'ids');
    private readonly porDir = join(this.baseDir, 'por');
    private readonly issueImagesDir = join(this.baseDir, 'issue_images');
    private readonly issueVoiceNotesDir = join(this.baseDir, 'issue_voice_notes');
    private readonly issueVideosDir = join(this.baseDir, 'issue_videos');

    constructor() {
        this.ensureDirs();
    }

    private ensureDirs() {
        try {
            if (!existsSync(this.baseDir)) mkdirSync(this.baseDir);
            if (!existsSync(this.idDir)) mkdirSync(this.idDir);
            if (!existsSync(this.porDir)) mkdirSync(this.porDir);
            if (!existsSync(this.issueImagesDir)) mkdirSync(this.issueImagesDir);
            if (!existsSync(this.issueVoiceNotesDir)) mkdirSync(this.issueVoiceNotesDir);
            if (!existsSync(this.issueVideosDir)) mkdirSync(this.issueVideosDir);
        } catch (error) {
            this.logger.error('Error creating storage directories', error);
            throw error;
        }
    }

    async saveMediaFile(phoneNumber: string, buffer: Buffer, filename: string, mediaType: 'image' | 'voice' | 'video'): Promise<string> {
        try {
            const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            
            let filePath: string;
            
            switch (mediaType) {
                case 'image':
                filePath = join(this.issueImagesDir, sanitizedFilename);
                break;
                case 'voice':
                filePath = join(this.issueVoiceNotesDir, sanitizedFilename);
                break;
                case 'video':
                filePath = join(this.issueVideosDir, sanitizedFilename);
                break;
                default:
                throw new Error(`Unsupported media type: ${mediaType}`);
            }
            
            writeFileSync(filePath, buffer);
            return filePath;
        } catch (error) {
            this.logger.error(`Error saving ${mediaType} file for ${phoneNumber}`, error);
            throw new Error(`Failed to save ${mediaType} file`);
        }
    }

    async saveIdDocument(phoneNumber: string, buffer: Buffer, filename: string): Promise<string> {
        try {
            const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = join(this.idDir, `${sanitizedFilename}`);
            
            writeFileSync(filePath, buffer);
            return filePath;
        } catch (error) {
            this.logger.error(`Error saving ID document for ${phoneNumber}`, error);
            throw new Error('Failed to save ID document');
        }
    }

    async saveProofOfResidence(phoneNumber: string, buffer: Buffer, filename: string): Promise<string> {
        try {
            const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = join(this.porDir, `${sanitizedFilename}`);
            
            writeFileSync(filePath, buffer);
            return filePath;
        } catch (error) {
            this.logger.error(`Error saving proof of residence for ${phoneNumber}`, error);
            throw new Error('Failed to save proof of residence');
        }
    }
} 
