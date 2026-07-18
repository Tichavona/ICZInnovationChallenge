/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, Check } from 'typeorm';

@Entity('messages')
@Check(`"type" IN ('text', 'image', 'audio', 'video', 'document', 'location', 'interactive')`)
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    name: 'from_phone',
    nullable: true,
    length: 255 
  })
  @Index('IX_messages_from')
  from: string;

  @Column({ 
    name: 'to_phone',
    nullable: true,
    length: 255 
  })
  @Index('IX_messages_to')
  to: string;

  @Column({ 
    type: 'nvarchar',
    length: 'MAX',
    nullable: true 
  })
  body: string;

  @Column({ 
    type: 'nvarchar',
    length: 'MAX',
    nullable: true 
  })
  caption: string;

  @Column({ 
    name: 'message_id',
    nullable: true,
    length: 255 
  })
  @Index('IX_messages_message_id')
  messageId: string;

  @Column({ 
    nullable: true,
    length: 50 
  })
  @Index('IX_messages_type')
  type: string; // 'text', 'image', 'audio', 'video', 'document', 'location', 'interactive'

  @Column('nvarchar', { 
    name: 'metadata',
    length: 'MAX',
    nullable: true 
  })
  metadataJson: string | null;

  // Helper property to work with metadata as object
  private _metadata: any;

  @Column({ 
    name: 'is_from_bot',
    type: 'bit',
    default: false 
  })
  isFromBot: boolean;

  @Column({ 
    name: 'is_read',
    type: 'bit',
    default: false 
  })
  isRead: boolean;

  @CreateDateColumn({ 
    name: 'created_at',
    type: 'datetime2',
    default: () => 'GETUTCDATE()'
  })
  @Index('IX_messages_created_at')
  createdAt: Date;

  // Getter and setter for metadata to handle JSON serialization/deserialization
  get metadata(): any {
    if (this.metadataJson && !this._metadata) {
      try {
        this._metadata = JSON.parse(this.metadataJson);
      } catch (error) {
        this._metadata = this.metadataJson;
      }
    }
    return this._metadata;
  }

  set metadata(value: any) {
    this._metadata = value;
    if (value && typeof value === 'object') {
      this.metadataJson = JSON.stringify(value);
    } else if (value && typeof value === 'string') {
      try {
        // If it's a valid JSON string, store it directly
        JSON.parse(value);
        this.metadataJson = value;
        this._metadata = JSON.parse(value);
      } catch {
        // If it's not valid JSON, wrap it
        this.metadataJson = JSON.stringify({ value });
        this._metadata = { value };
      }
    } else {
      this.metadataJson = null;
      this._metadata = null;
    }
  }

  // Composite indexes are handled via @Index decorators on multiple columns
  // Note: TypeORM doesn't support composite indexes with the same decorator name,
  // so we need to define them separately in the migration or use @Index with custom name
  
  // Helper method to get the direction of the message
  get direction(): 'incoming' | 'outgoing' {
    return this.isFromBot ? 'outgoing' : 'incoming';
  }

  // Helper method to get the phone number of the other party
  get otherParty(): string | null {
    return this.isFromBot ? this.to : this.from;
  }

  // Helper method to get the content of the message
  get content(): string | null {
    return this.body || this.caption || null;
  }
}