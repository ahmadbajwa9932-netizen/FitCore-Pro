"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { api } from "@/lib/api";
import EmailInput from "@/components/EmailInput";
import "../auth.css";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState("email"); // email | reset
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.forgotPassword({ email });
      setInfo("If that email exists, a code has been sent.");
      setStep("reset");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmNewPassword) return setError("Passwords do not match");

    setSubmitting(true);
    try {
      await api.resetPassword({ email, otp, newPassword, confirmNewPassword });
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
        <div className="authLogo"><KeyRound size={28} /></div>
        <h1 className="authTitle">Reset Password</h1>
        <p className="authSubtitle">
          {step === "email" ? "Enter your account email to receive a code" : "Enter the code sent to your email"}
        </p>

        {error && <div className="authError">{error}</div>}
        {info && step === "reset" && (
          <div className="formHint" style={{ marginBottom: 14, display: "block" }}>{info}</div>
        )}

        {step === "email" ? (
          <form className="authForm" onSubmit={handleSendOtp}>
            <div className="formGroup">
              <label className="formLabel">Email *</label>
              <EmailInput value={email} onChange={setEmail} required />
            </div>
            <button type="submit" className="btn btnPrimary" disabled={submitting} style={{ justifyContent: "center", marginTop: 8 }}>
              {submitting ? "Sending..." : "Send Code"}
            </button>
          </form>
        ) : (
          <form className="authForm" onSubmit={handleReset}>
            <div className="formGroup">
              <label className="formLabel">Code *</label>
              <input className="formInput" required value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" maxLength={6} />
            </div>
            <div className="authGrid">
              <div className="formGroup">
                <label className="formLabel">New Password *</label>
                <input type="password" className="formInput" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="formGroup">
                <label className="formLabel">Confirm Password *</label>
                <input type="password" className="formInput" required value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btnPrimary" disabled={submitting} style={{ justifyContent: "center", marginTop: 8 }}>
              {submitting ? "Resetting..." : "Reset Password"}
            </button>
            <div className="authFooter">
              <button type="button" className="linkBtn" onClick={() => setStep("email")}>Use a different email</button>
            </div>
          </form>
        )}

        <div className="authFooter">
          <button type="button" className="linkBtn" onClick={() => router.push("/login")}>Back to Login</button>
        </div>
      </div>
    </div>
  );
}