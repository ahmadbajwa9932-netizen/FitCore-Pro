"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus, X, Wrench } from "lucide-react";
import { api } from "@/lib/api";

const STATUS_LABEL = {
  working: { text: "Working", cls: "badgeSuccess" },
  maintenance: { text: "Under Maintenance", cls: "badgeWarning" },
  out_of_order: { text: "Out of Order", cls: "badgeDanger" },
};

export default function EquipmentDetailPage() {
  const { id } = useParams();
  const [equipment, setEquipment] = useState(null);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ description: "", cost: "", maintenanceDate: "", nextDueDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [eq, m] = await Promise.all([api.getEquipmentItem(id), api.getEquipmentMaintenance(id)]);
    setEquipment(eq);
    setMaintenance(m);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const openModal = () => {
    setForm({ description: "", cost: "", maintenanceDate: new Date().toISOString().slice(0, 10), nextDueDate: "" });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.logMaintenance(id, form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !equipment) return <p style={{ color: "#6b7280" }}>Loading equipment...</p>;
  const status = STATUS_LABEL[equipment.status] || STATUS_LABEL.working;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">{equipment.name}</h1>
          <p className="pageSubtitle">{equipment.category || "Uncategorized"} · Qty: {equipment.quantity}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btnSecondary" onClick={openModal}>
            <Wrench size={16} /> Log Maintenance
          </button>
          <Link href={`/equipment/${id}/edit`} className="btn btnPrimary">
            <Pencil size={16} /> Edit
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="formGrid">
          <div><strong>Status</strong><p><span className={`badge ${status.cls}`}>{status.text}</span></p></div>
          <div><strong>Purchase Date</strong><p>{equipment.purchase_date?.slice(0, 10) || "—"}</p></div>
          <div><strong>Purchase Cost</strong><p>{equipment.purchase_cost ? `Rs. ${equipment.purchase_cost}` : "—"}</p></div>
          <div><strong>Warranty Expiry</strong><p>{equipment.warranty_expiry?.slice(0, 10) || "—"}</p></div>
          <div className="formGroupFull"><strong>Notes</strong><p>{equipment.notes || "—"}</p></div>
        </div>
      </div>

      <h3 className="formSectionTitle">Maintenance History ({maintenance.length})</h3>
      <div className="card">
        {maintenance.length === 0 && (
          <p style={{ textAlign: "center", padding: "24px 0", color: "#6b7280" }}>No maintenance logged yet.</p>
        )}
        {maintenance.map((m) => (
          <div className="maintenanceItem" key={m.id}>
            <div className="maintenanceDate">{m.maintenance_date?.slice(0, 10)}</div>
            <div className="maintenanceBody">
              <p className="maintenanceDesc">{m.description}</p>
              <p className="maintenanceMeta">
                {m.cost ? `Cost: Rs. ${m.cost}` : "No cost recorded"}
                {m.next_due_date ? ` · Next due: ${m.next_due_date.slice(0, 10)}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="modalOverlay" onClick={() => setModalOpen(false)}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3 className="modalTitle">Log Maintenance</h3>
              <button className="modalClose" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="formGroup" style={{ marginBottom: 14 }}>
                <label className="formLabel">Description *</label>
                <input
                  className="formInput"
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Replaced treadmill belt"
                />
              </div>
              <div className="formGrid" style={{ marginBottom: 14 }}>
                <div className="formGroup">
                  <label className="formLabel">Maintenance Date *</label>
                  <input
                    type="date"
                    className="formInput"
                    required
                    value={form.maintenanceDate}
                    onChange={(e) => setForm({ ...form, maintenanceDate: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label className="formLabel">Cost (Rs.)</label>
                  <input
                    type="number"
                    className="formInput"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    placeholder="optional"
                  />
                </div>
              </div>
              <div className="formGroup" style={{ marginBottom: 14 }}>
                <label className="formLabel">Next Due Date</label>
                <input
                  type="date"
                  className="formInput"
                  value={form.nextDueDate}
                  onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                />
                <span className="formHint">Optional — schedule the next check-up</span>
              </div>
              {error && <p style={{ color: "#c0302e", fontSize: 13 }}>{error}</p>}
              <div className="modalActions">
                <button type="button" className="btn btnSecondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btnPrimary" disabled={submitting}>
                  {submitting ? "Saving..." : "Log Maintenance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}