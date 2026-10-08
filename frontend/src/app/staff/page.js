"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, MoreVertical, Pencil, Trash2, UserCheck, UserX, Eye } from "lucide-react";
import { api } from "@/lib/api";

const statusBadge = { active: "badgeSuccess", inactive: "badgeDanger" };

export default function StaffPage() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [openRow, setOpenRow] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getStaffList({ search, status });
    setStaffList(data);
    setLoading(false);
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this staff member?")) return;
    setOpenRow(null);
    await api.deleteStaff(id);
    load();
  };

  const handleToggleStatus = async (id) => {
    setOpenRow(null);
    await api.toggleStaffStatus(id);
    load();
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Staff</h1>
          <p className="pageSubtitle">{staffList.length} staff members</p>
        </div>
        <Link href="/staff/new" className="btn btnPrimary">
          <Plus size={16} /> Add Staff Member
        </Link>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 12px", width: 320 }}>
          <Search size={16} color="#9ca3af" />
          <input
            style={{ border: "none", outline: "none", fontSize: 14, width: "100%" }}
            placeholder="Search by name, phone or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="formSelect" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="tableWrapper">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Role</th><th>Phone</th><th>Address</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Loading staff...</td></tr>}
            {!loading && staffList.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td>{s.role}</td>
                <td>{s.phone}</td>
                <td>{s.address || "—"}</td>
                <td><span className={`badge ${statusBadge[s.status]}`}>{s.status === "active" ? "Active" : "Inactive"}</span></td>
                <td>
                  <div className="actionCell">
                    <button className="actionIcon" onClick={() => setOpenRow(openRow === s.id ? null : s.id)}>
                      <MoreVertical size={16} />
                    </button>
                    {openRow === s.id && (
                      <div className="actionDropdown">
                        <Link href={`/staff/${s.id}/edit`}><Pencil size={14} style={{ marginRight: 8 }} />Edit</Link>
                        <Link href={`/staff/${s.id}`}><Eye size={14} style={{ marginRight: 8 }} />View</Link>
                        {s.status === "active" ? (
                          <button onClick={() => handleToggleStatus(s.id)}><UserX size={14} style={{ marginRight: 8 }} />Deactivate</button>
                        ) : (
                          <button onClick={() => handleToggleStatus(s.id)}><UserCheck size={14} style={{ marginRight: 8 }} />Activate</button>
                        )}
                        <button style={{ color: "#c0302e" }} onClick={() => handleDelete(s.id)}><Trash2 size={14} style={{ marginRight: 8 }} />Delete</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && staffList.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>No staff members yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}