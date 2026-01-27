/**
 * Message Service - Raíz Marketplace
 * 
 * Microservicio responsable de la mensajería en tiempo real (Foro Global).
 * Esquema: message.messages
 * Implementa WebSocket con Socket.IO
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import messageRoutes from './routes/messages.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { httpRequestDuration, httpRequestsTotal, websocketConnections, websocketMessagesTotal, getMetrics } from './utils/prometheus.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8004;

// ===========================================
// SUPABASE CLIENT
// ===========================================

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===========================================
// SOCKET.IO SETUP
// ===========================================

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io'
});

// Almacenar usuarios conectados
const connectedUsers = new Map();

// Middleware de autenticación para Socket.IO
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Token de autenticación requerido'));
    }

    // Verificar token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return next(new Error('Token inválido'));
    }

    // Obtener perfil del usuario
    const { data: profile } = await supabase
      .schema('profile')
      .from('profiles')
      .select('username, full_name, avatar_url')
      .eq('id', user.id)
      .single();

    socket.userId = user.id;
    socket.userProfile = profile || { username: 'Usuario' };
    
    next();
  } catch (error) {
    logger.error('Error en autenticación WebSocket:', error);
    next(new Error('Error de autenticación'));
  }
});

// Manejo de conexiones WebSocket
io.on('connection', (socket) => {
  logger.info(`Usuario conectado: ${socket.userId} (${socket.userProfile.username})`);
  
  // Registrar usuario conectado
  connectedUsers.set(socket.userId, {
    socketId: socket.id,
    username: socket.userProfile.username,
    connectedAt: new Date()
  });

  // Actualizar métrica de conexiones WebSocket
  websocketConnections.set(connectedUsers.size);

  // Emitir lista de usuarios conectados
  io.emit('users:online', Array.from(connectedUsers.values()).map(u => u.username));

  // Unirse a la sala del foro global
  socket.join('forum:global');

  // Enviar mensaje al foro
  socket.on('forum:message', async (data) => {
    try {
      const { message_text } = data;

      if (!message_text || message_text.trim().length === 0) {
        socket.emit('error', { message: 'El mensaje no puede estar vacío' });
        return;
      }

      if (message_text.length > 1000) {
        socket.emit('error', { message: 'El mensaje es demasiado largo (máx. 1000 caracteres)' });
        return;
      }

      // Guardar mensaje en la base de datos
      const { data: savedMessage, error } = await supabase
        .schema('message')
        .from('messages')
        .insert({
          from_user_id: socket.userId,
          to_user_id: socket.userId, // En foro global, to_user_id = from_user_id
          message_text: message_text.trim()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error guardando mensaje:', error);
        socket.emit('error', { message: 'Error al enviar mensaje' });
        return;
      }

      // Emitir mensaje a todos los usuarios en el foro
      const messagePayload = {
        id: savedMessage.id,
        user_id: socket.userId,
        username: socket.userProfile.username,
        avatar_url: socket.userProfile.avatar_url,
        message_text: savedMessage.message_text,
        sent_at: savedMessage.sent_at
      };

      io.to('forum:global').emit('forum:newMessage', messagePayload);
      
      // Registrar métrica de mensaje WebSocket
      websocketMessagesTotal.inc({ event_type: 'forum_message' });
      
      logger.info(`Mensaje enviado por ${socket.userProfile.username}`);
    } catch (error) {
      logger.error('Error en forum:message:', error);
      socket.emit('error', { message: 'Error interno del servidor' });
    }
  });

  // Usuario escribiendo
  socket.on('forum:typing', () => {
    socket.to('forum:global').emit('forum:userTyping', {
      username: socket.userProfile.username
    });
  });

  // Usuario dejó de escribir
  socket.on('forum:stopTyping', () => {
    socket.to('forum:global').emit('forum:userStopTyping', {
      username: socket.userProfile.username
    });
  });

  // Desconexión
  socket.on('disconnect', () => {
    logger.info(`Usuario desconectado: ${socket.userId}`);
    connectedUsers.delete(socket.userId);
    
    // Actualizar métrica de conexiones WebSocket
    websocketConnections.set(connectedUsers.size);
    
    io.emit('users:online', Array.from(connectedUsers.values()).map(u => u.username));
  });
});

// Exportar io para usarlo en controladores
export { io };

// ===========================================
// SWAGGER CONFIGURATION
// ===========================================

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Message Service API - Raíz Marketplace',
      version: '1.0.0',
      description: `
## API de Mensajería en Tiempo Real

Este servicio maneja el foro global de Raíz Marketplace usando WebSocket (Socket.IO).

### Conexión WebSocket

\`\`\`javascript
const socket = io('http://localhost:8004', {
  auth: { token: 'tu-jwt-token' }
});
\`\`\`

### Eventos WebSocket

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| \`forum:message\` | Cliente → Servidor | Enviar mensaje al foro |
| \`forum:newMessage\` | Servidor → Cliente | Nuevo mensaje recibido |
| \`forum:typing\` | Cliente → Servidor | Usuario escribiendo |
| \`forum:userTyping\` | Servidor → Cliente | Notificar usuario escribiendo |
| \`users:online\` | Servidor → Cliente | Lista de usuarios conectados |
      `,
      contact: { name: 'Raíz Team' }
    },
    servers: [
      { url: 'http://localhost:8004', description: 'Servidor de desarrollo' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT de Supabase Auth'
        }
      },
      schemas: {
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            from_user_id: { type: 'string', format: 'uuid' },
            to_user_id: { type: 'string', format: 'uuid' },
            message_text: { type: 'string' },
            is_read: { type: 'boolean' },
            sent_at: { type: 'string', format: 'date-time' }
          }
        },
        ForumMessage: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            avatar_url: { type: 'string', nullable: true },
            message_text: { type: 'string' },
            sent_at: { type: 'string', format: 'date-time' }
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
  apis: ['./src/routes/*.js', './src/index.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// ===========================================
// MIDDLEWARE
// ===========================================

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
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
  customSiteTitle: 'Message Service - API Docs'
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
    service: 'message-service',
    websocket: 'enabled',
    connectedUsers: connectedUsers.size,
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

app.use('/', messageRoutes);

// ===========================================
// ERROR HANDLING
// ===========================================

app.use(errorHandler);

// ===========================================
// START SERVER
// ===========================================

httpServer.listen(PORT, () => {
  logger.info(`💬 Message Service iniciado en puerto ${PORT}`);
  logger.info(`📡 WebSocket habilitado en ws://localhost:${PORT}`);
  logger.info(`📚 Swagger docs en http://localhost:${PORT}/docs`);
});

export default app;
