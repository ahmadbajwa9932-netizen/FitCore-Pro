"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { api } from "@/lib/api";
import "../auth.css";
import EmailInput from "@/components/EmailInput";
export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", softwarePassword: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [adminExists, setAdminExists] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  useEffect(() => {
    api.getAuthStatus().then((status) => {
      if (!status.businessSetup) return router.replace("/business-info");
      setAdminExists(status.adminExists);
      setCheckingStatus(false);
    });
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.login(form);
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingStatus) return <div className="authLoading">Loading...</div>;

  return (
    <div className="authWrapper">
      <div className="authCard">
        <div className="authLogo"><LockKeyhole size={28} /></div>
        <h1 className="authTitle">Welcome Back</h1>
        <p className="authSubtitle">Sign in to continue</p>

        {error && <div className="authError">{error}</div>}

        {!adminExists ? (
          <div style={{ textAlign: "center" }}>
            <p className="formHint" style={{ marginBottom: 16 }}>No admin account has been created yet.</p>
            <button
              type="button"
              className="btn btnPrimary"
              style={{ justifyContent: "center", width: "100%" }}
              onClick={() => router.push("/signup")}
            >
              Create Admin Account
            </button>
          </div>
        ) : (
          <form className="authForm" onSubmit={handleSubmit}>
           <div className="formGroup">
              <label className="formLabel">Email *</label>
              <EmailInput value={form.email} onChange={(val) => setForm({ ...form, email: val })} required />
            </div>
            <div className="formGroup">
              <label className="formLabel">Password *</label>
              <input type="password" className="formInput" required value={form.password} onChange={update("password")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Software Password *</label>
              <input type="password" className="formInput" required value={form.softwarePassword} onChange={update("softwarePassword")} />
            </div>
            <button type="submit" className="btn btnPrimary" disabled={submitting} style={{ justifyContent: "center", marginTop: 8 }}>
              {submitting ? "Signing in..." : "Login"}
            </button>
            <div className="authFooter">
              <button type="button" className="linkBtn" onClick={() => router.push("/forgot-password")}>
                Forgot password?
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}