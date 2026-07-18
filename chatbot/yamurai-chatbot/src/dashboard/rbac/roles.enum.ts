/* eslint-disable prettier/prettier */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-unsafe-return */
// /* eslint-disable @typescript-eslint/no-unsafe-call */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable prettier/prettier */
// // src/dashboard/rbac/roles.enum.ts

// /**
//  * System-wide base roles
//  */
// export enum BaseRole {
//   CITIZEN = 'citizen',                 // Regular citizen - can report incidents
//   ANONYMOUS = 'anonymous',              // Unauthenticated user - limited access
// }

// /**
//  * Department types for role prefixing
//  */
// export enum DepartmentType {
//   POLICE = 'police',
//   FIRE_BRIGADE = 'fire_brigade',
//   AMBULANCE = 'ambulance',
//   CITY_COUNCIL = 'city_council',
//   WASTE_MANAGEMENT = 'waste_management',
//   AGRICULTURAL = 'agricultural',
//   EMERGENCY_COORDINATION = 'emergency_coordination',
// }

// /**
//  * Role levels within departments
//  */
// export enum RoleLevel {
//   FIELD_AGENT = 'field_agent',          // Frontline staff
//   SUPERVISOR = 'supervisor',             // Team supervisor
//   MANAGER = 'manager',                    // Department manager
//   DIRECTOR = 'director',                   // Department director
//   CHIEF = 'chief',                          // Chief of department (fire/police)
//   ADMIN = 'admin',                          // Department administrator
// }

// /**
//  * Specialized roles within departments
//  */
// export enum SpecializedRole {
//   // Police specializations
//   PATROL_OFFICER = 'patrol_officer',
//   DETECTIVE = 'detective',
//   TRAFFIC_OFFICER = 'traffic_officer',
//   K9_UNIT = 'k9_unit',
//   SWAT = 'swat',
//   COMMUNITY_LIAISON = 'community_liaison',
  
//   // Fire brigade specializations
//   FIRE_FIGHTER = 'fire_fighter',
//   HAZMAT_SPECIALIST = 'hazmat_specialist',
//   RESCUE_SPECIALIST = 'rescue_specialist',
//   FIRE_INVESTIGATOR = 'fire_investigator',
  
//   // Ambulance specializations
//   PARAMEDIC = 'paramedic',
//   EMT = 'emt',
//   CRITICAL_CARE = 'critical_care',
//   FLIGHT_PARAMEDIC = 'flight_paramedic',
  
//   // City council specializations
//   INSPECTOR = 'inspector',
//   ENGINEER = 'engineer',
//   PLANNER = 'planner',
  
//   // Waste management specializations
//   COLLECTION_OFFICER = 'collection_officer',
//   RECYCLING_SPECIALIST = 'recycling_specialist',
  
//   // Agricultural specializations
//   AGRICULTURAL_OFFICER = 'agricultural_officer',
//   VETERINARY_OFFICER = 'veterinary_officer',
//   PLANT_PATHOLOGIST = 'plant_pathologist',
// }

// /**
//  * Emergency response roles (cross-departmental)
//  */
// export enum EmergencyRole {
//   INCIDENT_COMMANDER = 'incident_commander',
//   SITE_COORDINATOR = 'site_coordinator',
//   TRIAGE_OFFICER = 'triage_officer',
//   EVACUATION_COORDINATOR = 'evacuation_coordinator',
//   LIAISON_OFFICER = 'liaison_officer',
// }

// /**
//  * System administration roles
//  */
// export enum SystemRole {
//   SUPER_ADMIN = 'super_admin',           // Full system access
//   SYSTEM_ADMIN = 'system_admin',          // System configuration
//   AUDITOR = 'auditor',                     // Audit logs and compliance
//   ANALYST = 'analyst',                      // Data analysis
// }

// /**
//  * Complete User Role enum combining all role types
//  * This is the main enum to use throughout the application
//  */
// export enum UserRole {
//   // System roles (1000-1999)
//   SUPER_ADMIN = 'super_admin',
//   SYSTEM_ADMIN = 'system_admin',
//   AUDITOR = 'auditor',
//   ANALYST = 'analyst',

