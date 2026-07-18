// src/database/incident-status.enum.ts
/* eslint-disable prettier/prettier */

export enum EmergencyStatus {
  REPORTED = 'reported',
  DISPATCHED = 'dispatched',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled'
}

export enum IssueStatus {
  REPORTED = 'reported',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export type IncidentStatus = EmergencyStatus | IssueStatus;