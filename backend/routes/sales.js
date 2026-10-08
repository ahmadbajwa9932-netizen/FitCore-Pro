const db = require("../db");

function calcLineBreakdown(price, qty, discountType, discountValue, taxType, taxValue) {
  const base = Number(price) * Number(qty);
  const discountAmt = discountType === "percent" ? base * (Number(discountValue) / 100) : Number(discountValue || 0);
  const afterDiscount = Math.max(0, base - discountAmt);
  const taxAmt = taxType === "percent" ? afterDiscount * (Number(taxValue) / 100) : Number(taxValue || 0);
  return { base, afterDiscount, taxAmt, lineTotal: afterDiscount + taxAmt };
}

function calcLineTotal(price, qty, discountType, discountValue, taxType, taxValue) {
  return calcLineBreakdown(price, qty, discountType, discountValue, taxType, taxValue).lineTotal;
}

function buildInvoiceNo(saleId) {
  const d = new Date();
  const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `INV-${datePart}-${saleId}`;
}

async function salesRoutes(fastify) {
  // GET /api/sales?search=&from=&to=
  fastify.get("/api/sales", async (request) => {
    const { search = "", from, to } = request.query;
    let sql = "SELECT * FROM sales WHERE (customer_name LIKE ? OR invoice_no LIKE ?)";
    const params = [`%${search}%`, `%${search}%`];
    if (from) { sql += " AND created_at >= ?"; params.push(from); }
    if (to) { sql += " AND created_at <= ?"; params.push(to); }
    sql += " ORDER BY created_at DESC";
    const [rows] = await db.query(sql, params);
    return rows;
  });

  // GET /api/sales/:id  (with items)
  fastify.get("/api/sales/:id", async (request, reply) => {
    const [[sale]] = await db.query("SELECT * FROM sales WHERE id = ?", [request.params.id]);
    if (!sale) return reply.code(404).send({ error: "Sale not found" });
    const [items] = await db.query("SELECT * FROM sale_items WHERE sale_id = ?", [request.params.id]);
    return { ...sale, items };
  });

  // GET /api/sales/next-invoice-preview — display-only preview, real number is finalized on save
  fastify.get("/api/sales/next-invoice-preview", async () => {
    const [[row]] = await db.query("SELECT MAX(id) AS maxId FROM sales");
    const nextId = (row.maxId || 0) + 1;
    return { invoiceNo: buildInvoiceNo(nextId) };
  });

  // PUT /api/sales/:id — edit a sale: reverts old stock, applies new stock/items
  fastify.put("/api/sales/:id", async (request, reply) => {
    const {
      customerName, customerCity, customerContact, paymentMethod,
      receivedAmount, items, discountType, discountValue, taxType, taxValue,
    } = request.body;

    if (!items || items.length === 0) {
      return reply.code(400).send({ error: "At least one item is required" });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [[sale]] = await conn.query("SELECT id FROM sales WHERE id = ?", [request.params.id]);
      if (!sale) throw new Error("Sale not found");

      // revert sold_quantity from the old items (quantity/stock is untouched)
      const [oldItems] = await conn.query("SELECT product_id, quantity FROM sale_items WHERE sale_id = ?", [request.params.id]);
      for (const oi of oldItems) {
        if (oi.product_id) {
          await conn.query("UPDATE shop_products SET sold_quantity = sold_quantity - ? WHERE id = ?", [oi.quantity, oi.product_id]);
        }
      }
      await conn.query("DELETE FROM sale_items WHERE sale_id = ?", [request.params.id]);

      // recompute with the new items
      let subtotal = 0;
      let revenueExclTax = 0;
      let totalCost = 0;
      const computedItems = [];
      for (const item of items) {
        const breakdown = calcLineBreakdown(
          item.price, item.quantity, item.discountType, item.discountValue, item.taxType, item.taxValue
        );
        subtotal += breakdown.lineTotal;
        revenueExclTax += breakdown.afterDiscount;

        let purchasePrice = 0;
        if (item.productId) {
          const [[product]] = await conn.query("SELECT quantity, sold_quantity, purchase_price FROM shop_products WHERE id = ?", [item.productId]);
          if (!product) throw new Error(`Product not found: ${item.productName}`);
          const remaining = product.quantity - product.sold_quantity;
          if (remaining < item.quantity) {
            throw new Error(`Not enough stock for ${item.productName} (available: ${remaining})`);
          }
          purchasePrice = Number(product.purchase_price);
        }
        totalCost += purchasePrice * Number(item.quantity);

        computedItems.push({ ...item, lineTotal: breakdown.lineTotal, purchasePrice });
      }

      const discAmt = discountType === "percent" ? subtotal * (Number(discountValue) / 100) : Number(discountValue || 0);
      const afterDiscount = Math.max(0, subtotal - discAmt);
      const taxAmt = taxType === "percent" ? afterDiscount * (Number(taxValue) / 100) : Number(taxValue || 0);
      const grandTotal = afterDiscount + taxAmt;
      const changeAmount = Math.max(0, Number(receivedAmount || 0) - grandTotal);
      const profit = revenueExclTax - totalCost - discAmt;

      await conn.query(
        `UPDATE sales SET customer_name=?, customer_city=?, customer_contact=?, payment_method=?,
         subtotal=?, discount_type=?, discount_value=?, tax_type=?, tax_value=?, grand_total=?, profit=?,
         received_amount=?, change_amount=? WHERE id=?`,
        [customerName || null, customerCity || null, customerContact || null, paymentMethod || "cash",
         subtotal, discountType || "amount", discountValue || 0, taxType || "amount", taxValue || 0,
         grandTotal, profit, receivedAmount || 0, changeAmount, request.params.id]
      );

      for (const item of computedItems) {
        await conn.query(
          `INSERT INTO sale_items (sale_id, product_id, product_name, price, purchase_price, quantity, discount_type, discount_value, tax_type, tax_value, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [request.params.id, item.productId || null, item.productName, item.price, item.purchasePrice, item.quantity,
           item.discountType || "amount", item.discountValue || 0, item.taxType || "amount", item.taxValue || 0, item.lineTotal]
        );
        if (item.productId) {
          await conn.query("UPDATE shop_products SET sold_quantity = sold_quantity + ? WHERE id = ?", [item.quantity, item.productId]);
        }
      }

      await conn.commit();
      return { message: "Sale updated", grandTotal, profit, changeAmount };
    } catch (err) {
      await conn.rollback();
      return reply.code(500).send({ error: err.message });
    } finally {
      conn.release();
    }
  });

  // POST /api/sales/:id/undo — reverts stock, then deletes the sale
  fastify.post("/api/sales/:id/undo", async (request, reply) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [[sale]] = await conn.query("SELECT id FROM sales WHERE id = ?", [request.params.id]);
      if (!sale) throw new Error("Sale not found");

      const [items] = await conn.query("SELECT product_id, quantity FROM sale_items WHERE sale_id = ?", [request.params.id]);
      for (const item of items) {
        if (item.product_id) {
          await conn.query("UPDATE shop_products SET sold_quantity = sold_quantity - ? WHERE id = ?", [item.quantity, item.product_id]);
        }
      }

      await conn.query("DELETE FROM sales WHERE id = ?", [request.params.id]); // cascades to sale_items

      await conn.commit();
      return { message: "Sale undone and stock restored" };
    } catch (err) {
      await conn.rollback();
      return reply.code(500).send({ error: err.message });
    } finally {
      conn.release();
    }
  });

  // DELETE /api/sales/:id — deletes without touching stock
  fastify.delete("/api/sales/:id", async (request) => {
    await db.query("DELETE FROM sales WHERE id = ?", [request.params.id]); // cascades to sale_items
    return { message: "Sale deleted" };
  });

  // POST /api/sales
  fastify.post("/api/sales", async (request, reply) => {
    const {
      customerName, customerCity, customerContact, paymentMethod,
      receivedAmount, items, discountType, discountValue, taxType, taxValue,
    } = request.body;

    if (!items || items.length === 0) {
      return reply.code(400).send({ error: "At least one item is required" });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      let subtotal = 0;
      let revenueExclTax = 0; // sum of afterDiscount per line, used for profit
      let totalCost = 0;
      const computedItems = [];

      for (const item of items) {
        const breakdown = calcLineBreakdown(
          item.price, item.quantity, item.discountType, item.discountValue, item.taxType, item.taxValue
        );
        subtotal += breakdown.lineTotal;
        revenueExclTax += breakdown.afterDiscount;

        let purchasePrice = 0;
        if (item.productId) {
          const [[product]] = await conn.query("SELECT quantity, sold_quantity, purchase_price FROM shop_products WHERE id = ?", [item.productId]);
          if (!product) throw new Error(`Product not found: ${item.productName}`);
          const remaining = product.quantity - product.sold_quantity;
          if (remaining < item.quantity) {
            throw new Error(`Not enough stock for ${item.productName} (available: ${remaining})`);
          }
          purchasePrice = Number(product.purchase_price);
        }
        totalCost += purchasePrice * Number(item.quantity);

        computedItems.push({ ...item, lineTotal: breakdown.lineTotal, purchasePrice });
      }

      const discAmt = discountType === "percent" ? subtotal * (Number(discountValue) / 100) : Number(discountValue || 0);
      const afterDiscount = Math.max(0, subtotal - discAmt);
      const taxAmt = taxType === "percent" ? afterDiscount * (Number(taxValue) / 100) : Number(taxValue || 0);
      const grandTotal = afterDiscount + taxAmt;
      const changeAmount = Math.max(0, Number(receivedAmount || 0) - grandTotal);

      // Profit: revenue excl. tax minus cost minus the overall discount (tax excluded entirely)
      const profit = revenueExclTax - totalCost - discAmt;

      const [saleResult] = await conn.query(
        `INSERT INTO sales
         (customer_name, customer_city, customer_contact, payment_method, subtotal,
          discount_type, discount_value, tax_type, tax_value, grand_total, profit, received_amount, change_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [customerName || null, customerCity || null, customerContact || null, paymentMethod || "cash", subtotal,
         discountType || "amount", discountValue || 0, taxType || "amount", taxValue || 0, grandTotal, profit,
         receivedAmount || 0, changeAmount]
      );
      const saleId = saleResult.insertId;
      const invoiceNo = buildInvoiceNo(saleId);
      await conn.query("UPDATE sales SET invoice_no = ? WHERE id = ?", [invoiceNo, saleId]);

      for (const item of computedItems) {
        await conn.query(
          `INSERT INTO sale_items (sale_id, product_id, product_name, price, purchase_price, quantity, discount_type, discount_value, tax_type, tax_value, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [saleId, item.productId || null, item.productName, item.price, item.purchasePrice, item.quantity,
           item.discountType || "amount", item.discountValue || 0, item.taxType || "amount", item.taxValue || 0, item.lineTotal]
        );

        if (item.productId) {
          await conn.query("UPDATE shop_products SET sold_quantity = sold_quantity + ? WHERE id = ?", [item.quantity, item.productId]);
        }
      }

      await conn.commit();
      return reply.code(201).send({ id: saleId, invoiceNo, subtotal, grandTotal, profit, changeAmount, message: "Sale recorded" });
    } catch (err) {
      await conn.rollback();
      return reply.code(500).send({ error: err.message });
    } finally {
      conn.release();
    }
  });
}

module.exports = salesRoutes;