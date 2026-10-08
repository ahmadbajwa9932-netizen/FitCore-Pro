"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Printer, Save } from "lucide-react";
import { api } from "@/lib/api";
import { printSaleReceipt } from "@/lib/receipt";

export default function PosBillPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState({ name: "", city: "", contact: "" });
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [cart, setCart] = useState([]);

  const [discountType, setDiscountType] = useState("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [taxType, setTaxType] = useState("amount");
  const [taxValue, setTaxValue] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    api.getNextInvoicePreview().then((res) => setInvoiceNo(res.invoiceNo));
  }, []);

  useEffect(() => {
    if (!searchTerm) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      api.getShopProducts({ search: searchTerm }).then((data) => {
        setSearchResults(data);
        setShowResults(true);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        return prev.map((c) => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        productId: product.id, productName: product.name, price: Number(product.sold_price),
        quantity: 1, discountType: "amount", discountValue: 0, taxType: "amount", taxValue: 0,
      }];
    });
    setSearchTerm("");
    setSearchResults([]);
    setShowResults(false);
  };

  const updateCartRow = (index, field, value) => {
    setCart((prev) => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const removeCartRow = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const lineTotal = (row) => {
    const base = Number(row.price) * Number(row.quantity || 0);
    const disc = row.discountType === "percent" ? base * (Number(row.discountValue || 0) / 100) : Number(row.discountValue || 0);
    const afterDisc = Math.max(0, base - disc);
    const tax = row.taxType === "percent" ? afterDisc * (Number(row.taxValue || 0) / 100) : Number(row.taxValue || 0);
    return afterDisc + tax;
  };

  const subtotal = cart.reduce((sum, row) => sum + lineTotal(row), 0);
  const discAmt = discountType === "percent" ? subtotal * (Number(discountValue || 0) / 100) : Number(discountValue || 0);
  const afterDiscount = Math.max(0, subtotal - discAmt);
  const taxAmt = taxType === "percent" ? afterDiscount * (Number(taxValue || 0) / 100) : Number(taxValue || 0);
  const grandTotal = afterDiscount + taxAmt;
  const changeAmount = Math.max(0, Number(receivedAmount || 0) - grandTotal);

  const buildPayload = () => ({
    customerName: customer.name, customerCity: customer.city, customerContact: customer.contact,
    paymentMethod, receivedAmount: Number(receivedAmount || 0),
    items: cart.map((row) => ({
      productId: row.productId, productName: row.productName, price: row.price, quantity: Number(row.quantity),
      discountType: row.discountType, discountValue: Number(row.discountValue || 0),
      taxType: row.taxType, taxValue: Number(row.taxValue || 0),
    })),
    discountType, discountValue: Number(discountValue || 0), taxType, taxValue: Number(taxValue || 0),
  });

  const resetForm = () => {
    setCart([]);
    setCustomer({ name: "", city: "", contact: "" });
    setDiscountValue(""); setTaxValue(""); setReceivedAmount(""); setPaymentMethod("cash");
    api.getNextInvoicePreview().then((res) => setInvoiceNo(res.invoiceNo));
  };

  const handleSave = async (thenPrint) => {
    if (cart.length === 0) { setError("Add at least one product to the cart"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createSale(buildPayload());
      if (thenPrint) {
        setReceiptData({ ...res, customer, cart, paymentMethod, discountType, discountValue, taxType, taxValue, subtotal, grandTotal, receivedAmount: Number(receivedAmount || 0) });
      } else {
        router.push("/shop/pos");
        resetForm();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintNow = () => {
    printSaleReceipt(receiptData);
    setReceiptData(null);
    resetForm();
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">POS Bill</h1>
          <p className="pageSubtitle">Create a new sale</p>
        </div>
      </div>

      <div className="posLayout">
        {/* Left: customer + search */}
        <div>
          <div className="posPanel">
            <h3 className="posPanelTitle">Customer Information</h3>
            <div className="posFieldRow">
              <div>
                <label className="posFieldLabel">Customer Name</label>
                <input className="posInput" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Walk-in customer" />
              </div>
              <div>
                <label className="posFieldLabel">City</label>
                <input className="posInput" value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} placeholder="City" />
              </div>
            </div>
            <div className="posFieldRow" style={{ gridTemplateColumns: "1fr" }}>
              <div>
                <label className="posFieldLabel">Contact No</label>
                <input className="posInput" value={customer.contact} onChange={(e) => setCustomer({ ...customer, contact: e.target.value })} placeholder="03XX-XXXXXXX" />
              </div>
            </div>
          </div>
          <div className="posFieldRow" style={{ gridTemplateColumns: "1fr" }}>
  <div>
    <label className="posFieldLabel">Invoice No</label>
    <input className="posInput" readOnly value={invoiceNo} />
  </div>
</div>

          <div className="posPanel posSearchWrap" ref={searchRef}>
            <h3 className="posPanelTitle">Add Products</h3>
            <input
              className="posInput"
              placeholder="Search products by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
            />
            {showResults && searchResults.length > 0 && (
              <div className="posAutocomplete">
                {searchResults.map((p) => (
                  <div key={p.id} className="posAutocompleteItem" onClick={() => addToCart(p)}>
                    <span>{p.name}</span>
                    <span style={{ color: "#6b7280" }}>Rs. {p.sold_price} · Stock: {p.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: cart table + summary */}
        <div>
          <div className="tableWrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Item Description</th><th>Qty</th><th>Price</th><th>Discount</th><th>Tax</th><th>Total</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{row.productName}</td>
                    <td>
                      <input
                        type="number" min="1" className="posCartInput"
                        value={row.quantity}
                        onChange={(e) => updateCartRow(i, "quantity", Number(e.target.value))}
                      />
                    </td>
                    <td>Rs. {row.price.toFixed(2)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input
                          type="number" className="posCartInput"
                          value={row.discountValue}
                          onChange={(e) => updateCartRow(i, "discountValue", e.target.value)}
                        />
                        <select className="posCartSelect" value={row.discountType} onChange={(e) => updateCartRow(i, "discountType", e.target.value)}>
                          <option value="amount">Rs.</option>
                          <option value="percent">%</option>
                        </select>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input
                          type="number" className="posCartInput"
                          value={row.taxValue}
                          onChange={(e) => updateCartRow(i, "taxValue", e.target.value)}
                        />
                        <select className="posCartSelect" value={row.taxType} onChange={(e) => updateCartRow(i, "taxType", e.target.value)}>
                          <option value="amount">Rs.</option>
                          <option value="percent">%</option>
                        </select>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>Rs. {lineTotal(row).toFixed(2)}</td>
                    <td>
                      <button className="actionIcon" onClick={() => removeCartRow(i)}><X size={16} /></button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Search and add products above.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="posSummaryPanel">
            <div className="posSummaryGrid">
              <div>
                <label className="posFieldLabel">Subtotal</label>
                <input className="posInput" readOnly value={`Rs. ${subtotal.toFixed(2)}`} />
              </div>
              <div>
                <label className="posFieldLabel">Discount</label>
                <div className="posInlineGroup">
                  <select className="posCartSelect" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                    <option value="amount">Amt</option>
                    <option value="percent">%</option>
                  </select>
                  <input type="number" className="posInput" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="posFieldLabel">Tax</label>
                <div className="posInlineGroup">
                  <select className="posCartSelect" value={taxType} onChange={(e) => setTaxType(e.target.value)}>
                    <option value="amount">Amt</option>
                    <option value="percent">%</option>
                  </select>
                  <input type="number" className="posInput" value={taxValue} onChange={(e) => setTaxValue(e.target.value)} placeholder="0" />
                </div>
              </div>
            </div>

            <div className="posSummaryGridThree">
              <div>
                <label className="posFieldLabel">Payment Method</label>
                <select className="posInput" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="posFieldLabel">Received Amount</label>
                <input type="number" className="posInput" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="posFieldLabel">Change Amount</label>
                <input className="posInput" readOnly value={`Rs. ${changeAmount.toFixed(2)}`} />
              </div>
            </div>

            <div className="posSummaryGridTwo">
              <div></div>
            </div>

            <div className="posGrandTotalBar">
              <span>Grand Total</span>
              <span>Rs. {grandTotal.toFixed(2)}</span>
            </div>

            {error && <p style={{ color: "#c0302e", marginBottom: 12 }}>{error}</p>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button className="btn btnSuccess" disabled={submitting} onClick={() => handleSave(false)}>
                <Save size={16} /> Save Record
              </button>
              <button className="btn btnSuccess" disabled={submitting} onClick={() => handleSave(true)}>
                <Printer size={16} /> Save & Print Receipt
              </button>
            </div>
          </div>
        </div>
      </div>

      {receiptData && (
        <div className="modalOverlay" onClick={() => setReceiptData(null)}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3 className="modalTitle">Sale Recorded</h3>
              <button className="modalClose" onClick={() => setReceiptData(null)}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 14, marginBottom: 20 }}>
              Grand Total: <strong>Rs. {receiptData.grandTotal.toFixed(2)}</strong>
            </p>
            <div className="modalActions">
              <button className="btn btnSecondary" onClick={() => setReceiptData(null)}>Close</button>
              <button className="btn btnSuccess" onClick={handlePrintNow}><Printer size={16} /> Print Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}