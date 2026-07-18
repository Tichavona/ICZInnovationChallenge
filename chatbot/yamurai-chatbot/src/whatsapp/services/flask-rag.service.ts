// import { Injectable, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { HttpService } from '@nestjs/axios';
// import { firstValueFrom } from 'rxjs';
// import { AxiosRequestConfig } from 'axios';

// interface RAGResponse {
//   answer: string;
//   sources?: any[];
//   source_count?: number;
//   organisation?: string;
//   formatted_for_whatsapp?: boolean;
//   download_urls?: { [key: string]: string };
// }

// // Define custom file interface instead of using Express.Multer.File
// interface SourceFile {
//   buffer: Buffer;
//   originalname: string;
//   mimetype: string;
//   size: number;
//   fieldname: string;
// }

// interface EnhancedSource {
//   source: string;
//   page_number?: string;
//   page_content?: string;
//   document_type?: string;
//   download_available: boolean;
//   download_url?: string;
//   file_size?: number;
//   preview_available?: boolean;
// }

// interface AutoDownloadResult {
//     autoDownloadFiles: Array<{
//       source: EnhancedSource;
//       buffer: Buffer;
//     }>;
//     manualDownloadSources: EnhancedSource[];
//   }

// @Injectable()
// export class FlaskRagService {
//   private readonly logger = new Logger(FlaskRagService.name);
//   private readonly flaskBaseUrl: string;
//   private readonly apiKey: string;
//   private readonly MAX_WHATSAPP_LENGTH = 4096;
//   private readonly MAX_SOURCES_IN_RESPONSE = 3;
//   private readonly MAX_AUTO_DOWNLOAD_SIZE = 15 * 1024 * 1024;
//   private readonly SENT_SOURCES_TTL = 60 * 60 * 1000;
//   private readonly rateLimit = new Map<string, { count: number; resetTime: number }>();

//   private readonly sentSources = new Map<string, Set<string>>();

//   constructor(
//     private readonly configService: ConfigService,
//     private readonly httpService: HttpService,
//   ) {
//     this.flaskBaseUrl = this.configService.get('FLASK_BASE_URL', 'http://127.0.0.1:4110');
//     this.apiKey = this.configService.get('FLASK_API_KEY', 'default-secret-key');
//   }

//   // Health check for Flask service
//   async healthCheck(): Promise<boolean> {
//     try {
//       const config: AxiosRequestConfig = {
//         headers: {
//           'X-API-Key': this.apiKey,
//         },
//         timeout: 5000,
//       };

//       const response = await firstValueFrom(
//         this.httpService.get(`${this.flaskBaseUrl}/health`, config),
//       );

//       return response.status === 200;
//     } catch (error) {
//       this.logger.error('Flask health check failed', error);
//       return false;
//     }
//   }

//   // Query the RAG system for a specific organisation
//   async queryRAG(query: string, organisation: string): Promise<RAGResponse> {
//     try {
//       const config: AxiosRequestConfig = {
//         headers: {
//           'Content-Type': 'application/json',
//           'X-API-Key': this.apiKey,
//         },
//         timeout: 300000,
//       };

//       const data = {
//         query,
//         organisation,
//         format_for_whatsapp: true,
//         include_download_urls: true
//       };

//       const response = await firstValueFrom(
//         this.httpService.post(`${this.flaskBaseUrl}/dbQuerying`, data, config),
//       );

//       this.logger.log(`Successfully queried Flask RAG for organisation: ${organisation}`);
      
//       const responseData = response.data;
//       if (!responseData.answer) {
//         return this.getDefaultResponse(organisation);
//       }

//       const enhancedSources = await this.enhanceSourcesWithDownloadUrls(
//         responseData.sources || [],
//         organisation
//       );

//       // Format the answer for WhatsApp
//       const formattedAnswer = this.formatForWhatsApp(
//         responseData.answer,
//         enhancedSources,
//         organisation
//       );
      
//       return {
//         answer: formattedAnswer,
//         sources: enhancedSources,
//         source_count: responseData.source_count || 0,
//         organisation,
//         formatted_for_whatsapp: true,
//         download_urls: this.extractDownloadUrls(enhancedSources)
//       };
//     } catch (error) {
//       this.logger.error('Error querying Flask RAG', {
//         error: error.message,
//         organisation,
//         query,
//       });
//       return this.getDefaultResponse(organisation);
//     }
//   }

//   private async enhanceSourcesWithDownloadUrls(sources: any[], organisation: string): Promise<EnhancedSource[]> {
//     const enhanced: EnhancedSource[] = [];
    
//     for (const source of sources) {
//       const downloadUrl = await this.getSourceDownloadUrl(source.source).catch(() => null);
      
//       enhanced.push({
//         source: source.source,
//         page_number: source['Page number'] || source.page_number || 'N/A',
//         page_content: source['Page Content'] || source.page_content,
//         document_type: source.document_type || this.getFileExtension(source.source),
//         download_available: downloadUrl !== null,
//         download_url: downloadUrl!,
//         file_size: source.file_size,
//         preview_available: this.isPreviewAvailable(source.source)
//       });
//     }
    
//     return enhanced;
//   }

//   private isPreviewAvailable(filename: string): boolean {
//     const ext = this.getFileExtension(filename).toLowerCase();
//     const previewExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt'];
//     return previewExtensions.includes(ext);
//   }

//   private extractDownloadUrls(sources: EnhancedSource[]): { [key: string]: string } {
//     const urls: { [key: string]: string } = {};
//     sources.forEach(source => {
//       if (source.download_url) {
//         urls[source.source] = source.download_url;
//       }
//     });
//     return urls;
//   }

