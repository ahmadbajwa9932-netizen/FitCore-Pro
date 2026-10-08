"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function EditEquipmentPage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getEquipmentItem(id).then((eq) =>
      setForm({
        name: eq.name, category: eq.category || "", quantity: eq.quantity,
        purchaseDate: eq.purchase_date?.slice(0, 10) || "",
        purchaseCost: eq.purchase_cost || "", warrantyExpiry: eq.warranty_expiry?.slice(0, 10) || "",
        status: eq.status, notes: eq.notes || "",
      })
    );
  }, [id]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.updateEquipment(id, form);
      router.push(`/equipment/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!form) return <p style={{ color: "#6b7280" }}>Loading...</p>;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Edit Equipment</h1>
          <p className="pageSubtitle">Update {form.name}'s details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="formCard">
          <h3 className="formSectionTitle">Equipment Details</h3>
          <div className="formGrid">
            <div className="formGroup">
              <label className="formLabel">Name *</label>
              <input className="formInput" required value={form.name} onChange={update("name")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Category</label>
              <input className="formInput" value={form.category} onChange={update("category")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Quantity</label>
              <input type="number" className="formInput" value={form.quantity} onChange={update("quantity")} min="1" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Status</label>
              <select className="formSelect" value={form.status} onChange={update("status")}>
                <option value="working">Working</option>
                <option value="maintenance">Under Maintenance</option>
                <option value="out_of_order">Out of Order</option>
              </select>
            </div>
            <div className="formGroup">
              <label className="formLabel">Purchase Date</label>
              <input type="date" className="formInput" value={form.purchaseDate} onChange={update("purchaseDate")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Purchase Cost (Rs.)</label>
              <input type="number" className="formInput" value={form.purchaseCost} onChange={update("purchaseCost")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Warranty Expiry</label>
              <input type="date" className="formInput" value={form.warrantyExpiry} onChange={update("warrantyExpiry")} />
            </div>
            <div className="formGroup formGroupFull">
              <label className="formLabel">Notes</label>
              <textarea className="formTextarea" value={form.notes} onChange={update("notes")} />
            </div>
          </div>
        </div>

        {error && <p style={{ color: "#c0302e", marginBottom: 12 }}>{error}</p>}

        <div className="formActions">
          <button type="button" className="btn btnSecondary" onClick={() => router.push(`/equipment/${id}`)}>Cancel</button>
          ...
          <button type="submit" className="btn btnPrimary" disabled={submitting}>
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}