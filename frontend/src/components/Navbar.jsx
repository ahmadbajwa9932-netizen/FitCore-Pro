"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, ChevronDown, Menu, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import styles from "./Navbar.module.css";

function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Navbar({ collapsed, onToggle }) {
  const router = useRouter();
  const [username, setUsername] = useState("User");
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    api.getMe().then((res) => setUsername(res.admin.username)).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await api.logout();
    router.push("/login");
  };

  const initials = getInitials(username);

  return (
    <header className={`${styles.navbar} ${collapsed ? styles.navbarExpanded : ""}`}>
      <div className={styles.leftSection}>
        <button className={styles.iconButton} onClick={onToggle}>
          <Menu size={18} color={"#1b1f27"} />
        </button>

        <div className={styles.searchBox}>
          <Search size={16} color="#9ca3af" />
          <input placeholder="Search members, invoices, classes..." className={styles.searchInput} />
        </div>
      </div>

      <div className={styles.rightSection}>
        <button className={styles.iconButton}>
          <Bell size={18} color="#1b1f27" />
          <span className={styles.badge}>3</span>
        </button>

        <div style={{ position: "relative" }} ref={wrapperRef}>
          <button className={styles.profileButton} onClick={() => setMenuOpen((o) => !o)}>
            <div className={styles.avatar}>{initials}</div>
            <ChevronDown size={14} color="#9ca3af" />
          </button>

          {menuOpen && (
            <div className="actionDropdown">
              <button type="button" onClick={handleLogout}>
                <LogOut size={14} style={{ marginRight: 8 }} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}