//   // Citizen roles (2000-2999)
//   CITIZEN = 'citizen',
//   VERIFIED_CITIZEN = 'verified_citizen',
//   BUSINESS_OWNER = 'business_owner',
//   FARMER = 'farmer',

//   // Police Department roles (3000-3999)
//   POLICE_CHIEF = 'police_chief',
//   POLICE_DIRECTOR = 'police_director',
//   POLICE_MANAGER = 'police_manager',
//   POLICE_SUPERVISOR = 'police_supervisor',
//   POLICE_FIELD_AGENT = 'police_field_agent',
//   POLICE_PATROL_OFFICER = 'police_patrol_officer',
//   POLICE_DETECTIVE = 'police_detective',
//   POLICE_TRAFFIC_OFFICER = 'police_traffic_officer',
//   POLICE_K9_UNIT = 'police_k9_unit',
//   POLICE_SWAT = 'police_swat',
//   POLICE_COMMUNITY_LIAISON = 'police_community_liaison',

//   // Fire Brigade roles (4000-4999)
//   FIRE_CHIEF = 'fire_chief',
//   FIRE_DIRECTOR = 'fire_director',
//   FIRE_MANAGER = 'fire_manager',
//   FIRE_SUPERVISOR = 'fire_supervisor',
//   FIRE_FIELD_AGENT = 'fire_field_agent',
//   FIRE_FIGHTER = 'fire_fighter',
//   FIRE_HAZMAT_SPECIALIST = 'fire_hazmat_specialist',
//   FIRE_RESCUE_SPECIALIST = 'fire_rescue_specialist',
//   FIRE_INVESTIGATOR = 'fire_investigator',

//   // Ambulance roles (5000-5999)
//   AMBULANCE_DIRECTOR = 'ambulance_director',
//   AMBULANCE_MANAGER = 'ambulance_manager',
//   AMBULANCE_SUPERVISOR = 'ambulance_supervisor',
//   AMBULANCE_FIELD_AGENT = 'ambulance_field_agent',
//   AMBULANCE_PARAMEDIC = 'ambulance_paramedic',
//   AMBULANCE_EMT = 'ambulance_emt',
//   AMBULANCE_CRITICAL_CARE = 'ambulance_critical_care',
//   AMBULANCE_FLIGHT_PARAMEDIC = 'ambulance_flight_paramedic',

//   // City Council roles (6000-6999)
//   CITY_COUNCIL_DIRECTOR = 'city_council_director',
//   CITY_COUNCIL_MANAGER = 'city_council_manager',
//   CITY_COUNCIL_SUPERVISOR = 'city_council_supervisor',
//   CITY_COUNCIL_OFFICER = 'city_council_officer',
//   CITY_COUNCIL_INSPECTOR = 'city_council_inspector',
//   CITY_COUNCIL_ENGINEER = 'city_council_engineer',
//   CITY_COUNCIL_PLANNER = 'city_council_planner',

//   // Waste Management roles (7000-7999)
//   WASTE_MANAGEMENT_DIRECTOR = 'waste_management_director',
//   WASTE_MANAGEMENT_MANAGER = 'waste_management_manager',
//   WASTE_MANAGEMENT_SUPERVISOR = 'waste_management_supervisor',
//   WASTE_MANAGEMENT_OFFICER = 'waste_management_officer',
//   WASTE_COLLECTION_OFFICER = 'waste_collection_officer',
//   WASTE_RECYCLING_SPECIALIST = 'waste_recycling_specialist',

//   // Agricultural roles (8000-8999)
//   AGRICULTURAL_DIRECTOR = 'agricultural_director',
//   AGRICULTURAL_MANAGER = 'agricultural_manager',
//   AGRICULTURAL_SUPERVISOR = 'agricultural_supervisor',
//   AGRICULTURAL_OFFICER = 'agricultural_officer',
//   AGRICULTURAL_VETERINARY_OFFICER = 'agricultural_veterinary_officer',
//   AGRICULTURAL_PATHOLOGIST = 'agricultural_pathologist',

