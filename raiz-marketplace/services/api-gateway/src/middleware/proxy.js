/**
 * Proxy Middleware
 * 
 * Reenvía las peticiones a los microservicios correspondientes.
 * Mantiene los headers de autenticación y maneja errores.
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';
import { circuitBreakerFailures } from '../utils/prometheus.js';

/**
 * Crea un middleware de proxy para un servicio específico
 */
export const proxyMiddleware = (serviceUrl) => {
  return async (req, res) => {
    const targetUrl = `${serviceUrl}${req.path}`;
    
    try {
      logger.debug(`Proxy: ${req.method} ${targetUrl}`);
      
      // Preparar headers para reenviar
      const headers = {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Authorization': req.headers.authorization || '',
        'X-User-Id': req.headers['x-user-id'] || '',
        'X-User-Email': req.headers['x-user-email'] || '',
        'X-User-Role': req.headers['x-user-role'] || '',
        'X-Request-Id': req.headers['x-request-id'] || generateRequestId(),
        'X-Forwarded-For': req.ip,
        'X-Original-Host': req.hostname
      };

      // Configuración de la petición
      const config = {
        method: req.method,
        url: targetUrl,
        headers,
        params: req.query,
        data: req.body,
        timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 10000,
        validateStatus: () => true // Manejar todos los status codes
      };

      // Realizar la petición al microservicio
      const response = await axios(config);

      // Registrar éxito o fallo en el Circuit Breaker según el status
      if (req.circuitBreaker) {
        if (response.status >= 500) {
          req.circuitBreaker.recordFailure();
        } else {
          req.circuitBreaker.recordSuccess();
        }
      }

      // Copiar headers relevantes de la respuesta
      const headersToForward = [
        'x-total-count',
        'x-page',
        'x-per-page',
        'x-total-pages'
      ];
      
      headersToForward.forEach(header => {
        if (response.headers[header]) {
          res.setHeader(header, response.headers[header]);
        }
      });

      // Enviar la respuesta
      res.status(response.status).json(response.data);

    } catch (error) {
      // Registrar el fallo en el Circuit Breaker si está disponible
      if (req.circuitBreaker) {
        req.circuitBreaker.recordFailure();
      }
      handleProxyError(error, req, res, serviceUrl);
    }
  };
};

/**
 * Maneja errores del proxy
 */
function handleProxyError(error, req, res, serviceUrl) {
  const serviceName = getServiceName(serviceUrl);
  logger.error(`[${serviceName}] Proxy error: ${error.message} (code: ${error.code})`);
  logger.error(`[${serviceName}] Estado Circuit Breaker: ${req.circuitBreaker?.state || 'N/A'}, Fallos: ${req.circuitBreaker?.failureCount || 0}`);

  // Error de timeout
  if (error.code === 'ECONNABORTED') {
    return res.status(504).json({
      error: 'El servicio tardó demasiado en responder',
      code: 'GATEWAY_TIMEOUT',
      service: getServiceName(serviceUrl)
    });
  }

  // Error de conexión
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      error: 'No se pudo conectar con el servicio',
      code: 'SERVICE_UNAVAILABLE',
      service: getServiceName(serviceUrl)
    });
  }

  // Error de red
  if (error.code === 'ECONNRESET') {
    return res.status(502).json({
      error: 'La conexión con el servicio se interrumpió',
      code: 'BAD_GATEWAY',
      service: getServiceName(serviceUrl)
    });
  }

  // Error genérico
  return res.status(500).json({
    error: 'Error interno del gateway',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

/**
 * Extrae el nombre del servicio de la URL
 */
function getServiceName(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Genera un ID único para la petición
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
