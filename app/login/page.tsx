"use client";

import React, { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("rep@crm.example.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Invalid email or password");
      }

      // Successful login
      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="health-panel"
      style={{
        maxWidth: "420px",
        textAlign: "left",
        boxShadow: "0 20px 45px rgba(27, 39, 68, 0.12)",
        padding: "32px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div
          className="health-mark"
          style={{
            margin: "0 auto 12px",
            background: "#eff6ff",
            borderColor: "#bfdbfe",
            color: "#2563eb",
          }}
        >
          <ShieldCheck size={28} />
        </div>
        <p className="eyebrow" style={{ textAlign: "center", marginBottom: "4px" }}>
          Life Sciences CRM
        </p>
        <h1 style={{ fontSize: "24px", fontWeight: 800 }}>Authorized Sign In</h1>
        <p className="health-copy" style={{ margin: "6px 0 0", fontSize: "13px" }}>
          Enter your credentials to access the HCP interaction portal.
        </p>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            padding: "10px 12px",
            marginBottom: "16px",
            color: "#b91c1c",
            fontSize: "13px",
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 700, color: "#344054" }}>
            Work Email
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rep@crm.example.com"
              required
              style={{ paddingLeft: "36px" }}
            />
            <Mail
              size={16}
              color="#64748b"
              style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)" }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "22px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 700, color: "#344054" }}>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ paddingLeft: "36px" }}
            />
            <Lock
              size={16}
              color="#64748b"
              style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)" }}
            />
          </div>
        </div>

        <button
          className="primary-button"
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: "11px", fontSize: "14px" }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="health-spinner" /> Signing in...
            </>
          ) : (
            <>
              Sign In to CRM <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px solid #e2e8f0", textAlign: "center", fontSize: "13px", color: "#64748b" }}>
        Need a field account?{" "}
        <Link href="/register" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>
          Register new user
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="health-screen" style={{ minHeight: "100vh", background: "#eef2f7" }}>
      <Suspense fallback={<div className="health-spinner" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
