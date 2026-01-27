/**
 * Order Controller
 * 
 * Controlador para operaciones CRUD de órdenes.
 * Accede al esquema: order.orders
 * 
 * NOTA: Este controlador implementa una versión simplificada
 * del Saga Pattern para manejar la transacción de crear orden:
 * 1. Verificar producto disponible
 * 2. Crear orden
 * 3. Reducir stock
 * Si falla paso 3, se cancela la orden (compensación)
 */

import { supabase } from '../index.js';
import { logger } from '../utils/logger.js';
import { emitAuditEvent } from '../utils/audit.js';

// Estados válidos de una orden
const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  RECEIVED: 'received',  // El comprador marca como recibido
  CANCELLED: 'cancelled'
};

/**
 * Lista órdenes del usuario como comprador
 */
export const getMyOrders = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .schema('order')
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      orders: data,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lista órdenes donde el usuario es vendedor
 */
export const getMySales = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];

    // Primero obtenemos los productos del usuario
    const { data: products, error: productsError } = await supabase
      .schema('product')
      .from('products')
      .select('id')
      .eq('owner_id', userId);

    if (productsError) throw productsError;

    const productIds = products.map(p => p.id);

    if (productIds.length === 0) {
      return res.json({ sales: [], total: 0 });
    }

    // Luego las órdenes de esos productos
    const { data, error } = await supabase
      .schema('order')
      .from('orders')
      .select('*')
      .in('product_id', productIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      sales: data,
      total: data.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene una orden por ID
 */
export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];

    const { data, error } = await supabase
      .schema('order')
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }
      throw error;
    }

    // Verificar que el usuario tenga acceso a esta orden
    // (es comprador o vendedor del producto)
    const { data: product } = await supabase
      .schema('product')
      .from('products')
      .select('owner_id')
      .eq('id', data.product_id)
      .single();

    if (data.buyer_id !== userId && product?.owner_id !== userId) {
      return res.status(403).json({
        error: 'No tienes acceso a esta orden'
      });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Crea una nueva orden
 * Implementa Saga Pattern simplificado
 */
export const createOrder = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { product_id, quantity } = req.body;

    // PASO 1: Verificar producto y disponibilidad
    const { data: product, error: productError } = await supabase
      .schema('product')
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        error: 'Producto no encontrado o no disponible'
      });
    }

    // Verificar que no sea el propio producto
    if (product.owner_id === userId) {
      return res.status(400).json({
        error: 'No puedes comprar tu propio producto'
      });
    }

    // Verificar stock
    if (product.quantity < quantity) {
      return res.status(400).json({
        error: 'Stock insuficiente',
        available: product.quantity,
        requested: quantity
      });
    }

    // Calcular total
    const total = product.price * quantity;

    // PASO 2: Crear la orden
    const { data: order, error: orderError } = await supabase
      .schema('order')
      .from('orders')
      .insert({
        buyer_id: userId,
        seller_id: product.owner_id,
        product_id,
        quantity,
        unit_price: product.price,
        total,
        status: ORDER_STATUS.PENDING
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // PASO 3: Reducir stock (parte de la saga)
    const { error: stockError } = await supabase
      .schema('product')
      .from('products')
      .update({ quantity: product.quantity - quantity })
      .eq('id', product_id);

    if (stockError) {
      // COMPENSACIÓN: Si falla la reducción de stock, cancelar la orden
      logger.error(`Error reduciendo stock, compensando orden ${order.id}`);
      
      await supabase
        .schema('order')
        .from('orders')
        .update({ status: ORDER_STATUS.CANCELLED })
        .eq('id', order.id);

      throw new Error('Error al procesar la orden. Por favor, intente de nuevo.');
    }

    await emitAuditEvent('order', 'CREATE', {
      orderId: order.id,
      buyerId: userId,
      productId: product_id,
      quantity,
      total
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

/**
 * Actualiza el estado de una orden
 * - Vendedor puede: pending->confirmed, confirmed->shipped, cualquiera->cancelled
 * - Comprador puede: shipped->received (marcar como recibido)
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.headers['x-user-id'];

    // Obtener la orden
    const { data: order, error: orderError } = await supabase
      .schema('order')
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // Obtener información del producto para saber quién es el vendedor
    const { data: product } = await supabase
      .schema('product')
      .from('products')
      .select('owner_id')
      .eq('id', order.product_id)
      .single();

    const isSeller = product?.owner_id === userId;
    const isBuyer = order.buyer_id === userId;

    // Si el usuario quiere marcar como "received", debe ser el comprador
    if (status === ORDER_STATUS.RECEIVED) {
      if (!isBuyer) {
        return res.status(403).json({
          error: 'Solo el comprador puede marcar la orden como recibida'
        });
      }
      // Solo se puede marcar recibido si está en estado "shipped"
      if (order.status !== ORDER_STATUS.SHIPPED) {
        return res.status(400).json({
          error: 'Solo puedes marcar como recibido cuando la orden está enviada',
          currentStatus: order.status
        });
      }
    } else {
      // Para otros estados, solo el vendedor puede actualizar
      if (!isSeller) {
        return res.status(403).json({
          error: 'Solo el vendedor puede actualizar este estado'
        });
      }

      // Validar transición de estado para el vendedor
      const validTransitions = {
        [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
        [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
        [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.CANCELLED],
        [ORDER_STATUS.RECEIVED]: [],
        [ORDER_STATUS.CANCELLED]: []
      };

      if (!validTransitions[order.status]?.includes(status)) {
        return res.status(400).json({
          error: `No se puede cambiar de ${order.status} a ${status}`,
          validTransitions: validTransitions[order.status] || []
        });
      }
    }

    // Actualizar estado
    const { data, error } = await supabase
      .schema('order')
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await emitAuditEvent('order', 'STATUS_UPDATE', {
      orderId: id,
      previousStatus: order.status,
      newStatus: status,
      updatedBy: userId,
      updatedByRole: isBuyer ? 'buyer' : 'seller'
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Cancela una orden
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];

    const { data: order, error: orderError } = await supabase
      .schema('order')
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // Verificar que sea el comprador o vendedor
    const { data: product } = await supabase
      .schema('product')
      .from('products')
      .select('owner_id, quantity')
      .eq('id', order.product_id)
      .single();

    if (order.buyer_id !== userId && product?.owner_id !== userId) {
      return res.status(403).json({
        error: 'No tienes permisos para cancelar esta orden'
      });
    }

    // Solo se puede cancelar si está pendiente o confirmada
    if (![ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED].includes(order.status)) {
      return res.status(400).json({
        error: 'Esta orden no puede ser cancelada',
        currentStatus: order.status
      });
    }

    // Cancelar orden
    const { error } = await supabase
      .schema('order')
      .from('orders')
      .update({ status: ORDER_STATUS.CANCELLED })
      .eq('id', id);

    if (error) throw error;

    // Devolver stock al producto
    await supabase
      .schema('product')
      .from('products')
      .update({ quantity: product.quantity + order.quantity })
      .eq('id', order.product_id);

    await emitAuditEvent('order', 'CANCEL', {
      orderId: id,
      cancelledBy: userId,
      previousStatus: order.status
    });

    res.json({ message: 'Orden cancelada exitosamente' });
  } catch (error) {
    next(error);
  }
};
