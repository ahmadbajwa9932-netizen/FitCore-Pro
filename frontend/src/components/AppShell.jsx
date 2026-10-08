"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import styles from "./AppShell.module.css";

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <Sidebar collapsed={collapsed} />
      <Navbar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main className={`${styles.mainContent} ${collapsed ? styles.mainContentExpanded : ""}`}>
        {children}
      </main>
    </>
  );
}