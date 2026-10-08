"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, X } from "lucide-react";
import { api } from "@/lib/api";
import { getReceiptHtml } from "@/lib/receipt";

export default function AddMemberPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromTrialId = searchParams.get("fromTrial");
  const [form, setForm] = useState({
    name: searchParams.get("name") || "", phone: searchParams.get("phone") || "", email: "", gender: "male", dob: "",
    address: searchParams.get("address") || "", emergencyName: "", emergencyPhone: "",
    plan: "", startDate: "", trainer: "", expiryDate: "",
    planDiscount: "", trainerDiscount: "", overallDiscount: "",
    paymentAmount: "", paymentMethod: "cash",
  });
  const [activeTab, setActiveTab] = useState("personal");
  const [expiryManuallyEdited, setExpiryManuallyEdited] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const nameInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState(null);
const [photoFile, setPhotoFile] = useState(null);
const [photoPreview, setPhotoPreview] = useState(null);
const [plans, setPlans] = useState([]);
const [trainers, setTrainers] = useState([]);
const [showReceiptModal, setShowReceiptModal] = useState(false);
const [receiptHtml, setReceiptHtml] = useState("");
const receiptFrameRef = useRef(null);


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

const handleFormKeyDown = (e) => {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

  const focusable = Array.from(
    e.currentTarget.querySelectorAll("input, select, textarea")
  ).filter((el) => !el.disabled && el.type !== "hidden" && el.type !== "file");

  const currentIndex = focusable.indexOf(document.activeElement);
  if (currentIndex === -1) return;

  e.preventDefault();
  const nextIndex = e.key === "ArrowDown" ? currentIndex + 1 : currentIndex - 1;
  if (focusable[nextIndex]) focusable[nextIndex].focus();
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
      emergencyPhone: form.emergencyPhone, planId: form.plan, trainerId: form.trainer,
      startDate: form.startDate, expiryDate: form.expiryDate,
      planDiscount: form.planDiscount, trainerDiscount: form.trainerDiscount,
      overallDiscount: form.overallDiscount,
      paymentAmount: form.paymentAmount, paymentMethod: form.paymentMethod,
    }).forEach(([k, v]) => fd.append(k, v || ""));
    if (photoFile) fd.append("image", photoFile);

    const res = await api.createMember(fd);

    if (fromTrialId) {
      await api.markTrialConverted(fromTrialId, { memberId: res.id });
    }

    const html = getReceiptHtml({
      member: { name: form.name, phone: form.phone, startDate: form.startDate, expiryDate: res.expiryDate || form.expiryDate },
      invoice: {
        planAmount, trainerFee,
        planDiscount: planDiscountNum,
        trainerDiscount: trainerDiscountNum,
        overallDiscount: overallDiscountNum,
        total, paid: paymentAmountNum,
        changeDue, status: balanceDue > 0 ? "partial" : "paid",
      },
      plan: selectedPlan,
      trainer: selectedTrainer,
      paymentMethod: form.paymentMethod,
    });

    setReceiptHtml(html);
    setShowReceiptModal(true);
  } catch (err) {
    setError(err.message);
  } finally {
    setSubmitting(false);
  }
};

const handlePrintReceipt = () => {
  const frame = receiptFrameRef.current;
  if (frame && frame.contentWindow) {
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }
};

const handleCloseReceiptModal = () => {
  setShowReceiptModal(false);
  router.push("/members");
};

useEffect(() => {
  api.getPlans({ status: "active" }).then(setPlans);
}, []);

useEffect(() => {
  nameInputRef.current?.focus();
}, []);

useEffect(() => {
  api.getTrainers({ status: "active" }).then(setTrainers);
}, []);

useEffect(() => {
  if (expiryManuallyEdited || !form.plan || !form.startDate) return;
  const planObj = plans.find((p) => String(p.id) === String(form.plan));
  if (!planObj) return;
  const d = new Date(form.startDate);
  d.setDate(d.getDate() + planObj.duration_days);
  setForm((f) => ({ ...f, expiryDate: d.toISOString().slice(0, 10) }));
}, [form.plan, form.startDate, plans, expiryManuallyEdited]);

