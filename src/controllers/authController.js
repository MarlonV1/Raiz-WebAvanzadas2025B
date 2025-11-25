// src/controllers/authController.js
// Controlador de autenticación - Login, Registro, Logout

const bcrypt = require("bcryptjs");

/**
 * GET /login
 * Renderiza la página de login
 */
exports.getLogin = (req, res) => {
  // Si ya está autenticado, redirige al home
  if (req.session.user) {
    return res.redirect("/");
  }
  const msg = req.query.msg || null;
  res.render("pages/login", { error: null, msg });
};

/**
 * POST /login
 * Procesa el envío del formulario de login
 * Busca el usuario por username y verifica contraseña
 */
exports.postLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validación básica
    if (!username || !password) {
      return res.render("pages/login", {
        error: "Usuario y contraseña requeridos",
      });
    }

    // Consulta SQL: buscar usuario por username
    const sqlText = `
      SELECT Id, Username, Email, PasswordHash, FullName, Role
      FROM [app].[Users]
      WHERE Username = @username
    `;

    const rows = await req.db.query(sqlText, [
      { name: "username", type: "string", value: username },
    ]);

    // Si no existe el usuario
    if (rows.length === 0) {
      return res.render("pages/login", {
        error: "Usuario o contraseña incorrectos",
      });
    }

    const user = rows[0];

    // Verificar contraseña con bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
    if (!isPasswordValid) {
      return res.render("pages/login", {
        error: "Usuario o contraseña incorrectos",
      });
    }

    // Guardar en sesión
    req.session.user = {
      id: user.Id,
      username: user.Username,
      email: user.Email,
      fullName: user.FullName,
      role: user.Role,
    };

    // Redirigir a home
    res.redirect("/");
  } catch (err) {
    console.error("Error en postLogin:", err.message, err);
    res.render("pages/login", {
      error: "Error en el servidor: " + err.message,
    });
  }
};

/**
 * POST /register
 * Procesa el registro de nuevo usuario
 * Hash bcrypt + inserción en BD
 */
exports.postRegister = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Validación básica
    if (!username || !email || !password) {
      return res.render("pages/register", {
        error: "Todos los campos son requeridos",
      });
    }

    // Hash de la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Consulta SQL: insertar nuevo usuario
    const sqlText = `
      INSERT INTO [app].[Users] (Username, Email, PasswordHash, FullName, Role)
      VALUES (@username, @email, @passwordHash, @fullName, 'user')
    `;

    try {
      await req.db.query(sqlText, [
        { name: "username", type: "string", value: username },
        { name: "email", type: "string", value: email },
        { name: "passwordHash", type: "string", value: passwordHash },
        { name: "fullName", type: "string", value: fullName || username },
      ]);

      // Redirigir a login con mensaje de éxito (usar sesión o query param)
      return res.redirect("/login?msg=Usuario registrado. Inicia sesión.");
    } catch (dbErr) {
      // Posible error de username o email duplicado (UNIQUE constraint)
      console.error("Error en INSERT (postRegister):", dbErr.message);
      if (
        dbErr.message.includes("unique") ||
        dbErr.message.includes("Duplicate") ||
        dbErr.message.includes("PRIMARY KEY")
      ) {
        return res.render("pages/register", {
          error: "Usuario o email ya existen",
        });
      }
      throw dbErr;
    }
  } catch (err) {
    console.error("Error en postRegister:", err.message, err);
    res.render("pages/register", {
      error: "Error en el servidor: " + err.message,
    });
  }
};

/**
 * GET /logout
 * Destruye la sesión y redirige
 */
exports.getLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error al destruir sesión:", err);
    }
    res.redirect("/");
  });
};
