
USE [master];
GO

/* ============================================
   1) LOGIN: Verificar y recrear
============================================ */
IF EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'raiz_app_login')
BEGIN
    DROP LOGIN raiz_app_login;
    PRINT 'LOGIN existente eliminado.';
END
GO

CREATE LOGIN raiz_app_login
WITH PASSWORD = 'Grupo7'; -- Cambia esta contraseña segura
PRINT 'LOGIN creado.';
GO

/* ============================================
   2) BASE DE DATOS: Verificar y recrear
============================================ */
IF DB_ID('RaizDB') IS NOT NULL
BEGIN
    ALTER DATABASE [RaizDB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [RaizDB];
    PRINT 'Base de datos existente eliminada.';
END
GO

CREATE DATABASE [RaizDB];
PRINT 'Base de datos creada.';
GO

USE [RaizDB];
GO

/* ============================================
   3) USUARIO: Verificar y crear
============================================ */
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'raiz_app_user')
BEGIN
    DROP USER raiz_app_user;
    PRINT 'Usuario existente eliminado.';
END
GO

CREATE USER raiz_app_user FOR LOGIN raiz_app_login WITH DEFAULT_SCHEMA = [app];
PRINT 'Usuario creado.';
GO

EXEC sp_addrolemember N'db_owner', N'raiz_app_user';
GO

/* ============================================
   4) ESQUEMA
============================================ */
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'app')
BEGIN
    EXEC('CREATE SCHEMA [app]');
    PRINT 'Esquema [app] creado.';
END
GO

/* ============================================
   5) TABLAS
============================================ */

-- Tabla Usuarios
CREATE TABLE [app].Users PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    FullName VARCHAR(100),
    Role VARCHAR(20) NOT NULL DEFAULT 'user',
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedAt DATETIME NULL
);
GO

-- Tabla Productos
CREATE TABLE [app].Products PRIMARY KEY,
    OwnerId INT NOT NULL,
    Title VARCHAR(150) NOT NULL,
    Description VARCHAR(MAX),
    Category VARCHAR(50),
    Price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    Quantity INT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (OwnerId) REFERENCES [app].Users
);
GO

-- Tabla Pedidos
CREATE TABLE [app].Orders PRIMARY KEY,
    BuyerId INT NOT NULL,
    ProductId INT NOT NULL,
    Quantity INT NOT NULL,
    Total DECIMAL(12,2) NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (BuyerId) REFERENCES [app].Users,
    FOREIGN KEY (ProductId) REFERENCES [app].[roducts
);
GO

-- Tabla Mensajes
CREATE TABLE [app].Messages PRIMARY KEY,
    FromUserId INT NOT NULL,
    ToUserId INT NULL,
    MessageText VARCHAR(MAX) NOT NULL,
    SentAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (FromUserId) REFERENCES [app].Users,
    FOREIGN KEY (ToUserId) REFERENCES [app].Users
);
GO

-- Tabla Auditoría
CREATE TABLE [app].[AuditLogs](
    IdEY,
    Entity VARCHAR(50) NOT NULL,
    Action VARCHAR(50) NOT NULL,
    Data VARCHAR(MAX),
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO

/* ============================================
   6) DATOS INICIALES
============================================ */
INSERT INTO [app].[Users] (Username, Email, PasswordHash, FullName, Role)
VALUES ('admin', 'admin@raiz.com', '<REPLACE_WITH_BCRYPT_HASH>', 'Administrador', 'admin');
GO

INSERT INTO [app].[Products] (OwnerId, Title, Description, Category, Price, Quantity)
VALUES (1, 'Tomates Orgánicos', 'Tomates frescos cultivados sin químicos', 'Hortalizas', 2.50, 100);
GO

/* ============================================
   7) ÍNDICES
============================================ */
CREATE INDEX IX_Products_OwnerId ON [app].Products;