//   private getFileExtension(filename: string): string {
//     const parts = filename.split('.');
//     return parts.length > 1 ? `.${parts[parts.length - 1]}` : '.pdf';
//   }

//   getFileExtensionFromMimeType(mimeType: string): string {
//     const extensionMap: { [key: string]: string } = {
//       'application/pdf': 'pdf',
//       'application/msword': 'doc',
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
//       'application/vnd.ms-excel': 'xls',
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
//       'application/vnd.ms-powerpoint': 'ppt',
//       'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
//       'text/plain': 'txt',
//       'text/csv': 'csv',
//       'image/jpeg': 'jpg',
//       'image/png': 'png',
//     };
    
//     return extensionMap[mimeType] || 'bin';
//   }

//   prepareWhatsAppFile(buffer: Buffer, filename: string, mimeType?: string): {
//     buffer: Buffer;
//     filename: string;
//     mimetype: string;
//   } {
//     const ext = filename.split('.').pop() || 'pdf';
//     const mimeMap: { [key: string]: string } = {
//       'pdf': 'application/pdf',
//       'doc': 'application/msword',
//       'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//       'xls': 'application/vnd.ms-excel',
//       'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//       'ppt': 'application/vnd.ms-powerpoint',
//       'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
//       'txt': 'text/plain',
//       'csv': 'text/csv',
//       'jpg': 'image/jpeg',
//       'jpeg': 'image/jpeg',
//       'png': 'image/png',
//     };
    
//     return {
//       buffer,
//       filename,
//       mimetype: mimeType || mimeMap[ext] || 'application/octet-stream'
//     };
//   }

//   // Format response for WhatsApp
//   private formatForWhatsApp(answer: string, sources: EnhancedSource[], organisation: string): string {
//     // Clean up the answer first
//     let cleanAnswer = this.cleanResponse(answer);
    
//     // Truncate if too long (WhatsApp has 4096 character limit)
//     if (cleanAnswer.length > this.MAX_WHATSAPP_LENGTH - 500) {
//       cleanAnswer = cleanAnswer.substring(0, this.MAX_WHATSAPP_LENGTH - 800) + 
//         '\n\n⚠️ *Response truncated due to length*\n' +
//         `💡 Type "SOURCES" to see all ${sources.length} sources`;
//     }

//     // Add organisation emoji and header
//     const orgEmoji = organisation === 'Agriculture' ? '🌾' : '🏛️';
//     let formattedResponse = `${orgEmoji} *${organisation.toUpperCase()} KNOWLEDGE BASE*\n\n`;
    
//     // Add the main answer
//     formattedResponse += cleanAnswer + '\n\n';

//     // Add sources section if available
//     if (sources && sources.length > 0) {
//       formattedResponse += `📚 *Sources (${sources.length}):*\n`;
      
//       // Limit to first 3 sources for WhatsApp
//       const displaySources = sources.slice(0, this.MAX_SOURCES_IN_RESPONSE);
//       displaySources.forEach((source, index) => {
//         const pageInfo = source.page_number && source.page_number !== 'N/A' 
//           ? ` (Page ${source.page_number})` 
//           : '';
//         formattedResponse += `${index + 1}. 📄 ${source.source}${pageInfo}\n`;

//         if (index < this.MAX_SOURCES_IN_RESPONSE && this.canAutoDownload(source)) {
//           formattedResponse += `   ⬇️ *Auto-downloading...*\n`;
//         } else if (source.download_available) {
//           formattedResponse += `   🔗 *Type "DOWNLOAD ${index + 1}" to get file*\n`;
//         }
//         formattedResponse += '\n';
//       });
      
//       if (sources.length > this.MAX_SOURCES_IN_RESPONSE) {
//         formattedResponse += `\n   *+${sources.length - this.MAX_SOURCES_IN_RESPONSE} more sources*\n`;
//         formattedResponse += `   💡 Type "SOURCES" to see all sources\n`;
//       }
      
//       formattedResponse += '\n';
//       }

//     formattedResponse += this.getFollowUpOptions(organisation);

//     return formattedResponse;
//   }

//   canAutoDownload(source: EnhancedSource): boolean {
//     if (source.download_available && source.file_size && source.file_size < this.MAX_AUTO_DOWNLOAD_SIZE) {
//       return true;
//     } else {
//       return false
//     }
//   }

//   async prepareAutoDownloadSources(phoneNumber: string, sources: EnhancedSource[]): Promise<AutoDownloadResult> {
//     const autoDownloadFiles: Array<{ source: EnhancedSource; buffer: Buffer }> = [];
//     const manualDownloadSources: EnhancedSource[] = [];
    
//     // Get or create sent sources set for this user
//     if (!this.sentSources.has(phoneNumber)) {
//       this.sentSources.set(phoneNumber, new Set<string>());
//     }
    
//     const userSentSources = this.sentSources.get(phoneNumber)!;
    
//     for (let i = 0; i < Math.min(3, sources.length); i++) {
//       const source = sources[i];
      
//       // Skip if already sent
//       if (userSentSources.has(source.source)) {
//         manualDownloadSources.push(source);
//         continue;
//       }
      
//       if (this.canAutoDownload(source)) {
//         try {
//           const buffer = await this.downloadSourceFile(source.source);
//           autoDownloadFiles.push({ source, buffer });
//           userSentSources.add(source.source);
//         } catch (error) {
//           this.logger.error(`Failed to auto-download source ${source.source}:`, error);
//           manualDownloadSources.push(source);
//         }
//       } else {
//         manualDownloadSources.push(source);
//       }
//     }
    
//     // Add remaining sources to manual list
//     for (let i = 3; i < sources.length; i++) {
//       manualDownloadSources.push(sources[i]);
//     }
    
