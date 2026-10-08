const crypto = require("crypto");

const SECRET = process.env.LICENSE_SECRET || "change-this-in-env";

function formatDate(d) {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayStr() {
  return formatDate(new Date());
}

function computeChecksum({ valid_days, start_date, expiry_date, status }) {
  const payload = `${valid_days}|${formatDate(start_date)}|${formatDate(expiry_date)}|${status}`;
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

module.exports = { computeChecksum, formatDate, todayStr };