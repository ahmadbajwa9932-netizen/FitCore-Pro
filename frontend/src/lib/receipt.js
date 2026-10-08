export function getReceiptHtml({ member, invoice, plan, trainer, paymentMethod }) {
    const rows = [
      ["Membership Plan", `Rs. ${invoice.planAmount.toFixed(2)}`],
      invoice.planDiscount > 0 ? ["  Discount", `- Rs. ${invoice.planDiscount.toFixed(2)}`] : null,
      invoice.trainerFee > 0 ? ["Trainer Fee", `Rs. ${invoice.trainerFee.toFixed(2)}`] : null,
      invoice.trainerFee > 0 && invoice.trainerDiscount > 0 ? ["  Discount", `- Rs. ${invoice.trainerDiscount.toFixed(2)}`] : null,
      invoice.overallDiscount > 0 ? ["Overall Discount", `- Rs. ${invoice.overallDiscount.toFixed(2)}`] : null,
    ].filter(Boolean);
  
    const html = `
  <!DOCTYPE html>
  <html>
  <head>
  <title>Receipt</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      color: #000;
      width: 280px;
      margin: 0 auto;
      padding: 12px;
      font-size: 12px;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .line { border-top: 1px dashed #000; margin: 8px 0; }
    .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; margin-top: 6px; }
    @media print {
      body { width: 100%; }
      @page { margin: 0; }
    }
  </style>
  </head>
  <body>
    <div class="center bold" style="font-size:16px;">FLEXOS GYM</div>
    <div class="center" style="margin-bottom:8px;">Membership Receipt</div>
    <div class="line"></div>
    <div class="row"><span>Member:</span><span class="bold">${member.name}</span></div>
    <div class="row"><span>Phone:</span><span>${member.phone}</span></div>
    <div class="row"><span>Plan:</span><span>${plan?.name || "-"}</span></div>
    ${trainer ? `<div class="row"><span>Trainer:</span><span>${trainer.name}</span></div>` : ""}
    <div class="row"><span>Start:</span><span>${member.startDate}</span></div>
    <div class="row"><span>Expiry:</span><span>${member.expiryDate}</span></div>
    <div class="line"></div>
    ${rows.map(([label, val]) => `<div class="row"><span>${label}</span><span>${val}</span></div>`).join("")}
    <div class="line"></div>
    <div class="total-row"><span>TOTAL</span><span>Rs. ${invoice.total.toFixed(2)}</span></div>
    <div class="row"><span>Paid (${paymentMethod})</span><span>Rs. ${invoice.paid.toFixed(2)}</span></div>
    ${invoice.changeDue > 0 ? `<div class="row bold"><span>Change Returned</span><span>Rs. ${invoice.changeDue.toFixed(2)}</span></div>` : ""}
    ${invoice.status === "partial" ? `<div class="row bold"><span>Balance Due</span><span>Rs. ${(invoice.total - invoice.paid).toFixed(2)}</span></div>` : ""}
    <div class="line"></div>
    <div class="center" style="margin-top:8px;">Thank you for joining!</div>
    <script>window.onload = () => { window.print(); }</script>
  </body>
  </html>`;
  return html;
}

export function printMemberReceipt(data) {
    const win = window.open("", "_blank", "width=320,height=600");
    win.document.write(getReceiptHtml(data));
    win.document.close();
}

export function printSaleReceipt({ id, customer, cart, paymentMethod, discountType, discountValue, taxType, taxValue, subtotal, grandTotal, receivedAmount }) {
  const win = window.open("", "_blank", "width=320,height=600");

  const itemRows = cart.map((row) => {
    const base = Number(row.price) * Number(row.quantity);
    return `<div class="row"><span>${row.productName} x${row.quantity}</span><span>Rs. ${base.toFixed(2)}</span></div>`;
  }).join("");

  const discLabel = discountType === "percent" ? `${discountValue}%` : `Rs. ${Number(discountValue || 0).toFixed(2)}`;
  const taxLabel = taxType === "percent" ? `${taxValue}%` : `Rs. ${Number(taxValue || 0).toFixed(2)}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
<title>Receipt</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; color: #000; width: 280px; margin: 0 auto; padding: 12px; font-size: 12px; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .line { border-top: 1px dashed #000; margin: 8px 0; }
  .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; margin-top: 6px; }
  @media print { body { width: 100%; } @page { margin: 0; } }
</style>
</head>
<body>
  <div class="center bold" style="font-size:16px;">FLEXOS GYM</div>
  <div class="center" style="margin-bottom:8px;">Sale Receipt #${id}</div>
  <div class="line"></div>
  ${customer?.name ? `<div class="row"><span>Customer:</span><span>${customer.name}</span></div>` : ""}
  ${customer?.contact ? `<div class="row"><span>Contact:</span><span>${customer.contact}</span></div>` : ""}
  <div class="line"></div>
  ${itemRows}
  <div class="line"></div>
  <div class="row"><span>Subtotal</span><span>Rs. ${subtotal.toFixed(2)}</span></div>
  <div class="row"><span>Discount (${discLabel})</span><span>-</span></div>
  <div class="row"><span>Tax (${taxLabel})</span><span>-</span></div>
<div class="total-row"><span>GRAND TOTAL</span><span>Rs. ${grandTotal.toFixed(2)}</span></div>
  <div class="row"><span>Paid via (${paymentMethod})</span><span>Rs. ${Number(receivedAmount || 0).toFixed(2)}</span></div>
  ${receivedAmount > grandTotal ? `<div class="row bold"><span>Change Returned</span><span>Rs. ${(receivedAmount - grandTotal).toFixed(2)}</span></div>` : ""}
  <div class="line"></div>
  <div class="center" style="margin-top:8px;">Thank you for your purchase!</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}