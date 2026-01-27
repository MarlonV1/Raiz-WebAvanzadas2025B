# 📚 Documentación de Arquitectura - Raíz Marketplace

## Índice

1. [Arquitectura General del Sistema](#1-arquitectura-general-del-sistema)
2. [Patrones de Microservicios Utilizados](#2-patrones-de-microservicios-utilizados)
3. [Explicación de Cada Microservicio](#3-explicación-de-cada-microservicio)
4. [API Gateway](#4-api-gateway)
5. [Seguridad del Sistema](#5-seguridad-del-sistema)
6. [Comunicación entre Frontend y Microservicios](#6-comunicación-entre-frontend-y-microservicios)
7. [Relación Frontend – API Gateway – Microservicios](#7-relación-frontend--api-gateway--microservicios)
8. [Docker y Ejecución del Proyecto](#8-docker-y-ejecución-del-proyecto)
9. [Consideraciones Finales](#9-consideraciones-finales)

---

## 1. Arquitectura General del Sistema

### 1.1 Tipo de Arquitectura

Raíz Marketplace utiliza una **arquitectura de microservicios** con un patrón de **API Gateway** como punto de entrada único. Esta arquitectura se complementa con:

- **Cliente-Servidor**: El frontend (cliente) se comunica exclusivamente con el API Gateway (servidor).
- **Arquitectura en Capas**: Cada microservicio sigue una estructura MVC (Model-View-Controller) con capas de rutas, controladores y acceso a datos.

### 1.2 Componentes Principales

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│              (Nginx sirviendo archivos estáticos)               │
│                     Puerto: 3000                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                               │
│              (Express.js - Punto de entrada único)              │
│                     Puerto: 8000                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Profile Service │ │ Product Service │ │  Order Service  │
│   Puerto: 8001  │ │   Puerto: 8002  │ │   Puerto: 8003  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                   │                   │
          └───────────────────┴───────────────────┘
                              │
                              ▼
          ┌─────────────────────────────────────────┐
          │               SUPABASE                  │
          │  (PostgreSQL + Auth + Storage + RLS)   │
          └─────────────────────────────────────────┘
```

### 1.3 Flujo de Comunicación

**Ejemplo: Usuario consulta productos**

1. **Usuario en el navegador** → Carga `products.html` desde Nginx (puerto 3000)
2. **JavaScript del frontend** → Ejecuta `ProductsAPI.getAll()` que hace fetch a `http://localhost:8000/api/products`
3. **API Gateway** (puerto 8000) → Recibe la petición, verifica autenticación opcional, aplica rate limiting
4. **API Gateway** → Redirige la petición a `http://product-service:8002/` (dentro de la red Docker)
5. **Product Service** → Consulta `product.products` en Supabase
6. **Supabase** → Retorna los productos desde PostgreSQL
7. **Product Service** → Devuelve JSON al API Gateway
8. **API Gateway** → Reenvía la respuesta al frontend
9. **Frontend** → Renderiza los productos en el HTML

---

## 2. Patrones de Microservicios Utilizados

### 2.1 API Gateway Pattern

**¿En qué consiste?**
Un único punto de entrada para todas las peticiones del cliente. El gateway enruta las peticiones a los microservicios correspondientes, manejando autenticación, rate limiting y otras funcionalidades transversales.

**¿Dónde se encuentra en el código?**

| Ubicación | Descripción |
|-----------|-------------|
| `services/api-gateway/src/index.js` | Archivo principal del gateway |
| `services/api-gateway/src/middleware/proxy.js` | Middleware que redirige peticiones |
| `services/api-gateway/src/middleware/auth.js` | Validación de tokens JWT |

**Funciones relevantes:**
- `proxyMiddleware()` en `proxy.js` (líneas 14-62): Reenvía peticiones a microservicios
- `authMiddleware()` en `auth.js` (líneas 21-57): Valida tokens de Supabase

**¿Por qué se utiliza?**
- Simplifica el frontend: solo necesita conocer una URL (`localhost:8000`)
- Centraliza la autenticación y seguridad
- Permite agregar rate limiting y circuit breaker de forma centralizada
- Facilita el versionado de APIs

---

### 2.2 Database per Service

**¿En qué consiste?**
Cada microservicio tiene su propia base de datos (o esquema). Ningún servicio accede directamente a los datos de otro servicio.

**¿Dónde se encuentra en el código?**

| Microservicio | Esquema en PostgreSQL | Archivo de configuración |
|---------------|----------------------|--------------------------|
| Profile Service | `profile.profiles` | `supabase/schema.sql` línea 8-32 |
| Product Service | `product.products` | `supabase/schema.sql` línea 34-65 |
| Order Service | `order.orders` | `supabase/schema.sql` línea 67-100 |
| Message Service | `message.messages` | `supabase/schema.sql` línea 102-130 |
| Auditoría | `audit.audit_logs` | `supabase/schema.sql` línea 132-160 |

**Ejemplo de acceso a esquema específico:**
```javascript
// En services/profile-service/src/controllers/profileController.js
const { data, error } = await supabase
  .schema('profile')  // ← Especifica el esquema
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

**¿Por qué se utiliza?**
- Independencia de despliegue: cada servicio puede escalar independientemente
- Aislamiento de datos: un fallo en un esquema no afecta a otros
- Facilita migraciones y cambios de estructura

---

### 2.3 Circuit Breaker Pattern

**¿En qué consiste?**
Protege el sistema contra fallos en cascada. Si un servicio falla repetidamente, el circuit breaker "abre el circuito" y rechaza peticiones inmediatamente, evitando sobrecargar el servicio fallido.

**Estados del Circuit Breaker:**
1. **CLOSED** (Normal): Las peticiones pasan normalmente
2. **OPEN** (Fallo): Se rechazan peticiones inmediatamente
3. **HALF_OPEN** (Probando): Se permite una petición de prueba

**¿Dónde se encuentra en el código?**

| Archivo | Descripción |
|---------|-------------|
| `services/api-gateway/src/middleware/circuitBreaker.js` | Implementación completa |

**Funciones relevantes:**
- `class CircuitBreaker` (líneas 31-120): Clase que maneja los estados
- `canRequest()` (líneas 55-80): Verifica si la petición puede pasar
- `recordSuccess()` (líneas 82-95): Registra peticiones exitosas
- `recordFailure()` (líneas 97-115): Registra fallos

**Configuración (variables de entorno):**
```yaml
CIRCUIT_BREAKER_TIMEOUT: 10000        # Tiempo de espera (10s)
CIRCUIT_BREAKER_ERROR_THRESHOLD: 5    # Número de fallos antes de abrir
CIRCUIT_BREAKER_RESET_TIMEOUT: 30000  # Tiempo antes de probar de nuevo
```

**¿Por qué se utiliza?**
- Previene fallos en cascada
- Mejora la resiliencia del sistema
- Permite recuperación automática de servicios

---

### 2.4 Saga Pattern (Simplificado)

**¿En qué consiste?**
Maneja transacciones distribuidas mediante una secuencia de pasos. Si un paso falla, se ejecutan acciones de compensación para revertir los cambios anteriores.

**¿Dónde se encuentra en el código?**

| Archivo | Función |
|---------|---------|
| `services/order-service/src/controllers/orderController.js` | `createOrder()` |

**Flujo de la Saga (líneas 135-230):**
```javascript
export const createOrder = async (req, res, next) => {
  // PASO 1: Verificar producto y disponibilidad
  const { data: product } = await supabase
    .schema('product')
    .from('products')
    .select('*')
    .eq('id', product_id);

  // PASO 2: Crear la orden
  const { data: order } = await supabase
    .schema('order')
    .from('orders')
    .insert({ ... });

  // PASO 3: Reducir stock
  const { error: stockError } = await supabase
    .schema('product')
    .from('products')
    .update({ quantity: product.quantity - quantity });

  // COMPENSACIÓN: Si falla el paso 3, cancelar la orden
  if (stockError) {
    await supabase
      .schema('order')
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order.id);
  }
};
```

**¿Por qué se utiliza?**
- Garantiza consistencia en operaciones que afectan múltiples servicios
- Permite revertir cambios parciales

---

### 2.5 Autenticación Centralizada

**¿En qué consiste?**
La autenticación se maneja en un único punto (Supabase Auth + API Gateway), y la información del usuario se propaga a los microservicios mediante headers.

**¿Dónde se encuentra en el código?**

| Ubicación | Descripción |
|-----------|-------------|
| `frontend/js/supabase-client.js` | Cliente de Supabase en frontend |
| `services/api-gateway/src/middleware/auth.js` | Validación en gateway |

**Flujo de propagación de usuario:**
```javascript
// En auth.js (líneas 48-53)
req.headers['x-user-id'] = user.id;
req.headers['x-user-email'] = user.email;
req.headers['x-user-role'] = user.user_metadata?.role || 'user';
```

Los microservicios leen estos headers:
```javascript
// En cualquier controller
const userId = req.headers['x-user-id'];
const userRole = req.headers['x-user-role'];
```

---

## 3. Explicación de Cada Microservicio

### 3.1 Profile Service (Puerto 8001)

**Responsabilidad:** Gestión de perfiles de usuario.

**Problema que resuelve:** Centraliza toda la lógica relacionada con los datos del usuario (nombre, rol, avatar), separándola de la autenticación (que maneja Supabase).

**Estructura de carpetas:**
```
services/profile-service/
├── Dockerfile
├── package.json
└── src/
    ├── index.js              # Punto de entrada, configuración Express
    ├── controllers/
    │   └── profileController.js  # Lógica de negocio
    ├── routes/
    │   └── profiles.js       # Definición de endpoints
    ├── middleware/
    │   └── errorHandler.js   # Manejo de errores
    └── utils/
        ├── logger.js         # Winston logger
        └── audit.js          # Emisión de eventos de auditoría
```

**Archivos importantes:**

| Archivo | Función |
|---------|---------|
| `src/index.js` | Inicializa Express, Swagger, rutas y middleware |
| `src/controllers/profileController.js` | Contiene `getMyProfile()`, `updateMyProfile()`, `getAllProfiles()` |
| `src/routes/profiles.js` | Define rutas GET/PUT con validación de express-validator |

**Endpoints expuestos:**

| Método | Ruta | Descripción | Autenticación |
|--------|------|-------------|---------------|
| GET | `/me` | Obtener mi perfil | ✅ Requerida |
| PUT | `/me` | Actualizar mi perfil | ✅ Requerida |
| GET | `/:id` | Obtener perfil por ID | ✅ Requerida |
| PUT | `/:id` | Actualizar perfil (admin) | ✅ Admin |
| GET | `/` | Listar todos los perfiles | ✅ Requerida |

---

### 3.2 Product Service (Puerto 8002)

**Responsabilidad:** Catálogo de productos agrícolas.

**Problema que resuelve:** Maneja todo el ciclo de vida de productos: creación, listado, búsqueda, filtros y eliminación.

**Estructura de carpetas:**
```
services/product-service/
├── Dockerfile
├── package.json
└── src/
    ├── index.js
    ├── controllers/
    │   └── productController.js
    ├── routes/
    │   └── products.js
    ├── middleware/
    │   └── errorHandler.js
    └── utils/
        ├── logger.js
        └── audit.js
```

**Funciones clave en `productController.js`:**

| Función | Líneas | Descripción |
|---------|--------|-------------|
| `getProducts()` | 28-98 | Lista productos con paginación, filtros y búsqueda |
| `getProductById()` | 100-135 | Obtiene un producto incluyendo info del vendedor |
| `getMyProducts()` | 170-190 | Lista productos del usuario autenticado |
| `createProduct()` | 192-235 | Crea producto validando categoría |
| `updateProduct()` | 237-300 | Actualiza producto verificando propiedad |

**Endpoints expuestos:**

| Método | Ruta | Descripción | Autenticación |
|--------|------|-------------|---------------|
| GET | `/` | Listar productos (con filtros) | ⚪ Opcional |
| GET | `/:id` | Detalle de producto | ⚪ Opcional |
| GET | `/category/:category` | Productos por categoría | ⚪ Opcional |
| GET | `/my/products` | Mis productos | ✅ Requerida |
| POST | `/` | Crear producto | ✅ Requerida |
| PUT | `/:id` | Actualizar producto | ✅ Propietario |
| DELETE | `/:id` | Eliminar producto | ✅ Propietario |

---

### 3.3 Order Service (Puerto 8003)

**Responsabilidad:** Gestión de órdenes de compra.

**Problema que resuelve:** Maneja el flujo completo de una compra: creación, confirmación, envío, recepción y cancelación.

**Estados de una orden:**
```
pending → confirmed → shipped → received
    ↓         ↓          ↓
cancelled  cancelled  cancelled
```

**Funciones clave en `orderController.js`:**

| Función | Descripción |
|---------|-------------|
| `getMyOrders()` | Órdenes donde soy comprador |
| `getMySales()` | Órdenes donde soy vendedor |
| `createOrder()` | Crea orden (implementa Saga Pattern) |
| `updateOrderStatus()` | Cambia estado (vendedor confirma/envía, comprador recibe) |
| `cancelOrder()` | Cancela orden y restaura stock |

**Lógica de permisos (líneas 246-340):**
```javascript
// El comprador puede marcar como "received"
if (status === 'received') {
  if (!isBuyer) return res.status(403).json({ error: 'Solo el comprador...' });
  if (order.status !== 'shipped') return res.status(400).json({ error: '...' });
}
// El vendedor puede confirmar y enviar
else {
  if (!isSeller) return res.status(403).json({ error: 'Solo el vendedor...' });
}
```

---

### 3.4 Message Service (Puerto 8004)

**Responsabilidad:** Foro global en tiempo real.

**Problema que resuelve:** Permite comunicación en tiempo real entre usuarios mediante WebSocket (Socket.IO).

**Características especiales:**
- Usa **Socket.IO** para comunicación bidireccional en tiempo real
- Mantiene lista de usuarios conectados
- Soporta indicador de "usuario escribiendo"

**Arquitectura WebSocket (en `index.js`):**

```javascript
// Conexión WebSocket (líneas 35-80)
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Autenticación de WebSocket (líneas 45-75)
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const { data: { user } } = await supabase.auth.getUser(token);
  socket.userId = user.id;
  next();
});

// Eventos disponibles (líneas 80-165)
socket.on('forum:message', async (data) => { ... });
socket.on('forum:typing', () => { ... });
socket.on('disconnect', () => { ... });
```

**Eventos WebSocket:**

| Evento (Cliente → Servidor) | Descripción |
|-----------------------------|-------------|
| `forum:message` | Enviar mensaje al foro |
| `forum:typing` | Notificar que estoy escribiendo |
| `forum:stopTyping` | Notificar que dejé de escribir |

| Evento (Servidor → Cliente) | Descripción |
|-----------------------------|-------------|
| `forum:newMessage` | Nuevo mensaje en el foro |
| `forum:userTyping` | Alguien está escribiendo |
| `users:online` | Lista de usuarios conectados |

---

## 4. API Gateway

### 4.1 ¿Qué es el API Gateway?

El API Gateway es el **punto de entrada único** para todas las peticiones del frontend. Actúa como un proxy inteligente que:

1. Recibe peticiones del frontend
2. Valida autenticación (JWT de Supabase)
3. Aplica rate limiting
4. Monitorea salud de servicios (Circuit Breaker)
5. Redirige a los microservicios correspondientes

### 4.2 Estructura del API Gateway

```
services/api-gateway/
├── Dockerfile
├── package.json
└── src/
    ├── index.js                    # Punto de entrada principal
    ├── middleware/
    │   ├── auth.js                 # Validación JWT
    │   ├── circuitBreaker.js       # Patrón Circuit Breaker
    │   ├── errorHandler.js         # Manejo centralizado de errores
    │   └── proxy.js                # Reenvío a microservicios
    └── utils/
        └── logger.js               # Winston para logging
```

### 4.3 Archivo `index.js` - Explicación detallada

**Sección 1: Imports y configuración (líneas 1-25)**
```javascript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';        // Seguridad HTTP
import morgan from 'morgan';        // Logging de peticiones
import rateLimit from 'express-rate-limit';
```

**Sección 2: Middleware globales (líneas 30-60)**
```javascript
// Seguridad básica - Headers HTTP seguros
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS - Permite peticiones desde el frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Rate Limiting - 100 peticiones por minuto
const limiter = rateLimit({
  windowMs: 60000,
  max: 100
});
app.use('/api', limiter);
```

**Sección 3: Configuración de servicios (líneas 95-105)**
```javascript
const services = {
  profiles: 'http://profile-service:8001',
  products: 'http://product-service:8002',
  orders:   'http://order-service:8003',
  messages: 'http://message-service:8004'
};
```

**Sección 4: Enrutamiento a microservicios (líneas 107-130)**
```javascript
// Profile Service - Requiere autenticación
app.use('/api/profiles',
  authMiddleware,                    // 1. Valida JWT
  circuitBreakerMiddleware('profile-service'), // 2. Verifica salud
  proxyMiddleware(services.profiles) // 3. Redirige
);

// Product Service - Autenticación opcional
app.use('/api/products',
  optionalAuthMiddleware,            // Permite acceso público
  circuitBreakerMiddleware('product-service'),
  proxyMiddleware(services.products)
);
```

### 4.4 Middleware de Autenticación (`auth.js`)

**`authMiddleware` (líneas 21-57):** Autenticación obligatoria

```javascript
export const authMiddleware = async (req, res, next) => {
  // 1. Extraer token del header Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  const token = authHeader.substring(7);
  
  // 2. Verificar con Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  
  // 3. Agregar info del usuario a headers para microservicios
  req.headers['x-user-id'] = user.id;
  req.headers['x-user-email'] = user.email;
  req.headers['x-user-role'] = user.user_metadata?.role || 'user';
  
  next();
};
```

**`optionalAuthMiddleware` (líneas 65-95):** Permite peticiones sin token

Funciona igual pero no rechaza si no hay token, simplemente continúa con `req.user = null`.

### 4.5 Middleware de Proxy (`proxy.js`)

**Función principal (líneas 14-62):**

```javascript
export const proxyMiddleware = (serviceUrl) => {
  return async (req, res) => {
    // Construir URL destino
    const targetUrl = `${serviceUrl}${req.path}`;
    
    // Preparar headers para reenviar
    const headers = {
      'Content-Type': req.headers['content-type'],
      'Authorization': req.headers.authorization,
      'X-User-Id': req.headers['x-user-id'],
      'X-User-Email': req.headers['x-user-email'],
      'X-Request-Id': generateRequestId()
    };
    
    // Realizar petición con Axios
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers,
      params: req.query,
      data: req.body,
      timeout: 10000
    });
    
    res.status(response.status).json(response.data);
  };
};
```

---

## 5. Seguridad del Sistema

### 5.1 Autenticación y Autorización

#### JWT (JSON Web Token)

**¿Dónde se genera?**
- En **Supabase Auth** cuando el usuario hace login
- El frontend recibe el token y lo almacena en la sesión del navegador

**¿Dónde se valida?**
- En el **API Gateway** (`services/api-gateway/src/middleware/auth.js`)

**¿Qué información contiene el JWT de Supabase?**
```json
{
  "sub": "uuid-del-usuario",
  "email": "usuario@ejemplo.com",
  "user_metadata": {
    "username": "juan123",
    "role": "farmer"
  },
  "exp": 1704067200,
  "iat": 1703980800
}
```

**Flujo de validación (en `auth.js`, líneas 30-45):**
```javascript
// El gateway usa el Service Role Key para verificar tokens
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // ← Clave privilegiada
);

// Verificación del token
const { data: { user }, error } = await supabase.auth.getUser(token);
```

#### Roles de Usuario

Definidos en `supabase/schema.sql` (línea 12):
```sql
role text not null default 'user'
  check (role in ('user', 'farmer', 'admin'))
```

| Rol | Permisos |
|-----|----------|
| `user` | Comprar productos, ver foro, perfil propio |
| `farmer` | Todo lo anterior + vender productos |
| `admin` | Todo lo anterior + gestionar usuarios |

---

### 5.2 Row Level Security (RLS)

Supabase implementa RLS para proteger datos a nivel de base de datos.

**Ejemplo en `schema.sql` (líneas 19-32):**
```sql
-- Los usuarios solo pueden ver su propio perfil
create policy "Users can view own profile"
on profile.profiles
for select
using (auth.uid() = id);

-- Los usuarios solo pueden actualizar su propio perfil
create policy "Users can update own profile"
on profile.profiles
for update
using (auth.uid() = id);
```

---

### 5.3 Protección de APIs

#### Rate Limiting

**Ubicación:** `services/api-gateway/src/index.js` (líneas 50-60)

```javascript
const limiter = rateLimit({
  windowMs: 60000,    // Ventana de 1 minuto
  max: 100,           // Máximo 100 peticiones
  message: {
    error: 'Demasiadas peticiones. Por favor, intente más tarde.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

app.use('/api', limiter);  // Aplicar a todas las rutas /api
```

#### Headers de Seguridad (Helmet)

**Ubicación:** `services/api-gateway/src/index.js` (líneas 32-35)

```javascript
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
```

Helmet agrega automáticamente:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

---

### 5.4 Verificación de Correo Electrónico

**¿Dónde se implementa?**

La verificación de correo está integrada en **Supabase Auth** y se consume en el frontend.

**Archivos involucrados:**

| Archivo | Función |
|---------|---------|
| `frontend/pages/verify-email.html` | Página que muestra después del registro |
| `frontend/pages/register.html` | Formulario de registro |
| `frontend/js/auth.js` | Lógica de registro con `signUp()` |

**Flujo de verificación:**

1. **Usuario se registra** (`frontend/js/auth.js`, líneas 11-22):
```javascript
async signUp(email, password, metadata = {}) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: metadata }
  });
  return data;
}
```

2. **Supabase envía email** automáticamente con enlace de verificación

3. **Usuario hace clic** en el enlace → Supabase marca `email_confirmed = true`

4. **Frontend verifica estado** antes de permitir login:
```javascript
if (!user.email_confirmed_at) {
  showMessage('Por favor, verifica tu correo electrónico');
}
```

**¿Por qué se implementa?**
- Previene registros con correos falsos
- Permite recuperación de contraseña
- Mejora la calidad de la base de usuarios

---

## 6. Comunicación entre Frontend y Microservicios

### 6.1 Configuración del Cliente API

**Archivo:** `frontend/js/config.js`

```javascript
const CONFIG = {
  // URL del Supabase para autenticación
  SUPABASE_URL: 'https://xxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJ...',
  
  // URL del API Gateway
  API_URL: 'http://localhost:8000',
  
  // Categorías de productos
  CATEGORIES: [
    { id: 'frutas', name: 'Frutas', emoji: '🍎' },
    // ...
  ],
  
  // Estados de órdenes para la UI
  ORDER_STATUS: {
    pending: { label: 'Pendiente', color: '#ffc107' },
    confirmed: { label: 'Confirmado', color: '#17a2b8' },
    shipped: { label: 'Enviado', color: '#007bff' },
    received: { label: 'Recibido', color: '#28a745' },
    cancelled: { label: 'Cancelado', color: '#dc3545' }
  }
};
```

### 6.2 Cliente HTTP Base

**Archivo:** `frontend/js/api.js` (líneas 1-60)

```javascript
const API = {
  baseUrl: CONFIG.API_URL,  // http://localhost:8000

  async request(endpoint, options = {}) {
    // 1. Obtener token de Supabase
    const token = await getAccessToken();
    
    // 2. Configurar headers
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // 3. Agregar token si existe
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // 4. Realizar petición
    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    
    // 5. Manejar errores
    if (!response.ok) {
      const error = new Error(data?.error || 'Error en la petición');
      error.status = response.status;
      throw error;
    }

    return response.json();
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
  }
};
```

### 6.3 APIs Específicas

**Archivo:** `frontend/js/api.js` (líneas 65-150)

```javascript
// API de Productos
const ProductsAPI = {
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return API.get(`/api/products${query ? '?' + query : ''}`);
  },

  async create(product) {
    return API.post('/api/products', product);
  },

  async getMyProducts() {
    return API.get('/api/products/my/products');
  }
};

// API de Órdenes
const OrdersAPI = {
  async create(order) {
    return API.post('/api/orders', order);
  },

  async updateStatus(id, status) {
    return API.put(`/api/orders/${id}/status`, { status });
  }
};

// API de Perfiles
const ProfilesAPI = {
  async getMyProfile() {
    return API.get('/api/profiles/me');
  }
};
```

### 6.4 Ejemplo de Uso en Página

**Archivo:** `frontend/pages/products.html` (ejemplo conceptual)

```html
<script src="/js/config.js"></script>
<script src="/js/supabase-client.js"></script>
<script src="/js/api.js"></script>

<script>
async function loadProducts() {
  try {
    // Usa ProductsAPI que internamente llama al API Gateway
    const response = await ProductsAPI.getAll({
      category: 'frutas',
      page: 1,
      limit: 12
    });
    
    // Renderizar productos
    response.products.forEach(product => {
      renderProductCard(product);
    });
  } catch (error) {
    showError(error.message);
  }
}

// Cargar al inicio
document.addEventListener('DOMContentLoaded', loadProducts);
</script>
```

### 6.5 Manejo de Tokens

**Archivo:** `frontend/js/supabase-client.js`

```javascript
// Obtener token de acceso para peticiones
async function getAccessToken() {
  const session = await getSession();
  return session?.access_token || null;
}

// El token se obtiene de la sesión de Supabase
async function getSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}
```

---

## 7. Relación Frontend – API Gateway – Microservicios

### 7.1 Flujo Completo: Crear una Orden de Compra

**Paso 1: Acción del usuario en el frontend**

El usuario está en `product.html`, ve un producto y hace clic en "Comprar".

```javascript
// frontend/pages/product.html
async function buyProduct() {
  const quantity = document.getElementById('quantity').value;
  
  try {
    const order = await OrdersAPI.create({
      product_id: productId,
      quantity: parseInt(quantity)
    });
    
    showSuccess('¡Orden creada exitosamente!');
    window.location.href = '/pages/orders.html';
  } catch (error) {
    showError(error.message);
  }
}
```

**Paso 2: Petición al API Gateway**

```
POST http://localhost:8000/api/orders
Headers:
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

