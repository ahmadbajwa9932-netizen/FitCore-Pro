"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AppShell from "@/components/AppShell";
import "@/app/auth.css";

const AUTH_PAGES = ["/business-info", "/signup", "/login", "/forgot-password"];
const LICENSE_PAGES = ["/license", "/license-expired"];

export default function AuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authState, setAuthState] = useState(null);
  const hasCheckedOnce = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const license = await api.getLicenseStatus();

        if (!license.exists || license.status === "tampered" || license.status === "expired") {
          if (!cancelled) {
            setAuthState({ license, businessSetup: false, adminExists: false, authenticated: false });
            setChecking(false);
            hasCheckedOnce.current = true;
          }
          return;
        }

        const status = await api.getAuthStatus();
        let authenticated = false;

        if (status.businessSetup && status.adminExists) {
          try {
            await api.getMe();
            authenticated = true;
          } catch {
            authenticated = false;
          }
        }

        if (!cancelled) {
          setAuthState({ ...status, license, authenticated });
          setChecking(false);
          hasCheckedOnce.current = true;
        }
      } catch {
        if (!cancelled) {
          setAuthState({
            license: { exists: true, status: "active" },
            businessSetup: true,
            adminExists: true,
            authenticated: false,
          });
          setChecking(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [pathname]);

  useEffect(() => {
    if (!authState) return;

    if (!authState.license.exists) {
      if (pathname !== "/license") router.replace("/license");
      return;
    }
    if (authState.license.status === "tampered" || authState.license.status === "expired") {
      if (pathname !== "/license-expired") router.replace("/license-expired");
      return;
    }
    if (LICENSE_PAGES.includes(pathname)) {
      router.replace("/");
      return;
    }

    if (!authState.businessSetup) {
      if (pathname !== "/business-info") router.replace("/business-info");
      return;
    }
    if (!authState.adminExists) {
      if (pathname !== "/signup" && pathname !== "/login") router.replace("/login");
      return;
    }
    if (!authState.authenticated) {
      if (!AUTH_PAGES.includes(pathname)) router.replace("/login");
      return;
    }
    if (AUTH_PAGES.includes(pathname)) router.replace("/");
  }, [authState, pathname, router]);

  if (checking && !hasCheckedOnce.current) {
    return <div className="authLoading">Loading...</div>;
  }
  if (!authState) return null;

  if (AUTH_PAGES.includes(pathname) || LICENSE_PAGES.includes(pathname)) return children;
  return <AppShell>{children}</AppShell>;
}