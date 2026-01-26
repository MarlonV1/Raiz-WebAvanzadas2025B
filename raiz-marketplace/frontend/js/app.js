/**
 * App.js - Funciones principales de la aplicación
 */

// Utilidades
const Utils = {
  /**
   * Formatea precio a moneda
   */
  formatPrice(price) {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  },

  /**
   * Formatea fecha
   */
  formatDate(dateString) {
    return new Intl.DateTimeFormat('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(dateString));
  },

  /**
   * Obtiene emoji de categoría
   */
  getCategoryEmoji(categoryId) {
    const category = CONFIG.CATEGORIES.find(c => c.id === categoryId);
    return category?.emoji || '📦';
  },

  /**
   * Obtiene nombre de categoría
   */
  getCategoryName(categoryId) {
    const category = CONFIG.CATEGORIES.find(c => c.id === categoryId);
    return category?.name || categoryId;
  },

  /**
   * Muestra mensaje de error
   */
  showError(message, containerId = 'error-container') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div class="alert alert-error">${message}</div>`;
      container.style.display = 'block';
    } else {
      alert(message);
    }
  },

  /**
   * Muestra mensaje de éxito
   */
  showSuccess(message, containerId = 'success-container') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div class="alert alert-success">${message}</div>`;
      container.style.display = 'block';
    }
  },

  /**
   * Obtiene parámetros de URL
   */
  getUrlParams() {
    return Object.fromEntries(new URLSearchParams(window.location.search));
  },

  /**
   * Genera HTML de producto card
   */
  productCard(product) {
    // Verificar si el producto es del usuario actual
    const currentUser = Auth.currentUser;
    const isOwner = currentUser && product.owner_id === currentUser.id;
    const ownerName = product.owner?.username || 'Usuario';
    
    return `
      <div class="product-card ${isOwner ? 'my-product' : ''}">
        ${isOwner ? '<span class="my-product-badge">✨ Mi producto</span>' : ''}
        <div class="product-image">
          ${this.getCategoryEmoji(product.category)}
        </div>
        <div class="product-info">
          <span class="product-category">${this.getCategoryName(product.category)}</span>
          <h3>${product.title}</h3>
          <p>${product.description || 'Sin descripción'}</p>
          <div class="product-seller">
            ${isOwner ? '' : `<small>🧑‍🌾 Vendido por: <strong>${ownerName}</strong></small>`}
          </div>
          <div class="product-footer">
            <div>
              <div class="product-price">${this.formatPrice(product.price)}</div>
              <div class="product-stock">${product.quantity} disponibles</div>
            </div>
            <a href="/pages/product.html?id=${product.id}" class="btn-view">Ver</a>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Muestra estado de carga
   */
  showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="loading">
          <div class="loading-spinner"></div>
          <p>Cargando...</p>
        </div>
      `;
    }
  },

  /**
   * Muestra estado vacío
   */
  showEmpty(containerId, message = 'No hay elementos para mostrar', icon = '📭') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">${icon}</div>
          <h3>${message}</h3>
        </div>
      `;
    }
  }
};

// Hacer disponible globalmente
window.Utils = Utils;

// Log de inicialización
console.log('🌱 Raíz Marketplace - Frontend iniciado');
