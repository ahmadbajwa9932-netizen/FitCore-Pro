"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, MoreVertical, PackagePlus, Trash2, X, Eye, Pencil  } from "lucide-react";
import { api } from "@/lib/api";


export default function PurchaseListPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openRow, setOpenRow] = useState(null);

  const [restockTarget, setRestockTarget] = useState(null);
  const [restockForm, setRestockForm] = useState({ quantity: "", purchaseDate: "", expiryDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api.getShopProducts({ search });
    setProducts(data);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    setOpenRow(null);
    await api.deleteShopProduct(id);
    load();
  };

  const openRestock = (product) => {
    setRestockTarget(product);
    setRestockForm({ quantity: "", purchaseDate: product.purchase_date?.slice(0, 10) || "", expiryDate: product.expiry_date?.slice(0, 10) || "" });
    setError(null);
    setOpenRow(null);
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.restockShopProduct(restockTarget.id, restockForm);
      setRestockTarget(null);
      load();
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
          <h1 className="pageTitle">Purchases</h1>
          <p className="pageSubtitle">{products.length} products in inventory</p>
        </div>
        <Link href="/shop/purchases/new" className="btn btnPrimary">
          <Plus size={16} /> Add Purchase
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 12px", width: 320, marginBottom: 16 }}>
        <Search size={16} color="#9ca3af" />
        <input
          style={{ border: "none", outline: "none", fontSize: 14, width: "100%" }}
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="tableWrapper">
        <table className="table">
          <thead>
          <tr><th>Product</th><th>Category</th><th>Purchase Price</th><th>Sold Price</th><th>Qty</th><th>Remaining</th><th>Expiry</th><th></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Loading products...</td></tr>}
            {!loading && products.map((p) => {
              const remaining = p.remaining_quantity ?? (p.quantity - p.sold_quantity);
              const lowStock = remaining <= p.low_stock_threshold;
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.category || "—"}</td>
                  <td>Rs. {Number(p.purchase_price).toFixed(2)}</td>
                  <td>Rs. {Number(p.sold_price).toFixed(2)}</td>
                  <td>{p.quantity}</td>
                  <td>
                    {remaining}
                    {lowStock && <span className="badge badgeDanger" style={{ marginLeft: 8 }}>Low Stock</span>}
                  </td>
                  <td>{p.expiry_date?.slice(0, 10) || "—"}</td>
                  <td>
                    <div className="actionCell">
                      <button className="actionIcon" onClick={() => setOpenRow(openRow === p.id ? null : p.id)}>
                        <MoreVertical size={16} />
                      </button>
                      {openRow === p.id && (
                        <div className="actionDropdown">
                          <Link href={`/shop/purchases/${p.id}`}><Eye size={14} style={{ marginRight: 8 }} />View Detail</Link>
                          <Link href={`/shop/purchases/${p.id}/edit`}><Pencil size={14} style={{ marginRight: 8 }} />Edit</Link>
                          <button onClick={() => openRestock(p)}><PackagePlus size={14} style={{ marginRight: 8 }} />Restock</button>
                          <button style={{ color: "#c0302e" }} onClick={() => handleDelete(p.id)}><Trash2 size={14} style={{ marginRight: 8 }} />Delete</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && products.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>No products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {restockTarget && (
        <div className="modalOverlay" onClick={() => setRestockTarget(null)}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3 className="modalTitle">Restock — {restockTarget.name}</h3>
              <button className="modalClose" onClick={() => setRestockTarget(null)}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>
              Current stock: <strong>{restockTarget.quantity}</strong>
            </p>
            <form onSubmit={handleRestockSubmit}>
              <div className="formGroup" style={{ marginBottom: 14 }}>
                <label className="formLabel">Quantity to Add *</label>
                <input
                  type="number"
                  className="formInput"
                  required
                  value={restockForm.quantity}
                  onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })}
                  placeholder="e.g. 30"
                />
                <span className="formHint">Will be added to current stock ({restockTarget.quantity})</span>
              </div>
              <div className="formGrid" style={{ marginBottom: 14 }}>
                <div className="formGroup">
                  <label className="formLabel">New Purchase Date</label>
                  <input
                    type="date"
                    className="formInput"
                    value={restockForm.purchaseDate}
                    onChange={(e) => setRestockForm({ ...restockForm, purchaseDate: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label className="formLabel">New Expiry Date</label>
                  <input
                    type="date"
                    className="formInput"
                    value={restockForm.expiryDate}
                    onChange={(e) => setRestockForm({ ...restockForm, expiryDate: e.target.value })}
                  />
                </div>
              </div>
              <span className="formHint">These dates will replace the old ones</span>
              {error && <p style={{ color: "#c0302e", fontSize: 13, marginTop: 10 }}>{error}</p>}
              <div className="modalActions">
                <button type="button" className="btn btnSecondary" onClick={() => setRestockTarget(null)}>Cancel</button>
                <button type="submit" className="btn btnPrimary" disabled={submitting}>
                  {submitting ? "Saving..." : "Confirm Restock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}