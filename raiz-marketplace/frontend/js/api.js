/**
 * API Client
 * 
 * Cliente para comunicarse con el API Gateway.
 * Incluye automáticamente el token de autenticación.
 */

const API = {
  baseUrl: CONFIG.API_URL,

  /**
   * Realizar petición HTTP
   */
  async request(endpoint, options = {}) {
    const token = await getAccessToken();
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Agregar token si existe
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    
    // Parsear respuesta
    const data = await response.json().catch(() => null);
    
    if (!response.ok) {
      const error = new Error(data?.error || 'Error en la petición');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  },

  // Métodos de conveniencia
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, { 
      method: 'POST', 
      body: JSON.stringify(body) 
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, { 
      method: 'PUT', 
      body: JSON.stringify(body) 
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

// ============================================
// PRODUCTOS
// ============================================

const ProductsAPI = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return API.get(`/api/products${query ? '?' + query : ''}`);
  },

  async getById(id) {
    return API.get(`/api/products/${id}`);
  },

  async getByCategory(category) {
    return API.get(`/api/products/category/${category}`);
  },

  async create(product) {
    return API.post('/api/products', product);
  },

  async update(id, product) {
    return API.put(`/api/products/${id}`, product);
  },

  async delete(id) {
    return API.delete(`/api/products/${id}`);
  },

  async getMyProducts() {
    return API.get('/api/products/my/products');
  }
};

// ============================================
// ÓRDENES
// ============================================

const OrdersAPI = {
  async getMyOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return API.get(`/api/orders${query ? '?' + query : ''}`);
  },

  async getMySales() {
    return API.get('/api/orders/sales');
  },

  async getById(id) {
    return API.get(`/api/orders/${id}`);
  },

  async create(order) {
    return API.post('/api/orders', order);
  },

  async updateStatus(id, status) {
    return API.put(`/api/orders/${id}/status`, { status });
  },

  async cancel(id) {
    return API.put(`/api/orders/${id}/cancel`);
  }
};

// ============================================
// PERFILES
// ============================================

const ProfilesAPI = {
  async getMyProfile() {
    return API.get('/api/profiles/me');
  },

  async getById(id) {
    return API.get(`/api/profiles/${id}`);
  },

  async updateMyProfile(data) {
    return API.put('/api/profiles/me', data);
  }
};

// ============================================
// MENSAJES
// ============================================

const MessagesAPI = {
  async getConversations() {
    return API.get('/api/messages');
  },

  async getConversation(userId) {
    return API.get(`/api/messages/conversation/${userId}`);
  },

  async send(toUserId, message) {
    return API.post('/api/messages', {
      to_user_id: toUserId,
      message_text: message
    });
  },

  async getUnreadCount() {
    return API.get('/api/messages/unread');
  },

  async markAsRead(userId) {
    return API.put(`/api/messages/read/${userId}`);
  }
};

// Exportar
window.API = API;
window.ProductsAPI = ProductsAPI;
window.OrdersAPI = OrdersAPI;
window.ProfilesAPI = ProfilesAPI;
window.MessagesAPI = MessagesAPI;
