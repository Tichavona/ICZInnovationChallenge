-- Add isArchived column to emergency_reports table
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'emergency_reports' AND COLUMN_NAME = 'isArchived'
)
BEGIN
    ALTER TABLE emergency_reports 
    ADD isArchived BIT NOT NULL DEFAULT 0;
    
    PRINT 'Column isArchived added successfully to emergency_reports table.';
END
ELSE
BEGIN
    PRINT 'Column isArchived already exists in emergency_reports table.';
END
GO

-- Add isArchived column to emergency_reports table
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'issue_reports' AND COLUMN_NAME = 'isArchived'
)
BEGIN
    ALTER TABLE issue_reports 
    ADD isArchived BIT NOT NULL DEFAULT 0;
    
    PRINT 'Column isArchived added successfully to issue_reports table.';
END
ELSE
BEGIN
    PRINT 'Column isArchived already exists in issue_reports table.';
END
GO

CREATE TABLE messages (
    -- Primary key with UUID (uniqueidentifier in SQL Server)
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    
    -- From column (indexed for performance)
    from_phone NVARCHAR(255) NULL,
    
    -- To column (indexed for performance)
    to_phone NVARCHAR(255) NULL,
    
    -- Message body content
    body NVARCHAR(MAX) NULL,
    
    -- Caption for media messages
    caption NVARCHAR(MAX) NULL,
    
    -- Original WhatsApp message ID
    message_id NVARCHAR(255) NULL,
    
    -- Message type (text, image, audio, video, document, location, interactive)
    type NVARCHAR(50) NULL,
    
    -- JSON metadata (using NVARCHAR(MAX) for JSON storage)
    metadata NVARCHAR(MAX) NULL,
    
    -- Whether message is from the bot
    is_from_bot BIT NOT NULL DEFAULT 0,
    
    -- Whether message has been read
    is_read BIT NOT NULL DEFAULT 0,
    
    -- Creation timestamp with timezone
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Create indexes for performance
CREATE INDEX IX_messages_from ON messages(from_phone);
CREATE INDEX IX_messages_to ON messages(to_phone);
CREATE INDEX IX_messages_created_at ON messages(created_at);
CREATE INDEX IX_messages_message_id ON messages(message_id);
CREATE INDEX IX_messages_type ON messages(type);

-- Optional: Create a composite index for common queries
CREATE INDEX IX_messages_from_created ON messages(from_phone, created_at);
CREATE INDEX IX_messages_to_created ON messages(to_phone, created_at);

-- Optional: Add a check constraint for valid message types
ALTER TABLE messages
ADD CONSTRAINT CK_messages_type CHECK (
    type IN ('text', 'image', 'audio', 'video', 'document', 'location', 'interactive')
);

-- =====================================================
-- COMPLETE DATABASE SETUP FOR CHATBOT SYSTEM
-- =====================================================

-- Drop tables in reverse order of dependencies
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'escalation_logs') DROP TABLE escalation_logs;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'incident_assignments') DROP TABLE incident_assignments;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'sla_configs') DROP TABLE sla_configs;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'stations') DROP TABLE stations;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'districts') DROP TABLE districts;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'provinces') DROP TABLE provinces;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'regions') DROP TABLE regions;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'department_staff') DROP TABLE department_staff;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'incident_routing_rules') DROP TABLE incident_routing_rules;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'departments') DROP TABLE departments;
GO

-- =====================================================
-- DEPARTMENTS TABLE (from your existing entity)
-- =====================================================
CREATE TABLE departments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(100) NOT NULL,
    type NVARCHAR(50) NOT NULL,
    description NVARCHAR(200) NULL,
    status NVARCHAR(20) DEFAULT 'active',
    activeStaff INT DEFAULT 0,
    activeIncidents INT DEFAULT 0,
    contactInfo NVARCHAR(MAX) NULL, -- JSON
    operationalHours NVARCHAR(MAX) NULL, -- JSON
    serviceAreas NVARCHAR(MAX) NULL, -- JSON
    parentDepartmentId UNIQUEIDENTIFIER NULL,
    mpt_path NVARCHAR(MAX) NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_departments_parent FOREIGN KEY (parentDepartmentId) 
        REFERENCES departments(id)
);
GO

-- Add index for department tree queries
CREATE INDEX IX_departments_type ON departments(type);
CREATE INDEX IX_departments_status ON departments(status);
GO

