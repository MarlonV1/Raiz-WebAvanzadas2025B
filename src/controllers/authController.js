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
  res.render("pages/login", { error: null, msg, user: req.session ? req.session.user || null : null });
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
        user: req.session ? req.session.user || null : null,
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
        user: req.session ? req.session.user || null : null,
      });
    }

    const user = rows[0];

    // Verificar contraseña con bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
    if (!isPasswordValid) {
      return res.render("pages/login", {
        error: "Usuario o contraseña incorrectos",
        user: req.session ? req.session.user || null : null,
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
      user: req.session ? req.session.user || null : null,
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
        user: req.session ? req.session.user || null : null,
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
      return res.redirect("/auth/login?msg=Usuario registrado. Inicia sesión.");
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
          user: req.session ? req.session.user || null : null,
        });
      }
      throw dbErr;
    }
  } catch (err) {
    console.error("Error en postRegister:", err.message, err);
    res.render("pages/register", {
      error: "Error en el servidor: " + err.message,
      user: req.session ? req.session.user || null : null,
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

/**
 * GET /profile
 * Muestra el perfil del usuario con sus productos
 */
exports.getProfile = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect('/auth/login');

    const sqlText = `
      SELECT Id, OwnerId, Title, Description, Category, Price, Quantity, IsActive, CreatedAt
      FROM [app].[Products]
      WHERE OwnerId = @ownerId
      ORDER BY CreatedAt DESC
    `;

    const products = await req.db.query(sqlText, [
      { name: 'ownerId', type: 'int', value: req.session.user.id },
    ]);

    res.render('pages/profile', { products, user: req.session ? req.session.user || null : null });
  } catch (err) {
    console.error('Error en getProfile:', err);
    res.status(500).send('Error al obtener el perfil');
  }
};

/**
 * GET /forgot
 * Muestra el formulario para recuperar contraseña
 */
exports.getForgot = (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('pages/forgot-password', { error: null, msg: null, user: req.session ? req.session.user || null : null });
};

/**
 * POST /forgot
 * Procesa la solicitud de recuperación. No envía email real, muestra mensaje informativo.
 */
exports.postForgot = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.render('pages/forgot-password', { error: 'Ingresa un correo válido', msg: null, user: req.session ? req.session.user || null : null });
    }

    // Intentar encontrar el usuario por email (si la BD está disponible)
    const sqlText = `SELECT Id, Email FROM [app].[Users] WHERE Email = @email`;
    let rows = [];
    try {
      rows = await req.db.query(sqlText, [{ name: 'email', type: 'string', value: email }]);
    } catch (dbErr) {
      console.warn('DB lookup failed for forgot-password:', dbErr && dbErr.message);
    }

    // No implementamos envío de correo en este entorno. Mostrar mensaje informativo.
    const msg = 'Si existe una cuenta asociada a ese correo, se ha enviado un enlace de recuperación.';
    return res.render('pages/forgot-password', { error: null, msg, user: req.session ? req.session.user || null : null });
  } catch (err) {
    console.error('Error en postForgot:', err);
    res.render('pages/forgot-password', { error: 'Error procesando la solicitud', msg: null, user: req.session ? req.session.user || null : null });
  }
};
