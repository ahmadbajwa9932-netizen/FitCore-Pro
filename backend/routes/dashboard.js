const db = require("../db");

async function dashboardRoutes(fastify) {
  // GET /api/dashboard/financial — revenue (membership + POS) and POS profit, monthly for last 6 months + totals
  fastify.get("/api/dashboard/financial", async () => {
    // Membership revenue per month (actual cash collected via payments table)
    const [membershipRows] = await db.query(`
      SELECT DATE_FORMAT(paid_at, '%Y-%m') AS month, SUM(amount) AS total
      FROM payments
      WHERE paid_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY month
    `);

    // POS revenue + profit per month
    const [posRows] = await db.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
        SUM(grand_total) AS revenue, SUM(profit) AS profit
      FROM sales
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY month
    `);

    // Merge into one array of the last 6 months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const monthly = months.map((month) => {
      const m = membershipRows.find((r) => r.month === month);
      const p = posRows.find((r) => r.month === month);
      return {
        month,
        membershipRevenue: Number(m?.total || 0),
        posRevenue: Number(p?.revenue || 0),
        posProfit: Number(p?.profit || 0),
      };
    });

    const totals = monthly.reduce(
      (acc, m) => ({
        membershipRevenue: acc.membershipRevenue + m.membershipRevenue,
        posRevenue: acc.posRevenue + m.posRevenue,
        posProfit: acc.posProfit + m.posProfit,
      }),
      { membershipRevenue: 0, posRevenue: 0, posProfit: 0 }
    );

    // This month specifically (for the stat cards)
    const currentMonth = months[5];
    const thisMonth = monthly.find((m) => m.month === currentMonth);

    return { monthly, totals, thisMonth };
  });


// GET /api/dashboard/stats — top stat cards
fastify.get("/api/dashboard/stats", async () => {
    const [[activeMembers]] = await db.query("SELECT COUNT(*) AS count FROM members WHERE status = 'active'");
    const [[expiringSoon]] = await db.query(
      "SELECT COUNT(*) AS count FROM members WHERE status = 'active' AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)"
    );
    const [[newThisMonth]] = await db.query(
      "SELECT COUNT(*) AS count FROM members WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())"
    );
    const [[todayRevenue]] = await db.query(
      "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE DATE(paid_at) = CURDATE()"
    );
    const [[monthRevenue]] = await db.query(
      "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE MONTH(paid_at) = MONTH(CURDATE()) AND YEAR(paid_at) = YEAR(CURDATE())"
    );
    const [[lowStock]] = await db.query("SELECT COUNT(*) AS count FROM shop_products WHERE quantity <= low_stock_threshold");
    const [[maintenanceDue]] = await db.query(`
      SELECT COUNT(*) AS count FROM (
        SELECT e.id,
          (SELECT em.next_due_date FROM equipment_maintenance em WHERE em.equipment_id = e.id ORDER BY em.maintenance_date DESC, em.id DESC LIMIT 1) AS next_due
        FROM equipment e
      ) t WHERE next_due IS NOT NULL AND next_due <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    `);

    return {
      activeMembers: activeMembers.count,
      expiringSoon: expiringSoon.count,
      newThisMonth: newThisMonth.count,
      todayRevenue: Number(todayRevenue.total),
      monthRevenue: Number(monthRevenue.total),
      lowStock: lowStock.count,
      maintenanceDue: maintenanceDue.count,
    };
  });

  // GET /api/dashboard/membership-trends
  fastify.get("/api/dashboard/membership-trends", async () => {
    const [historyRows] = await db.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, action, COUNT(*) AS count
      FROM membership_history
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month, action
      ORDER BY month
    `);

    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const monthly = months.map((month) => {
      const rows = historyRows.filter((r) => r.month === month);
      const newCount = rows.find((r) => r.action === "new")?.count || 0;
      const renewCount = rows
        .filter((r) => ["renew", "upgrade", "downgrade"].includes(r.action))
        .reduce((sum, r) => sum + r.count, 0);
      const cancelCount = rows.find((r) => r.action === "cancel")?.count || 0;
      return { month, new: Number(newCount), renewed: Number(renewCount), cancelled: Number(cancelCount) };
    });

    const [planPopularity] = await db.query(`
      SELECT p.name, COUNT(m.id) AS count
      FROM membership_plans p
      LEFT JOIN members m ON m.plan_id = p.id AND m.status = 'active'
      GROUP BY p.id, p.name
      HAVING count > 0
      ORDER BY count DESC
    `);

    const [[trialStats]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) AS converted
      FROM trial_members
    `);

    return {
      monthly,
      planPopularity: planPopularity.map((p) => ({ name: p.name, count: Number(p.count) })),
      trialConversion: {
        total: Number(trialStats.total || 0),
        converted: Number(trialStats.converted || 0),
        rate: trialStats.total > 0 ? Math.round((trialStats.converted / trialStats.total) * 100) : 0,
      },
    };
  });

  // GET /api/dashboard/operational
  fastify.get("/api/dashboard/operational", async () => {
    const [expiringMembers] = await db.query(`
      SELECT id, name, phone, expiry_date
      FROM members
      WHERE status = 'active' AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY expiry_date ASC
      LIMIT 10
    `);

    const [lowStockProducts] = await db.query(`
      SELECT id, name, quantity, low_stock_threshold
      FROM shop_products
      WHERE quantity <= low_stock_threshold
      ORDER BY quantity ASC
      LIMIT 10
    `);

    const [maintenanceDue] = await db.query(`
      SELECT e.id, e.name,
        (SELECT em.next_due_date FROM equipment_maintenance em WHERE em.equipment_id = e.id ORDER BY em.maintenance_date DESC, em.id DESC LIMIT 1) AS next_due
      FROM equipment e
      HAVING next_due IS NOT NULL AND next_due <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY next_due ASC
      LIMIT 10
    `);

    const [recentSales] = await db.query(`
      SELECT id, invoice_no, customer_name, grand_total, created_at
      FROM sales
      ORDER BY created_at DESC
      LIMIT 8
    `);

    return { expiringMembers, lowStockProducts, maintenanceDue, recentSales };
  });

}

module.exports = dashboardRoutes;