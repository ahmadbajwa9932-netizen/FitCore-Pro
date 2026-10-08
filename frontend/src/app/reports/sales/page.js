"use client";

import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";

function defaultFrom() { return new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10); }
function defaultTo() { return new Date().toISOString().slice(0, 10); }

export default function SalesReportPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [groupBy, setGroupBy] = useState("day");
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.getSalesReport({ from, to, groupBy }).then(setData);
  }, [from, to, groupBy]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">POS / Sales Report</h1>
          <p className="pageSubtitle">Sales, profit, and product performance over a custom date range</p>
        </div>
      </div>

      <div className="reportFilterBar">
        <div className="reportFilterGroup">
          <label className="reportFilterLabel">From</label>
          <input type="date" className="posInput" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="reportFilterGroup">
          <label className="reportFilterLabel">To</label>
          <input type="date" className="posInput" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="reportFilterGroup">
          <label className="reportFilterLabel">Group By</label>
          <select className="posInput" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="day">Day</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>

      {!data ? (
        <p style={{ color: "#6b7280" }}>Loading report...</p>
      ) : (
        <>
          <div className="statGridSix">
            <div className="statCard">
              <p className="statLabel">Total Sales</p>
              <p className="statValue">{data.summary.saleCount}</p>
            </div>
            <div className="statCard">
              <p className="statLabel">Total Revenue</p>
              <p className="statValue">Rs. {data.summary.revenue.toFixed(2)}</p>
            </div>
            <div className="statCard">
              <p className="statLabel">Total Profit</p>
              <p className="statValue">Rs. {data.summary.profit.toFixed(2)}</p>
            </div>
            <div className="statCard">
              <p className="statLabel">Avg Order Value</p>
              <p className="statValue">Rs. {data.summary.avgOrderValue.toFixed(2)}</p>
            </div>
          </div>

          <div className="chartCard">
            <h3 className="chartTitle">Revenue & Profit Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.byPeriod}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
                <XAxis dataKey="period" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip formatter={(v) => `Rs. ${Number(v).toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3e7bfa" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#1a7f3c" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="dashboardGridTwo">
            <div className="chartCard">
              <h3 className="chartTitle">Best-Selling Products (by Quantity)</h3>
              <table className="miniTable">
                <thead><tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  {data.bestByQty.map((p) => (
                    <tr key={p.name}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.qty}</td>
                      <td>Rs. {p.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                  {data.bestByQty.length === 0 && <tr><td colSpan={3} className="emptyMini">No sales in this range.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="chartCard">
              <h3 className="chartTitle">Best-Selling Products (by Revenue)</h3>
              <table className="miniTable">
                <thead><tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  {data.bestByRevenue.map((p) => (
                    <tr key={p.name}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.qty}</td>
                      <td>Rs. {p.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                  {data.bestByRevenue.length === 0 && <tr><td colSpan={3} className="emptyMini">No sales in this range.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="chartCard">
            <h3 className="chartTitle">Profit Margin per Product</h3>
            <table className="miniTable">
              <thead><tr><th>Product</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Margin %</th></tr></thead>
              <tbody>
                {data.profitMargin.map((p) => (
                  <tr key={p.name}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>Rs. {p.revenue.toFixed(2)}</td>
                    <td>Rs. {p.cost.toFixed(2)}</td>
                    <td>Rs. {p.profit.toFixed(2)}</td>
                    <td>{p.marginPct}%</td>
                  </tr>
                ))}
                {data.profitMargin.length === 0 && <tr><td colSpan={5} className="emptyMini">No sales in this range.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="chartCard">
            <h3 className="chartTitle">Payment Method Breakdown</h3>
            <table className="miniTable">
              <thead><tr><th>Method</th><th>Transactions</th><th>Total</th></tr></thead>
              <tbody>
                {data.byPaymentMethod.map((m) => (
                  <tr key={m.method}>
                    <td style={{ textTransform: "capitalize", fontWeight: 600 }}>{m.method}</td>
                    <td>{m.count}</td>
                    <td>Rs. {m.total.toFixed(2)}</td>
                  </tr>
                ))}
                {data.byPaymentMethod.length === 0 && <tr><td colSpan={3} className="emptyMini">No sales in this range.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}