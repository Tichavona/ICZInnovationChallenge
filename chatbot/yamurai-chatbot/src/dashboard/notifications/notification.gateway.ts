// /* eslint-disable @typescript-eslint/no-unsafe-argument */
// /* eslint-disable @typescript-eslint/no-unsafe-call */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/require-await */
// /* eslint-disable prettier/prettier */
// // src/dashboard/notifications/notification.gateway.ts
// import { 
//   WebSocketGateway, 
//   WebSocketServer, 
//   SubscribeMessage, 
//   OnGatewayConnection, 
//   OnGatewayDisconnect,
//   ConnectedSocket,
//   MessageBody 
// } from '@nestjs/websockets';
// import { Server, Socket } from 'socket.io';
// import { Logger, UseGuards } from '@nestjs/common';
// import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

// @WebSocketGateway({
//   cors: {
//     origin: process.env.FRONTEND_URL || 'http://localhost:3000',
//     credentials: true
//   },
//   namespace: '/dashboard'
// })
// export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
//   @WebSocketServer()
//   server: Server;

//   private logger = new Logger(NotificationGateway.name);
//   private userSocketMap = new Map<string, string[]>(); // userId -> socketIds

//   async handleConnection(client: Socket) {
//     try {
//       const token = client.handshake.auth.token || client.handshake.headers.authorization;
//       if (!token) {
//         client.disconnect();
//         return;
//       }

//       // Validate token and extract user info
//       const user = await this.validateToken(token);
//       if (!user) {
//         client.disconnect();
//         return;
//       }

//       // Store socket connection
//       client.data.userId = user.id;
//       client.data.role = user.role;
      
//       const sockets = this.userSocketMap.get(user.id) || [];
//       sockets.push(client.id);
//       this.userSocketMap.set(user.id, sockets);

//       // Join role-based room
//       client.join(`role:${user.role}`);
      
//       // Join department room if applicable
//       if (user.department) {
//         client.join(`dept:${user.department}`);
//       }

//       this.logger.log(`Client connected: ${client.id} | User: ${user.id}`);
      
//       // Send pending notifications
//       await this.sendPendingNotifications(user.id, client);
      
//     } catch (error) {
//       this.logger.error(`Connection error: ${error.message}`);
//       client.disconnect();
//     }
//   }

//   handleDisconnect(client: Socket) {
//     const userId = client.data.userId;
//     if (userId) {
//       const sockets = this.userSocketMap.get(userId) || [];
//       const updatedSockets = sockets.filter(id => id !== client.id);
      
//       if (updatedSockets.length > 0) {
//         this.userSocketMap.set(userId, updatedSockets);
//       } else {
//         this.userSocketMap.delete(userId);
//       }
//     }
//     this.logger.log(`Client disconnected: ${client.id}`);
//   }

//   @SubscribeMessage('join_ticket')
//   handleJoinTicket(@ConnectedSocket() client: Socket, @MessageBody() data: { ticketId: string }) {
//     client.join(`ticket:${data.ticketId}`);
//     this.logger.log(`User ${client.data.userId} joined ticket ${data.ticketId}`);
//   }

//   @SubscribeMessage('leave_ticket')
//   handleLeaveTicket(@ConnectedSocket() client: Socket, @MessageBody() data: { ticketId: string }) {
//     client.leave(`ticket:${data.ticketId}`);
//   }

//   // Send notification to specific user
//   async sendToUser(userId: string, notification: any) {
//     const sockets = this.userSocketMap.get(userId) || [];
    
//     if (sockets.length > 0) {
//       // User is online - send immediately[citation:3]
//       sockets.forEach(socketId => {
//         this.server.to(socketId).emit('notification', notification);
//       });
//       return { delivered: true, online: true };
//     } else {
//       // User is offline - store in queue[citation:3]
//       await this.storeOfflineNotification(userId, notification);
//       return { delivered: false, online: false, queued: true };
//     }
//   }

//   // Send notification to role-based room
//   sendToRole(role: string, notification: any) {
//     this.server.to(`role:${role}`).emit('notification', notification);
//   }

//   // Send notification to department
//   sendToDepartment(department: string, notification: any) {
//     this.server.to(`dept:${department}`).emit('notification', notification);
//   }

//   // Broadcast to all connected dashboard users
//   broadcast(notification: any) {
//     this.server.emit('notification', notification);
//   }

//   // Send ticket-specific updates
//   sendTicketUpdate(ticketId: string, ticketType: 'emergency' | 'issue', update: any) {
//     this.server.to(`ticket:${ticketId}`).emit('ticket_update', {
//       ticketId,
//       ticketType,
//       ...update,
//       timestamp: new Date()
//     });
//   }

//   private async validateToken(token: string): Promise<any> {
//     // Implement JWT validation logic
//     // This should extract user info from the token
//     return { id: 'user-id', role: 'agent', department: 'emergency' };
//   }

//   private async sendPendingNotifications(userId: string, client: Socket) {
//     // Retrieve and send pending notifications from queue[citation:3]
//     const pending = await this.getPendingNotifications(userId);
//     pending.forEach(notification => {
//       client.emit('notification', notification);
//     });
//     await this.clearPendingNotifications(userId);
//   }

//   private async storeOfflineNotification(userId: string, notification: any) {
//     // Store notification in Redis/DB queue for offline delivery[citation:3]
//     // Implementation depends on your queue system (BullMQ, Redis, etc.)
//   }

//   private async getPendingNotifications(userId: string): Promise<any[]> {
//     // Retrieve pending notifications from queue
//     return [];
//   }

