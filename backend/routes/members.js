const db = require("../db");
const path = require("path");
const fs = require("fs");
const { pipeline } = require("stream/promises");

async function memberRoutes(fastify) {
  // GET /api/members?search=&status=
  fastify.get("/api/members", async (request) => {
    const { search = "", status = "all" } = request.query;
    let sql = `
      SELECT m.*, p.name AS plan_name
      FROM members m
      LEFT JOIN membership_plans p ON m.plan_id = p.id
      WHERE (m.name LIKE ? OR m.phone LIKE ?)
    `;
    const params = [`%${search}%`, `%${search}%`];
    if (status !== "all") {
      sql += " AND m.status = ?";
      params.push(status);
    }
    sql += " ORDER BY m.created_at DESC";
    const [rows] = await db.query(sql, params);
    return rows;
  });

  // GET /api/members/:id
  fastify.get("/api/members/:id", async (request, reply) => {
    const [rows] = await db.query(
      `SELECT m.*, p.name AS plan_name, t.name AS trainer_name
       FROM members m
       LEFT JOIN membership_plans p ON m.plan_id = p.id
       LEFT JOIN trainers t ON m.trainer_id = t.id
       WHERE m.id = ?`,
      [request.params.id]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Member not found" });
    return rows[0];
  });

  // POST /api/members — now builds a full billing invoice (plan + trainer fee, discounts, change)
  fastify.post("/api/members", async (request, reply) => {
    const body = request.body;
    const val = (f) => (body[f] ? body[f].value : undefined);

    const name = val("name");
    const phone = val("phone");
    const email = val("email");
    const gender = val("gender");
    const dob = val("dob");
    const address = val("address");
    const emergencyName = val("emergencyName");
    const emergencyPhone = val("emergencyPhone");
    const planId = val("planId");
    const trainerId = val("trainerId") || null;
    const startDate = val("startDate");
    const expiryDateOverride = val("expiryDate") || null;
    const planDiscount = Number(val("planDiscount") || 0);
    const trainerDiscount = Number(val("trainerDiscount") || 0);
    const overallDiscount = Number(val("overallDiscount") || 0);
    const paymentAmount = Number(val("paymentAmount") || 0);
    const paymentMethod = val("paymentMethod") || "cash";

    if (!name || !phone || !planId || !startDate) {
      return reply.code(400).send({ error: "name, phone, planId and startDate are required" });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [[plan]] = await conn.query(
        "SELECT duration_days, price FROM membership_plans WHERE id = ?",
        [planId]
      );
      if (!plan) throw new Error("Invalid plan selected");

      let trainerFee = 0;
      if (trainerId) {
        const [[trainer]] = await conn.query("SELECT session_fee FROM trainers WHERE id = ?", [trainerId]);
        if (!trainer) throw new Error("Invalid trainer selected");
        trainerFee = Number(trainer.session_fee || 0);
      }

      const planAmount = Number(plan.price);
      const subtotal = (planAmount - planDiscount) + (trainerFee - trainerDiscount);
      const total = Math.max(0, subtotal - overallDiscount);

      const effectivePaid = Math.min(paymentAmount, total);
      const changeDue = Math.max(0, paymentAmount - total);
      const invoiceStatus = effectivePaid <= 0 ? "unpaid" : effectivePaid >= total ? "paid" : "partial";

      const expiryDate = expiryDateOverride
        ? expiryDateOverride
        : null; // will compute via SQL below if not overridden

      let photoUrl = null;
      if (body.image && body.image.filename) {
        const ext = path.extname(body.image.filename) || ".jpg";
        const safeName = `member_${Date.now()}${ext}`;
        const destPath = path.join(__dirname, "..", "downloads", safeName);
        await pipeline(body.image.file, fs.createWriteStream(destPath));
        photoUrl = `/downloads/${safeName}`;
      }

      let result;
      if (expiryDate) {
        [result] = await conn.query(
          `INSERT INTO members
           (name, phone, email, gender, dob, address, emergency_name, emergency_phone,
            plan_id, trainer_id, start_date, expiry_date, status, photo_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
          [name, phone, email, gender, dob, address, emergencyName, emergencyPhone,
           planId, trainerId, startDate, expiryDate, photoUrl]
        );
      } else {
        [result] = await conn.query(
          `INSERT INTO members
           (name, phone, email, gender, dob, address, emergency_name, emergency_phone,
            plan_id, trainer_id, start_date, expiry_date, status, photo_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(?, INTERVAL ? DAY), 'active', ?)`,
          [name, phone, email, gender, dob, address, emergencyName, emergencyPhone,
           planId, trainerId, startDate, startDate, plan.duration_days, photoUrl]
        );
      }

      const memberId = result.insertId;

      const [[memberRow]] = await conn.query("SELECT expiry_date FROM members WHERE id = ?", [memberId]);

      const [historyResult] = await conn.query(
        `INSERT INTO membership_history (member_id, plan_id, start_date, expiry_date, action)
         VALUES (?, ?, ?, ?, 'new')`,
        [memberId, planId, startDate, memberRow.expiry_date]
      );

      const [invoiceResult] = await conn.query(
        `INSERT INTO invoices
         (member_id, membership_history_id, description, plan_amount, plan_discount,
          trainer_fee, trainer_discount, overall_discount, total_amount, amount_paid, change_due, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [memberId, historyResult.insertId, "New Membership", planAmount, planDiscount,
         trainerFee, trainerDiscount, overallDiscount, total, effectivePaid, changeDue, invoiceStatus]
      );

      if (effectivePaid > 0) {
        await conn.query(
          `INSERT INTO payments (member_id, invoice_id, amount, method) VALUES (?, ?, ?, ?)`,
          [memberId, invoiceResult.insertId, effectivePaid, paymentMethod]
        );
      }

      await conn.commit();
      return reply.code(201).send({
        id: memberId,
        message: "Member created",
        invoice: {
          planAmount, planDiscount, trainerFee, trainerDiscount, overallDiscount,
          total, paid: effectivePaid, changeDue, status: invoiceStatus,
        },
        expiryDate: memberRow.expiry_date,
      });
    } catch (err) {
      await conn.rollback();
      return reply.code(500).send({ error: err.message });
    } finally {
      conn.release();
    }
  });

  // GET /api/members/:id/history
  fastify.get("/api/members/:id/history", async (request) => {
    const [rows] = await db.query(
      `SELECT h.*, p.name AS plan_name
       FROM membership_history h
       LEFT JOIN membership_plans p ON h.plan_id = p.id
       WHERE h.member_id = ?
       ORDER BY h.created_at DESC`,
      [request.params.id]
    );
    return rows;
  });

  // GET /api/members/:id/invoices
  fastify.get("/api/members/:id/invoices", async (request) => {
    const [invoices] = await db.query(
      "SELECT * FROM invoices WHERE member_id = ? ORDER BY created_at DESC",
      [request.params.id]
    );
    const [payments] = await db.query(
      "SELECT * FROM payments WHERE member_id = ? ORDER BY paid_at DESC",
      [request.params.id]
    );
    return invoices.map((inv) => ({ ...inv, payments: payments.filter((p) => p.invoice_id === inv.id) }));
  });

  // PUT /api/members/:id — multipart-aware, photo optional
  fastify.put("/api/members/:id", async (request, reply) => {
    const body = request.body;
    const val = (f) => (body[f] ? body[f].value : undefined);
    const name = val("name");
    const phone = val("phone");
    const email = val("email");
    const gender = val("gender");
    const dob = val("dob");
    const address = val("address");
    const emergencyName = val("emergencyName");
    const emergencyPhone = val("emergencyPhone");
    const trainerId = val("trainerId");

    let photoUrl;
    if (body.image && body.image.filename) {
      const ext = path.extname(body.image.filename) || ".jpg";
      const safeName = `member_${Date.now()}${ext}`;
      const destPath = path.join(__dirname, "..", "downloads", safeName);
      await pipeline(body.image.file, fs.createWriteStream(destPath));
      photoUrl = `/downloads/${safeName}`;
    }

    const sql = photoUrl
      ? `UPDATE members SET name=?, phone=?, email=?, gender=?, dob=?, address=?,
         emergency_name=?, emergency_phone=?, trainer_id=?, photo_url=? WHERE id=?`
      : `UPDATE members SET name=?, phone=?, email=?, gender=?, dob=?, address=?,
         emergency_name=?, emergency_phone=?, trainer_id=? WHERE id=?`;
    const params = photoUrl
      ? [name, phone, email, gender, dob, address, emergencyName, emergencyPhone, trainerId || null, photoUrl, request.params.id]
      : [name, phone, email, gender, dob, address, emergencyName, emergencyPhone, trainerId || null, request.params.id];

    await db.query(sql, params);
    return { message: "Member updated" };
  });

  // POST /api/members/:id/renew — now supports trainer assignment + full discount billing
  fastify.post("/api/members/:id/renew", async (request, reply) => {
    const {
      planId, trainerId, paymentAmount, paymentMethod, expiryDate,
      planDiscount, trainerDiscount, overallDiscount,
    } = request.body;
    if (!planId) return reply.code(400).send({ error: "planId is required" });

    const planDiscountNum = Number(planDiscount || 0);
    const trainerDiscountNum = Number(trainerDiscount || 0);
    const overallDiscountNum = Number(overallDiscount || 0);
    const paymentAmountNum = Number(paymentAmount || 0);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [[member]] = await conn.query("SELECT expiry_date, status FROM members WHERE id = ?", [request.params.id]);
      if (!member) throw new Error("Member not found");

      const [[plan]] = await conn.query("SELECT duration_days, price FROM membership_plans WHERE id = ?", [planId]);
      if (!plan) throw new Error("Invalid plan selected");

      let trainerFee = 0;
      const resolvedTrainerId = trainerId || null;
      if (resolvedTrainerId) {
        const [[trainer]] = await conn.query("SELECT session_fee FROM trainers WHERE id = ?", [resolvedTrainerId]);
        if (!trainer) throw new Error("Invalid trainer selected");
        trainerFee = Number(trainer.session_fee || 0);
      }

      const planAmount = Number(plan.price);
      const subtotal = (planAmount - planDiscountNum) + (trainerFee - trainerDiscountNum);
      const total = Math.max(0, subtotal - overallDiscountNum);
      const effectivePaid = Math.min(paymentAmountNum, total);
      const changeDue = Math.max(0, paymentAmountNum - total);
      const invoiceStatus = effectivePaid <= 0 ? "unpaid" : effectivePaid >= total ? "paid" : "partial";

      let newExpiry;
      if (expiryDate) {
        newExpiry = expiryDate;
      } else {
        const [[calc]] = await conn.query(
          `SELECT DATE_ADD(GREATEST(CURDATE(), ?), INTERVAL ? DAY) AS new_expiry`,
          [member.expiry_date, plan.duration_days]
        );
        newExpiry = calc.new_expiry;
      }

      await conn.query(
        "UPDATE members SET plan_id = ?, trainer_id = ?, expiry_date = ?, status = 'active', frozen_at = NULL WHERE id = ?",
        [planId, resolvedTrainerId, newExpiry, request.params.id]
      );

      const [historyResult] = await conn.query(
        `INSERT INTO membership_history (member_id, plan_id, start_date, expiry_date, action)
         VALUES (?, ?, CURDATE(), ?, 'renew')`,
        [request.params.id, planId, newExpiry]
      );

      const [invoiceResult] = await conn.query(
        `INSERT INTO invoices
         (member_id, membership_history_id, description, plan_amount, plan_discount,
          trainer_fee, trainer_discount, overall_discount, total_amount, amount_paid, change_due, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [request.params.id, historyResult.insertId, "Membership Renewal", planAmount, planDiscountNum,
         trainerFee, trainerDiscountNum, overallDiscountNum, total, effectivePaid, changeDue, invoiceStatus]
      );

      if (effectivePaid > 0) {
        await conn.query(
          "INSERT INTO payments (member_id, invoice_id, amount, method) VALUES (?, ?, ?, ?)",
          [request.params.id, invoiceResult.insertId, effectivePaid, paymentMethod || "cash"]
        );
      }

      await conn.commit();
      return {
        message: "Membership renewed",
        newExpiry,
        invoice: {
          planAmount, planDiscount: planDiscountNum, trainerFee, trainerDiscount: trainerDiscountNum,
          overallDiscount: overallDiscountNum, total, paid: effectivePaid, changeDue, status: invoiceStatus,
        },
      };
    } catch (err) {
      await conn.rollback();
      return reply.code(500).send({ error: err.message });
    } finally {
      conn.release();
    }
  });

  // PATCH /api/members/:id/freeze
  fastify.patch("/api/members/:id/freeze", async (request) => {
    await db.query("UPDATE members SET status = 'frozen', frozen_at = CURDATE() WHERE id = ?", [request.params.id]);
    return { message: "Member frozen" };
  });

  // PATCH /api/members/:id/resume
  fastify.patch("/api/members/:id/resume", async (request, reply) => {
    const [[member]] = await db.query("SELECT frozen_at, expiry_date FROM members WHERE id = ?", [request.params.id]);
    if (!member || !member.frozen_at) return reply.code(400).send({ error: "Member is not frozen" });
    await db.query(
      `UPDATE members SET status = 'active',
       expiry_date = DATE_ADD(expiry_date, INTERVAL DATEDIFF(CURDATE(), frozen_at) DAY),
       frozen_at = NULL WHERE id = ?`,
      [request.params.id]
    );
    return { message: "Membership resumed" };
  });

  // DELETE /api/members/:id
  fastify.delete("/api/members/:id", async (request) => {
    await db.query("DELETE FROM members WHERE id = ?", [request.params.id]);
    return { message: "Member deleted" };
  });
}

module.exports = memberRoutes;