//   // Emergency Coordination roles (9000-9999)
//   EMERGENCY_COORDINATOR = 'emergency_coordinator',
//   INCIDENT_COMMANDER = 'incident_commander',
//   SITE_COORDINATOR = 'site_coordinator',
//   TRIAGE_OFFICER = 'triage_officer',
//   EVACUATION_COORDINATOR = 'evacuation_coordinator',
//   LIAISON_OFFICER = 'liaison_officer',
//   SUPERVISOR = "SUPERVISOR",
//   MANAGER = "MANAGER",
//   DIRECTOR = "DIRECTOR",
//   FIELD_AGENT = "FIELD_AGENT",
// }

// /**
//  * Role hierarchy with numeric levels for permission comparison
//  * Higher number = more privileges
//  */
// export const RoleHierarchy: Record<UserRole, number> = {
//   // System roles (highest)
//   [UserRole.SUPER_ADMIN]: 1000,
//   [UserRole.SYSTEM_ADMIN]: 950,
//   [UserRole.AUDITOR]: 900,
//   [UserRole.ANALYST]: 850,

//   // Citizen roles
//   [UserRole.CITIZEN]: 100,
//   [UserRole.VERIFIED_CITIZEN]: 150,
//   [UserRole.BUSINESS_OWNER]: 200,
//   [UserRole.FARMER]: 200,

//   // Police Department
//   [UserRole.POLICE_CHIEF]: 800,
//   [UserRole.POLICE_DIRECTOR]: 750,
//   [UserRole.POLICE_MANAGER]: 700,
//   [UserRole.POLICE_SUPERVISOR]: 650,
//   [UserRole.POLICE_FIELD_AGENT]: 600,
//   [UserRole.POLICE_PATROL_OFFICER]: 580,
//   [UserRole.POLICE_DETECTIVE]: 620,
//   [UserRole.POLICE_TRAFFIC_OFFICER]: 580,
//   [UserRole.POLICE_K9_UNIT]: 590,
//   [UserRole.POLICE_SWAT]: 630,
//   [UserRole.POLICE_COMMUNITY_LIAISON]: 560,

//   // Fire Brigade
//   [UserRole.FIRE_CHIEF]: 800,
//   [UserRole.FIRE_DIRECTOR]: 750,
//   [UserRole.FIRE_MANAGER]: 700,
//   [UserRole.FIRE_SUPERVISOR]: 650,
//   [UserRole.FIRE_FIELD_AGENT]: 600,
//   [UserRole.FIRE_FIGHTER]: 580,
//   [UserRole.FIRE_HAZMAT_SPECIALIST]: 620,
//   [UserRole.FIRE_RESCUE_SPECIALIST]: 620,
//   [UserRole.FIRE_INVESTIGATOR]: 610,

//   // Ambulance
//   [UserRole.AMBULANCE_DIRECTOR]: 750,
//   [UserRole.AMBULANCE_MANAGER]: 700,
//   [UserRole.AMBULANCE_SUPERVISOR]: 650,
//   [UserRole.AMBULANCE_FIELD_AGENT]: 600,
//   [UserRole.AMBULANCE_PARAMEDIC]: 580,
//   [UserRole.AMBULANCE_EMT]: 560,
//   [UserRole.AMBULANCE_CRITICAL_CARE]: 620,
//   [UserRole.AMBULANCE_FLIGHT_PARAMEDIC]: 630,

//   // City Council
//   [UserRole.CITY_COUNCIL_DIRECTOR]: 750,
//   [UserRole.CITY_COUNCIL_MANAGER]: 700,
//   [UserRole.CITY_COUNCIL_SUPERVISOR]: 650,
//   [UserRole.CITY_COUNCIL_OFFICER]: 600,
//   [UserRole.CITY_COUNCIL_INSPECTOR]: 580,
//   [UserRole.CITY_COUNCIL_ENGINEER]: 590,
//   [UserRole.CITY_COUNCIL_PLANNER]: 590,

//   // Waste Management
//   [UserRole.WASTE_MANAGEMENT_DIRECTOR]: 750,
//   [UserRole.WASTE_MANAGEMENT_MANAGER]: 700,
//   [UserRole.WASTE_MANAGEMENT_SUPERVISOR]: 650,
//   [UserRole.WASTE_MANAGEMENT_OFFICER]: 600,
//   [UserRole.WASTE_COLLECTION_OFFICER]: 580,
//   [UserRole.WASTE_RECYCLING_SPECIALIST]: 590,

