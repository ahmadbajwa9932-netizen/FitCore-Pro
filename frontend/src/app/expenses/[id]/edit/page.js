"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function EditExpensePage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getExpense(id).then((data) => {
      setForm({
        expenseType: data.expense_type || "",
        title: data.title || "",
        amount: data.amount ?? "",
        days: data.days ?? "1",
        expenseDate: data.expense_date?.slice(0, 10) || "",
        notes: data.notes || "",
      });
      setLoading(false);
    });
  }, [id]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.updateExpense(id, form);
      router.push("/expenses");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !form) return <p style={{ color: "#6b7280" }}>Loading expense...</p>;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Edit Expense</h1>
          <p className="pageSubtitle">Update expense details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="formCard">
          <h3 className="formSectionTitle">Expense Details</h3>
          <div className="formGrid">
            <div className="formGroup">
              <label className="formLabel">Expense Type *</label>
              <input className="formInput" required value={form.expenseType} onChange={update("expenseType")} placeholder="e.g. Bill, Rent, Maintenance" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Title</label>
              <input className="formInput" value={form.title} onChange={update("title")} placeholder="e.g. Electricity Bill - July" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Amount (Rs.) *</label>
              <input type="number" className="formInput" required value={form.amount} onChange={update("amount")} placeholder="0.00" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Days *</label>
              <input type="number" className="formInput" required value={form.days} onChange={update("days")} placeholder="e.g. 30 for a monthly bill" />
              <span className="formHint">Number of days this expense covers (e.g. 30 for a month, 1 for a single day)</span>
            </div>
            <div className="formGroup">
              <label className="formLabel">Expense Date *</label>
              <input type="date" className="formInput" required value={form.expenseDate} onChange={update("expenseDate")} />
            </div>
          </div>
          <div className="formGroup" style={{ marginTop: 16 }}>
            <label className="formLabel">Notes</label>
            <textarea className="formTextarea" value={form.notes} onChange={update("notes")} placeholder="Additional details..." />
          </div>
        </div>

        {error && <p style={{ color: "#c0302e", marginBottom: 12 }}>{error}</p>}

        <div className="formActions">
          <button type="button" className="btn btnSecondary" onClick={() => router.push("/expenses")}>Cancel</button>
          <button type="submit" className="btn btnPrimary" disabled={submitting}>
            {submitting ? "Saving..." : "Update Expense"}
          </button>
        </div>
      </form>
    </div>
  );
}