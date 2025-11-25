// src/controllers/productController.js
// Controlador de productos - CRUD de productos agrícolas

/**
 * GET /products
 * Obtiene todos los productos activos
 */
exports.getProducts = async (req, res) => {
  try {
    // Consulta SQL: obtener productos activos con info del vendedor
    const sqlText = `
      SELECT 
        p.Id, 
        p.OwnerId, 
        p.Title, 
        p.Description, 
        p.Category, 
        p.Price, 
        p.Quantity, 
        p.IsActive, 
        p.CreatedAt,
        u.Username AS OwnerName
      FROM [app].[Products] p
      LEFT JOIN [app].[Users] u ON p.OwnerId = u.Id
      WHERE p.IsActive = 1
      ORDER BY p.CreatedAt DESC
    `;

    const products = await req.db.query(sqlText, []);

    res.render("pages/products", {
      products: products,
      user: req.session ? req.session.user || null : null,
    });
  } catch (err) {
    console.error("Error en getProducts:", err);
    res.status(500).send("Error al obtener productos");
  }
};

/**
 * GET /product/:id
 * Obtiene detalles de un producto específico
 */
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Consulta SQL: obtener un producto por ID
    const sqlText = `
      SELECT 
        p.Id, 
        p.OwnerId, 
        p.Title, 
        p.Description, 
        p.Category, 
        p.Price, 
        p.Quantity, 
        p.IsActive, 
        p.CreatedAt,
        u.Id AS UserId,
        u.Username AS OwnerName,
        u.Email AS OwnerEmail
      FROM [app].[Products] p
      LEFT JOIN [app].[Users] u ON p.OwnerId = u.Id
      WHERE p.Id = @id
    `;

    const rows = await req.db.query(sqlText, [
      { name: "id", type: "int", value: parseInt(id, 10) },
    ]);

    if (rows.length === 0) {
      return res.status(404).send("Producto no encontrado");
    }

    res.render("pages/product-detail", {
      product: rows[0],
      user: req.session ? req.session.user || null : null,
    });
  } catch (err) {
    console.error("Error en getProductById:", err);
    res.status(500).send("Error al obtener el producto");
  }
};

/**
 * GET /product/add (Mostrar formulario)
 * Renderiza el formulario para agregar un producto
 */
exports.getAddProductForm = (req, res) => {
  // Verificar que esté autenticado
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  res.render("pages/add-product", { user: req.session ? req.session.user || null : null, error: null });
};

/**
 * POST /product/add
 * Agrega un nuevo producto a la base de datos
 */
exports.postAddProduct = async (req, res) => {
  try {
    // Verificar autenticación
    if (!req.session.user) {
      return res.redirect("/auth/login");
    }

    const { title, description, category, price, quantity } = req.body;

    // Validaciones básicas
    if (!title || !price || !quantity) {
      return res.render("pages/add-product", {
        user: req.session ? req.session.user || null : null,
        error: "Título, precio y cantidad son requeridos",
      });
    }

    // Consulta SQL: insertar producto
    const sqlText = `
      INSERT INTO [app].[Products] (OwnerId, Title, Description, Category, Price, Quantity, IsActive)
      VALUES (@ownerId, @title, @description, @category, @price, @quantity, 1)
    `;

    await req.db.query(sqlText, [
      { name: "ownerId", type: "int", value: req.session.user.id },
      { name: "title", type: "string", value: title },
      { name: "description", type: "string", value: description || "" },
      { name: "category", type: "string", value: category || "Sin categoría" },
      { name: "price", type: "decimal", value: parseFloat(price) },
      { name: "quantity", type: "int", value: parseInt(quantity, 10) },
    ]);

    // Redirigir a la lista de productos
    res.redirect("/products");
  } catch (err) {
    console.error("Error en postAddProduct:", err);
    res.render("pages/add-product", {
      user: req.session ? req.session.user || null : null,
      error: "Error al agregar el producto",
    });
  }
};

