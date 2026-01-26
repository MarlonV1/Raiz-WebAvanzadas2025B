/**
 * Product Controller
 * 
 * Controlador para operaciones CRUD de productos.
 * Accede al esquema: product.products
 */

import { supabase } from '../index.js';
import { logger } from '../utils/logger.js';
import { emitAuditEvent } from '../utils/audit.js';

// Categorías predefinidas
const CATEGORIES = [
  'frutas',
  'verduras',
  'hortalizas',
  'legumbres',
  'cereales',
  'lacteos',
  'carnes',
  'huevos',
  'miel',
  'hierbas',
  'otros'
];

/**
 * Lista productos activos con paginación y filtros
 */
export const getProducts = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      search,
      min_price,
      max_price,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;
    
    const offset = (page - 1) * limit;

    let query = supabase
      .schema('product')
      .from('products')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + parseInt(limit) - 1);

    // Filtros opcionales
    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (min_price) {
      query = query.gte('price', parseFloat(min_price));
    }

    if (max_price) {
      query = query.lte('price', parseFloat(max_price));
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Obtener información de los dueños para evitar N+1
    const ownerIds = [...new Set(data.map(p => p.owner_id))];
    let ownerMap = new Map();
    
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .schema('profile')
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', ownerIds);
      
      if (profiles) {
        ownerMap = new Map(profiles.map(p => [p.id, p]));
      }
    }

    // Agregar información del owner a cada producto
    const productsWithOwner = data.map(product => ({
      ...product,
      owner: ownerMap.get(product.owner_id) || { username: 'Usuario' }
    }));

    res.setHeader('X-Total-Count', count);
    res.setHeader('X-Page', page);
    res.setHeader('X-Per-Page', limit);
    res.setHeader('X-Total-Pages', Math.ceil(count / limit));

    res.json({
      products: productsWithOwner,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene un producto por ID
 */
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .schema('product')
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Producto no encontrado'
        });
      }
      throw error;
    }

    // Obtener información del dueño
    const { data: owner } = await supabase
      .schema('profile')
      .from('profiles')
      .select('id, username, avatar_url, full_name')
      .eq('id', data.owner_id)
      .single();

    res.json({
      ...data,
      owner: owner || { username: 'Usuario' }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lista productos por categoría
 */
export const getProductsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .schema('product')
      .from('products')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .eq('category', category)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      category,
      products: data,
      total: count
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lista productos del usuario autenticado
 */
export const getMyProducts = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];

    const { data, error } = await supabase
      .schema('product')
      .from('products')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un nuevo producto
 */
export const createProduct = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { title, description, category, price, quantity } = req.body;

    // Validar categoría
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: 'Categoría inválida',
        validCategories: CATEGORIES
      });
    }

    const { data, error } = await supabase
      .schema('product')
      .from('products')
      .insert({
        owner_id: userId,
        title,
        description: description || '',
        category,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    await emitAuditEvent('product', 'CREATE', { 
      productId: data.id, 
      ownerId: userId,
      title 
    });

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza un producto
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    // Verificar propiedad del producto
    const { data: existing, error: fetchError } = await supabase
      .schema('product')
      .from('products')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      throw fetchError;
    }

    // Solo el dueño o admin puede actualizar
    if (existing.owner_id !== userId && userRole !== 'admin') {
      return res.status(403).json({
        error: 'No tienes permisos para actualizar este producto'
      });
    }

    const { title, description, category, price, quantity, is_active } = req.body;
    const updates = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({
          error: 'Categoría inválida',
          validCategories: CATEGORIES
        });
      }
      updates.category = category;
    }
    if (price !== undefined) updates.price = parseFloat(price);
    if (quantity !== undefined) updates.quantity = parseInt(quantity);
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const { data, error } = await supabase
      .schema('product')
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await emitAuditEvent('product', 'UPDATE', { 
      productId: id, 
      updates,
      updatedBy: userId 
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Elimina (desactiva) un producto
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    // Verificar propiedad
    const { data: existing, error: fetchError } = await supabase
      .schema('product')
      .from('products')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      throw fetchError;
    }

    if (existing.owner_id !== userId && userRole !== 'admin') {
      return res.status(403).json({
        error: 'No tienes permisos para eliminar este producto'
      });
    }

    // Soft delete - solo desactivar
    const { error } = await supabase
      .schema('product')
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    await emitAuditEvent('product', 'DELETE', { 
      productId: id, 
      deletedBy: userId 
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
