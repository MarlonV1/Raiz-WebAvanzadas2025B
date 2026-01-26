/**
 * Profile Controller
 * 
 * Controlador para operaciones CRUD de perfiles.
 * Accede al esquema: profile.profiles
 */

import { supabase } from '../index.js';
import { logger } from '../utils/logger.js';
import { emitAuditEvent } from '../utils/audit.js';

/**
 * Obtiene el perfil del usuario autenticado
 */
export const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({
        error: 'Usuario no autenticado'
      });
    }

    const { data, error } = await supabase
      .schema('profile')
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Perfil no encontrado'
        });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene un perfil por ID
 */
export const getProfileById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .schema('profile')
      .from('profiles')
      .select('id, username, full_name, role, created_at')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Perfil no encontrado'
        });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza el perfil del usuario autenticado
 */
export const updateMyProfile = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({
        error: 'Usuario no autenticado'
      });
    }

    const { username, full_name } = req.body;
    const updates = {};
    
    if (username) updates.username = username;
    if (full_name) updates.full_name = full_name;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No hay campos para actualizar'
      });
    }

    const { data, error } = await supabase
      .schema('profile')
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Emitir evento de auditoría
    await emitAuditEvent('profile', 'UPDATE', { userId, updates });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza un perfil por ID (admin)
 */
export const updateProfileById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRole = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];

    // Solo admin o el propio usuario pueden actualizar
    if (userRole !== 'admin' && userId !== id) {
      return res.status(403).json({
        error: 'No tienes permisos para actualizar este perfil'
      });
    }

    const { username, full_name, role } = req.body;
    const updates = {};
    
    if (username) updates.username = username;
    if (full_name) updates.full_name = full_name;
    
    // Solo admin puede cambiar el rol
    if (role && userRole === 'admin') {
      updates.role = role;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No hay campos para actualizar'
      });
    }

    const { data, error } = await supabase
      .schema('profile')
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await emitAuditEvent('profile', 'UPDATE', { profileId: id, updates, updatedBy: userId });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Lista todos los perfiles
 */
export const getAllProfiles = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .schema('profile')
      .from('profiles')
      .select('id, username, full_name, role, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.setHeader('X-Total-Count', count);
    res.setHeader('X-Page', page);
    res.setHeader('X-Per-Page', limit);
    res.setHeader('X-Total-Pages', Math.ceil(count / limit));

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un nuevo perfil
 */
export const createProfile = async (req, res, next) => {
  try {
    const { id, username, full_name, role = 'user' } = req.body;

    const { data, error } = await supabase
      .schema('profile')
      .from('profiles')
      .insert({
        id,
        username,
        full_name,
        role
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({
          error: 'El perfil ya existe o el username está en uso'
        });
      }
      throw error;
    }

    await emitAuditEvent('profile', 'CREATE', { profileId: id });

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};
