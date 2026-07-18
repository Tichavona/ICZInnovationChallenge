export interface WebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from: string;
          id: string;
          type: string;
          text?: { body: string };
          image?: { id: string; mime_type: string };
          audio?: { id: string; mime_type: string };
          video?: { id: string; mime_type: string };
          document?: { id: string; mime_type: string };
          location?: { latitude: number; longitude: number };
        }>;
        interactive?: {
          type: string;
          button_reply?: {
            id: string;
            title: string;
          };
          list_reply?: {
            id: string;
            title: string;
            description?: string;
          };
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        metadata?: {
          display_phone_number: string;
          phone_number_id: string;
        };
        message?: any;
        statuses?: Array<any>;
      };
    }>;
  }>;
}

export interface MessageData {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: string;
  text?: {
    preview_url: boolean;
    body: string;
  };
  interactive?: {
    type: string;
    body: {
      text: string;
    };
    action: {
      buttons?: Array<{
        type: string;
        reply: {
          id: string;
          title: string;
        };
      }>;
      sections?: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}

export interface RegistrationData {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  idNumber?: string;
  address?: string;
  idDocumentUrl?: string;
  proofOfResidenceUrl?: string;
  step?: number;
}

export interface EditSessionData {
  step: 'SELECT_REPORT_TYPE' | 'SELECT_REPORT_ID' | 'SHOW_EDIT_MENU' | 'EDIT_IN_PROGRESS' | 'CONFIRM_EDIT';
  reportType?: 'EMERGENCY' | 'ISSUE';
  reportId?: number;
  reportData?: any;
  editAction?: string;
  editData?: any;
  userReports?: any[];
  requiresInput?: boolean;
  startedAt?: Date;
  messageId?: string;
  data?: any;
}

export type RAGOrganisation = 'Government' | 'Agriculture';

export interface RAGSessionData {
  organisation: RAGOrganisation;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  startedAt: Date;
  messageId?: string;
  lastSources?: any[];
  lastActive?: Date;
  lastMessageId?: string;
}

export interface PendingRAGRequest {
  promise: Promise<void>;
  timeout: NodeJS.Timeout;
  startTime: number;
  messageId: string;
  organisation: RAGOrganisation;
  query: string;
} 
