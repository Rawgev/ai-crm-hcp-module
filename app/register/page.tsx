"use client";

import React, { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, MapPin, Briefcase, Loader2, ArrowRight, UserPlus, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [territory, setTerritory] = useState("South Zone");
  const [role, setRole] = useState("REP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          territory: territory.trim(),
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // Successful registration sets session cookie automatically
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="health-screen" style={{ minHeight: "100vh", background: "#eef2f7", padding: "32px 16px" }}>
      <div
        className="health-panel"
        style={{
          maxWidth: "460px",
          textAlign: "left",
          boxShadow: "0 20px 45px rgba(27, 39, 68, 0.12)",
          padding: "32px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            className="health-mark"
            style={{
              margin: "0 auto 12px",
              background: "#ecfdf3",
              borderColor: "#a7f3d0",
              color: "#138a62",
            }}
          >
            <UserPlus size={28} />
          </div>
          <p className="eyebrow" style={{ textAlign: "center", marginBottom: "4px" }}>
            Pharmaxora Life Sciences
          </p>
          <h1 style={{ fontSize: "24px", fontWeight: 800 }}>Create User Account</h1>
          <p className="health-copy" style={{ margin: "6px 0 0", fontSize: "13px" }}>
            Register to capture and audit compliant HCP interaction logs.
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
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 700, color: "#344054" }}>
              Full Name *
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Vance"
                required
                style={{ paddingLeft: "36px" }}
              />
              <User
                size={16}
                color="#64748b"
                style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 700, color: "#344054" }}>
              Work Email *
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex.vance@pharma.example.com"
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

          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 700, color: "#344054" }}>
              Password * (min. 6 characters)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{ paddingLeft: "36px" }}
              />
              <Lock
                size={16}
                color="#64748b"
                style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 700, color: "#344054" }}>
                Role
              </label>
              <div style={{ position: "relative" }}>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ paddingLeft: "36px" }}
                >
                  <option value="REP">Field Rep</option>
                  <option value="MANAGER">District Manager</option>
                  <option value="COMPLIANCE_OFFICER">Compliance Officer</option>
                </select>
                <Briefcase
                  size={16}
                  color="#64748b"
                  style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 700, color: "#344054" }}>
                Territory
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={territory}
                  onChange={(e) => setTerritory(e.target.value)}
                  placeholder="South Zone"
                  style={{ paddingLeft: "36px" }}
                />
                <MapPin
                  size={16}
                  color="#64748b"
                  style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)" }}
                />
              </div>
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
                <Loader2 size={16} className="health-spinner" /> Creating account...
              </>
            ) : (
              <>
                Complete Registration <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", textAlign: "center", fontSize: "13px", color: "#64748b" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

