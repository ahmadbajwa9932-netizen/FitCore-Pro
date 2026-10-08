"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import "@/app/auth.css";

export default function LicenseExpiredPage() {
  const router = useRouter();
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [modal, setModal] = useState(null); // "renew" | "recover" | null
  const [days, setDays] = useState("");
  const [activationKey, setActivationKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getLicenseStatus().then(setLicenseStatus).catch(() => {});
  }, []);

  async function handleRenew(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.renewLicense({ days: days.trim().toUpperCase(), activationKey: activationKey.trim() });
      router.replace("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecover(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.recoverLicense({ activationKey: activationKey.trim() });
      if (res.status === "expired") {
        setError("License integrity restored, but it's naturally expired. Please renew.");
        setLicenseStatus((s) => ({ ...s, status: "expired" }));
        setModal(null);
      } else {
        router.replace("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const isTampered = licenseStatus?.status === "tampered";
  const isExpired = licenseStatus?.status === "expired";

  return (
    <div className="authPage">
      <div className="formCard" style={{ maxWidth: 420, margin: "80px auto", textAlign: "center" }}>
        <h2 className="formSectionTitle">
          {isTampered ? "License Verification Failed" : "License Expired"}
        </h2>
        <p className="formHint" style={{ marginBottom: 20 }}>
          {isTampered
            ? "Your license data could not be verified. Please recover your license."
            : "Your license period has ended. Please renew to continue."}
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {isExpired && !isTampered && (
            <button className="btn btnPrimary" onClick={() => { setModal("renew"); setError(""); }}>
              Renew License
            </button>
          )}
          {isTampered && (
            <button className="btn btnPrimary" onClick={() => { setModal("recover"); setError(""); }}>
              Recover License
            </button>
          )}
        </div>
      </div>

      {modal === "renew" && (
        <div className="modalOverlay">
          <div className="modalBox">
            <div className="modalHeader">
              <h3 className="modalTitle">Renew License</h3>
              <button className="modalClose" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleRenew}>
              {error && <p style={{ color: "#c0302e", fontSize: 13 }}>{error}</p>}
              <div className="formGroup" style={{ marginBottom: 16 }}>
                <label className="formLabel">Days Code</label>
                <input className="formInput" value={days} onChange={(e) => setDays(e.target.value)} required />
              </div>
              <div className="formGroup">
                <label className="formLabel">Activation Key</label>
                <input className="formInput" value={activationKey} onChange={(e) => setActivationKey(e.target.value)} required />
              </div>
              <div className="modalActions">
                <button type="button" className="btn btnSecondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btnPrimary" disabled={loading}>
                  {loading ? "Renewing..." : "Renew"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "recover" && (
        <div className="modalOverlay">
          <div className="modalBox">
            <div className="modalHeader">
              <h3 className="modalTitle">Recover License</h3>
              <button className="modalClose" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleRecover}>
              {error && <p style={{ color: "#c0302e", fontSize: 13 }}>{error}</p>}
              <div className="formGroup">
                <label className="formLabel">Activation Key</label>
                <input className="formInput" value={activationKey} onChange={(e) => setActivationKey(e.target.value)} required />
              </div>
              <div className="modalActions">
                <button type="button" className="btn btnSecondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btnPrimary" disabled={loading}>
                  {loading ? "Recovering..." : "Recover"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}