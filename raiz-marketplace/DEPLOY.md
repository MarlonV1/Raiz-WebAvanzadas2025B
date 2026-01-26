# ==================================================
# RAÍZ MARKETPLACE - INSTRUCCIONES DE DESPLIEGUE
# ==================================================

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- Docker y Docker Compose
- Cuenta en Supabase (https://supabase.com)


### 2. Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar con tus credenciales
nano .env  # o usa tu editor preferido
```

Variables requeridas:
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_KEY=tu-service-key
```

### 3. Iniciar con Docker

```bash
# Construir e iniciar todos los servicios
docker-compose up --build

# O en modo detached (background)
docker-compose up -d --build
```

### 4. Verificar Servicios

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Frontend | http://localhost:3000 | Interfaz de usuario |
| API Gateway | http://localhost:8000 | Punto de entrada API |
| Profile Service | http://localhost:8001 | Gestión de perfiles |
| Product Service | http://localhost:8002 | Gestión de productos |
| Order Service | http://localhost:8003 | Gestión de órdenes |
| Message Service | http://localhost:8004 | Mensajería |

### 5. Verificar Health Check

```bash
curl http://localhost:8000/health
```

---


## 📊 Comandos Docker Útiles

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f api-gateway

# Reiniciar un servicio
docker-compose restart product-service

# Detener todo
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v

# Reconstruir un servicio específico
docker-compose build --no-cache api-gateway
docker-compose up -d api-gateway
```

---

## 🔧 Troubleshooting

### Error: "Cannot connect to Supabase"
- Verificar que `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` son correctos
- Verificar que el proyecto Supabase está activo

### Error: "Port already in use"
```bash
# Ver qué proceso usa el puerto
netstat -ano | findstr :3000

# En Windows, matar el proceso
taskkill /PID <pid> /F
```

### Error: "Service unhealthy"
```bash
# Ver logs del servicio específico
docker-compose logs api-gateway

# Verificar el health check manualmente
curl http://localhost:8000/health
```

### Limpiar todo y empezar de nuevo
```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```

---

## 📁 Estructura del Proyecto

```
raiz-marketplace/
├── docker-compose.yml      # Orquestación de contenedores
├── .env.example           # Plantilla de variables
├── README.md              # Documentación principal
├── DEPLOY.md              # Este archivo
├── supabase/
│   └── schema.sql         # Esquema de base de datos
├── services/
│   ├── api-gateway/       # Gateway con Circuit Breaker
│   ├── profile-service/   # Microservicio de perfiles
│   ├── product-service/   # Microservicio de productos
│   ├── order-service/     # Microservicio de órdenes (Saga)
│   └── message-service/   # Microservicio de mensajes
└── frontend/
    ├── index.html         # Landing page
    ├── pages/             # Páginas HTML
    ├── css/               # Estilos
    └── js/                # JavaScript modules
```

---

## 🌐 Endpoints API Principales

### Autenticación (via Supabase)
- `POST /auth/signup` - Registro
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout

### Productos
- `GET /api/products` - Listar productos
- `GET /api/products/:id` - Detalle
- `POST /api/products` - Crear (auth)
- `PUT /api/products/:id` - Actualizar (owner)
- `DELETE /api/products/:id` - Eliminar (owner)

### Órdenes
- `GET /api/orders/my-orders` - Mis compras
- `GET /api/orders/my-sales` - Mis ventas
- `POST /api/orders` - Crear orden
- `PUT /api/orders/:id/status` - Actualizar estado

### Mensajes
- `GET /api/messages/conversations` - Conversaciones
- `GET /api/messages/:userId` - Chat con usuario
- `POST /api/messages` - Enviar mensaje


**¿Problemas?** Revisa los logs con `docker-compose logs -f`
