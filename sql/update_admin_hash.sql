-- sql/update_admin_hash.sql
-- Actualiza el hash bcrypt del usuario admin con la contraseña 'Grupo7'

USE [RaizDB];
GO

-- Actualizar el hash bcrypt del usuario admin
UPDATE [app].[Users]
SET PasswordHash = '$2b$10$/uc8rqdKqW4cKTBVEUK0ceGoQ6ScYnwKNCp.RLoO4KT8vpAZl236q'
WHERE Username = 'admin';

PRINT 'Hash del usuario admin actualizado correctamente.';

-- Verificar
SELECT Id, Username, Email, Role, PasswordHash 
FROM [app].[Users] 
WHERE Username = 'admin';

GO
