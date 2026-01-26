/**
 * Audit Utility
 * 
 * Emite eventos de auditoría al esquema audit.audit_logs
 * Implementa comunicación basada en eventos (básica)
 */

import { supabase } from '../index.js';
import { logger } from './logger.js';

/**
 * Emite un evento de auditoría
 * 
 * @param {string} entity - Nombre de la entidad (profile, product, order, etc.)
 * @param {string} action - Acción realizada (CREATE, UPDATE, DELETE, etc.)
 * @param {object} data - Datos adicionales del evento
 */
export const emitAuditEvent = async (entity, action, data = {}) => {
  try {
    const { error } = await supabase
      .schema('audit')
      .from('audit_logs')
      .insert({
        entity,
        action,
        data
      });

    if (error) {
      logger.warn(`Error al registrar auditoría: ${error.message}`);
    } else {
      logger.debug(`Auditoría registrada: ${entity}.${action}`);
    }
  } catch (error) {
    logger.warn(`Error en auditoría: ${error.message}`);
  }
};
