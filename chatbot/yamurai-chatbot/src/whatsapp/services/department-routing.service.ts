/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { EmergencyType, EmergencyPriority } from '../../database/emergency-report.entity';
import { IssueType } from '../../database/issue-report.entity';

export interface AssignedDepartments {
  primary: string;
  secondary: string[];
  departments: string[];
}

@Injectable()
export class DepartmentRoutingService {
  private readonly logger = new Logger(DepartmentRoutingService.name);

  // Department constants
  private readonly DEPARTMENTS = {
    POLICE: 'Police Department',
    FIRE_BRIGADE: 'Fire Brigade',
    AMBULANCE: 'Ambulance Services',
    CITY_AUTHORITIES: 'City Authorities',
    MINISTRY_OF_ROADS: 'Ministry of Roads',
    GEOPOMONA: 'GeoPomona (Waste Management)',
    HOSPITAL: 'Hospital/Medical Services',
  };

  /**
   * Route emergency reports to appropriate departments
   */
  routeEmergency(emergencyType: EmergencyType, priority: EmergencyPriority): AssignedDepartments {
    let primary = '';
    let secondary: string[] = [];
    let departments: string[] = [];

    switch (emergencyType) {
      case EmergencyType.ROBBERY:
      case EmergencyType.CRIME:
        primary = this.DEPARTMENTS.POLICE;
        departments = [this.DEPARTMENTS.POLICE];
        break;

      case EmergencyType.ACCIDENT:
        primary = this.DEPARTMENTS.POLICE;
        secondary = [this.DEPARTMENTS.FIRE_BRIGADE, this.DEPARTMENTS.AMBULANCE];
        departments = [
          this.DEPARTMENTS.POLICE,
          this.DEPARTMENTS.FIRE_BRIGADE,
          this.DEPARTMENTS.AMBULANCE,
          this.DEPARTMENTS.HOSPITAL
        ];
        break;

      case EmergencyType.MEDICAL:
        primary = this.DEPARTMENTS.AMBULANCE;
        secondary = [this.DEPARTMENTS.HOSPITAL];
        departments = [this.DEPARTMENTS.AMBULANCE, this.DEPARTMENTS.HOSPITAL];
        break;

      case EmergencyType.FIRE:
        primary = this.DEPARTMENTS.FIRE_BRIGADE;
        secondary = [this.DEPARTMENTS.POLICE, this.DEPARTMENTS.AMBULANCE];
        departments = [
          this.DEPARTMENTS.FIRE_BRIGADE,
          this.DEPARTMENTS.POLICE,
          this.DEPARTMENTS.AMBULANCE
        ];
        break;

      case EmergencyType.AMBULANCE:
        primary = this.DEPARTMENTS.AMBULANCE;
        departments = [this.DEPARTMENTS.AMBULANCE, this.DEPARTMENTS.HOSPITAL];
        break;

      case EmergencyType.NATURAL_DISASTER:
        primary = this.DEPARTMENTS.FIRE_BRIGADE;
        secondary = [
          this.DEPARTMENTS.POLICE,
          this.DEPARTMENTS.AMBULANCE,
          this.DEPARTMENTS.CITY_AUTHORITIES
        ];
        departments = [
          this.DEPARTMENTS.FIRE_BRIGADE,
          this.DEPARTMENTS.POLICE,
          this.DEPARTMENTS.AMBULANCE,
          this.DEPARTMENTS.CITY_AUTHORITIES
        ];
        break;

      default:
        primary = this.DEPARTMENTS.CITY_AUTHORITIES;
        departments = [this.DEPARTMENTS.CITY_AUTHORITIES];
    }

    // Adjust based on priority
    if (priority === EmergencyPriority.CRITICAL) {
      departments.push('CRITICAL_RESPONSE_TEAM');
    }

    return { primary, secondary, departments };
  }

  /**
   * Route issue reports to appropriate departments
   */
  routeIssue(issueType: IssueType): AssignedDepartments {
    let primary = '';
    let secondary: string[] = [];
    let departments: string[] = [];

    switch (issueType) {
      case IssueType.POTHOLE:
        primary = this.DEPARTMENTS.MINISTRY_OF_ROADS;
        secondary = [this.DEPARTMENTS.CITY_AUTHORITIES];
        departments = [this.DEPARTMENTS.MINISTRY_OF_ROADS, this.DEPARTMENTS.CITY_AUTHORITIES];
        break;

      case IssueType.LITTER:
        primary = this.DEPARTMENTS.CITY_AUTHORITIES;
        secondary = [this.DEPARTMENTS.GEOPOMONA];
        departments = [this.DEPARTMENTS.CITY_AUTHORITIES, this.DEPARTMENTS.GEOPOMONA];
        break;

      case IssueType.SEWER:
      case IssueType.WATER_PIPE_BURST:
        primary = this.DEPARTMENTS.CITY_AUTHORITIES;
        departments = [this.DEPARTMENTS.CITY_AUTHORITIES];
        break;

      default:
        primary = this.DEPARTMENTS.CITY_AUTHORITIES;
        departments = [this.DEPARTMENTS.CITY_AUTHORITIES];
    }

    return { primary, secondary, departments };
  }

  /**
   * Get department description for confirmation message
   */
  getDepartmentDescription(departments: string[]): string {
    if (departments.length === 1) {
      return `🚨 *${departments[0]}*`;
    } else if (departments.length === 2) {
      return `🚨 *${departments[0]}* and *${departments[1]}*`;
    } else {
      const last = departments.pop();
      return `🚨 *${departments.join('*, *')}*, and *${last}*`;
    }
  }

  /**
   * Get escalation time thresholds based on priority
   */
  getEscalationThresholds(priority: EmergencyPriority): {
    initial: number; // minutes
    firstEscalation: number;
    secondEscalation: number;
  } {
    switch (priority) {
      case EmergencyPriority.CRITICAL:
        return { initial: 5, firstEscalation: 15, secondEscalation: 30 };
      case EmergencyPriority.HIGH:
        return { initial: 15, firstEscalation: 30, secondEscalation: 60 };
      case EmergencyPriority.MEDIUM:
        return { initial: 30, firstEscalation: 60, secondEscalation: 120 };
      case EmergencyPriority.LOW:
        return { initial: 60, firstEscalation: 120, secondEscalation: 240 };
      default:
        return { initial: 30, firstEscalation: 60, secondEscalation: 120 };
    }
  }
} 