-- =====================================================
-- DEPARTMENT_STAFF TABLE (from your existing entity)
-- =====================================================
CREATE TABLE department_staff (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    userId UNIQUEIDENTIFIER NOT NULL,
    departmentId UNIQUEIDENTIFIER NOT NULL,
    role NVARCHAR(50) NOT NULL,
    specialization NVARCHAR(100) NULL,
    isActive BIT DEFAULT 1,
    isOnDuty BIT DEFAULT 0,
    currentAssignments INT DEFAULT 0,
    shiftSchedule NVARCHAR(MAX) NULL, -- JSON
    performanceMetrics NVARCHAR(MAX) NULL, -- JSON
    stationId UNIQUEIDENTIFIER NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_staff_department FOREIGN KEY (departmentId) 
        REFERENCES departments(id)
    -- Note: FK to users table will be added after users table exists
);
GO

CREATE INDEX IX_staff_department ON department_staff(departmentId);
CREATE INDEX IX_staff_user ON department_staff(userId);
CREATE INDEX IX_staff_role ON department_staff(role);
CREATE INDEX IX_staff_duty ON department_staff(isOnDuty, isActive);
GO

-- =====================================================
-- INCIDENT_ROUTING_RULES TABLE (from your existing entity)
-- =====================================================
CREATE TABLE incident_routing_rules (
    id INT IDENTITY(1,1) PRIMARY KEY,
    incidentType NVARCHAR(50) NOT NULL,
    category NVARCHAR(100) NOT NULL,
    requiredDepartments NVARCHAR(MAX) NOT NULL, -- JSON
    conditions NVARCHAR(MAX) NULL, -- JSON
    description NVARCHAR(500) NOT NULL,
    isActive BIT DEFAULT 1,
    createdAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE INDEX IX_routing_rules_active ON incident_routing_rules(isActive);
CREATE INDEX IX_routing_rules_type ON incident_routing_rules(incidentType);
GO

-- =====================================================
-- REGIONS TABLE
-- =====================================================
CREATE TABLE regions (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(100) NOT NULL,
    code NVARCHAR(20) NOT NULL UNIQUE,
    description NVARCHAR(500) NULL,
    capitalCity NVARCHAR(100) NULL,
    areaKm2 DECIMAL(10,2) NULL,
    population INT NULL,
    status NVARCHAR(50) DEFAULT 'active',
    coordinates NVARCHAR(MAX) NULL,
    demographics NVARCHAR(MAX) NULL,
    regionMetadata NVARCHAR(MAX) NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE()
);
GO

-- =====================================================
-- PROVINCES TABLE
-- =====================================================
CREATE TABLE provinces (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(100) NOT NULL,
    code NVARCHAR(20) NOT NULL UNIQUE,
    description NVARCHAR(500) NULL,
    regionId UNIQUEIDENTIFIER NOT NULL,
    capitalCity NVARCHAR(100) NULL,
    areaKm2 DECIMAL(10,2) NULL,
    population INT NULL,
    populationDensity DECIMAL(5,2) NULL,
    status NVARCHAR(50) DEFAULT 'active',
    coordinates NVARCHAR(MAX) NULL,
    governance NVARCHAR(MAX) NULL,
    provinceStats NVARCHAR(MAX) NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_provinces_region FOREIGN KEY (regionId) 
        REFERENCES regions(id) ON DELETE CASCADE
);
GO

-- =====================================================
-- DISTRICTS TABLE
-- =====================================================
CREATE TABLE districts (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(100) NOT NULL,
    code NVARCHAR(20) NOT NULL UNIQUE,
    description NVARCHAR(500) NULL,
    provinceId UNIQUEIDENTIFIER NOT NULL,
    administrativeCenter NVARCHAR(100) NULL,
    areaKm2 DECIMAL(10,2) NULL,
    population INT NULL,
    districtType NVARCHAR(50) NULL,
    status NVARCHAR(50) DEFAULT 'active',
    coordinates NVARCHAR(MAX) NULL,
    demographics NVARCHAR(MAX) NULL,
    districtStats NVARCHAR(MAX) NULL,
    contactInfo NVARCHAR(MAX) NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_districts_province FOREIGN KEY (provinceId) 
        REFERENCES provinces(id) ON DELETE CASCADE
);
GO

-- =====================================================
-- STATIONS TABLE
-- =====================================================
CREATE TABLE stations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(100) NOT NULL,
    stationType NVARCHAR(50) NOT NULL,
    departmentId UNIQUEIDENTIFIER NULL,
    address NVARCHAR(200) NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    coverageRadiusKm DECIMAL(10,2) DEFAULT 10,
    contactInfo NVARCHAR(MAX) NULL,
    operationalCapacity NVARCHAR(MAX) NULL,
    specializations NVARCHAR(MAX) NULL,
    status NVARCHAR(50) DEFAULT 'active',
    parentStationId UNIQUEIDENTIFIER NULL,
    mpt_path NVARCHAR(MAX) NULL,
    jurisdiction NVARCHAR(MAX) NULL,
    priority INT DEFAULT 0,
    regionId UNIQUEIDENTIFIER NULL,
    provinceId UNIQUEIDENTIFIER NULL,
    districtId UNIQUEIDENTIFIER NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_stations_department FOREIGN KEY (departmentId) 
        REFERENCES departments(id),
    CONSTRAINT FK_stations_parent FOREIGN KEY (parentStationId) 
        REFERENCES stations(id),
    CONSTRAINT FK_stations_region FOREIGN KEY (regionId) 
        REFERENCES regions(id),
    CONSTRAINT FK_stations_province FOREIGN KEY (provinceId) 
        REFERENCES provinces(id),
    CONSTRAINT FK_stations_district FOREIGN KEY (districtId) 
        REFERENCES districts(id)
);
GO

