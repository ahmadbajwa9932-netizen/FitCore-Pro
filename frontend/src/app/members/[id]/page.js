"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, RefreshCcw, PauseCircle } from "lucide-react";
import { api } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const STATUS_LABEL = {
  active: { text: "Active", cls: "badgeSuccess" },
  frozen: { text: "Frozen", cls: "badgeWarning" },
  expired: { text: "Expired", cls: "badgeDanger" },
  cancelled: { text: "Cancelled", cls: "badgeDanger" },
};

export default function MemberProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [member, setMember] = useState(null);
  const [history, setHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [m, h, p] = await Promise.all([
      api.getMember(id), api.getMemberHistory(id), api.getMemberInvoices(id),
    ]);
    setMember(m); setHistory(h); setInvoices(p);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleFreeze = async () => { await api.freezeMember(id); load(); };

  if (loading || !member) return <p style={{ color: "#6b7280" }}>Loading member...</p>;
  const status = STATUS_LABEL[member.status] || STATUS_LABEL.active;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Member Profile</h1>
          <p className="pageSubtitle">View full member details</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btnSecondary" onClick={handleFreeze}>
            <PauseCircle size={16} /> Freeze
          </button>
          <button className="btn btnSecondary">
            <RefreshCcw size={16} /> Renew
          </button>
          <Link href={`/members/${id}/edit`} className="btn btnPrimary">
            <Pencil size={16} /> Edit
          </Link>
        </div>
      </div>

      <div className="profileHeader">
        <div className="profileAvatar">
          {member.photo_url ? (
            <img src={`${API_BASE}${member.photo_url}`} alt={member.name} />
          ) : (
            member.name.split(" ").map((n) => n[0]).join("")
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h2 className="profileName">{member.name}</h2>
          <p className="profileMeta">{member.phone} · {member.plan_name || "No plan"} · {member.trainer_name || "No trainer"}</p>
        </div>
        <span className={`badge ${status.cls}`}>{status.text}</span>
      </div>

      <div className="tabs">
        {["overview", "history", "payments"].map((t) => (
          <button
            key={t}
            className={`tabButton ${tab === t ? "tabButtonActive" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "overview" ? "Overview" : t === "history" ? "Membership History" : "Billing / Payment History"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="card">
          <div className="formGrid">
            <div><strong>Email</strong><p>{member.email || "—"}</p></div>
            <div><strong>Gender</strong><p style={{ textTransform: "capitalize" }}>{member.gender}</p></div>
            <div><strong>Date of Birth</strong><p>{member.dob?.slice(0, 10) || "—"}</p></div>
            <div><strong>Address</strong><p>{member.address || "—"}</p></div>
            <div><strong>Emergency Contact</strong><p>{member.emergency_name || "—"} ({member.emergency_phone || "—"})</p></div>
            <div><strong>Start Date</strong><p>{member.start_date?.slice(0, 10)}</p></div>
            <div><strong>Expiry Date</strong><p>{member.expiry_date?.slice(0, 10)}</p></div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="tableWrapper">
          <table className="table">
            <thead><tr><th>Action</th><th>Plan</th><th>Start</th><th>Expiry</th><th>Date</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td style={{ textTransform: "capitalize" }}>{h.action}</td>
                  <td>{h.plan_name || "—"}</td>
                  <td>{h.start_date?.slice(0, 10)}</td>
                  <td>{h.expiry_date?.slice(0, 10)}</td>
                  <td>{h.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>No history yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

{tab === "payments" && (
  <div>
    {invoices.map((inv) => {
      const due = Number(inv.total_amount) - Number(inv.amount_paid);
      return (
        <div className="card" key={inv.id} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <p style={{ fontWeight: 600, margin: 0 }}>{inv.description}</p>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>{inv.created_at?.slice(0, 10)}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className={`badge ${inv.status === "paid" ? "badgeSuccess" : inv.status === "partial" ? "badgeWarning" : "badgeDanger"}`}>
                {inv.status === "paid" ? "Paid" : inv.status === "partial" ? "Partially Paid" : "Unpaid"}
              </span>
              <p style={{ fontSize: 13, margin: "6px 0 0" }}>
                Rs. {Number(inv.amount_paid).toFixed(2)} / Rs. {Number(inv.total_amount).toFixed(2)}
                {due > 0 && <span style={{ color: "#c0302e", fontWeight: 600 }}> (Rs. {due.toFixed(2)} due)</span>}
              </p>
            </div>
          </div>
          {inv.payments.length > 0 && (
            <table className="table">
              <thead><tr><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
              <tbody>
                {inv.payments.map((p) => (
                  <tr key={p.id}>
                    <td>Rs. {Number(p.amount).toFixed(2)}</td>
                    <td style={{ textTransform: "capitalize" }}>{p.method}</td>
                    <td>{p.paid_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      );
    })}
    {invoices.length === 0 && (
      <p style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>No billing history yet.</p>
    )}
  </div>
)}
    </div>
  );
}