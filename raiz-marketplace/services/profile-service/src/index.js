/**
 * Profile Service - Raíz Marketplace
 * 
 * Microservicio responsable de la gestión de perfiles de usuario.
 * Esquema: profile.profiles
 */

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import profileRoutes from './routes/profiles.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { httpRequestDuration, httpRequestsTotal, getMetrics } from './utils/prometheus.js';

const app = express();
const PORT = process.env.PORT || 8001;

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
      title: 'Profile Service API - Raíz Marketplace',
      version: '1.0.0',
      description: 'API para gestión de perfiles de usuario',
      contact: { name: 'Raíz Team' }
    },
    servers: [
      { url: 'http://localhost:8001', description: 'Servidor de desarrollo' }
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
        Profile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            full_name: { type: 'string' },
            role: { type: 'string', enum: ['user', 'farmer', 'admin'] },
            avatar_url: { type: 'string', nullable: true },
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
  customSiteTitle: 'Profile Service - API Docs'
}));

app.get('/docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// ===========================================
// HEALTH CHECK
// ===========================================

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica el estado del servicio
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servicio funcionando correctamente
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'profile-service',
    timestamp: new Date().toISOString()
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  const metrics = await getMetrics();
  res.send(metrics);
});

// ===========================================
// ROUTES
// ===========================================

app.use('/', profileRoutes);

// ===========================================
// ERROR HANDLING
// ===========================================

app.use(errorHandler);

// ===========================================
// START SERVER
// ===========================================

app.listen(PORT, () => {
  logger.info(`🧑 Profile Service iniciado en puerto ${PORT}`);
  logger.info(`📚 Swagger docs en http://localhost:${PORT}/docs`);
});

export default app;
