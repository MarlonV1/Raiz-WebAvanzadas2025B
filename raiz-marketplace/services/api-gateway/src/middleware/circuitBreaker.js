/**
 * Circuit Breaker Pattern Implementation
 * 
 * Protege el sistema de fallos en cascada.
 * 
 * Estados:
 * - CLOSED: Funcionamiento normal, todas las peticiones pasan
 * - OPEN: Servicio fallando, rechaza peticiones inmediatamente
 * - HALF_OPEN: Probando si el servicio se recuperó
 * 
 * Transiciones:
 * - CLOSED → OPEN: Cuando se alcanza el umbral de errores
 * - OPEN → HALF_OPEN: Después del timeout de reset
 * - HALF_OPEN → CLOSED: Si la prueba es exitosa
 * - HALF_OPEN → OPEN: Si la prueba falla
 */

import { logger } from '../utils/logger.js';
import { circuitBreakerState, circuitBreakerFailures } from '../utils/prometheus.js';

// Estados del Circuit Breaker
const STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

// Mapeo de estados a valores numéricos para Prometheus
const STATE_VALUES = {
  CLOSED: 0,
  OPEN: 1,
  HALF_OPEN: 2
};

// Almacén de Circuit Breakers por servicio
const circuitBreakers = new Map();

/**
 * Clase CircuitBreaker
 */
class CircuitBreaker {
  constructor(serviceName, options = {}) {
    this.serviceName = serviceName;
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    
    // Configuración
    this.options = {
      failureThreshold: options.failureThreshold || 
        parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD) || 5,
      resetTimeout: options.resetTimeout || 
        parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT) || 30000,
      timeout: options.timeout || 
        parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 10000,
      halfOpenRequests: options.halfOpenRequests || 3
    };
    
    logger.info(`Circuit Breaker creado para ${serviceName}: ${JSON.stringify(this.options)}`);
    
    // Inicializar métrica de Prometheus
    this.updatePrometheusState();
  }

  /**
   * Actualiza el estado en Prometheus
   */
  updatePrometheusState() {
    circuitBreakerState.set({ service: this.serviceName }, STATE_VALUES[this.state]);
    logger.debug(`[${this.serviceName}] Prometheus actualizado: estado=${this.state} (${STATE_VALUES[this.state]})`);
  }

  /**
   * Verifica si la petición puede pasar
   */
  canRequest() {
    const now = Date.now();

    switch (this.state) {
      case STATES.CLOSED:
        return true;

      case STATES.OPEN:
        // Verificar si es hora de probar
        if (now >= this.nextAttemptTime) {
          this.state = STATES.HALF_OPEN;
          this.successCount = 0;
          logger.info(`[${this.serviceName}] Circuit Breaker: OPEN → HALF_OPEN`);
          this.updatePrometheusState();
          return true;
        }
        return false;

      case STATES.HALF_OPEN:
        // Permitir pocas peticiones de prueba
        return this.successCount < this.options.halfOpenRequests;

      default:
        return true;
    }
  }

  /**
   * Registra un éxito
   */
  recordSuccess() {
    if (this.state === STATES.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.options.halfOpenRequests) {
        this.state = STATES.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        logger.info(`[${this.serviceName}] Circuit Breaker: HALF_OPEN → CLOSED (Recuperado)`);
        this.updatePrometheusState();
      }
    } else if (this.state === STATES.CLOSED) {
      // Resetear contador de fallos tras un éxito
      this.failureCount = 0;
    }
  }

  /**
   * Registra un fallo
   */
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    // Incrementar contador de fallos en Prometheus
    circuitBreakerFailures.inc({ service: this.serviceName });
    logger.warn(`[${this.serviceName}] Fallo registrado (${this.failureCount}/${this.options.failureThreshold})`);

    if (this.state === STATES.HALF_OPEN) {
      // Volver a abrir el circuito
      this.state = STATES.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeout;
      logger.warn(`[${this.serviceName}] Circuit Breaker: HALF_OPEN → OPEN (Fallo en prueba)`);
      this.updatePrometheusState();
    } else if (this.state === STATES.CLOSED && 
               this.failureCount >= this.options.failureThreshold) {
      // Abrir el circuito
      this.state = STATES.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeout;
      logger.error(`[${this.serviceName}] Circuit Breaker: CLOSED → OPEN (Umbral alcanzado: ${this.failureCount} fallos)`);
      this.updatePrometheusState();
    }
  }

  /**
   * Obtiene el estado actual
   */
  getStatus() {
    return {
      serviceName: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      options: this.options
    };
  }
}

/**
 * Obtiene o crea un Circuit Breaker para un servicio
 */
function getCircuitBreaker(serviceName) {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker(serviceName));
  }
  return circuitBreakers.get(serviceName);
}

/**
 * Middleware de Circuit Breaker
 */
export const circuitBreakerMiddleware = (serviceName) => {
  return (req, res, next) => {
    const cb = getCircuitBreaker(serviceName);
    
    if (!cb.canRequest()) {
      logger.warn(`[${serviceName}] Petición bloqueada por Circuit Breaker (estado: ${cb.state})`);
      
      return res.status(503).json({
        error: 'Servicio temporalmente no disponible',
        code: 'SERVICE_UNAVAILABLE',
        service: serviceName,
        retryAfter: Math.ceil((cb.nextAttemptTime - Date.now()) / 1000)
      });
    }

    // Adjuntar el circuit breaker a la request para uso en el proxy
    req.circuitBreaker = cb;

    next();
  };
};

/**
 * Obtiene el estado de todos los Circuit Breakers
 */
export const getCircuitBreakerStatus = () => {
  const status = {};
  for (const [name, cb] of circuitBreakers) {
    status[name] = cb.getStatus();
  }
  return status;
};

/**
 * Resetea un Circuit Breaker específico
 */
export const resetCircuitBreaker = (serviceName) => {
  if (circuitBreakers.has(serviceName)) {
    circuitBreakers.delete(serviceName);
    logger.info(`Circuit Breaker reseteado: ${serviceName}`);
    return true;
  }
  return false;
};
