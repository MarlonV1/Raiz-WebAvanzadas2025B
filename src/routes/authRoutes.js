// src/routes/authRoutes.js
// Rutas de autenticación

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// GET /login - Mostrar formulario de login
router.get("/login", authController.getLogin);

// POST /login - Procesar login
router.post("/login", authController.postLogin);

// GET /register - Mostrar formulario de registro
router.get("/register", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  res.render("pages/register", { error: null });
});

// POST /register - Procesar registro
router.post("/register", authController.postRegister);

// GET /profile - Perfil del usuario
router.get("/profile", authController.getProfile);

// GET /forgot - Formulario para recuperar contraseña
router.get("/forgot", authController.getForgot);

// POST /forgot - Procesar solicitud de recuperación (envío de email no implementado)
router.post("/forgot", authController.postForgot);

// GET /logout - Logout
router.get("/logout", authController.getLogout);

module.exports = router;
