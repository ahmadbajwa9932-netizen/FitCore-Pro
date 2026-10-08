"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import "@/app/auth.css";

export default function LicensePage() {
  const router = useRouter();
  const [days, setDays] = useState("");
  const [activationKey, setActivationKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.activateLicense({ days: days.trim().toUpperCase(), activationKey: activationKey.trim() });
      router.replace("/business-info");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authPage">
      <form className="formCard" onSubmit={handleSubmit} style={{ maxWidth: 420, margin: "80px auto" }}>
        <h2 className="formSectionTitle">Activate License</h2>
        {error && <p style={{ color: "#c0302e", fontSize: 13 }}>{error}</p>}
        <div className="formGroup" style={{ marginBottom: 16 }}>
          <label className="formLabel">Days Code</label>
          <input
            className="formInput"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="e.g. MQ"
            required
          />
        </div>
        <div className="formGroup" style={{ marginBottom: 20 }}>
          <label className="formLabel">Activation Key</label>
          <input
            className="formInput"
            value={activationKey}
            onChange={(e) => setActivationKey(e.target.value)}
            placeholder="Enter activation key"
            required
          />
        </div>
        <button className="btn btnPrimary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Activating..." : "Activate License"}
        </button>
      </form>
    </div>
  );
}