//   // Agricultural
//   [UserRole.AGRICULTURAL_DIRECTOR]: 750,
//   [UserRole.AGRICULTURAL_MANAGER]: 700,
//   [UserRole.AGRICULTURAL_SUPERVISOR]: 650,
//   [UserRole.AGRICULTURAL_OFFICER]: 600,
//   [UserRole.AGRICULTURAL_VETERINARY_OFFICER]: 610,
//   [UserRole.AGRICULTURAL_PATHOLOGIST]: 610,

//   // Emergency Coordination
//   [UserRole.EMERGENCY_COORDINATOR]: 720,
//   [UserRole.INCIDENT_COMMANDER]: 710,
//   [UserRole.SITE_COORDINATOR]: 680,
//   [UserRole.TRIAGE_OFFICER]: 640,
//   [UserRole.EVACUATION_COORDINATOR]: 640,
//   [UserRole.LIAISON_OFFICER]: 620,
//   [UserRole.SUPERVISOR]: 0,
//   [UserRole.MANAGER]: 0,
//   [UserRole.DIRECTOR]: 0,
//   [UserRole.FIELD_AGENT]: 0
// };

// /**
//  * Department role groups for easier validation
//  */
// export const DepartmentRoles = {
//   [DepartmentType.POLICE]: [
//     UserRole.POLICE_CHIEF,
//     UserRole.POLICE_DIRECTOR,
//     UserRole.POLICE_MANAGER,
//     UserRole.POLICE_SUPERVISOR,
//     UserRole.POLICE_FIELD_AGENT,
//     UserRole.POLICE_PATROL_OFFICER,
//     UserRole.POLICE_DETECTIVE,
//     UserRole.POLICE_TRAFFIC_OFFICER,
//     UserRole.POLICE_K9_UNIT,
//     UserRole.POLICE_SWAT,
//     UserRole.POLICE_COMMUNITY_LIAISON,
//   ],
//   [DepartmentType.FIRE_BRIGADE]: [
//     UserRole.FIRE_CHIEF,
//     UserRole.FIRE_DIRECTOR,
//     UserRole.FIRE_MANAGER,
//     UserRole.FIRE_SUPERVISOR,
//     UserRole.FIRE_FIELD_AGENT,
//     UserRole.FIRE_FIGHTER,
//     UserRole.FIRE_HAZMAT_SPECIALIST,
//     UserRole.FIRE_RESCUE_SPECIALIST,
//     UserRole.FIRE_INVESTIGATOR,
//   ],
//   [DepartmentType.AMBULANCE]: [
//     UserRole.AMBULANCE_DIRECTOR,
//     UserRole.AMBULANCE_MANAGER,
//     UserRole.AMBULANCE_SUPERVISOR,
//     UserRole.AMBULANCE_FIELD_AGENT,
//     UserRole.AMBULANCE_PARAMEDIC,
//     UserRole.AMBULANCE_EMT,
//     UserRole.AMBULANCE_CRITICAL_CARE,
//     UserRole.AMBULANCE_FLIGHT_PARAMEDIC,
//   ],
//   [DepartmentType.CITY_COUNCIL]: [
//     UserRole.CITY_COUNCIL_DIRECTOR,
//     UserRole.CITY_COUNCIL_MANAGER,
//     UserRole.CITY_COUNCIL_SUPERVISOR,
//     UserRole.CITY_COUNCIL_OFFICER,
//     UserRole.CITY_COUNCIL_INSPECTOR,
//     UserRole.CITY_COUNCIL_ENGINEER,
//     UserRole.CITY_COUNCIL_PLANNER,
//   ],
//   [DepartmentType.WASTE_MANAGEMENT]: [
//     UserRole.WASTE_MANAGEMENT_DIRECTOR,
//     UserRole.WASTE_MANAGEMENT_MANAGER,
//     UserRole.WASTE_MANAGEMENT_SUPERVISOR,
//     UserRole.WASTE_MANAGEMENT_OFFICER,
//     UserRole.WASTE_COLLECTION_OFFICER,
//     UserRole.WASTE_RECYCLING_SPECIALIST,
//   ],
//   [DepartmentType.AGRICULTURAL]: [
//     UserRole.AGRICULTURAL_DIRECTOR,
//     UserRole.AGRICULTURAL_MANAGER,
//     UserRole.AGRICULTURAL_SUPERVISOR,
//     UserRole.AGRICULTURAL_OFFICER,
//     UserRole.AGRICULTURAL_VETERINARY_OFFICER,
//     UserRole.AGRICULTURAL_PATHOLOGIST,
//   ],
// };