//     return { autoDownloadFiles, manualDownloadSources };
//   }

//   // Clean up old sent sources tracking
//   cleanupSentSources(): void {
//     const now = Date.now();
//     // This would need proper timestamp tracking - simplified version
//     if (this.sentSources.size > 1000) {
//       this.sentSources.clear();
//     }
//   }

//   private getFollowUpOptions(organisation: string): string {
//     return `📋 *Options:*\n` +
//       `• Ask another question\n` +
//       `• Type "SOURCES" to see all sources\n` +
//       `• Type "DOWNLOAD <number>" to get a source file\n` +
//       `• Type "CANCEL" to exit\n` +
//       `• Type "MENU" for main menu`;
//   }

//   async formatSourcesList(sources: EnhancedSource[], organisation: string): Promise<string> {
//     const orgEmoji = organisation === 'Agriculture' ? '🌾' : '🏛️';
    
//     let message = `${orgEmoji} *${organisation} KNOWLEDGE SOURCES* ${orgEmoji}\n\n`;
//     message += `📚 *Total Sources: ${sources.length}*\n\n`;
    
//     sources.forEach((source, index) => {
//       const pageInfo = source.page_number && source.page_number !== 'N/A' 
//         ? ` (Page ${source.page_number})` 
//         : '';
      
//       message += `*${index + 1}.* 📄 *${source.source}*${pageInfo}\n`;
      
//       // Add preview snippet if available
//       if (source.page_content) {
//         const preview = source.page_content.substring(0, 100);
//         message += `   📝 "${preview}..."\n`;
//       }
      
//       // Add download info
//       if (source.download_available) {
//         message += `   🔗 *Download:* Type "DOWNLOAD ${index + 1}"\n`;
//         message += `   📦 *Type:* ${source.document_type || 'PDF'}\n`;
//         if (source.file_size) {
//           const sizeInKB = Math.round(source.file_size / 1024);
//           message += `   📊 *Size:* ${sizeInKB} KB\n`;
//         }
//       } else {
//         message += `   ❌ *Download not available*\n`;
//       }
      
//       message += '\n';
//     });
    
//     message += `\n💡 *To download a source:*\n`;
//     message += `• Type "DOWNLOAD <number>" (e.g., "DOWNLOAD 1")\n`;
//     message += `• Type "SOURCES" to see this list again\n`;
//     message += `• Type "CANCEL" to exit\n`;
    
//     return message;
//   }

//   async formatSourceDownload(source: EnhancedSource, index: number): Promise<string> {
//     const orgEmoji = source.document_type?.includes('pdf') ? '📄' : '📁';
    
//     let message = `${orgEmoji} *Source ${index}: ${source.source}*\n\n`;
//     message += `📋 *Details:*\n`;
//     message += `• File: ${source.source}\n`;
    
//     if (source.page_number && source.page_number !== 'N/A') {
//       message += `• Page: ${source.page_number}\n`;
//     }
    
//     if (source.document_type) {
//       message += `• Type: ${source.document_type}\n`;
//     }
    
//     if (source.file_size) {
//       const sizeInKB = Math.round(source.file_size / 1024);
//       message += `• Size: ${sizeInKB} KB\n`;
//     }

//     if (source.download_available) {
//       message += `\n🔗 *Download Link:*\n${source.download_url}\n\n`;
//       message += `💡 *Note:* You can open this link in your browser to download the file.\n\n`;
//     } else {
//       message += `\n❌ *Download not available for this source*\n\n`;
//     }
    
//     message += `📋 *Options:*\n`;
//     message += `• Type "SOURCES" to see all sources\n`;
//     message += `• Type "DOWNLOAD <number>" for another source\n`;
//     message += `• Type "CANCEL" to exit`;
    
//     return message;
//   }

//   // Clean up the response text
//   private cleanResponse(text: string): string {
//     if (!text) return text;
    
//     let cleaned = text;
    
//     // Remove markdown formatting that doesn't work in WhatsApp
//     cleaned = cleaned.replace(/```/g, '');
//     cleaned = cleaned.replace(/`/g, '"');
    
//     // Remove HTML tags
//     cleaned = cleaned.replace(/<[^>]*>/g, '');
    
//     // Remove multiple newlines
//     cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
//     // Ensure bullet points are formatted correctly for WhatsApp
//     cleaned = cleaned.replace(/^\s*[-*]\s/gm, '• ');
    
//     // Remove any leftover markdown
//     cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove links
    
//     return cleaned.trim();
//   }

//   getErrorMessage(organisation: string): string {
//     const orgEmoji = organisation === 'Agriculture' ? '🌾' : '🏛️';
//     return `${orgEmoji} *${organisation} Service Error*\n\n` +
//       '❌ Sorry, I encountered an error processing your request.\n\n' +
//       '📋 *Options:*\n' +
//       '• Try again in a few moments\n' +
//       '• Type "CANCEL" to exit\n' +
//       '• Type "MENU" for other options';
//   }

//   // Get default error response
//   private getDefaultResponse(organisation: string): RAGResponse {
//     return {
//       answer: this.getErrorMessage(organisation),
//       sources: [],
//       source_count: 0,
//       organisation
//     };
//   }

//   // Split long messages into multiple parts
//   async splitMessage(text: string, maxLength: number = 4000): Promise<string[]> {
//     const messages: string[] = [];
    
//     if (!text || text.length <= maxLength) {
//       return [text];
//     }

//     // Try to split by paragraphs first
//     const paragraphs = text.split('\n\n');
//     let currentMessage = '';
    
//     for (const paragraph of paragraphs) {
//       const paragraphWithNewlines = paragraph + '\n\n';
      
