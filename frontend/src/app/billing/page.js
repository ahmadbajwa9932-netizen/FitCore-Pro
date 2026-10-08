"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, X, Wallet } from "lucide-react";
import { api } from "@/lib/api";

const STATUS_LABEL = {
  unpaid: { text: "Unpaid", cls: "badgeDanger" },
  partial: { text: "Partially Paid", cls: "badgeWarning" },
  paid: { text: "Paid", cls: "badgeSuccess" },
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [payTarget, setPayTarget] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getInvoices({ search, status: statusFilter });
    setInvoices(data);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openPay = (invoice) => {
    setPayTarget(invoice);
    setPayAmount("");
    setPayMethod("cash");
    setError(null);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.addInvoicePayment(payTarget.id, { amount: payAmount, method: payMethod });
      setPayTarget(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalDue = invoices.reduce((sum, i) => sum + (Number(i.total_amount) - Number(i.amount_paid)), 0);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Billing</h1>
          <p className="pageSubtitle">{invoices.length} invoices · Rs. {totalDue.toFixed(2)} total outstanding</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 12px", width: 320 }}>
          <Search size={16} color="#9ca3af" />
          <input
            style={{ border: "none", outline: "none", fontSize: 14, width: "100%" }}
            placeholder="Search by member name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="formSelect" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partially Paid</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div className="tableWrapper">
        <table className="table">
          <thead>
            <tr><th>Member</th><th>Description</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Loading invoices...</td></tr>}
            {!loading && invoices.map((inv) => {
              const status = STATUS_LABEL[inv.status] || STATUS_LABEL.unpaid;
              const due = Number(inv.total_amount) - Number(inv.amount_paid);
              return (
                <tr key={inv.id}>
                  <td>
                    <Link href={`/members/${inv.member_id}`} style={{ color: "var(--color-text-primary)", fontWeight: 600, textDecoration: "none" }}>
                      {inv.member_name}
                    </Link>
                  </td>
                  <td>{inv.description}</td>
                  <td>Rs. {Number(inv.total_amount).toFixed(2)}</td>
                  <td>Rs. {Number(inv.amount_paid).toFixed(2)}</td>
                  <td style={{ color: due > 0 ? "#c0302e" : "inherit", fontWeight: due > 0 ? 600 : 400 }}>
                    Rs. {due.toFixed(2)}
                  </td>
                  <td><span className={`badge ${status.cls}`}>{status.text}</span></td>
                  <td>{inv.created_at?.slice(0, 10)}</td>
                  <td>
                    {inv.status !== "paid" && (
                      <button className="actionIcon" onClick={() => openPay(inv)} title="Add Payment">
                        <Wallet size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && invoices.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>No invoices yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {payTarget && (
        <div className="modalOverlay" onClick={() => setPayTarget(null)}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3 className="modalTitle">Add Payment — {payTarget.member_name}</h3>
              <button className="modalClose" onClick={() => setPayTarget(null)}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>
              Remaining due: <strong>Rs. {(Number(payTarget.total_amount) - Number(payTarget.amount_paid)).toFixed(2)}</strong>
            </p>
            <form onSubmit={handlePaySubmit}>
              <div className="formGrid" style={{ marginBottom: 14 }}>
                <div className="formGroup">
                  <label className="formLabel">Amount *</label>
                  <input
                    type="number"
                    className="formInput"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="formGroup">
                  <label className="formLabel">Method</label>
                  <select className="formSelect" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
              </div>
              {error && <p style={{ color: "#c0302e", fontSize: 13 }}>{error}</p>}
              <div className="modalActions">
                <button type="button" className="btn btnSecondary" onClick={() => setPayTarget(null)}>Cancel</button>
                <button type="submit" className="btn btnPrimary" disabled={submitting}>
                  {submitting ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}