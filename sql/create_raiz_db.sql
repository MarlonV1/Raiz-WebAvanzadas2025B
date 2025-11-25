USE [master];
GO

/* 1) LOGIN: Verificar y recrear */

IF EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'raiz_app_login')
BEGIN
    DROP LOGIN raiz_app_login;
    PRINT 'LOGIN existente eliminado.';
END
GO

CREATE LOGIN raiz_app_login
WITH PASSWORD = 'Grupo7', CHECK_POLICY = OFF; -- Desactivamos política para evitar errores de complejidad
PRINT 'LOGIN creado.';
GO

/* 2) BASE DE DATOS: Verificar y recrear */
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

/* 3) USUARIO: Verificar y crear */
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

/* 4) ESQUEMA */
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'app')
BEGIN
    EXEC('CREATE SCHEMA [app]');
    PRINT 'Esquema [app] creado.';
END
GO

/* 5) TABLAS (CORREGIDAS) */

-- Tabla Usuarios
-- Corrección: Se agregó columna Id 
CREATE TABLE [app].[Users] (
    Id INT IDENTITY(1,1) PRIMARY KEY, -- Clave primaria autoincremental
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
CREATE TABLE [app].[Products] (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    OwnerId INT NOT NULL,
    Title VARCHAR(150) NOT NULL,
    Description VARCHAR(MAX),
    Category VARCHAR(50),
    Price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    Quantity INT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (OwnerId) REFERENCES [app].[Users](Id) -- Referencia explícita al Id
);
GO

-- Tabla Pedidos
CREATE TABLE [app].[Orders] (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    BuyerId INT NOT NULL,
    ProductId INT NOT NULL,
    Quantity INT NOT NULL,
    Total DECIMAL(12,2) NOT NULL,
    Status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (BuyerId) REFERENCES [app].[Users](Id),
    FOREIGN KEY (ProductId) REFERENCES [app].[Products](Id) -- Corregido typo [roducts
);
GO

-- Tabla Mensajes
CREATE TABLE [app].[Messages] (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    FromUserId INT NOT NULL,
    ToUserId INT NULL, -- Puede ser NULL si es un mensaje de sistema, o requerido si es chat
    MessageText VARCHAR(MAX) NOT NULL,
    SentAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (FromUserId) REFERENCES [app].[Users](Id),
    FOREIGN KEY (ToUserId) REFERENCES [app].[Users](Id)
);
GO

-- Tabla Auditoría
CREATE TABLE [app].[AuditLogs](
    Id INT IDENTITY(1,1) PRIMARY KEY, -- Corregido IdEY por Id 
    Entity VARCHAR(50) NOT NULL,
    Action VARCHAR(50) NOT NULL,
    Data VARCHAR(MAX),
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);
GO

/* 6) DATOS INICIALES */
-- Insertamos el usuario (El Id se genera solo)
INSERT INTO [app].[Users] (Username, Email, PasswordHash, FullName, Role)
VALUES ('admin', 'admin@raiz.com', '$2a$10$EixZaYVK1fsbw1ZfbX3OXePaWxwKc.60', 'Administrador', 'admin'); 
GO

-- Insertamos el producto vinculado al usuario ID 1 (el admin que acabamos de crear)
INSERT INTO [app].[Products] (OwnerId, Title, Description, Category, Price, Quantity)
VALUES (1, 'Tomates Orgánicos', 'Tomates frescos cultivados sin químicos', 'Hortalizas', 2.50, 100);
GO

/* 7) ÍNDICES (CORREGIDO) */
-- Corrección: Se debe especificar la columna entre paréntesis (OwnerId)
CREATE INDEX IX_Products_OwnerId ON [app].[Products](OwnerId);
GO

PRINT 'SCRIPT EJECUTADO CON ÉXITO. PROYECTO RAÍZ LISTO.';