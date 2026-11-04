"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, CalendarClock, ClipboardCheck, LogOut, User, Shield } from "lucide-react";

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  territory?: string;
}

export function Header() {
  const router = useRouter();
  const [serverStatus, setServerStatus] = useState<"connecting" | "online">("online");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Check health
    const checkHealth = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok && isMounted) {
          setServerStatus("online");
        }
      } catch {
        if (isMounted) setServerStatus("connecting");
      }
    };

    // 2. Load current authenticated user profile
    const loadUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch (err) {
        console.warn("Could not load user profile:", err);
      }
    };

    checkHealth();
    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Pharmaxora AI</p>
        <h1>HCP Interaction Hub</h1>
      </div>
      <div className="topbar-metrics" aria-label="interaction context">
        {currentUser && (
          <span style={{ background: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" }}>
            <User size={15} color="#166534" />
            <strong>{currentUser.name}</strong>
            <span
              style={{
                fontSize: "11px",
                background: "#dcfce7",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: 800,
                color: "#15803d",
              }}
            >
              {currentUser.role}
            </span>
            {currentUser.territory && (
              <span style={{ fontSize: "11px", color: "#657084" }}>({currentUser.territory})</span>
            )}
          </span>
        )}

        <span>
          <Activity size={16} style={{ color: serverStatus === "online" ? "#138a62" : "#d97706" }} />
          {serverStatus === "online" ? "Field ready" : "Connecting..."}
        </span>
        <span>
          <CalendarClock size={16} /> Today
        </span>
        <span>
          <ClipboardCheck size={16} /> Compliance aware
        </span>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sign out of CRM session"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            border: "1px solid #e2e8f0",
            borderRadius: "999px",
            background: "#fff",
            color: "#64748b",
            fontSize: "13px",
            fontWeight: 700,
            padding: "8px 12px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#dc2626";
            e.currentTarget.style.borderColor = "#fecaca";
            e.currentTarget.style.background = "#fef2f2";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#64748b";
            e.currentTarget.style.borderColor = "#e2e8f0";
            e.currentTarget.style.background = "#fff";
          }}
        >
          <LogOut size={14} />
          {loggingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </header>
  );
}
