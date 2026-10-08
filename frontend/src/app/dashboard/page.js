"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";

const PIE_COLORS = ["#3e7bfa", "#8fb6ff", "#1a7f3c", "#b4650b", "#c0302e", "#6b7280"];

function formatMonth(m) {
  const [year, month] = m.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [trends, setTrends] = useState(null);
  const [operational, setOperational] = useState(null);

  useEffect(() => {
    api.getDashboardStats().then(setStats);
    api.getFinancialOverview().then(setFinancial);
    api.getMembershipTrends().then(setTrends);
    api.getOperationalOverview().then(setOperational);
  }, []);

  if (!stats || !financial || !trends || !operational) {
    return <p style={{ color: "#6b7280" }}>Loading dashboard...</p>;
  }

  const financialChartData = financial.monthly.map((m) => ({ ...m, monthLabel: formatMonth(m.month) }));
  const trendChartData = trends.monthly.map((m) => ({ ...m, monthLabel: formatMonth(m.month) }));

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="pageTitle">Dashboard</h1>
          <p className="pageSubtitle">Overview of your gym today</p>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="statGridSix">
        <div className="statCard">
          <p className="statLabel">Active Members</p>
          <p className="statValue">{stats.activeMembers}</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Expiring in 7 Days</p>
          <p className="statValue">{stats.expiringSoon}</p>
        </div>
        <div className="statCard">
          <p className="statLabel">New This Month</p>
          <p className="statValue">{stats.newThisMonth}</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Today's Revenue</p>
          <p className="statValue">Rs. {stats.todayRevenue.toFixed(0)}</p>
        </div>
        <div className="statCard">
          <p className="statLabel">This Month's Revenue</p>
          <p className="statValue">Rs. {stats.monthRevenue.toFixed(0)}</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Low Stock Products</p>
          <p className="statValue">{stats.lowStock}</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Maintenance Due Soon</p>
          <p className="statValue">{stats.maintenanceDue}</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Trial Conversion Rate</p>
          <p className="statValue">{trends.trialConversion.rate}%</p>
          <p className="statSub">{trends.trialConversion.converted}/{trends.trialConversion.total} converted</p>
        </div>
      </div>

      {/* Financial charts */}
      <div className="chartCard">
        <h3 className="chartTitle">Revenue by Source (Last 6 Months)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={financialChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
            <XAxis dataKey="monthLabel" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip formatter={(value) => `Rs. ${Number(value).toFixed(2)}`} />
            <Legend />
            <Bar dataKey="membershipRevenue" name="Membership Revenue" fill="#3e7bfa" radius={[4, 4, 0, 0]} />
            <Bar dataKey="posRevenue" name="POS Sales Revenue" fill="#8fb6ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chartCard">
        <h3 className="chartTitle">POS Profit Trend</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={financialChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
            <XAxis dataKey="monthLabel" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip formatter={(value) => `Rs. ${Number(value).toFixed(2)}`} />
            <Line type="monotone" dataKey="posProfit" name="POS Profit" stroke="#1a7f3c" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Membership analytics */}
      <div className="dashboardGridTwo">
        <div className="chartCard">
          <h3 className="chartTitle">New vs Renewed vs Cancelled</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
              <XAxis dataKey="monthLabel" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="new" name="New" fill="#3e7bfa" radius={[3, 3, 0, 0]} />
              <Bar dataKey="renewed" name="Renewed" fill="#1a7f3c" radius={[3, 3, 0, 0]} />
              <Bar dataKey="cancelled" name="Cancelled" fill="#c0302e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chartCard">
          <h3 className="chartTitle">Plan Popularity</h3>
          {trends.planPopularity.length === 0 ? (
            <p className="emptyMini">No active members on any plan yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={trends.planPopularity} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {trends.planPopularity.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Operational widgets */}
      <div className="dashboardGridTwo" style={{ marginTop: 20 }}>
        <div className="chartCard">
          <h3 className="chartTitle">Expiring Memberships (Next 7 Days)</h3>
          {operational.expiringMembers.length === 0 ? (
            <p className="emptyMini">Nothing expiring soon.</p>
          ) : (
            <table className="miniTable">
              <thead><tr><th>Member</th><th>Phone</th><th>Expiry</th></tr></thead>
              <tbody>
                {operational.expiringMembers.map((m) => (
                  <tr key={m.id}>
                    <td><Link href={`/members/${m.id}`} style={{ color: "var(--color-text-primary)", fontWeight: 600, textDecoration: "none" }}>{m.name}</Link></td>
                    <td>{m.phone}</td>
                    <td>{m.expiry_date?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="chartCard">
          <h3 className="chartTitle">Low Stock Products</h3>
          {operational.lowStockProducts.length === 0 ? (
            <p className="emptyMini">All products well stocked.</p>
          ) : (
            <table className="miniTable">
              <thead><tr><th>Product</th><th>Qty</th><th>Threshold</th></tr></thead>
              <tbody>
                {operational.lowStockProducts.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.quantity}</td>
                    <td>{p.low_stock_threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="dashboardGridTwo" style={{ marginTop: 20 }}>
        <div className="chartCard">
          <h3 className="chartTitle">Equipment Maintenance Due Soon</h3>
          {operational.maintenanceDue.length === 0 ? (
            <p className="emptyMini">Nothing due for maintenance.</p>
          ) : (
            <table className="miniTable">
              <thead><tr><th>Equipment</th><th>Next Due</th></tr></thead>
              <tbody>
                {operational.maintenanceDue.map((e) => (
                  <tr key={e.id}>
                    <td><Link href={`/equipment/${e.id}`} style={{ color: "var(--color-text-primary)", fontWeight: 600, textDecoration: "none" }}>{e.name}</Link></td>
                    <td>{e.next_due?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="chartCard">
          <h3 className="chartTitle">Recent Sales</h3>
          {operational.recentSales.length === 0 ? (
            <p className="emptyMini">No sales recorded yet.</p>
          ) : (
            <table className="miniTable">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Total</th></tr></thead>
              <tbody>
                {operational.recentSales.map((s) => (
                  <tr key={s.id}>
                    <td><Link href={`/shop/sales/${s.id}`} style={{ color: "var(--color-text-primary)", fontWeight: 600, textDecoration: "none" }}>{s.invoice_no}</Link></td>
                    <td>{s.customer_name || "Walk-in"}</td>
                    <td>Rs. {Number(s.grand_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}