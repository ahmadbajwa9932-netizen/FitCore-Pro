const pool = require("../db");
const { activationKeys } = require("../config/license");
const { computeChecksum, formatDate, todayStr } = require("../src/licenseHelper");
const { writeSnapshot, readSnapshot } = require("../src/licenseFileStore");

async function licenseRoutes(fastify) {
  fastify.get("/api/license/status", async (req, reply) => {
    const [rows] = await pool.query("SELECT * FROM license ORDER BY id DESC LIMIT 1");
    if (rows.length === 0) return { exists: false };

    const lic = rows[0];
    const expected = computeChecksum(lic);
    const tampered = expected !== lic.checksum;
    const expiryStr = formatDate(lic.expiry_date);
    const naturallyExpired = todayStr() > expiryStr;

    let status = "active";
    if (tampered) status = "tampered";
    else if (naturallyExpired || lic.status === "expired") status = "expired";

    return {
      exists: true,
      status,
      validDays: lic.valid_days,
      startDate: formatDate(lic.start_date),
      expiryDate: expiryStr,
      daysLeft:
        status === "active"
          ? Math.max(0, Math.ceil((new Date(expiryStr) - new Date(todayStr())) / 86400000))
          : 0,
    };
  });

  fastify.post("/api/license/activate", async (req, reply) => {
    const { days, activationKey } = req.body || {};
    const entry = activationKeys[days];
    if (!entry || entry.key !== activationKey) {
      return reply.code(400).send({ error: "Invalid activation key" });
    }

    const [existing] = await pool.query("SELECT id FROM license LIMIT 1");
    if (existing.length > 0) {
      return reply.code(400).send({ error: "License already activated" });
    }

    const start = new Date();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + entry.days);

    const licenseData = {
      valid_days: entry.days,
      start_date: formatDate(start),
      expiry_date: formatDate(expiry),
      status: "active",
    };
    const checksum = computeChecksum(licenseData);

    await pool.query(
      "INSERT INTO license (valid_days, start_date, expiry_date, status, checksum) VALUES (?, ?, ?, ?, ?)",
      [licenseData.valid_days, licenseData.start_date, licenseData.expiry_date, licenseData.status, checksum]
    );

    writeSnapshot(licenseData);

    return { success: true };
  });

  fastify.post("/api/license/renew", async (req, reply) => {
    const { days, activationKey } = req.body || {};
    const entry = activationKeys[days];
    if (!entry || entry.key !== activationKey) {
      return reply.code(400).send({ error: "Invalid activation key" });
    }

    const [rows] = await pool.query("SELECT * FROM license ORDER BY id DESC LIMIT 1");
    if (rows.length === 0) return reply.code(400).send({ error: "No license found" });

    const lic = rows[0];
    const tampered = computeChecksum(lic) !== lic.checksum;
    if (tampered) {
      return reply.code(400).send({ error: "License data tampered. Use Recover License instead." });
    }

    const naturallyExpired = todayStr() > formatDate(lic.expiry_date) || lic.status === "expired";
    if (!naturallyExpired) {
      return reply.code(400).send({ error: "License is still active" });
    }

    const start = new Date();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + entry.days);

    const licenseData = {
      valid_days: entry.days,
      start_date: formatDate(start),
      expiry_date: formatDate(expiry),
      status: "active",
    };
    const checksum = computeChecksum(licenseData);

    await pool.query(
      "UPDATE license SET valid_days=?, start_date=?, expiry_date=?, status=?, checksum=? WHERE id=?",
      [licenseData.valid_days, licenseData.start_date, licenseData.expiry_date, licenseData.status, checksum, lic.id]
    );

    writeSnapshot(licenseData);

    return { success: true };
  });

// Gate check for the "Renew Early" flow — just verifies the entered key
  // matches the shortest-duration key (M / 1 day) before showing the real
  // renewal form. This does NOT touch the license row.
  fastify.post("/api/license/verify-unlock", async (req, reply) => {
    const { activationKey } = req.body || {};
    const unlockEntry = activationKeys["M"];
    if (!unlockEntry || unlockEntry.key !== activationKey) {
      return reply.code(400).send({ error: "Incorrect unlock key" });
    }
    return { success: true };
  });

  // Renew Early — only allowed while the license is still active (not yet
  // naturally expired, not tampered). Adds the remaining days on the
  // current license to the newly purchased days, then resets start_date
  // to today and recalculates expiry_date from that combined total.
  fastify.post("/api/license/renew-early", async (req, reply) => {
    const { days, activationKey } = req.body || {};
    const entry = activationKeys[days];
    if (!entry || entry.key !== activationKey) {
      return reply.code(400).send({ error: "Invalid activation key" });
    }

    const [rows] = await pool.query("SELECT * FROM license ORDER BY id DESC LIMIT 1");
    if (rows.length === 0) return reply.code(400).send({ error: "No license found" });

    const lic = rows[0];
    const tampered = computeChecksum(lic) !== lic.checksum;
    if (tampered) {
      return reply.code(400).send({ error: "License data tampered. Use Recover License instead." });
    }

    const expiryStr = formatDate(lic.expiry_date);
    const today = todayStr();
    if (today > expiryStr || lic.status === "expired") {
      return reply.code(400).send({ error: "License already expired. Use Renew License instead." });
    }

    const remainingDays = Math.max(0, Math.round((new Date(expiryStr) - new Date(today)) / 86400000));
    const newValidDays = remainingDays + entry.days;

    const start = new Date();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + newValidDays);

    const licenseData = {
      valid_days: newValidDays,
      start_date: formatDate(start),
      expiry_date: formatDate(expiry),
      status: "active",
    };
    const checksum = computeChecksum(licenseData);

    await pool.query(
      "UPDATE license SET valid_days=?, start_date=?, expiry_date=?, status=?, checksum=? WHERE id=?",
      [licenseData.valid_days, licenseData.start_date, licenseData.expiry_date, licenseData.status, checksum, lic.id]
    );

    writeSnapshot(licenseData);

    return { success: true, remainingDaysAdded: remainingDays, newValidDays };
  });

  // Recover — restores the DB row to the exact trusted values held in the
  // encrypted file snapshot, regardless of which DB field(s) were tampered.
  fastify.post("/api/license/recover", async (req, reply) => {
    const { activationKey } = req.body || {};
    const isValidKey = Object.values(activationKeys).some((e) => e.key === activationKey);
    if (!isValidKey) {
      return reply.code(400).send({ error: "Invalid activation key" });
    }

    const [rows] = await pool.query("SELECT * FROM license ORDER BY id DESC LIMIT 1");
    if (rows.length === 0) return reply.code(400).send({ error: "No license found" });

    const snapshot = readSnapshot();
    if (!snapshot) {
      return reply.code(400).send({ error: "License file missing or corrupted. Contact support." });
    }

    // Re-evaluate status against today's date in case natural expiry
    // happened while the DB was in a tampered state.
    const status = todayStr() > snapshot.expiry_date ? "expired" : "active";
    const restored = { ...snapshot, status };
    const checksum = computeChecksum(restored);

    await pool.query(
      "UPDATE license SET valid_days=?, start_date=?, expiry_date=?, status=?, checksum=? WHERE id=?",
      [restored.valid_days, restored.start_date, restored.expiry_date, restored.status, checksum, rows[0].id]
    );

    return { success: true, status };
  });
}

module.exports = licenseRoutes;