//       if ((currentMessage + paragraphWithNewlines).length > maxLength) {
//         if (currentMessage) {
//           messages.push(currentMessage.trim());
//           currentMessage = paragraphWithNewlines;
//         } else {
//           // Split long paragraph into sentences
//           const sentences = paragraph.split(/[.!?]+/);
//           for (const sentence of sentences) {
//             if (sentence.trim()) {
//               const sentenceWithPeriod = sentence.trim() + '. ';
//               if ((currentMessage + sentenceWithPeriod).length > maxLength) {
//                 if (currentMessage) {
//                   messages.push(currentMessage.trim());
//                   currentMessage = sentenceWithPeriod;
//                 } else {
//                   // If a single sentence is too long, force split
//                   const chunks = this.forceSplitText(sentenceWithPeriod, maxLength);
//                   messages.push(...chunks);
//                   currentMessage = '';
//                 }
//               } else {
//                 currentMessage += sentenceWithPeriod;
//               }
//             }
//           }
//         }
//       } else {
//         currentMessage += paragraphWithNewlines;
//       }
//     }
    
//     if (currentMessage.trim()) {
//       messages.push(currentMessage.trim());
//     }
    
//     return messages;
//   }

//   // Force split text without breaking words
//   private forceSplitText(text: string, maxLength: number): string[] {
//     const chunks: string[] = [];
//     let remaining = text;
    
//     while (remaining.length > 0) {
//       if (remaining.length <= maxLength) {
//         chunks.push(remaining);
//         break;
//       }
      
//       // Find a good breaking point
//       let breakPoint = maxLength;
//       while (breakPoint > 0 && remaining[breakPoint] !== ' ' && remaining[breakPoint] !== '\n') {
//         breakPoint--;
//       }
      
//       if (breakPoint === 0) {
//         breakPoint = maxLength; // Force break
//       }
      
//       chunks.push(remaining.substring(0, breakPoint));
//       remaining = remaining.substring(breakPoint).trim();
//     }
    
//     return chunks;
//   }

//   // Simplified processMedia
//   async processMedia(
//     mediaType: string,
//     mediaDescription: string,
//     organisation: string
//   ): Promise<RAGResponse> {
//     try {
//       const query = `[${mediaType} uploaded] ${mediaDescription}`;
//       return await this.queryRAG(query, organisation);
//     } catch (error) {
//       this.logger.error(`Error processing ${mediaType} for RAG`, {
//         error: error.message,
//         organisation,
//         mediaType
//       });
      
//       return {
//         answer: `I received your ${mediaType} but couldn't process it with the knowledge base right now. Please try sending a text query instead.`,
//         sources: [],
//         organisation
//       };
//     }
//   }

//   // Simplified processLocation - just sends the location text to RAG, not the coordinates
//   async processLocation(
//     locationDescription: string,
//     organisation: string
//   ): Promise<RAGResponse> {
//     try {
//       const query = `[Location shared] ${locationDescription}`;
//       return await this.queryRAG(query, organisation);
//     } catch (error) {
//       this.logger.error('Error processing location for RAG', {
//         error: error.message,
//         organisation
//       });
      
//       return {
//         answer: 'I received your location but couldn\'t find relevant information in the knowledge base. Please try sending a text query instead.',
//         sources: [],
//         organisation
//       };
//     }
//   }

//   // Process interactive messages (button clicks, list selections)
//   async processInteractive(
//     interactiveData: any,
//     organisation: string
//   ): Promise<RAGResponse> {
//     try {
//       let query = '';
      
//       if (interactiveData.button_reply) {
//         query = `[Button clicked: ${interactiveData.button_reply.id} - ${interactiveData.button_reply.title}]`;
//       } else if (interactiveData.list_reply) {
//         query = `[List selected: ${interactiveData.list_reply.id} - ${interactiveData.list_reply.title}]`;
//       } else {
//         query = '[Interactive response]';
//       }
      
//       return await this.queryRAG(query, organisation);
//     } catch (error) {
//       this.logger.error('Error processing interactive message for RAG', {
//         error: error.message,
//         organisation
//       });
      
//       return {
//         answer: 'I processed your selection but couldn\'t find relevant information. Please try a text query.',
//         sources: [],
//         organisation
//       };
//     }
//   }

//   // Get MIME type from file extension
//   getMimeTypeFromExtension(extension: string): string {
//     const mimeTypes: { [key: string]: string } = {
//       '.pdf': 'application/pdf',
//       '.doc': 'application/msword',
//       '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//       '.xls': 'application/vnd.ms-excel',
//       '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//       '.txt': 'text/plain',
//       '.csv': 'text/csv',
//       '.jpg': 'image/jpeg',
//       '.jpeg': 'image/jpeg',
//       '.png': 'image/png',
//     };
    
//     const normalizedExtension = extension.startsWith('.') ? extension : `.${extension}`;
//     return mimeTypes[normalizedExtension.toLowerCase()] || 'application/octet-stream';
//   }

//   // Download source file from Flask
//   async downloadSourceFile(sourceName: string): Promise<Buffer> {
//     try {
//       const config: AxiosRequestConfig = {
//         headers: {
//           'X-API-Key': this.apiKey,
//         },
//         responseType: 'arraybuffer',
//         timeout: 120000, // 2 minutes
//       };

//       const encodedSourceName = encodeURIComponent(sourceName);
//       const response = await firstValueFrom(
//         this.httpService.get(
//           `${this.flaskBaseUrl}/download/${encodedSourceName}`,
//           config
//         ),
//       );

