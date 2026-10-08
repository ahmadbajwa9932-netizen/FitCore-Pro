"use client";

import Link from "next/link";
import { TrendingUp, Users, ShoppingCart, Dumbbell, Package, Wallet, Receipt } from "lucide-react";

const reports = [
  { title: "Revenue Report", desc: "Membership vs POS revenue, profit, payment methods, billed vs collected", href: "/reports/revenue", icon: TrendingUp },
  { title: "Membership Report", desc: "New vs renewed vs cancelled, plan breakdown, expiry forecast", href: "/reports/membership", icon: Users },
  { title: "POS / Sales Report", desc: "Sales & profit trend, best-selling products, profit margin, payment methods", href: "/reports/sales", icon: ShoppingCart },
  { title: "Trainer Report", desc: "Assigned members, fees collected vs salary paid, per-trainer profitability", href: "/reports/trainers", icon: Dumbbell },
  { title: "Inventory Report", desc: "Stock valuation, low stock & expiring products, equipment maintenance costs", href: "/reports/inventory", icon: Package },
  { title: "Staff & Payroll Report", desc: "Combined staff + trainer salary payments by month", href: "/reports/payroll", icon: Wallet },
  { title: "Expense Report", desc: "Expenses by type/category over a date range, with trend over time", href: "/reports/expenses", icon: Receipt },
];

export default function ReportsHubPage() {
  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Reports</h1>
          <p className="pageSubtitle">Detailed, filterable reports across your gym</p>
        </div>
      </div>
      <div className="dashboardGridTwo">
        {reports.map(({ title, desc, href, icon: Icon }) => (
          <Link key={href} href={href} className="card" style={{ textDecoration: "none", display: "block" }}>
            <Icon size={22} color="var(--color-accent)" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "var(--color-text-primary)" }}>{title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)" }}>{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}