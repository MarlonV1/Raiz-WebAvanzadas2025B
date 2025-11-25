// src/routes/productRoutes.js
// Rutas de productos

const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

// GET / - Listar todos los productos
router.get("/", productController.getProducts);

// Rutas específicas primero para evitar que ":id" capture rutas como "add"
// GET /add - Mostrar formulario para agregar producto (requiere autenticación)
router.get("/add", productController.getAddProductForm);

// POST /add - Agregar nuevo producto
router.post("/add", productController.postAddProduct);

// GET /:id/edit - Mostrar formulario de edición (requiere autenticación y ser dueño)
router.get("/:id/edit", productController.getEditProductForm);

// POST /:id/edit - Actualizar producto
router.post("/:id/edit", productController.postEditProduct);

// POST /:id/delete - Eliminar producto (solo dueño)
router.post("/:id/delete", productController.postDeleteProduct);

// GET /:id - Ver detalles de un producto (debe ir al final)
router.get("/:id", productController.getProductById);

module.exports = router;
