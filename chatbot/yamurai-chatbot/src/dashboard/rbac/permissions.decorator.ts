/* eslint-disable prettier/prettier */
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

// Define available permissions
export enum DashboardPermission {
  // Ticket permissions
  VIEW_TICKETS = 'ticket:view',
  CREATE_TICKET = 'ticket:create',
  UPDATE_TICKET = 'ticket:update',
  DELETE_TICKET = 'ticket:delete',
  ASSIGN_TICKET = 'ticket:assign',
  RESOLVE_TICKET = 'ticket:resolve',
  
  // User permissions
  VIEW_USERS = 'user:view',
  MANAGE_USERS = 'user:manage',
  
  // Analytics permissions
  VIEW_ANALYTICS = 'analytics:view',
  EXPORT_DATA = 'analytics:export',
  
  // System permissions
  MANAGE_SYSTEM = 'system:manage'
}

export const Permissions = (...permissions: DashboardPermission[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);
 
