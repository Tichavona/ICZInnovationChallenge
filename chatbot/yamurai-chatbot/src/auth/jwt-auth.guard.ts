/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    
    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      // Log the authentication failure
      const request = context.switchToHttp().getRequest();
      console.warn(`JWT Authentication failed for ${request.method} ${request.url}:`, {
        error: err?.message,
        info: info?.message,
        ip: request.ip,
        userAgent: request.get('user-agent')
      });

      throw err || new UnauthorizedException('Authentication required. Please log in.');
    }

    // Additional user status checks
    if (user.status && user.status !== 'active') {
      throw new UnauthorizedException(`Account is ${user.status}. Please contact support.`);
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('Account is deactivated.');
    }

    return user;
  }
}