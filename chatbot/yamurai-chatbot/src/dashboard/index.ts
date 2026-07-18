/* eslint-disable prettier/prettier */
// src/dashboard/index.ts
// Export modules
export * from './modules/dashboard.module';
export * from './modules/police-dashboard.module';
export * from './modules/fire-brigade-dashboard.module';
export * from './modules/ambulance-dashboard.module';
export * from './modules/city-council-dashboard.module';
export * from './modules/waste-management-dashboard.module';
export * from './modules/agricultural-dashboard.module';

// Export controllers
export * from './controllers/base-dashboard.controller';
export * from './controllers/police-dashboard.controller';
export * from './controllers/fire-brigade-dashboard.controller';
export * from './controllers/ambulance-dashboard.controller';
export * from './controllers/city-council-dashboard.controller';
export * from './controllers/waste-management-dashboard.controller';
export * from './controllers/agricultural-dashboard.controller';

// Export services
export * from './services/base-dashboard.service';
export * from './services/police-dashboard.service';
export * from './services/fire-brigade-dashboard.service';
export * from './services/ambulance-dashboard.service';
export * from './services/city-council-dashboard.service';
// export * from './services/waste-management-dashboard.service';
export * from './services/agricultural-dashboard.service';

// Export DTOs
export * from './dto/dashboard-filters.dto';
export * from './dto/incident-response.dto';

// Export RBAC
export * from './rbac/roles.enum';
export * from './rbac/roles.decorator';
export * from './rbac/roles.guard';
export * from './rbac/dashboard.guard';
export * from './rbac/permissions.decorator';