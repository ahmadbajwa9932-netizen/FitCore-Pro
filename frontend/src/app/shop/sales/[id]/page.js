"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Pencil, Printer, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { printSaleReceipt } from "@/lib/receipt";

export default function SaleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSale(id).then((data) => {
      setSale(data);
      setLoading(false);
    });
  }, [id]);

  const handlePrint = () => {
    printSaleReceipt({
      id: sale.id,
      customer: { name: sale.customer_name, city: sale.customer_city, contact: sale.customer_contact },
      cart: sale.items.map((it) => ({ productName: it.product_name, price: Number(it.price), quantity: it.quantity })),
      paymentMethod: sale.payment_method,
      discountType: sale.discount_type,
      discountValue: sale.discount_value,
      taxType: sale.tax_type,
      taxValue: sale.tax_value,
      subtotal: Number(sale.subtotal),
      grandTotal: Number(sale.grand_total),
      receivedAmount: Number(sale.received_amount),
    });
  };

  if (loading || !sale) return <p style={{ color: "#6b7280" }}>Loading sale...</p>;

  const discLabel = sale.discount_type === "percent" ? `${sale.discount_value}%` : `Rs. ${Number(sale.discount_value).toFixed(2)}`;
  const taxLabel = sale.tax_type === "percent" ? `${sale.tax_value}%` : `Rs. ${Number(sale.tax_value).toFixed(2)}`;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <button className="btn btnSecondary" style={{ marginBottom: 12 }} onClick={() => router.push("/shop/sales")}>
            <ArrowLeft size={16} /> Back to Sales
          </button>
          <h1 className="pageTitle">Sale #{sale.id}</h1>
          <p className="pageSubtitle">{sale.created_at?.slice(0, 10)} · {sale.created_at?.slice(11, 16)}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btnSecondary" onClick={handlePrint}>
            <Printer size={16} /> Print Receipt
          </button>
          <button className="btn btnPrimary" onClick={() => router.push(`/shop/pos/${sale.id}/edit`)}>
            <Pencil size={16} /> Edit
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="formGrid">
          <div><strong>Invoice No.</strong><p>{sale.invoice_no}</p></div>
          <div><strong>Customer</strong><p>{sale.customer_name || "Walk-in customer"}</p></div>
          <div><strong>City</strong><p>{sale.customer_city || "—"}</p></div>
          <div><strong>Contact</strong><p>{sale.customer_contact || "—"}</p></div>
          <div><strong>Payment Method</strong><p style={{ textTransform: "capitalize" }}>{sale.payment_method}</p></div>
        </div>
      </div>

      <h3 className="formSectionTitle">Items</h3>
      <div className="tableWrapper" style={{ marginBottom: 20 }}>
        <table className="table">
          <thead>
            <tr><th>Product</th><th>Price</th><th>Qty</th><th>Discount</th><th>Tax</th><th>Line Total</th></tr>
          </thead>
          <tbody>
            {sale.items.map((it) => (
              <tr key={it.id}>
                <td style={{ fontWeight: 600 }}>{it.product_name}</td>
                <td>Rs. {Number(it.price).toFixed(2)}</td>
                <td>{it.quantity}</td>
                <td>{it.discount_type === "percent" ? `${it.discount_value}%` : `Rs. ${Number(it.discount_value).toFixed(2)}`}</td>
                <td>{it.tax_type === "percent" ? `${it.tax_value}%` : `Rs. ${Number(it.tax_value).toFixed(2)}`}</td>
                <td style={{ fontWeight: 700 }}>Rs. {Number(it.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="invoiceSummary">
        <div className="invoiceRow"><span>Subtotal</span><span>Rs. {Number(sale.subtotal).toFixed(2)}</span></div>
        <div className="invoiceRow"><span>Discount ({discLabel})</span><span>Rs. {(Number(sale.subtotal) - (Number(sale.subtotal) - Number(sale.discount_type === "percent" ? sale.subtotal * sale.discount_value / 100 : sale.discount_value))).toFixed(2)}</span></div>
        <div className="invoiceRow"><span>Tax ({taxLabel})</span><span>+ Rs. {(Number(sale.grand_total) - (Number(sale.subtotal) - (sale.discount_type === "percent" ? sale.subtotal * sale.discount_value / 100 : sale.discount_value))).toFixed(2)}</span></div>
        <div className="invoiceDivider" />
        <div className="invoiceGrandRow">
          <span>Grand Total</span>
          <span>Rs. {Number(sale.grand_total).toFixed(2)}</span>
        </div>

        <div className="invoicePaymentSection">
          <div className="invoiceRow"><span>Received Amount</span><span>Rs. {Number(sale.received_amount).toFixed(2)}</span></div>
          <div className="invoiceRow"><span>Change Returned</span><span>Rs. {Number(sale.change_amount).toFixed(2)}</span></div>
          <div className="invoiceRow"><span>Profit</span><span>Rs. {Number(sale.profit).toFixed(2)}</span></div>
        </div>
        </div>
    </div>
  );
}