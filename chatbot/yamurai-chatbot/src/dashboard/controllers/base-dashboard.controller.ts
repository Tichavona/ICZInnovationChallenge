// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-argument */
// /* eslint-disable @typescript-eslint/no-unsafe-return */
// /* eslint-disable prettier/prettier */
// // src/dashboard/controllers/base-dashboard.controller.ts
// import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
// import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
// import { DepartmentGuard } from '../../department/guards/department.guard';
// import { Roles } from '../rbac/roles.decorator';
// import { UnifiedDashboardService } from '../services/base-dashboard.service';
// import { DashboardFiltersDto, IncidentActionDto, AssignmentDto, BulkActionDto } from '../dto';
// import { UserRole } from '../rbac/roles.enum';
// import { CurrentUser } from '../../auth/current-user.decorator';

// // Role groups for easier management
// const SupervisorRoles = [
//   UserRole.POLICE_SUPERVISOR,
//   UserRole.FIRE_SUPERVISOR,
//   UserRole.AMBULANCE_SUPERVISOR,
//   UserRole.CITY_COUNCIL_SUPERVISOR,
//   UserRole.WASTE_MANAGEMENT_SUPERVISOR,
//   UserRole.AGRICULTURAL_SUPERVISOR,
// ];

// const ManagerRoles = [
//   UserRole.POLICE_MANAGER,
//   UserRole.FIRE_MANAGER,
//   UserRole.AMBULANCE_MANAGER,
//   UserRole.CITY_COUNCIL_MANAGER,
//   UserRole.WASTE_MANAGEMENT_MANAGER,
//   UserRole.AGRICULTURAL_MANAGER,
// ];

// const DirectorRoles = [
//   UserRole.POLICE_DIRECTOR,
//   UserRole.FIRE_DIRECTOR,
//   UserRole.FIRE_CHIEF,
//   UserRole.AMBULANCE_DIRECTOR,
//   UserRole.CITY_COUNCIL_DIRECTOR,
//   UserRole.WASTE_MANAGEMENT_DIRECTOR,
//   UserRole.AGRICULTURAL_DIRECTOR,
// ];

// const FieldAgentRoles = [
//   UserRole.POLICE_FIELD_AGENT,
//   UserRole.POLICE_PATROL_OFFICER,
//   UserRole.FIRE_FIELD_AGENT,
//   UserRole.FIRE_FIGHTER,
//   UserRole.AMBULANCE_FIELD_AGENT,
//   UserRole.AMBULANCE_PARAMEDIC,
//   UserRole.AMBULANCE_EMT,
//   UserRole.CITY_COUNCIL_OFFICER,
//   UserRole.CITY_COUNCIL_INSPECTOR,
//   UserRole.WASTE_MANAGEMENT_OFFICER,
//   UserRole.WASTE_COLLECTION_OFFICER,
//   UserRole.AGRICULTURAL_OFFICER,
// ];

// @Controller('dashboard/base')
// @UseGuards(JwtAuthGuard, DepartmentGuard)
// export class BaseDashboardController {
//   constructor(private readonly baseService: BaseDashboardService) {}

//   /**
//    * Get dashboard metrics with optional filters
//    */
//   @Get('metrics')
//   @Roles(...SupervisorRoles, ...ManagerRoles, ...DirectorRoles, UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN)
//   async getMetrics(
//     @Query() filters: DashboardFiltersDto,
//     @CurrentUser() user: any
//   ) {
//     return this.baseService.getDashboardMetrics(
//       user.departmentId,
//       filters.stationId,
//       filters.timeframe ? {
//         start: new Date(Date.now() - this.getTimeframeMs(filters.timeframe)),
//         end: new Date()
//       } : undefined
//     );
//   }

//   /**
//    * Get all incidents with filtering
//    */
//   @Get('incidents')
//   @Roles(...FieldAgentRoles, ...SupervisorRoles, ...ManagerRoles)
//   async getIncidents(
//     @Query() filters: DashboardFiltersDto,
//     @CurrentUser() user: any
//   ) {
//     return this.baseService.getIncidentsByDepartment(
//       user.departmentId,
//       filters
//     );
//   }

//   /**
//    * Get single incident details
//    */
//   @Get('incidents/:id')
//   @Roles(...FieldAgentRoles, ...SupervisorRoles, ...ManagerRoles)
//   async getIncidentDetails(@Param('id') id: string) {
//     return this.baseService.getIncidentDetails(id);
//   }