//       this.logger.log(`Successfully downloaded source file: ${sourceName}`);
//       return Buffer.from(response.data);
//     } catch (error) {
//       this.logger.error('Error downloading source file', {
//         error: error.message,
//         sourceName,
//       });
//       throw new Error(`Failed to download source file: ${error.message}`);
//     }
//   }

//   // Get source download URL
//   async getSourceDownloadUrl(sourceName: string): Promise<string> {
//     const encodedSourceName = encodeURIComponent(sourceName);
//     return `${this.flaskBaseUrl}/download/${encodedSourceName}`;
//   }

//   // Prepare source files for sending
//   async prepareSourceFiles(sources: any[]): Promise<{
//     files: SourceFile[];
//     sourceDescriptions: string[];
//   }> {
//     const files: SourceFile[] = [];
//     const sourceDescriptions: string[] = [];

//     for (const source of sources) {
//       try {
//         if (source.source && source.download_available !== false) {
//           const fileBuffer = await this.downloadSourceFile(source.source);
          
//           const file: SourceFile = {
//             buffer: fileBuffer,
//             originalname: source.source,
//             mimetype: this.getMimeTypeFromExtension(source.document_type || '.pdf'),
//             size: fileBuffer.length,
//             fieldname: 'source_document'
//           };

//           files.push(file);
//           sourceDescriptions.push(`${source.source} (Page ${source.page_number || 'N/A'})`);
//         }
//       } catch (error) {
//         this.logger.warn(`Failed to download source ${source.source}`, error);
//         sourceDescriptions.push(`${source.source} (Page ${source.page_number || 'N/A'}) - Download unavailable`);
//       }
//     }

//     return { files, sourceDescriptions };
//   }
// }

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';

interface RAGResponse {
  answer: string;
  sources?: any[];
  source_count?: number;
  organisation?: string;
  formatted_for_whatsapp?: boolean;
  download_urls?: { [key: string]: string };
}

// Define custom file interface instead of using Express.Multer.File
interface SourceFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
  fieldname: string;
}

interface EnhancedSource {
  source: string;
  page_number?: string;
  page_content?: string;
  document_type?: string;
  download_available: boolean;
  download_url?: string;
  file_size?: number;
  preview_available?: boolean;
}

interface AutoDownloadResult {
    autoDownloadFiles: Array<{
      source: EnhancedSource;
      buffer: Buffer;
    }>;
    manualDownloadSources: EnhancedSource[];
  }

@Injectable()
export class FlaskRagService {
  private readonly logger = new Logger(FlaskRagService.name);
  private readonly flaskBaseUrl: string;
  private readonly apiKey: string;
  private readonly MAX_WHATSAPP_LENGTH = 4096;
  private readonly MAX_SOURCES_IN_RESPONSE = 3;
  private readonly MAX_AUTO_DOWNLOAD_SIZE = 15 * 1024 * 1024; // 15MB
  private readonly SENT_SOURCES_TTL = 60 * 60 * 1000; // 1 hour
  private readonly rateLimit = new Map<string, { count: number; resetTime: number }>();

