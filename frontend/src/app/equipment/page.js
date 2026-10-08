"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, MoreVertical, Eye, Pencil, Wrench, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { maintenanceDueLabel } from "@/lib/maintenanceHelpers";

const STATUS_LABEL = {
  working: { text: "Working", cls: "badgeSuccess" },
  maintenance: { text: "Under Maintenance", cls: "badgeWarning" },
  out_of_order: { text: "Out of Order", cls: "badgeDanger" },
};

export default function EquipmentPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openRow, setOpenRow] = useState(null);

  const [maintenanceTarget, setMaintenanceTarget] = useState(null);
  const [form, setForm] = useState({ description: "", cost: "", maintenanceDate: "", nextDueDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getEquipment({ search, status: statusFilter });
    setItems(data);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this equipment item?")) return;
    setOpenRow(null);
    await api.deleteEquipment(id);
    load();
  };

  const openMaintenance = (item) => {
    setMaintenanceTarget(item);
    setForm({ description: "", cost: "", maintenanceDate: new Date().toISOString().slice(0, 10), nextDueDate: "" });
    setError(null);
    setOpenRow(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.logMaintenance(maintenanceTarget.id, form);
      setMaintenanceTarget(null);
      load();
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
          <h1 className="pageTitle">Equipment</h1>
          <p className="pageSubtitle">{items.length} items tracked</p>
        </div>
        <Link href="/equipment/new" className="btn btnPrimary">
          <Plus size={16} /> Add Equipment
        </Link>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 12px", width: 320 }}>
          <Search size={16} color="#9ca3af" />
          <input
            style={{ border: "none", outline: "none", fontSize: 14, width: "100%" }}
            placeholder="Search equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="formSelect" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="working">Working</option>
          <option value="maintenance">Under Maintenance</option>
          <option value="out_of_order">Out of Order</option>
        </select>
      </div>

      <div className="tableWrapper">
        <table className="table">
          <thead>
          <tr><th>Name</th><th>Category</th><th>Qty</th><th>Purchase Date</th><th>Status</th><th>Next Maintenance</th><th></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Loading equipment...</td></tr>}
            {!loading && items.map((eq) => {
              const status = STATUS_LABEL[eq.status] || STATUS_LABEL.working;
              return (
                <tr key={eq.id}>
                  <td style={{ fontWeight: 600 }}>
                    <Link href={`/equipment/${eq.id}`} style={{ color: "var(--color-text-primary)", textDecoration: "none" }}>{eq.name}</Link>
                  </td>
                  <td>{eq.category || "—"}</td>
                  <td>{eq.quantity}</td>
                  <td>{eq.purchase_date?.slice(0, 10) || "—"}</td>
                  <td><span className={`badge ${status.cls}`}>{status.text}</span></td>
                  <td>
  {(() => {
    const due = maintenanceDueLabel(eq.next_due_date);
    return due.cls ? <span className={`badge ${due.cls}`}>{due.text}</span> : due.text;
  })()}
</td>
                  <td>
                    <div className="actionCell">
                      <button className="actionIcon" onClick={() => setOpenRow(openRow === eq.id ? null : eq.id)}>
                        <MoreVertical size={16} />
                      </button>
                      {openRow === eq.id && (
                        <div className="actionDropdown">
                          <Link href={`/equipment/${eq.id}`}><Eye size={14} style={{ marginRight: 8 }} />View Details</Link>
                          <Link href={`/equipment/${eq.id}/edit`}><Pencil size={14} style={{ marginRight: 8 }} />Edit</Link>
                          <button onClick={() => openMaintenance(eq)}><Wrench size={14} style={{ marginRight: 8 }} />Log Maintenance</button>
                          <button style={{ color: "#c0302e" }} onClick={() => handleDelete(eq.id)}><Trash2 size={14} style={{ marginRight: 8 }} />Delete</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>No equipment yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {maintenanceTarget && (
        <div className="modalOverlay" onClick={() => setMaintenanceTarget(null)}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3 className="modalTitle">Log Maintenance — {maintenanceTarget.name}</h3>
              <button className="modalClose" onClick={() => setMaintenanceTarget(null)}><X size={18} /></button>
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
                <span className="formHint">Optional — when the next scheduled service is due</span>
              </div>
              {error && <p style={{ color: "#c0302e", fontSize: 13 }}>{error}</p>}
              <div className="modalActions">
                <button type="button" className="btn btnSecondary" onClick={() => setMaintenanceTarget(null)}>Cancel</button>
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