//   /**
//    * Update incident status
//    */
//   @Put('incidents/:id/status')
//   @Roles(...FieldAgentRoles, ...SupervisorRoles)
//   @HttpCode(HttpStatus.OK)
//   async updateIncidentStatus(
//     @Param('id') id: string,
//     @Body() updateDto: IncidentActionDto,
//     @CurrentUser() user: any
//   ) {
//     return this.baseService.updateIncidentStatus(
//       id,
//       updateDto.status,
//       updateDto.notes || updateDto.resolutionNotes!,
//       user.id
//     );
//   }

//   /**
//    * Assign incident to station/staff
//    */
//   @Post('incidents/:id/assign')
//   @Roles(...SupervisorRoles, ...ManagerRoles)
//   async assignIncident(
//     @Param('id') id: string,
//     @Body() assignmentDto: AssignmentDto,
//     @CurrentUser() user: any
//   ) {
//     return this.baseService.assignIncident(
//       id,
//       assignmentDto,
//       user.id
//     );
//   }

//   /**
//    * Get stations in department
//    */
//   @Get('stations')
//   @Roles(...FieldAgentRoles, ...SupervisorRoles, ...ManagerRoles)
//   async getStations(@CurrentUser() user: any) {
//     return this.baseService.getStationsByDepartment(user.departmentId);
//   }

//   /**
//    * Get station details with current load
//    */
//   @Get('stations/:id')
//   @Roles(...SupervisorRoles, ...ManagerRoles)
//   async getStationDetails(@Param('id') id: string) {
//     return this.baseService.getStationDetails(id);
//   }

//   /**
//    * Get staff members in department
//    */
//   @Get('staff')
//   @Roles(...SupervisorRoles, ...ManagerRoles, ...DirectorRoles)
//   async getStaff(
//     @CurrentUser() user: any,
//     @Query('stationId') stationId?: string,
//     @Query('onDuty') onDuty?: boolean
//   ) {
//     return this.baseService.getStaffMembers(
//       user.departmentId,
//       stationId,
//       onDuty
//     );
//   }

//   /**
//    * Get SLA configurations
//    */
//   @Get('sla/config')
//   @Roles(...ManagerRoles, ...DirectorRoles, UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN)
//   async getSLAConfig(@CurrentUser() user: any) {
//     return this.baseService.getSLAConfigs(user.departmentId);
//   }

//   /**
//    * Get active SLA breaches
//    */
//   @Get('sla/breaches')
//   @Roles(...SupervisorRoles, ...ManagerRoles)
//   async getSLABreaches(
//     @CurrentUser() user: any,
//     @Query('stationId') stationId?: string
//   ) {
//     return this.baseService.getActiveSLABreaches(
//       user.departmentId,
//       stationId
//     );
//   }

//   /**
//    * Bulk update incidents
//    */
//   @Post('incidents/bulk')
//   @Roles(...ManagerRoles, ...DirectorRoles, UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN)
//   async bulkOperation(
//     @Body() bulkDto: BulkActionDto,
//     @CurrentUser() user: any
//   ) {
//     return this.baseService.bulkUpdateIncidents(
//       bulkDto,
//       user.id
//     );
//   }

//   /**
//    * Export incidents report
//    */
//   @Get('export')
//   @Roles(...ManagerRoles, ...DirectorRoles, UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.ANALYST)
//   async exportIncidents(
//     @Query() filters: DashboardFiltersDto,
//     @Query('format') format: 'csv' | 'pdf' | 'excel' = 'csv'
//   ) {
//     const data = await this.baseService.getExportData(filters);
//     return this.baseService.generateExport(data, format);
//   }

//   private getTimeframeMs(timeframe: string): number {
//     const map = {
//       '1h': 60 * 60 * 1000,
//       '24h': 24 * 60 * 60 * 1000,
//       '7d': 7 * 24 * 60 * 60 * 1000,
//       '30d': 30 * 24 * 60 * 60 * 1000,
//       '90d': 90 * 24 * 60 * 60 * 1000
//     };
//     return map[timeframe] || map['24h'];
//   }
// }

// backend/src/dashboard/controllers/unified-dashboard.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DepartmentGuard } from '../../department/guards/department.guard';
import { Roles } from '../rbac/roles.decorator';
import { UserRole } from '../rbac/roles.enum';
import { CurrentUser } from '../../auth/current-user.decorator';
import { UnifiedDashboardService } from '../services/base-dashboard.service';
import { StatusTrackingService } from '../../tracking/status-tracking.service';
import { AnalyticsService } from '../../analytics/analytics.service';
import { SLAEscalationService } from '../../escalation/sla-escalation.service';
import { RoutingService } from '../../routing/routing.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, DepartmentGuard)
export class UnifiedDashboardController {
  constructor(
    private readonly dashboardService: UnifiedDashboardService,
    private readonly statusService: StatusTrackingService,
    private readonly analyticsService: AnalyticsService,
    private readonly slaService: SLAEscalationService,
    private readonly routingService: RoutingService
  ) {}