// /**
//  * Role levels for access control
//  */
// export const RoleLevels = {
//   // Executive level
//   EXECUTIVE: [
//     UserRole.SUPER_ADMIN,
//     UserRole.POLICE_CHIEF,
//     UserRole.FIRE_CHIEF,
//     UserRole.POLICE_DIRECTOR,
//     UserRole.FIRE_DIRECTOR,
//     UserRole.AMBULANCE_DIRECTOR,
//     UserRole.CITY_COUNCIL_DIRECTOR,
//     UserRole.WASTE_MANAGEMENT_DIRECTOR,
//     UserRole.AGRICULTURAL_DIRECTOR,
//   ],
  
//   // Management level
//   MANAGEMENT: [
//     UserRole.SYSTEM_ADMIN,
//     UserRole.POLICE_MANAGER,
//     UserRole.FIRE_MANAGER,
//     UserRole.AMBULANCE_MANAGER,
//     UserRole.CITY_COUNCIL_MANAGER,
//     UserRole.WASTE_MANAGEMENT_MANAGER,
//     UserRole.AGRICULTURAL_MANAGER,
//     UserRole.EMERGENCY_COORDINATOR,
//   ],
  
//   // Supervisory level
//   SUPERVISORY: [
//     UserRole.POLICE_SUPERVISOR,
//     UserRole.FIRE_SUPERVISOR,
//     UserRole.AMBULANCE_SUPERVISOR,
//     UserRole.CITY_COUNCIL_SUPERVISOR,
//     UserRole.WASTE_MANAGEMENT_SUPERVISOR,
//     UserRole.AGRICULTURAL_SUPERVISOR,
//     UserRole.INCIDENT_COMMANDER,
//     UserRole.SITE_COORDINATOR,
//   ],
  
//   // Field operations level
//   FIELD_OPERATIONS: [
//     UserRole.POLICE_FIELD_AGENT,
//     UserRole.FIRE_FIELD_AGENT,
//     UserRole.AMBULANCE_FIELD_AGENT,
//     UserRole.CITY_COUNCIL_OFFICER,
//     UserRole.WASTE_MANAGEMENT_OFFICER,
//     UserRole.AGRICULTURAL_OFFICER,
//     UserRole.POLICE_PATROL_OFFICER,
//     UserRole.FIRE_FIGHTER,
//     UserRole.AMBULANCE_PARAMEDIC,
//     UserRole.AMBULANCE_EMT,
//     UserRole.WASTE_COLLECTION_OFFICER,
//   ],
  
//   // Specialized operations
//   SPECIALIZED: [
//     UserRole.POLICE_DETECTIVE,
//     UserRole.POLICE_SWAT,
//     UserRole.POLICE_K9_UNIT,
//     UserRole.FIRE_HAZMAT_SPECIALIST,
//     UserRole.FIRE_RESCUE_SPECIALIST,
//     UserRole.FIRE_INVESTIGATOR,
//     UserRole.AMBULANCE_CRITICAL_CARE,
//     UserRole.AMBULANCE_FLIGHT_PARAMEDIC,
//     UserRole.CITY_COUNCIL_ENGINEER,
//     UserRole.CITY_COUNCIL_INSPECTOR,
//     UserRole.WASTE_RECYCLING_SPECIALIST,
//     UserRole.AGRICULTURAL_VETERINARY_OFFICER,
//     UserRole.AGRICULTURAL_PATHOLOGIST,
//     UserRole.TRIAGE_OFFICER,
//     UserRole.LIAISON_OFFICER,
//   ],
  
//   // Support roles
//   SUPPORT: [
//     UserRole.ANALYST,
//     UserRole.AUDITOR,
//     UserRole.POLICE_COMMUNITY_LIAISON,
//     UserRole.CITY_COUNCIL_PLANNER,
//   ],
  