Body:
{
  "product_id": "uuid-del-producto",
  "quantity": 2
}
```

**Paso 3: Procesamiento en API Gateway**

```javascript
// services/api-gateway/src/index.js

// 1. authMiddleware valida el token
app.use('/api/orders',
  authMiddleware,  // ← Verifica JWT, extrae user.id
  circuitBreakerMiddleware('order-service'),
  proxyMiddleware(services.orders)
);

// 2. authMiddleware agrega headers
req.headers['x-user-id'] = 'uuid-del-usuario';
req.headers['x-user-email'] = 'usuario@ejemplo.com';

// 3. proxyMiddleware reenvía la petición
POST http://order-service:8003/
```

**Paso 4: Procesamiento en Order Service**

```javascript
// services/order-service/src/controllers/orderController.js

export const createOrder = async (req, res, next) => {
  const userId = req.headers['x-user-id'];  // ← Recibido del Gateway
  const { product_id, quantity } = req.body;

  // 1. Verificar producto
  const { data: product } = await supabase
    .schema('product')
    .from('products')
    .select('*')
    .eq('id', product_id);

  // 2. Crear orden
  const { data: order } = await supabase
    .schema('order')
    .from('orders')
    .insert({
      buyer_id: userId,
      product_id,
      quantity,
      total: product.price * quantity
    });

  // 3. Reducir stock
  await supabase
    .schema('product')
    .from('products')
    .update({ quantity: product.quantity - quantity })
    .eq('id', product_id);

  res.status(201).json(order);
};
```

**Paso 5: Respuesta de vuelta al frontend**

```
← Order Service responde al Gateway:
  201 Created
  { "id": "uuid-orden", "status": "pending", ... }

