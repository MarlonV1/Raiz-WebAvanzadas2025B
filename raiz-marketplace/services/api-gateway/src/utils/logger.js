/**
 * Logger Utility
 * 
 * Sistema de logging estructurado para el API Gateway.
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;

/**
 * Formatea un mensaje de log
 */
function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 
    ? ` ${JSON.stringify(meta)}` 
    : '';
  
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

/**
 * Logger con niveles
 */
export const logger = {
  error: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(formatMessage('error', 
        typeof message === 'object' ? JSON.stringify(message) : message, 
        meta
      ));
    }
  },

  warn: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', 
        typeof message === 'object' ? JSON.stringify(message) : message, 
        meta
      ));
    }
  },

  info: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(formatMessage('info', 
        typeof message === 'object' ? JSON.stringify(message) : message, 
        meta
      ));
    }
  },

  debug: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(formatMessage('debug', 
        typeof message === 'object' ? JSON.stringify(message) : message, 
        meta
      ));
    }
  }
};
