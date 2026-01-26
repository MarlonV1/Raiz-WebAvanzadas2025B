/**
 * Middleware de Autenticación
 * 
 * Valida los JWT emitidos por Supabase.
 * El token debe venir en el header Authorization: Bearer <token>
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

// Cliente de Supabase para validar tokens
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Middleware de autenticación obligatoria
 * Rechaza peticiones sin token válido
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de autenticación requerido',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    const token = authHeader.substring(7); // Remover "Bearer "
    
    // Verificar el token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      logger.warn(`Token inválido: ${error?.message || 'Usuario no encontrado'}`);
      return res.status(401).json({
        error: 'Token inválido o expirado',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    // Agregar información del usuario a la request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user',
      metadata: user.user_metadata
    };
    
    // Pasar el token a los microservicios
    req.headers['x-user-id'] = user.id;
    req.headers['x-user-email'] = user.email;
    req.headers['x-user-role'] = user.user_metadata?.role || 'user';

    next();
  } catch (error) {
    logger.error(`Error en autenticación: ${error.message}`);
    return res.status(500).json({
      error: 'Error interno de autenticación',
      code: 'AUTH_INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware de autenticación opcional
 * Permite peticiones sin token, pero agrega info del usuario si existe
 */
export const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Sin token, continuar sin usuario
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      // Token inválido, continuar sin usuario
      req.user = null;
      return next();
    }

    // Usuario válido
    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user',
      metadata: user.user_metadata
    };
    
    req.headers['x-user-id'] = user.id;
    req.headers['x-user-email'] = user.email;
    req.headers['x-user-role'] = user.user_metadata?.role || 'user';

    next();
  } catch (error) {
    logger.warn(`Error en auth opcional: ${error.message}`);
    req.user = null;
    next();
  }
};

/**
 * Middleware para verificar roles específicos
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticación requerida',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'No tienes permisos para esta acción',
        code: 'FORBIDDEN',
        requiredRoles: roles,
        currentRole: req.user.role
      });
    }

    next();
  };
};