//   // Citizen level
//   CITIZEN: [
//     UserRole.CITIZEN,
//     UserRole.VERIFIED_CITIZEN,
//     UserRole.BUSINESS_OWNER,
//     UserRole.FARMER,
//   ],
// };

// /**
//  * Permission groups for common operations
//  */
// export const PermissionGroups = {
//   // Incident management permissions
//   INCIDENT_VIEW: [...RoleLevels.FIELD_OPERATIONS, ...RoleLevels.SUPERVISORY, ...RoleLevels.MANAGEMENT, ...RoleLevels.EXECUTIVE],
//   INCIDENT_CREATE: [UserRole.CITIZEN, UserRole.VERIFIED_CITIZEN, UserRole.BUSINESS_OWNER, UserRole.FARMER, ...RoleLevels.FIELD_OPERATIONS],
//   INCIDENT_UPDATE: [...RoleLevels.FIELD_OPERATIONS, ...RoleLevels.SUPERVISORY],
//   INCIDENT_ASSIGN: [...RoleLevels.SUPERVISORY, ...RoleLevels.MANAGEMENT],
//   INCIDENT_RESOLVE: [...RoleLevels.FIELD_OPERATIONS, ...RoleLevels.SUPERVISORY],
//   INCIDENT_ESCALATE: [...RoleLevels.SUPERVISORY, ...RoleLevels.MANAGEMENT],
//   INCIDENT_DELETE: [...RoleLevels.MANAGEMENT, ...RoleLevels.EXECUTIVE],
  
//   // Dashboard access
//   DASHBOARD_VIEW_OWN: [...RoleLevels.FIELD_OPERATIONS, ...RoleLevels.SPECIALIZED],
//   DASHBOARD_VIEW_DEPARTMENT: [...RoleLevels.SUPERVISORY, ...RoleLevels.MANAGEMENT],
//   DASHBOARD_VIEW_ALL: [...RoleLevels.EXECUTIVE, UserRole.SUPER_ADMIN],
  
//   // Resource management
//   RESOURCE_VIEW: [...RoleLevels.FIELD_OPERATIONS, ...RoleLevels.SUPERVISORY],
//   RESOURCE_ALLOCATE: [...RoleLevels.SUPERVISORY, ...RoleLevels.MANAGEMENT],
//   RESOURCE_MANAGE: [...RoleLevels.MANAGEMENT, ...RoleLevels.EXECUTIVE],
  
//   // Staff management
//   STAFF_VIEW: [...RoleLevels.SUPERVISORY, ...RoleLevels.MANAGEMENT],
//   STAFF_ASSIGN: [...RoleLevels.SUPERVISORY, ...RoleLevels.MANAGEMENT],
//   STAFF_MANAGE: [...RoleLevels.MANAGEMENT, ...RoleLevels.EXECUTIVE],
  
//   // Analytics and reports
//   ANALYTICS_VIEW_BASIC: [...RoleLevels.FIELD_OPERATIONS, ...RoleLevels.SUPERVISORY],
//   ANALYTICS_VIEW_ADVANCED: [...RoleLevels.MANAGEMENT, ...RoleLevels.EXECUTIVE, UserRole.ANALYST],
//   REPORTS_GENERATE: [...RoleLevels.MANAGEMENT, ...RoleLevels.EXECUTIVE, UserRole.ANALYST],
//   REPORTS_EXPORT: [...RoleLevels.MANAGEMENT, ...RoleLevels.EXECUTIVE],
  
//   // SLA management
//   SLA_VIEW: [...RoleLevels.SUPERVISORY, ...RoleLevels.MANAGEMENT],
//   SLA_CONFIG: [...RoleLevels.MANAGEMENT, ...RoleLevels.EXECUTIVE],
//   SLA_ESCALATE: [...RoleLevels.SUPERVISORY, ...RoleLevels.MANAGEMENT],
  
//   // System administration
//   SYSTEM_CONFIG: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN],
//   USER_MANAGE: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN],
//   AUDIT_VIEW: [UserRole.SUPER_ADMIN, UserRole.AUDITOR],
  
