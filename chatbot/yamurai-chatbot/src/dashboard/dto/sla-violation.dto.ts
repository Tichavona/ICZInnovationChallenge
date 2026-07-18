/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import { 
  IsString, 
  IsEnum, 
  IsDateString, 
  IsNumber, 
  IsOptional, 
  IsArray,
  IsBoolean,
  ValidateNested,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmergencyPriority } from '../../database/emergency-report.entity';
import { LocationResponseDto } from './incident-response.dto';

export enum SLABreachSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum SLAType {
  RESPONSE_TIME = 'response_time',
  RESOLUTION_TIME = 'resolution_time',
  UPDATE_FREQUENCY = 'update_frequency',
  ACKNOWLEDGMENT = 'acknowledgment'
}

export class SLAConfigDto {
  @IsString()
  id: string;

  @IsString()
  departmentId: string;

  @IsString()
  incidentType: string;

  @IsEnum(EmergencyPriority)
  priority: EmergencyPriority;

  @IsNumber()
  responseTimeMinutes: number;

  @IsNumber()
  resolutionTimeMinutes: number;

  @IsNumber()
  updateFrequencyMinutes: number;

  @IsArray()
  escalationRules: Array<{
    level: string;
    triggerMinutes: number;
    notifyRoles: string[];
  }>;

  @IsBoolean()
  isActive: boolean;
}

export class SLABreachDto {
  @IsString()
  id: string;

  @IsString()
  incidentId: string;

  @IsString()
  incidentType: 'emergency' | 'issue';

  @IsEnum(SLAType)
  slaType: SLAType;

  @IsEnum(SLABreachSeverity)
  severity: SLABreachSeverity;

  @IsNumber()
  targetMinutes: number;

  @IsNumber()
  actualMinutes: number;

  @IsNumber()
  overageMinutes: number;

  @IsDateString()
  breachedAt: string;

  @IsString()
  @IsOptional()
  breachedBy?: string; // User/System that detected breach

  @IsString()
  currentStatus: string;

  @ValidateNested()
  @Type(() => LocationResponseDto)
  @IsOptional()
  location?: LocationResponseDto;

  @IsString()
  @IsOptional()
  assignedStation?: string;

  @IsString()
  @IsOptional()
  assignedStaff?: string;

  @IsArray()
  @IsString({ each: true })
  escalationLevels: string[];

  @IsBoolean()
  isResolved: boolean;

  @IsDateString()
  @IsOptional()
  resolvedAt?: string;

  @IsString()
  @IsOptional()
  resolution?: string;

  @IsObject()
  @IsOptional()
  metrics?: Record<string, any>;
}

export class ActiveSLABreachDto extends SLABreachDto {
  @IsNumber()
  timeElapsed: number;

  @IsNumber()
  timeRemaining: number;

  @IsString()
  nextEscalationLevel: string;

  @IsNumber()
  nextEscalationIn: number;

  @IsArray()
  pendingEscalations: Array<{
    level: string;
    triggerAt: Date;
    notified: boolean;
  }>;
}

export class SLABreachSummaryDto {
  @IsNumber()
  totalBreaches: number;

  @IsNumber()
  activeBreaches: number;

  @IsNumber()
  resolvedBreaches: number;

  @IsObject()
  bySeverity: Record<SLABreachSeverity, number>;

  @IsObject()
  byType: Record<SLAType, number>;

  @IsObject()
  byDepartment: Record<string, number>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SLABreachDto)
  recentBreaches: SLABreachDto[];

  @IsNumber()
  averageOverageMinutes: number;

  @IsNumber()
  complianceRate: number;
}

export class EscalationActionDto {
  @IsString()
  breachId: string;

  @IsString()
  escalateTo: string;

  @IsString()
  level: string;

  @IsString()
  reason: string;

  @IsArray()
  @IsString({ each: true })
  notifyChannels?: ('email' | 'sms' | 'push' | 'dashboard')[];

  @IsString()
  @IsOptional()
  message?: string;

  @IsBoolean()
  @IsOptional()
  autoAssign?: boolean;

  @IsString()
  @IsOptional()
  assignTo?: string;
}

export class SLAPerformanceDto {
  @IsString()
  departmentId: string;

  @IsString()
  @IsOptional()
  stationId?: string;

  @IsNumber()
  complianceRate: number;

  @IsNumber()
  averageResponseTime: number;

  @IsNumber()
  averageResolutionTime: number;

  @IsObject()
  byPriority: Record<EmergencyPriority, {
    complianceRate: number;
    averageResponseTime: number;
    averageResolutionTime: number;
    breachCount: number;
  }>;

  @IsObject()
  byIncidentType: Record<string, {
    complianceRate: number;
    count: number;
    breachCount: number;
  }>;

  @IsObject()
  trends: {
    daily: Array<{ date: string; complianceRate: number }>;
    weekly: Array<{ week: string; complianceRate: number }>;
    monthly: Array<{ month: string; complianceRate: number }>;
  };

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SLABreachDto)
  recentBreaches: SLABreachDto[];
}

export class SLAAlertDto {
  @IsString()
  id: string;

  @IsString()
  incidentId: string;

  @IsString()
  message: string;

  @IsEnum(SLABreachSeverity)
  severity: SLABreachSeverity;

  @IsString()
  type: 'warning' | 'breach' | 'escalation';

  @IsDateString()
  timestamp: string;

  @IsBoolean()
  isRead: boolean;

  @IsString()
  @IsOptional()
  actionRequired?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;
}