-- Add indexes for stations
CREATE INDEX IX_stations_coordinates ON stations(latitude, longitude);
CREATE INDEX IX_stations_type ON stations(stationType);
CREATE INDEX IX_stations_status ON stations(status);
CREATE INDEX IX_stations_department ON stations(departmentId);
CREATE INDEX IX_stations_region ON stations(regionId);
CREATE INDEX IX_stations_province ON stations(provinceId);
CREATE INDEX IX_stations_district ON stations(districtId);
GO

-- =====================================================
-- UPDATE DEPARTMENT_STAFF WITH STATION FOREIGN KEY
-- =====================================================
ALTER TABLE department_staff 
ADD CONSTRAINT FK_staff_station 
FOREIGN KEY (stationId) REFERENCES stations(id);
GO

-- =====================================================
-- SLA_CONFIGS TABLE
-- =====================================================
CREATE TABLE sla_configs (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    departmentId UNIQUEIDENTIFIER NULL,
    incidentType NVARCHAR(50) NOT NULL,
    priority NVARCHAR(20) NOT NULL,
    responseTimeMinutes INT NOT NULL,
    resolutionTimeMinutes INT NOT NULL,
    updateFrequencyMinutes INT NOT NULL,
    escalationRules NVARCHAR(MAX) NOT NULL,
    businessHours NVARCHAR(MAX) NULL,
    allDay BIT DEFAULT 0,
    version INT DEFAULT 1,
    isActive BIT DEFAULT 1,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_sla_department FOREIGN KEY (departmentId) 
        REFERENCES departments(id)
);
GO

CREATE INDEX IX_sla_department ON sla_configs(departmentId);
CREATE INDEX IX_sla_incident_type ON sla_configs(incidentType, priority);
GO

-- =====================================================
-- INCIDENT_ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE incident_assignments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    incidentType NVARCHAR(20) NOT NULL,
    incidentId NVARCHAR(100) NULL,
    assignedStationId UNIQUEIDENTIFIER NOT NULL,
    assignedStaffId UNIQUEIDENTIFIER NULL,
    status NVARCHAR(50) NOT NULL,
    assignedAt DATETIME2 NOT NULL,
    acknowledgedAt DATETIME2 NULL,
    enRouteAt DATETIME2 NULL,
    onSceneAt DATETIME2 NULL,
    completedAt DATETIME2 NULL,
    distanceToIncidentKm FLOAT NULL,
    estimatedArrivalMinutes INT NULL,
    slaMetrics NVARCHAR(MAX) NULL,
    escalationHistory NVARCHAR(MAX) NULL,
    notes NVARCHAR(MAX) NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_assignments_station FOREIGN KEY (assignedStationId) 
        REFERENCES stations(id),
    CONSTRAINT FK_assignments_staff FOREIGN KEY (assignedStaffId) 
        REFERENCES department_staff(id)
);
GO

CREATE INDEX IX_assignments_incident ON incident_assignments(incidentType, incidentId);
CREATE INDEX IX_assignments_status ON incident_assignments(status);
CREATE INDEX IX_assignments_station ON incident_assignments(assignedStationId);
CREATE INDEX IX_assignments_staff ON incident_assignments(assignedStaffId);
CREATE INDEX IX_assignments_dates ON incident_assignments(assignedAt, completedAt);
GO

