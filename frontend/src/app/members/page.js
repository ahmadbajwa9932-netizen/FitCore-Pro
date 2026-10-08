"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search, Plus, MoreVertical, Eye, Pencil,
  RefreshCcw, PauseCircle, Trash2,
} from "lucide-react";
import styles from "./members.module.css";
import { api } from "@/lib/api";
import { expiryLabel } from "@/lib/dateHelpers";

const STATUS_LABEL = {
  active: { text: "Active", cls: "badgeSuccess" },
  frozen: { text: "Frozen", cls: "badgeWarning" },
  expired: { text: "Expired", cls: "badgeDanger" },
  cancelled: { text: "Cancelled", cls: "badgeDanger" },
};

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openRow, setOpenRow] = useState(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMembers({ search, status: statusFilter });
      setMembers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(loadMembers, 300); // debounce search
    return () => clearTimeout(timeout);
  }, [loadMembers]);

  useEffect(() => {
    api.getPlans({ status: "active" }).then(setPlans);
  }, []);

  const handleFreeze = async (id) => {
    await api.freezeMember(id);
    setOpenRow(null);
    loadMembers();
  };

  const handleResume = async (id) => {
    await api.resumeMember(id);
    setOpenRow(null);
    loadMembers();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this member? This cannot be undone.")) return;
    await api.deleteMember(id);
    setOpenRow(null);
    loadMembers();
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Members</h1>
          <p className="pageSubtitle">{members.length} total members</p>
        </div>
        <Link href="/members/new" className="btn btnPrimary">
          <Plus size={16} />
          Add Member
        </Link>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} color="#9ca3af" />
          <input
            className={styles.searchInput}
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="formSelect" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="frozen">Frozen</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="tableWrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Member</th><th>Phone</th><th>Plan</th><th>Status</th>
              <th>Join Date</th><th>Expiry Date</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Loading members...</td></tr>
            )}
            {error && !loading && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#c0302e" }}>{error}</td></tr>
            )}
            {!loading && !error && members.map((m) => {
              const status = STATUS_LABEL[m.status] || STATUS_LABEL.active;
              const exp = m.status !== "frozen" ? expiryLabel(m.expiry_date) : null;
              return (
                <tr key={m.id}>
                  <td>
                    <div className={styles.memberCell}>
                      <div className={styles.avatar}>{m.name.split(" ").map((n) => n[0]).join("")}</div>
                      <Link href={`/members/${m.id}`} className={styles.memberName}>{m.name}</Link>
                    </div>
                  </td>
                  <td>{m.phone}</td>
                  <td>{m.plan_name || "—"}</td>
                  <td><span className={`badge ${status.cls}`}>{status.text}</span></td>
                  <td>{m.start_date?.slice(0, 10)}</td>
                  <td>
                    {m.expiry_date?.slice(0, 10)}
                    {exp && (
                      <div>
                        <span className={`badge ${exp.cls}`} style={{ marginTop: 4, fontSize: 11 }}>{exp.text}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="actionCell">
                      <button className="actionIcon" onClick={() => setOpenRow(openRow === m.id ? null : m.id)}>
                        <MoreVertical size={16} />
                      </button>
                      {openRow === m.id && (
                        <div className="actionDropdown">
                          <Link href={`/members/${m.id}`}><Eye size={14} style={{ marginRight: 8 }} />View Profile</Link>
                          <Link href={`/members/${m.id}/edit`}><Pencil size={14} style={{ marginRight: 8 }} />Edit</Link>
                          <Link href={`/members/${m.id}/renew`}><RefreshCcw size={14} style={{ marginRight: 8 }} />Renew</Link>
                          {m.status === "frozen" ? (
                            <button onClick={() => handleResume(m.id)}><RefreshCcw size={14} style={{ marginRight: 8 }} />Resume</button>
                          ) : (
                            <button onClick={() => handleFreeze(m.id)}><PauseCircle size={14} style={{ marginRight: 8 }} />Freeze</button>
                          )}
                          <button style={{ color: "#c0302e" }} onClick={() => handleDelete(m.id)}><Trash2 size={14} style={{ marginRight: 8 }} />Delete</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && !error && members.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>No members found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}