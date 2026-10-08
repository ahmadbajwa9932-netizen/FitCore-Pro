"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function AddEquipmentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", category: "", quantity: 1, purchaseDate: "",
    purchaseCost: "", warrantyExpiry: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createEquipment(form);
      router.push("/equipment");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Add Equipment</h1>
          <p className="pageSubtitle">Register a new equipment item</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="formCard">
          <h3 className="formSectionTitle">Equipment Details</h3>
          <div className="formGrid">
            <div className="formGroup">
              <label className="formLabel">Name *</label>
              <input className="formInput" required value={form.name} onChange={update("name")} placeholder="e.g. Treadmill" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Category</label>
              <input className="formInput" value={form.category} onChange={update("category")} placeholder="e.g. Cardio" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Quantity</label>
              <input type="number" className="formInput" value={form.quantity} onChange={update("quantity")} min="1" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Purchase Date</label>
              <input type="date" className="formInput" value={form.purchaseDate} onChange={update("purchaseDate")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Purchase Cost (Rs.)</label>
              <input type="number" className="formInput" value={form.purchaseCost} onChange={update("purchaseCost")} placeholder="optional" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Warranty Expiry</label>
              <input type="date" className="formInput" value={form.warrantyExpiry} onChange={update("warrantyExpiry")} />
            </div>
            <div className="formGroup formGroupFull">
              <label className="formLabel">Notes</label>
              <textarea className="formTextarea" value={form.notes} onChange={update("notes")} placeholder="Any additional details" />
            </div>
          </div>
        </div>

        {error && <p style={{ color: "#c0302e", marginBottom: 12 }}>{error}</p>}

        <div className="formActions">
          <button type="button" className="btn btnSecondary" onClick={() => router.push("/equipment")}>Cancel</button>
          ...
          <button type="submit" className="btn btnPrimary" disabled={submitting}>
            {submitting ? "Saving..." : "Save Equipment"}
          </button>
        </div>
      </form>
    </div>
  );
}