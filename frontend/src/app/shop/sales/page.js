"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, MoreVertical, Eye, Pencil, Trash2, Undo2 } from "lucide-react";
import { api } from "@/lib/api";

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openRow, setOpenRow] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getSales({ search });
    setSales(data);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleUndo = async (id) => {
    if (!confirm("Undo this sale? Stock quantities will be restored.")) return;
    setOpenRow(null);
    await api.undoSale(id);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this sale permanently? Stock will NOT be restored.")) return;
    setOpenRow(null);
    await api.deleteSale(id);
    load();
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Sales</h1>
          <p className="pageSubtitle">{sales.length} transactions recorded</p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 12px", width: 320, marginBottom: 16 }}>
        <Search size={16} color="#9ca3af" />
        <input
          style={{ border: "none", outline: "none", fontSize: 14, width: "100%" }}
          placeholder="Search by customer name or invoice no..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="tableWrapper">
        <table className="table">
          <thead>
            <tr><th>#</th><th>Invoice No.</th><th>Customer</th><th>Payment</th><th>Grand Total</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Loading sales...</td></tr>}
            {!loading && sales.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>#{s.id}</td>
                <td>{s.invoice_no}</td>
                <td>{s.customer_name || "Walk-in customer"}</td>
                <td style={{ textTransform: "capitalize" }}>{s.payment_method}</td>
                <td style={{ fontWeight: 700 }}>Rs. {Number(s.grand_total).toFixed(2)}</td>
                <td>{s.created_at?.slice(0, 10)}</td>
                <td>
                  <div className="actionCell">
                    <button className="actionIcon" onClick={() => setOpenRow(openRow === s.id ? null : s.id)}>
                      <MoreVertical size={16} />
                    </button>
                    {openRow === s.id && (
                      <div className="actionDropdown">
                        <Link href={`/shop/sales/${s.id}`}><Eye size={14} style={{ marginRight: 8 }} />View Details</Link>
                        <Link href={`/shop/pos/${s.id}/edit`}><Pencil size={14} style={{ marginRight: 8 }} />Edit</Link>
                        <button onClick={() => handleUndo(s.id)}><Undo2 size={14} style={{ marginRight: 8 }} />Undo (restore stock)</button>
                        <button style={{ color: "#c0302e" }} onClick={() => handleDelete(s.id)}><Trash2 size={14} style={{ marginRight: 8 }} />Delete</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && sales.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>No sales recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}