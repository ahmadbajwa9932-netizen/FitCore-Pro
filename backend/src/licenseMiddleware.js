const pool = require("../db");
const { computeChecksum, todayStr } = require("./licenseHelper");

const PUBLIC_PREFIXES = ["/api/license", "/api/auth", "/downloads"];

async function checkLicense(request, reply) {
  if (request.method === "OPTIONS") return;
  if (PUBLIC_PREFIXES.some((p) => request.url.startsWith(p))) return;

  const [rows] = await pool.query("SELECT * FROM license ORDER BY id DESC LIMIT 1");
  if (rows.length === 0) {
    reply.code(403).send({ error: "License not activated", licenseStatus: "none" });
    return reply;
  }

  const lic = rows[0];
  const expected = computeChecksum(lic);
  if (expected !== lic.checksum) {
    reply.code(403).send({ error: "License invalid", licenseStatus: "tampered" });
    return reply;
  }

  if (todayStr() > require("./licenseHelper").formatDate(lic.expiry_date) || lic.status === "expired") {
    reply.code(403).send({ error: "License expired", licenseStatus: "expired" });
    return reply;
  }
}

module.exports = { checkLicense };