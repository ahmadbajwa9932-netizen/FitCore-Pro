"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openRow, setOpenRow] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getExpenses({ search });
    setExpenses(data);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this expense record?")) return;
    setOpenRow(null);
    await api.deleteExpense(id);
    load();
  };

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Expenses</h1>
          <p className="pageSubtitle">{expenses.length} records · Rs. {totalAmount.toFixed(2)} total</p>
        </div>
        <Link href="/expenses/new" className="btn btnPrimary">
          <Plus size={16} /> Add Expense
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 12px", width: 320, marginBottom: 16 }}>
        <Search size={16} color="#9ca3af" />
        <input
          style={{ border: "none", outline: "none", fontSize: 14, width: "100%" }}
          placeholder="Search by title or notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="tableWrapper">
        <table className="table">
          <thead>
          <tr><th>Type</th><th>Title</th><th>Amount</th><th>Days</th><th>Date</th><th>Notes</th><th></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Loading expenses...</td></tr>}
            {!loading && expenses.map((e) => (
              <tr key={e.id}>
                <td style={{ fontWeight: 600, textTransform: "capitalize" }}>{e.expense_type}</td>
                <td>{e.title || "—"}</td>
                <td style={{ fontWeight: 700 }}>Rs. {Number(e.amount).toFixed(2)}</td>
                <td>{e.days}</td>
                <td>{e.expense_date?.slice(0, 10)}</td>
                <td style={{ maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={e.notes || ""}>{e.notes || "—"}</td>
                <td>
                  <div className="actionCell">
                    <button className="actionIcon" onClick={() => setOpenRow(openRow === e.id ? null : e.id)}>
                      <MoreVertical size={16} />
                    </button>
                    {openRow === e.id && (
                      <div className="actionDropdown">
                        <Link href={`/expenses/${e.id}/edit`}><Pencil size={14} style={{ marginRight: 8 }} />Edit</Link>
                        <button style={{ color: "#c0302e" }} onClick={() => handleDelete(e.id)}><Trash2 size={14} style={{ marginRight: 8 }} />Delete</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && expenses.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>No expenses recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}