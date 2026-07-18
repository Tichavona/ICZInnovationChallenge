/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DashboardNotification } from '../../database/dashboard.entity';
import { DepartmentRoutingService } from './department-routing.service';
import { EmergencyReport, EmergencyPriority } from '../../database/emergency-report.entity';
import { IssueReport } from '../../database/issue-report.entity';
import { MessagingService } from './messaging/messaging.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  
  // Department contact mapping (would come from database in production)
  private readonly departmentContacts = {
    'Police Department': ['+263123456789', '+263987654321'],
    'Fire Brigade': ['+263123456790'],
    'Ambulance Services': ['+263123456791'],
    'City Authorities': ['+263123456792'],
    'Ministry of Roads': ['+263123456793'],
    'GeoPomona (Waste Management)': ['+263123456794'],
    'Hospital/Medical Services': ['+263123456795'],
  };

  constructor(
    @InjectRepository(DashboardNotification)
    private notificationRepository: Repository<DashboardNotification>,
    private departmentRouting: DepartmentRoutingService,
    private messagingService: MessagingService,
  ) {}

  /**
   * Create notifications for emergency report
   */
  async createEmergencyNotifications(
    report: EmergencyReport,
    departments: string[]
  ): Promise<DashboardNotification[]> {
    const notifications: DashboardNotification[] = [];

    for (const department of departments) {
      const notification = DashboardNotification.createFromReport(
        'EMERGENCY',
        report.id,
        department,
        `${report.type.toUpperCase()} - ${report.priority} Priority`,
        `New ${report.type} emergency reported at ${report.location}`,
        DashboardNotification.fromEmergencyPriority(report.priority),
        {
          emergencyType: report.type,
          location: report.location,
          latitude: report.latitude,
          longitude: report.longitude,
          reportingPhone: report.reportingPhoneNumber,
          timestamp: report.createdAt,
          priority: report.priority,
          description: report.description,
        },
      );

      const savedNotification = await this.notificationRepository.save(notification);
      
      // Send WhatsApp notification to department contacts
      await this.sendDepartmentNotification(savedNotification, department);
      
      notifications.push(savedNotification);
    }

    this.logger.log(`Created ${notifications.length} emergency notifications for departments: ${departments.join(', ')}`);
    return notifications;
  }

  /**
   * Create notifications for issue report
   */
  async createIssueNotifications(
    report: IssueReport,
    departments: string[]
  ): Promise<DashboardNotification[]> {
    const notifications: DashboardNotification[] = [];

    for (const department of departments) {
      const notification = DashboardNotification.createFromReport(
        'ISSUE',
        report.id,
        department,
        `${report.type.toUpperCase()} - Issue Report`,
        `New ${report.type} issue reported at ${report.location || 'Location not specified'}`,
        'MEDIUM',
        {
          issueType: report.type,
          location: report.location,
          latitude: report.latitude,
          longitude: report.longitude,
          reportingPhone: report.reportingPhoneNumber,
          timestamp: report.createdAt,
          description: report.description,
        },
      );

      const savedNotification = await this.notificationRepository.save(notification);
      
      // Send WhatsApp notification to department contacts
      await this.sendDepartmentNotification(savedNotification, department);
      
      notifications.push(savedNotification);
    }

    this.logger.log(`Created ${notifications.length} issue notifications for departments: ${departments.join(', ')}`);
    return notifications;
  }

  private async sendDepartmentNotification(
    notification: DashboardNotification,
    department: string
  ): Promise<void> {
    try {
      const contacts = this.departmentContacts[department] || [];
      
      if (contacts.length === 0) {
        this.logger.warn(`No contacts found for department: ${department}`);
        return;
      }

      const message = this.formatDepartmentMessage(notification);
      
      // Send to all contacts for this department
      for (const contact of contacts) {
        await this.messagingService.sendTextMessage(
          contact,
          message,
          `dept_${Date.now()}`
        );
        this.logger.log(`Notification sent to ${department} at ${contact}`);
      }

      // Mark notification as sent
      notification.status = 'SENT';
      await this.notificationRepository.save(notification);
    } catch (error) {
      this.logger.error(`Failed to send notification to ${department}:`, error);
    }
  }

  private formatDepartmentMessage(notification: DashboardNotification): string {
    // Use the getMetadata() method instead of directly accessing data property
    const data = notification.getMetadata();
    
    let message = `🚨 *NEW ${notification.reportType} REPORT* 🚨\n\n`;
    message += `*Department:* ${notification.department}\n`;
    message += `*Priority:* ${notification.priority}\n`;
    message += `*Title:* ${notification.title}\n\n`;
    
    if (notification.reportType === 'EMERGENCY') {
      message += `*Emergency Type:* ${data.emergencyType}\n`;
    } else {
      message += `*Issue Type:* ${data.issueType}\n`;
    }
    
    message += `*Location:* ${data.location || 'Not specified'}\n`;
    
    if (data.latitude && data.longitude) {
      message += `*Coordinates:* ${data.latitude}, ${data.longitude}\n`;
      message += `*Map Link:* https://maps.google.com/?q=${data.latitude},${data.longitude}\n`;
    }
    
    message += `\n*Description:*\n${data.description || 'No description provided'}\n\n`;
    message += `*Reported By:* ${data.reportingPhone || 'Anonymous'}\n`;
    message += `*Time:* ${new Date(data.timestamp).toLocaleString()}\n\n`;
    message += `*Report ID:* #${notification.reportId}\n\n`;
    message += `_Please acknowledge receipt and dispatch appropriate resources._`;

    return message;
  }

  async checkAndEscalateNotifications(): Promise<void> {
    const pendingNotifications = await this.notificationRepository.find({
      where: { status: In(['PENDING', 'SENT']) },
    });

    const now = new Date();

    for (const notification of pendingNotifications) {
      const timeElapsed = Math.floor(
        (now.getTime() - notification.createdAt.getTime()) / (1000 * 60)
      );

      const thresholds = this.departmentRouting.getEscalationThresholds(
        notification.priority as EmergencyPriority
      );

      let escalated = false;
      if (timeElapsed > thresholds.secondEscalation && notification.escalationLevel < 2) {
        await this.escalateNotification(notification, 2);
        escalated = true;
      } else if (timeElapsed > thresholds.firstEscalation && notification.escalationLevel < 1) {
        await this.escalateNotification(notification, 1);
        escalated = true;
      } else if (timeElapsed > thresholds.initial && notification.escalationLevel < 0) {
        await this.escalateNotification(notification, 0);
        escalated = true;
      }

      if (escalated) {
        // Resend notification with escalation message
        await this.sendDepartmentNotification(notification, notification.department);
      }
    }
  }

  private async escalateNotification(
    notification: DashboardNotification,
    level: number
  ): Promise<void> {
    notification.escalationLevel = level;
    notification.updatedAt = new Date();

    // Add escalation message
    const escalationMessages = [
      '⚠️ Initial escalation: Response overdue',
      '🚨 Second escalation: Urgent attention required',
      '🔴 Critical escalation: Immediate action needed',
    ];

    notification.message += `\n\n${escalationMessages[level]}`;

    await this.notificationRepository.save(notification);
    this.logger.log(`Notification ${notification.id} escalated to level ${level}`);
  }

  private mapToNotificationPriority(priority: EmergencyPriority): string {
    switch (priority) {
      case EmergencyPriority.CRITICAL:
        return 'CRITICAL';
      case EmergencyPriority.HIGH:
        return 'HIGH';
      case EmergencyPriority.MEDIUM:
        return 'MEDIUM';
      case EmergencyPriority.LOW:
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }
}