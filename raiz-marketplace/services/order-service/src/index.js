/**
 * Order Service - Raíz Marketplace
 * 
 * Microservicio responsable de la gestión de órdenes.
 * Esquema: order.orders
 */

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import orderRoutes from './routes/orders.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { httpRequestDuration, httpRequestsTotal, getMetrics } from './utils/prometheus.js';

const app = express();
const PORT = process.env.PORT || 8003;

// ===========================================
// SUPABASE CLIENT
// ===========================================

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===========================================
// SWAGGER CONFIGURATION
// ===========================================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Order Service API - Raíz Marketplace',
      version: '1.0.0',
      description: 'API para gestión de órdenes de compra',
      contact: { name: 'Raíz Team' }
    },
    servers: [
      { url: 'http://localhost:8003', description: 'Servidor de desarrollo' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            buyer_id: { type: 'string', format: 'uuid' },
            seller_id: { type: 'string', format: 'uuid' },
            product_id: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer' },
            unit_price: { type: 'number' },
            total: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ===========================================
// MIDDLEWARE
// ===========================================

app.use(cors());
app.use(express.json());

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

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ===========================================
// SWAGGER DOCS
// ===========================================

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Order Service - API Docs'
}));

app.get('/docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// ===========================================
// HEALTH CHECK
// ===========================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'order-service',
    timestamp: new Date().toISOString()
  });
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(getMetrics());
});

// ===========================================
// ROUTES
// ===========================================

app.use('/', orderRoutes);

// ===========================================
// ERROR HANDLING
// ===========================================

app.use(errorHandler);

// ===========================================
// START SERVER
// ===========================================

app.listen(PORT, () => {
  logger.info(`📦 Order Service iniciado en puerto ${PORT}`);
  logger.info(`📚 Swagger docs en http://localhost:${PORT}/docs`);
});

export default app;
