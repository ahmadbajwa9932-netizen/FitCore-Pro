const db = require("../db");

async function trialRoutes(fastify) {
  // GET /api/trials?search=&status=
  fastify.get("/api/trials", async (request) => {
    const { search = "", status = "all" } = request.query;
    let sql = "SELECT * FROM trial_members WHERE (name LIKE ? OR phone LIKE ?)";
    const params = [`%${search}%`, `%${search}%`];
    if (status !== "all") {
      sql += " AND status = ?";
      params.push(status);
    }
    sql += " ORDER BY created_at DESC";
    const [rows] = await db.query(sql, params);
    return rows;
  });

  // GET /api/trials/:id
  fastify.get("/api/trials/:id", async (request, reply) => {
    const [rows] = await db.query("SELECT * FROM trial_members WHERE id = ?", [request.params.id]);
    if (rows.length === 0) return reply.code(404).send({ error: "Trial member not found" });
    return rows[0];
  });

  // POST /api/trials — add new trial member
  fastify.post("/api/trials", async (request, reply) => {
    const { name, phone, address, trialStartDate, trialEndDate, notes } = request.body;

    if (!name || !phone || !trialStartDate || !trialEndDate) {
      return reply.code(400).send({ error: "name, phone, trialStartDate and trialEndDate are required" });
    }

    const [result] = await db.query(
      `INSERT INTO trial_members (name, phone, address, trial_start_date, trial_end_date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, phone, address || null, trialStartDate, trialEndDate, notes || null]
    );
    return reply.code(201).send({ id: result.insertId, message: "Trial member added" });
  });

  // PUT /api/trials/:id — edit trial info
  fastify.put("/api/trials/:id", async (request, reply) => {
    const { name, phone, address, trialStartDate, trialEndDate, notes } = request.body;

    if (!name || !phone || !trialStartDate || !trialEndDate) {
      return reply.code(400).send({ error: "name, phone, trialStartDate and trialEndDate are required" });
    }

    const [[trial]] = await db.query("SELECT id FROM trial_members WHERE id = ?", [request.params.id]);
    if (!trial) return reply.code(404).send({ error: "Trial member not found" });

    await db.query(
      `UPDATE trial_members SET name=?, phone=?, address=?, trial_start_date=?, trial_end_date=?, notes=? WHERE id=?`,
      [name, phone, address || null, trialStartDate, trialEndDate, notes || null, request.params.id]
    );
    return { message: "Trial member updated" };
  });

  // PATCH /api/trials/:id/status — mark not_converted or back to ongoing
  fastify.patch("/api/trials/:id/status", async (request, reply) => {
    const { status } = request.body;
    if (!["ongoing", "not_converted"].includes(status)) {
      return reply.code(400).send({ error: "Invalid status" });
    }
    await db.query("UPDATE trial_members SET status = ? WHERE id = ?", [status, request.params.id]);
    return { message: "Status updated" };
  });

// PATCH /api/trials/:id/mark-converted — called from members/new after member is created there
fastify.patch("/api/trials/:id/mark-converted", async (request, reply) => {
    const { memberId } = request.body;
    if (!memberId) return reply.code(400).send({ error: "memberId is required" });
    await db.query(
      "UPDATE trial_members SET status = 'converted', converted_member_id = ? WHERE id = ?",
      [memberId, request.params.id]
    );
    return { message: "Trial marked as converted" };
  });

  // DELETE /api/trials/:id
  fastify.delete("/api/trials/:id", async (request) => {
    await db.query("DELETE FROM trial_members WHERE id = ?", [request.params.id]);
    return { message: "Trial member deleted" };
  });
}

module.exports = trialRoutes;