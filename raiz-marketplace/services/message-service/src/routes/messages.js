/**
 * Message Routes
 * @swagger
 * tags:
 *   - name: Messages
 *     description: Gestión de mensajes del foro
 *   - name: Forum
 *     description: Foro global en tiempo real
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import * as messageController from '../controllers/messageController.js';

const router = Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Error de validación',
      details: errors.array()
    });
  }
  next();
};

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
  if (!req.headers['x-user-id']) {
    return res.status(401).json({
      error: 'Autenticación requerida'
    });
  }
  next();
};

// Todas las rutas requieren autenticación
router.use(requireAuth);

// ===========================================
// RUTAS DEL FORO GLOBAL
// ===========================================

/**
 * @swagger
 * /forum:
 *   get:
 *     summary: Obtiene mensajes del foro global
 *     tags: [Forum]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Número máximo de mensajes
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Obtener mensajes antes de esta fecha (paginación)
 *     responses:
 *       200:
 *         description: Lista de mensajes del foro
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ForumMessage'
 *                 hasMore:
 *                   type: boolean
 *       401:
 *         description: No autenticado
 */
router.get('/forum',
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  messageController.getForumMessages
);

// ===========================================
// RUTAS DE MENSAJES PRIVADOS (legacy)
// ===========================================

/**
 * @swagger
 * /:
 *   get:
 *     summary: Lista conversaciones del usuario
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de conversaciones
 *       401:
 *         description: No autenticado
 */
router.get('/', messageController.getConversations);

/**
 * @swagger
 * /conversation/{userId}:
 *   get:
 *     summary: Obtiene mensajes con un usuario específico
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Mensajes de la conversación
 *       401:
 *         description: No autenticado
 */
router.get('/conversation/:userId',
  param('userId').isUUID().withMessage('ID de usuario inválido'),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  messageController.getConversation
);

/**
 * @swagger
 * /:
 *   post:
 *     summary: Envía un nuevo mensaje
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to_user_id
 *               - message_text
 *             properties:
 *               to_user_id:
 *                 type: string
 *                 format: uuid
 *               message_text:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       201:
 *         description: Mensaje enviado
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 */
router.post('/',
  body('to_user_id').isUUID().withMessage('ID de destinatario requerido'),
  body('message_text')
    .notEmpty().withMessage('Mensaje requerido')
    .isLength({ max: 2000 }).withMessage('Mensaje muy largo (máx 2000 caracteres)'),
  validate,
  messageController.sendMessage
);

/**
 * @swagger
 * /unread:
 *   get:
 *     summary: Cuenta mensajes no leídos
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conteo de mensajes no leídos
 */
router.get('/unread', messageController.getUnreadCount);

/**
 * @swagger
 * /read/{userId}:
 *   put:
 *     summary: Marca mensajes como leídos
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Mensajes marcados como leídos
 */
router.put('/read/:userId',
  param('userId').isUUID().withMessage('ID de usuario inválido'),
  validate,
  messageController.markAsRead
);

export default router;
