"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CreditCard, CalendarClock, Dumbbell,
  ShoppingCart, ClipboardList, MessageSquare, BarChart3,
  Building2, Settings, Wrench, User2, Wallet
} from "lucide-react";
import { api } from "@/lib/api";
import styles from "./Sidebar.module.css";

const menu = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Members", href: "/members", icon: Users },
  { label: "Trial Members", href: "/leads", icon: MessageSquare },
  { label: "Memberships", href: "/memberships", icon: CreditCard },
  { label: "Attendance", href: "/attendance", icon: ClipboardList },
  { label: "Trainers", href: "/trainers", icon: Dumbbell },
  { label: "Staff", href: "/staff", icon: User2 },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Shop / POS", href: "/shop/purchases", icon: ShoppingCart },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Equipment", href: "/equipment", icon: Wrench },
  { label: "Expenses", href: "/expenses", icon: Wallet },
  { label: "Settings", href: "/settings", icon: Settings },
];

function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Sidebar({ collapsed }) {
  const pathname = usePathname();
  const [username, setUsername] = useState("User");
  const [role, setRole] = useState("user");
  const [gymName, setGymName] = useState("Flex Gym");

  useEffect(() => {
    api.getMe().then((res) => {
      setUsername(res.admin.username);
      setRole(res.admin.role);
    }).catch(() => {});

    api.getAuthStatus().then((res) => {
      if (res.business?.gym_name) setGymName(res.business.gym_name);
    }).catch(() => {});
  }, []);

  const [firstWord, ...rest] = gymName.trim().split(/\s+/);
  const secondWord = rest.join(" ");
  const initials = getInitials(username);
  const roleLabel = role === "admin" ? "Super Admin" : "User";

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}>
      <div className={styles.logoRow}>
        <div className={styles.logoBox}>
          <Dumbbell size={18} color="#15316e" />
        </div>
        <span className={styles.logoText}>
          {firstWord}
          {secondWord && <span className={styles.logoAccent}> {secondWord}</span>}
        </span>
      </div>

      <nav className={styles.nav}>
        {menu.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
            >
              <Icon size={18} strokeWidth={2} />
              <span className={styles.navLabel}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.userCard}>
        <div className={styles.avatar}>{initials}</div>
        <div>
          <p className={styles.userName}>{username}</p>
          <p className={styles.userRole}>{roleLabel}</p>
        </div>
      </div>
    </aside>
  );
}