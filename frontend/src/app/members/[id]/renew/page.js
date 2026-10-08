"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { getReceiptHtml } from "@/lib/receipt";

export default function RenewMemberPage() {
  const router = useRouter();
  const { id } = useParams();

  const [member, setMember] = useState(null);
  const [loadingMember, setLoadingMember] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [plans, setPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);

  const [form, setForm] = useState({
    planId: "", trainerId: "", expiryDate: "",
    planDiscount: "", trainerDiscount: "", overallDiscount: "",
    paymentAmount: "", paymentMethod: "cash",
  });
  const [expiryManuallyEdited, setExpiryManuallyEdited] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptHtml, setReceiptHtml] = useState("");
  const receiptFrameRef = useRef(null);

  // load member, plans, trainers
  useEffect(() => {
    api.getMember(id)
      .then((m) => {
        setMember(m);
        setForm((f) => ({ ...f, planId: m.plan_id || "", trainerId: m.trainer_id || "" }));
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoadingMember(false));
  }, [id]);

  useEffect(() => {
    api.getPlans({ status: "active" }).then(setPlans);
  }, []);

  useEffect(() => {
    api.getTrainers({ status: "active" }).then(setTrainers);
  }, []);

  // auto-calc new expiry: max(today, current expiry) + plan duration
  useEffect(() => {
    if (expiryManuallyEdited || !form.planId || !member) return;
    const planObj = plans.find((p) => String(p.id) === String(form.planId));
    if (!planObj) return;

    const today = new Date();
    const currentExpiry = new Date(member.expiry_date);
    const base = currentExpiry > today ? currentExpiry : today;
    const d = new Date(base);
    d.setDate(d.getDate() + planObj.duration_days);
    setForm((f) => ({ ...f, expiryDate: d.toISOString().slice(0, 10) }));
  }, [form.planId, plans, member, expiryManuallyEdited]);

  const selectedPlan = plans.find((p) => String(p.id) === String(form.planId));
  const selectedTrainer = trainers.find((t) => String(t.id) === String(form.trainerId));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.renewMember(id, {
        planId: form.planId,
        trainerId: form.trainerId || null,
        expiryDate: form.expiryDate || null,
        planDiscount: form.planDiscount,
        trainerDiscount: form.trainerDiscount,
        overallDiscount: form.overallDiscount,
        paymentAmount: form.paymentAmount,
        paymentMethod: form.paymentMethod,
      });

      const html = getReceiptHtml({
        member: { name: member.name, phone: member.phone, startDate: new Date().toISOString().slice(0, 10), expiryDate: res.newExpiry || form.expiryDate },
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
    router.push(`/members/${id}`);
  };

  if (loadingMember) {
    return <p style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Loading member...</p>;
  }
  if (loadError || !member) {
    return <p style={{ textAlign: "center", padding: 32, color: "#c0302e" }}>{loadError || "Member not found"}</p>;
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Renew Membership</h1>
          <p className="pageSubtitle">Update plan, trainer, and payment for this member</p>
        </div>
      </div>

      <div className="formCard">
        <h3 className="formSectionTitle">Member</h3>
        <div className="formGrid">
          <div className="formGroup">
            <label className="formLabel">Name</label>
            <input className="formInput" value={member.name} disabled />
          </div>
          <div className="formGroup">
            <label className="formLabel">Phone</label>
            <input className="formInput" value={member.phone} disabled />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="formCard">
          <h3 className="formSectionTitle">Membership Plan</h3>
          <div className="formGrid">
            <div className="formGroup">
              <label className="formLabel">Plan *</label>
              <select className="formSelect" required value={form.planId} onChange={update("planId")}>
                <option value="">Select a plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — Rs. {p.price} / {p.duration_days} days</option>
                ))}
              </select>
            </div>
            {form.planId && (
              <div className="formGroup">
                <label className="formLabel">New Expiry Date</label>
                <input
                  type="date"
                  className="formInput"
                  value={form.expiryDate}
                  onChange={(e) => { setExpiryManuallyEdited(true); setForm({ ...form, expiryDate: e.target.value }); }}
                />
                <span className="formHint">Auto-calculated from current expiry + plan duration — override if needed</span>
              </div>
            )}
            <div className="formGroup">
              <label className="formLabel">Assign Trainer</label>
              <select className="formSelect" value={form.trainerId} onChange={update("trainerId")}>
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

        {error && <p style={{ color: "#c0302e", marginBottom: 12 }}>{error}</p>}

        <div className="formActions">
          <button type="button" className="btn btnSecondary" onClick={() => router.push(`/members/${id}`)}>Cancel</button>
          <button type="submit" className="btn btnPrimary" disabled={submitting || !form.planId}>
            {submitting ? "Saving..." : "Confirm Renewal & Print Receipt"}
          </button>
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