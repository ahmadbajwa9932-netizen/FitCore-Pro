"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function EditPurchasePage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getShopProduct(id).then((data) => {
      setForm({
        name: data.name || "",
        category: data.category || "",
        purchasePrice: data.purchase_price ?? "",
        soldPrice: data.sold_price ?? "",
        quantity: data.quantity ?? "",
        lowStockThreshold: data.low_stock_threshold ?? "5",
        purchaseDate: data.purchase_date?.slice(0, 10) || "",
        expiryDate: data.expiry_date?.slice(0, 10) || "",
        supplierName: data.supplier_name || "",
        supplierCompany: data.supplier_company || "",
        supplierCity: data.supplier_city || "",
        supplierContact: data.supplier_contact || "",
      });
      setLoading(false);
    });
  }, [id]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.updateShopProduct(id, form);
      router.push("/shop/purchases");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !form) return <p style={{ color: "#6b7280" }}>Loading product...</p>;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Edit Purchase</h1>
          <p className="pageSubtitle">Update product details in shop inventory</p>
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
            {submitting ? "Saving..." : "Update Product"}
          </button>
        </div>
      </form>
    </div>
  );
}