← Gateway reenvía al Frontend:
  201 Created
  { "id": "uuid-orden", "status": "pending", ... }

← Frontend muestra mensaje de éxito
```

### 7.2 Diagrama de Secuencia

```
Usuario      Frontend       API Gateway      Order Service     Supabase
   │             │               │                 │               │
   │ Click       │               │                 │               │
   │ "Comprar"   │               │                 │               │
   │───────────►│               │                 │               │
   │             │               │                 │               │
   │             │ POST /orders  │                 │               │
   │             │ + JWT token   │                 │               │
   │             │──────────────►│                 │               │
   │             │               │                 │               │
   │             │               │ Validar JWT     │               │
   │             │               │────────────────────────────────►│
   │             │               │◄────────────────────────────────│
   │             │               │                 │               │
   │             │               │ POST /          │               │
   │             │               │ + x-user-id     │               │
   │             │               │────────────────►│               │
   │             │               │                 │               │
   │             │               │                 │ Query         │
   │             │               │                 │ products      │
   │             │               │                 │──────────────►│
   │             │               │                 │◄──────────────│
   │             │               │                 │               │
   │             │               │                 │ Insert        │
   │             │               │                 │ order         │
   │             │               │                 │──────────────►│
   │             │               │                 │◄──────────────│
   │             │               │                 │               │
   │             │               │                 │ Update        │
   │             │               │                 │ stock         │
   │             │               │                 │──────────────►│
   │             │               │                 │◄──────────────│
   │             │               │                 │               │
   │             │               │ 201 Created     │               │
   │             │               │◄────────────────│               │
   │             │               │                 │               │
   │             │ 201 Created   │                 │               │
   │             │◄──────────────│                 │               │
   │             │               │                 │               │
   │ ¡Éxito!     │               │                 │               │
   │◄────────────│               │                 │               │