//   private async clearPendingNotifications(userId: string) {
//     // Clear delivered notifications from queue
//   }
// }

// backend/src/dashboard/notifications/notification.gateway.ts
import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage, 
  OnGatewayConnection, 
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  },
  namespace: '/dashboard'
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger(NotificationGateway.name);
  private userSocketMap = new Map<string, string[]>(); // userId -> socketIds
  private departmentSocketMap = new Map<string, string[]>(); // departmentId -> socketIds

  async handleConnection(client: Socket) {
    try {
      // Extract user info from handshake
      const userId = client.handshake.query.userId as string;
      const departmentId = client.handshake.query.departmentId as string;
      const role = client.handshake.query.role as string;

      if (!userId) {
        client.disconnect();
        return;
      }

      // Store user connection
      client.data.userId = userId;
      client.data.role = role;
      client.data.departmentId = departmentId;
      
      // Map user to socket
      const userSockets = this.userSocketMap.get(userId) || [];
      userSockets.push(client.id);
      this.userSocketMap.set(userId, userSockets);

      // Map department to socket
      if (departmentId) {
        const deptSockets = this.departmentSocketMap.get(departmentId) || [];
        deptSockets.push(client.id);
        this.departmentSocketMap.set(departmentId, deptSockets);
      }

      // Join role-based room
      client.join(`role:${role}`);
      
      // Join department room if applicable
      if (departmentId) {
        client.join(`dept:${departmentId}`);
      }

      this.logger.log(`Client connected: ${client.id} | User: ${userId} | Dept: ${departmentId}`);
      
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const departmentId = client.data.departmentId;

    if (userId) {
      // Remove from user map
      const userSockets = this.userSocketMap.get(userId) || [];
      const updatedUserSockets = userSockets.filter(id => id !== client.id);
      
      if (updatedUserSockets.length > 0) {
        this.userSocketMap.set(userId, updatedUserSockets);
      } else {
        this.userSocketMap.delete(userId);
      }
    }

    if (departmentId) {
      // Remove from department map
      const deptSockets = this.departmentSocketMap.get(departmentId) || [];
      const updatedDeptSockets = deptSockets.filter(id => id !== client.id);
      
      if (updatedDeptSockets.length > 0) {
        this.departmentSocketMap.set(departmentId, updatedDeptSockets);
      } else {
        this.departmentSocketMap.delete(departmentId);
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_ticket')
  handleJoinTicket(@ConnectedSocket() client: Socket, @MessageBody() data: { ticketId: string }) {
    client.join(`ticket:${data.ticketId}`);
    this.logger.log(`User ${client.data.userId} joined ticket ${data.ticketId}`);
  }

  @SubscribeMessage('leave_ticket')
  handleLeaveTicket(@ConnectedSocket() client: Socket, @MessageBody() data: { ticketId: string }) {
    client.leave(`ticket:${data.ticketId}`);
  }

  /**
   * Send notification to specific user
   */
  async sendToUser(userId: string, notification: any) {
    const sockets = this.userSocketMap.get(userId) || [];
    
    if (sockets.length > 0) {
      sockets.forEach(socketId => {
        this.server.to(socketId).emit('notification', notification);
      });
      return { delivered: true, online: true };
    }
    
    return { delivered: false, online: false };
  }

  /**
   * Send notification to role-based room
   */
  sendToRole(role: string, notification: any) {
    this.server.to(`role:${role}`).emit('notification', notification);
  }

  /**
   * Send notification to department
   */
  sendToDepartment(departmentId: string, notification: any) {
    this.server.to(`dept:${departmentId}`).emit('notification', notification);
  }

  /**
   * Send notification to all connected dashboard users
   */
  broadcast(notification: any) {
    this.server.emit('notification', notification);
  }

  /**
   * Send ticket-specific updates
   */
  sendTicketUpdate(ticketId: string, ticketType: 'emergency' | 'issue', update: any) {
    this.server.to(`ticket:${ticketId}`).emit('ticket_update', {
      ticketId,
      ticketType,
      ...update,
      timestamp: new Date()
    });
  }

  /**
   * Send SLA breach notification
   */
  sendSLABreach(breachData: any) {
    // Send to affected department
    if (breachData.departmentId) {
      this.sendToDepartment(breachData.departmentId, {
        type: 'SLA_BREACH',
        title: 'SLA Breach Alert',
        message: `SLA breached for incident #${breachData.incidentId}`,
        data: breachData,
        timestamp: new Date()
      });
    }

    // Broadcast to all supervisors/managers
    this.sendToRole('supervisor', {
      type: 'SLA_BREACH',
      title: 'SLA Breach Alert',
      message: `SLA breached for incident #${breachData.incidentId}`,
      data: breachData,
      timestamp: new Date()
    });

    this.sendToRole('manager', {
      type: 'SLA_BREACH',
      title: 'SLA Breach Alert',
      message: `SLA breached for incident #${breachData.incidentId}`,
      data: breachData,
      timestamp: new Date()
    });
  }

  /**
   * Send dashboard metrics update
   */
  sendMetricsUpdate(metrics: any) {
    this.broadcast({
      type: 'METRICS_UPDATE',
      data: metrics,
      timestamp: new Date()
    });
  }

  /**
   * Get online status of a user
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSocketMap.get(userId);
    return sockets ? sockets.length > 0 : false;
  }

  /**
   * Get number of online users in a department
   */
  getDepartmentOnlineCount(departmentId: string): number {
    const sockets = this.departmentSocketMap.get(departmentId);
    return sockets ? sockets.length : 0;
  }
}