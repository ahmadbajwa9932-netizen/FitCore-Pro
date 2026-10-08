const db = require("../db");

async function shopRoutes(fastify) {
  // GET /api/shop/products?search=&category=
  fastify.get("/api/shop/products", async (request) => {
    const { search = "", category = "all" } = request.query;
    let sql = "SELECT *, (quantity - sold_quantity) AS remaining_quantity FROM shop_products WHERE name LIKE ?";
    const params = [`%${search}%`];
    if (category !== "all") {
      sql += " AND category = ?";
      params.push(category);
    }
    sql += " ORDER BY created_at DESC";
    const [rows] = await db.query(sql, params);
    return rows;
  });

  // GET /api/shop/products/:id
  fastify.get("/api/shop/products/:id", async (request, reply) => {
    const [rows] = await db.query("SELECT *, (quantity - sold_quantity) AS remaining_quantity FROM shop_products WHERE id = ?", [request.params.id]);
    if (rows.length === 0) return reply.code(404).send({ error: "Product not found" });
    return rows[0];
  });

  // POST /api/shop/products — Add Purchase (new product entry)
  fastify.post("/api/shop/products", async (request, reply) => {
    const {
      name, category, purchasePrice, soldPrice, quantity, lowStockThreshold,
      purchaseDate, expiryDate, supplierName, supplierCompany, supplierCity, supplierContact,
    } = request.body;

    if (!name || !purchasePrice || !soldPrice || !quantity) {
      return reply.code(400).send({ error: "name, purchasePrice, soldPrice and quantity are required" });
    }

    const [result] = await db.query(
      `INSERT INTO shop_products
       (name, category, purchase_price, sold_price, quantity, low_stock_threshold,
        purchase_date, expiry_date, supplier_name, supplier_company, supplier_city, supplier_contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category || null, purchasePrice, soldPrice, quantity, lowStockThreshold || 5,
       purchaseDate || null, expiryDate || null, supplierName || null, supplierCompany || null,
       supplierCity || null, supplierContact || null]
    );
    return reply.code(201).send({ id: result.insertId, message: "Product added" });
  });

  // POST /api/shop/products/:id/restock
  fastify.post("/api/shop/products/:id/restock", async (request, reply) => {
    const { quantity, purchaseDate, expiryDate } = request.body;
    if (!quantity || quantity <= 0) return reply.code(400).send({ error: "A valid quantity is required" });

    await db.query(
      `UPDATE shop_products
       SET quantity = quantity + ?, purchase_date = ?, expiry_date = ?
       WHERE id = ?`,
      [quantity, purchaseDate || null, expiryDate || null, request.params.id]
    );
    return { message: "Stock updated" };
  });

// PUT /api/shop/products/:id — edit product details
fastify.put("/api/shop/products/:id", async (request, reply) => {
  const {
    name, category, purchasePrice, soldPrice, quantity, lowStockThreshold,
    purchaseDate, expiryDate, supplierName, supplierCompany, supplierCity, supplierContact,
  } = request.body;

  if (!name || !purchasePrice || !soldPrice || !quantity) {
    return reply.code(400).send({ error: "name, purchasePrice, soldPrice and quantity are required" });
  }

  const [[product]] = await db.query("SELECT id FROM shop_products WHERE id = ?", [request.params.id]);
  if (!product) return reply.code(404).send({ error: "Product not found" });

  await db.query(
    `UPDATE shop_products SET
     name=?, category=?, purchase_price=?, sold_price=?, quantity=?, low_stock_threshold=?,
     purchase_date=?, expiry_date=?, supplier_name=?, supplier_company=?, supplier_city=?, supplier_contact=?
     WHERE id=?`,
    [name, category || null, purchasePrice, soldPrice, quantity, lowStockThreshold || 5,
     purchaseDate || null, expiryDate || null, supplierName || null, supplierCompany || null,
     supplierCity || null, supplierContact || null, request.params.id]
  );
  return { message: "Product updated" };
});

// DELETE /api/shop/products/:id
fastify.delete("/api/shop/products/:id", async (request) => {
  await db.query("DELETE FROM shop_products WHERE id = ?", [request.params.id]);
  return { message: "Product deleted" };
});
}

module.exports = shopRoutes;