/**
 * GET /product/edit/:id (Mostrar formulario de edición)
 * Renderiza el formulario para editar un producto (solo si es el dueño)
 */
exports.getEditProductForm = async (req, res) => {
  try {
    // Verificar autenticación
    if (!req.session.user) {
      return res.redirect("/auth/login");
    }

    const { id } = req.params;

    // Obtener el producto
    const sqlText = `SELECT * FROM [app].[Products] WHERE Id = @id`;
    const rows = await req.db.query(sqlText, [
      { name: "id", type: "int", value: parseInt(id, 10) },
    ]);

    if (rows.length === 0) {
      return res.status(404).send("Producto no encontrado");
    }

    const product = rows[0];

    // Verificar que sea el dueño
    if (product.OwnerId !== req.session.user.id) {
      return res
        .status(403)
        .send("No tienes permiso para editar este producto");
    }

    res.render("pages/edit-product", {
      product: product,
      user: req.session ? req.session.user || null : null,
      error: null,
    });
  } catch (err) {
    console.error("Error en getEditProductForm:", err);
    res.status(500).send("Error al obtener el producto");
  }
};

/**
 * POST /:id/delete
 * Elimina un producto si el usuario es el dueño
 */
exports.postDeleteProduct = async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/auth/login");

    const { id } = req.params;
    const sqlGetText = `SELECT * FROM [app].[Products] WHERE Id = @id`;
    const rows = await req.db.query(sqlGetText, [
      { name: "id", type: "int", value: parseInt(id, 10) },
    ]);

    if (rows.length === 0) {
      return res.status(404).send("Producto no encontrado");
    }

    const product = rows[0];
    if (product.OwnerId !== req.session.user.id) {
      return res.status(403).send("No tienes permiso para eliminar este producto");
    }

    const sqlDel = `DELETE FROM [app].[Products] WHERE Id = @id`;
    await req.db.query(sqlDel, [{ name: "id", type: "int", value: parseInt(id, 10) }]);

    // Redirigir al perfil del usuario
    res.redirect("/auth/profile");
  } catch (err) {
    console.error("Error en postDeleteProduct:", err);
    res.status(500).send("Error al eliminar el producto");
  }
};

/**
 * POST /product/edit/:id
 * Actualiza un producto en la base de datos
 */
exports.postEditProduct = async (req, res) => {
  try {
    // Verificar autenticación
    if (!req.session.user) {
      return res.redirect("/auth/login");
    }

    const { id } = req.params;
    const { title, description, category, price, quantity, isActive } =
      req.body;

    // Obtener producto actual
    const sqlGetText = `SELECT * FROM [app].[Products] WHERE Id = @id`;
    const rows = await req.db.query(sqlGetText, [
      { name: "id", type: "int", value: parseInt(id, 10) },
    ]);

    if (rows.length === 0) {
      return res.status(404).send("Producto no encontrado");
    }

    // Verificar propiedad
    if (rows[0].OwnerId !== req.session.user.id) {
      return res
        .status(403)
        .send("No tienes permiso para editar este producto");
    }

    // Consulta SQL: actualizar producto
    const sqlText = `
      UPDATE [app].[Products]
      SET Title = @title, 
          Description = @description, 
          Category = @category, 
          Price = @price, 
          Quantity = @quantity,
          IsActive = @isActive
      WHERE Id = @id
    `;

    await req.db.query(sqlText, [
      { name: "id", type: "int", value: parseInt(id, 10) },
      { name: "title", type: "string", value: title },
      { name: "description", type: "string", value: description || "" },
      { name: "category", type: "string", value: category || "Sin categoría" },
      { name: "price", type: "decimal", value: parseFloat(price) },
      { name: "quantity", type: "int", value: parseInt(quantity, 10) },
      { name: "isActive", type: "bit", value: isActive === "on" ? 1 : 0 },
    ]);

    // Redirigir a productos
    res.redirect("/products");
  } catch (err) {
    console.error("Error en postEditProduct:", err);
    res.status(500).send("Error al actualizar el producto");
  }
};
