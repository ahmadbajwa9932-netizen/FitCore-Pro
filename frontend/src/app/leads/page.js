"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, MoreVertical, UserCheck, XCircle, Pencil, Trash2, Eye } from "lucide-react";
import { api } from "@/lib/api";

const statusLabel = { ongoing: "Ongoing", converted: "Converted", not_converted: "Not Interested" };
const statusBadge = { ongoing: "badgeWarning", converted: "badgeSuccess", not_converted: "badgeDanger" };

export default function LeadsPage() {
    const router = useRouter();
    const [trials, setTrials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [openRow, setOpenRow] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getTrials({ search, status });
    setTrials(data);
    setLoading(false);
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this trial record?")) return;
    setOpenRow(null);
    await api.deleteTrial(id);
    load();
  };

  const handleNotInterested = async (id) => {
    if (!confirm("Mark this lead as Not Interested?")) return;
    setOpenRow(null);
    await api.updateTrialStatus(id, { status: "not_converted" });
    load();
  };

  const handleConvertToMember = (trial) => {
    setOpenRow(null);
    const params = new URLSearchParams({
      fromTrial: trial.id,
      name: trial.name || "",
      phone: trial.phone || "",
      address: trial.address || "",
    });
    router.push(`/members/new?${params.toString()}`);
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Leads / Trial Members</h1>
          <p className="pageSubtitle">{trials.length} trial records</p>
        </div>
        <Link href="/leads/new" className="btn btnPrimary">
          <Plus size={16} /> Add Trial Member
        </Link>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 12px", width: 320 }}>
          <Search size={16} color="#9ca3af" />
          <input
            style={{ border: "none", outline: "none", fontSize: 14, width: "100%" }}
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="formSelect" value={status} onChange={(e) => setStatus(e.target.value)} >
          <option value="all">All Statuses</option>
          <option value="ongoing">Ongoing</option>
          <option value="converted">Converted</option>
          <option value="not_converted">Not Interested</option>
        </select>
      </div>

      <div className="tableWrapper">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Address</th><th>Trial Period</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Loading trial members...</td></tr>}
            {!loading && trials.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.name}</td>
                <td>{t.phone}</td>
                <td>{t.address || "—"}</td>
                <td>{t.trial_start_date?.slice(0, 10)} → {t.trial_end_date?.slice(0, 10)}</td>
                <td><span className={`badge ${statusBadge[t.status]}`}>{statusLabel[t.status]}</span></td>
                <td>
                  <div className="actionCell">
                    <button className="actionIcon" onClick={() => setOpenRow(openRow === t.id ? null : t.id)}>
                      <MoreVertical size={16} />
                    </button>
                    {openRow === t.id && (
                      <div className="actionDropdown">
                        <Link href={`/leads/${t.id}`}><Eye size={14} style={{ marginRight: 8 }} />View</Link>
                        {t.status !== "converted" && (
                          <Link href={`/leads/${t.id}/edit`}><Pencil size={14} style={{ marginRight: 8 }} />Edit</Link>
                        )}
                        {t.status === "ongoing" && (
                          <>
<button onClick={() => handleConvertToMember(t)}><UserCheck size={14} style={{ marginRight: 8 }} />Convert to Member</button>
                            <button onClick={() => handleNotInterested(t.id)}><XCircle size={14} style={{ marginRight: 8 }} />Mark Not Interested</button>
                          </>
                        )}
                        <button style={{ color: "#c0302e" }} onClick={() => handleDelete(t.id)}><Trash2 size={14} style={{ marginRight: 8 }} />Delete</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && trials.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>No trial members yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}