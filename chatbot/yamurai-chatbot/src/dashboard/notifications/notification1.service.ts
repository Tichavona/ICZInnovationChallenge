/* eslint-disable prettier/prettier */
// /* eslint-disable @typescript-eslint/require-await */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable prettier/prettier */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// // src/dashboard/notifications/notification.service.ts
// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { DashboardNotification } from '../../database/dashboard.entity';
// import { NotificationGateway } from './notification.gateway';

// // Define a type for the notification creation result
// type NotificationResult = {
//   notification: DashboardNotification;
//   delivery: {
//     delivered: boolean;
//     online: boolean;
//     queued?: boolean;
//   };
// };

// @Injectable()
// export class NotificationService {
//   constructor(
//     @InjectRepository(DashboardNotification)
//     private notificationRepository: Repository<DashboardNotification>,
//     private notificationGateway: NotificationGateway,
//   ) {}

//   async createNotification(data: {
//     recipientId: string;
//     type: 'new_ticket' | 'assignment' | 'status_update' | 'message' | 'system';
//     message: string;
//     relatedTicketType: 'emergency' | 'issue';
//     relatedTicketId: number;
//     metadata?: any;
//   }): Promise<NotificationResult> {
//     // Create notification in database
//     const notification = this.notificationRepository.create({
//       recipient: { id: data.recipientId } as any,
//       type: data.type,
//       message: data.message,
//       relatedTicketType: data.relatedTicketType,
//       relatedTicketId: data.relatedTicketId,
//       createdAt: new Date(),
//     });

//     const savedNotification = await this.notificationRepository.save(notification);

//     // Send real-time notification[citation:3]
//     const deliveryResult = await this.notificationGateway.sendToUser(
//       data.recipientId,
//       {
//         id: savedNotification.id,
//         type: savedNotification.type,
//         message: savedNotification.message,
//         ticketType: savedNotification.relatedTicketType,
//         ticketId: savedNotification.relatedTicketId,
//         timestamp: savedNotification.createdAt,
//         metadata: data.metadata
//       }
//     );

//     return { notification: savedNotification, delivery: deliveryResult };
//   }

//   async notifyNewTicket(ticket: any, assignedToId?: string): Promise<NotificationResult[]> {
//     const notifications: NotificationResult[] = [];
    
//     // Notify supervisors (all supervisors get new ticket notifications)
//     const supervisors = await this.getUsersByRole('supervisor');
    
//     for (const supervisor of supervisors) {
//       const notification = await this.createNotification({
//         recipientId: supervisor.id,
//         type: 'new_ticket',
//         message: `New ${ticket.type} ticket created: ${ticket.title || `Ticket #${ticket.id}`}`,
//         relatedTicketType: ticket.type,
//         relatedTicketId: ticket.id,
//         metadata: { priority: ticket.priority, location: ticket.location }
//       });
//       notifications.push(notification);
//     }

//     // Notify assigned agent if applicable
//     if (assignedToId) {
//       const assignmentNotification = await this.createNotification({
//         recipientId: assignedToId,
//         type: 'assignment',
//         message: `You have been assigned to ${ticket.type} ticket #${ticket.id}`,
//         relatedTicketType: ticket.type,
//         relatedTicketId: ticket.id
//       });
//       notifications.push(assignmentNotification);
//     }

//     return notifications;
//   }

//   async notifyStatusUpdate(ticketId: number, ticketType: 'emergency' | 'issue', 
//                           newStatus: string, updatedBy: string): Promise<NotificationResult[]> {
//     // Get all users watching this ticket
//     const watchers = await this.getTicketWatchers(ticketId, ticketType);
    
//     const notifications: NotificationResult[] = [];
//     for (const watcher of watchers) {
//       if (watcher.id !== updatedBy) { // Don't notify the user who made the change
//         const notification = await this.createNotification({
//           recipientId: watcher.id,
//           type: 'status_update',
//           message: `Ticket #${ticketId} status updated to: ${newStatus}`,
//           relatedTicketType: ticketType,
//           relatedTicketId: ticketId,
//           metadata: { newStatus, updatedBy }
//         });
//         notifications.push(notification);
//       }
//     }

//     return notifications;
//   }

//   private async getUsersByRole(role: string): Promise<any[]> {
//     // Query users by role from database
//     return [];
//   }

//   private async getTicketWatchers(ticketId: number, ticketType: string): Promise<any[]> {
//     // Get users assigned to or watching this ticket
//     return [];
//   }
// }