  // Track sent sources for each user with timestamps
  private readonly sentSources = new Map<string, { sources: Set<string>; timestamp: number }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.flaskBaseUrl = this.configService.get('FLASK_BASE_URL', 'http://127.0.0.1:4110');
    this.apiKey = this.configService.get('FLASK_API_KEY', 'default-secret-key');
  }

  // Health check for Flask service
  async healthCheck(): Promise<boolean> {
    try {
      const config: AxiosRequestConfig = {
        headers: {
          'X-API-Key': this.apiKey,
        },
        timeout: 5000,
      };

      const response = await firstValueFrom(
        this.httpService.get(`${this.flaskBaseUrl}/health`, config),
      );

      return response.status === 200;
    } catch (error) {
      this.logger.error('Flask health check failed', error);
      return false;
    }
  }

  // Query the RAG system for a specific organisation
  async queryRAG(query: string, organisation: string): Promise<RAGResponse> {
    try {
      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        timeout: 1200000, // 5 minutes
      };

      const data = {
        query,
        organisation,
        format_for_whatsapp: true,
        include_download_urls: true
      };

      const response = await firstValueFrom(
        this.httpService.post(`${this.flaskBaseUrl}/dbQuerying`, data, config),
      );

      this.logger.log(`Successfully queried Flask RAG for organisation: ${organisation}`);
      
      const responseData = response.data;
      if (!responseData.answer) {
        return this.getDefaultResponse(organisation);
      }

      const enhancedSources = await this.enhanceSourcesWithDownloadUrls(
        responseData.sources || [],
        organisation
      );

      // Format the answer for WhatsApp
      const formattedAnswer = this.formatForWhatsApp(
        responseData.answer,
        enhancedSources,
        organisation
      );
      
      return {
        answer: formattedAnswer,
        sources: enhancedSources,
        source_count: responseData.source_count || 0,
        organisation,
        formatted_for_whatsapp: true,
        download_urls: this.extractDownloadUrls(enhancedSources)
      };
    } catch (error:any) {
      this.logger.error('Error querying Flask RAG', {
        error: error.message,
        organisation,
        query,
      });
      return this.getDefaultResponse(organisation);
    }
  }

  private async enhanceSourcesWithDownloadUrls(sources: any[], organisation: string): Promise<EnhancedSource[]> {
    const enhanced: EnhancedSource[] = [];
    
    for (const source of sources) {
      const downloadUrl = await this.getSourceDownloadUrl(source.source).catch(() => null);
      
      enhanced.push({
        source: source.source,
        page_number: source['Page number'] || source.page_number || 'N/A',
        page_content: source['Page Content'] || source.page_content,
        document_type: source.document_type || this.getFileExtension(source.source),
        download_available: downloadUrl !== null,
        download_url: downloadUrl!,
        file_size: source.file_size,
        preview_available: this.isPreviewAvailable(source.source)
      });
    }
    
    return enhanced;
  }

  private isPreviewAvailable(filename: string): boolean {
    const ext = this.getFileExtension(filename).toLowerCase();
    const previewExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt'];
    return previewExtensions.includes(ext);
  }

  private extractDownloadUrls(sources: EnhancedSource[]): { [key: string]: string } {
    const urls: { [key: string]: string } = {};
    sources.forEach(source => {
      if (source.download_url) {
        urls[source.source] = source.download_url;
      }
    });
    return urls;
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '.pdf';
  }

  getFileExtensionFromMimeType(mimeType: string): string {
    const extensionMap: { [key: string]: string } = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'text/plain': 'txt',
      'text/csv': 'csv',
      'image/jpeg': 'jpg',
      'image/png': 'png',
    };
    
    return extensionMap[mimeType] || 'bin';
  }

  prepareWhatsAppFile(buffer: Buffer, filename: string, mimeType?: string): {
    buffer: Buffer;
    filename: string;
    mimetype: string;
  } {
    const ext = filename.split('.').pop() || 'pdf';
    const mimeMap: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
    };
    
    return {
      buffer,
      filename,
      mimetype: mimeType || mimeMap[ext] || 'application/octet-stream'
    };
  }

  // Format response for WhatsApp
  private formatForWhatsApp(answer: string, sources: EnhancedSource[], organisation: string): string {
    // Clean up the answer first
    let cleanAnswer = this.cleanResponse(answer);
    
    // Truncate if too long (WhatsApp has 4096 character limit)
    if (cleanAnswer.length > this.MAX_WHATSAPP_LENGTH - 500) {
      cleanAnswer = cleanAnswer.substring(0, this.MAX_WHATSAPP_LENGTH - 800) + 
        '\n\n⚠️ *Response truncated due to length*\n' +
        `💡 Type "SOURCES" to see all ${sources.length} sources`;
    }

    // Add organisation emoji and header
    const orgEmoji = organisation === 'Agriculture' ? '🌾' : '🏛️';
    let formattedResponse = `${orgEmoji} *${organisation.toUpperCase()} KNOWLEDGE BASE*\n\n`;
    
    // Add the main answer
    formattedResponse += cleanAnswer + '\n\n';

    // Add sources section if available
    if (sources && sources.length > 0) {
      formattedResponse += `📚 *Sources (${sources.length}):*\n`;
      
      // Limit to first 3 sources for WhatsApp
      const displaySources = sources.slice(0, this.MAX_SOURCES_IN_RESPONSE);
      displaySources.forEach((source, index) => {
        const pageInfo = source.page_number && source.page_number !== 'N/A' 
          ? ` (Page ${source.page_number})` 
          : '';
        formattedResponse += `${index + 1}. 📄 ${source.source}${pageInfo}\n`;

        if (index < this.MAX_SOURCES_IN_RESPONSE && this.canAutoDownload(source)) {
          formattedResponse += `   ⬇️ *Auto-downloading...*\n`;
        } else if (source.download_available) {
          formattedResponse += `   🔗 *Type "DOWNLOAD ${index + 1}" to get file*\n`;
        }
        formattedResponse += '\n';
      });
      
      if (sources.length > this.MAX_SOURCES_IN_RESPONSE) {
        formattedResponse += `\n   *+${sources.length - this.MAX_SOURCES_IN_RESPONSE} more sources*\n`;
        formattedResponse += `   💡 Type "SOURCES" to see all sources\n`;
      }
      
      formattedResponse += '\n';
    }

    formattedResponse += this.getFollowUpOptions(organisation);

    return formattedResponse;
  }

  canAutoDownload(source: EnhancedSource): boolean {
    if (source.download_available &&  source.file_size && source.file_size < this.MAX_AUTO_DOWNLOAD_SIZE) {
      return true;
    } else {
      return false;
    }
  }

  async prepareAutoDownloadSources(phoneNumber: string, sources: EnhancedSource[]): Promise<AutoDownloadResult> {
    const autoDownloadFiles: Array<{ source: EnhancedSource; buffer: Buffer }> = [];
    const manualDownloadSources: EnhancedSource[] = [];
    
    // Get or create sent sources set for this user with timestamp
    const now = Date.now();
    let userData = this.sentSources.get(phoneNumber);
    
    if (!userData || (now - userData.timestamp) > this.SENT_SOURCES_TTL) {
      userData = { sources: new Set<string>(), timestamp: now };
      this.sentSources.set(phoneNumber, userData);
    }
    
    const userSentSources = userData.sources;
    
    for (let i = 0; i < Math.min(3, sources.length); i++) {
      const source = sources[i];
      
      // Skip if already sent
      if (userSentSources.has(source.source)) {
        manualDownloadSources.push(source);
        continue;
      }
      
      if (this.canAutoDownload(source)) {
        try {
          const buffer = await this.downloadSourceFile(source.source);
          autoDownloadFiles.push({ source, buffer });
          userSentSources.add(source.source);
          userData.timestamp = now; // Update timestamp
        } catch (error) {
          this.logger.error(`Failed to auto-download source ${source.source}:`, error);
          manualDownloadSources.push(source);
        }
      } else {
        manualDownloadSources.push(source);
      }
    }
    
    // Add remaining sources to manual list
    for (let i = 3; i < sources.length; i++) {
      manualDownloadSources.push(sources[i]);
    }
    
    return { autoDownloadFiles, manualDownloadSources };
  }

  // Clean up old sent sources tracking
  cleanupSentSources(): void {
    const now = Date.now();
    for (const [phoneNumber, data] of this.sentSources.entries()) {
      if (now - data.timestamp > this.SENT_SOURCES_TTL) {
        this.sentSources.delete(phoneNumber);
        this.logger.debug(`Cleaned up sent sources for ${phoneNumber}`);
      }
    }
  }

  private getFollowUpOptions(organisation: string): string {
    return `📋 *Options:*\n` +
      `• Ask another question\n` +
      `• Type "SOURCES" to see all sources\n` +
      `• Type "DOWNLOAD <number>" to get a source file\n` +
      `• Type "CANCEL" to exit\n` +
      `• Type "MENU" for main menu`;
  }

  async formatSourcesList(sources: EnhancedSource[], organisation: string): Promise<string> {
    const orgEmoji = organisation === 'Agriculture' ? '🌾' : '🏛️';
    
    let message = `${orgEmoji} *${organisation} KNOWLEDGE SOURCES* ${orgEmoji}\n\n`;
    message += `📚 *Total Sources: ${sources.length}*\n\n`;
    
    sources.forEach((source, index) => {
      const pageInfo = source.page_number && source.page_number !== 'N/A' 
        ? ` (Page ${source.page_number})` 
        : '';
      
      message += `*${index + 1}.* 📄 *${source.source}*${pageInfo}\n`;
      
      // Add preview snippet if available
      if (source.page_content) {
        const preview = source.page_content.substring(0, 100);
        message += `   📝 "${preview}..."\n`;
      }
      
      // Add download info
      if (source.download_available) {
        message += `   🔗 *Download:* Type "DOWNLOAD ${index + 1}"\n`;
        message += `   📦 *Type:* ${source.document_type || 'PDF'}\n`;
        if (source.file_size) {
          const sizeInKB = Math.round(source.file_size / 1024);
          message += `   📊 *Size:* ${sizeInKB} KB\n`;
        }
      } else {
        message += `   ❌ *Download not available*\n`;
      }
      
      message += '\n';
    });
    
    message += `\n💡 *To download a source:*\n`;
    message += `• Type "DOWNLOAD <number>" (e.g., "DOWNLOAD 1")\n`;
    message += `• Type "SOURCES" to see this list again\n`;
    message += `• Type "CANCEL" to exit\n`;
    
    return message;
  }

  async formatSourceDownload(source: EnhancedSource, index: number): Promise<string> {
    const orgEmoji = source.document_type?.includes('pdf') ? '📄' : '📁';
    
    let message = `${orgEmoji} *Source ${index}: ${source.source}*\n\n`;
    message += `📋 *Details:*\n`;
    message += `• File: ${source.source}\n`;
    
    if (source.page_number && source.page_number !== 'N/A') {
      message += `• Page: ${source.page_number}\n`;
    }
    
    if (source.document_type) {
      message += `• Type: ${source.document_type}\n`;
    }
    
    if (source.file_size) {
      const sizeInKB = Math.round(source.file_size / 1024);
      message += `• Size: ${sizeInKB} KB\n`;
    }

    if (source.download_available) {
      message += `\n🔗 *Download Link:*\n${source.download_url}\n\n`;
      message += `💡 *Note:* You can open this link in your browser to download the file.\n\n`;
    } else {
      message += `\n❌ *Download not available for this source*\n\n`;
    }
    
    message += `📋 *Options:*\n`;
    message += `• Type "SOURCES" to see all sources\n`;
    message += `• Type "DOWNLOAD <number>" for another source\n`;
    message += `• Type "CANCEL" to exit`;
    
    return message;
  }

  // Clean up the response text
  private cleanResponse(text: string): string {
    if (!text) return text;
    
    let cleaned = text;
    
    // Remove markdown formatting that doesn't work in WhatsApp
    cleaned = cleaned.replace(/```/g, '');
    cleaned = cleaned.replace(/`/g, '"');
    
    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    
    // Remove multiple newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Ensure bullet points are formatted correctly for WhatsApp
    cleaned = cleaned.replace(/^\s*[-*]\s/gm, '• ');
    
    // Remove any leftover markdown
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove links
    
    return cleaned.trim();
  }

  getErrorMessage(organisation: string): string {
    const orgEmoji = organisation === 'Agriculture' ? '🌾' : '🏛️';
    return `${orgEmoji} *${organisation} Service Error*\n\n` +
      '❌ Sorry, I encountered an error processing your request.\n\n' +
      '📋 *Options:*\n' +
      '• Try again in a few moments\n' +
      '• Type "CANCEL" to exit\n' +
      '• Type "MENU" for other options';
  }

  // Get default error response
  private getDefaultResponse(organisation: string): RAGResponse {
    return {
      answer: this.getErrorMessage(organisation),
      sources: [],
      source_count: 0,
      organisation
    };
  }

  // Split long messages into multiple parts
  async splitMessage(text: string, maxLength: number = 4000): Promise<string[]> {
    const messages: string[] = [];
    
    if (!text || text.length <= maxLength) {
      return [text];
    }

    // Try to split by paragraphs first
    const paragraphs = text.split('\n\n');
    let currentMessage = '';
    
    for (const paragraph of paragraphs) {
      const paragraphWithNewlines = paragraph + '\n\n';
      
      if ((currentMessage + paragraphWithNewlines).length > maxLength) {
        if (currentMessage) {
          messages.push(currentMessage.trim());
          currentMessage = paragraphWithNewlines;
        } else {
          // Split long paragraph into sentences
          const sentences = paragraph.split(/[.!?]+/);
          for (const sentence of sentences) {
            if (sentence.trim()) {
              const sentenceWithPeriod = sentence.trim() + '. ';
              if ((currentMessage + sentenceWithPeriod).length > maxLength) {
                if (currentMessage) {
                  messages.push(currentMessage.trim());
                  currentMessage = sentenceWithPeriod;
                } else {
                  // If a single sentence is too long, force split
                  const chunks = this.forceSplitText(sentenceWithPeriod, maxLength);
                  messages.push(...chunks);
                  currentMessage = '';
                }
              } else {
                currentMessage += sentenceWithPeriod;
              }
            }
          }
        }
      } else {
        currentMessage += paragraphWithNewlines;
      }
    }
    
    if (currentMessage.trim()) {
      messages.push(currentMessage.trim());
    }
    
    return messages;
  }

  // Force split text without breaking words
  private forceSplitText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let remaining = text;
    
    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }
      
      // Find a good breaking point
      let breakPoint = maxLength;
      while (breakPoint > 0 && remaining[breakPoint] !== ' ' && remaining[breakPoint] !== '\n') {
        breakPoint--;
      }
      
      if (breakPoint === 0) {
        breakPoint = maxLength; // Force break
      }
      
      chunks.push(remaining.substring(0, breakPoint));
      remaining = remaining.substring(breakPoint).trim();
    }
    
    return chunks;
  }

  // Simplified processMedia
  async processMedia(
    mediaType: string,
    mediaDescription: string,
    organisation: string
  ): Promise<RAGResponse> {
    try {
      const query = `[${mediaType} uploaded] ${mediaDescription}`;
      return await this.queryRAG(query, organisation);
    } catch (error:any) {
      this.logger.error(`Error processing ${mediaType} for RAG`, {
        error: error.message,
        organisation,
        mediaType
      });
      
      return {
        answer: `I received your ${mediaType} but couldn't process it with the knowledge base right now. Please try sending a text query instead.`,
        sources: [],
        organisation
      };
    }
  }

  // Simplified processLocation - just sends the location text to RAG, not the coordinates
  async processLocation(
    locationDescription: string,
    organisation: string
  ): Promise<RAGResponse> {
    try {
      const query = `[Location shared] ${locationDescription}`;
      return await this.queryRAG(query, organisation);
    } catch (error:any) {
      this.logger.error('Error processing location for RAG', {
        error: error.message,
        organisation
      });
      
      return {
        answer: 'I received your location but couldn\'t find relevant information in the knowledge base. Please try sending a text query instead.',
        sources: [],
        organisation
      };
    }
  }

  // Process interactive messages (button clicks, list selections)
  async processInteractive(
    interactiveData: any,
    organisation: string
  ): Promise<RAGResponse> {
    try {
      let query = '';
      
      if (interactiveData.button_reply) {
        query = `[Button clicked: ${interactiveData.button_reply.id} - ${interactiveData.button_reply.title}]`;
      } else if (interactiveData.list_reply) {
        query = `[List selected: ${interactiveData.list_reply.id} - ${interactiveData.list_reply.title}]`;
      } else {
        query = '[Interactive response]';
      }
      
      return await this.queryRAG(query, organisation);
    } catch (error:any) {
      this.logger.error('Error processing interactive message for RAG', {
        error: error.message,
        organisation
      });
      
      return {
        answer: 'I processed your selection but couldn\'t find relevant information. Please try a text query.',
        sources: [],
        organisation
      };
    }
  }

  // Get MIME type from file extension
  getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };
    
    const normalizedExtension = extension.startsWith('.') ? extension : `.${extension}`;
    return mimeTypes[normalizedExtension.toLowerCase()] || 'application/octet-stream';
  }

  // Download source file from Flask
  async downloadSourceFile(sourceName: string): Promise<Buffer> {
    try {
      const config: AxiosRequestConfig = {
        headers: {
          'X-API-Key': this.apiKey,
        },
        responseType: 'arraybuffer',
        timeout: 120000, // 2 minutes
      };

      const encodedSourceName = encodeURIComponent(sourceName);
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.flaskBaseUrl}/download/${encodedSourceName}`,
          config
        ),
      );

      this.logger.log(`Successfully downloaded source file: ${sourceName}`);
      return Buffer.from(response.data);
    } catch (error:any) {
      this.logger.error('Error downloading source file', {
        error: error.message,
        sourceName,
      });
      throw new Error(`Failed to download source file: ${error.message}`);
    }
  }

  // Get source download URL
  async getSourceDownloadUrl(sourceName: string): Promise<string> {
    const encodedSourceName = encodeURIComponent(sourceName);
    return `${this.flaskBaseUrl}/download/${encodedSourceName}`;
  }

  // Prepare source files for sending
  async prepareSourceFiles(sources: any[]): Promise<{
    files: SourceFile[];
    sourceDescriptions: string[];
  }> {
    const files: SourceFile[] = [];
    const sourceDescriptions: string[] = [];

    for (const source of sources) {
      try {
        if (source.source && source.download_available !== false) {
          const fileBuffer = await this.downloadSourceFile(source.source);
          
          const file: SourceFile = {
            buffer: fileBuffer,
            originalname: source.source,
            mimetype: this.getMimeTypeFromExtension(source.document_type || '.pdf'),
            size: fileBuffer.length,
            fieldname: 'source_document'
          };

          files.push(file);
          sourceDescriptions.push(`${source.source} (Page ${source.page_number || 'N/A'})`);
        }
      } catch (error) {
        this.logger.warn(`Failed to download source ${source.source}`, error);
        sourceDescriptions.push(`${source.source} (Page ${source.page_number || 'N/A'}) - Download unavailable`);
      }
    }

    return { files, sourceDescriptions };
  }
}