USE zimpapersGPT;
GO

CREATE TABLE [dbo].[employees](
                [id] [int] IDENTITY(1,1) PRIMARY KEY NOT NULL,
                [email] [nvarchar](255) NOT NULL,
                [first_name] [nvarchar](100) NOT NULL,
                [surname] [nvarchar](100) NOT NULL,
                [DOB] [date] NOT NULL,
                [engagementDate] [date] NOT NULL,
                [contractType] [nvarchar](50) NOT NULL,
                [gender] [varchar](6) NOT NULL,
                [mobile_number] [nvarchar](20) NOT NULL,
                [employeeNumber] [nvarchar](50) NULL,
                [department] [nvarchar](100) NULL,
                [jobTitle] [nvarchar](100) NULL
            );

CREATE TABLE [dbo].[users](
	[id] [int] IDENTITY(1,1) PRIMARY KEY NOT NULL,
	[email] [nvarchar](255) UNIQUE NOT NULL,
	[first_name] [nvarchar](100) NOT NULL,
	[surname] [nvarchar](100) NOT NULL,
    [DOB] [date] NOT NULL,
    [gender] [varchar](6) NOT NULL,
	[mobile_number] [nvarchar](20) NOT NULL,
	[subscriber_number] [nvarchar](50) UNIQUE NOT NULL,
	[department] [nvarchar](100) NULL,
	[profession] [nvarchar](100) NULL,
	[password_hash] [nvarchar](255) NOT NULL,
	[user_type] [nvarchar](50) NOT NULL,
	Locked INT NOT NULL,
	inputUser NVARCHAR(50) NOT NULL,
	authoriser NVARCHAR(50) NULL
);

CREATE TABLE DeviceInfo (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userAgent NVARCHAR(255),
    platform NVARCHAR(255),
    language NVARCHAR(255),
    screenWidth INT,
    screenHeight INT,
    connectionType NVARCHAR(50),
    providerIP NVARCHAR(50),
    machineIP NVARCHAR(50),
    latitude NVARCHAR(50),
    longitude NVARCHAR(50),
    deviceType NVARCHAR(50), -- Column for device type
    deviceBrand NVARCHAR(50), -- Column for device brand
    deviceModel NVARCHAR(50), -- Column for device model
    collectionTime DATETIME DEFAULT GETDATE(), -- Column for timestamp, default to current time
    UserID INT NOT NULL,
    FOREIGN KEY(UserID) REFERENCES [dbo].[users] ([id])
);

CREATE TABLE userStatus (
    id INT IDENTITY(1,1) PRIMARY KEY,
    status NVARCHAR(255),
    eventTime DATETIME DEFAULT GETDATE(), -- Column for timestamp, default to current time
	UserID INT NOT NULL,
    FOREIGN KEY(UserID) REFERENCES [dbo].[users] ([id])
);


