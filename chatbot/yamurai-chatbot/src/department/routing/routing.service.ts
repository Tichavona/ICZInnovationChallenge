/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
// src/department/routing/routing.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmergencyReport, EmergencyType } from '../../database/emergency-report.entity';
import { IssueReport, IssueType } from '../../database/issue-report.entity';
import { Department, DepartmentStaff, DepartmentType } from '../../database/department.entity';
// import { IncidentRoutingRule } from '../../database/department.entity';

@Injectable()
export class SmartRoutingService {
  private readonly logger = new Logger(SmartRoutingService.name);

  // Mapping of emergency types to departments with priorities
  private readonly emergencyRoutingMap: Record<EmergencyType, DepartmentType[]> = {
    [EmergencyType.ROBBERY]: [DepartmentType.POLICE, DepartmentType.EMERGENCY_COORDINATION],
    [EmergencyType.CRIME]: [DepartmentType.POLICE, DepartmentType.EMERGENCY_COORDINATION],
    [EmergencyType.ACCIDENT]: [
      DepartmentType.AMBULANCE, 
      DepartmentType.POLICE, 
      DepartmentType.FIRE_BRIGADE, // For vehicle extraction
      DepartmentType.EMERGENCY_COORDINATION
    ],
    [EmergencyType.MEDICAL]: [DepartmentType.AMBULANCE, DepartmentType.EMERGENCY_COORDINATION],
    [EmergencyType.FIRE]: [
      DepartmentType.FIRE_BRIGADE, 
      DepartmentType.AMBULANCE, // For medical support
      DepartmentType.POLICE, // For crowd control
      DepartmentType.EMERGENCY_COORDINATION
    ],
    [EmergencyType.NATURAL_DISASTER]: [
      DepartmentType.EMERGENCY_COORDINATION,
      DepartmentType.FIRE_BRIGADE,
      DepartmentType.AMBULANCE,
      DepartmentType.POLICE
    ],
    [EmergencyType.AMBULANCE]: [DepartmentType.AMBULANCE, DepartmentType.EMERGENCY_COORDINATION],
    [EmergencyType.OTHER]: [DepartmentType.EMERGENCY_COORDINATION]
  };

  // Mapping of issue types to departments
  private readonly issueRoutingMap: Record<IssueType, DepartmentType> = {
    [IssueType.POTHOLE]: DepartmentType.CITY_COUNCIL,
    [IssueType.SEWER]: DepartmentType.CITY_COUNCIL,
    [IssueType.WATER_PIPE_BURST]: DepartmentType.CITY_COUNCIL,
    [IssueType.LITTER]: DepartmentType.WASTE_MANAGEMENT,
    [IssueType.OTHER]: DepartmentType.CITY_COUNCIL
  };

  constructor(
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    // @InjectRepository(IncidentRoutingRule)
    // private routingRuleRepository: Repository<IncidentRoutingRule>
  ) {}

  /**
   * Route emergency to appropriate departments based on type and severity
   */
  async routeEmergency(emergency: EmergencyReport): Promise<{
    primaryDepartment: Department;
    secondaryDepartments: Department[];
    coordinationRequired: boolean;
  }> {
    const requiredDeptTypes = this.emergencyRoutingMap[emergency.type] || 
                             [DepartmentType.EMERGENCY_COORDINATION];

    // Get active departments for each required type
    const departments = await Promise.all(
      requiredDeptTypes.map(deptType => 
        this.getAvailableDepartment(deptType, emergency)
      )
    );

    // Primary department is first in the list
    const primaryDepartment = departments[0];
    const secondaryDepartments = departments.slice(1).filter(dept => dept !== null);

    // Check if coordination is needed (multiple departments involved)
    const coordinationRequired = departments.length > 1;

    this.logger.log(`Emergency #${emergency.id} routed to: ${primaryDepartment?.name}`);

    return {
      primaryDepartment,
      secondaryDepartments,
      coordinationRequired
    };
  }

  /**
   * Route civic issue to appropriate department
   */
  async routeIssue(issue: IssueReport): Promise<Department> {
    const deptType = this.issueRoutingMap[issue.type] || DepartmentType.CITY_COUNCIL;
    
    const department = await this.getAvailableDepartment(deptType, issue);

    this.logger.log(`Issue #${issue.id} routed to: ${department?.name}`);

    return department;
  }

