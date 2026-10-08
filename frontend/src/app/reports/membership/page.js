"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";

function defaultFrom() { return new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10); }
function defaultTo() { return new Date().toISOString().slice(0, 10); }

const STATUS_LABEL = { active: "Active", frozen: "Frozen", expired: "Expired", cancelled: "Cancelled" };

export default function MembershipReportPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [groupBy, setGroupBy] = useState("month");
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.getMembershipReport({ from, to, groupBy }).then(setData);
  }, [from, to, groupBy]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Membership Report</h1>
          <p className="pageSubtitle">Signups, renewals, cancellations, and plan performance</p>
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
            {data.statusCounts.map((s) => (
              <div className="statCard" key={s.status}>
                <p className="statLabel">{STATUS_LABEL[s.status] || s.status}</p>
                <p className="statValue">{s.count}</p>
              </div>
            ))}
            <div className="statCard">
              <p className="statLabel">Expiring in 7 Days</p>
              <p className="statValue">{data.expiryForecast.in7}</p>
            </div>
            <div className="statCard">
              <p className="statLabel">Expiring in 15 Days</p>
              <p className="statValue">{data.expiryForecast.in15}</p>
            </div>
            <div className="statCard">
              <p className="statLabel">Expiring in 30 Days</p>
              <p className="statValue">{data.expiryForecast.in30}</p>
            </div>
          </div>

          <div className="chartCard">
            <h3 className="chartTitle">New vs Renewed vs Cancelled</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
                <XAxis dataKey="period" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="new" name="New" fill="#3e7bfa" radius={[3, 3, 0, 0]} />
                <Bar dataKey="renewed" name="Renewed" fill="#1a7f3c" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill="#c0302e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chartCard">
            <h3 className="chartTitle">Plan Performance</h3>
            <table className="miniTable">
              <thead><tr><th>Plan</th><th>Active Members</th><th>Revenue (in range)</th></tr></thead>
              <tbody>
                {data.planBreakdown.map((p) => (
                  <tr key={p.name}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.activeMembers}</td>
                    <td>Rs. {p.revenue.toFixed(2)}</td>
                  </tr>
                ))}
                {data.planBreakdown.length === 0 && (
                  <tr><td colSpan={3} className="emptyMini">No plan activity in this range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}