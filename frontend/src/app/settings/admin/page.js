"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const emptyForm = { username: "", email: "", password: "", confirmPassword: "", role: "user" };

export default function AdminPanelPage() {
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const [modalMode, setModalMode] = useState(null); // "create" | "edit" | null
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const [usersRes, meRes] = await Promise.all([api.getUsers(), api.getMe()]);
      setUsers(usersRes.users);
      setMe(meRes.admin);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function openCreate() {
    setModalMode("create");
    setEditingUser(null);
    setForm(emptyForm);
    setAdminPassword("");
    setError("");
  }

  function openEdit(user) {
    setModalMode("edit");
    setEditingUser(user);
    setForm({ username: user.username, email: user.email, password: "", confirmPassword: "", role: user.role });
    setAdminPassword("");
    setError("");
  }

  function closeModal() {
    setModalMode(null);
    setEditingUser(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = { ...form, adminPassword };
      if (modalMode === "create") {
        await api.createUser(payload);
      } else {
        await api.updateUser(editingUser.id, payload);
      }
      closeModal();
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function openDelete(user) {
    setDeleteTarget(user);
    setDeletePassword("");
    setDeleteError("");
  }

  async function handleDelete(e) {
    e.preventDefault();
    setDeleteError("");
    setDeleting(true);
    try {
      await api.deleteUser(deleteTarget.id, { adminPassword: deletePassword });
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="card">Loading admin panel...</div>;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Admin Panel</h1>
          <p className="pageSubtitle">Manage user accounts and access</p>
        </div>
        <button className="btn btnPrimary" onClick={openCreate}>Create User</button>
      </div>

      <div className="tableWrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}{me?.id === u.id && <span className="formHint" style={{ marginLeft: 6 }}>(you)</span>}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === "admin" ? "badgeSuccess" : "badgeWarning"}`}>{u.role}</span>
                </td>
                <td>
                  <div className="actionCell">
                    <button className="actionIcon" onClick={() => openEdit(u)}>Edit</button>
                    {me?.id !== u.id && (
                      <button className="actionIcon" onClick={() => openDelete(u)}>Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalMode && (
        <div className="modalOverlay">
          <div className="modalBox">
            <div className="modalHeader">
              <h3 className="modalTitle">{modalMode === "create" ? "Create User" : "Edit User"}</h3>
              <button className="modalClose" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              {error && <p style={{ color: "#c0302e", fontSize: 13 }}>{error}</p>}

              <div className="formGroup" style={{ marginBottom: 14 }}>
                <label className="formLabel">Username</label>
                <input
                  className="formInput"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  required
                />
              </div>

              <div className="formGroup" style={{ marginBottom: 14 }}>
                <label className="formLabel">Email</label>
                <input
                  type="email"
                  className="formInput"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              <div className="formGroup" style={{ marginBottom: 14 }}>
                <label className="formLabel">Role</label>
                <select
                  className="formSelect"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="formGroup" style={{ marginBottom: 14 }}>
                <label className="formLabel">
                  {modalMode === "create" ? "Password" : "New Password (leave blank to keep current)"}
                </label>
                <input
                  type="password"
                  className="formInput"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required={modalMode === "create"}
                />
              </div>

              <div className="formGroup" style={{ marginBottom: 14 }}>
                <label className="formLabel">Confirm Password</label>
                <input
                  type="password"
                  className="formInput"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  required={modalMode === "create" || !!form.password}
                />
              </div>

              <div className="formGroup" style={{ marginBottom: 4 }}>
                <label className="formLabel">Your Admin Password</label>
                <input
                  type="password"
                  className="formInput"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
                <p className="formHint">Required to confirm this change</p>
              </div>

              <div className="modalActions">
                <button type="button" className="btn btnSecondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btnPrimary" disabled={submitting}>
                  {submitting ? "Saving..." : modalMode === "create" ? "Create" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modalOverlay">
          <div className="modalBox">
            <div className="modalHeader">
              <h3 className="modalTitle">Delete {deleteTarget.username}?</h3>
              <button className="modalClose" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <form onSubmit={handleDelete}>
              {deleteError && <p style={{ color: "#c0302e", fontSize: 13 }}>{deleteError}</p>}
              <div className="formGroup">
                <label className="formLabel">Your Admin Password</label>
                <input
                  type="password"
                  className="formInput"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="modalActions">
                <button type="button" className="btn btnSecondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button type="submit" className="btn btnDanger" disabled={deleting} style={{ background: "#c0302e", color: "#fff" }}>
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}