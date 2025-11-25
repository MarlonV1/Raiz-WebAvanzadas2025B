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

// GET /logout - Logout
router.get("/logout", authController.getLogout);

module.exports = router;
