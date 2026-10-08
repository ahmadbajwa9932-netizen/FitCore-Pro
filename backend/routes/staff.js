const db = require("../db");
const path = require("path");
const fs = require("fs");
const { pipeline } = require("stream/promises");

async function staffRoutes(fastify) {
  // GET /api/staff?search=&status=
  fastify.get("/api/staff", async (request) => {
    const { search = "", status = "all" } = request.query;
    let sql = "SELECT * FROM staff WHERE (name LIKE ? OR phone LIKE ? OR role LIKE ?)";
    const params = [`%${search}%`, `%${search}%`, `%${search}%`];
    if (status !== "all") {
      sql += " AND status = ?";
      params.push(status);
    }
    sql += " ORDER BY created_at DESC";
    const [rows] = await db.query(sql, params);
    return rows;
  });

  // GET /api/staff/:id
  fastify.get("/api/staff/:id", async (request, reply) => {
    const [rows] = await db.query("SELECT * FROM staff WHERE id = ?", [request.params.id]);
    if (rows.length === 0) return reply.code(404).send({ error: "Staff member not found" });
    return rows[0];
  });

  // POST /api/staff — multipart (photo upload)
  fastify.post("/api/staff", async (request, reply) => {
    const body = request.body;
    const val = (f) => (body[f] ? body[f].value : undefined);

    const name = val("name");
    const phone = val("phone");
    const email = val("email");
    const gender = val("gender");
    const role = val("role");
    const address = val("address");
    const emergencyName = val("emergencyName");
    const emergencyPhone = val("emergencyPhone");
    const joinDate = val("joinDate") || null;
    const employmentType = val("employmentType") || "salary";
    const baseSalary = Number(val("baseSalary") || 0);

    if (!name || !phone || !role) {
      return reply.code(400).send({ error: "name, phone and role are required" });
    }

    let photoUrl = null;
    if (body.image && body.image.filename) {
      const ext = path.extname(body.image.filename) || ".jpg";
      const safeName = `staff_${Date.now()}${ext}`;
      const destPath = path.join(__dirname, "..", "downloads", safeName);
      await pipeline(body.image.file, fs.createWriteStream(destPath));
      photoUrl = `/downloads/${safeName}`;
    }

    const [result] = await db.query(
      `INSERT INTO staff
       (name, phone, email, gender, role, address, emergency_name, emergency_phone,
        join_date, employment_type, base_salary, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, email, gender, role, address, emergencyName, emergencyPhone,
       joinDate, employmentType, baseSalary, photoUrl]
    );
    return reply.code(201).send({ id: result.insertId, message: "Staff member added" });
  });

  // PUT /api/staff/:id — multipart-aware, photo optional
  fastify.put("/api/staff/:id", async (request, reply) => {
    const body = request.body;
    const val = (f) => (body[f] ? body[f].value : undefined);

    const name = val("name");
    const phone = val("phone");
    const email = val("email");
    const gender = val("gender");
    const role = val("role");
    const address = val("address");
    const emergencyName = val("emergencyName");
    const emergencyPhone = val("emergencyPhone");
    const joinDate = val("joinDate") || null;
    const employmentType = val("employmentType") || "salary";
    const baseSalary = Number(val("baseSalary") || 0);

    if (!name || !phone || !role) {
      return reply.code(400).send({ error: "name, phone and role are required" });
    }

    let photoUrl;
    if (body.image && body.image.filename) {
      const ext = path.extname(body.image.filename) || ".jpg";
      const safeName = `staff_${Date.now()}${ext}`;
      const destPath = path.join(__dirname, "..", "downloads", safeName);
      await pipeline(body.image.file, fs.createWriteStream(destPath));
      photoUrl = `/downloads/${safeName}`;
    }

    const sql = photoUrl
      ? `UPDATE staff SET name=?, phone=?, email=?, gender=?, role=?, address=?,
         emergency_name=?, emergency_phone=?, join_date=?, employment_type=?, base_salary=?, photo_url=? WHERE id=?`
      : `UPDATE staff SET name=?, phone=?, email=?, gender=?, role=?, address=?,
         emergency_name=?, emergency_phone=?, join_date=?, employment_type=?, base_salary=? WHERE id=?`;
    const params = photoUrl
      ? [name, phone, email, gender, role, address, emergencyName, emergencyPhone, joinDate, employmentType, baseSalary, photoUrl, request.params.id]
      : [name, phone, email, gender, role, address, emergencyName, emergencyPhone, joinDate, employmentType, baseSalary, request.params.id];

    await db.query(sql, params);
    return { message: "Staff member updated" };
  });

  // PATCH /api/staff/:id/toggle-status
  fastify.patch("/api/staff/:id/toggle-status", async (request, reply) => {
    const [[staff]] = await db.query("SELECT status FROM staff WHERE id = ?", [request.params.id]);
    if (!staff) return reply.code(404).send({ error: "Staff member not found" });
    const newStatus = staff.status === "active" ? "inactive" : "active";
    await db.query("UPDATE staff SET status = ? WHERE id = ?", [newStatus, request.params.id]);
    return { message: `Staff member marked ${newStatus}`, status: newStatus };
  });

  // DELETE /api/staff/:id
  fastify.delete("/api/staff/:id", async (request) => {
    await db.query("DELETE FROM staff WHERE id = ?", [request.params.id]);
    return { message: "Staff member deleted" };
  });

  // GET /api/staff/:id/salary-payments
  fastify.get("/api/staff/:id/salary-payments", async (request) => {
    const [rows] = await db.query(
      "SELECT * FROM staff_salary_payments WHERE staff_id = ? ORDER BY pay_month DESC",
      [request.params.id]
    );
    return rows;
  });

  // POST /api/staff/:id/salary-payments
  fastify.post("/api/staff/:id/salary-payments", async (request, reply) => {
    const { amount, payMonth, notes } = request.body;
    if (!amount || !payMonth) {
      return reply.code(400).send({ error: "amount and payMonth are required" });
    }
    const [result] = await db.query(
      "INSERT INTO staff_salary_payments (staff_id, amount, pay_month, notes) VALUES (?, ?, ?, ?)",
      [request.params.id, amount, payMonth, notes || null]
    );
    return reply.code(201).send({ id: result.insertId, message: "Salary payment recorded" });
  });
}

module.exports = staffRoutes;