  /**
   * Get available department based on type, location, and capacity
   */
  private async getAvailableDepartment(
    deptType: DepartmentType, 
    incident: any
  ): Promise<Department> {
    // Build query based on department type and operational status
    const query = this.departmentRepository
      .createQueryBuilder('dept')
      .where('dept.type = :type', { type: deptType })
      .andWhere('dept.status = :status', { status: 'active' });

    // Add geographic proximity if location data is available
    if (incident.latitude && incident.longitude) {
      query.addSelect(`
        (6371 * acos(
          cos(radians(:lat)) * 
          cos(radians(dept.latitude)) * 
          cos(radians(dept.longitude) - radians(:lng)) + 
          sin(radians(:lat)) * 
          sin(radians(dept.latitude))
        )) as distance
      `)
      .setParameter('lat', incident.latitude)
      .setParameter('lng', incident.longitude)
      .orderBy('distance', 'ASC');
    }

    // Prioritize departments with available capacity
    query.addOrderBy('dept.activeIncidents', 'ASC')
          .addOrderBy('dept.activeStaff', 'DESC');

    const department = await query.getOne();

    if (!department) {
      this.logger.warn(`No available ${deptType} department found for incident`);
      // Fallback to any department of this type
      const fallback = await this.departmentRepository.findOne({
        where: { type: deptType, status: 'active' }
      });
      
      if (!fallback) {
        throw new Error(`No ${deptType} department configured in system`);
      }
      
      return fallback;
    }

    return department;
  }

  /**
   * Auto-assign staff based on availability and specialization
   */
  async assignStaffToIncident(
    department: Department, 
    incident: any
  ): Promise<string[]> {
    const staffQuery = this.departmentRepository.manager
      .createQueryBuilder(DepartmentStaff, 'staff')
      .leftJoinAndSelect('staff.user', 'user')
      .where('staff.departmentId = :deptId', { deptId: department.id })
      .andWhere('staff.isActive = :active', { active: true })
      .andWhere('staff.isOnDuty = :onDuty', { onDuty: true })
      .andWhere('staff.currentAssignments < :maxAssignments', { maxAssignments: 5 }) // Configurable limit
      .orderBy('staff.currentAssignments', 'ASC');

    // Add specialization matching for certain incident types
    if (incident.type === EmergencyType.ACCIDENT) {
      staffQuery.andWhere('staff.specialization IN (:...specializations)', {
        specializations: ['Paramedic', 'Traffic Police', 'Fire Rescue']
      });
    } else if (incident.type === EmergencyType.FIRE) {
      staffQuery.andWhere('staff.specialization IN (:...specializations)', {
        specializations: ['Fire Fighter', 'Fire Investigator', 'Rescue Specialist']
      });
    }

    const availableStaff = await staffQuery.getMany();

    // Assign based on availability and load balancing
    const assignedStaff = availableStaff.slice(0, this.getRequiredStaffCount(incident));

    // Update staff assignment counts
    await Promise.all(
      assignedStaff.map(staff => 
        this.departmentRepository.manager.update(DepartmentStaff, staff.id, {
          currentAssignments: () => 'currentAssignments + 1'
        })
      )
    );

    return assignedStaff.map(staff => staff.user.id.toString());
  }

  private getRequiredStaffCount(incident: any): number {
    // Determine required staff based on incident severity
    switch (incident.priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }

  /**
   * Handle multi-department coordination for complex incidents
   */
  async coordinateMultiDepartmentResponse(
    primaryDept: Department,
    secondaryDepts: Department[],
    incident: any
  ): Promise<{
    coordinator: string;
    communicationChannel: string;
    sharedResources: string[];
  }> {
    // Create coordination channel
    const channelId = `coord-${incident.id}-${Date.now()}`;
    
    // Assign coordination to emergency coordination department
    const coordinationDept = await this.getAvailableDepartment(
      DepartmentType.EMERGENCY_COORDINATION, 
      incident
    );

    // Get coordination staff
    const coordinators = await this.assignStaffToIncident(coordinationDept, {
      ...incident,
      type: 'coordination'
    });

    // Log coordination setup
    this.logger.log(`Multi-department coordination established for incident #${incident.id}`);
    this.logger.log(`Departments involved: ${[primaryDept.name, ...secondaryDepts.map(d => d.name)].join(', ')}`);

    return {
      coordinator: coordinators[0] || 'system',
      communicationChannel: channelId,
      sharedResources: [
        'incident_map',
        'live_updates',
        'resource_tracker',
        'personnel_roster'
      ]
    };
  }
} 
