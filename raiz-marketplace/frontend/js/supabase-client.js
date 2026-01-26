/**
 * Cliente de Supabase
 * 
 * Inicializa y exporta el cliente de Supabase para autenticación.
 */

// Crear cliente de Supabase
const supabaseClient = supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);

// Hacer disponible globalmente
window.supabaseClient = supabaseClient;

/**
 * Obtiene el usuario actual
 */
async function getCurrentUser() {
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Obtiene la sesión actual
 */
async function getSession() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error || !session) return null;
  return session;
}

/**
 * Obtiene el token de acceso
 */
async function getAccessToken() {
  const session = await getSession();
  return session?.access_token || null;
}

// Exportar funciones
window.getCurrentUser = getCurrentUser;
window.getSession = getSession;
window.getAccessToken = getAccessToken;