//   // Emergency response (cross-departmental)
//   EMERGENCY_RESPOND: [
//     ...RoleLevels.FIELD_OPERATIONS,
//     ...RoleLevels.SPECIALIZED,
//     UserRole.EMERGENCY_COORDINATOR,
//     UserRole.INCIDENT_COMMANDER,
//   ],
//   EMERGENCY_COORDINATE: [
//     ...RoleLevels.SUPERVISORY,
//     ...RoleLevels.MANAGEMENT,
//     UserRole.EMERGENCY_COORDINATOR,
//     UserRole.INCIDENT_COMMANDER,
//   ],
// };

// /**
//  * Helper function to check if a role belongs to a department
//  */
// export function isDepartmentRole(role: UserRole, department: DepartmentType): boolean {
//   return DepartmentRoles[department]?.includes(role) || false;
// }

// /**
//  * Helper function to get role level
//  */
// export function getRoleLevel(role: UserRole): number {
//   return RoleHierarchy[role] || 0;
// }

// /**
//  * Helper function to check if role has required level
//  */
// export function hasRequiredLevel(userRole: UserRole, requiredLevel: number): boolean {
//   return getRoleLevel(userRole) >= requiredLevel;
// }

// /**
//  * Helper function to get all roles at or above a level
//  */
// export function getRolesAtOrAbove(level: number): UserRole[] {
//   return Object.entries(RoleHierarchy)
//     .filter(([_, roleLevel]) => roleLevel >= level)
//     .map(([role]) => role as UserRole);
// }

// /**
//  * Default role for new users
//  */
// export const DEFAULT_ROLE = UserRole.CITIZEN;

// /**
//  * Roles that can access multiple departments (emergency response)
//  */
// export const CROSS_DEPARTMENTAL_ROLES = [
//   UserRole.SUPER_ADMIN,
//   UserRole.SYSTEM_ADMIN,
//   UserRole.EMERGENCY_COORDINATOR,
//   UserRole.INCIDENT_COMMANDER,
//   UserRole.LIAISON_OFFICER,
// ];

// src/dashboard/rbac/roles.enum.ts
/* eslint-disable prettier/prettier */

/**
 * Complete User Role enum
 */
export enum UserRole {
  // System roles
  SUPER_ADMIN = 'super_admin',
  SYSTEM_ADMIN = 'system_admin',
  AUDITOR = 'auditor',
  ANALYST = 'analyst',

  // Citizen roles
  CITIZEN = 'citizen',
  VERIFIED_CITIZEN = 'verified_citizen',
  BUSINESS_OWNER = 'business_owner',
  FARMER = 'farmer',

  // Police Department roles
  POLICE_CHIEF = 'police_chief',
  POLICE_DIRECTOR = 'police_director',
  POLICE_MANAGER = 'police_manager',
  POLICE_SUPERVISOR = 'police_supervisor',
  POLICE_FIELD_AGENT = 'police_field_agent',
  POLICE_PATROL_OFFICER = 'police_patrol_officer',
  POLICE_DETECTIVE = 'police_detective',
  POLICE_TRAFFIC_OFFICER = 'police_traffic_officer',
  POLICE_K9_UNIT = 'police_k9_unit',
  POLICE_SWAT = 'police_swat',
  POLICE_COMMUNITY_LIAISON = 'police_community_liaison',

  // Fire Brigade roles
  FIRE_CHIEF = 'fire_chief',
  FIRE_DIRECTOR = 'fire_director',
  FIRE_MANAGER = 'fire_manager',
  FIRE_SUPERVISOR = 'fire_supervisor',
  FIRE_FIELD_AGENT = 'fire_field_agent',
  FIRE_FIGHTER = 'fire_fighter',
  FIRE_HAZMAT_SPECIALIST = 'fire_hazmat_specialist',
  FIRE_RESCUE_SPECIALIST = 'fire_rescue_specialist',
  FIRE_INVESTIGATOR = 'fire_investigator',

  // Ambulance roles
  AMBULANCE_DIRECTOR = 'ambulance_director',
  AMBULANCE_MANAGER = 'ambulance_manager',
  AMBULANCE_SUPERVISOR = 'ambulance_supervisor',
  AMBULANCE_FIELD_AGENT = 'ambulance_field_agent',
  AMBULANCE_PARAMEDIC = 'ambulance_paramedic',
  AMBULANCE_EMT = 'ambulance_emt',
  AMBULANCE_CRITICAL_CARE = 'ambulance_critical_care',
  AMBULANCE_FLIGHT_PARAMEDIC = 'ambulance_flight_paramedic',

