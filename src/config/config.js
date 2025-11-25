// src/config/config.js
// Carga variables de entorno y exporta configuración usada por la aplicación

require("dotenv").config();

const config = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || "raiz_secret_development",
  db: {
    user: process.env.DB_USER || "raiz_app_login",
    password: process.env.DB_PASSWORD || "Grupo7",
    server: process.env.DB_SERVER || "localhost",
    database: process.env.DB_NAME || "RaizDB",
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 1433,
    options: {
      // Ajustes comunes para conexión a SQL Server
      encrypt: process.env.DB_ENCRYPT === "true" ? true : false,
      trustServerCertificate:
        process.env.DB_TRUST_CERT === "false" ? false : true,
      enableArithAbort: true,
    },
  },
};

module.exports = config;
