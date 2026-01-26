/**
 * Configuración del Frontend
 * 
 * Variables de configuración para el cliente.
 * En producción, estas se inyectarían via servidor o build.
 */

const CONFIG = {
  // Supabase - REEMPLAZAR con tus credenciales
  SUPABASE_URL: 'https://blxdykzecwyhnvygyqzh.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJseGR5a3plY3d5aG52eWd5cXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjk1OTMsImV4cCI6MjA4NDk0NTU5M30.pVqbjaUfD9Y5btfHCTrtHHAM-XuOHzz5TlY4ZJqJdDg',
  
  // API Gateway
  API_URL: 'http://localhost:8000',
  
  // Categorías disponibles
  CATEGORIES: [
    { id: 'frutas', name: 'Frutas', emoji: '🍎' },
    { id: 'verduras', name: 'Verduras', emoji: '🥬' },
    { id: 'hortalizas', name: 'Hortalizas', emoji: '🥕' },
    { id: 'legumbres', name: 'Legumbres', emoji: '🫘' },
    { id: 'cereales', name: 'Cereales', emoji: '🌾' },
    { id: 'lacteos', name: 'Lácteos', emoji: '🧀' },
    { id: 'carnes', name: 'Carnes', emoji: '🥩' },
    { id: 'huevos', name: 'Huevos', emoji: '🥚' },
    { id: 'miel', name: 'Miel', emoji: '🍯' },
    { id: 'hierbas', name: 'Hierbas', emoji: '🌿' },
    { id: 'otros', name: 'Otros', emoji: '📦' }
  ],
  
  // Estados de órdenes
  ORDER_STATUS: {
    pending: { label: 'Pendiente', color: '#ffc107' },
    confirmed: { label: 'Confirmado', color: '#17a2b8' },
    shipped: { label: 'Enviado', color: '#007bff' },
    delivered: { label: 'Entregado', color: '#28a745' },
    cancelled: { label: 'Cancelado', color: '#dc3545' }
  }
};

// Hacer disponible globalmente
window.CONFIG = CONFIG;
