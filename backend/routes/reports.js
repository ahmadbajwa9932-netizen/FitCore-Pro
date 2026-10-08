const db = require("../db");

async function reportsRoutes(fastify) {
  // GET /api/reports/revenue?from=&to=&groupBy=day|month
  fastify.get("/api/reports/revenue", async (request) => {
    const { groupBy = "day" } = request.query;
    const to = request.query.to || new Date().toISOString().slice(0, 10);
    const from = request.query.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const fmt = groupBy === "month" ? "%Y-%m" : "%Y-%m-%d";

    const [membershipByPeriod] = await db.query(
      `SELECT DATE_FORMAT(paid_at, '${fmt}') AS period, SUM(amount) AS total
       FROM payments WHERE paid_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY period ORDER BY period`,
      [from, to]
    );

    const [posByPeriod] = await db.query(
      `SELECT DATE_FORMAT(created_at, '${fmt}') AS period, SUM(grand_total) AS revenue, SUM(profit) AS profit
       FROM sales WHERE created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY period ORDER BY period`,
      [from, to]
    );

    const periodsSet = new Set([...membershipByPeriod.map((r) => r.period), ...posByPeriod.map((r) => r.period)]);
    const byPeriod = [...periodsSet].sort().map((period) => ({
      period,
      membershipRevenue: Number(membershipByPeriod.find((r) => r.period === period)?.total || 0),
      posRevenue: Number(posByPeriod.find((r) => r.period === period)?.revenue || 0),
      posProfit: Number(posByPeriod.find((r) => r.period === period)?.profit || 0),
    }));

    const [membershipByMethod] = await db.query(
      `SELECT method, SUM(amount) AS total FROM payments
       WHERE paid_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY) GROUP BY method`,
      [from, to]
    );
    const [posByMethod] = await db.query(
      `SELECT payment_method AS method, SUM(grand_total) AS total FROM sales
       WHERE created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY) GROUP BY payment_method`,
      [from, to]
    );
    const methodsSet = new Set([...membershipByMethod.map((r) => r.method), ...posByMethod.map((r) => r.method)]);
    const byPaymentMethod = [...methodsSet].map((method) => ({
      method,
      membershipAmount: Number(membershipByMethod.find((r) => r.method === method)?.total || 0),
      posAmount: Number(posByMethod.find((r) => r.method === method)?.total || 0),
    }));

    const [[totalBilledRow]] = await db.query(
      `SELECT COALESCE(SUM(total_amount),0) AS total FROM invoices WHERE created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`,
      [from, to]
    );
    const [[membershipCollectedRow]] = await db.query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE paid_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`,
      [from, to]
    );
    const [[posRow]] = await db.query(
      `SELECT COALESCE(SUM(grand_total),0) AS revenue, COALESCE(SUM(profit),0) AS profit FROM sales
       WHERE created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`,
      [from, to]
    );

    const membershipCollected = Number(membershipCollectedRow.total);
    const totalBilled = Number(totalBilledRow.total);

    return {
      range: { from, to, groupBy },
      summary: {
        membershipCollected,
        posRevenue: Number(posRow.revenue),
        posProfit: Number(posRow.profit),
        totalBilled,
        outstanding: Math.max(0, totalBilled - membershipCollected),
      },
      byPeriod,
      byPaymentMethod,
    };
  });

  // GET /api/reports/membership?from=&to=&groupBy=day|month
  fastify.get("/api/reports/membership", async (request) => {
    const { groupBy = "month" } = request.query;
    const to = request.query.to || new Date().toISOString().slice(0, 10);
    const from = request.query.from || new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
    const fmt = groupBy === "month" ? "%Y-%m" : "%Y-%m-%d";

    const [statusCounts] = await db.query("SELECT status, COUNT(*) AS count FROM members GROUP BY status");

    const [historyRows] = await db.query(
      `SELECT DATE_FORMAT(created_at, '${fmt}') AS period, action, COUNT(*) AS count
       FROM membership_history WHERE created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY period, action ORDER BY period`,
      [from, to]
    );
    const periodsSet = new Set(historyRows.map((r) => r.period));
    const trend = [...periodsSet].sort().map((period) => {
      const rows = historyRows.filter((r) => r.period === period);
      return {
        period,
        new: Number(rows.find((r) => r.action === "new")?.count || 0),
        renewed: rows.filter((r) => ["renew", "upgrade", "downgrade"].includes(r.action)).reduce((s, r) => s + Number(r.count), 0),
        cancelled: Number(rows.find((r) => r.action === "cancel")?.count || 0),
      };
    });

    const [planBreakdown] = await db.query(
      `SELECT mp.name,
         COUNT(DISTINCT CASE WHEN m.status = 'active' THEN m.id END) AS activeMembers,
         COALESCE(SUM(i.total_amount), 0) AS revenue
       FROM membership_plans mp
       LEFT JOIN membership_history mh ON mh.plan_id = mp.id AND mh.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
       LEFT JOIN invoices i ON i.membership_history_id = mh.id
       LEFT JOIN members m ON m.plan_id = mp.id
       GROUP BY mp.id, mp.name
       HAVING activeMembers > 0 OR revenue > 0
       ORDER BY revenue DESC`,
      [from, to]
    );

    const [[expiryForecast]] = await db.query(`
      SELECT
        SUM(CASE WHEN expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS in7,
        SUM(CASE WHEN expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 15 DAY) THEN 1 ELSE 0 END) AS in15,
        SUM(CASE WHEN expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS in30
      FROM members WHERE status = 'active'
    `);

    return {
      range: { from, to, groupBy },
      statusCounts: statusCounts.map((r) => ({ status: r.status, count: Number(r.count) })),
      trend,
      planBreakdown: planBreakdown.map((r) => ({
        name: r.name, activeMembers: Number(r.activeMembers), revenue: Number(r.revenue),
      })),
      expiryForecast: {
        in7: Number(expiryForecast.in7 || 0),
        in15: Number(expiryForecast.in15 || 0),
        in30: Number(expiryForecast.in30 || 0),
      },
    };
  });
  // GET /api/reports/sales?from=&to=&groupBy=day|month
  fastify.get("/api/reports/sales", async (request) => {
      const { groupBy = "day" } = request.query;
      const to = request.query.to || new Date().toISOString().slice(0, 10);
      const from = request.query.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const fmt = groupBy === "month" ? "%Y-%m" : "%Y-%m-%d";
  
      const [[summaryRow]] = await db.query(
        `SELECT COUNT(*) AS saleCount, COALESCE(SUM(grand_total),0) AS revenue, COALESCE(SUM(profit),0) AS profit
         FROM sales WHERE created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`,
        [from, to]
      );
  
      const [byPeriod] = await db.query(
        `SELECT DATE_FORMAT(created_at, '${fmt}') AS period, SUM(grand_total) AS revenue, SUM(profit) AS profit
         FROM sales WHERE created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
         GROUP BY period ORDER BY period`,
        [from, to]
      );
  
      const [byPaymentMethod] = await db.query(
        `SELECT payment_method AS method, COUNT(*) AS count, SUM(grand_total) AS total
         FROM sales WHERE created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
         GROUP BY payment_method`,
        [from, to]
      );
  
      const [bestByQty] = await db.query(
        `SELECT si.product_name, SUM(si.quantity) AS qty, SUM(si.line_total) AS revenue
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         WHERE s.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
         GROUP BY si.product_name ORDER BY qty DESC LIMIT 10`,
        [from, to]
      );
  
      const [bestByRevenue] = await db.query(
        `SELECT si.product_name, SUM(si.quantity) AS qty, SUM(si.line_total) AS revenue
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         WHERE s.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
         GROUP BY si.product_name ORDER BY revenue DESC LIMIT 10`,
        [from, to]
      );
  
      const [profitMargin] = await db.query(
        `SELECT si.product_name,
           SUM(si.line_total) AS revenue,
           SUM(
             CASE WHEN si.tax_type = 'percent'
               THEN si.line_total / (1 + si.tax_value / 100)
               ELSE si.line_total - si.tax_value
             END
           ) AS revenueExclTax,
           SUM(si.purchase_price * si.quantity) AS cost
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         WHERE s.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
         GROUP BY si.product_name ORDER BY revenue DESC`,
        [from, to]
      );
  
      return {
        range: { from, to, groupBy },
        summary: {
          saleCount: Number(summaryRow.saleCount),
          revenue: Number(summaryRow.revenue),
          profit: Number(summaryRow.profit),
          avgOrderValue: summaryRow.saleCount > 0 ? Number(summaryRow.revenue) / Number(summaryRow.saleCount) : 0,
        },
        byPeriod: byPeriod.map((r) => ({ period: r.period, revenue: Number(r.revenue), profit: Number(r.profit) })),
        byPaymentMethod: byPaymentMethod.map((r) => ({ method: r.method, count: Number(r.count), total: Number(r.total) })),
        bestByQty: bestByQty.map((r) => ({ name: r.product_name, qty: Number(r.qty), revenue: Number(r.revenue) })),
        bestByRevenue: bestByRevenue.map((r) => ({ name: r.product_name, qty: Number(r.qty), revenue: Number(r.revenue) })),
        profitMargin: profitMargin.map((r) => {
          const revenue = Number(r.revenue);
          const revenueExclTax = Number(r.revenueExclTax);
          const cost = Number(r.cost);
          const profit = revenueExclTax - cost;
          return {
            name: r.product_name, revenue, cost, profit,
            marginPct: revenueExclTax > 0 ? Math.round((profit / revenueExclTax) * 100) : 0,
          };
        }),
      };
    });
  
    // GET /api/reports/trainers?from=&to=
    fastify.get("/api/reports/trainers", async (request) => {
      const to = request.query.to || new Date().toISOString().slice(0, 10);
      const from = request.query.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  
      const [trainers] = await db.query(`
        SELECT id, name, session_fee, status FROM trainers ORDER BY name
      `);
  
      const [assignedCounts] = await db.query(`
        SELECT trainer_id, COUNT(*) AS count FROM members WHERE status = 'active' AND trainer_id IS NOT NULL GROUP BY trainer_id
      `);
  
      const [feesCollected] = await db.query(
        `SELECT m.trainer_id, COALESCE(SUM(i.trainer_fee - i.trainer_discount), 0) AS total
         FROM invoices i
         JOIN members m ON m.id = i.member_id
         WHERE m.trainer_id IS NOT NULL AND i.created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
         GROUP BY m.trainer_id`,
        [from, to]
      );
  
      const [salaryPaid] = await db.query(
        `SELECT trainer_id, COALESCE(SUM(amount), 0) AS total
         FROM trainer_salary_payments
         WHERE paid_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
         GROUP BY trainer_id`,
        [from, to]
      );
  
      const report = trainers.map((t) => {
        const assigned = Number(assignedCounts.find((r) => r.trainer_id === t.id)?.count || 0);
        const collected = Number(feesCollected.find((r) => r.trainer_id === t.id)?.total || 0);
        const salary = Number(salaryPaid.find((r) => r.trainer_id === t.id)?.total || 0);
        return {
          id: t.id, name: t.name, status: t.status, sessionFee: Number(t.session_fee),
          assignedMembers: assigned, feesCollected: collected, salaryPaid: salary,
          netProfit: collected - salary,
        };
      });
  
      return { range: { from, to }, trainers: report };
    });

// GET /api/reports/inventory
fastify.get("/api/reports/inventory", async () => {
    const [[valuation]] = await db.query(
      `SELECT COUNT(*) AS productCount, COALESCE(SUM(quantity * purchase_price), 0) AS totalValue
       FROM shop_products`
    );

    const [products] = await db.query(
      `SELECT id, name, category, quantity, purchase_price, low_stock_threshold, expiry_date,
         (quantity * purchase_price) AS stockValue
       FROM shop_products ORDER BY stockValue DESC`
    );

    const lowStock = products.filter((p) => p.quantity <= p.low_stock_threshold);
    const expiringSoon = products.filter(
      (p) => p.expiry_date && new Date(p.expiry_date) <= new Date(Date.now() + 30 * 86400000)
    );

    const [maintenanceHistory] = await db.query(
      `SELECT em.id, em.description, em.cost, em.maintenance_date, e.name AS equipmentName
       FROM equipment_maintenance em
       JOIN equipment e ON e.id = em.equipment_id
       ORDER BY em.maintenance_date DESC LIMIT 50`
    );

    const [[maintenanceTotal]] = await db.query(
      `SELECT COALESCE(SUM(cost), 0) AS total FROM equipment_maintenance`
    );

    return {
      valuation: { productCount: Number(valuation.productCount), totalValue: Number(valuation.totalValue) },
      products: products.map((p) => ({
        id: p.id, name: p.name, category: p.category, quantity: p.quantity,
        purchasePrice: Number(p.purchase_price), stockValue: Number(p.stockValue),
        lowStockThreshold: p.low_stock_threshold, expiryDate: p.expiry_date,
      })),
      lowStock: lowStock.map((p) => ({ id: p.id, name: p.name, quantity: p.quantity, threshold: p.low_stock_threshold })),
      expiringSoon: expiringSoon.map((p) => ({ id: p.id, name: p.name, expiryDate: p.expiry_date, quantity: p.quantity })),
      maintenanceHistory: maintenanceHistory.map((m) => ({
        id: m.id, equipmentName: m.equipmentName, description: m.description,
        cost: Number(m.cost || 0), date: m.maintenance_date,
      })),
      maintenanceTotalCost: Number(maintenanceTotal.total),
    };
  });

  // GET /api/reports/payroll?from=&to=
  fastify.get("/api/reports/payroll", async (request) => {
    const to = request.query.to || new Date().toISOString().slice(0, 10);
    const from = request.query.from || new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);

    const [byMonth] = await db.query(`
      SELECT DATE_FORMAT(pay_month, '%Y-%m') AS month, 'staff' AS type, SUM(amount) AS total
      FROM staff_salary_payments WHERE pay_month BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY month
      UNION ALL
      SELECT DATE_FORMAT(pay_month, '%Y-%m') AS month, 'trainer' AS type, SUM(amount) AS total
      FROM trainer_salary_payments WHERE pay_month BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY month
    `, [from, to, from, to]);

    const monthsSet = new Set(byMonth.map((r) => r.month));
    const monthly = [...monthsSet].sort().map((month) => ({
      month,
      staffTotal: Number(byMonth.find((r) => r.month === month && r.type === "staff")?.total || 0),
      trainerTotal: Number(byMonth.find((r) => r.month === month && r.type === "trainer")?.total || 0),
    })).map((m) => ({ ...m, combined: m.staffTotal + m.trainerTotal }));

    const [staffPayouts] = await db.query(`
      SELECT s.id, s.name, s.role, s.base_salary, COALESCE(SUM(p.amount), 0) AS totalPaid
      FROM staff s
      LEFT JOIN staff_salary_payments p ON p.staff_id = s.id AND p.pay_month BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY s.id, s.name, s.role, s.base_salary
      ORDER BY s.name
    `, [from, to]);

    const [trainerPayouts] = await db.query(`
      SELECT t.id, t.name, t.base_salary, COALESCE(SUM(p.amount), 0) AS totalPaid
      FROM trainers t
      LEFT JOIN trainer_salary_payments p ON p.trainer_id = t.id AND p.pay_month BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY t.id, t.name, t.base_salary
      ORDER BY t.name
    `, [from, to]);

    const [[totalsRow]] = await db.query(`
      SELECT
        (SELECT COALESCE(SUM(amount),0) FROM staff_salary_payments WHERE pay_month BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)) AS staffTotal,
        (SELECT COALESCE(SUM(amount),0) FROM trainer_salary_payments WHERE pay_month BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)) AS trainerTotal
    `, [from, to, from, to]);

    return {
      range: { from, to },
      totals: {
        staffTotal: Number(totalsRow.staffTotal),
        trainerTotal: Number(totalsRow.trainerTotal),
        combined: Number(totalsRow.staffTotal) + Number(totalsRow.trainerTotal),
      },
      monthly,
      staffPayouts: staffPayouts.map((r) => ({
        id: r.id, name: r.name, role: r.role, baseSalary: Number(r.base_salary), totalPaid: Number(r.totalPaid),
      })),
      trainerPayouts: trainerPayouts.map((r) => ({
        id: r.id, name: r.name, baseSalary: Number(r.base_salary), totalPaid: Number(r.totalPaid),
      })),
    };
  });

// GET /api/reports/expenses?from=&to=&groupBy=day|month
fastify.get("/api/reports/expenses", async (request) => {
    const { groupBy = "month" } = request.query;
    const to = request.query.to || new Date().toISOString().slice(0, 10);
    const from = request.query.from || new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
    const fmt = groupBy === "month" ? "%Y-%m" : "%Y-%m-%d";

    const [[summaryRow]] = await db.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
       FROM expenses WHERE expense_date BETWEEN ? AND ?`,
      [from, to]
    );

    const [byType] = await db.query(
      `SELECT expense_type, COUNT(*) AS count, SUM(amount) AS total
       FROM expenses WHERE expense_date BETWEEN ? AND ?
       GROUP BY expense_type ORDER BY total DESC`,
      [from, to]
    );

    const [byPeriod] = await db.query(
      `SELECT DATE_FORMAT(expense_date, '${fmt}') AS period, SUM(amount) AS total
       FROM expenses WHERE expense_date BETWEEN ? AND ?
       GROUP BY period ORDER BY period`,
      [from, to]
    );

    const [recent] = await db.query(
      `SELECT id, expense_type, title, amount, days, expense_date, notes
       FROM expenses WHERE expense_date BETWEEN ? AND ?
       ORDER BY expense_date DESC LIMIT 50`,
      [from, to]
    );

    return {
      range: { from, to, groupBy },
      summary: { count: Number(summaryRow.count), total: Number(summaryRow.total) },
      byType: byType.map((r) => ({ type: r.expense_type, count: Number(r.count), total: Number(r.total) })),
      byPeriod: byPeriod.map((r) => ({ period: r.period, total: Number(r.total) })),
      recent: recent.map((r) => ({
        id: r.id, type: r.expense_type, title: r.title, amount: Number(r.amount),
        days: r.days, date: r.expense_date, notes: r.notes,
      })),
    };
  });

}
module.exports = reportsRoutes;