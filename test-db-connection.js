// test-db-connection.js
// Script para verificar conexión a BD y credenciales del admin

require("dotenv").config();
const db = require("./src/config/db");
const bcrypt = require("bcryptjs");

(async () => {
  try {
    console.log("🔍 Probando conexión a SQL Server...");
    const pool = await db.getPool();
    console.log("✅ Conexión exitosa a SQL Server\n");

    // Consultar usuarios
    console.log("📋 Usuarios en BD:");
    const users = await db.query(
      "SELECT Id, Username, Email, Role FROM [app].[Users] ORDER BY Id"
    );
    if (users.length === 0) {
      console.log("  (No hay usuarios registrados)");
    } else {
      users.forEach((u) => {
        console.log(
          `  - ID: ${u.Id}, Username: ${u.Username}, Email: ${u.Email}, Role: ${u.Role}`
        );
      });
    }

    console.log("\n📦 Productos en BD:");
    const products = await db.query(
      "SELECT Id, Title, OwnerId, Price, Quantity FROM [app].[Products] ORDER BY Id"
    );
    if (products.length === 0) {
      console.log("  (No hay productos registrados)");
    } else {
      products.forEach((p) => {
        console.log(
          `  - ID: ${p.Id}, Title: ${p.Title}, Vendedor: ${p.OwnerId}, Precio: $${p.Price}, Stock: ${p.Quantity}`
        );
      });
    }

    // Probar bcrypt con el admin
    console.log("\n🔐 Probando autenticación:");
    const adminUser = users.find((u) => u.Username === "admin");
    if (adminUser) {
      const testPassword = "Grupo7"; // Contraseña usada en el script SQL
      const adminData = await db.query(
        "SELECT PasswordHash FROM [app].[Users] WHERE Username = @username",
        [{ name: "username", type: "string", value: "admin" }]
      );

      if (adminData.length > 0) {
        const hash = adminData[0].PasswordHash;
        const isValid = await bcrypt.compare(testPassword, hash);
        console.log(
          `  admin + "Grupo7": ${isValid ? "✅ Válido" : "❌ Inválido"}`
        );
        console.log(`  Hash en BD: ${hash}`);
      }
    } else {
      console.log("  (Usuario admin no encontrado)");
    }

    console.log("\n✅ Test completado sin errores\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error(err);
    process.exit(1);
  }
})();