  /**
   * Get unified dashboard data
   */
  @Get('unified')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.POLICE_MANAGER,
    UserRole.FIRE_MANAGER,
    UserRole.AMBULANCE_MANAGER,
    UserRole.CITY_COUNCIL_MANAGER,
    UserRole.WASTE_MANAGEMENT_MANAGER,
    UserRole.AGRICULTURAL_MANAGER,
    UserRole.ANALYST
  )
  async getUnifiedDashboard(
    @CurrentUser() user: any,
    @Query('departmentId') departmentId?: string,
    @Query('stationId') stationId?: string,
    @Query('dateRange') dateRange?: string,
    @Query('status') status?: string[],
    @Query('priority') priority?: string[],
    @Query('type') type?: string[],
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    const filters = {
      departmentId,
      stationId,
      dateRange: dateRange ? this.parseDateRange(dateRange) : undefined,
      status: status ? (Array.isArray(status) ? status : [status]) : [],
      priority: priority ? (Array.isArray(priority) ? priority : [priority]) : [],
      type: type ? (Array.isArray(type) ? type : [type]) : [],
      search,
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 20
    };

    return this.dashboardService.getUnifiedDashboard(user.id, user.role, filters);
  }

  /**
   * Get department-specific dashboard
   */
  @Get('department/:departmentId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.POLICE_MANAGER,
    UserRole.FIRE_MANAGER,
    UserRole.AMBULANCE_MANAGER,
    UserRole.CITY_COUNCIL_MANAGER,
    UserRole.WASTE_MANAGEMENT_MANAGER,
    UserRole.AGRICULTURAL_MANAGER
  )
  async getDepartmentDashboard(
    @Param('departmentId') departmentId: string,
    @Query() filters: any
  ) {
    return this.dashboardService.getDepartmentDashboard(departmentId, filters);
  }

  /**
   * Get station-specific dashboard
   */
  @Get('station/:stationId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.POLICE_SUPERVISOR,
    UserRole.FIRE_SUPERVISOR,
    UserRole.AMBULANCE_SUPERVISOR,
    UserRole.CITY_COUNCIL_SUPERVISOR,
    UserRole.WASTE_MANAGEMENT_SUPERVISOR,
    UserRole.AGRICULTURAL_SUPERVISOR
  )
  async getStationDashboard(
    @Param('stationId') stationId: string,
    @Query() filters: any
  ) {
    return this.dashboardService.getStationDashboard(stationId, filters);
  }

  /**
   * Get report status for public tracking
   */
  @Get('status/:reportType/:reportId')
  async getReportStatus(
    @Param('reportType') reportType: 'emergency' | 'issue',
    @Param('reportId') reportId: string,
    @Query('phone') phone?: string
  ) {
    return this.statusService.getReportStatus(reportId, reportType, phone);
  }

  /**
   * Subscribe to status updates
   */
  @Post('status/:reportType/:reportId/subscribe')
  @HttpCode(HttpStatus.OK)
  async subscribeToStatus(
    @Param('reportType') reportType: 'emergency' | 'issue',
    @Param('reportId') reportId: string,
    @Body() body: { phoneNumber: string; preferences?: any }
  ) {
    const success = await this.statusService.subscribeToStatus(
      body.phoneNumber,
      reportId,
      reportType,
      body.preferences
    );

    return { success, message: success ? 'Subscribed successfully' : 'Subscription failed' };
  }

  /**
   * Unsubscribe from status updates
   */
  @Post('status/:reportType/:reportId/unsubscribe')
  @HttpCode(HttpStatus.OK)
  async unsubscribeFromStatus(
    @Param('reportType') reportType: 'emergency' | 'issue',
    @Param('reportId') reportId: string,
    @Body() body: { phoneNumber: string }
  ) {
    const success = await this.statusService.unsubscribeFromStatus(
      body.phoneNumber,
      reportId,
      reportType
    );

    return { success, message: success ? 'Unsubscribed successfully' : 'Unsubscribe failed' };
  }

  /**
   * Cancel a report (user action)
   */
  @Post('status/:reportType/:reportId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelReport(
    @Param('reportType') reportType: 'emergency' | 'issue',
    @Param('reportId') reportId: string,
    @Body() body: { phoneNumber: string; reason?: string }
  ) {
    const success = await this.statusService.cancelReport(
      reportId,
      reportType,
      body.phoneNumber,
      body.reason
    );

    return { success, message: success ? 'Report cancelled' : 'Cancel failed' };
  }

  /**
   * Add feedback to a report
   */
  @Post('status/:reportType/:reportId/feedback')
  @HttpCode(HttpStatus.OK)
  async addFeedback(
    @Param('reportType') reportType: 'emergency' | 'issue',
    @Param('reportId') reportId: string,
    @Body() body: { phoneNumber: string; rating: number; feedback: string }
  ) {
    const success = await this.statusService.addFeedback(
      reportId,
      reportType,
      body.phoneNumber,
      body.rating,
      body.feedback
    );

    return { success, message: success ? 'Feedback submitted' : 'Feedback failed' };
  }

  /**
   * Get analytics report
   */
  @Get('analytics')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.ANALYST,
    UserRole.POLICE_MANAGER,
    UserRole.FIRE_MANAGER,
    UserRole.AMBULANCE_MANAGER,
    UserRole.CITY_COUNCIL_MANAGER
  )
  async getAnalytics(
    @Query('period') period: '24h' | '7d' | '30d' | '90d' | '1y' = '30d',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
    @Query('stationId') stationId?: string,
    @Query('incidentType') incidentType?: string[]
  ) {
    return this.analyticsService.generateReport(
      period,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      { departmentId, stationId, incidentType }
    );
  }

  /**
   * Get SLA dashboard data
   */
  @Get('sla')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.POLICE_MANAGER,
    UserRole.FIRE_MANAGER,
    UserRole.AMBULANCE_MANAGER
  )
  async getSLADashboard(
    @Query('departmentId') departmentId?: string,
    @Query('stationId') stationId?: string
  ) {
    return this.slaService.getSLADashboardData(departmentId, stationId);
  }

  /**
   * Get active escalations
   */
  @Get('escalations')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.POLICE_MANAGER,
    UserRole.FIRE_MANAGER,
    UserRole.AMBULANCE_MANAGER
  )
  async getActiveEscalations(@Query('departmentId') departmentId?: string) {
    return this.slaService.getActiveEscalations(departmentId);
  }

  /**
   * Acknowledge escalation
   */
  @Post('escalations/:escalationId/acknowledge')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.POLICE_MANAGER,
    UserRole.FIRE_MANAGER,
    UserRole.AMBULANCE_MANAGER
  )
  async acknowledgeEscalation(
    @Param('escalationId') escalationId: string,
    @CurrentUser() user: any,
    @Body('notes') notes?: string
  ) {
    return this.slaService.acknowledgeEscalation(escalationId, user.id, notes);
  }

  /**
   * Resolve escalation
   */
  @Post('escalations/:escalationId/resolve')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.POLICE_MANAGER,
    UserRole.FIRE_MANAGER,
    UserRole.AMBULANCE_MANAGER
  )
  async resolveEscalation(
    @Param('escalationId') escalationId: string,
    @CurrentUser() user: any,
    @Body('resolutionNotes') resolutionNotes: string,
    @Body('resolutionAction') resolutionAction: string
  ) {
    return this.slaService.resolveEscalation(escalationId, user.id, resolutionNotes, resolutionAction);
  }

  /**
   * Route an incident (for testing/manual routing)
   */
  @Post('route/emergency')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.POLICE_MANAGER,
    UserRole.FIRE_MANAGER,
    UserRole.AMBULANCE_MANAGER
  )
  async routeEmergency(@Body() emergencyData: any) {
    // This would normally be triggered automatically
    return this.routingService.routeEmergency(emergencyData, {
      preferNearestStation: true,
      considerLoadBalancing: true
    });
  }

  /**
   * Export dashboard data
   */
  @Get('export')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYSTEM_ADMIN,
    UserRole.ANALYST,
    UserRole.POLICE_MANAGER,
    UserRole.FIRE_MANAGER,
    UserRole.AMBULANCE_MANAGER
  )
  async exportDashboard(
    @CurrentUser() user: any,
    @Query('format') format: 'csv' | 'pdf' | 'excel' = 'csv',
    @Res() res: Response,
    @Query('departmentId') departmentId?: string,
    @Query('stationId') stationId?: string,
    @Query('dateRange') dateRange?: string    
  ) {
    const filters = {
      departmentId,
      stationId,
      dateRange: dateRange ? this.parseDateRange(dateRange) : undefined
    };

    const data = await this.dashboardService.exportDashboardData(user.id, user.role, filters, format);

    // Set response headers based on format
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=dashboard_export.csv');
      res.send(data);
    } else if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=dashboard_export.pdf');
      res.send(data);
    } else if (format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', 'attachment; filename=dashboard_export.xlsx');
      res.send(data);
    }
  }

  /**
   * Parse date range string
   */
  private parseDateRange(dateRange: string): { start: Date; end: Date } | undefined {
    if (!dateRange) return undefined;

    const parts = dateRange.split(',');
    if (parts.length === 2) {
      return {
        start: new Date(parts[0]),
        end: new Date(parts[1])
      };
    }

    return undefined;
  }
}