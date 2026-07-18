/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { Repository, FindOptionsWhere } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from '../../../database/message.entity';
import type { AxiosResponse } from 'axios';

export interface MessageData {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: string;
  text?: {
    preview_url: boolean;
    body: string;
  };
  interactive?: any;
  context?: {
    message_id: string;
  };
}

interface WhatsAppMediaResponse {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  id: string;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly API_TIMEOUT = 15000;
  private readonly MEDIA_TIMEOUT = 30000;

  // In-memory cache for last messages
  private readonly lastMessageCache = new Map<string, {
    message: string;
    timestamp: Date;
  }>();

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  /**
   * Send a text message via WhatsApp
   */
  async sendTextMessage(recipient: string, message: string, contextMessageId?: string): Promise<boolean> {
    try {
      const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
      const version = this.configService.get<string>('WHATSAPP_API_VERSION');
      const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

      if (!phoneNumberId || !version || !accessToken) {
        throw new Error('Missing WhatsApp configuration');
      }

      const messageData: MessageData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: {
          preview_url: false,
          body: message,
        },
      };

      // Add context if provided
      if (contextMessageId) {
        messageData.context = { message_id: contextMessageId };
      }

      const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

      const response$ = this.httpService.post(url, messageData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }).pipe(
        timeout(this.API_TIMEOUT),
        catchError(error => {
          this.logger.error('WhatsApp API Error:', error.response?.data || error.message);
          throw new BadRequestException('Error posting to WhatsApp Cloud API');
        }),
      );

      await firstValueFrom(response$);
      
      // Store the sent message
      await this.storeOutgoingMessage(recipient, message, contextMessageId);
      
