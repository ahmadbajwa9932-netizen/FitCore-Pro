"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Pencil, Power } from "lucide-react";
import { api } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function StaffProfilePage() {
  const { id } = useParams();
  const [staff, setStaff] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payAmount, setPayAmount] = useState("");
  const [payMonth, setPayMonth] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, p] = await Promise.all([api.getStaffMember(id), api.getStaffSalaryPayments(id)]);
    setStaff(s);
    setPayments(p);
    setLoading(false);
  }, [id]);

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!payAmount || !payMonth) return;
    setPaySubmitting(true);
    try {
      await api.addStaffSalaryPayment(id, { amount: payAmount, payMonth: `${payMonth}-01`, notes: "" });
      setPayAmount("");
      setPayMonth("");
      load();
    } finally {
      setPaySubmitting(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  const handleToggle = async () => { await api.toggleStaffStatus(id); load(); };

  if (loading || !staff) return <p style={{ color: "#6b7280" }}>Loading staff member...</p>;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Staff Profile</h1>
          <p className="pageSubtitle">View staff member details</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btnSecondary" onClick={handleToggle}>
            <Power size={16} /> {staff.status === "active" ? "Deactivate" : "Activate"}
          </button>
          <Link href={`/staff/${id}/edit`} className="btn btnPrimary">
            <Pencil size={16} /> Edit
          </Link>
        </div>
      </div>

      <div className="profileHeader">
        <div className="profileAvatar">
          {staff.photo_url ? (
            <img src={`${API_BASE}${staff.photo_url}`} alt={staff.name} />
          ) : (
            staff.name.split(" ").map((n) => n[0]).join("")
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h2 className="profileName">{staff.name}</h2>
          <p className="profileMeta">{staff.phone} · {staff.role}</p>
        </div>
        <span className={`badge ${staff.status === "active" ? "badgeSuccess" : "badgeDanger"}`}>
          {staff.status === "active" ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="formGrid">
          <div><strong>Email</strong><p>{staff.email || "—"}</p></div>
          <div><strong>Gender</strong><p style={{ textTransform: "capitalize" }}>{staff.gender}</p></div>
          <div><strong>Role</strong><p>{staff.role}</p></div>
          <div><strong>Address</strong><p>{staff.address || "—"}</p></div>
          <div><strong>Emergency Contact</strong><p>{staff.emergency_name || "—"} {staff.emergency_phone ? `(${staff.emergency_phone})` : ""}</p></div>
          <div><strong>Join Date</strong><p>{staff.join_date ? new Date(staff.join_date).toLocaleDateString() : "—"}</p></div>
          <div><strong>Employment Type</strong><p style={{ textTransform: "capitalize" }}>{staff.employment_type || "salary"}</p></div>
          <div><strong>Base Salary</strong><p>Rs. {Number(staff.base_salary || 0).toLocaleString()}</p></div>
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
    </div>
  );
}