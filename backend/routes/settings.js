const path = require("path");
const fs = require("fs");
const pool = require("../db");

async function settingsRoutes(fastify) {
  fastify.get("/api/settings/business-info", async (req, reply) => {
    const [rows] = await pool.query(
      "SELECT id, gym_name, address, contact_no, city, logo_url FROM business_info LIMIT 1"
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Business info not found" });
    return { business: rows[0] };
  });

  fastify.put("/api/settings/business-info", async (req, reply) => {
    const body = req.body;
    const gymName = body.gymName?.value;
    const address = body.address?.value;
    const contactNo = body.contactNo?.value;
    const city = body.city?.value;
    const logoFile = body.logo;
    const removeLogo = body.removeLogo?.value === "true";

    if (!gymName || !contactNo) {
      return reply.code(400).send({ error: "Gym name and contact number are required" });
    }

    const [existing] = await pool.query("SELECT id, logo_url FROM business_info LIMIT 1");
    if (existing.length === 0) {
      return reply.code(404).send({ error: "Business info not found" });
    }

    let logoUrl = existing[0].logo_url;

    if (logoFile && logoFile.filename) {
      const logosDir = path.join(__dirname, "..", "downloads", "logos");
      fs.mkdirSync(logosDir, { recursive: true });
      const fileName = `logo_${Date.now()}_${logoFile.filename}`;
      const buffer = await logoFile.toBuffer();
      fs.writeFileSync(path.join(logosDir, fileName), buffer);
      logoUrl = `/downloads/logos/${fileName}`;
    } else if (removeLogo) {
      logoUrl = null;
    }

    await pool.query(
      "UPDATE business_info SET gym_name=?, address=?, contact_no=?, city=?, logo_url=? WHERE id=?",
      [gymName, address, contactNo, city, logoUrl, existing[0].id]
    );

    return { success: true };
  });
}

module.exports = settingsRoutes;