# 🌱 Raíz Marketplace - Arquitectura de Microservicios

## Descripción del Proyecto

**Raíz** es un marketplace inteligente que conecta agricultores locales con consumidores y negocios urbanos, eliminando intermediarios y garantizando productos frescos y trazables desde el origen.

## Arquitectura

Este proyecto implementa una arquitectura moderna basada en **microservicios** con las siguientes características:

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│                   (HTML/CSS/JavaScript)                          │
│                      Puerto: 3000                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                                 │
│              (Express + Circuit Breaker)                         │
│                      Puerto: 8000                                │
│  • Enrutamiento de peticiones                                    │
│  • Validación de JWT                                             │
│  • Circuit Breaker Pattern                                       │
│  • Rate Limiting                                                 │
└─────────────────────────────────────────────────────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   PROFILE    │ │   PRODUCT    │ │    ORDER     │ │   MESSAGE    │
│   SERVICE    │ │   SERVICE    │ │   SERVICE    │ │   SERVICE    │
│  Puerto:8001 │ │  Puerto:8002 │ │  Puerto:8003 │ │  Puerto:8004 │
│              │ │              │ │              │ │              │
│ profile.*    │ │ product.*    │ │  order.*     │ │  message.*   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
          │              │              │              │
          └──────────────┴──────────────┴──────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                  │
│  • Supabase Auth (JWT, OAuth, OpenID Connect)                   │
│  • PostgreSQL con RLS (Row Level Security)                      │
│  • Realtime subscriptions                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Patrones de Diseño Implementados

### 1. API Gateway Pattern (Obligatorio)
El **API Gateway** actúa como punto de entrada único para todos los clientes:

- **Enrutamiento inteligente**: Redirige las peticiones al microservicio correspondiente
- **Autenticación centralizada**: Valida JWT de Supabase antes de reenviar
- **Rate Limiting**: Protege los servicios de sobrecarga
- **Logging centralizado**: Registra todas las peticiones para auditoría

**Ubicación**: `services/api-gateway/`

### 2. Circuit Breaker Pattern
Implementado para mejorar la **resiliencia** del sistema:

- **Estados**: CLOSED → OPEN → HALF_OPEN
- **Detección de fallos**: Después de N fallos consecutivos, abre el circuito
- **Recuperación automática**: Prueba periódicamente si el servicio está disponible
- **Fallback**: Retorna respuestas alternativas cuando el servicio no está disponible

**Beneficios**:
- Previene cascada de fallos entre microservicios
- Mejora la experiencia del usuario con respuestas degradadas
- Permite recuperación automática

**Ubicación**: `services/api-gateway/src/middleware/circuitBreaker.js`

### 3. Event-Driven Communication (Básico)
Comunicación basada en eventos para operaciones asíncronas:

- **Audit Logs**: Cada microservicio emite eventos de auditoría
- **Notificaciones**: Sistema de eventos para mensajes y órdenes
- **Desacoplamiento**: Los servicios no dependen directamente unos de otros

**Ubicación**: `shared/events/`

## Estructura del Proyecto

```
raiz-marketplace/
├── docker-compose.yml          # Orquestación de contenedores
├── .env.example                 # Variables de entorno de ejemplo
├── README.md                    # Documentación principal
│
├── frontend/                    # Aplicación web cliente
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── pages/
│
├── services/                    # Microservicios backend
│   ├── api-gateway/             # Gateway principal
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js
│   │       ├── routes/
│   │       └── middleware/
│   │
│   ├── profile-service/         # Gestión de perfiles
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │
│   ├── product-service/         # Catálogo de productos
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │
│   ├── order-service/           # Gestión de órdenes
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │
│   └── message-service/         # Mensajería entre usuarios
│       ├── Dockerfile
│       ├── package.json
│       └── src/
│
└── shared/                      # Código compartido
    ├── middleware/
    ├── utils/
    └── events/
```

## Configuración de Supabase

### Variables de Entorno Requeridas

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Esquemas de Base de Datos

El proyecto utiliza esquemas separados en PostgreSQL:

