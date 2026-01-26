/**
 * Message Controller
 * 
 * Controlador para operaciones de mensajería.
 * Accede al esquema: message.messages
 */

import { supabase } from '../index.js';
import { logger } from '../utils/logger.js';
import { emitAuditEvent } from '../utils/audit.js';

/**
 * Lista conversaciones del usuario
 * Agrupa mensajes por usuario y muestra el último mensaje
 */
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];

    // Obtener todos los mensajes donde el usuario participa
    const { data: messages, error } = await supabase
      .schema('message')
      .from('messages')
      .select('*')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('sent_at', { ascending: false });

    if (error) throw error;

    // Agrupar por conversación (el otro usuario)
    const conversationsMap = new Map();

    messages.forEach(msg => {
      const otherUserId = msg.from_user_id === userId 
        ? msg.to_user_id 
        : msg.from_user_id;
      
      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          userId: otherUserId,
          lastMessage: msg,
          unreadCount: 0
        });
      }

      // Contar no leídos (solo mensajes recibidos)
      if (msg.to_user_id === userId && !msg.is_read) {
        const conv = conversationsMap.get(otherUserId);
        conv.unreadCount++;
      }
    });

    const conversations = Array.from(conversationsMap.values());

    res.json({
      conversations,
      total: conversations.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene mensajes de una conversación específica
 */
export const getConversation = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { userId: otherUserId } = req.params;
    const { limit = 50, before } = req.query;

    let query = supabase
      .schema('message')
      .from('messages')
      .select('*')
      .or(
        `and(from_user_id.eq.${userId},to_user_id.eq.${otherUserId}),` +
        `and(from_user_id.eq.${otherUserId},to_user_id.eq.${userId})`
      )
      .order('sent_at', { ascending: false })
      .limit(parseInt(limit));

    if (before) {
      query = query.lt('sent_at', before);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Ordenar cronológicamente para mostrar
    const sortedMessages = data.reverse();

    res.json({
      messages: sortedMessages,
      hasMore: data.length === parseInt(limit)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Envía un nuevo mensaje
 */
export const sendMessage = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { to_user_id, message_text } = req.body;

    // No permitir enviar mensaje a uno mismo
    if (userId === to_user_id) {
      return res.status(400).json({
        error: 'No puedes enviarte mensajes a ti mismo'
      });
    }

    // Verificar que el destinatario existe
    const { data: recipient, error: recipientError } = await supabase
      .schema('profile')
      .from('profiles')
      .select('id')
      .eq('id', to_user_id)
      .single();

    if (recipientError || !recipient) {
      return res.status(404).json({
        error: 'Destinatario no encontrado'
      });
    }

    // Insertar mensaje
    const { data, error } = await supabase
      .schema('message')
      .from('messages')
      .insert({
        from_user_id: userId,
        to_user_id,
        message_text
      })
      .select()
      .single();

    if (error) throw error;

    await emitAuditEvent('message', 'SEND', {
      messageId: data.id,
      from: userId,
      to: to_user_id
    });

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene mensajes del foro global
 * Los mensajes del foro tienen from_user_id = to_user_id
 */
export const getForumMessages = async (req, res, next) => {
  try {
    const { limit = 50, before } = req.query;

    // Obtener mensajes y filtrar los del foro (from_user_id === to_user_id)
    let query = supabase
      .schema('message')
      .from('messages')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(parseInt(limit) * 2); // Obtener más para filtrar

    if (before) {
      query = query.lt('sent_at', before);
    }

    const { data: allMessages, error } = await query;

    if (error) throw error;

    // Filtrar mensajes del foro (from_user_id === to_user_id)
    const forumMessages = allMessages
      .filter(m => m.from_user_id === m.to_user_id)
      .slice(0, parseInt(limit));

    // Obtener perfiles de usuarios
    const userIds = [...new Set(forumMessages.map(m => m.from_user_id))];
    
    let profileMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .schema('profile')
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    }

    const messagesWithUser = forumMessages.reverse().map(m => ({
      id: m.id,
      user_id: m.from_user_id,
      username: profileMap.get(m.from_user_id)?.username || 'Usuario',
      avatar_url: profileMap.get(m.from_user_id)?.avatar_url,
      message_text: m.message_text,
      sent_at: m.sent_at
    }));

    res.json({
      messages: messagesWithUser,
      hasMore: forumMessages.length === parseInt(limit)
    });
  } catch (error) {
    logger.error('Error en getForumMessages:', error);
    next(error);
  }
};

/**
 * Cuenta mensajes no leídos
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];

    const { count, error } = await supabase
      .schema('message')
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('to_user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ unreadCount: count || 0 });
  } catch (error) {
    next(error);
  }
};

/**
 * Marca mensajes de un usuario como leídos
 */
export const markAsRead = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { userId: fromUserId } = req.params;

    const { error } = await supabase
      .schema('message')
      .from('messages')
      .update({ is_read: true })
      .eq('from_user_id', fromUserId)
      .eq('to_user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ message: 'Mensajes marcados como leídos' });
  } catch (error) {
    next(error);
  }
};
