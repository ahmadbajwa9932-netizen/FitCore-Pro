const bcrypt = require("bcryptjs");
const pool = require("../db");

async function usersRoutes(fastify) {
  // List all admin/user accounts
  fastify.get("/api/users", async (req, reply) => {
    const [rows] = await pool.query(
      "SELECT id, username, email, role, created_at FROM admin_users ORDER BY id ASC"
    );
    return { users: rows };
  });

 // Create a new user/admin — requires the CURRENTLY LOGGED IN admin's password.
  // software_password_hash is NOT set by the creator — it's always inherited
  // from the very first admin account ever created (the original signup).
  fastify.post("/api/users", async (req, reply) => {
    const { username, email, password, confirmPassword, role, adminPassword } = req.body || {};

    if (!username || !email || !password || !adminPassword) {
      return reply.code(400).send({ error: "All fields are required" });
    }
    if (password !== confirmPassword) {
      return reply.code(400).send({ error: "Passwords do not match" });
    }

    const [meRows] = await pool.query("SELECT * FROM admin_users WHERE id = ?", [req.adminId]);
    if (meRows.length === 0) return reply.code(401).send({ error: "Not authenticated" });

    const passwordOk = await bcrypt.compare(adminPassword, meRows[0].password_hash);
    if (!passwordOk) {
      return reply.code(403).send({ error: "Incorrect admin password" });
    }

    const [existing] = await pool.query("SELECT id FROM admin_users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return reply.code(400).send({ error: "Email already in use" });
    }

    const [originalAdminRows] = await pool.query(
      "SELECT software_password_hash FROM admin_users ORDER BY id ASC LIMIT 1"
    );
    if (originalAdminRows.length === 0) {
      return reply.code(500).send({ error: "Original admin account not found" });
    }
    const sharedSoftwarePasswordHash = originalAdminRows[0].software_password_hash;

    const passwordHash = await bcrypt.hash(password, 10);
    const safeRole = role === "admin" ? "admin" : "user";

    await pool.query(
      "INSERT INTO admin_users (username, email, password_hash, software_password_hash, role) VALUES (?,?,?,?,?)",
      [username, email, passwordHash, sharedSoftwarePasswordHash, safeRole]
    );

    return { success: true };
  });

  // Edit a user/admin — requires the CURRENTLY LOGGED IN admin's password
  fastify.put("/api/users/:id", async (req, reply) => {
    const { id } = req.params;
    const { username, email, password, confirmPassword, role, adminPassword } = req.body || {};

    if (!username || !email || !adminPassword) {
      return reply.code(400).send({ error: "Username, email, and admin password are required" });
    }
    if (password && password !== confirmPassword) {
      return reply.code(400).send({ error: "Passwords do not match" });
    }

    const [meRows] = await pool.query("SELECT * FROM admin_users WHERE id = ?", [req.adminId]);
    if (meRows.length === 0) return reply.code(401).send({ error: "Not authenticated" });

    const passwordOk = await bcrypt.compare(adminPassword, meRows[0].password_hash);
    if (!passwordOk) {
      return reply.code(403).send({ error: "Incorrect admin password" });
    }

    const [targetRows] = await pool.query("SELECT id FROM admin_users WHERE id = ?", [id]);
    if (targetRows.length === 0) return reply.code(404).send({ error: "User not found" });

    const [emailClash] = await pool.query("SELECT id FROM admin_users WHERE email = ? AND id != ?", [email, id]);
    if (emailClash.length > 0) {
      return reply.code(400).send({ error: "Email already in use" });
    }

    const safeRole = role === "admin" ? "admin" : "user";

    // Note: software_password_hash is never touched here. It stays whatever
    // it was set to at creation time (inherited from the original admin),
    // and login password changes have no effect on it.
    if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query(
          "UPDATE admin_users SET username=?, email=?, role=?, password_hash=? WHERE id=?",
          [username, email, safeRole, passwordHash, id]
        );
      } else {
        await pool.query(
          "UPDATE admin_users SET username=?, email=?, role=? WHERE id=?",
          [username, email, safeRole, id]
        );
      }

    return { success: true };
  });

  // Delete a user/admin — requires the CURRENTLY LOGGED IN admin's password
  fastify.delete("/api/users/:id", async (req, reply) => {
    const { id } = req.params;
    const { adminPassword } = req.body || {};

    if (!adminPassword) {
      return reply.code(400).send({ error: "Admin password is required" });
    }

    const [meRows] = await pool.query("SELECT * FROM admin_users WHERE id = ?", [req.adminId]);
    if (meRows.length === 0) return reply.code(401).send({ error: "Not authenticated" });

    const passwordOk = await bcrypt.compare(adminPassword, meRows[0].password_hash);
    if (!passwordOk) {
      return reply.code(403).send({ error: "Incorrect admin password" });
    }

    if (Number(id) === req.adminId) {
      return reply.code(400).send({ error: "You cannot delete your own account" });
    }

    await pool.query("DELETE FROM admin_users WHERE id = ?", [id]);
    return { success: true };
  });
}

module.exports = usersRoutes;