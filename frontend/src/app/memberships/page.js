"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Power } from "lucide-react";
import { api } from "@/lib/api";

const emptyForm = { name: "", description: "", durationDays: "", price: "" };

export default function MembershipsPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getPlans();
    setPlans(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setError(null); setModalOpen(true); };
  const openEdit = (plan) => {
    setEditingId(plan.id);
    setForm({ name: plan.name, description: plan.description || "", durationDays: plan.duration_days, price: plan.price });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await api.updatePlan(editingId, form);
      } else {
        await api.createPlan(form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id) => { await api.togglePlanStatus(id); load(); };

  const handleDelete = async (id) => {
    if (!confirm("Delete this plan?")) return;
    try {
      await api.deletePlan(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Membership Plans</h1>
          <p className="pageSubtitle">{plans.length} plans configured</p>
        </div>
        <button className="btn btnPrimary" onClick={openAdd}>
          <Plus size={16} /> Add Plan
        </button>
      </div>

      <div className="tableWrapper">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Description</th><th>Duration</th><th>Price</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Loading plans...</td></tr>}
            {!loading && plans.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{p.description || "—"}</td>
                <td>{p.duration_days} days</td>
                <td>Rs. {p.price}</td>
                <td>
                  <span className={`badge ${p.status === "active" ? "badgeSuccess" : "badgeDanger"}`}>
                    {p.status === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="actionCell">
                    <button className="actionIcon" onClick={() => handleToggle(p.id)} title="Toggle status"><Power size={16} /></button>
                    <button className="actionIcon" onClick={() => openEdit(p)}><Pencil size={16} /></button>
                    <button className="actionIcon" onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && plans.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>
                No plans yet. Click "Add Plan" to create your first one.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modalOverlay" onClick={() => setModalOpen(false)}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3 className="modalTitle">{editingId ? "Edit Plan" : "Add Plan"}</h3>
              <button className="modalClose" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="formGroup" style={{ marginBottom: 14 }}>
                <label className="formLabel">Plan Name *</label>
                <input className="formInput" required value={form.name} onChange={update("name")} placeholder="e.g. Gold - Monthly" />
              </div>
              <div className="formGroup" style={{ marginBottom: 14 }}>
                <label className="formLabel">Description</label>
                <input className="formInput" value={form.description} onChange={update("description")} placeholder="Optional short note" />
              </div>
              <div className="formGrid" style={{ marginBottom: 14 }}>
                <div className="formGroup">
                  <label className="formLabel">Duration (days) *</label>
                  <input type="number" className="formInput" required value={form.durationDays} onChange={update("durationDays")} placeholder="30" />
                </div>
                <div className="formGroup">
                  <label className="formLabel">Price (Rs.) *</label>
                  <input type="number" className="formInput" required value={form.price} onChange={update("price")} placeholder="5000" />
                </div>
              </div>
              {error && <p style={{ color: "#c0302e", fontSize: 13 }}>{error}</p>}
              <div className="modalActions">
                <button type="button" className="btn btnSecondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btnPrimary" disabled={submitting}>
                  {submitting ? "Saving..." : editingId ? "Save Changes" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}