  // City Council roles
  CITY_COUNCIL_DIRECTOR = 'city_council_director',
  CITY_COUNCIL_MANAGER = 'city_council_manager',
  CITY_COUNCIL_SUPERVISOR = 'city_council_supervisor',
  CITY_COUNCIL_OFFICER = 'city_council_officer',
  CITY_COUNCIL_INSPECTOR = 'city_council_inspector',
  CITY_COUNCIL_ENGINEER = 'city_council_engineer',
  CITY_COUNCIL_PLANNER = 'city_council_planner',

  // Waste Management roles
  WASTE_MANAGEMENT_DIRECTOR = 'waste_management_director',
  WASTE_MANAGEMENT_MANAGER = 'waste_management_manager',
  WASTE_MANAGEMENT_SUPERVISOR = 'waste_management_supervisor',
  WASTE_MANAGEMENT_OFFICER = 'waste_management_officer',
  WASTE_COLLECTION_OFFICER = 'waste_collection_officer',
  WASTE_RECYCLING_SPECIALIST = 'waste_recycling_specialist',

  // Agricultural roles
  AGRICULTURAL_DIRECTOR = 'agricultural_director',
  AGRICULTURAL_MANAGER = 'agricultural_manager',
  AGRICULTURAL_SUPERVISOR = 'agricultural_supervisor',
  AGRICULTURAL_OFFICER = 'agricultural_officer',
  AGRICULTURAL_VETERINARY_OFFICER = 'agricultural_veterinary_officer',
  AGRICULTURAL_PATHOLOGIST = 'agricultural_pathologist',

  // Emergency Coordination roles
  EMERGENCY_COORDINATOR = 'emergency_coordinator',
  INCIDENT_COMMANDER = 'incident_commander',
  SITE_COORDINATOR = 'site_coordinator',
  TRIAGE_OFFICER = 'triage_officer',
  EVACUATION_COORDINATOR = 'evacuation_coordinator',
  LIAISON_OFFICER = 'liaison_officer',
}

// Keep DashboardRole for backward compatibility
export const DashboardRole = UserRole;
export type DashboardRole = UserRole;

// Role groups for easier validation
export const SupervisorRoles = [
  UserRole.POLICE_SUPERVISOR,
  UserRole.FIRE_SUPERVISOR,
  UserRole.AMBULANCE_SUPERVISOR,
  UserRole.CITY_COUNCIL_SUPERVISOR,
  UserRole.WASTE_MANAGEMENT_SUPERVISOR,
  UserRole.AGRICULTURAL_SUPERVISOR,
];

export const ManagerRoles = [
  UserRole.POLICE_MANAGER,
  UserRole.FIRE_MANAGER,
  UserRole.AMBULANCE_MANAGER,
  UserRole.CITY_COUNCIL_MANAGER,
  UserRole.WASTE_MANAGEMENT_MANAGER,
  UserRole.AGRICULTURAL_MANAGER,
];

export const DirectorRoles = [
  UserRole.POLICE_DIRECTOR,
  UserRole.FIRE_DIRECTOR,
  UserRole.FIRE_CHIEF,
  UserRole.AMBULANCE_DIRECTOR,
  UserRole.CITY_COUNCIL_DIRECTOR,
  UserRole.WASTE_MANAGEMENT_DIRECTOR,
  UserRole.AGRICULTURAL_DIRECTOR,
];

export const FieldAgentRoles = [
  UserRole.POLICE_FIELD_AGENT,
  UserRole.POLICE_PATROL_OFFICER,
  UserRole.FIRE_FIELD_AGENT,
  UserRole.FIRE_FIGHTER,
  UserRole.AMBULANCE_FIELD_AGENT,
  UserRole.AMBULANCE_PARAMEDIC,
  UserRole.AMBULANCE_EMT,
  UserRole.CITY_COUNCIL_OFFICER,
  UserRole.CITY_COUNCIL_INSPECTOR,
  UserRole.WASTE_MANAGEMENT_OFFICER,
  UserRole.WASTE_COLLECTION_OFFICER,
  UserRole.AGRICULTURAL_OFFICER,
];