```

---

## 8. Docker y Ejecución del Proyecto

### 8.1 Estructura de Dockerfiles

#### Frontend (Nginx)

**Archivo:** `frontend/Dockerfile`

```dockerfile
FROM nginx:alpine

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos estáticos
COPY . /usr/share/nginx/html

# Eliminar archivos innecesarios del directorio HTML
RUN rm -f /usr/share/nginx/html/nginx.conf \
    && rm -f /usr/share/nginx/html/Dockerfile

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**¿Para qué sirve?**
- Sirve archivos estáticos (HTML, CSS, JS) de forma eficiente
- Implementa caché de assets
- Maneja fallback para SPA (Single Page Application)

#### Microservicios (Node.js)

**Archivo:** `services/api-gateway/Dockerfile` (igual para todos los servicios)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Instalar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Copiar código
COPY . .

EXPOSE 8000

# Usuario no-root (seguridad)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

CMD ["node", "src/index.js"]
```

**Buenas prácticas aplicadas:**
- `node:20-alpine` → Imagen mínima (~50MB vs ~900MB de node:20)
- `npm ci` → Instalación reproducible desde package-lock.json
- Usuario no-root → Seguridad (si el contenedor es comprometido)
- Healthcheck con curl → Docker puede reiniciar contenedores no saludables

### 8.2 Docker Compose

**Archivo:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  # ==== FRONTEND ====
  frontend:
    build: ./frontend
    container_name: raiz-frontend
    ports:
      - "${FRONTEND_PORT:-3000}:80"
    depends_on:
      - api-gateway
    networks:
      - raiz-network

  # ==== API GATEWAY ====
  api-gateway:
    build: ./services/api-gateway
    container_name: raiz-api-gateway
    ports:
      - "${API_GATEWAY_PORT:-8000}:8000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - PROFILE_SERVICE_URL=http://profile-service:8001
      - PRODUCT_SERVICE_URL=http://product-service:8002
      - ORDER_SERVICE_URL=http://order-service:8003
      - MESSAGE_SERVICE_URL=http://message-service:8004
    depends_on:
      - profile-service
      - product-service
      - order-service
      - message-service
    networks:
      - raiz-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ==== PROFILE SERVICE ====
  profile-service:
    build: ./services/profile-service
    container_name: raiz-profile-service
    ports:
      - "${PROFILE_SERVICE_PORT:-8001}:8001"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    networks:
      - raiz-network

  # ... (product-service, order-service, message-service similares)

networks:
  raiz-network:
    driver: bridge
    name: raiz-marketplace-network

volumes:
  logs:
    driver: local
```

