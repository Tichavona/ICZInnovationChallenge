/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
// src/dashboard/rbac/dashboard.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from './roles.enum';

@Injectable()
export class DashboardGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has access to dashboards (not a citizen)
    const hasDashboardAccess = user.roles?.some((role: UserRole) => 
      role !== UserRole.CITIZEN && 
      role !== UserRole.VERIFIED_CITIZEN && 
      role !== UserRole.BUSINESS_OWNER && 
      role !== UserRole.FARMER
    );

    if (!hasDashboardAccess) {
      throw new ForbiddenException('User does not have dashboard access');
    }

    return true;
  }
}