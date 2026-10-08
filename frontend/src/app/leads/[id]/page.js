"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Pencil, ArrowLeft, Phone, MapPin, Calendar, FileText } from "lucide-react";

const statusBadge = {
  ongoing: "badgeWarning",
  converted: "badgeSuccess",
  not_converted: "badgeDanger",
};

const statusLabel = {
  ongoing: "Ongoing",
  converted: "Converted",
  not_converted: "Not Converted",
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function TrialMemberDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [trial, setTrial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTrial = async () => {
      try {
        const data = await api.getTrial(id);
        setTrial(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadTrial();
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "#c0302e" }}>{error}</p>;
  if (!trial) return <p>Trial member not found.</p>;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Trial Member Details</h1>
          <p className="pageSubtitle">Full information for this trial / lead</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btnSecondary" onClick={() => router.push("/leads")}>
            <ArrowLeft size={16} /> Back
          </button>
          {trial.status !== "converted" && (
            <button className="btn btnPrimary" onClick={() => router.push(`/leads/${id}/edit`)}>
              <Pencil size={16} /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="profileHeader">
        <div className="profileAvatar">
          {trial.name ? trial.name.charAt(0).toUpperCase() : "?"}
        </div>
        <div style={{ flex: 1 }}>
          <h2 className="profileName">{trial.name}</h2>
          <p className="profileMeta">
            <Phone size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
            {trial.phone}
            {trial.address && (
              <>
                {"  •  "}
                <MapPin size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                {trial.address}
              </>
            )}
          </p>
        </div>
        <span className={`badge ${statusBadge[trial.status] || "badgeWarning"}`}>
          {statusLabel[trial.status] || trial.status}
        </span>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="formSectionTitle">
          <Calendar size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          Trial Period
        </h3>
        <div className="billingRow">
          <span className="billingLabel">Trial Start Date</span>
          <span>{formatDate(trial.trial_start_date)}</span>
        </div>
        <div className="billingRow">
          <span className="billingLabel">Trial End Date</span>
          <span>{formatDate(trial.trial_end_date)}</span>
        </div>
        <div className="billingRow">
          <span className="billingLabel">Logged On</span>
          <span>{formatDate(trial.created_at)}</span>
        </div>
      </div>

      {trial.status === "converted" && trial.converted_member_id && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="formSectionTitle">Membership</h3>
          <div className="billingRow">
            <span className="billingLabel">Converted Member ID</span>
            <span>#{trial.converted_member_id}</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              className="btn btnSecondary"
              onClick={() => router.push(`/members/${trial.converted_member_id}`)}
            >
              View Member Profile
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="formSectionTitle">
          <FileText size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
          Notes
        </h3>
        <p style={{ fontSize: 14, color: trial.notes ? "var(--color-text-primary)" : "var(--color-text-secondary)", margin: 0 }}>
          {trial.notes || "No notes added for this trial member."}
        </p>
      </div>
    </div>
  );
}