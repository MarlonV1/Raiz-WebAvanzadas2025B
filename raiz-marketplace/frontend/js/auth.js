/**
 * Módulo de Autenticación
 * 
 * Maneja login, registro y gestión de sesión con Supabase Auth.
 */

const Auth = {
  /**
   * Registrar nuevo usuario
   */
  async signUp(email, password, metadata = {}) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Iniciar sesión
   */
  async signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  /**
   * Cerrar sesión
   */
  async signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    window.location.href = '/';
  },

  /**
   * Obtener usuario actual
   */
  async getUser() {
    return await getCurrentUser();
  },

  /**
   * Verificar si está autenticado
   */
  async isAuthenticated() {
    const user = await this.getUser();
    return !!user;
  },

  /**
   * Escuchar cambios de autenticación
   */
  onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
};

// Hacer disponible globalmente
window.Auth = Auth;

/**
 * Actualiza la UI del header según el estado de autenticación
 */
async function updateAuthUI() {
  const navAuth = document.getElementById('nav-auth');
  const navMenu = document.getElementById('nav-menu');
  if (!navAuth) return;

  const user = await Auth.getUser();

  if (user) {
    // Guardar referencia al usuario actual
    Auth.currentUser = user;
    
    // Usuario autenticado
    const displayName = user.user_metadata?.full_name || 
                       user.user_metadata?.username || 
                       user.email.split('@')[0];
    
    // Obtener inicial para avatar
    const initial = displayName.charAt(0).toUpperCase();
    
    // Agregar enlaces adicionales al nav principal si no existen
    if (navMenu && !navMenu.querySelector('[href="/pages/my-products.html"]')) {
      const forumLink = navMenu.querySelector('[href="/pages/forum.html"]');
      if (forumLink) {
        const myProductsLink = document.createElement('a');
        myProductsLink.href = '/pages/my-products.html';
        myProductsLink.textContent = 'Mis Productos';
        
        const myOrdersLink = document.createElement('a');
        myOrdersLink.href = '/pages/orders.html';
        myOrdersLink.textContent = 'Mis Órdenes';
        
        navMenu.insertBefore(myProductsLink, forumLink);
        navMenu.insertBefore(myOrdersLink, forumLink);
      }
    }
    
    navAuth.innerHTML = `
      <div class="nav-user">
        <a href="/pages/profile.html" class="nav-user-name">
          <span class="nav-avatar">${initial}</span>
          ${displayName}
        </a>
        <button class="btn-logout" onclick="Auth.signOut()">Salir</button>
      </div>
    `;
  } else {
    // Limpiar referencia
    Auth.currentUser = null;
    
    // Remover enlaces adicionales si existen
    if (navMenu) {
      const myProductsLink = navMenu.querySelector('[href="/pages/my-products.html"]');
      const myOrdersLink = navMenu.querySelector('[href="/pages/orders.html"]');
      if (myProductsLink) myProductsLink.remove();
      if (myOrdersLink) myOrdersLink.remove();
    }
    
    // Usuario no autenticado - mostrar botones estilizados
    navAuth.innerHTML = `
      <a href="/pages/login.html" class="btn-nav btn-nav-secondary">Iniciar Sesión</a>
      <a href="/pages/register.html" class="btn-nav btn-nav-primary">Únete Ahora</a>
    `;
  }
}

// Escuchar cambios de auth
Auth.onAuthStateChange((event, session) => {
  updateAuthUI();
});

// Actualizar UI al cargar
document.addEventListener('DOMContentLoaded', updateAuthUI);

// Efecto de scroll en el header
document.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  if (header) {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
});
