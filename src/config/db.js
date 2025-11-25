// src/config/db.js
// Helper ligero para conexión a Microsoft SQL Server usando 'mssql'
// Recomendación: para producción usar pool global y manejar reconexiones

const sql = require("mssql");
const config = require("./config");

// Construir la configuración para mssql
const dbConfig = {
  user: config.db.user,
  password: config.db.password,
  server: config.db.server,
  database: config.db.database,
  port: config.db.port,
  options: config.db.options,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Pool compartido
let poolPromise = null;

// Inicializar pool (lazy)
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then((pool) => {
        console.log("Conectado a SQL Server");
        return pool;
      })
      .catch((err) => {
        console.error("Error al conectar con SQL Server:", err);
        // Para que intentos futuros reintenten la conexión
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

// Ejecutar consulta SQL simple
async function query(sqlText, inputs = []) {
  const pool = await getPool();
  const request = pool.request();

  // inputs: [{ name, type, value }] - opcional
  // Mapear tipos de string a tipos SQL de mssql
  for (const inp of inputs) {
    let sqlType = sql.NVarChar;

    // Mapeo de tipos comunes
    if (inp.type === "int" || inp.type === "integer") {
      sqlType = sql.Int;
    } else if (inp.type === "decimal" || inp.type === "float") {
      sqlType = sql.Decimal(12, 2);
    } else if (inp.type === "bit" || inp.type === "boolean") {
      sqlType = sql.Bit;
    } else if (inp.type === "date") {
      sqlType = sql.DateTime;
    } else if (
      inp.type === "string" ||
      inp.type === "varchar" ||
      inp.type === "nvarchar"
    ) {
      sqlType = sql.NVarChar;
    }

    request.input(inp.name, sqlType, inp.value);
  }

  const result = await request.query(sqlText);
  return result.recordset;
}

module.exports = {
  sql, // exportar el paquete mssql por si otros módulos lo necesitan
  getPool,
  query,
};
