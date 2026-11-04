import { checkCompliance } from "../agent/tools";

export interface ComplianceRule {
  id: string;
  category: "off_label" | "adverse_event" | "sampling" | "promotional_claim";
  severity: "high" | "critical" | "medium";
  description: string;
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

export function evaluateCompliance(interaction: Record<string, unknown>): string[] {
  return checkCompliance(interaction);
}

export function getComplianceRules(): ComplianceRule[] {
  return COMPLIANCE_RULES;
}

