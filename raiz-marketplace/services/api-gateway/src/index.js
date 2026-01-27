/**
 * API Gateway - Raíz Marketplace
 * 
 * Punto de entrada único para todos los microservicios.
 * Implementa:
 * - Enrutamiento inteligente a microservicios
 * - Validación de JWT de Supabase
 * - Circuit Breaker Pattern
 * - Rate Limiting
 * - CORS
 * - Logging centralizado
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { authMiddleware, optionalAuthMiddleware } from './middleware/auth.js';
import { circuitBreakerMiddleware } from './middleware/circuitBreaker.js';
import { proxyMiddleware } from './middleware/proxy.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { httpRequestDuration, httpRequestsTotal, getMetrics } from './utils/prometheus.js';

const app = express();
const PORT = process.env.PORT || 8000;

// ===========================================
// MIDDLEWARE GLOBALES
// ===========================================

// Seguridad básica
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging de peticiones
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Prometheus metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe(
      {
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode
      },
      duration
    );
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });
  });
  
  next();
});

// Rate limiting global
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minuto
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Demasiadas peticiones. Por favor, intente más tarde.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// ===========================================
// HEALTH CHECK
// ===========================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ===========================================
// METRICS ENDPOINT
// ===========================================

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(getMetrics());
});

// ===========================================
// RUTAS DE AUTENTICACIÓN (Proxy directo)
// ===========================================

// Estas rutas se manejan directamente en el gateway
// ya que la autenticación es con Supabase
app.post('/auth/signup', (req, res) => {
  // La autenticación real se hace en el frontend con Supabase
  res.json({
    message: 'Use Supabase Auth directamente desde el frontend',
    docs: 'https://supabase.com/docs/guides/auth'
  });
});

app.post('/auth/signin', (req, res) => {
  res.json({
    message: 'Use Supabase Auth directamente desde el frontend',
    docs: 'https://supabase.com/docs/guides/auth'
  });
});

// ===========================================
// RUTAS DE MICROSERVICIOS
// ===========================================

// Configuración de servicios
const services = {
  profiles: process.env.PROFILE_SERVICE_URL || 'http://localhost:8001',
  products: process.env.PRODUCT_SERVICE_URL || 'http://localhost:8002',
  orders: process.env.ORDER_SERVICE_URL || 'http://localhost:8003',
  messages: process.env.MESSAGE_SERVICE_URL || 'http://localhost:8004'
};

// Profile Service - Rutas protegidas
app.use('/api/profiles',
  authMiddleware,
  circuitBreakerMiddleware('profile-service'),
  proxyMiddleware(services.profiles)
);

// Product Service - Algunas rutas públicas
app.use('/api/products',
  optionalAuthMiddleware,  // Productos públicos, pero algunos endpoints requieren auth
  circuitBreakerMiddleware('product-service'),
  proxyMiddleware(services.products)
);

// Order Service - Rutas protegidas
app.use('/api/orders',
  authMiddleware,
  circuitBreakerMiddleware('order-service'),
  proxyMiddleware(services.orders)
);

// Message Service - Rutas protegidas
app.use('/api/messages',
  authMiddleware,
  circuitBreakerMiddleware('message-service'),
  proxyMiddleware(services.messages)
);

// ===========================================
// RUTAS DE ESTADO DE SERVICIOS
// ===========================================

app.get('/api/status', async (req, res) => {
  const { getCircuitBreakerStatus } = await import('./middleware/circuitBreaker.js');
  
  const status = {
    gateway: 'healthy',
    services: getCircuitBreakerStatus(),
    timestamp: new Date().toISOString()
  };
  
  res.json(status);
});

// ===========================================
// MANEJO DE ERRORES
// ===========================================

// Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler global
app.use(errorHandler);

// ===========================================
// INICIO DEL SERVIDOR
// ===========================================

app.listen(PORT, () => {
  logger.info(`🚀 API Gateway iniciado en puerto ${PORT}`);
  logger.info(`📍 Servicios configurados:`);
  logger.info(`   - Profile Service: ${services.profiles}`);
  logger.info(`   - Product Service: ${services.products}`);
  logger.info(`   - Order Service: ${services.orders}`);
  logger.info(`   - Message Service: ${services.messages}`);
});

export default app;
