/**
 * Product Routes
 * @swagger
 * tags:
 *   - name: Products
 *     description: Gestión de productos del marketplace
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import * as productController from '../controllers/productController.js';

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

// ===========================================
// RUTAS PÚBLICAS (no requieren auth)
// ===========================================

/**
 * @swagger
 * /:
 *   get:
 *     summary: Lista productos activos
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de productos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 */
router.get('/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isString(),
  query('search').optional().isString(),
  validate,
  productController.getProducts
);

/**
 * @swagger
 * /{id}:
 *   get:
 *     summary: Obtiene un producto por ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Producto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Producto no encontrado
 */
router.get('/:id',
  param('id').isUUID().withMessage('ID de producto inválido'),
  validate,
  productController.getProductById
);

/**
 * @swagger
 * /category/{category}:
 *   get:
 *     summary: Lista productos por categoría
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de productos de la categoría
 */
router.get('/category/:category',
  productController.getProductsByCategory
);

// ===========================================
// RUTAS PROTEGIDAS (requieren auth)
// ===========================================

/**
 * @swagger
 * /my/products:
 *   get:
 *     summary: Lista productos del usuario autenticado
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de productos del usuario
 *       401:
 *         description: No autenticado
 */
router.get('/my/products',
  requireAuth,
  productController.getMyProducts
);

/**
 * @swagger
 * /:
 *   post:
 *     summary: Crea un nuevo producto
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - price
 *               - quantity
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               price:
 *                 type: number
 *                 minimum: 0
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *               image_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Producto creado
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 */
router.post('/',
  requireAuth,
  body('title')
    .notEmpty().withMessage('Título requerido')
    .isLength({ min: 3, max: 200 }).withMessage('Título debe tener entre 3 y 200 caracteres'),
  body('description')
    .optional()
    .isLength({ max: 2000 }).withMessage('Descripción muy larga'),
  body('category')
    .notEmpty().withMessage('Categoría requerida'),
  body('price')
    .isFloat({ min: 0 }).withMessage('Precio debe ser un número positivo'),
  body('quantity')
    .isInt({ min: 0 }).withMessage('Cantidad debe ser un número entero positivo'),
  validate,
  productController.createProduct
);

/**
 * @swagger
 * /{id}:
 *   put:
 *     summary: Actualiza un producto
 *     tags: [Products]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Producto actualizado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 *       404:
 *         description: Producto no encontrado
 */
router.put('/:id',
  requireAuth,
  param('id').isUUID().withMessage('ID de producto inválido'),
  body('title')
    .optional()
    .isLength({ min: 3, max: 200 }).withMessage('Título inválido'),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Precio inválido'),
  body('quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Cantidad inválida'),
  validate,
  productController.updateProduct
);

/**
 * @swagger
 * /{id}:
 *   delete:
 *     summary: Elimina (desactiva) un producto
 *     tags: [Products]
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
 *         description: Producto eliminado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos
 */
router.delete('/:id',
  requireAuth,
  param('id').isUUID().withMessage('ID de producto inválido'),
  validate,
  productController.deleteProduct
);

export default router;