-- =====================================================
-- ESCALATION_LOGS TABLE
-- =====================================================
CREATE TABLE escalation_logs (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    incidentType NVARCHAR(20) NOT NULL,
    emergencyId INT NULL,
    issueId INT NULL,
    escalationLevel NVARCHAR(50) NOT NULL,
    escalationReason NVARCHAR(100) NOT NULL,
    reasonDetails NVARCHAR(1000) NULL,
    slaBreachMinutes INT NULL,
    status NVARCHAR(50) DEFAULT 'pending',
    escalatedById UNIQUEIDENTIFIER NULL,
    escalatedByRole NVARCHAR(100) NULL,
    escalatedAt DATETIME2 NOT NULL,
    escalatedToDepartmentId UNIQUEIDENTIFIER NULL,
    escalatedToUserId UNIQUEIDENTIFIER NULL,
    escalatedToEmail NVARCHAR(255) NULL,
    escalatedToRole NVARCHAR(50) NULL,
    acknowledgedAt DATETIME2 NULL,
    acknowledgedById UNIQUEIDENTIFIER NULL,
    acknowledgementNotes NVARCHAR(1000) NULL,
    resolvedAt DATETIME2 NULL,
    resolvedById UNIQUEIDENTIFIER NULL,
    resolutionNotes NVARCHAR(1000) NULL,
    resolutionAction NVARCHAR(100) NULL,
    notificationHistory NVARCHAR(MAX) NULL,
    escalationMetadata NVARCHAR(MAX) NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 NULL,
    CONSTRAINT FK_escalation_department FOREIGN KEY (escalatedToDepartmentId) 
        REFERENCES departments(id),
    CONSTRAINT FK_escalation_user FOREIGN KEY (escalatedToUserId) 
        REFERENCES department_staff(id)
);
GO

CREATE INDEX IX_escalation_incident ON escalation_logs(incidentType, emergencyId, issueId);
CREATE INDEX IX_escalation_status ON escalation_logs(status);
CREATE INDEX IX_escalation_level ON escalation_logs(escalationLevel);
CREATE INDEX IX_escalation_dates ON escalation_logs(escalatedAt, resolvedAt);
GO

-- =====================================================
-- CREATE TRIGGERS FOR UPDATEDAT
-- =====================================================

-- Trigger for departments
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_departments_updated')
    DROP TRIGGER trg_departments_updated;
GO

CREATE TRIGGER trg_departments_updated
ON departments
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE departments 
    SET updatedAt = GETDATE()
    FROM departments d
    INNER JOIN inserted i ON d.id = i.id;
END;
GO

-- Trigger for department_staff
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_department_staff_updated')
    DROP TRIGGER trg_department_staff_updated;
GO

CREATE TRIGGER trg_department_staff_updated
ON department_staff
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE department_staff 
    SET updatedAt = GETDATE()
    FROM department_staff ds
    INNER JOIN inserted i ON ds.id = i.id;
END;
GO

-- Trigger for regions
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_regions_updated')
    DROP TRIGGER trg_regions_updated;
GO

CREATE TRIGGER trg_regions_updated
ON regions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE regions 
    SET updatedAt = GETDATE()
    FROM regions r
    INNER JOIN inserted i ON r.id = i.id;
END;
GO

-- Trigger for provinces
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_provinces_updated')
    DROP TRIGGER trg_provinces_updated;
GO

CREATE TRIGGER trg_provinces_updated
ON provinces
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE provinces 
    SET updatedAt = GETDATE()
    FROM provinces p
    INNER JOIN inserted i ON p.id = i.id;
END;
GO

-- Trigger for districts
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_districts_updated')
    DROP TRIGGER trg_districts_updated;
GO

CREATE TRIGGER trg_districts_updated
ON districts
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE districts 
    SET updatedAt = GETDATE()
    FROM districts d
    INNER JOIN inserted i ON d.id = i.id;
END;
GO

-- Trigger for stations
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_stations_updated')
    DROP TRIGGER trg_stations_updated;
GO

CREATE TRIGGER trg_stations_updated
ON stations
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE stations 
    SET updatedAt = GETDATE()
    FROM stations s
    INNER JOIN inserted i ON s.id = i.id;
END;
GO

