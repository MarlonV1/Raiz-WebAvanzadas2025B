// app.js
// Punto de entrada de la aplicación Raíz
// Configura Express, EJS, middleware de sesión y Socket.IO

require("dotenv").config();
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const bodyParser = require("body-parser");

const config = require("./src/config/config");
const db = require("./src/config/db"); // inicializa/usa la conexión a SQL Server

// Importar rutas
const authRoutes = require("./src/routes/authRoutes");
const productRoutes = require("./src/routes/productRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ----- Middlewares -----
// Body parser para formularios
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Sesiones (almacén por defecto - para desarrollo). Cambiar por store en producción.
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "raiz_secret_development",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 2 }, // 2 horas
});
app.use(sessionMiddleware);

// EJS y vistas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

// Archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Exponer la conexión a la DB en req (opcional, útil para controladores simples)
app.use((req, res, next) => {
  req.db = db; // db exporta helpers para ejecutar consultas
  next();
});

// Exponer el usuario en las vistas (res.locals.user)
// Esto permite usar `user` en los templates sin pasar explícitamente en cada render
app.use((req, res, next) => {
  try {
    res.locals.user = req.session ? req.session.user || null : null;
  } catch (e) {
    res.locals.user = null;
  }
  next();
});


// Rutas básicas
app.get("/", (req, res) => {
  // Renderiza la página principal (SSR)
  res.render("pages/home", { user: req.session.user || null });
});

// Usar rutas de autenticación con prefijo /auth
app.use("/auth", authRoutes);

// Usar rutas de productos con prefijo /products
app.use("/products", productRoutes);

// ----- Socket.IO -----
// Para desarrollo básico de chat dentro del mismo servidor
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  // Escuchar mensaje de chat y retransmitir a todos
  socket.on("chat message", (msg) => {
    // msg puede ser { user, text, timestamp }
    io.emit("chat message", msg);
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

// Iniciar servidor
server.listen(config.port, () => {
  console.log(`Servidor "Raíz" escuchando en http://localhost:${config.port}`);
});

// Exportar app (útil para testing)
module.exports = { app, server, io };
