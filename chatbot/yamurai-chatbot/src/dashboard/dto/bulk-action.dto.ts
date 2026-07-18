/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import { 
  IsArray, 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsObject,
  ValidateNested,
  IsBoolean,
  IsDateString
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmergencyStatus, IssueStatus } from '../../database/incident-status.enum';

export enum BulkActionType {
  UPDATE_STATUS = 'update_status',
  ASSIGN = 'assign',
  REASSIGN = 'reassign',
  DELETE = 'delete',
  ARCHIVE = 'archive',
  EXPORT = 'export',
  ESCALATE = 'escalate',
  BULK_NOTIFY = 'bulk_notify',
  GENERATE_REPORT = 'generate_report'
}

export class BulkOperationDto {
  @IsEnum(BulkActionType)
  action: BulkActionType;

  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;
}

export class BulkActionDto {
  @IsArray()
  @IsString({ each: true })
  incidentIds: string[];

  @IsEnum({ ...EmergencyStatus, ...IssueStatus })
  @IsOptional()
  status?: EmergencyStatus | IssueStatus;

  @IsString()
  @IsOptional()
  assignToStation?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assignToStaff?: string[];

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  notifyCitizens?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyAuthorities?: boolean;

  @IsDateString()
  @IsOptional()
  scheduledFor?: string;

  @IsEnum(BulkActionType)
  @IsOptional()
  actionType?: BulkActionType;

  @IsObject()
  @IsOptional()
  actionParameters?: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkOperationDto)
  @IsOptional()
  operations?: BulkOperationDto[];

  // For export operations
  @IsString()
  @IsOptional()
  exportFormat?: 'csv' | 'pdf' | 'excel' | 'json';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  exportFields?: string[];

  // Validation
  @IsBoolean()
  @IsOptional()
  validateOnly?: boolean; // Preview changes without executing

  @IsBoolean()
  @IsOptional()
  dryRun?: boolean; // Test the operation

  // Metadata
  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  authorizedBy?: string;
}

// Specific bulk action DTOs
export class BulkStatusUpdateDto extends BulkActionDto {
  @IsEnum({ ...EmergencyStatus, ...IssueStatus })
  newStatus: EmergencyStatus | IssueStatus;

  @IsString()
  @IsOptional()
  statusReason?: string;
}

export class BulkAssignmentDto extends BulkActionDto {
  @IsString()
  stationId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  staffIds?: string[];

  @IsString()
  @IsOptional()
  assignmentNotes?: string;
}

export class BulkEscalationDto extends BulkActionDto {
  @IsString()
  escalateTo: string; // Department ID or Level

  @IsString()
  escalationReason: string;

  @IsBoolean()
  @IsOptional()
  notifyHigherAuthority?: boolean;
}

export class BulkExportDto {
  // Instead of extending, we compose and pick what we need
  
  @IsArray()
  @IsString({ each: true })
  incidentIds: string[];

  @IsString()
  @IsEnum(['csv', 'pdf', 'excel', 'json'])
  exportFormat: 'csv' | 'pdf' | 'excel' | 'json';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  includeFields?: string[];

  @IsBoolean()
  @IsOptional()
  includeMedia?: boolean;

  @IsBoolean()
  @IsOptional()
  includeHistory?: boolean;

  @IsString()
  @IsOptional()
  dateRange?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['department', 'station', 'type', 'priority'])
  groupBy?: 'department' | 'station' | 'type' | 'priority';

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  validateOnly?: boolean;

  @IsBoolean()
  @IsOptional()
  dryRun?: boolean;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  authorizedBy?: string;

  // Helper method to convert to base DTO if needed
  toBaseActionDto(): BulkActionDto {
    const baseDto = new BulkActionDto();
    baseDto.incidentIds = this.incidentIds;
    baseDto.departmentId = this.departmentId;
    baseDto.notes = this.notes;
    baseDto.validateOnly = this.validateOnly;
    baseDto.dryRun = this.dryRun;
    baseDto.reason = this.reason;
    baseDto.authorizedBy = this.authorizedBy;
    baseDto.actionType = BulkActionType.EXPORT;
    baseDto.actionParameters = {
      exportFormat: this.exportFormat,
      includeFields: this.includeFields,
      includeMedia: this.includeMedia,
      includeHistory: this.includeHistory,
      dateRange: this.dateRange,
      groupBy: this.groupBy
    };
    baseDto.exportFormat = this.exportFormat; // Now this matches the property name
    baseDto.exportFields = this.includeFields;
    return baseDto;
  }
}

// Response DTO for bulk operations
export class BulkOperationResultDto {
  success: boolean;
  totalProcessed: number;
  successful: number;
  failed: number;
  failures?: Array<{
    incidentId: string;
    reason: string;
  }>;
  results?: Record<string, any>;
  message?: string;
  operationId?: string;
  timestamp: Date;
}