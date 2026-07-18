/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from './notification.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { DashboardNotification } from '../../database/dashboard.entity';

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    private readonly notificationService: NotificationService,
    @InjectRepository(DashboardNotification)
    private notificationRepository: Repository<DashboardNotification>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleEscalationCheck() {
    this.logger.log('Starting notification escalation check...');
    
    try {
      // Get all pending notifications that haven't been acknowledged
      const pendingNotifications = await this.notificationRepository.find({
        where: { 
          status: In(['PENDING', 'SENT']),
          escalationLevel: LessThan(3) // Max escalation level
        },
        relations: ['report']
      });

      const now = new Date();
      let escalatedCount = 0;

      for (const notification of pendingNotifications) {
        const timeElapsed = Math.floor(
          (now.getTime() - notification.createdAt.getTime()) / (1000 * 60)
        );

        // Get thresholds based on priority
        const thresholds = this.getEscalationThresholds(notification.priority);

        let escalated = false;
        if (timeElapsed > thresholds.secondEscalation && notification.escalationLevel < 2) {
          await this.escalateNotification(notification, 2, 'CRITICAL - Immediate action required');
          escalated = true;
        } else if (timeElapsed > thresholds.firstEscalation && notification.escalationLevel < 1) {
          await this.escalateNotification(notification, 1, 'HIGH - Response overdue');
          escalated = true;
        } else if (timeElapsed > thresholds.initial && notification.escalationLevel < 0) {
          await this.escalateNotification(notification, 0, 'MEDIUM - Initial response pending');
          escalated = true;
        }

        if (escalated) {
          escalatedCount++;
          
          // Send notification to supervisors for critical escalations
          if (notification.escalationLevel >= 1) {
            await this.notifySupervisors(notification);
          }
        }
      }

      this.logger.log(`Escalation check completed. Escalated ${escalatedCount} notifications`);
    } catch (error) {
      this.logger.error('Error during escalation check:', error);
    }
  }

  private getEscalationThresholds(priority: string): { initial: number; firstEscalation: number; secondEscalation: number } {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return { initial: 5, firstEscalation: 15, secondEscalation: 30 };
      case 'HIGH':
        return { initial: 15, firstEscalation: 30, secondEscalation: 60 };
      case 'MEDIUM':
        return { initial: 30, firstEscalation: 60, secondEscalation: 120 };
      case 'LOW':
        return { initial: 60, firstEscalation: 120, secondEscalation: 240 };
      default:
        return { initial: 30, firstEscalation: 60, secondEscalation: 120 };
    }
  }

  private async escalateNotification(
    notification: DashboardNotification,
    level: number,
    message: string
  ): Promise<void> {
    notification.escalationLevel = level;
    notification.updatedAt = new Date();
    notification.message = `[ESCALATION LEVEL ${level + 1}] ${message}\nOriginal: ${notification.message}`;

    await this.notificationRepository.save(notification);
    this.logger.log(`Notification ${notification.id} escalated to level ${level + 1}`);
  }

  private async notifySupervisors(notification: DashboardNotification): Promise<void> {
    // Implement supervisor notification logic
    // This could be email, SMS, or another WhatsApp message to supervisor numbers
    this.logger.log(`Supervisor notified for escalated notification ${notification.id}`);
  }
}