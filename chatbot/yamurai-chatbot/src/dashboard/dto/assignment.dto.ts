/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { 
  IsString, 
  IsArray, 
  IsOptional, 
  IsDateString, 
  IsNumber,
  IsEnum,
  ValidateNested,
  Min,
  IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AssignmentPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export class StaffAssignmentDto {
  @IsString()
  staffId: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsBoolean()
  @IsOptional()
  isLead?: boolean;
}

export class ResourceDto {
  @IsString()
  resourceType: string;

  @IsString()
  @IsOptional()
  resourceId?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AssignmentDto {
  // Primary assignment
  @IsString()
  stationId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  staffIds?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StaffAssignmentDto)
  @IsOptional()
  staffAssignments?: StaffAssignmentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceDto)
  @IsOptional()
  resources?: ResourceDto[];

  // Timing
  @IsDateString()
  assignedAt?: string;

  @IsDateString()
  @IsOptional()
  estimatedArrival?: string;

  @IsDateString()
  @IsOptional()
  estimatedCompletion?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  estimatedDurationMinutes?: number;

  // Priority and urgency
  @IsEnum(AssignmentPriority)
  @IsOptional()
  priority?: AssignmentPriority;

  @IsBoolean()
  @IsOptional()
  isEmergency?: boolean;

  // Assignment details
  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  specialRequirements?: string;

  // For multi-department coordination
  @IsBoolean()
  @IsOptional()
  requiresCoordination?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  coordinatingDepartments?: string[];

  // For reassignment
  @IsString()
  @IsOptional()
  previousAssignmentId?: string;

  @IsString()
  @IsOptional()
  reassignmentReason?: string;

  // Metadata
  @IsOptional()
  metadata?: Record<string, any>;
}

// Dispatch-specific DTO for emergency services
export class DispatchDto extends AssignmentDto {
  @IsArray()
  @IsString({ each: true })
  vehicleIds?: string[];

  @IsString()
  @IsOptional()
  route?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  currentLatitude?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  currentLongitude?: number;

  @IsString()
  @IsOptional()
  communicationChannel?: string;
}

// Fire brigade dispatch DTO
export class FireDispatchDto extends DispatchDto {
  @IsNumber()
  @Min(0)
  fireEngines?: number;

  @IsNumber()
  @Min(0)
  waterTankers?: number;

  @IsNumber()
  @Min(0)
  firefighters?: number;

  @IsNumber()
  @Min(0)
  officers?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialUnits?: string[];
}

// Ambulance dispatch DTO
export class AmbulanceDispatchDto extends DispatchDto {
  @IsString()
  ambulanceType?: 'basic' | 'advanced' | 'mobile_icu';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  medicalEquipment?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  medications?: string[];

  @IsString()
  @IsOptional()
  destinationHospital?: string;
}

// Police dispatch DTO
export class PoliceDispatchDto extends DispatchDto {
  @IsNumber()
  @Min(0)
  patrolCars?: number;

  @IsBoolean()
  @IsOptional()
  lightsAndSiren?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialUnits?: ('k9' | 'swat' | 'traffic' | 'detective')[];
}