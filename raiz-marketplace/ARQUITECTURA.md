# 🌱 Raíz Marketplace - Documentación de Arquitectura

## Tabla de Contenidos

1. [Visión General](#-visión-general)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Stack Tecnológico](#-stack-tecnológico)
4. [Docker y Contenedores](#-docker-y-contenedores)
5. [Frontend](#-frontend)
6. [API Gateway](#-api-gateway)
7. [Microservicios](#-microservicios)
8. [Base de Datos](#-base-de-datos)
9. [Autenticación](#-autenticación)
10. [Comunicación en Tiempo Real](#-comunicación-en-tiempo-real)
11. [Patrones de Diseño Implementados](#-patrones-de-diseño-implementados)
12. [Flujo de Datos](#-flujo-de-datos)
13. [Seguridad](#-seguridad)
14. [Despliegue](#-despliegue)

---

## 📋 Visión General

**Raíz Marketplace** es una plataforma de comercio electrónico que conecta agricultores locales con consumidores. La aplicación está construida siguiendo una **arquitectura de microservicios** containerizada con Docker.

### Características Principales

- 🛒 Catálogo de productos agrícolas
- 👤 Perfiles de usuarios (compradores y agricultores)
- 📦 Sistema de órdenes
- 💬 Mensajería directa entre usuarios
- 🗨️ Foro en tiempo real con WebSocket
- 🔐 Autenticación con Supabase

---

## 🏗 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE                                     │
│                    (Navegador Web - Puerto 3000)                        │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         NGINX (Frontend)                                 │
│                    Servidor de archivos estáticos                        │
│                         HTML/CSS/JavaScript                              │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
┌───────────────────────────┐     ┌─────────────────────────────────────┐
│     SUPABASE (BaaS)       │     │         API GATEWAY (:8000)         │
│  - Autenticación          │     │  ┌─────────────────────────────┐    │
│  - JWT Tokens             │     │  │ • Rate Limiting             │    │
│  - Base de datos          │     │  │ • Circuit Breaker           │    │
└───────────────────────────┘     │  │ • JWT Validation            │    │
                                  │  │ • Request Routing           │    │
                                  │  │ • CORS                      │    │
                                  │  └─────────────────────────────┘    │
                                  └──────────────┬──────────────────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────┐
                    │                            │                        │
                    ▼                            ▼                        ▼
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│  PROFILE SERVICE        │  │  PRODUCT SERVICE        │  │  ORDER SERVICE          │
│     (:8001)             │  │     (:8002)             │  │     (:8003)             │
│  ┌───────────────────┐  │  │  ┌───────────────────┐  │  │  ┌───────────────────┐  │
│  │ • CRUD Perfiles   │  │  │  │ • CRUD Productos  │  │  │  │ • CRUD Órdenes    │  │
│  │ • Roles usuario   │  │  │  │ • Categorías      │  │  │  │ • Estados orden   │  │
│  │ • Swagger Docs    │  │  │  │ • Búsqueda        │  │  │  │ • Historial       │  │
│  └───────────────────┘  │  │  └───────────────────┘  │  │  └───────────────────┘  │
└─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
                    │                            │                        │
                    │                            │                        │
                    ▼                            ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE PostgreSQL                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │   profile    │ │   product    │ │    order     │ │   message    │   │
│  │   schema     │ │   schema     │ │    schema    │ │   schema     │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     MESSAGE SERVICE (:8004)                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     SOCKET.IO SERVER                             │    │
│  │  • WebSocket bidireccional                                       │    │
│  │  • Foro global en tiempo real                                    │    │
│  │  • Mensajería directa                                            │    │
│  │  • Lista de usuarios conectados                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tipo de Arquitectura

Esta aplicación implementa una **Arquitectura de Microservicios** con las siguientes características:

| Característica | Implementación |
|---------------|----------------|
| **Desacoplamiento** | Cada servicio es independiente y se comunica vía HTTP |
| **Dominio único** | Cada microservicio maneja un dominio específico |
| **Escalabilidad** | Cada servicio puede escalarse independientemente |
| **Tecnología uniforme** | Node.js + Express en todos los servicios |
| **Base de datos compartida** | Supabase con esquemas separados por dominio |

---

## 🛠 Stack Tecnológico

### Frontend
| Tecnología | Uso |
|-----------|-----|
| **HTML5** | Estructura de páginas |
| **CSS3** | Estilos y diseño responsivo |
| **JavaScript (ES6+)** | Lógica del cliente (Vanilla JS) |
| **Nginx Alpine** | Servidor web para archivos estáticos |

### Backend
| Tecnología | Uso |
|-----------|-----|
| **Node.js 20** | Runtime de JavaScript |
| **Express.js** | Framework HTTP |
| **Socket.IO** | WebSockets para tiempo real |
| **Axios** | Cliente HTTP para proxy |

### Base de Datos
| Tecnología | Uso |
|-----------|-----|
| **Supabase** | Backend as a Service |
| **PostgreSQL** | Base de datos relacional |
| **Row Level Security** | Seguridad a nivel de fila |

### DevOps
| Tecnología | Uso |
|-----------|-----|
| **Docker** | Contenedorización |
| **Docker Compose** | Orquestación local |
| **Nginx** | Proxy inverso / servidor estático |

---

## 🐳 Docker y Contenedores

### Estructura de Contenedores

```
docker-compose.yml
├── frontend          (nginx:alpine)     → Puerto 3000
├── api-gateway       (node:20-alpine)   → Puerto 8000
├── profile-service   (node:20-alpine)   → Puerto 8001
├── product-service   (node:20-alpine)   → Puerto 8002
├── order-service     (node:20-alpine)   → Puerto 8003
└── message-service   (node:20-alpine)   → Puerto 8004
```

### docker-compose.yml Explicado

```yaml
version: '3.8'

services:
  # ═══════════════════════════════════════════════════════════════
  # FRONTEND - Nginx sirviendo archivos estáticos
  # ═══════════════════════════════════════════════════════════════
  frontend:
    build:
      context: ./frontend           # Directorio con Dockerfile
      dockerfile: Dockerfile
    container_name: raiz-frontend
    ports:
      - "3000:80"                   # Mapeo: host:contenedor
    depends_on:
      - api-gateway                 # Espera a que gateway esté listo
    networks:
      - raiz-network                # Red interna Docker
    restart: unless-stopped         # Reinicio automático

  # ═══════════════════════════════════════════════════════════════
  # API GATEWAY - Punto de entrada único
  # ═══════════════════════════════════════════════════════════════
  api-gateway:
    build: ./services/api-gateway
    container_name: raiz-api-gateway
    ports:
      - "8000:8000"
    environment:
      # URLs de microservicios (nombres de contenedor)
      - PROFILE_SERVICE_URL=http://profile-service:8001
      - PRODUCT_SERVICE_URL=http://product-service:8002
      - ORDER_SERVICE_URL=http://order-service:8003
      - MESSAGE_SERVICE_URL=http://message-service:8004
    depends_on:
      - profile-service
      - product-service
      - order-service
      - message-service
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

# ═══════════════════════════════════════════════════════════════
# RED INTERNA - Comunicación entre contenedores
# ═══════════════════════════════════════════════════════════════
networks:
  raiz-network:
    driver: bridge
    name: raiz-marketplace-network
```

### Dockerfile del Frontend (Nginx)

```dockerfile
FROM nginx:alpine

# Configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos estáticos (HTML, CSS, JS)
COPY . /usr/share/nginx/html

# Limpiar archivos de configuración del directorio público
RUN rm -f /usr/share/nginx/html/nginx.conf \
    && rm -f /usr/share/nginx/html/Dockerfile

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Dockerfile de Microservicios (Node.js)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Copiar dependencias primero (capa de caché)
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fuente
COPY . .

EXPOSE 8000

# Usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

CMD ["node", "src/index.js"]
```

### Red Docker

Todos los contenedores están en la misma red `raiz-network`, lo que permite:

```
┌─────────────────────────────────────────────────────────────────┐
│                    raiz-marketplace-network                      │
│                         (bridge)                                 │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  frontend    │  │  api-gateway │  │  profile-svc │          │
│  │  (nginx)     │  │  (node)      │  │  (node)      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                 │                    │
│         │    ─────────────┴─────────────    │                    │
│         │    │ DNS interno de Docker │      │                    │
│         │    └───────────────────────┘      │                    │
│                                                                  │
│  Comunicación por nombre de servicio:                           │
│  http://profile-service:8001                                    │
│  http://product-service:8002                                    │
│  http://order-service:8003                                      │
│  http://message-service:8004                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Comandos Docker Esenciales

```bash
# Construir todos los contenedores
docker-compose build

# Iniciar todos los servicios
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Ver estado de contenedores
docker-compose ps

# Reiniciar un servicio específico
docker-compose restart frontend

# Reconstruir y reiniciar un servicio
docker-compose build frontend && docker-compose up -d frontend

# Detener todo
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v
```

---

## 🖥 Frontend

### Estructura de Archivos

```
frontend/
├── Dockerfile              # Configuración de contenedor
├── nginx.conf              # Configuración del servidor web
├── index.html              # Página principal
├── css/
│   └── styles.css          # Estilos globales (Design System)
├── js/
│   ├── config.js           # Variables de configuración
│   ├── supabase-client.js  # Cliente de Supabase
│   ├── auth.js             # Lógica de autenticación
│   ├── api.js              # Cliente HTTP para API Gateway
│   └── app.js              # Utilidades y helpers
└── pages/
    ├── login.html          # Inicio de sesión
    ├── register.html       # Registro
    ├── products.html       # Catálogo de productos
    ├── product.html        # Detalle de producto
    ├── my-products.html    # Mis productos (vendedor)
    ├── add-product.html    # Agregar producto
    ├── edit-product.html   # Editar producto
    ├── profile.html        # Perfil de usuario
    ├── orders.html         # Mis órdenes
    ├── messages.html       # Mensajes directos
    ├── forum.html          # Foro en tiempo real
    └── verify-email.html   # Verificación de correo
```

### Configuración de Nginx

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Compresión gzip para mejor rendimiento
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Caché de archivos estáticos (7 días)
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback - redirige todas las rutas a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check para Docker
    location /health {
        access_log off;
        return 200 'healthy';
    }

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### Cliente API (api.js)

El frontend se comunica con el backend a través de un cliente HTTP centralizado:

```javascript
const API = {
  baseUrl: CONFIG.API_URL,  // http://localhost:8000

  /**
   * Petición HTTP genérica con autenticación
   */
  async request(endpoint, options = {}) {
    // Obtener token JWT de Supabase
    const token = await getAccessToken();
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Incluir token si el usuario está autenticado
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    
    if (!response.ok) {
      throw new Error(data?.error || 'Error en la petición');
    }

    return response.json();
  },

  // Métodos de conveniencia
  get: (endpoint) => API.request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => API.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => API.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => API.request(endpoint, { method: 'DELETE' })
};
```

---

## 🚪 API Gateway

El API Gateway es el **punto de entrada único** para todos los microservicios. Implementa varios patrones importantes.

### Responsabilidades

```
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY                             │
├─────────────────────────────────────────────────────────────┤
│  1. ENRUTAMIENTO                                             │
│     /api/profiles  →  http://profile-service:8001           │
│     /api/products  →  http://product-service:8002           │
│     /api/orders    →  http://order-service:8003             │
│     /api/messages  →  http://message-service:8004           │
├─────────────────────────────────────────────────────────────┤
│  2. AUTENTICACIÓN                                            │
│     • Valida JWT de Supabase                                │
│     • Extrae información del usuario                        │
│     • Propaga headers X-User-Id, X-User-Email               │
├─────────────────────────────────────────────────────────────┤
│  3. RATE LIMITING                                            │
│     • 100 peticiones por minuto por IP                      │
│     • Protección contra abuso                               │
├─────────────────────────────────────────────────────────────┤
│  4. CIRCUIT BREAKER                                          │
│     • Detecta servicios caídos                              │
│     • Evita cascada de errores                              │
│     • Auto-recuperación                                      │
├─────────────────────────────────────────────────────────────┤
│  5. LOGGING Y MONITOREO                                      │
│     • Log de todas las peticiones                           │
│     • Métricas de rendimiento                               │
└─────────────────────────────────────────────────────────────┘
```

### Estructura del Código

```
services/api-gateway/
├── Dockerfile
├── package.json
└── src/
    ├── index.js                 # Punto de entrada
    ├── middleware/
    │   ├── auth.js              # Validación JWT
    │   ├── circuitBreaker.js    # Patrón Circuit Breaker
    │   ├── proxy.js             # Reenvío a microservicios
    │   └── errorHandler.js      # Manejo global de errores
    └── utils/
        └── logger.js            # Logging centralizado
```

### Configuración de Rutas

```javascript
// Servicios destino
const services = {
  profiles: 'http://profile-service:8001',
  products: 'http://product-service:8002',
  orders: 'http://order-service:8003',
  messages: 'http://message-service:8004'
};

// Profile Service - Requiere autenticación
app.use('/api/profiles',
  authMiddleware,                            // Validar JWT
  circuitBreakerMiddleware('profile-service'), // Protección
  proxyMiddleware(services.profiles)          // Proxy
);

// Product Service - Autenticación opcional
app.use('/api/products',
  optionalAuthMiddleware,  // Productos públicos
  circuitBreakerMiddleware('product-service'),
  proxyMiddleware(services.products)
);

// Order Service - Requiere autenticación
app.use('/api/orders',
  authMiddleware,
  circuitBreakerMiddleware('order-service'),
  proxyMiddleware(services.orders)
);

// Message Service - Requiere autenticación
app.use('/api/messages',
  authMiddleware,
  circuitBreakerMiddleware('message-service'),
  proxyMiddleware(services.messages)
);
```

### Middleware de Autenticación

```javascript
export const authMiddleware = async (req, res, next) => {
  // 1. Extraer token del header
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token de autenticación requerido',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  const token = authHeader.substring(7);
  
  // 2. Validar token con Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({
      error: 'Token inválido o expirado',
      code: 'AUTH_TOKEN_INVALID'
    });
  }

  // 3. Agregar info del usuario a la request
  req.user = {
    id: user.id,
    email: user.email,
    role: user.user_metadata?.role || 'user'
  };
  
  // 4. Propagar a microservicios via headers
  req.headers['x-user-id'] = user.id;
  req.headers['x-user-email'] = user.email;
  req.headers['x-user-role'] = user.user_metadata?.role;

  next();
};
```

### Middleware de Proxy

```javascript
export const proxyMiddleware = (serviceUrl) => {
  return async (req, res) => {
    const targetUrl = `${serviceUrl}${req.path}`;
    
    // Preparar headers para reenviar
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': req.headers.authorization,
      'X-User-Id': req.headers['x-user-id'],
      'X-User-Email': req.headers['x-user-email'],
      'X-Request-Id': generateRequestId()
    };

    // Realizar petición al microservicio
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers,
      params: req.query,
      data: req.body,
      timeout: 10000
    });

    // Reenviar respuesta al cliente
    res.status(response.status).json(response.data);
  };
};
```

---

## 🔧 Microservicios

Cada microservicio sigue la misma estructura y es responsable de un dominio específico.

### Estructura Común

```
services/<nombre>-service/
├── Dockerfile
├── package.json
└── src/
    ├── index.js              # Punto de entrada + Swagger
    ├── controllers/
    │   └── <nombre>Controller.js  # Lógica de negocio
    ├── routes/
    │   └── <nombre>.js       # Definición de endpoints
    ├── middleware/
    │   └── errorHandler.js   # Manejo de errores
    └── utils/
        ├── logger.js         # Logging
        └── audit.js          # Registro de auditoría
```

### Profile Service (Puerto 8001)

**Dominio:** Gestión de perfiles de usuario

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/profiles/me` | GET | Obtener mi perfil |
| `/profiles/me` | PUT | Actualizar mi perfil |
| `/profiles/:id` | GET | Obtener perfil por ID |
| `/health` | GET | Health check |
| `/api-docs` | GET | Documentación Swagger |

### Product Service (Puerto 8002)

**Dominio:** Catálogo de productos

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/products` | GET | No | Listar productos activos |
| `/products/:id` | GET | No | Detalle de producto |
| `/products/category/:cat` | GET | No | Productos por categoría |
| `/products/my/products` | GET | Sí | Mis productos |
| `/products` | POST | Sí | Crear producto |
| `/products/:id` | PUT | Sí | Actualizar producto |
| `/products/:id` | DELETE | Sí | Eliminar producto |

### Order Service (Puerto 8003)

**Dominio:** Gestión de órdenes

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/orders` | GET | Mis órdenes (comprador) |
| `/orders/sales` | GET | Mis ventas (vendedor) |
| `/orders` | POST | Crear orden |
| `/orders/:id` | PUT | Actualizar estado |
| `/orders/:id` | DELETE | Cancelar orden |

### Message Service (Puerto 8004)

**Dominio:** Mensajería y foro en tiempo real

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/messages/conversations` | GET | Mis conversaciones |
| `/messages/:userId` | GET | Mensajes con usuario |
| `/messages` | POST | Enviar mensaje |
| `/messages/forum` | GET | Mensajes del foro |
| **WebSocket** | - | Foro en tiempo real |

---

## 🗄 Base de Datos

### Supabase + PostgreSQL

La aplicación utiliza **Supabase** como Backend as a Service, que proporciona:

- Base de datos PostgreSQL gestionada
- Autenticación integrada
- Row Level Security (RLS)
- API REST automática
- Realtime subscriptions

### Esquemas de Base de Datos

La base de datos está organizada en **esquemas separados** por dominio:

```sql
CREATE SCHEMA profile;   -- Perfiles de usuario
CREATE SCHEMA product;   -- Catálogo de productos
CREATE SCHEMA "order";   -- Órdenes de compra
CREATE SCHEMA message;   -- Mensajería
CREATE SCHEMA audit;     -- Logs de auditoría
```

### Diagrama Entidad-Relación

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            auth.users                                    │
│                    (Tabla de Supabase Auth)                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ id (uuid) PK │ email │ encrypted_password │ confirmed_at │ ... │   │
│  └────────┬────────────────────────────────────────────────────────┘   │
└────────────│────────────────────────────────────────────────────────────┘
             │
             │ 1:1 (on delete cascade)
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        profile.profiles                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ id (uuid) PK/FK │ username │ full_name │ role │ avatar_url │ ... │  │
│  └────────┬──────────────────────────────────────────────────────────┘  │
└────────────│────────────────────────────────────────────────────────────┘
             │
             │ 1:N
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        product.products                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ id │ owner_id (FK) │ title │ description │ price │ quantity │ ... │  │
│  └────────┬──────────────────────────────────────────────────────────┘  │
└────────────│────────────────────────────────────────────────────────────┘
             │
             │ 1:N
             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          "order".orders                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ id │ buyer_id │ seller_id │ product_id │ quantity │ status │ ... │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        message.messages                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ id │ from_user_id │ to_user_id │ message_text │ is_read │ sent_at │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Row Level Security (RLS)

Supabase implementa seguridad a nivel de fila:

```sql
-- Los usuarios solo pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
ON profile.profiles FOR SELECT
USING (auth.uid() = id);

-- Cualquiera puede ver productos activos
CREATE POLICY "Public can view active products"
ON product.products FOR SELECT
USING (is_active = true);

-- Solo el dueño puede editar sus productos
CREATE POLICY "Users can update own products"
ON product.products FOR UPDATE
USING (auth.uid() = owner_id);
```

### Trigger de Creación Automática de Perfil

```sql
-- Cuando un usuario se registra, se crea su perfil automáticamente
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profile.profiles (id, username, full_name, role)
  VALUES (
    new.id,
    split_part(new.email, '@', 1),  -- Username del email
    '',
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 🔐 Autenticación

### Flujo de Autenticación

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FLUJO DE AUTENTICACIÓN                            │
└──────────────────────────────────────────────────────────────────────────┘

1. REGISTRO
   ┌────────┐    email + password    ┌──────────┐
   │ Usuario │ ─────────────────────► │ Supabase │
   └────────┘                         │   Auth   │
       ▲                              └────┬─────┘
       │                                   │
       │    Email de verificación          │
       └───────────────────────────────────┘

2. LOGIN
   ┌────────┐    email + password    ┌──────────┐
   │ Usuario │ ─────────────────────► │ Supabase │
   └────────┘                         │   Auth   │
       ▲                              └────┬─────┘
       │                                   │
       │    JWT Token + Refresh Token      │
       └───────────────────────────────────┘

3. PETICIÓN AUTENTICADA
   ┌────────┐    Bearer Token    ┌─────────────┐    X-User-Id    ┌──────────────┐
   │ Cliente │ ────────────────► │ API Gateway │ ───────────────► │ Microservicio│
   └────────┘                    │  (valida)   │                  └──────────────┘
                                 └─────────────┘
```

### Roles de Usuario

| Rol | Permisos |
|-----|----------|
| `user` | Comprar productos, enviar mensajes |
| `farmer` | Todo de user + vender productos |
| `admin` | Acceso total + logs de auditoría |

---

## 📡 Comunicación en Tiempo Real

El **Message Service** implementa WebSockets con Socket.IO para el foro global.

### Arquitectura WebSocket

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         MESSAGE SERVICE                                   │
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                      SOCKET.IO SERVER                              │   │
│  │                                                                    │   │
│  │   Eventos Servidor → Cliente:                                     │   │
│  │   ─────────────────────────                                       │   │
│  │   • forum:newMessage     → Nuevo mensaje en el foro               │   │
│  │   • forum:messageHistory → Historial de mensajes                  │   │
│  │   • forum:userTyping     → Usuario escribiendo                    │   │
│  │   • users:online         → Lista de usuarios conectados          │   │
│  │                                                                    │   │
│  │   Eventos Cliente → Servidor:                                     │   │
│  │   ─────────────────────────                                       │   │
│  │   • forum:message        → Enviar mensaje al foro                 │   │
│  │   • forum:typing         → Notificar que está escribiendo        │   │
│  │   • forum:getHistory     → Solicitar historial                   │   │
│  │                                                                    │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────┐                                                 │
│  │  connectedUsers     │  ← Map de usuarios conectados                   │
│  │  (Map<userId, info>)│                                                 │
│  └─────────────────────┘                                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

### Implementación Socket.IO

```javascript
// Middleware de autenticación WebSocket
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  
  // Validar token con Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return next(new Error('Token inválido'));
  }

  socket.userId = user.id;
  socket.userProfile = await getProfile(user.id);
  
  next();
});

// Manejo de conexiones
io.on('connection', (socket) => {
  // Registrar usuario conectado
  connectedUsers.set(socket.userId, {
    socketId: socket.id,
    username: socket.userProfile.username
  });

  // Emitir lista actualizada
  io.emit('users:online', Array.from(connectedUsers.values()));

  // Unirse al foro global
  socket.join('forum:global');

  // Escuchar mensajes
  socket.on('forum:message', async ({ message_text }) => {
    // Guardar en base de datos
    const message = await saveForumMessage(socket.userId, message_text);
    
    // Emitir a todos los conectados
    io.to('forum:global').emit('forum:newMessage', message);
  });

  // Al desconectar
  socket.on('disconnect', () => {
    connectedUsers.delete(socket.userId);
    io.emit('users:online', Array.from(connectedUsers.values()));
  });
});
```

---

## 🎨 Patrones de Diseño Implementados

### 1. Circuit Breaker Pattern

Protege el sistema de fallos en cascada cuando un servicio falla.

```
         ESTADOS DEL CIRCUIT BREAKER
         ════════════════════════════

    ┌─────────────────────────────────────────────┐
    │                                             │
    │   ┌──────────┐                              │
    │   │  CLOSED  │ ◄──── Estado normal         │
    │   └────┬─────┘       Todas las peticiones  │
    │        │             pasan                  │
    │        │                                    │
    │        │ 5 errores consecutivos             │
    │        ▼                                    │
    │   ┌──────────┐                              │
    │   │   OPEN   │ ◄──── Servicio fallando     │
    │   └────┬─────┘       Rechaza inmediatamente│
    │        │                                    │
    │        │ Después de 30 segundos             │
    │        ▼                                    │
    │   ┌──────────┐                              │
    │   │HALF_OPEN │ ◄──── Probando recuperación │
    │   └────┬─────┘       Permite 3 peticiones  │
    │        │                                    │
    │        ├──────► Éxito → Vuelve a CLOSED    │
    │        └──────► Fallo → Vuelve a OPEN      │
    │                                             │
    └─────────────────────────────────────────────┘
```

### 2. API Gateway Pattern

Punto de entrada único que:
- Simplifica la interfaz del cliente
- Centraliza autenticación
- Implementa rate limiting
- Maneja enrutamiento

### 3. Proxy Pattern

El gateway actúa como proxy, reenviando peticiones a los microservicios.

### 4. Database per Service (parcial)

Aunque comparten Supabase, cada servicio tiene su propio **esquema**:
- `profile` → Profile Service
- `product` → Product Service
- `order` → Order Service
- `message` → Message Service

---

## 🔄 Flujo de Datos

### Ejemplo: Crear una Orden

```
1. Usuario hace clic en "Comprar"
   │
   ▼
2. Frontend (JavaScript)
   │ const order = await OrdersAPI.create({
   │   product_id: '...',
   │   quantity: 5
   │ });
   │
   ▼
3. API.js - Cliente HTTP
   │ POST /api/orders
   │ Headers: Authorization: Bearer <jwt>
   │
   ▼
4. API Gateway (puerto 8000)
   │ ├── authMiddleware() → Valida JWT con Supabase
   │ ├── circuitBreakerMiddleware() → Verifica estado del servicio
   │ └── proxyMiddleware() → Reenvía a order-service
   │
   ▼
5. Order Service (puerto 8003)
   │ POST /orders
   │ ├── Extrae X-User-Id del header
   │ ├── Valida producto existe
   │ ├── Verifica stock disponible
   │ ├── Crea orden en Supabase
   │ ├── Registra en audit_logs
   │ └── Retorna orden creada
   │
   ▼
6. Respuesta fluye de regreso
   │ Order Service → API Gateway → Frontend
   │
   ▼
7. Frontend actualiza la UI
   │ showNotification('¡Orden creada!');
   │ redirectTo('/pages/orders.html');
```

---

## 🛡 Seguridad

### Capas de Seguridad

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CAPAS DE SEGURIDAD                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. NGINX                                                                │
│     ├── X-Frame-Options: SAMEORIGIN (previene clickjacking)            │
│     ├── X-Content-Type-Options: nosniff                                 │
│     └── X-XSS-Protection: 1; mode=block                                 │
│                                                                          │
│  2. API Gateway                                                          │
│     ├── Helmet.js (headers de seguridad)                                │
│     ├── CORS configurado                                                 │
│     ├── Rate Limiting (100 req/min)                                     │
│     └── Validación JWT                                                   │
│                                                                          │
│  3. Supabase                                                             │
│     ├── Row Level Security (RLS)                                        │
│     ├── Políticas por tabla                                             │
│     └── Encriptación de datos                                           │
│                                                                          │
│  4. Docker                                                               │
│     ├── Usuarios no-root                                                │
│     ├── Red aislada                                                     │
│     └── Imágenes Alpine (mínima superficie de ataque)                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Variables de Entorno Sensibles

```env
# NUNCA commitear al repositorio
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # ¡MUY SENSIBLE!
```

---

## 🚀 Despliegue

### Desarrollo Local

```bash
# 1. Clonar repositorio
git clone <repo>
cd raiz-marketplace

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales de Supabase

# 3. Construir e iniciar
docker-compose build
docker-compose up -d

# 4. Verificar
docker-compose ps
# Todos los servicios deben estar "Up (healthy)"

# 5. Acceder
# Frontend: http://localhost:3000
# API: http://localhost:8000
# Swagger: http://localhost:8002/api-docs
```

### Health Checks

Cada servicio expone un endpoint `/health`:

```bash
# Verificar salud de servicios
curl http://localhost:8000/health  # API Gateway
curl http://localhost:8001/health  # Profile Service
curl http://localhost:8002/health  # Product Service
curl http://localhost:8003/health  # Order Service
curl http://localhost:8004/health  # Message Service
```

### Estado de Circuit Breakers

```bash
# Ver estado de todos los servicios
curl http://localhost:8000/api/status
```

Respuesta:
```json
{
  "gateway": "healthy",
  "services": {
    "profile-service": { "state": "CLOSED", "failures": 0 },
    "product-service": { "state": "CLOSED", "failures": 0 },
    "order-service": { "state": "CLOSED", "failures": 0 },
    "message-service": { "state": "CLOSED", "failures": 0 }
  },
  "timestamp": "2026-01-25T22:00:00.000Z"
}
```

---

## 📚 Referencias

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Express.js](https://expressjs.com/)
- [Socket.IO](https://socket.io/docs/)
- [Supabase](https://supabase.com/docs)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [API Gateway Pattern](https://microservices.io/patterns/apigateway.html)

---

**Autor:** Raíz Marketplace Team  
**Versión:** 1.0.0  
**Última actualización:** Enero 2026
