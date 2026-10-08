"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function AddPurchasePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", category: "", purchasePrice: "", soldPrice: "", quantity: "",
    lowStockThreshold: "5", purchaseDate: "", expiryDate: "",
    supplierName: "", supplierCompany: "", supplierCity: "", supplierContact: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createShopProduct(form);
      router.push("/shop/purchases");
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
          <h1 className="pageTitle">Add Purchase</h1>
          <p className="pageSubtitle">Add a new product to shop inventory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="formCard">
          <h3 className="formSectionTitle">Product Details</h3>
          <div className="formGrid">
            <div className="formGroup">
              <label className="formLabel">Product Name *</label>
              <input className="formInput" required value={form.name} onChange={update("name")} placeholder="e.g. Whey Protein 1kg" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Category</label>
              <input className="formInput" value={form.category} onChange={update("category")} placeholder="e.g. Supplements" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Purchase Price (Rs.) *</label>
              <input type="number" className="formInput" required value={form.purchasePrice} onChange={update("purchasePrice")} placeholder="0.00" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Sold Price (Rs.) *</label>
              <input type="number" className="formInput" required value={form.soldPrice} onChange={update("soldPrice")} placeholder="0.00" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Quantity *</label>
              <input type="number" className="formInput" required value={form.quantity} onChange={update("quantity")} placeholder="0" />
            </div>
            <div className="formGroup">
              <label className="formLabel">Low Stock Alert Threshold</label>
              <input type="number" className="formInput" value={form.lowStockThreshold} onChange={update("lowStockThreshold")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Purchase Date</label>
              <input type="date" className="formInput" value={form.purchaseDate} onChange={update("purchaseDate")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Expiry Date</label>
              <input type="date" className="formInput" value={form.expiryDate} onChange={update("expiryDate")} />
            </div>
          </div>
        </div>

        <div className="formCard">
          <h3 className="formSectionTitle">Supplier Information</h3>
          <div className="formGrid">
            <div className="formGroup">
              <label className="formLabel">Supplier Name</label>
              <input className="formInput" value={form.supplierName} onChange={update("supplierName")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Supplier Company</label>
              <input className="formInput" value={form.supplierCompany} onChange={update("supplierCompany")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Supplier City</label>
              <input className="formInput" value={form.supplierCity} onChange={update("supplierCity")} />
            </div>
            <div className="formGroup">
              <label className="formLabel">Supplier Contact</label>
              <input className="formInput" value={form.supplierContact} onChange={update("supplierContact")} placeholder="03XX-XXXXXXX" />
            </div>
          </div>
        </div>

        {error && <p style={{ color: "#c0302e", marginBottom: 12 }}>{error}</p>}

        <div className="formActions">
          <button type="button" className="btn btnSecondary" onClick={() => router.push("/shop/purchases")}>Cancel</button>
          <button type="submit" className="btn btnPrimary" disabled={submitting}>
            {submitting ? "Saving..." : "Save Product"}
          </button>
        </div>
      </form>
    </div>
  );
}