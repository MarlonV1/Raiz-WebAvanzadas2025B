/**
 * Logger Utility
 */

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;
const SERVICE_NAME = process.env.SERVICE_NAME || 'message-service';

function formatMessage(level, message) {
  return `[${new Date().toISOString()}] [${SERVICE_NAME}] [${level.toUpperCase()}] ${message}`;
}

export const logger = {
  error: (message, meta = {}) => {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(formatMessage('error', typeof message === 'object' ? JSON.stringify(message) : message));
    }
  },
  warn: (message) => {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', message));
    }
  },
  info: (message) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(formatMessage('info', message));
    }
  },
  debug: (message) => {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(formatMessage('debug', message));
    }
  }
};