-- Trigger for sla_configs
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_sla_configs_updated')
    DROP TRIGGER trg_sla_configs_updated;
GO

CREATE TRIGGER trg_sla_configs_updated
ON sla_configs
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE sla_configs 
    SET updatedAt = GETDATE()
    FROM sla_configs s
    INNER JOIN inserted i ON s.id = i.id;
END;
GO

-- Trigger for incident_assignments
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_incident_assignments_updated')
    DROP TRIGGER trg_incident_assignments_updated;
GO

CREATE TRIGGER trg_incident_assignments_updated
ON incident_assignments
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE incident_assignments 
    SET updatedAt = GETDATE()
    FROM incident_assignments ia
    INNER JOIN inserted i ON ia.id = i.id;
END;
GO

-- Trigger for escalation_logs
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_escalation_logs_updated')
    DROP TRIGGER trg_escalation_logs_updated;
GO

CREATE TRIGGER trg_escalation_logs_updated
ON escalation_logs
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE escalation_logs 
    SET updatedAt = GETDATE()
    FROM escalation_logs el
    INNER JOIN inserted i ON el.id = i.id;
END;
GO

-- =====================================================
-- STORED PROCEDURE FOR FINDING NEAREST STATIONS
-- =====================================================

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_FindNearestStations')
    DROP PROCEDURE sp_FindNearestStations;
GO

CREATE PROCEDURE sp_FindNearestStations
    @latitude DECIMAL(10,8),
    @longitude DECIMAL(11,8),
    @departmentId UNIQUEIDENTIFIER = NULL,
    @limit INT = 5,
    @status NVARCHAR(50) = 'active'
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        s.*,
        6371 * ACOS(
            COS(RADIANS(@latitude)) * 
            COS(RADIANS(s.latitude)) * 
            COS(RADIANS(s.longitude) - RADIANS(@longitude)) + 
            SIN(RADIANS(@latitude)) * 
            SIN(RADIANS(s.latitude))
        ) AS distance_km,
        CASE 
            WHEN 6371 * ACOS(
                COS(RADIANS(@latitude)) * 
                COS(RADIANS(s.latitude)) * 
                COS(RADIANS(s.longitude) - RADIANS(@longitude)) + 
                SIN(RADIANS(@latitude)) * 
                SIN(RADIANS(s.latitude))
            ) <= s.coverageRadiusKm THEN 1 
            ELSE 0 
        END AS within_coverage
    FROM stations s
    WHERE s.status = @status
        AND (@departmentId IS NULL OR s.departmentId = @departmentId)
        AND s.latitude IS NOT NULL 
        AND s.longitude IS NOT NULL
    ORDER BY distance_km
    OFFSET 0 ROWS
    FETCH NEXT @limit ROWS ONLY;
END;
GO

-- =====================================================
-- STORED PROCEDURE FOR CHECKING SLA BREACHES
-- =====================================================

IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_CheckSLABreaches')
    DROP PROCEDURE sp_CheckSLABreaches;
GO

CREATE PROCEDURE sp_CheckSLABreaches
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        ia.*,
        DATEDIFF(MINUTE, ia.assignedAt, GETDATE()) AS elapsed_minutes,
        JSON_VALUE(ia.slaMetrics, '$.responseTarget') AS response_target,
        JSON_VALUE(ia.slaMetrics, '$.resolutionTarget') AS resolution_target
    FROM incident_assignments ia
    WHERE ia.status IN ('pending', 'accepted', 'en_route')
        AND ia.acknowledgedAt IS NULL
        AND JSON_VALUE(ia.slaMetrics, '$.responseTarget') IS NOT NULL
        AND DATEDIFF(MINUTE, ia.assignedAt, GETDATE()) > 
            CAST(JSON_VALUE(ia.slaMetrics, '$.responseTarget') AS INT)
        AND (JSON_VALUE(ia.slaMetrics, '$.breachedAt') IS NULL);
END;
GO

-- =====================================================
-- VERIFICATION
-- =====================================================
PRINT 'All tables, indexes, triggers, and stored procedures created successfully!';

-- List all created tables
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE' 
    AND TABLE_NAME IN (
        'departments', 'department_staff', 'incident_routing_rules',
        'regions', 'provinces', 'districts', 'stations',
        'sla_configs', 'incident_assignments', 'escalation_logs'
    )
ORDER BY TABLE_NAME;
GO

SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE' 
ORDER BY TABLE_NAME;