"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import "../auth.css";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "", email: "", password: "", confirmPassword: "",
    softwarePassword: "", confirmSoftwarePassword: "",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  useEffect(() => {
    api.getAuthStatus().then((status) => {
      if (status.adminExists) router.replace("/login");
    });
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) return setError("Passwords do not match");
    if (form.softwarePassword !== form.confirmSoftwarePassword) return setError("Software passwords do not match");

    setSubmitting(true);
    try {
      await api.signup(form);
      router.push("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="authWrapper">
      <div className="authCard">
        <div className="authLogo"><ShieldCheck size={28} /></div>
        <h1 className="authTitle">Create Admin Account</h1>
        <p className="authSubtitle">This will be your system's super admin</p>

        {error && <div className="authError">{error}</div>}

        <form className="authForm" onSubmit={handleSubmit}>
          <div className="formGroup">
            <label className="formLabel">Username *</label>
            <input className="formInput" required value={form.username} onChange={update("username")} />
          </div>
          <div className="formGroup">
            <label className="formLabel">Email *</label>
            <input type="email" className="formInput" required value={form.email} onChange={update("email")} />
          </div>
          <div className="authGrid">
            <div className="formGroup">
              <label className="formLabel">Password *</label>
              <input type="password" className="formInput" required value={form.password} onChange={update("password")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Confirm Password *</label>
              <input type="password" className="formInput" required value={form.confirmPassword} onChange={update("confirmPassword")} />
            </div>
          </div>
          <div className="authGrid">
            <div className="formGroup">
              <label className="formLabel">Software Password *</label>
              <input type="password" className="formInput" required value={form.softwarePassword} onChange={update("softwarePassword")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Confirm Software Password *</label>
              <input type="password" className="formInput" required value={form.confirmSoftwarePassword} onChange={update("confirmSoftwarePassword")} />
            </div>
          </div>
          <span className="formHint">Software password is a second layer used for sensitive actions.</span>
          <button type="submit" className="btn btnPrimary" disabled={submitting} style={{ justifyContent: "center", marginTop: 8 }}>
            {submitting ? "Creating..." : "Create Admin Account"}
          </button>
        </form>
      </div>
    </div>
  );
}