// src/dashboard/dto/dashboard-filters.dto.ts
/* eslint-disable prettier/prettier */

export class DashboardFiltersDto {
  status?: string | string[];
  type?: string | string[];
  priority?: string | string[];
  timeframe?: '1h' | '24h' | '7d' | '30d' | '90d';
  stationId?: string;
  district?: string;
  ward?: string;
  zone?: string;
  assignedTo?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  includeArchived?: boolean;
}

export class IncidentActionDto {
  status: string;
  notes?: string;
  resolutionNotes?: string;
  resolvedAt?: Date;
  additionalData?: Record<string, any>;
}

export class AssignmentDto {
  stationId: string;
  staffIds?: string[];
  priority?: 'high' | 'medium' | 'low';
  estimatedArrival?: Date;
  estimatedCompletion?: Date;
  notes?: string;
  autoAssign?: boolean;
  requireAcknowledgment?: boolean;
}

export class BulkActionDto {
  incidentIds: string[];
  action: 'assign' | 'reassign' | 'update-status' | 'escalate' | 'resolve' | 'delete' | 'archive';
  data?: {
    stationId?: string;
    staffIds?: string[];
    status?: string;
    priority?: string;
    notes?: string;
    escalationLevel?: string;
    resolutionNotes?: string;
  };
}

export class DateRangeDto {
  startDate: Date;
  endDate: Date;
}