const selectedPlan = plans.find((p) => String(p.id) === String(form.plan));
const selectedTrainer = trainers.find((t) => String(t.id) === String(form.trainer));
const planAmount = selectedPlan ? Number(selectedPlan.price) : 0;
const trainerFee = selectedTrainer ? Number(selectedTrainer.session_fee || 0) : 0;
const planDiscountNum = Number(form.planDiscount || 0);
const trainerDiscountNum = Number(form.trainerDiscount || 0);
const overallDiscountNum = Number(form.overallDiscount || 0);
const subtotal = (planAmount - planDiscountNum) + (trainerFee - trainerDiscountNum);
const total = Math.max(0, subtotal - overallDiscountNum);
const paymentAmountNum = Number(form.paymentAmount || 0);
const changeDue = Math.max(0, paymentAmountNum - total);
const balanceDue = Math.max(0, total - paymentAmountNum);

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Add Member</h1>
          <p className="pageSubtitle">Fill in the details to register a new member</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
        {/* Photo - only on Personal Information tab, saves space on Billing tab */}
        {activeTab === "personal" && (
        <div className="formCard">
  <h3 className="formSectionTitle">Photo</h3>
  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
    <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
      <label className="avatarUpload" style={{ width: "100%", height: "100%" }}>
        {photoPreview ? (
          <img src={photoPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
        )}
<div className="tabs">
        <button type="button" className={`tabButton ${activeTab === "personal" ? "tabButtonActive" : ""}`} onClick={() => setActiveTab("personal")}>
          1. Personal Information
        </button>
        <button type="button" className={`tabButton ${activeTab === "billing" ? "tabButtonActive" : ""}`} onClick={() => setActiveTab("billing")}>
          2. Membership & Payment
        </button>
      </div>

      {activeTab === "personal" && (
        <div className="formCard">
          <h3 className="formSectionTitle">Personal Information</h3>
          <div className="formGrid">
            <div className="formGroup">
              <label className="formLabel">Full Name *</label>
              <input ref={nameInputRef} className="formInput" required value={form.name} onChange={update("name")} placeholder="e.g. Ali Raza" />
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
              <label className="formLabel">Date of Birth</label>
              <input type="date" className="formInput" value={form.dob} onChange={update("dob")} />
            </div>
            <div className="formGroup formGroupFull">
              <label className="formLabel">Address</label>
              <input className="formInput" value={form.address} onChange={update("address")} placeholder="Street, city" />
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
      )}

      {activeTab === "billing" && (
        <>
          <div className="formCard">
            <h3 className="formSectionTitle">Membership Plan</h3>
            <div className="formGrid">
              <div className="formGroup">
                <label className="formLabel">Plan *</label>
                <select className="formSelect" required value={form.plan} onChange={update("plan")}>
                  <option value="">Select a plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — Rs. {p.price} / {p.duration_days} days</option>
                  ))}
                </select>
              </div>
              <div className="formGroup">
                <label className="formLabel">Start Date *</label>
                <input type="date" className="formInput" required value={form.startDate} onChange={update("startDate")} />
              </div>
              {form.plan && (
                <div className="formGroup">
                  <label className="formLabel">Expiry Date</label>
                  <input
                    type="date"
                    className="formInput"
                    value={form.expiryDate}
                    onChange={(e) => { setExpiryManuallyEdited(true); setForm({ ...form, expiryDate: e.target.value }); }}
                  />
                  <span className="formHint">Auto-calculated — override if needed</span>
                </div>
              )}
              <div className="formGroup">
                <label className="formLabel">Assign Trainer</label>
                <select className="formSelect" value={form.trainer} onChange={update("trainer")}>
                  <option value="">No trainer</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.session_fee ? ` — Rs. ${t.session_fee}` : ""}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="formCard">
            <h3 className="formSectionTitle">Billing Summary</h3>

            <div className="billingRow">
              <div>
                <div className="billingLabel">Membership Fee</div>
                <div className="billingSub">{selectedPlan?.name || "No plan selected"}</div>
              </div>
              <div>Rs. {planAmount.toFixed(2)}</div>
            </div>
            <div className="billingRow">
              <div className="billingLabel">Plan Discount</div>
              <input type="number" className="formInput billingDiscountInput" value={form.planDiscount} onChange={update("planDiscount")} placeholder="0.00" />
            </div>

            {selectedTrainer && (
              <>
                <div className="billingRow">
                  <div>
                    <div className="billingLabel">Trainer Fee</div>
                    <div className="billingSub">{selectedTrainer.name}</div>
                  </div>
                  <div>Rs. {trainerFee.toFixed(2)}</div>
                </div>
                <div className="billingRow">
                  <div className="billingLabel">Trainer Discount</div>
                  <input type="number" className="formInput billingDiscountInput" value={form.trainerDiscount} onChange={update("trainerDiscount")} placeholder="0.00" />
                </div>
              </>
            )}

            <div className="billingRow">
              <div className="billingLabel">Overall Discount (on total)</div>
              <input type="number" className="formInput billingDiscountInput" value={form.overallDiscount} onChange={update("overallDiscount")} placeholder="0.00" />
            </div>

            <div className="billingTotalRow">
              <span>Total Due</span>
              <span>Rs. {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="formCard">
            <h3 className="formSectionTitle">Payment</h3>
            <div className="formGrid">
              <div className="formGroup">
                <label className="formLabel">Amount Received</label>
                <input type="number" className="formInput" value={form.paymentAmount} onChange={update("paymentAmount")} placeholder="0.00" />
              </div>
              <div className="formGroup">
                <label className="formLabel">Payment Method</label>
                <select className="formSelect" value={form.paymentMethod} onChange={update("paymentMethod")}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
            </div>
            {changeDue > 0 && <p style={{ marginTop: 12, fontWeight: 700, color: "#1a7f3c" }}>Change to return: Rs. {changeDue.toFixed(2)}</p>}
            {balanceDue > 0 && paymentAmountNum > 0 && <p style={{ marginTop: 12, fontWeight: 700, color: "#c0302e" }}>Balance Due: Rs. {balanceDue.toFixed(2)}</p>}
          </div>
        </>
      )}

      {error && <p style={{ color: "#c0302e", marginBottom: 12 }}>{error}</p>}

        <div className="formActions">
          {activeTab === "personal" ? (
            <>
              <button type="button" className="btn btnSecondary" onClick={() => router.push("/members")}>Cancel</button>
              <button type="button" className="btn btnPrimary" onClick={() => { if (form.name && form.phone) setActiveTab("billing"); }}>
                Next: Membership & Payment
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btnSecondary" onClick={() => setActiveTab("personal")}>Back</button>
              <button type="submit" className="btn btnPrimary" disabled={submitting || !form.plan}>
                {submitting ? "Saving..." : "Save Member & Print Receipt"}
              </button>
            </>
          )}
        </div>
        </form>

{showReceiptModal && (
  <div className="modalOverlay">
    <div className="modalBox" style={{ width: 340, padding: 16 }}>
      <div className="modalHeader">
        <h3 className="modalTitle">Receipt Preview</h3>
        <button type="button" className="modalClose" onClick={handleCloseReceiptModal}>
          <X size={18} />
        </button>
      </div>
      <iframe
        ref={receiptFrameRef}
        title="Receipt Preview"
        srcDoc={receiptHtml}
        style={{ width: "100%", height: 420, border: "1px solid var(--color-border)", borderRadius: 8 }}
      />
      <div className="modalActions">
        <button type="button" className="btn btnSecondary" onClick={handleCloseReceiptModal}>Close</button>
        <button type="button" className="btn btnPrimary" onClick={handlePrintReceipt}>Print</button>
      </div>
    </div>
  </div>
)}
</div>
);
}