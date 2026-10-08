const pool = require("../db"); // adjust path if your pool lives elsewhere

const PUBLIC_PREFIXES = ["/api/auth", "/api/license", "/downloads"];

async function requireAuth(request, reply) {
  if (request.method === "OPTIONS") return;
  if (PUBLIC_PREFIXES.some((p) => request.url.startsWith(p))) return;

  const sessionId = request.cookies?.gym_session;
  if (!sessionId) {
    reply.code(401).send({ error: "Not authenticated" });
    return reply;
  }

  const [rows] = await pool.query(
    "SELECT * FROM sessions WHERE id = ? AND expires_at > NOW()",
    [sessionId]
  );

  if (rows.length === 0) {
    reply.code(401).send({ error: "Session expired" });
    return reply;
  }

  request.adminId = rows[0].admin_id;
}

module.exports = { requireAuth };