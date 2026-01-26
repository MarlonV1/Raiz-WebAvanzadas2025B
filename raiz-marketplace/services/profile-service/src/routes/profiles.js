/**
 * Profile Routes
 * @swagger
 * tags:
 *   - name: Profiles
 *     description: Gestión de perfiles de usuario
 */

import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import * as profileController from '../controllers/profileController.js';

const router = Router();

// Middleware de validación
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

// ===========================================
// RUTAS DE PERFILES
// ===========================================

/**
 * @swagger
 * /me:
 *   get:
 *     summary: Obtiene el perfil del usuario autenticado
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Perfil no encontrado
 */
router.get('/me', profileController.getMyProfile);

/**
 * @swagger
 * /{id}:
 *   get:
 *     summary: Obtiene un perfil por ID
 *     tags: [Profiles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Perfil encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       404:
 *         description: Perfil no encontrado
 */
router.get('/:id',
  param('id').isUUID().withMessage('ID de perfil inválido'),
  validate,
  profileController.getProfileById
);

/**
 * @swagger
 * /me:
 *   put:
 *     summary: Actualiza el perfil del usuario autenticado
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *               full_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               avatar_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 */
router.put('/me',
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username debe tener entre 3 y 30 caracteres'),
  body('full_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre debe tener entre 2 y 100 caracteres'),
  validate,
  profileController.updateMyProfile
);

/**
 * @swagger
 * /{id}:
 *   put:
 *     summary: Actualiza un perfil por ID (requiere permisos)
 *     tags: [Profiles]
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
 *               username:
 *                 type: string
 *               full_name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, farmer, admin]
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *       403:
 *         description: Sin permisos
 */
router.put('/:id',
  param('id').isUUID().withMessage('ID de perfil inválido'),
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username debe tener entre 3 y 30 caracteres'),
  body('full_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nombre debe tener entre 2 y 100 caracteres'),
  body('role')
    .optional()
    .isIn(['user', 'farmer', 'admin'])
    .withMessage('Rol inválido'),
  validate,
  profileController.updateProfileById
);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Lista todos los perfiles (admin)
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de perfiles
 */
router.get('/', profileController.getAllProfiles);

/**
 * @swagger
 * /:
 *   post:
 *     summary: Crea un nuevo perfil
 *     tags: [Profiles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - username
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               username:
 *                 type: string
 *     responses:
 *       201:
 *         description: Perfil creado
 */
router.post('/',
  body('id').isUUID().withMessage('ID requerido'),
  body('username').isLength({ min: 3 }).withMessage('Username requerido'),
  validate,
  profileController.createProfile
);

export default router;
