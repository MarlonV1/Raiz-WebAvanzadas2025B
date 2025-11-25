// generate-bcrypt-hash.js
// Genera un hash bcrypt válido para la contraseña 'Grupo7'

const bcrypt = require("bcryptjs");

(async () => {
  try {
    const password = "Grupo7";
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    console.log("\n========================================");
    console.log("✅ HASH BCRYPT GENERADO CORRECTAMENTE");
    console.log("========================================\n");
    console.log(`Contraseña: ${password}`);
    console.log(`Hash (bcrypt): ${hash}\n`);

    console.log("📝 Comando SQL para actualizar la BD:");
    console.log("----------------------------------------");
    console.log(`UPDATE [app].[Users]`);
    console.log(`SET PasswordHash = '${hash}'`);
    console.log(`WHERE Username = 'admin';`);
    console.log("----------------------------------------\n");

    console.log("🔍 O ejecuta este script SQL en SSMS:\n");
    console.log(`USE [RaizDB];`);
    console.log(
      `UPDATE [app].[Users] SET PasswordHash = '${hash}' WHERE Username = 'admin';`
    );
    console.log(`SELECT Id, Username, Email, Role FROM [app].[Users];`);

    console.log("\n✅ Copia el hash anterior y reemplázalo en tu BD.\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();
