const db = require("../db");
const path = require("path");
const fs = require("fs");
const { pipeline } = require("stream/promises");

async function trainerRoutes(fastify) {
  // GET /api/trainers?search=&status=
  fastify.get("/api/trainers", async (request) => {
    const { search = "", status = "all" } = request.query;
    let sql = "SELECT * FROM trainers WHERE (name LIKE ? OR phone LIKE ?)";
    const params = [`%${search}%`, `%${search}%`];

    if (status !== "all") {
      sql += " AND status = ?";
      params.push(status);
    }
    sql += " ORDER BY created_at DESC";

    const [rows] = await db.query(sql, params);
    return rows;
  });

  // GET /api/trainers/:id
  fastify.get("/api/trainers/:id", async (request, reply) => {
    const [rows] = await db.query("SELECT * FROM trainers WHERE id = ?", [request.params.id]);
    if (rows.length === 0) return reply.code(404).send({ error: "Trainer not found" });
    return rows[0];
  });

  // POST /api/trainers
  fastify.post("/api/trainers", async (request, reply) => {
    const body = request.body;
    const val = (f) => (body[f] ? body[f].value : undefined);

    const name = val("name");
    const phone = val("phone");
    const email = val("email");
    const gender = val("gender");
    const specialization = val("specialization");
    const experienceYears = val("experienceYears");
    const employmentType = val("employmentType");
    const baseSalary = val("baseSalary");
    const sessionFee = val("sessionFee");

    if (!name || !phone) {
      return reply.code(400).send({ error: "name and phone are required" });
    }

    let photoUrl = null;
    if (body.image && body.image.filename) {
      const ext = path.extname(body.image.filename) || ".jpg";
      const safeName = `trainer_${Date.now()}${ext}`;
      const destPath = path.join(__dirname, "..", "downloads", safeName);
      await pipeline(body.image.file, fs.createWriteStream(destPath));
      photoUrl = `/downloads/${safeName}`;
    }

    const [result] = await db.query(
      `INSERT INTO trainers (name, phone, email, gender, specialization, experience_years, photo_url, employment_type, base_salary, session_fee)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, phone, email || null, gender || "male", specialization || null,
        experienceYears || 0, photoUrl,
        employmentType || "salary", baseSalary || 0, sessionFee || 0,
      ]
    );

    return reply.code(201).send({ id: result.insertId, message: "Trainer created" });
  });

  // GET /api/trainers/:id/members
  fastify.get("/api/trainers/:id/members", async (request) => {
    const [rows] = await db.query(
      `SELECT m.id, m.name, m.phone, m.status, p.name AS plan_name
       FROM members m
       LEFT JOIN membership_plans p ON m.plan_id = p.id
       WHERE m.trainer_id = ?
       ORDER BY m.name`,
      [request.params.id]
    );
    return rows;
  });

  // PUT /api/trainers/:id — multipart-aware, photo optional
  fastify.put("/api/trainers/:id", async (request, reply) => {
    const body = request.body;
    const val = (f) => (body[f] ? body[f].value : undefined);

    const name = val("name");
    const phone = val("phone");
    const email = val("email");
    const gender = val("gender");
    const specialization = val("specialization");
    const experienceYears = val("experienceYears");
    const employmentType = val("employmentType");
    const baseSalary = val("baseSalary");
    const sessionFee = val("sessionFee");

    if (!name || !phone) {
      return reply.code(400).send({ error: "name and phone are required" });
    }

    let photoUrl;
    if (body.image && body.image.filename) {
      const ext = path.extname(body.image.filename) || ".jpg";
      const safeName = `trainer_${Date.now()}${ext}`;
      const destPath = path.join(__dirname, "..", "downloads", safeName);
      await pipeline(body.image.file, fs.createWriteStream(destPath));
      photoUrl = `/downloads/${safeName}`;
    }

    const sql = photoUrl
      ? `UPDATE trainers SET name=?, phone=?, email=?, gender=?, specialization=?, experience_years=?, photo_url=?, employment_type=?, base_salary=?, session_fee=? WHERE id=?`
      : `UPDATE trainers SET name=?, phone=?, email=?, gender=?, specialization=?, experience_years=?, employment_type=?, base_salary=?, session_fee=? WHERE id=?`;

    const params = photoUrl
      ? [name, phone, email || null, gender, specialization || null, experienceYears || 0, photoUrl, employmentType || "salary", baseSalary || 0, sessionFee || 0, request.params.id]
      : [name, phone, email || null, gender, specialization || null, experienceYears || 0, employmentType || "salary", baseSalary || 0, sessionFee || 0, request.params.id];

    await db.query(sql, params);
    return { message: "Trainer updated" };
  });

  // PATCH /api/trainers/:id/toggle-status
  fastify.patch("/api/trainers/:id/toggle-status", async (request) => {
    await db.query(
      "UPDATE trainers SET status = IF(status='active','inactive','active') WHERE id = ?",
      [request.params.id]
    );
    return { message: "Status toggled" };
  });

  // DELETE /api/trainers/:id
  fastify.delete("/api/trainers/:id", async (request) => {
    await db.query("DELETE FROM trainers WHERE id = ?", [request.params.id]);
    return { message: "Trainer deleted" };
  });
  // GET /api/trainers/:id/salary-payments
  fastify.get("/api/trainers/:id/salary-payments", async (request) => {
    const [rows] = await db.query(
      "SELECT * FROM trainer_salary_payments WHERE trainer_id = ? ORDER BY pay_month DESC",
      [request.params.id]
    );
    return rows;
  });
  
  // POST /api/trainers/:id/salary-payments
  fastify.post("/api/trainers/:id/salary-payments", async (request, reply) => {
    const { amount, payMonth, notes } = request.body;
    if (!amount || !payMonth) {
      return reply.code(400).send({ error: "amount and payMonth are required" });
    }
    const [result] = await db.query(
      "INSERT INTO trainer_salary_payments (trainer_id, amount, pay_month, notes) VALUES (?, ?, ?, ?)",
      [request.params.id, amount, payMonth, notes || null]
    );
    return reply.code(201).send({ id: result.insertId, message: "Salary payment recorded" });
  });
}


module.exports = trainerRoutes;