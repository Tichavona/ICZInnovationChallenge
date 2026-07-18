import { Injectable } from '@nestjs/common';

@Injectable()
export class MessageSplitterService {
  private readonly MAX_LENGTH = 4096;

  async splitMessage(text: string, maxLength: number = this.MAX_LENGTH): Promise<string[]> {
    const messages: string[] = [];
    
    if (!text || text.length <= maxLength) {
      return [text];
    }

    const paragraphs = text.split('\n\n');
    let currentMessage = '';
    
    for (const paragraph of paragraphs) {
      const paragraphWithNewlines = paragraph + '\n\n';
      
      if ((currentMessage + paragraphWithNewlines).length > maxLength) {
        if (currentMessage) {
          messages.push(currentMessage.trim());
          currentMessage = paragraphWithNewlines;
        } else {
          const sentences = paragraph.split('. ');
          for (const sentence of sentences) {
            const sentenceWithPeriod = sentence + '. ';
            if ((currentMessage + sentenceWithPeriod).length > maxLength) {
              if (currentMessage) {
                messages.push(currentMessage.trim());
              }
              currentMessage = sentenceWithPeriod;
            } else {
              currentMessage += sentenceWithPeriod;
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
} 
