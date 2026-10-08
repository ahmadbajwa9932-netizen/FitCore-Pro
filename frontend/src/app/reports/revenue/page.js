"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";

function defaultFrom() { return new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10); }
function defaultTo() { return new Date().toISOString().slice(0, 10); }

export default function RevenueReportPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [groupBy, setGroupBy] = useState("day");
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.getRevenueReport({ from, to, groupBy }).then(setData);
  }, [from, to, groupBy]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Revenue Report</h1>
          <p className="pageSubtitle">Membership vs POS revenue over a custom date range</p>
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
              <p className="statLabel">Membership Collected</p>
              <p className="statValue">Rs. {data.summary.membershipCollected.toFixed(2)}</p>
            </div>
            <div className="statCard">
              <p className="statLabel">POS Revenue</p>
              <p className="statValue">Rs. {data.summary.posRevenue.toFixed(2)}</p>
            </div>
            <div className="statCard">
              <p className="statLabel">POS Profit</p>
              <p className="statValue">Rs. {data.summary.posProfit.toFixed(2)}</p>
            </div>
            <div className="statCard">
              <p className="statLabel">Billed (Invoices)</p>
              <p className="statValue">Rs. {data.summary.totalBilled.toFixed(2)}</p>
            </div>
            <div className="statCard">
              <p className="statLabel">Outstanding</p>
              <p className="statValue" style={{ color: data.summary.outstanding > 0 ? "#c0302e" : "inherit" }}>
                Rs. {data.summary.outstanding.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="chartCard">
            <h3 className="chartTitle">Revenue by Source</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byPeriod}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
                <XAxis dataKey="period" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip formatter={(v) => `Rs. ${Number(v).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="membershipRevenue" name="Membership Revenue" fill="#3e7bfa" radius={[3, 3, 0, 0]} />
                <Bar dataKey="posRevenue" name="POS Revenue" fill="#8fb6ff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="dashboardGridTwo">
            <div className="chartCard">
              <h3 className="chartTitle">Revenue by Payment Method</h3>
              <table className="miniTable">
                <thead><tr><th>Method</th><th>Membership</th><th>POS</th></tr></thead>
                <tbody>
                  {data.byPaymentMethod.map((m) => (
                    <tr key={m.method}>
                      <td style={{ textTransform: "capitalize", fontWeight: 600 }}>{m.method}</td>
                      <td>Rs. {m.membershipAmount.toFixed(2)}</td>
                      <td>Rs. {m.posAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                  {data.byPaymentMethod.length === 0 && (
                    <tr><td colSpan={3} className="emptyMini">No payments in this range.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="chartCard">
              <h3 className="chartTitle">Period Breakdown</h3>
              <table className="miniTable">
                <thead><tr><th>Period</th><th>Membership</th><th>POS</th></tr></thead>
                <tbody>
                  {data.byPeriod.map((p) => (
                    <tr key={p.period}>
                      <td>{p.period}</td>
                      <td>Rs. {p.membershipRevenue.toFixed(2)}</td>
                      <td>Rs. {p.posRevenue.toFixed(2)}</td>
                    </tr>
                  ))}
                  {data.byPeriod.length === 0 && (
                    <tr><td colSpan={3} className="emptyMini">No data in this range.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}