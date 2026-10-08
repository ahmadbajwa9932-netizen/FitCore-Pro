const db = require("../db");

async function equipmentRoutes(fastify) {
  // GET /api/equipment?search=&category=&status=
  // GET /api/equipment?search=&category=&status=
  fastify.get("/api/equipment", async (request) => {
    const { search = "", category = "all", status = "all" } = request.query;
    let sql = `
      SELECT e.*,
        (SELECT em.next_due_date
         FROM equipment_maintenance em
         WHERE em.equipment_id = e.id
         ORDER BY em.maintenance_date DESC, em.id DESC
         LIMIT 1) AS next_due_date
      FROM equipment e
      WHERE e.name LIKE ?
    `;
    const params = [`%${search}%`];

    if (category !== "all") {
      sql += " AND e.category = ?";
      params.push(category);
    }
    if (status !== "all") {
      sql += " AND e.status = ?";
      params.push(status);
    }
    sql += " ORDER BY e.created_at DESC";

    const [rows] = await db.query(sql, params);
    return rows;
  });

  // GET /api/equipment/:id
  fastify.get("/api/equipment/:id", async (request, reply) => {
    const [rows] = await db.query("SELECT * FROM equipment WHERE id = ?", [request.params.id]);
    if (rows.length === 0) return reply.code(404).send({ error: "Equipment not found" });
    return rows[0];
  });

  // GET /api/equipment/:id/maintenance
  fastify.get("/api/equipment/:id/maintenance", async (request) => {
    const [rows] = await db.query(
      "SELECT * FROM equipment_maintenance WHERE equipment_id = ? ORDER BY maintenance_date DESC",
      [request.params.id]
    );
    return rows;
  });

  // POST /api/equipment
  fastify.post("/api/equipment", async (request, reply) => {
    const { name, category, quantity, purchaseDate, purchaseCost, warrantyExpiry, notes } = request.body;
    if (!name) return reply.code(400).send({ error: "name is required" });

    const [result] = await db.query(
      `INSERT INTO equipment (name, category, quantity, purchase_date, purchase_cost, warranty_expiry, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, category || null, quantity || 1, purchaseDate || null, purchaseCost || null, warrantyExpiry || null, notes || null]
    );
    return reply.code(201).send({ id: result.insertId, message: "Equipment added" });
  });

  // PUT /api/equipment/:id
  fastify.put("/api/equipment/:id", async (request, reply) => {
    const { name, category, quantity, purchaseDate, purchaseCost, warrantyExpiry, status, notes } = request.body;
    await db.query(
      `UPDATE equipment SET name=?, category=?, quantity=?, purchase_date=?, purchase_cost=?,
       warranty_expiry=?, status=?, notes=? WHERE id=?`,
      [name, category || null, quantity || 1, purchaseDate || null, purchaseCost || null,
       warrantyExpiry || null, status || "working", notes || null, request.params.id]
    );
    return { message: "Equipment updated" };
  });

  // POST /api/equipment/:id/maintenance
  fastify.post("/api/equipment/:id/maintenance", async (request, reply) => {
    const { description, cost, maintenanceDate, nextDueDate } = request.body;
    if (!description || !maintenanceDate) {
      return reply.code(400).send({ error: "description and maintenanceDate are required" });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO equipment_maintenance (equipment_id, description, cost, maintenance_date, next_due_date)
         VALUES (?, ?, ?, ?, ?)`,
        [request.params.id, description, cost || null, maintenanceDate, nextDueDate || null]
      );
      // logging maintenance implies it's back in working order
      await conn.query("UPDATE equipment SET status = 'working' WHERE id = ?", [request.params.id]);
      await conn.commit();
      return reply.code(201).send({ message: "Maintenance logged" });
    } catch (err) {
      await conn.rollback();
      return reply.code(500).send({ error: err.message });
    } finally {
      conn.release();
    }
  });

  // DELETE /api/equipment/:id
  fastify.delete("/api/equipment/:id", async (request) => {
    await db.query("DELETE FROM equipment WHERE id = ?", [request.params.id]);
    return { message: "Equipment deleted" };
  });
}

module.exports = equipmentRoutes;