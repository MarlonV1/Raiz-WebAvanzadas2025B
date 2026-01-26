/**
 * Product Service - Raíz Marketplace
 * 
 * Microservicio responsable del catálogo de productos.
 * Esquema: product.products
 */

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import productRoutes from './routes/products.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 8002;

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
      title: 'Product Service API - Raíz Marketplace',
      version: '1.0.0',
      description: 'API para gestión del catálogo de productos',
      contact: { name: 'Raíz Team' }
    },
    servers: [
      { url: 'http://localhost:8002', description: 'Servidor de desarrollo' }
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
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            owner_id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number' },
            quantity: { type: 'integer' },
            image_url: { type: 'string', nullable: true },
            is_active: { type: 'boolean' },
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

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ===========================================
// SWAGGER DOCS
// ===========================================

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Product Service - API Docs'
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
    service: 'product-service',
    timestamp: new Date().toISOString()
  });
});

// ===========================================
// ROUTES
// ===========================================

app.use('/', productRoutes);

// ===========================================
// ERROR HANDLING
// ===========================================

app.use(errorHandler);

// ===========================================
// START SERVER
// ===========================================

app.listen(PORT, () => {
  logger.info(`🥕 Product Service iniciado en puerto ${PORT}`);
  logger.info(`📚 Swagger docs en http://localhost:${PORT}/docs`);
});

export default app;
