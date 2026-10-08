"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";

function defaultFrom() { return new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10); }
function defaultTo() { return new Date().toISOString().slice(0, 10); }

export default function PayrollReportPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.getPayrollReport({ from, to }).then(setData);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Staff & Payroll Report</h1>
          <p className="pageSubtitle">Combined staff and trainer salary payments</p>
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
      </div>

      {!data ? (
        <p style={{ color: "#6b7280" }}>Loading report...</p>
      ) : (
        <>
          <div className="statGridSix">
            <div className="statCard">
              <p className="statLabel">Staff Salaries Paid</p>
              <p className="statValue">Rs. {data.totals.staffTotal.toFixed(2)}</p>
            </div>
            <div className="statCard">
              <p className="statLabel">Trainer Salaries Paid</p>
              <p className="statValue">Rs. {data.totals.trainerTotal.toFixed(2)}</p>
            </div>
            <div className="statCard">
              <p className="statLabel">Combined Payroll</p>
              <p className="statValue">Rs. {data.totals.combined.toFixed(2)}</p>
            </div>
          </div>

          <div className="chartCard">
            <h3 className="chartTitle">Payroll by Month</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip formatter={(v) => `Rs. ${Number(v).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="staffTotal" name="Staff" fill="#3e7bfa" radius={[3, 3, 0, 0]} />
                <Bar dataKey="trainerTotal" name="Trainers" fill="#8fb6ff" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="dashboardGridTwo">
            <div className="chartCard">
              <h3 className="chartTitle">Staff Payouts</h3>
              <table className="miniTable">
                <thead><tr><th>Name</th><th>Role</th><th>Base Salary</th><th>Paid (range)</th></tr></thead>
                <tbody>
                  {data.staffPayouts.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.role}</td>
                      <td>Rs. {s.baseSalary.toFixed(2)}</td>
                      <td>Rs. {s.totalPaid.toFixed(2)}</td>
                    </tr>
                  ))}
                  {data.staffPayouts.length === 0 && <tr><td colSpan={4} className="emptyMini">No staff found.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="chartCard">
              <h3 className="chartTitle">Trainer Payouts</h3>
              <table className="miniTable">
                <thead><tr><th>Name</th><th>Base Salary</th><th>Paid (range)</th></tr></thead>
                <tbody>
                  {data.trainerPayouts.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td>Rs. {t.baseSalary.toFixed(2)}</td>
                      <td>Rs. {t.totalPaid.toFixed(2)}</td>
                    </tr>
                  ))}
                  {data.trainerPayouts.length === 0 && <tr><td colSpan={3} className="emptyMini">No trainers found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}