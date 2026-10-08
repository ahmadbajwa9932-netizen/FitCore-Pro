"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X  } from "lucide-react";
import { api } from "@/lib/api";

export default function AddTrainerPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", phone: "", email: "", gender: "male",
    specialization: "", experienceYears: "",
    employmentType: "salary", baseSalary: "", sessionFee: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };
  
  const handleRemovePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v || ""));
      if (photoFile) fd.append("image", photoFile);

      await api.createTrainer(fd);
      router.push("/trainers");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Add Trainer</h1>
          <p className="pageSubtitle">Register a new trainer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
      <div className="formCard">
  <h3 className="formSectionTitle">Photo</h3>
  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
    <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
      <label className="avatarUpload" style={{ width: "100%", height: "100%" }}>
        {photoPreview ? (
          <img src={photoPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Camera size={22} />
        )}
        <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
      </label>
      {photoPreview && (
        <button
          type="button"
          onClick={handleRemovePhoto}
          className="avatarRemoveBtn"
          aria-label="Remove photo"
        >
          <X size={12} />
        </button>
      )}
    </div>
    {photoFile && (
      <div className="photoFileInfo">
        <span className="photoFileName">{photoFile.name}</span>
        <span className="formHint">{(photoFile.size / 1024).toFixed(1)} KB</span>
      </div>
    )}
  </div>
</div>

        <div className="formCard">
          <h3 className="formSectionTitle">Trainer Information</h3>
          <div className="formGrid">
            <div className="formGroup">
              <label className="formLabel">Full Name *</label>
              <input className="formInput" required value={form.name} onChange={update("name")} placeholder="e.g. Ahmed Raza" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Phone Number *</label>
              <input className="formInput" required value={form.phone} onChange={update("phone")} placeholder="03XX-XXXXXXX" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Email</label>
              <input type="email" className="formInput" value={form.email} onChange={update("email")} placeholder="optional" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Gender</label>
              <select className="formSelect" value={form.gender} onChange={update("gender")}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="formGroup">
              <label className="formLabel">Specialization</label>
              <input className="formInput" value={form.specialization} onChange={update("specialization")} placeholder="e.g. Strength & Conditioning" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Experience (years)</label>
              <input type="number" className="formInput" value={form.experienceYears} onChange={update("experienceYears")} placeholder="0" />
            </div>
          </div>
        </div>

        <div className="formCard">
          <h3 className="formSectionTitle">Salary & Fee</h3>
          <div className="formGrid">
            <div className="formGroup">
              <label className="formLabel">Employment Type</label>
              <select className="formSelect" value={form.employmentType} onChange={update("employmentType")}>
                <option value="salary">Salary</option>
                <option value="commission">Commission</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>
            <div className="formGroup">
              <label className="formLabel">Base Salary (PKR)</label>
              <input type="number" className="formInput" value={form.baseSalary} onChange={update("baseSalary")} placeholder="0" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Session Fee (PKR)</label>
              <input type="number" className="formInput" value={form.sessionFee} onChange={update("sessionFee")} placeholder="0" />
            </div>
          </div>
        </div>

        {error && <p style={{ color: "#c0302e", marginBottom: 12 }}>{error}</p>}

        <div className="formActions">
          <button type="button" className="btn btnSecondary" onClick={() => router.push("/trainers")}>Cancel</button>
          ...
          <button type="submit" className="btn btnPrimary" disabled={submitting}>
            {submitting ? "Saving..." : "Save Trainer"}
          </button>
        </div>
      </form>
    </div>
  );
}