### 8.3 Explicación de Configuraciones

#### Servicios

| Servicio | Puerto Externo | Puerto Interno | Descripción |
|----------|---------------|----------------|-------------|
| frontend | 3000 | 80 | Nginx sirviendo archivos estáticos |
| api-gateway | 8000 | 8000 | Punto de entrada para el frontend |
| profile-service | 8001 | 8001 | Gestión de perfiles |
| product-service | 8002 | 8002 | Catálogo de productos |
| order-service | 8003 | 8003 | Gestión de órdenes |
| message-service | 8004 | 8004 | Foro en tiempo real |

#### Redes

```yaml
networks:
  raiz-network:
    driver: bridge
```

- Todos los servicios están en la misma red (`raiz-network`)
- Pueden comunicarse entre sí usando nombres de contenedor
- Ejemplo: El API Gateway llama a `http://profile-service:8001`

#### Variables de Entorno

Definidas en `.env`:
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJ...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJ...
FRONTEND_PORT=3000
API_GATEWAY_PORT=8000
```

#### Healthchecks

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 30s      # Verificar cada 30 segundos
  timeout: 10s       # Esperar máximo 10 segundos
  retries: 3         # 3 fallos = unhealthy
  start_period: 10s  # Esperar 10s antes de empezar a verificar
```

