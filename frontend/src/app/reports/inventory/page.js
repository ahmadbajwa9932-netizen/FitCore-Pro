"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function InventoryReportPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getInventoryReport().then(setData);
  }, []);

  if (!data) return <p style={{ color: "#6b7280" }}>Loading report...</p>;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Inventory Report</h1>
          <p className="pageSubtitle">Stock valuation, low stock, expiring products, and maintenance costs</p>
        </div>
      </div>

      <div className="statGridSix">
        <div className="statCard">
          <p className="statLabel">Total Products</p>
          <p className="statValue">{data.valuation.productCount}</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Total Stock Value</p>
          <p className="statValue">Rs. {data.valuation.totalValue.toFixed(2)}</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Low Stock Items</p>
          <p className="statValue">{data.lowStock.length}</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Expiring in 30 Days</p>
          <p className="statValue">{data.expiringSoon.length}</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Total Maintenance Cost</p>
          <p className="statValue">Rs. {data.maintenanceTotalCost.toFixed(2)}</p>
        </div>
      </div>

      <div className="chartCard">
        <h3 className="chartTitle">Stock Valuation by Product</h3>
        <table className="miniTable">
          <thead><tr><th>Product</th><th>Category</th><th>Qty</th><th>Purchase Price</th><th>Stock Value</th></tr></thead>
          <tbody>
            {data.products.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{p.category || "—"}</td>
                <td>{p.quantity}</td>
                <td>Rs. {p.purchasePrice.toFixed(2)}</td>
                <td>Rs. {p.stockValue.toFixed(2)}</td>
              </tr>
            ))}
            {data.products.length === 0 && <tr><td colSpan={5} className="emptyMini">No products in inventory.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="dashboardGridTwo">
        <div className="chartCard">
          <h3 className="chartTitle">Low Stock Products</h3>
          <table className="miniTable">
            <thead><tr><th>Product</th><th>Qty</th><th>Threshold</th></tr></thead>
            <tbody>
              {data.lowStock.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.quantity}</td>
                  <td>{p.threshold}</td>
                </tr>
              ))}
              {data.lowStock.length === 0 && <tr><td colSpan={3} className="emptyMini">All products well stocked.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="chartCard">
          <h3 className="chartTitle">Expiring Soon (30 Days)</h3>
          <table className="miniTable">
            <thead><tr><th>Product</th><th>Qty</th><th>Expiry Date</th></tr></thead>
            <tbody>
              {data.expiringSoon.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.quantity}</td>
                  <td>{p.expiryDate?.slice(0, 10)}</td>
                </tr>
              ))}
              {data.expiringSoon.length === 0 && <tr><td colSpan={3} className="emptyMini">Nothing expiring soon.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="chartCard">
        <h3 className="chartTitle">Equipment Maintenance Cost History</h3>
        <table className="miniTable">
          <thead><tr><th>Equipment</th><th>Description</th><th>Cost</th><th>Date</th></tr></thead>
          <tbody>
            {data.maintenanceHistory.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 600 }}>{m.equipmentName}</td>
                <td>{m.description}</td>
                <td>Rs. {m.cost.toFixed(2)}</td>
                <td>{m.date?.slice(0, 10)}</td>
              </tr>
            ))}
            {data.maintenanceHistory.length === 0 && <tr><td colSpan={4} className="emptyMini">No maintenance logged yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}