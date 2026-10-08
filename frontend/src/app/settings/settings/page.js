"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";

export default function BusinessSettingsPage() {
  const [form, setForm] = useState({ gymName: "", address: "", contactNo: "", city: "" });
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    (async () => {
      try {
        const { business } = await api.getBusinessInfo();
        setForm({
          gymName: business.gym_name || "",
          address: business.address || "",
          contactNo: business.contact_no || "",
          city: business.city || "",
        });
        setLogoUrl(business.logo_url);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setRemoveLogo(false);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleRemoveLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("gymName", form.gymName);
      formData.append("address", form.address);
      formData.append("contactNo", form.contactNo);
      formData.append("city", form.city);
      if (logoFile) formData.append("logo", logoFile);
      if (removeLogo) formData.append("removeLogo", "true");

      await api.updateBusinessInfo(formData);
      setSuccess("Business info updated successfully.");
      setLogoFile(null);
      if (removeLogo) setLogoUrl(null);
      else if (logoPreview) setLogoUrl(logoPreview);
      setRemoveLogo(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card">Loading business info...</div>;

  const displayedLogo = logoPreview || (logoUrl ? `${API_BASE}${logoUrl}` : null);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Business Settings</h1>
          <p className="pageSubtitle">Update your gym's business information</p>
        </div>
      </div>

      <form className="formCard" onSubmit={handleSubmit}>
        {error && <p style={{ color: "#c0302e", fontSize: 13, marginBottom: 12 }}>{error}</p>}
        {success && <p style={{ color: "#1a7f3c", fontSize: 13, marginBottom: 12 }}>{success}</p>}

        <h3 className="formSectionTitle">Logo</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div className="avatarUpload" style={{ position: "relative" }} onClick={() => fileInputRef.current?.click()}>
            {displayedLogo ? (
              <img src={displayedLogo} alt="Gym logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 12 }}>Upload</span>
            )}
            {displayedLogo && (
              <button
                type="button"
                className="avatarRemoveBtn"
                onClick={(e) => { e.stopPropagation(); handleRemoveLogo(); }}
              >
                ✕
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleLogoChange}
          />
          <div className="photoFileInfo">
            <span className="photoFileName">{logoFile ? logoFile.name : "Click the logo to upload a new image"}</span>
            <span className="formHint">PNG or JPG recommended</span>
          </div>
        </div>

        <h3 className="formSectionTitle">Details</h3>
        <div className="formGrid">
          <div className="formGroup">
            <label className="formLabel">Gym Name</label>
            <input
              className="formInput"
              value={form.gymName}
              onChange={(e) => setForm((f) => ({ ...f, gymName: e.target.value }))}
              required
            />
          </div>
          <div className="formGroup">
            <label className="formLabel">Contact Number</label>
            <input
              className="formInput"
              value={form.contactNo}
              onChange={(e) => setForm((f) => ({ ...f, contactNo: e.target.value }))}
              required
            />
          </div>
          <div className="formGroup">
            <label className="formLabel">City</label>
            <input
              className="formInput"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div className="formGroup formGroupFull">
            <label className="formLabel">Address</label>
            <textarea
              className="formTextarea"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
        </div>

        <div className="formActions">
          <button type="submit" className="btn btnPrimary" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}