### 8.4 Cómo Levantar el Proyecto

**Paso 1: Clonar y configurar**
```bash
git clone https://github.com/tu-usuario/raiz-marketplace.git
cd raiz-marketplace
cp .env.example .env
# Editar .env con tus credenciales de Supabase
```

**Paso 2: Construir imágenes**
```bash
docker-compose build
```

**Paso 3: Iniciar servicios**
```bash
docker-compose up -d
```

**Paso 4: Verificar estado**
```bash
docker-compose ps
docker-compose logs -f api-gateway
```

**Paso 5: Acceder**
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8000
- Swagger Docs: http://localhost:8001/docs (profile-service)

### 8.5 ¿Por qué Docker?

| Ventaja | Descripción |
|---------|-------------|
| **Consistencia** | El mismo entorno en desarrollo, testing y producción |
| **Aislamiento** | Cada servicio tiene sus propias dependencias |
| **Escalabilidad** | Fácil escalar servicios individuales |
| **Despliegue** | Un comando para levantar todo el sistema |
| **Reproducibilidad** | Cualquier desarrollador puede ejecutar el proyecto |

---

## 9. Consideraciones Finales

### 9.1 Buenas Prácticas Aplicadas

#### Código

| Práctica | Ejemplo |
|----------|---------|
| **ES Modules** | `import/export` en todos los servicios |
| **Async/Await** | Manejo de promesas legible |
| **Destructuring** | `const { id } = req.params` |
| **Validación** | `express-validator` en todas las rutas |
| **Error Handling** | Middleware centralizado de errores |

