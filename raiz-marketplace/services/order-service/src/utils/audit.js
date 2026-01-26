/**
 * Audit Utility
 */

import { supabase } from '../index.js';
import { logger } from './logger.js';

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