      return true;
    } catch (error) {
      this.logger.error('Error sending text message:', error);
      return false;
    }
  }

  /**
   * Send a WhatsApp message (generic method)
   */
  async sendWhatsappMessage(messageData: MessageData, contextMessageId?: string): Promise<boolean> {
    try {
      const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
      const version = this.configService.get<string>('WHATSAPP_API_VERSION');
      const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

      if (!phoneNumberId || !version || !accessToken) {
        throw new Error('Missing WhatsApp configuration');
      }

      // Add context if provided
      if (contextMessageId) {
        messageData.context = { message_id: contextMessageId };
      }

      const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

      const response$ = this.httpService.post(url, messageData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }).pipe(
        timeout(this.API_TIMEOUT),
        catchError(error => {
          this.logger.error('WhatsApp API Error:', error.response?.data || error.message);
          throw new BadRequestException('Error posting to WhatsApp Cloud API');
        }),
      );

      await firstValueFrom(response$);
      
      // Store the sent message if it's a text message
      if (messageData.type === 'text' && messageData.text?.body) {
        await this.storeOutgoingMessage(messageData.to, messageData.text.body, contextMessageId);
      }
      
      return true;
    } catch (error) {
      this.logger.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  /**
   * Get media URL from media ID
   */
  async getMediaUrl(mediaId: string): Promise<string> {
    try {
      const version = this.configService.get<string>('WHATSAPP_API_VERSION');
      const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

      if (!version || !accessToken) {
        throw new Error('Missing WhatsApp configuration');
      }

      const url = `https://graph.facebook.com/${version}/${mediaId}`;
      
      const response = await firstValueFrom(
        this.httpService.get<WhatsAppMediaResponse>(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }).pipe(
          timeout(this.MEDIA_TIMEOUT),
          catchError(error => {
            this.logger.error('Error getting media URL:', error);
            throw error;
          })
        )
      );

      this.logger.debug(`Got media URL for ID ${mediaId}: ${response.data.url}`);
      return response.data.url;
    } catch (error:any) {
      this.logger.error('Failed to get media URL:', error);
      throw new Error(`Failed to get media URL: ${error.message}`);
    }
  }

  /**
   * Download media from URL
   */
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    try {
      const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');

      if (!accessToken) {
        throw new Error('Missing WhatsApp access token');
      }

      const response = await firstValueFrom(
        this.httpService.get(mediaUrl, {
          responseType: 'arraybuffer',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }).pipe(
          timeout(this.MEDIA_TIMEOUT),
          catchError(error => {
            this.logger.error('Error downloading media:', error);
            throw error;
          })
        )
      );

      return Buffer.from(response.data);
    } catch (error:any) {
      this.logger.error('Failed to download media:', error);
      throw new Error(`Failed to download media: ${error.message}`);
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageID: string): Promise<boolean> {
    try {
      const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
      const accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
      const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION');

      if (!phoneNumberId || !accessToken) {
        this.logger.error('Missing WhatsApp configuration for mark as read');
        return false;
      }

      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

      const config = {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: this.API_TIMEOUT
      };

      const data = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageID.trim(),
      };

      this.logger.debug(`Marking message as read: ${messageID}`);

      const response = await firstValueFrom(
        this.httpService.post(url, data, config).pipe(
          timeout(this.API_TIMEOUT),
          catchError(error => {
            this.logger.error('Error marking message as read:', error.message);
            throw error;
          })
        )
      );

      if (response.status === 200) {
        this.logger.debug(`Successfully marked message ${messageID} as read`);
        
        // Also update in database
        await this.messageRepository.update(
          { messageId: messageID },
          { isRead: true }
        );
        
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Error marking message as read:', error);
      return false;
    }
  }

  /**
   * Store an outgoing message
   */
  private async storeOutgoingMessage(recipient: string, body: string, contextMessageId?: string): Promise<void> {
    try {
      const messageData: Partial<Message> = {
        to: recipient,
        from: 'bot',
        body,
        messageId: contextMessageId,
        type: 'text',
        isFromBot: true,
        isRead: true,
        metadata: contextMessageId ? { contextMessageId } : undefined
      };

      await this.storeMessage(messageData);
    } catch (error) {
      this.logger.error('Error storing outgoing message:', error);
    }
  }

  /**
   * Get the last message sent to or from a specific phone number
   */
  async getLastMessage(phoneNumber: string): Promise<string | null> {
    try {
      // Check cache first
      const cached = this.lastMessageCache.get(phoneNumber);
      if (cached && (Date.now() - cached.timestamp.getTime()) < 5 * 60 * 1000) { // 5 minutes cache
        return cached.message;
      }

      // Query database for the most recent message
      const lastMessage = await this.messageRepository.findOne({
        where: [
          { from: phoneNumber },
          { to: phoneNumber }
        ] as FindOptionsWhere<Message>[],
        order: {
          createdAt: 'DESC' as const
        }
      });

      if (lastMessage) {
        const messageContent = lastMessage.body || lastMessage.caption || '';
        
        // Update cache
        this.lastMessageCache.set(phoneNumber, {
          message: messageContent,
          timestamp: new Date()
        });
        
        return messageContent;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error getting last message for ${phoneNumber}:`, error);
      return null;
    }
  }

  /**
   * Get the last message with full details
   */
  async getLastMessageDetails(phoneNumber: string): Promise<Message | null> {
    try {
      return await this.messageRepository.findOne({
        where: [
          { from: phoneNumber },
          { to: phoneNumber }
        ] as FindOptionsWhere<Message>[],
        order: {
          createdAt: 'DESC' as const
        }
      });
    } catch (error) {
      this.logger.error(`Error getting last message details for ${phoneNumber}:`, error);
      return null;
    }
  }

  /**
   * Store a message in the database
   */
  async storeMessage(messageData: Partial<Message>): Promise<Message> {
    try {
      const message = this.messageRepository.create(messageData);
      const saved = await this.messageRepository.save(message);
      
      // Update cache for messages from a specific sender
      if (messageData.from && messageData.from !== 'bot') {
        const content = messageData.body || messageData.caption || '';
        if (content) {
          this.lastMessageCache.set(messageData.from, {
            message: content,
            timestamp: new Date()
          });
        }
      }
      
      return saved;
    } catch (error) {
      this.logger.error('Error storing message:', error);
      throw error;
    }
  }

  /**
   * Store incoming message
   */
  async storeIncomingMessage(
    from: string, 
    message: any, 
    messageId: string,
    sessionData?: any
  ): Promise<Message> {
    try {
      const messageData: Partial<Message> = {
        from,
        messageId,
        type: message.type,
        isFromBot: false,
        isRead: false,
        metadata: {
          ...(sessionData?.sessionId ? { sessionId: sessionData.sessionId } : {}),
          ...(sessionData?.sessionType ? { sessionType: sessionData.sessionType } : {})
        }
      };

      // Extract content based on message type
      if (message.type === 'text' && message.text?.body) {
        messageData.body = message.text.body;
      } else if (message.type === 'image') {
        messageData.caption = message.image?.caption;
        messageData.metadata = {
          ...messageData.metadata,
          imageId: message.image?.id,
          mimeType: message.image?.mime_type
        };
      } else if (message.type === 'audio') {
        messageData.metadata = {
          ...messageData.metadata,
          audioId: message.audio?.id,
          mimeType: message.audio?.mime_type
        };
      } else if (message.type === 'video') {
        messageData.metadata = {
          ...messageData.metadata,
          videoId: message.video?.id,
          mimeType: message.video?.mime_type
        };
      } else if (message.type === 'location') {
        messageData.metadata = {
          ...messageData.metadata,
          latitude: message.location?.latitude,
          longitude: message.location?.longitude
        };
      } else if (message.type === 'document') {
        messageData.metadata = {
          ...messageData.metadata,
          documentId: message.document?.id,
          filename: message.document?.filename,
          mimeType: message.document?.mime_type
        };
      } else if (message.type === 'interactive') {
        messageData.metadata = {
          ...messageData.metadata,
          interactive: message.interactive
        };
      }

      return await this.storeMessage(messageData);
    } catch (error) {
      this.logger.error('Error storing incoming message:', error);
      throw error;
    }
  }

  /**
   * Clear cache for a specific phone number
   */
  clearLastMessageCache(phoneNumber: string): void {
    this.lastMessageCache.delete(phoneNumber);
  }

  /**
   * Get messages for a specific phone number with optional filters
   */
  async getMessages(phoneNumber: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      return await this.messageRepository.find({
        where: [
          { from: phoneNumber },
          { to: phoneNumber }
        ] as FindOptionsWhere<Message>[],
        order: {
          createdAt: 'DESC' as const
        },
        take: limit,
        skip: offset
      });
    } catch (error) {
      this.logger.error(`Error getting messages for ${phoneNumber}:`, error);
      return [];
    }
  }

  /**
   * Get messages by session ID (if sessionId is stored in metadata)
   */
  async getMessagesBySession(phoneNumber: string, sessionId: string, limit: number = 50): Promise<Message[]> {
    try {
      // Since sessionId is stored in metadata, we need to use a different approach
      const messages = await this.messageRepository.find({
        where: [
          { from: phoneNumber },
          { to: phoneNumber }
        ] as FindOptionsWhere<Message>[],
        order: {
          createdAt: 'ASC' as const
        },
        take: limit
      });

      // Filter messages by sessionId in metadata
      return messages.filter(msg => 
        msg.metadata && 
        typeof msg.metadata === 'object' && 
        'sessionId' in msg.metadata && 
        msg.metadata.sessionId === sessionId
      );
    } catch (error) {
      this.logger.error(`Error getting session messages for ${phoneNumber}:`, error);
      return [];
    }
  }

  /**
   * Check if the last message contains specific text
   */
  async lastMessageContains(phoneNumber: string, searchText: string): Promise<boolean> {
    try {
      const lastMessage = await this.getLastMessage(phoneNumber);
      return lastMessage ? lastMessage.toLowerCase().includes(searchText.toLowerCase()) : false;
    } catch (error) {
      this.logger.error(`Error checking last message for ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    
    for (const [phoneNumber, data] of this.lastMessageCache.entries()) {
      if (data.timestamp.getTime() < thirtyMinutesAgo) {
        this.lastMessageCache.delete(phoneNumber);
      }
    }
  }
}