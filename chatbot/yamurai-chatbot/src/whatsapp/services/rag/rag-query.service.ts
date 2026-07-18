import { Injectable, Logger } from '@nestjs/common';
import { FlaskRagService } from '../flask-rag.service';
import { MessagingService } from '../messaging/messaging.service';
import { MessageSplitterService } from '..//utils/message-splitter.service';
import { RAGSessionService } from './rag-session.service';
import { RAGOrganisation } from '../interfaces/webhook.interface';

@Injectable()
export class RAGQueryService {
  private readonly logger = new Logger(RAGQueryService.name);

  constructor(
    private readonly flaskRagService: FlaskRagService,
    private readonly messagingService: MessagingService,
    private readonly messageSplitter: MessageSplitterService,
    private readonly ragSessionService: RAGSessionService,
  ) {}

  /**
   * Handle a RAG query
   */
  async handleQuery(
    phoneNumber: string,
    query: string,
    organisation: RAGOrganisation,
    messageID: string
  ): Promise<void> {
    try {
      // Show typing indicator
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `🔍 Searching the ${organisation} knowledge base...`,
        messageID
      );

      // Get conversation context
      const context = await this.ragSessionService.getConversationContext(phoneNumber, organisation);
      
      // Enhance query with context
      const enhancedQuery = context ? `${context}\nCurrent query: ${query}` : query;

      // Query Flask RAG
      const response = await this.flaskRagService.queryRAG(enhancedQuery, organisation);

      // Send answer
      if (response.answer) {
        const answerParts = await this.messageSplitter.splitMessage(response.answer);
        for (let i = 0; i < answerParts.length; i++) {
          const part = answerParts[i];
          const partPrefix = answerParts.length > 1 ? `[Part ${i + 1}/${answerParts.length}]\n\n` : '';
          await this.messagingService.sendTextMessage(phoneNumber, partPrefix + part, messageID);
        }
      } else {
        await this.messagingService.sendTextMessage(
          phoneNumber,
          `I couldn't find specific information about that in the ${organisation} knowledge base. Could you rephrase your question?`,
          messageID
        );
      }

      // Update session with history
      await this.ragSessionService.updateRAGSession(
        phoneNumber,
        organisation,
        query,
        response.answer || 'No answer found',
        response.sources,
        messageID
      );

      // Send sources if available
      if (response.sources && response.sources.length > 0) {
        await this.sendSourcesMessage(phoneNumber, response.sources, messageID, organisation);
      }

      // Send follow-up prompt
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `💡 You can ask another ${organisation} question, or type "CANCEL" to exit.`,
        messageID
      );

    } catch (error) {
      this.logger.error(`Error handling ${organisation} RAG query:`, error);
      await this.messagingService.sendTextMessage(
        phoneNumber,
        `❌ Error processing your ${organisation} query. Please try again later.`,
        messageID
      );
    }
  }

  /**
   * Send sources message
   */
  private async sendSourcesMessage(
    phoneNumber: string,
    sources: any[],
    messageID: string,
    organisation: string
  ): Promise<void> {
    if (!sources || sources.length === 0) return;

    try {
      let sourcesMessage = `📚 *Sources (${sources.length}):*\n\n`;
      
      sources.slice(0, 5).forEach((source, index) => {
        sourcesMessage += `${index + 1}. *${source.source || 'Document'}*`;
        if (source['Page number']) {
          sourcesMessage += ` (Page ${source['Page number']})`;
        }
        sourcesMessage += '\n';
        
        if (source['Page Content']) {
          const preview = source['Page Content'].substring(0, 80);
          sourcesMessage += `   📄 ${preview}...\n`;
        }
        sourcesMessage += '\n';
      });

      if (sources.length > 5) {
        sourcesMessage += `... and ${sources.length - 5} more sources\n\n`;
      }

      sourcesMessage += `These sources are from the ${organisation} knowledge base.`;

      await this.messagingService.sendTextMessage(phoneNumber, sourcesMessage, messageID);
    } catch (error) {
      this.logger.error('Error sending sources message:', error);
    }
  }
}
