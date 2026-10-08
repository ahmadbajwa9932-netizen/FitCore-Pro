const db = require("../db");

async function planRoutes(fastify) {
  // GET /api/plans?status=active
  fastify.get("/api/plans", async (request) => {
    const { status } = request.query;
    let sql = "SELECT * FROM membership_plans";
    const params = [];
    if (status) {
      sql += " WHERE status = ?";
      params.push(status);
    }
    sql += " ORDER BY created_at DESC";
    const [rows] = await db.query(sql, params);
    return rows;
  });

  // GET /api/plans/:id
  fastify.get("/api/plans/:id", async (request, reply) => {
    const [rows] = await db.query("SELECT * FROM membership_plans WHERE id = ?", [request.params.id]);
    if (rows.length === 0) return reply.code(404).send({ error: "Plan not found" });
    return rows[0];
  });

  // POST /api/plans
  fastify.post("/api/plans", async (request, reply) => {
    const { name, description, durationDays, price } = request.body;
    if (!name || !durationDays || !price) {
      return reply.code(400).send({ error: "name, durationDays and price are required" });
    }
    const [result] = await db.query(
      "INSERT INTO membership_plans (name, description, duration_days, price) VALUES (?, ?, ?, ?)",
      [name, description || null, durationDays, price]
    );
    return reply.code(201).send({ id: result.insertId, message: "Plan created" });
  });

  // PUT /api/plans/:id
  fastify.put("/api/plans/:id", async (request, reply) => {
    const { name, description, durationDays, price, status } = request.body;
    await db.query(
      "UPDATE membership_plans SET name=?, description=?, duration_days=?, price=?, status=? WHERE id=?",
      [name, description || null, durationDays, price, status || "active", request.params.id]
    );
    return { message: "Plan updated" };
  });

  // PATCH /api/plans/:id/toggle-status
  fastify.patch("/api/plans/:id/toggle-status", async (request) => {
    await db.query(
      "UPDATE membership_plans SET status = IF(status='active','inactive','active') WHERE id = ?",
      [request.params.id]
    );
    return { message: "Status toggled" };
  });

  // DELETE /api/plans/:id
  fastify.delete("/api/plans/:id", async (request, reply) => {
    const [[inUse]] = await db.query(
      "SELECT COUNT(*) AS count FROM members WHERE plan_id = ?", [request.params.id]
    );
    if (inUse.count > 0) {
      return reply.code(400).send({ error: `Cannot delete — ${inUse.count} member(s) are on this plan. Deactivate it instead.` });
    }
    await db.query("DELETE FROM membership_plans WHERE id = ?", [request.params.id]);
    return { message: "Plan deleted" };
  });
}

module.exports = planRoutes;