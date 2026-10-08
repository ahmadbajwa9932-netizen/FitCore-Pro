const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const pool = require("../db"); // adjust path if needed
const { sendOtpEmail } = require("../src/mailer");

const SESSION_HOURS = 24;

async function authRoutes(fastify) {

    // Get known emails for login/reset dropdown
  fastify.get("/api/auth/known-emails", async (req, reply) => {
    const [rows] = await pool.query("SELECT email FROM admin_users");
    return { emails: rows.map((r) => r.email) };
  });

  // Check setup status
  fastify.get("/api/auth/status", async (req, reply) => {
    const [biz] = await pool.query("SELECT id, gym_name, logo_url FROM business_info LIMIT 1");
    const [admin] = await pool.query("SELECT id FROM admin_users LIMIT 1");
    return {
      businessSetup: biz.length > 0,
      adminExists: admin.length > 0,
      business: biz[0] || null,
    };
  });

  // Save business info (once)
  fastify.post("/api/auth/business-info", async (req, reply) => {
    const body = req.body;
    const gymName = body.gymName?.value;
    const address = body.address?.value;
    const contactNo = body.contactNo?.value;
    const city = body.city?.value;
    const logoFile = body.logo;

    if (!gymName || !contactNo) {
      return reply.code(400).send({ error: "Gym name and contact number are required" });
    }

    let logoUrl = null;
    if (logoFile && logoFile.filename) {
      const logosDir = path.join(__dirname, "..", "downloads", "logos");
      fs.mkdirSync(logosDir, { recursive: true });
      const fileName = `logo_${Date.now()}_${logoFile.filename}`;
      const buffer = await logoFile.toBuffer();
      fs.writeFileSync(path.join(logosDir, fileName), buffer);
      logoUrl = `/downloads/logos/${fileName}`;
    }

    const [existing] = await pool.query("SELECT id FROM business_info LIMIT 1");
    if (existing.length > 0) {
      await pool.query(
        "UPDATE business_info SET gym_name=?, address=?, contact_no=?, city=?, logo_url=COALESCE(?, logo_url) WHERE id=?",
        [gymName, address, contactNo, city, logoUrl, existing[0].id]
      );
    } else {
      await pool.query(
        "INSERT INTO business_info (gym_name, address, contact_no, city, logo_url) VALUES (?,?,?,?,?)",
        [gymName, address, contactNo, city, logoUrl]
      );
    }

    return { success: true };
  });

  // Signup (create the single admin account)
  fastify.post("/api/auth/signup", async (req, reply) => {
    const { username, email, password, confirmPassword, softwarePassword, confirmSoftwarePassword } = req.body;

    const [existingAdmin] = await pool.query("SELECT id FROM admin_users LIMIT 1");
    if (existingAdmin.length > 0) {
      return reply.code(400).send({ error: "Admin account already exists" });
    }
    if (!username || !email || !password || !softwarePassword) {
      return reply.code(400).send({ error: "All fields are required" });
    }
    if (password !== confirmPassword) {
      return reply.code(400).send({ error: "Passwords do not match" });
    }
    if (softwarePassword !== confirmSoftwarePassword) {
      return reply.code(400).send({ error: "Software passwords do not match" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const softwarePasswordHash = await bcrypt.hash(softwarePassword, 10);

    await pool.query(
      "INSERT INTO admin_users (username, email, password_hash, software_password_hash, role) VALUES (?,?,?,?,'admin')",
      [username, email, passwordHash, softwarePasswordHash]
    );

    return { success: true };
  });

  // Login
  fastify.post("/api/auth/login", async (req, reply) => {
    const { email, password, softwarePassword } = req.body;
    if (!email || !password || !softwarePassword) {
      return reply.code(400).send({ error: "All fields are required" });
    }

    const [rows] = await pool.query("SELECT * FROM admin_users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    const admin = rows[0];
    const passwordOk = await bcrypt.compare(password, admin.password_hash);
    const softwareOk = await bcrypt.compare(softwarePassword, admin.software_password_hash);

    if (!passwordOk || !softwareOk) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const sessionId = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);

    await pool.query(
      "INSERT INTO sessions (id, admin_id, expires_at) VALUES (?,?,?)",
      [sessionId, admin.id, expiresAt]
    );

    reply.setCookie("gym_session", sessionId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_HOURS * 60 * 60,
    });

    return { success: true, username: admin.username };
  });

 // Current session check
 fastify.get("/api/auth/me", async (req, reply) => {
    const sessionId = req.cookies?.gym_session;
    if (!sessionId) return reply.code(401).send({ error: "Not authenticated" });

    const [rows] = await pool.query(
      `SELECT a.id, a.username, a.email, a.role FROM sessions s
       JOIN admin_users a ON a.id = s.admin_id
       WHERE s.id = ? AND s.expires_at > NOW()`,
      [sessionId]
    );

    if (rows.length === 0) return reply.code(401).send({ error: "Session expired" });
    return { admin: rows[0] };
  });

// Logout
fastify.post("/api/auth/logout", async (req, reply) => {
    const sessionId = req.cookies?.gym_session;
    if (sessionId) await pool.query("DELETE FROM sessions WHERE id = ?", [sessionId]);
    reply.clearCookie("gym_session", { path: "/" });
    return { success: true };
  });

  // Step 1: request OTP
  fastify.post("/api/auth/forgot-password", async (req, reply) => {
    const { email } = req.body;
    if (!email) return reply.code(400).send({ error: "Email is required" });

    const [rows] = await pool.query("SELECT id FROM admin_users WHERE email = ?", [email]);
    if (rows.length === 0) {
      // Don't reveal whether the email exists
      return { success: true };
    }

    const adminId = rows[0].id;
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query("DELETE FROM password_resets WHERE admin_id = ?", [adminId]);
    await pool.query(
      "INSERT INTO password_resets (admin_id, otp, expires_at) VALUES (?,?,?)",
      [adminId, otp, expiresAt]
    );

    try {
      await sendOtpEmail(email, otp);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Failed to send email. Check SMTP credentials." });
    }

    return { success: true };
  });

  // Step 2: verify OTP + set new password
  fastify.post("/api/auth/reset-password", async (req, reply) => {
    const { email, otp, newPassword, confirmNewPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return reply.code(400).send({ error: "All fields are required" });
    }
    if (newPassword !== confirmNewPassword) {
      return reply.code(400).send({ error: "Passwords do not match" });
    }

    const [rows] = await pool.query("SELECT id FROM admin_users WHERE email = ?", [email]);
    if (rows.length === 0) return reply.code(400).send({ error: "Invalid or expired code" });
    const adminId = rows[0].id;

    const [resetRows] = await pool.query(
      "SELECT * FROM password_resets WHERE admin_id = ? AND otp = ? AND expires_at > NOW()",
      [adminId, otp]
    );
    if (resetRows.length === 0) return reply.code(400).send({ error: "Invalid or expired code" });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE admin_users SET password_hash = ? WHERE id = ?", [passwordHash, adminId]);
    await pool.query("DELETE FROM password_resets WHERE admin_id = ?", [adminId]);
    await pool.query("DELETE FROM sessions WHERE admin_id = ?", [adminId]); // force re-login everywhere

    return { success: true };
  });
}

module.exports = authRoutes;