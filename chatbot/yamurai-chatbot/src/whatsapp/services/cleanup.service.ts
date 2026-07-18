/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionManagerService } from './session-manager.service';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(private readonly sessionManager: SessionManagerService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleSessionCleanup() {
    this.logger.log('Starting session cleanup...');
    try {
      await this.sessionManager.performAllCleanup();
      this.logger.log('Session cleanup completed');
    } catch (error) {
      this.logger.error('Error during session cleanup:', error);
    }
  }
}