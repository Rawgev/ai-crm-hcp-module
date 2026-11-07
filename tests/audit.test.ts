import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { computeDiff, recordAuditLog, listAuditLogs } from "@/server/services/audit.service";
import { createInteraction, updateInteraction, getInteractionById } from "@/server/services/interaction.service";
import { interactionCreateSchema } from "@/server/validation/interaction.schema";
import { createFallbackAuditLog } from "@/server/services/fallback-db";

describe("Phase 2: Database Hardening & Regulatory Audit Trail (FDA 21 CFR Part 11)", () => {
  describe("computeDiff helper", () => {
    it("identifies changed fields between before and after records", () => {
      const before = {
        hcp_name: "Dr. Priya Menon",
        sentiment: "Neutral",
        topics_discussed: "Discussed clinical efficacy",
        createdAt: new Date().toISOString(),
      };
      const after = {
        hcp_name: "Dr. Priya Menon",
        sentiment: "Positive",
        topics_discussed: "Discussed clinical efficacy and new trial data",
        updatedAt: new Date().toISOString(),
      };

      const diff = computeDiff(before, after);

      expect(diff.before).toEqual({
        sentiment: "Neutral",
        topics_discussed: "Discussed clinical efficacy",
      });
      expect(diff.after).toEqual({
        sentiment: "Positive",
        topics_discussed: "Discussed clinical efficacy and new trial data",
      });
      // Volatile timestamps should be ignored
      expect(diff.before).not.toHaveProperty("createdAt");
      expect(diff.after).not.toHaveProperty("updatedAt");
    });

    it("returns empty before and after objects when records are identical", () => {
      const state = {
        hcp_id: "hcp_1001",
        hcp_name: "Dr. Priya Menon",
        sentiment: "Positive",
      };

      const diff = computeDiff(state, { ...state });
      expect(Object.keys(diff.before)).toHaveLength(0);
      expect(Object.keys(diff.after)).toHaveLength(0);
    });

    it("handles null or undefined states gracefully", () => {
      const diff1 = computeDiff(null, { sentiment: "Positive" });
      expect(diff1.after).toEqual({ sentiment: "Positive" });

      const diff2 = computeDiff({ sentiment: "Negative" }, undefined);
      expect(diff2.before).toEqual({ sentiment: "Negative" });
    });
  });

  describe("Audit Service Recording & Retrieval", () => {
    it("records a CREATE audit log with user identity and changes", async () => {
      const log = await recordAuditLog({
        entityType: "Interaction",
        entityId: "test_int_9001",
        action: "CREATE",
        userId: "user_test_rep",
        userName: "Alex Vance",
        userRole: "REP",
        changes: {
          after: {
            hcp_name: "Dr. Priya Menon",
            interaction_type: "Meeting",
            sentiment: "Positive",
          },
        },
        ipAddress: "192.168.1.100",
      });

      expect(log).toBeDefined();
      expect(log.id).toBeDefined();
      expect(log.entityType).toBe("Interaction");
      expect(log.entityId).toBe("test_int_9001");
      expect(log.action).toBe("CREATE");
      expect(log.userName).toBe("Alex Vance");
      expect(log.userRole).toBe("REP");
      expect(log.ipAddress).toBe("192.168.1.100");
      expect(log.createdAt).toBeDefined();
    });

    it("records an UPDATE audit log with diff payload", async () => {
      const log = await recordAuditLog({
        entityType: "Interaction",
        entityId: "test_int_9001",
        action: "UPDATE",
        userId: "user_test_mgr",
        userName: "Sarah Connor",
        userRole: "MANAGER",
        changes: {
          before: { sentiment: "Neutral" },
          after: { sentiment: "Positive" },
        },
      });

      expect(log.action).toBe("UPDATE");
      expect(log.userRole).toBe("MANAGER");
      expect(log.changes.before).toEqual({ sentiment: "Neutral" });
      expect(log.changes.after).toEqual({ sentiment: "Positive" });
    });

    it("lists audit logs filtered by entityId and entityType in reverse chronological order", async () => {
      const entityId = `test_entity_${Date.now()}`;

      await recordAuditLog({
        entityType: "Interaction",
        entityId,
        action: "CREATE",
        userId: "user_rep_1",
        userName: "Rep One",
        userRole: "REP",
        changes: { after: { step: 1 } },
      });

      await recordAuditLog({
        entityType: "Interaction",
        entityId,
        action: "UPDATE",
        userId: "user_rep_1",
        userName: "Rep One",
        userRole: "REP",
        changes: { before: { step: 1 }, after: { step: 2 } },
      });

      const logs = await listAuditLogs({
        entityType: "Interaction",
        entityId,
      });

      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs[0].action).toBe("UPDATE");
      expect(logs[1].action).toBe("CREATE");
      expect(logs[0].entityId).toBe(entityId);
    });
  });

  describe("Interaction Lifecycle Audit Integration", () => {
    it("automatically writes an immutable audit record when an interaction is created", async () => {
      const payload = interactionCreateSchema.parse({
        hcp_id: "hcp_1001",
        hcp_name: "Dr. Priya Menon",
        interaction_type: "Meeting",
        interaction_date: "2026-11-04",
        interaction_time: "14:30",
        topics_discussed: "Adherence rates and tolerability profiles.",
        sentiment: "Positive",
      });

      const created = await createInteraction(
        payload,
        {
          userId: "user_rep_audit",
          userName: "Test Rep",
          userRole: "REP",
          ipAddress: "10.0.0.42",
        }
      );

      expect(created.id).toBeDefined();

      const auditTrail = await listAuditLogs({
        entityType: "Interaction",
        entityId: String(created.id),
      });

      expect(auditTrail.length).toBeGreaterThanOrEqual(1);
      const createEntry = auditTrail.find((l) => l.action === "CREATE");
      expect(createEntry).toBeDefined();
      expect(createEntry?.userName).toBe("Test Rep");
      expect(createEntry?.userRole).toBe("REP");
      expect(createEntry?.ipAddress).toBe("10.0.0.42");
    });

    it("automatically captures field diff when an interaction is updated", async () => {
      const payload = interactionCreateSchema.parse({
        hcp_id: "hcp_1002",
        hcp_name: "Dr. Arjun Shah",
        interaction_type: "Call",
        interaction_date: "2026-11-04",
        interaction_time: "11:00",
        topics_discussed: "Initial outreach.",
        sentiment: "Neutral",
      });

      const created = await createInteraction(
        payload,
        {
          userId: "user_rep_audit",
          userName: "Test Rep",
          userRole: "REP",
        }
      );

      const updated = await updateInteraction(
        created.id,
        {
          sentiment: "Positive",
          outcomes: "Agreed to review Phase III publication next Monday",
        },
        {
          userId: "user_mgr_audit",
          userName: "Compliance Officer",
          userRole: "COMPLIANCE_OFFICER",
          ipAddress: "10.0.0.99",
        }
      );

      expect(updated.sentiment).toBe("Positive");
      expect(updated.outcomes).toBe("Agreed to review Phase III publication next Monday");

      const auditTrail = await listAuditLogs({
        entityType: "Interaction",
        entityId: String(created.id),
      });

      const updateEntry = auditTrail.find((l) => l.action === "UPDATE");
      expect(updateEntry).toBeDefined();
      expect(updateEntry?.userRole).toBe("COMPLIANCE_OFFICER");
      expect(updateEntry?.changes.before.sentiment).toBe("Neutral");
      expect(updateEntry?.changes.after.sentiment).toBe("Positive");
      expect(updateEntry?.changes.after.outcomes).toBe("Agreed to review Phase III publication next Monday");
    });
  });

  describe("Production Strict Mode (Fail-Fast)", () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      (process.env as any).NODE_ENV = originalEnv;
    });

    it("throws descriptive fatal error in production if PostgreSQL is unreachable", () => {
      (process.env as any).NODE_ENV = "production";

      // When in production, fallback SQLite is disabled to prevent split-brain data
      expect(() => {
        createFallbackAuditLog({
          entityType: "Interaction",
          entityId: "prod_fail_test",
          action: "CREATE",
          userId: "u1",
          userName: "Prod Rep",
          userRole: "REP",
          changes: {},
        });
      }).toThrow(/Production database connection failure/);
    });
  });
});
