"use client";

import React, { useEffect, useState } from "react";
import { Shield, Clock, User, X, ArrowRight, RefreshCw, FileText } from "lucide-react";

interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userName: string;
  userRole: string;
  changes: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  ipAddress: string | null;
  createdAt: string;
}

interface AuditHistoryModalProps {
  entityType?: string;
  entityId?: string | number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditHistoryModal({
  entityType = "Interaction",
  entityId,
  isOpen,
  onClose,
}: AuditHistoryModalProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      let url = `/api/audit-logs?entity_type=${encodeURIComponent(entityType)}`;
      if (entityId) {
        url += `&entity_id=${encodeURIComponent(String(entityId))}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load audit history (${res.status})`);
      }
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve audit trail");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, entityId, entityType]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#ecfdf5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
                Regulatory Audit Trail (FDA 21 CFR Part 11)
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>
                {entityId
                  ? `Immutable audit record for ${entityType} #${entityId}`
                  : `Recent ${entityType} audit trail entries`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "4px",
              borderRadius: "6px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: "8px", color: "#64748b" }}>
              <RefreshCw size={18} className="animate-spin" />
              <span>Verifying and fetching cryptographic audit log...</span>
            </div>
          )}

          {error && (
            <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "12px 16px", borderRadius: "8px", fontSize: "14px", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {!loading && !error && logs.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
              <FileText size={36} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No audit records found for this entry yet.</p>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                New modifications and logs will automatically be tracked here.
              </p>
            </div>
          )}

          {!loading && logs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {logs.map((log) => {
                const changes = log.changes || {};
                const beforeKeys = Object.keys(changes.before || {});
                const afterKeys = Object.keys(changes.after || {});
                const allChangedKeys = Array.from(new Set([...beforeKeys, ...afterKeys]));

                return (
                  <div
                    key={log.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "16px",
                      background: "#ffffff",
                    }}
                  >
                    {/* Log entry meta */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            background: log.action === "CREATE" ? "#ecfdf5" : log.action === "UPDATE" ? "#eff6ff" : "#fef3c7",
                            color: log.action === "CREATE" ? "#065f46" : log.action === "UPDATE" ? "#1e40af" : "#92400e",
                          }}
                        >
                          {log.action}
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: "4px" }}>
                          <User size={13} color="#64748b" />
                          {log.userName} ({log.userRole})
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={13} />
                        {new Date(log.createdAt).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </div>

                    {/* Diffs */}
                    {log.action === "UPDATE" && allChangedKeys.length > 0 && (
                      <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 12px", fontSize: "12px" }}>
                        <div style={{ fontWeight: 600, color: "#475569", marginBottom: "6px" }}>Modified Fields:</div>
                        {allChangedKeys.map((field) => {
                          const valBefore = changes.before?.[field];
                          const valAfter = changes.after?.[field];

                          return (
                            <div
                              key={field}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "140px 1fr auto 1fr",
                                gap: "8px",
                                alignItems: "center",
                                padding: "4px 0",
                                borderBottom: "1px dashed #e2e8f0",
                              }}
                            >
                              <span style={{ fontWeight: 600, color: "#64748b" }}>{field}:</span>
                              <span style={{ color: "#b91c1c", background: "#fee2e2", padding: "2px 6px", borderRadius: "4px", wordBreak: "break-all" }}>
                                {typeof valBefore === "object" ? JSON.stringify(valBefore) : String(valBefore ?? "null")}
                              </span>
                              <ArrowRight size={12} color="#94a3b8" />
                              <span style={{ color: "#15803d", background: "#dcfce7", padding: "2px 6px", borderRadius: "4px", wordBreak: "break-all" }}>
                                {typeof valAfter === "object" ? JSON.stringify(valAfter) : String(valAfter ?? "null")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {log.action === "CREATE" && changes.after && (
                      <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "10px 12px", fontSize: "12px", color: "#475569" }}>
                        <span style={{ fontWeight: 600 }}>Initial Creation: </span>
                        {changes.after.hcp_name || changes.after.hcpName} &bull; {changes.after.interaction_type || changes.after.interactionType} &bull; {changes.after.sentiment}
                      </div>
                    )}

                    <div style={{ marginTop: "8px", fontSize: "11px", color: "#94a3b8", display: "flex", justifyContent: "space-between" }}>
                      <span>Log UUID: {log.id}</span>
                      {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            background: "#f8fafc",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#0f172a",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
}

