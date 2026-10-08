"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

export default function EditTrialMemberPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [form, setForm] = useState({
    name: "", phone: "", address: "", trialStartDate: "", trialEndDate: "", notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTrial = async () => {
      try {
        const trial = await api.getTrial(id);
        setForm({
          name: trial.name || "",
          phone: trial.phone || "",
          address: trial.address || "",
          trialStartDate: trial.trial_start_date ? trial.trial_start_date.slice(0, 10) : "",
          trialEndDate: trial.trial_end_date ? trial.trial_end_date.slice(0, 10) : "",
          notes: trial.notes || "",
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadTrial();
  }, [id]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.updateTrial(id, form);
      router.push("/leads");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Edit Trial Member</h1>
          <p className="pageSubtitle">Update trial details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="formCard">
          <h3 className="formSectionTitle">Trial Details</h3>
          <div className="formGrid">
            <div className="formGroup">
              <label className="formLabel">Name *</label>
              <input className="formInput" required value={form.name} onChange={update("name")} placeholder="e.g. Ali Raza" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Phone *</label>
              <input className="formInput" required value={form.phone} onChange={update("phone")} placeholder="03XX-XXXXXXX" />
            </div>
            <div className="formGroup">
              <label className="formLabel">address</label>
              <input className="formInput" value={form.address} onChange={update("address")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Trial Start Date *</label>
              <input type="date" className="formInput" required value={form.trialStartDate} onChange={update("trialStartDate")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Trial End Date *</label>
              <input type="date" className="formInput" required value={form.trialEndDate} onChange={update("trialEndDate")} />
            </div>
          </div>
          <div className="formGroup" style={{ marginTop: 16 }}>
            <label className="formLabel">Notes</label>
            <textarea className="formTextarea" value={form.notes} onChange={update("notes")} placeholder="Anything worth remembering..." />
          </div>
        </div>

        {error && <p style={{ color: "#c0302e", marginBottom: 12 }}>{error}</p>}

        <div className="formActions">
          <button type="button" className="btn btnSecondary" onClick={() => router.push("/leads")}>Cancel</button>
          <button type="submit" className="btn btnPrimary" disabled={submitting}>
            {submitting ? "Saving..." : "Update Trial Member"}
          </button>
        </div>
      </form>
    </div>
  );
}