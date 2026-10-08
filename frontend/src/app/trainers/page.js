"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, Power, Trash2, Eye } from "lucide-react";
import { api } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function TrainersPage() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getTrainers({ search, status: statusFilter });
    setTrainers(data);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleToggle = async (id) => { await api.toggleTrainerStatus(id); load(); };
  const handleDelete = async (id) => {
    if (!confirm("Delete this trainer?")) return;
    await api.deleteTrainer(id);
    load();
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Trainers</h1>
          <p className="pageSubtitle">{trainers.length} trainers on staff</p>
        </div>
        <Link href="/trainers/new" className="btn btnPrimary">
          <Plus size={16} /> Add Trainer
        </Link>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 12px", width: 320 }}>
          <Search size={16} color="#9ca3af" />
          <input
            style={{ border: "none", outline: "none", fontSize: 14, width: "100%" }}
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="formSelect" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="tableWrapper">
        <table className="table">
          <thead>
          <tr><th>Trainer</th><th>Phone</th><th>Specialization</th><th>Experience</th><th>Employment</th><th>Session Fee</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Loading trainers...</td></tr>}
            {!loading && trainers.map((t) => (
              <tr key={t.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 999, background: "var(--color-sidebar-bg)", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                      {t.photo_url ? (
                        <img src={`${API_BASE}${t.photo_url}`} alt={t.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        t.name.split(" ").map((n) => n[0]).join("")
                      )}
                    </div>
                    <Link href={`/trainers/${t.id}`} style={{ color: "var(--color-text-primary)", fontWeight: 600, textDecoration: "none" }}>
                      {t.name}
                    </Link>
                  </div>
                </td>
                <td>{t.phone}</td>
                <td>{t.specialization || "—"}</td>
                <td>{t.experience_years} yrs</td>
                <td style={{ textTransform: "capitalize" }}>{t.employment_type || "salary"}</td>
                <td>Rs. {Number(t.session_fee || 0).toLocaleString()}</td>
                <td>
                  <span className={`badge ${t.status === "active" ? "badgeSuccess" : "badgeDanger"}`}>
                    {t.status === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="actionCell">
                    <Link href={`/trainers/${t.id}`} className="actionIcon"><Eye size={16} /></Link>
                    <button className="actionIcon" onClick={() => handleToggle(t.id)} title="Toggle status"><Power size={16} /></button>
                    <button className="actionIcon" onClick={() => handleDelete(t.id)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && trainers.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>No trainers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}