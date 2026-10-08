const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE_SECRET = process.env.LICENSE_FILE_SECRET || "change-this-too-in-env";
const STORE_PATH = path.join(__dirname, "..", "storage", ".sysconf.dat");

const ALGO = "aes-256-cbc";

function getKey() {
  return crypto.createHash("sha256").update(FILE_SECRET).digest(); // 32 bytes
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(payload) {
  const [ivHex, dataHex] = payload.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

function sign(obj) {
  const payload = `${obj.valid_days}|${obj.start_date}|${obj.expiry_date}|${obj.status}`;
  return crypto.createHmac("sha256", FILE_SECRET).update(payload).digest("hex");
}

// Writes the trusted snapshot to disk. Called right after every successful
// activate/renew DB write, so file and DB should always agree.
function writeSnapshot({ valid_days, start_date, expiry_date, status }) {
  const data = { valid_days, start_date, expiry_date, status };
  data.sig = sign(data);

  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(STORE_PATH, encrypt(JSON.stringify(data)), "utf8");
}

// Returns the trusted snapshot, or null if missing/corrupted/tampered.
function readSnapshot() {
  if (!fs.existsSync(STORE_PATH)) return null;
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const data = JSON.parse(decrypt(raw));
    const { sig, ...rest } = data;
    if (sign(rest) !== sig) return null; // file itself was tampered
    return rest;
  } catch {
    return null; // corrupted / unreadable
  }
}

module.exports = { writeSnapshot, readSnapshot };