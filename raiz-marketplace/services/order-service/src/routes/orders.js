/**
 * Order Routes
 * @swagger
 * tags:
 *   - name: Orders
 *     description: Gestión de órdenes de compra
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import * as orderController from '../controllers/orderController.js';

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

// Todas las rutas de órdenes requieren autenticación
router.use(requireAuth);

// ===========================================
// RUTAS DE ÓRDENES
// ===========================================

/**
 * @swagger
 * /:
 *   get:
 *     summary: Lista órdenes del usuario (como comprador)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, shipped, delivered, cancelled]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de órdenes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *       401:
 *         description: No autenticado
 */
router.get('/',
  query('status').optional().isIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
  validate,
  orderController.getMyOrders
);

/**
 * @swagger
 * /sales:
 *   get:
 *     summary: Lista órdenes donde el usuario es vendedor
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ventas
 *       401:
 *         description: No autenticado
 */
router.get('/sales', orderController.getMySales);

/**
 * @swagger
 * /{id}:
 *   get:
 *     summary: Obtiene una orden por ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Orden encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin acceso a esta orden
 *       404:
 *         description: Orden no encontrada
 */
router.get('/:id',
  param('id').isUUID().withMessage('ID de orden inválido'),
  validate,
  orderController.getOrderById
);

/**
 * @swagger
 * /:
 *   post:
 *     summary: Crea una nueva orden
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *               - quantity
 *             properties:
 *               product_id:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Orden creada
 *       400:
 *         description: Datos inválidos o stock insuficiente
 *       401:
 *         description: No autenticado
 */
router.post('/',
  body('product_id').isUUID().withMessage('ID de producto requerido'),
  body('quantity').isInt({ min: 1 }).withMessage('Cantidad debe ser al menos 1'),
  validate,
  orderController.createOrder
);

/**
 * @swagger
 * /{id}/status:
 *   put:
 *     summary: Actualiza el estado de una orden (solo vendedor)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, shipped, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 */
router.put('/:id/status',
  param('id').isUUID().withMessage('ID de orden inválido'),
  body('status')
    .isIn(['confirmed', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Estado inválido'),
  validate,
  orderController.updateOrderStatus
);

/**
 * @swagger
 * /{id}/cancel:
 *   put:
 *     summary: Cancela una orden (comprador o vendedor)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Orden cancelada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 */
router.put('/:id/cancel',
  param('id').isUUID().withMessage('ID de orden inválido'),
  validate,
  orderController.cancelOrder
);

export default router;
