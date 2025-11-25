# Raíz - Marketplace Agrícola

**Proyecto monolítico Node.js + Express + SQL Server**

## Requisitos

- Node.js v16+
- SQL Server 2019+ (SSMS 21)
- npm

## Instalación y Setup

### 1. Clonar/Descargar el proyecto

```bash
cd Raiz
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales (ya está preconfigurado)
```

### 4. Crear la base de datos (SQL Server)

**Opción A: Ejecutar todo el script de inicialización**

1. Abre SQL Server Management Studio (SSMS 21)
2. Crea una **nueva conexión** (o usa la existente)
3. Abre `sql/create_raiz_db.sql`
4. Presiona **F5** para ejecutar todo el script
   - Crea el LOGIN `raiz_app_login` con contraseña `Grupo7`
   - Crea la base de datos `RaizDB`
   - Crea el usuario `raiz_app_user`
   - Crea todas las tablas y datos iniciales

**Opción B: Actualizar el hash bcrypt del admin** (si ya se ejecutó create_raiz_db.sql antes)

1. Abre `sql/update_admin_hash.sql`
2. Presiona **F5** para ejecutar
   - Actualiza la contraseña del admin a `Grupo7` (hash válido)

### 5. Iniciar el servidor

```bash
npm run dev
```

Deberías ver:

```
[nodemon] starting `node ./app.js`
Servidor "Raíz" escuchando en http://localhost:3000
Conectado a SQL Server
```

### 6. Abrir en el navegador

```
http://localhost:3000
```

---

## Credenciales Predeterminadas

**Usuario Admin (creado en la DB):**

- Usuario: `admin`
- Correo: `admin@raiz.com`
- Contraseña: `Grupo7`
- Rol: `admin`

---

## Rutas y Funcionalidad

### Autenticación

- `GET /login` → Formulario de login
- `POST /login` → Procesar login
- `GET /register` → Formulario de registro
- `POST /register` → Crear nuevo usuario
- `GET /logout` → Cerrar sesión

### Productos

- `GET /` → Página principal
- `GET /products` → Listar todos los productos
- `GET /product/:id` → Ver detalles de un producto
- `GET /product/add` → Formulario para agregar producto (requiere login)
- `POST /product/add` → Crear nuevo producto
- `GET /product/edit/:id` → Editar producto (solo dueño)
- `POST /product/edit/:id` → Actualizar producto

---

## Arquitectura Monolítica

```
Cliente (Navegador)
    ↓ HTTP + WebSocket
Servidor (Node.js + Express)
├── Routes (express-session, middleware)
├── Controllers (Lógica de negocio)
├── Views (EJS - SSR)
├── Config (DB, Session)
└── Public (CSS, JS cliente)
    ↓ SQL directo
SQL Server (RaizDB)
├── [app].[Users]
├── [app].[Products]
├── [app].[Orders]
├── [app].[Messages]
└── [app].[AuditLogs]
```

**Características:**

- SSR (Server Side Rendering) con EJS
- Autenticación con bcryptjs + express-session
- SQL directo con librería `mssql`
- Socket.IO integrado (puerto 3000)

---

## Testing

### Prueba de conexión BD

```bash
node test-db-connection.js
```

Verifica:

- Conexión a SQL Server
- Usuarios en la BD
- Productos en la BD
- Validación de credenciales (bcrypt)

### Generar hash bcrypt

```bash
node generate-bcrypt-hash.js
```

Importante: Usa unicamente si necesitas generar un nuevo hash para cambiar contraseñas.

---

## Estructura de Carpetas

```
/Raiz
├── app.js                          # Punto de entrada
├── package.json
├── .env                            # Variables (NO commitar)
├── .env.example                    # Plantilla
├── .gitignore
├── sql/
│   ├── create_raiz_db.sql         # Crear BD desde 0
│   ├── update_admin_hash.sql      # Actualizar hash admin
├── src/
│   ├── config/
│   │   ├── config.js              # Config (port, DB)
│   │   └── db.js                  # Pool MSSQL + helpers
│   ├── controllers/
│   │   ├── authController.js      # Login, registro, logout
│   │   └── productController.js   # CRUD productos
│   ├── routes/
│   │   ├── authRoutes.js          # Rutas auth
│   │   └── productRoutes.js       # Rutas productos
│   └── views/
│       └── pages/
│           ├── home.ejs           # Página principal
│           ├── login.ejs          # Login
│           ├── register.ejs       # Registro
│           ├── products.ejs       # Listado productos
│           ├── add-product.ejs    # Agregar producto
│           └── edit-product.ejs   # Editar producto
└── public/
    ├── css/
    ├── js/
    └── img/
```

---

## Troubleshooting

### Error: "Error en el servidor" al registrar

- Verifica que la BD esté corriendo y accesible
- Revisa los logs en la consola para ver el error exacto
- Asegúrate de que el username/email no existan ya

### Error: "Usuario o contraseña incorrectos" aunque son correctos

- Ejecuta `sql/update_admin_hash.sql` para actualizar el hash
- O crea un nuevo usuario registrándote desde `/register`

### Puerto 3000 ya está en uso

- Cambia `PORT=3000` en `.env` a otro puerto (ej: 3001)
- O mata el proceso que usa el puerto

### No me conecta a SQL Server

- Verifica que SQL Server esté corriendo
- Comprueba las credenciales en `.env`
  - `DB_USER`: usuario SQL con permisos
  - `DB_PASSWORD`: contraseña
  - `DB_SERVER`: nombre/IP del servidor
  - `DB_NAME`: nombre de la base de datos

---
