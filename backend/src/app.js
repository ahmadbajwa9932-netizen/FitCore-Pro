const path = require("path");
const fastify = require("fastify")({ logger: true });
const cors = require("@fastify/cors");
const cookie = require("@fastify/cookie");
const multipart = require("@fastify/multipart");
const fastifyStatic = require("@fastify/static");
const memberRoutes = require("../routes/members");
const planRoutes = require("../routes/plans");
const trainerRoutes = require("../routes/trainers");
const equipmentRoutes = require("../routes/equipment");
const billingRoutes = require("../routes/billing");
const shopRoutes = require("../routes/shop");
const salesRoutes = require("../routes/sales");
const authRoutes = require("../routes/auth");
const trialRoutes = require("../routes/trials");
const staffRoutes = require("../routes/staff");
const settingsRoutes = require("../routes/settings");
const expenseRoutes = require("../routes/expenses");
const dashboardRoutes = require("../routes/dashboard");
const reportsRoutes = require("../routes/reports");
const usersRoutes = require("../routes/users");
const { requireAuth } = require("../src/authMiddleware");
const { checkLicense } = require("../src/licenseMiddleware");
const licenseRoutes = require("../routes/license");

fastify.register(cors, {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
});
fastify.register(cookie);
fastify.register(multipart, { attachFieldsToBody: true });
fastify.register(fastifyStatic, {
  root: path.join(__dirname, "..", "downloads"),
  prefix: "/downloads/",
});

// License routes are public (status/activate/renew/recover)
fastify.register(licenseRoutes);

// Everything below requires an active, untampered license
fastify.addHook("onRequest", checkLicense);

// Auth routes are public (login/signup/business-info/status/logout)
fastify.register(authRoutes);

// Everything below requires a valid session
fastify.addHook("onRequest", requireAuth);

fastify.register(memberRoutes);
fastify.register(planRoutes);
fastify.register(trainerRoutes);
fastify.register(equipmentRoutes);
fastify.register(billingRoutes);
fastify.register(shopRoutes);
fastify.register(salesRoutes);
fastify.register(trialRoutes);
fastify.register(staffRoutes);
fastify.register(expenseRoutes);
fastify.register(dashboardRoutes);
fastify.register(reportsRoutes);
fastify.register(usersRoutes);
fastify.register(settingsRoutes);

module.exports = fastify;