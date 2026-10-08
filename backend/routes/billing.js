const db = require("../db");

async function billingRoutes(fastify) {
  // GET /api/invoices?status=&search=
  fastify.get("/api/invoices", async (request) => {
    const { status = "all", search = "" } = request.query;
    let sql = `
      SELECT i.*, m.name AS member_name, m.phone AS member_phone
      FROM invoices i
      JOIN members m ON i.member_id = m.id
      WHERE m.name LIKE ?
    `;
    const params = [`%${search}%`];
    if (status !== "all") {
      sql += " AND i.status = ?";
      params.push(status);
    }
    sql += " ORDER BY i.created_at DESC";
    const [rows] = await db.query(sql, params);
    return rows;
  });

  // GET /api/invoices/:id/payments
  fastify.get("/api/invoices/:id/payments", async (request) => {
    const [rows] = await db.query(
      "SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at DESC",
      [request.params.id]
    );
    return rows;
  });

  // POST /api/invoices/:id/payments — add a payment against an existing invoice (installment)
  fastify.post("/api/invoices/:id/payments", async (request, reply) => {
    const { amount, method } = request.body;
    if (!amount || amount <= 0) return reply.code(400).send({ error: "A valid amount is required" });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [[invoice]] = await conn.query("SELECT * FROM invoices WHERE id = ?", [request.params.id]);
      if (!invoice) throw new Error("Invoice not found");

      const newPaid = Number(invoice.amount_paid) + Number(amount);
      if (newPaid > Number(invoice.total_amount)) {
        throw new Error(`Amount exceeds remaining due (Rs. ${invoice.total_amount - invoice.amount_paid})`);
      }

      await conn.query(
        "INSERT INTO payments (member_id, invoice_id, amount, method) VALUES (?, ?, ?, ?)",
        [invoice.member_id, invoice.id, amount, method || "cash"]
      );

      const newStatus = newPaid >= Number(invoice.total_amount) ? "paid" : "partial";
      await conn.query("UPDATE invoices SET amount_paid = ?, status = ? WHERE id = ?", [newPaid, newStatus, invoice.id]);

      await conn.commit();
      return reply.code(201).send({ message: "Payment recorded", newStatus });
    } catch (err) {
      await conn.rollback();
      return reply.code(500).send({ error: err.message });
    } finally {
      conn.release();
    }
  });

  // GET /api/revenue?from=&to=
  fastify.get("/api/revenue", async (request) => {
    const { from, to } = request.query;
    let sql = "SELECT SUM(amount) AS total, method FROM payments WHERE 1=1";
    const params = [];
    if (from) { sql += " AND paid_at >= ?"; params.push(from); }
    if (to) { sql += " AND paid_at <= ?"; params.push(to); }
    sql += " GROUP BY method";
    const [byMethod] = await db.query(sql, params);

    let totalSql = "SELECT SUM(amount) AS total FROM payments WHERE 1=1";
    if (from) totalSql += " AND paid_at >= ?";
    if (to) totalSql += " AND paid_at <= ?";
    const [[totalRow]] = await db.query(totalSql, params);

    return { total: totalRow.total || 0, byMethod };
  });
}

module.exports = billingRoutes;