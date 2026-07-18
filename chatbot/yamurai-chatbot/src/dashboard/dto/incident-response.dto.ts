// src/dashboard/dto/incident-response.dto.ts
/* eslint-disable prettier/prettier */

// Basic DTOs first - no dependencies between them

export class LocationResponseDto {
  latitude: number;
  longitude: number;
  address?: string;
  district?: string;
  province?: string;
  region?: string;
}

export class MediaResponseDto {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  uploadedAt: Date;
  description?: string;
}

export class UserResponseDto {
  id: string;
  name?: string;
  phoneNumber?: string;
  email?: string;
  role?: string;
}

export class StaffResponseDto {
  id: string;
  name: string;
  role: string;
  specialization?: string;
  isOnDuty: boolean;
}

export class StationResponseDto {
  id: string;
  name: string;
  type: string;
  location: LocationResponseDto;
  contactPhone?: string;
  currentLoad?: number;
}

export class AssignmentResponseDto {
  id: string;
  assignedStation: StationResponseDto;
  assignedStaff?: StaffResponseDto[];
  status: string;
  assignedAt: Date;
  acknowledgedAt?: Date;
  enRouteAt?: Date;
  onSceneAt?: Date;
  completedAt?: Date;
  distanceToIncidentKm?: number;
  estimatedArrivalMinutes?: number;
}

export class PriorityBreakdownDto {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export class StationPerformanceDto {
  stationId: string;
  stationName: string;
  totalAssigned: number;
  completed: number;
  slaBreaches: number;
  avgResponseTime: number;
}

export class IncidentResponseDto {
  id: string;
  type: 'emergency' | 'issue';
  title?: string;
  description: string;
  status: string;
  priority?: string;
  location?: string;
  locationDetails?: LocationResponseDto;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  assignedTo?: AssignmentResponseDto;
  assignedStation?: StationResponseDto;
  mediaUrls?: string[];
  mediaDetails?: MediaResponseDto[];
  reportedBy?: UserResponseDto;
  reportedByPhone?: string;
  adminNotes?: string;
  userFeedback?: string;
  rating?: number;
  slaMetrics?: {
    responseTarget?: number;
    actualResponse?: number;
    resolutionTarget?: number;
    actualResolution?: number;
    breachedAt?: Date;
    breachLevel?: string;
  };
}

export class DashboardMetricsDto {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  slaBreaches: number;
  slaComplianceRate: number;
  avgResponseTimeMinutes: number;
  stationPerformance: StationPerformanceDto[];
  priorityBreakdown: PriorityBreakdownDto;
  incidentsByType?: Record<string, number>;
  incidentsByStatus?: Record<string, number>;
}

export class PaginatedResponseDto<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SLABreachDto {
  id: string;
  incidentId: string;
  incidentType: string;
  incidentDescription: string;
  assignedStation: string;
  assignedStationId: string;
  breachLevel: string;
  breachedAt: Date;
  responseTarget: number;
  resolutionTarget: number;
  actualResponseTime?: number;
  currentStatus: string;
  priority?: string;
  location?: string;
  reportedAt: Date;
  escalatedTo?: string;
  escalatedAt?: Date;
}

export class ExportOptionsDto {
  format: 'csv' | 'pdf' | 'excel' | 'json';
  fields?: string[];
  includeMetadata?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}