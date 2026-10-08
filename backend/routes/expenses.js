const db = require("../db");

async function expenseRoutes(fastify) {
  // GET /api/expenses?search=&type=&from=&to=
  fastify.get("/api/expenses", async (request) => {
    const { search = "", type = "all", from, to } = request.query;
    let sql = "SELECT * FROM expenses WHERE (title LIKE ? OR notes LIKE ?)";
    const params = [`%${search}%`, `%${search}%`];
    if (type !== "all") {
      sql += " AND expense_type = ?";
      params.push(type);
    }
    if (from) { sql += " AND expense_date >= ?"; params.push(from); }
    if (to) { sql += " AND expense_date <= ?"; params.push(to); }
    sql += " ORDER BY expense_date DESC";
    const [rows] = await db.query(sql, params);
    return rows;
  });

  // GET /api/expenses/:id
  fastify.get("/api/expenses/:id", async (request, reply) => {
    const [rows] = await db.query("SELECT * FROM expenses WHERE id = ?", [request.params.id]);
    if (rows.length === 0) return reply.code(404).send({ error: "Expense not found" });
    return rows[0];
  });

  // POST /api/expenses
  fastify.post("/api/expenses", async (request, reply) => {
    const { expenseType, title, amount, days, expenseDate, notes } = request.body;

    if (!expenseType || !amount || !days || !expenseDate) {
      return reply.code(400).send({ error: "expenseType, amount, days and expenseDate are required" });
    }

    const [result] = await db.query(
      `INSERT INTO expenses (expense_type, title, amount, days, expense_date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [expenseType, title || null, amount, days, expenseDate, notes || null]
    );
    return reply.code(201).send({ id: result.insertId, message: "Expense added" });
  });

  // PUT /api/expenses/:id
  fastify.put("/api/expenses/:id", async (request, reply) => {
    const { expenseType, title, amount, days, expenseDate, notes } = request.body;

    if (!expenseType || !amount || !days || !expenseDate) {
      return reply.code(400).send({ error: "expenseType, amount, days and expenseDate are required" });
    }

    const [[expense]] = await db.query("SELECT id FROM expenses WHERE id = ?", [request.params.id]);
    if (!expense) return reply.code(404).send({ error: "Expense not found" });

    await db.query(
      `UPDATE expenses SET expense_type=?, title=?, amount=?, days=?, expense_date=?, notes=? WHERE id=?`,
      [expenseType, title || null, amount, days, expenseDate, notes || null, request.params.id]
    );
    return { message: "Expense updated" };
  });

  // DELETE /api/expenses/:id
  fastify.delete("/api/expenses/:id", async (request) => {
    await db.query("DELETE FROM expenses WHERE id = ?", [request.params.id]);
    return { message: "Expense deleted" };
  });
}

module.exports = expenseRoutes;