| Esquema | Microservicio | Tablas |
|---------|---------------|--------|
| `auth` | Supabase Auth | `users` (nativo) |
| `profile` | profile-service | `profiles` |
| `product` | product-service | `products` |
| `order` | order-service | `orders` |
| `message` | message-service | `messages` |
| `audit` | Todos | `audit_logs` |

### Row Level Security (RLS)

Cada tabla tiene políticas RLS configuradas en Supabase para garantizar:

- Los usuarios solo pueden ver/editar sus propios datos
- Los productos públicos son visibles para todos
- Las órdenes son visibles solo para comprador y vendedor
- Los mensajes son privados entre emisor y receptor

## Ejecución del Proyecto

### Prerrequisitos

- Docker y Docker Compose instalados
- Cuenta en Supabase con el proyecto configurado
- Node.js 18+ (para desarrollo local sin Docker)

### Inicio Rápido con Docker

1. **Clonar y configurar variables de entorno**:
   ```bash
   cp .env.example .env
   # Editar .env con tus credenciales de Supabase
   ```

2. **Construir e iniciar todos los servicios**:
   ```bash
   docker-compose up --build
   ```

3. **Acceder a la aplicación**:
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:8000


## API Endpoints

### Autenticación (via Supabase)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/signup` | Registro de usuario |
| POST | `/auth/signin` | Inicio de sesión |
| POST | `/auth/signout` | Cerrar sesión |
| GET | `/auth/user` | Obtener usuario actual |

### Perfiles
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/profiles/:id` | Obtener perfil |
| PUT | `/api/profiles/:id` | Actualizar perfil |
| GET | `/api/profiles/me` | Mi perfil |

### Productos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/products` | Listar productos |
| GET | `/api/products/:id` | Detalle de producto |
| POST | `/api/products` | Crear producto |
| PUT | `/api/products/:id` | Actualizar producto |
| DELETE | `/api/products/:id` | Eliminar producto |

### Órdenes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/orders` | Mis órdenes |
| POST | `/api/orders` | Crear orden |
| PUT | `/api/orders/:id` | Actualizar estado |

### Mensajes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/messages` | Mis conversaciones |
| POST | `/api/messages` | Enviar mensaje |

## Documentación 
| Servicio | URL Swagger|
|-----------|------------|
|Profile Service|`http://localhost:8001/docs`|
|Product Service|`	http://localhost:8002/docs`|
|Order Service|`	http://localhost:8003/docs`|
|Message Service|`	http://localhost:8004/docs`|

## Decisiones Arquitectónicas

### ¿Por qué Microservicios?
- **Escalabilidad independiente**: Cada servicio puede escalar según demanda
- **Desarrollo paralelo**: Equipos pueden trabajar en servicios diferentes
- **Resiliencia**: Fallo de un servicio no afecta a todo el sistema
- **Tecnología agnóstica**: Cada servicio puede usar stack diferente

### ¿Por qué Supabase?
- **Autenticación lista**: OAuth, JWT, Magic Links sin código adicional
- **RLS nativo**: Seguridad a nivel de base de datos
- **Realtime**: Subscripciones en tiempo real para mensajes
- **Hosting de BD**: PostgreSQL administrado

### ¿Por qué API Gateway?
- **Punto único de entrada**: Simplifica la configuración del cliente
- **Seguridad centralizada**: Validación de JWT en un solo lugar
- **Monitoreo**: Logs y métricas centralizadas
- **Rate limiting**: Protección contra abusos

## Seguridad

1. **JWT de Supabase**: Todos los tokens son validados por el API Gateway
2. **Row Level Security**: PostgreSQL valida permisos a nivel de fila
3. **CORS configurado**: Solo orígenes autorizados
4. **Rate Limiting**: Prevención de ataques de fuerza bruta
5. **Variables de entorno**: Secretos nunca en código

## Monitoreo y Logging

- **Logs estructurados**: Cada servicio genera logs JSON
- **Audit logs**: Registro de operaciones críticas en `audit.audit_logs`
- **Health checks**: Endpoints `/health` en cada servicio

## Contribuir

1. Fork el repositorio
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

MIT License - Ver archivo LICENSE para más detalles.

---

Desarrollado con 💚 para conectar el campo con la ciudad