#### Arquitectura

| Práctica | Implementación |
|----------|----------------|
| **Separation of Concerns** | Controllers, Routes, Utils separados |
| **Single Responsibility** | Un servicio = Una responsabilidad |
| **DRY** | Middleware reutilizables |
| **Fail Fast** | Validación temprana de inputs |

#### Seguridad

| Práctica | Implementación |
|----------|----------------|
| **Autenticación centralizada** | JWT validado en API Gateway |
| **Rate Limiting** | 100 req/min por IP |
| **Helmet.js** | Headers de seguridad HTTP |
| **RLS** | Políticas a nivel de base de datos |
| **Usuario no-root** | En contenedores Docker |

#### DevOps

| Práctica | Implementación |
|----------|----------------|
| **Health Checks** | Endpoint `/health` en cada servicio |
| **Logging** | Winston con formato estructurado |
| **Auditoría** | Tabla `audit.audit_logs` |
| **Containerización** | Docker para todos los servicios |

### 9.2 Ventajas de Esta Arquitectura

1. **Escalabilidad Independiente**
   - Si el servicio de productos tiene mucha carga, se escala solo ese servicio
   
2. **Despliegue Independiente**
   - Actualizar el servicio de órdenes sin afectar los demás

3. **Resiliencia**
   - Si falla el servicio de mensajes, el resto del marketplace sigue funcionando

