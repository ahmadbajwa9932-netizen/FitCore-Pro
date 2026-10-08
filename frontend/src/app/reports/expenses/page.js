"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";

const PIE_COLORS = ["#3e7bfa", "#8fb6ff", "#1a7f3c", "#b4650b", "#c0302e", "#6b7280", "#9333ea"];

function defaultFrom() { return new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10); }
function defaultTo() { return new Date().toISOString().slice(0, 10); }

export default function ExpenseReportPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [groupBy, setGroupBy] = useState("month");
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.getExpenseReport({ from, to, groupBy }).then(setData);
  }, [from, to, groupBy]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Expense Report</h1>
          <p className="pageSubtitle">Expenses by category and over time</p>
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
              <p className="statLabel">Total Expenses</p>
              <p className="statValue">{data.summary.count}</p>
            </div>
            <div className="statCard">
              <p className="statLabel">Total Amount</p>
              <p className="statValue">Rs. {data.summary.total.toFixed(2)}</p>
            </div>
            <div className="statCard">
              <p className="statLabel">Categories</p>
              <p className="statValue">{data.byType.length}</p>
            </div>
          </div>

          <div className="dashboardGridTwo">
            <div className="chartCard">
              <h3 className="chartTitle">Expenses by Category</h3>
              {data.byType.length === 0 ? (
                <p className="emptyMini">No expenses in this range.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={data.byType} dataKey="total" nameKey="type" cx="50%" cy="50%" outerRadius={90} label>
                      {data.byType.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `Rs. ${Number(v).toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="chartCard">
              <h3 className="chartTitle">Expense Trend</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.byPeriod}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
                  <XAxis dataKey="period" stroke="#6b7280" fontSize={11} />
                  <YAxis stroke="#6b7280" fontSize={11} />
                  <Tooltip formatter={(v) => `Rs. ${Number(v).toFixed(2)}`} />
                  <Bar dataKey="total" name="Expenses" fill="#c0302e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chartCard">
            <h3 className="chartTitle">By Category (Table)</h3>
            <table className="miniTable">
              <thead><tr><th>Category</th><th>Count</th><th>Total</th></tr></thead>
              <tbody>
                {data.byType.map((t) => (
                  <tr key={t.type}>
                    <td style={{ fontWeight: 600 }}>{t.type}</td>
                    <td>{t.count}</td>
                    <td>Rs. {t.total.toFixed(2)}</td>
                  </tr>
                ))}
                {data.byType.length === 0 && <tr><td colSpan={3} className="emptyMini">No expenses in this range.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="chartCard">
            <h3 className="chartTitle">Recent Expenses</h3>
            <table className="miniTable">
              <thead><tr><th>Date</th><th>Category</th><th>Title</th><th>Amount</th></tr></thead>
              <tbody>
                {data.recent.map((e) => (
                  <tr key={e.id}>
                    <td>{e.date?.slice(0, 10)}</td>
                    <td style={{ fontWeight: 600 }}>{e.type}</td>
                    <td>{e.title || "—"}</td>
                    <td>Rs. {e.amount.toFixed(2)}</td>
                  </tr>
                ))}
                {data.recent.length === 0 && <tr><td colSpan={4} className="emptyMini">No expenses in this range.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}