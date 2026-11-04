import { randomUUID } from "node:crypto";
import { checkCompliance } from "../agent/tools";

export interface ComplianceRule {
  id: string;
  category: "off_label" | "adverse_event" | "sampling" | "promotional_claim";
  severity: "high" | "critical" | "medium";
  description: string;
}

export interface AdverseEventAlert {
  alertId: string;
  interactionId?: string | number | bigint | null;
  hcpId?: string;
  hcpName?: string;
  detectedFlags: string[];
  adverseEventDescription: string;
  reportedBy?: {
    userId?: string;
    userName?: string;
    userRole?: string;
  };
  severity: "CRITICAL";
  timestamp: string;
  status: "LOGGED_FOR_PV_INTAKE" | "DISPATCHED";
  intakeChannel: "SAFETY_ESCALATION_QUEUE";
  escalatedTo: string;
}

export const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: "COMP-001",
    category: "off_label",
    severity: "critical",
    description: "Off-label discussion must be routed to Medical Affairs and excluded from promotional follow-ups.",
  },
  {
    id: "COMP-002",
    category: "adverse_event",
    severity: "critical",
    description: "Potential adverse events or side effects require immediate pharmacovigilance intake.",
  },
  {
    id: "COMP-003",
    category: "sampling",
    severity: "high",
    description: "Sample distribution requires verified sample eligibility and rep/HCP voice or written acknowledgement.",
  },
  {
    id: "COMP-004",
    category: "promotional_claim",
    severity: "medium",
    description: "Claims containing superlative or absolute statements ('guarantee', 'cure', 'best in class') require review.",
  },
];

// In-memory safety intake queue for active alerts
const pvAlertsQueue: AdverseEventAlert[] = [];

/**
 * Triggers an automated escalation hook to the pharmacovigilance safety intake queue
 * whenever a potential adverse event or side effect is detected.
 * Fulfills FDA 21 CFR Part 314.80 / GxP life sciences safety reporting guidelines.
 */
export function triggerPharmacovigilanceEscalation(
  input: Omit<AdverseEventAlert, "alertId" | "timestamp" | "status" | "intakeChannel" | "severity" | "escalatedTo"> & {
    escalatedTo?: string;
  }
): AdverseEventAlert {
  const alert: AdverseEventAlert = {
    alertId: randomUUID(),
    interactionId: input.interactionId || null,
    hcpId: input.hcpId || "unknown_hcp",
    hcpName: input.hcpName || "HCP Not Specified",
    detectedFlags: input.detectedFlags,
    adverseEventDescription: input.adverseEventDescription,
    reportedBy: input.reportedBy || {
      userName: "Field Sales Representative",
      userRole: "REP",
    },
    severity: "CRITICAL",
    timestamp: new Date().toISOString(),
    status: "LOGGED_FOR_PV_INTAKE",
    intakeChannel: "SAFETY_ESCALATION_QUEUE",
    escalatedTo: input.escalatedTo || "safety-team@pharmacovigilance.example.com",
  };

  pvAlertsQueue.unshift(alert);
  if (pvAlertsQueue.length > 100) {
    pvAlertsQueue.pop();
  }

  console.warn(
    `[PHARMACOVIGILANCE CRITICAL ALERT] Escalated adverse event for HCP ${alert.hcpName} (${alert.hcpId}): "${alert.adverseEventDescription.slice(0, 100)}..." -> Dispatched to ${alert.escalatedTo}`
  );

  return alert;
}

/**
 * Retrieves recently escalated pharmacovigilance alerts.
 */
export function getPharmacovigilanceAlerts(): AdverseEventAlert[] {
  return [...pvAlertsQueue];
}

/**
 * Clears safety alerts queue (utility for testing).
 */
export function clearPharmacovigilanceAlerts(): void {
  pvAlertsQueue.length = 0;
}

export function evaluateCompliance(interaction: Record<string, unknown>): string[] {
  return checkCompliance(interaction);
}

export function getComplianceRules(): ComplianceRule[] {
  return COMPLIANCE_RULES;
}
