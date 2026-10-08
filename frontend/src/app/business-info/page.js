"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { api } from "@/lib/api";
import "../auth.css";

export default function BusinessInfoPage() {
  const router = useRouter();
  const [form, setForm] = useState({ gymName: "", address: "", contactNo: "", city: "" });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("gymName", form.gymName);
      fd.append("address", form.address);
      fd.append("contactNo", form.contactNo);
      fd.append("city", form.city);
      if (logoFile) fd.append("logo", logoFile);

      await api.saveBusinessInfo(fd);
      router.push("/signup");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="authWrapper">
      <div className="authCard">
        <label className="authLogoUpload">
          {logoPreview ? <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Building2 size={26} />}
          <input type="file" accept="image/*" hidden onChange={handleLogoChange} />
        </label>
        <h1 className="authTitle">Set Up Your Gym</h1>
        <p className="authSubtitle">Let's start with your business details</p>

        {error && <div className="authError">{error}</div>}

        <form className="authForm" onSubmit={handleSubmit}>
          <div className="formGroup">
            <label className="formLabel">Gym Name *</label>
            <input className="formInput" required value={form.gymName} onChange={update("gymName")} placeholder="e.g. FLEXOS GYM" />
          </div>
          <div className="formGroup">
            <label className="formLabel">Contact Number *</label>
            <input className="formInput" required value={form.contactNo} onChange={update("contactNo")} placeholder="03XX-XXXXXXX" />
          </div>
          {/* <div className="authGrid"> */}
            <div className="formGroup">
              <label className="formLabel">City</label>
              <input className="formInput" value={form.city} onChange={update("city")} placeholder="e.g. Lahore" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Address</label>
              <input className="formInput" value={form.address} onChange={update("address")} placeholder="Street" />
            </div>
          {/* </div> */}
          <button type="submit" className="btn btnPrimary" disabled={submitting} style={{ justifyContent: "center", marginTop: 8 }}>
            {submitting ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}