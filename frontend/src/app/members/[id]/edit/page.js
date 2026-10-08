"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Camera, X  } from "lucide-react";
import { api } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function EditMemberPage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getMember(id).then((m) =>
      setForm({
        name: m.name, phone: m.phone, email: m.email || "", gender: m.gender,
        dob: m.dob?.slice(0, 10) || "", address: m.address || "",
        emergencyName: m.emergency_name || "", emergencyPhone: m.emergency_phone || "",
        trainerId: m.trainer_id || "", photo_url: m.photo_url,
      })
    );
  }, [id]);

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
      Object.entries({
        name: form.name, phone: form.phone, email: form.email, gender: form.gender,
        dob: form.dob, address: form.address, emergencyName: form.emergencyName,
        emergencyPhone: form.emergencyPhone, trainerId: form.trainerId,
      }).forEach(([k, v]) => fd.append(k, v || ""));
      if (photoFile) fd.append("image", photoFile);

      await api.updateMember(id, fd);
      router.push(`/members/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!form) return <p style={{ color: "#6b7280" }}>Loading...</p>;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Edit Member</h1>
          <p className="pageSubtitle">Update {form.name}'s details</p>
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
        ) : form.photo_url ? (
          <img src={`${API_BASE}${form.photo_url}`} alt="current" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
          <h3 className="formSectionTitle">Personal Information</h3>
          <div className="formGrid">
            <div className="formGroup">
              <label className="formLabel">Full Name *</label>
              <input className="formInput" required value={form.name} onChange={update("name")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Phone Number *</label>
              <input className="formInput" required value={form.phone} onChange={update("phone")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Email</label>
              <input type="email" className="formInput" value={form.email} onChange={update("email")} />
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
              <label className="formLabel">Date of Birth</label>
              <input type="date" className="formInput" value={form.dob} onChange={update("dob")} />
            </div>
            <div className="formGroup formGroupFull">
              <label className="formLabel">Address</label>
              <input className="formInput" value={form.address} onChange={update("address")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Emergency Contact Name</label>
              <input className="formInput" value={form.emergencyName} onChange={update("emergencyName")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Emergency Contact Phone</label>
              <input className="formInput" value={form.emergencyPhone} onChange={update("emergencyPhone")} />
            </div>
          </div>
        </div>

        {error && <p style={{ color: "#c0302e", marginBottom: 12 }}>{error}</p>}

        <div className="formActions">
          <button type="button" className="btn btnSecondary" onClick={() => router.push(`/members/${id}`)}>Cancel</button>
          <button type="submit" className="btn btnPrimary" disabled={submitting}>
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}