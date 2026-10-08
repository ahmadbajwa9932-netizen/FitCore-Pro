"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

function pad(n) {
  return String(n).padStart(2, "0");
}

function useCountdown(expiryDate) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!expiryDate) return;
    // Treat expiry as end-of-day so the final calendar day is fully counted.
    const target = new Date(`${expiryDate}T23:59:59`);

    function tick() {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) {
        setRemaining({ expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setRemaining({
        expired: false,
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiryDate]);

  return remaining;
}

export default function LicenseSettingsPage() {
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [showUnlock, setShowUnlock] = useState(false);
  const [showRenewEarly, setShowRenewEarly] = useState(false);
  const [unlockKey, setUnlockKey] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);

  const [earlyDays, setEarlyDays] = useState("");
  const [earlyKey, setEarlyKey] = useState("");
  const [earlyError, setEarlyError] = useState("");
  const [earlySubmitting, setEarlySubmitting] = useState(false);
  const [earlySuccess, setEarlySuccess] = useState("");

  const loadLicense = useCallback(async () => {
    try {
      const data = await api.getLicenseStatus();
      setLicense(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLicense();
  }, [loadLicense]);

  const countdown = useCountdown(license?.expiryDate);

  async function handleUnlock(e) {
    e.preventDefault();
    setUnlockError("");
    setUnlockLoading(true);
    try {
      await api.verifyUnlockKey({ activationKey: unlockKey.trim() });
      setShowUnlock(false);
      setUnlockKey("");
      setEarlyError("");
      setEarlySuccess("");
      setShowRenewEarly(true);
    } catch (err) {
      setUnlockError(err.message);
    } finally {
      setUnlockLoading(false);
    }
  }

  async function handleRenewEarly(e) {
    e.preventDefault();
    setEarlyError("");
    setEarlySubmitting(true);
    try {
      const res = await api.renewLicenseEarly({
        days: earlyDays.trim().toUpperCase(),
        activationKey: earlyKey.trim(),
      });
      setEarlySuccess(`License extended. New total: ${res.newValidDays} days from today.`);
      setEarlyDays("");
      setEarlyKey("");
      await loadLicense();
      setTimeout(() => {
        setShowRenewEarly(false);
        setEarlySuccess("");
      }, 1600);
    } catch (err) {
      setEarlyError(err.message);
    } finally {
      setEarlySubmitting(false);
    }
  }

  if (loading) return <div className="card">Loading license info...</div>;
  if (loadError || !license?.exists) return <div className="card">Unable to load license details.</div>;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">License</h1>
          <p className="pageSubtitle">Manage and monitor your software license</p>
        </div>
        <button
          className="btn btnPrimary"
          onClick={() => { setUnlockError(""); setUnlockKey(""); setShowUnlock(true); }}
        >
          Renew License Early
        </button>
      </div>

      <div className="statGrid">
        <div className="statCard">
          <p className="statLabel">Valid Days</p>
          <p className="statValue">{license.validDays}</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Start Date</p>
          <p className="statValue" style={{ fontSize: 18 }}>{license.startDate}</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Expiry Date</p>
          <p className="statValue" style={{ fontSize: 18 }}>{license.expiryDate}</p>
        </div>
      </div>

      <div className="card">
        <p className="statLabel" style={{ marginBottom: 12 }}>Time Remaining</p>
        {countdown && !countdown.expired ? (
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 1, color: "var(--color-sidebar-bg)" }}>
            {pad(countdown.days)} <span style={{ fontSize: 14, color: "var(--color-text-secondary)", fontWeight: 600 }}>DAYS</span>
            {"  -  "}
            {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
          </div>
        ) : (
          <div style={{ fontSize: 20, fontWeight: 700, color: "#c0302e" }}>License Expired</div>
        )}
        <p className="statSub">Format: DD - HH:MM:SS, updates live</p>
      </div>

      {showUnlock && (
        <div className="modalOverlay">
          <div className="modalBox">
            <div className="modalHeader">
              <h3 className="modalTitle">Enter Unlock Key</h3>
              <button className="modalClose" onClick={() => setShowUnlock(false)}>✕</button>
            </div>
            <form onSubmit={handleUnlock}>
              {unlockError && <p style={{ color: "#c0302e", fontSize: 13 }}>{unlockError}</p>}
              <div className="formGroup">
                <label className="formLabel">Unlock Key</label>
                <input
                  type="password"
                  className="formInput"
                  value={unlockKey}
                  onChange={(e) => setUnlockKey(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="modalActions">
                <button type="button" className="btn btnSecondary" onClick={() => setShowUnlock(false)}>Cancel</button>
                <button type="submit" className="btn btnPrimary" disabled={unlockLoading}>
                  {unlockLoading ? "Checking..." : "Unlock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRenewEarly && (
        <div className="modalOverlay">
          <div className="modalBox">
            <div className="modalHeader">
              <h3 className="modalTitle">Renew License Early</h3>
              <button className="modalClose" onClick={() => setShowRenewEarly(false)}>✕</button>
            </div>
            <form onSubmit={handleRenewEarly}>
              {earlyError && <p style={{ color: "#c0302e", fontSize: 13 }}>{earlyError}</p>}
              {earlySuccess && <p style={{ color: "#1a7f3c", fontSize: 13 }}>{earlySuccess}</p>}
              <div className="formGroup" style={{ marginBottom: 16 }}>
                <label className="formLabel">Days Code</label>
                <input
                  className="formInput"
                  value={earlyDays}
                  onChange={(e) => setEarlyDays(e.target.value)}
                  placeholder="e.g. OZ"
                  required
                />
              </div>
              <div className="formGroup">
                <label className="formLabel">Activation Key</label>
                <input
                  className="formInput"
                  value={earlyKey}
                  onChange={(e) => setEarlyKey(e.target.value)}
                  required
                />
              </div>
              <p className="formHint" style={{ marginTop: 8 }}>
                Remaining days on your current license will be added on top of the new days you enter.
              </p>
              <div className="modalActions">
                <button type="button" className="btn btnSecondary" onClick={() => setShowRenewEarly(false)}>Cancel</button>
                <button type="submit" className="btn btnPrimary" disabled={earlySubmitting}>
                  {earlySubmitting ? "Renewing..." : "Renew"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}