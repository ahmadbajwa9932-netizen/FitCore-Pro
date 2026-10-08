"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

function defaultFrom() { return new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10); }
function defaultTo() { return new Date().toISOString().slice(0, 10); }

export default function TrainerReportPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.getTrainerReport({ from, to }).then(setData);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Trainer Report</h1>
          <p className="pageSubtitle">Assigned members, fees collected, and salary paid per trainer</p>
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
        <div className="tableWrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Trainer</th><th>Status</th><th>Assigned Members</th>
                <th>Session Fee</th><th>Fees Collected</th><th>Salary Paid</th><th>Net</th>
              </tr>
            </thead>
            <tbody>
              {data.trainers.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td><span className={`badge ${t.status === "active" ? "badgeSuccess" : "badgeDanger"}`}>{t.status}</span></td>
                  <td>{t.assignedMembers}</td>
                  <td>Rs. {t.sessionFee.toFixed(2)}</td>
                  <td>Rs. {t.feesCollected.toFixed(2)}</td>
                  <td>Rs. {t.salaryPaid.toFixed(2)}</td>
                  <td style={{ fontWeight: 700, color: t.netProfit >= 0 ? "#1a7f3c" : "#c0302e" }}>
                    Rs. {t.netProfit.toFixed(2)}
                  </td>
                </tr>
              ))}
              {data.trainers.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>No trainers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}