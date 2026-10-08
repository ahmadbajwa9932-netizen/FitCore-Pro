"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, PackagePlus } from "lucide-react";
import { api } from "@/lib/api";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getShopProduct(id).then((data) => {
      setProduct(data);
      setLoading(false);
    });
  }, [id]);

  if (loading || !product) return <p style={{ color: "#6b7280" }}>Loading product...</p>;

  const remainingQuantity = product.remaining_quantity ?? (product.quantity - product.sold_quantity);
  const lowStock = remainingQuantity <= product.low_stock_threshold;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <button className="btn btnSecondary" style={{ marginBottom: 12 }} onClick={() => router.push("/shop/purchases")}>
            <ArrowLeft size={16} /> Back to Purchases
          </button>
          <h1 className="pageTitle">{product.name}</h1>
          <p className="pageSubtitle">Product ID #{product.id}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {lowStock && <span className="badge badgeDanger">Low Stock</span>}
        </div>
      </div>

      <h3 className="formSectionTitle">Product Info</h3>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="formGrid">
        <div><strong>Category</strong><p>{product.category || "—"}</p></div>
          <div><strong>Total Purchased Quantity</strong><p>{product.quantity}</p></div>
          <div><strong>Sold Quantity</strong><p>{product.sold_quantity}</p></div>
          <div><strong>Remaining Quantity</strong><p>{remainingQuantity}</p></div>
          <div><strong>Low Stock Threshold</strong><p>{product.low_stock_threshold}</p></div>
          <div><strong>Purchase Price</strong><p>Rs. {Number(product.purchase_price).toFixed(2)}</p></div>
          <div><strong>Sold Price</strong><p>Rs. {Number(product.sold_price).toFixed(2)}</p></div>
          <div><strong>Purchase Date</strong><p>{product.purchase_date?.slice(0, 10) || "—"}</p></div>
          <div><strong>Expiry Date</strong><p>{product.expiry_date?.slice(0, 10) || "—"}</p></div>
          <div><strong>Added On</strong><p>{product.created_at?.slice(0, 10) || "—"}</p></div>
        </div>
      </div>

      <h3 className="formSectionTitle">Supplier Info</h3>
      <div className="card">
        <div className="formGrid">
          <div><strong>Supplier Name</strong><p>{product.supplier_name || "—"}</p></div>
          <div><strong>Supplier Company</strong><p>{product.supplier_company || "—"}</p></div>
          <div><strong>Supplier City</strong><p>{product.supplier_city || "—"}</p></div>
          <div><strong>Supplier Contact</strong><p>{product.supplier_contact || "—"}</p></div>
        </div>
      </div>
    </div>
  );
}