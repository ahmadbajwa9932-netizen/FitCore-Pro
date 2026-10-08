"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Pencil, Power } from "lucide-react";
import { api } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function TrainerProfilePage() {
  const { id } = useParams();
  const [trainer, setTrainer] = useState(null);
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payAmount, setPayAmount] = useState("");
  const [payMonth, setPayMonth] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, m, p] = await Promise.all([api.getTrainer(id), api.getTrainerMembers(id), api.getTrainerSalaryPayments(id)]);
    setTrainer(t);
    setMembers(m);
    setPayments(p);
    setLoading(false);
  }, [id]);

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!payAmount || !payMonth) return;
    setPaySubmitting(true);
    try {
      await api.addTrainerSalaryPayment(id, { amount: payAmount, payMonth: `${payMonth}-01`, notes: "" });
      setPayAmount("");
      setPayMonth("");
      load();
    } finally {
      setPaySubmitting(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  const handleToggle = async () => { await api.toggleTrainerStatus(id); load(); };

  if (loading || !trainer) return <p style={{ color: "#6b7280" }}>Loading trainer...</p>;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Trainer Profile</h1>
          <p className="pageSubtitle">View trainer details</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btnSecondary" onClick={handleToggle}>
            <Power size={16} /> {trainer.status === "active" ? "Deactivate" : "Activate"}
          </button>
          <Link href={`/trainers/${id}/edit`} className="btn btnPrimary">
            <Pencil size={16} /> Edit
          </Link>
        </div>
      </div>

      <div className="profileHeader">
        <div className="profileAvatar">
          {trainer.photo_url ? (
            <img src={`${API_BASE}${trainer.photo_url}`} alt={trainer.name} />
          ) : (
            trainer.name.split(" ").map((n) => n[0]).join("")
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h2 className="profileName">{trainer.name}</h2>
          <p className="profileMeta">{trainer.phone} · {trainer.specialization || "No specialization"} · {trainer.experience_years} yrs experience</p>
        </div>
        <span className={`badge ${trainer.status === "active" ? "badgeSuccess" : "badgeDanger"}`}>
          {trainer.status === "active" ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="formGrid">
          <div><strong>Email</strong><p>{trainer.email || "—"}</p></div>
          <div><strong>Gender</strong><p style={{ textTransform: "capitalize" }}>{trainer.gender}</p></div>
          <div><strong>Specialization</strong><p>{trainer.specialization || "—"}</p></div>
          <div><strong>Experience</strong><p>{trainer.experience_years} years</p></div>
          <div><strong>Employment Type</strong><p style={{ textTransform: "capitalize" }}>{trainer.employment_type || "salary"}</p></div>
          <div><strong>Base Salary</strong><p>Rs. {Number(trainer.base_salary || 0).toLocaleString()}</p></div>
          <div><strong>Session Fee</strong><p>Rs. {Number(trainer.session_fee || 0).toLocaleString()}</p></div>
        </div>
      </div>

      <h3 className="formSectionTitle">Salary Payments</h3>
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleAddPayment} style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 16 }}>
          <div className="formGroup" style={{ marginBottom: 0 }}>
            <label className="formLabel">Amount (PKR)</label>
            <input type="number" className="formInput" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" required />
          </div>
          <div className="formGroup" style={{ marginBottom: 0 }}>
            <label className="formLabel">For Month</label>
            <input type="month" className="formInput" value={payMonth} onChange={(e) => setPayMonth(e.target.value)} required />
          </div>
          <button type="submit" className="btn btnPrimary" disabled={paySubmitting}>
            {paySubmitting ? "Saving..." : "Record Payment"}
          </button>
        </form>
        <table className="table">
          <thead><tr><th>Month</th><th>Amount</th><th>Paid On</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.pay_month).toLocaleDateString("en-US", { year: "numeric", month: "long" })}</td>
                <td>Rs. {Number(p.amount).toLocaleString()}</td>
                <td>{new Date(p.paid_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: "center", padding: 16, color: "#6b7280" }}>No salary payments recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className="formSectionTitle">Assigned Members ({members.length})</h3>
      <div className="tableWrapper">
        <table className="table">
          <thead><tr><th>Name</th><th>Phone</th><th>Plan</th><th>Status</th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td><Link href={`/members/${m.id}`} style={{ color: "var(--color-text-primary)", fontWeight: 600, textDecoration: "none" }}>{m.name}</Link></td>
                <td>{m.phone}</td>
                <td>{m.plan_name || "—"}</td>
                <td><span className={`badge ${m.status === "active" ? "badgeSuccess" : "badgeDanger"}`}>{m.status}</span></td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: "center", padding: 24, color: "#6b7280" }}>No members assigned yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}