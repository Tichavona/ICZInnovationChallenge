/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../database/user.entity';

/**
 * Extended user interface with additional properties from JWT
 * Note: This doesn't extend User to avoid type conflicts with numeric vs string IDs
 */
export interface RequestUser {
  // Core user properties (matching User entity but with string IDs from JWT)
  id: string;                    // JWT sub claim (usually string)
  email: string;
  phone?: string;
  
  // JWT-specific properties
  roles: string[];
  departmentId?: string;
  stationId?: string;
  permissions?: string[];
  isSuperAdmin?: boolean;
  
  // Optional User entity reference (if you need the full entity)
  userEntity?: User;
  
  // Allow additional properties
  [key: string]: any;
}

/**
 * Alternative approach if you want to keep the User entity relationship
 * This version properly handles the type mismatch
 */
export interface RequestUserWithEntity {
  // JWT claims (usually strings)
  id: string;
  email: string;
  phone?: string;
  roles: string[];
  departmentId?: string;
  stationId?: string;
  permissions?: string[];
  isSuperAdmin?: boolean;
  
  // Actual User entity from database (with numeric ID)
  userEntity?: User;
}

/**
 * Type-safe current user decorator
 * 
 * Usage:
 * @Get('profile')
 * async getProfile(@CurrentUser() user: RequestUser) {
 *   return user;
 * }
 * 
 * @Get('department')
 * async getDepartment(@CurrentUser('departmentId') deptId: string) {
 *   return deptId;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as RequestUser;

    if (!user) {
      return null;
    }

    // If a specific property is requested, return that property
    if (data) {
      return user[data];
    }

    // Otherwise return the entire user object
    return user;
  },
);