4. **Tecnología Heterogénea**
   - Cada servicio podría usar diferentes tecnologías (aunque aquí todos usan Node.js)

5. **Equipos Autónomos**
   - Diferentes equipos pueden trabajar en diferentes servicios

### 9.3 Posibles Mejoras Futuras

#### Corto Plazo
- **Caché con Redis**: Cachear productos populares, sesiones
- **Compresión**: Agregar gzip en respuestas del API Gateway
- **Logs Centralizados**: ELK Stack (Elasticsearch, Logstash, Kibana)

#### Mediano Plazo
- **Message Queue**: RabbitMQ o Kafka para eventos entre servicios
- **Service Mesh**: Istio para observabilidad y traffic management
- **API Versioning**: `/api/v1/products`, `/api/v2/products`

#### Largo Plazo
- **Kubernetes**: Orquestación para producción a escala
- **Distributed Tracing**: Jaeger o Zipkin para debug de peticiones
- **GraphQL Gateway**: Unificar consultas de múltiples servicios

---

## 📝 Resumen Ejecutivo

**Raíz Marketplace** es una aplicación de comercio electrónico para productos agrícolas, construida con arquitectura de microservicios.

| Componente | Tecnología |
|------------|------------|
| Frontend | HTML/CSS/JS + Nginx |
| API Gateway | Express.js |
| Microservicios | Express.js (x4) |
| Base de Datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth (JWT) |
| Tiempo Real | Socket.IO |
| Contenedores | Docker + Docker Compose |

**Patrones clave:**
- API Gateway Pattern
- Database per Service
- Circuit Breaker
- Saga Pattern (simplificado)

**Endpoints principales:**
- `GET /api/products` → Lista productos
- `POST /api/orders` → Crear orden
- `GET /api/profiles/me` → Mi perfil
- `WebSocket /socket.io` → Foro en tiempo real

---

*Documento generado para el proyecto Raíz Marketplace - Enero 2026*
