/**
 * Prompt Injection Defense & Input Sanitization
 *
 * Enforces security guardrails for life sciences CRM AI agents.
 * Guards against prompt injection, instruction hijacking, system prompt exfiltration,
 * and malicious circumvention of compliance/pharmacovigilance protocols.
 */

export interface SecurityCheckResult {
  isSafe: boolean;
  sanitized: string;
  reason?: string;
  violationType?: "INSTRUCTION_HIJACKING" | "COMPLIANCE_BYPASS" | "SYSTEM_EXFILTRATION" | "JAILBREAK";
}

const COMPLIANCE_CIRCUMVENTION_PATTERNS = [
  /(skip|bypass|disable|override|ignore|disregard|suppress)\s+.*?(compliance|safety|adverse\s+event|pharmacovigilance|audit|check)/i,
  /approve\s+.*?(without\s+review|without\s+compliance|without\s+validation|without\s+checks)/i,
  /clear\s+all\s+(compliance\s+flags|safety\s+flags|warnings)/i,
  /mark\s+as\s+compliant\s+regardless/i,
  /suppress\s+(adverse\s+event|side\s+effect)\s+(reporting|intake|notification)/i,
];

const SYSTEM_EXFILTRATION_PATTERNS = [
  /(print|output|display|show|reveal|repeat|tell\s+me)\s+(the\s+|your\s+)?(system\s+prompt|initial\s+prompt|hidden\s+instructions|core\s+prompt|rules|instructions)/i,
  /what\s+(is|are)\s+your\s+(exact\s+)?(system\s+prompt|initial\s+instructions|hidden\s+instructions|instructions|prompt)/i,
];

const INSTRUCTION_OVERRIDE_PATTERNS = [
  /ignore\s+(?:all|any|previous|prior|system|\s)*(instructions|prompts|rules|commands|constraints|directives)/i,
  /disregard\s+(?:all|any|previous|prior|system|\s)*(instructions|prompts|rules|commands|constraints|guidelines|directives)/i,
  /forget\s+(?:all|everything|previous\s+instructions|your\s+instructions|your\s+role|who\s+you\s+are)/i,
  /reset\s+(all\s+)?(instructions|system\s+prompt|context)/i,
  /you\s+are\s+now\s+(a\s+|an\s+|in\s+|acting\s+as\s+|unrestricted\b|dan\b|developer\s+mode\b)/i,
  /\bdan\s+mode\b/i,
  /system\s+override[:\s]/i,
  /admin\s+override[:\s]/i,
  /new\s+operating\s+mode[:\s]/i,
  /\bjailbreak\b/i,
];

/**
 * Validates user input against adversarial prompt injection attempts
 * and sanitizes harmful character sequences.
 */
export function validateAndSanitizePrompt(input: string): SecurityCheckResult {
  if (!input || typeof input !== "string") {
    return { isSafe: true, sanitized: "" };
  }

  const trimmed = input.trim();

  // 1. Check for compliance bypass attempts
  for (const pattern of COMPLIANCE_CIRCUMVENTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isSafe: false,
        sanitized: trimmed,
        reason: "Security guardrail violation: prompt attempts to bypass required regulatory compliance or safety guardrails.",
        violationType: "COMPLIANCE_BYPASS",
      };
    }
  }

  // 2. Check for system prompt exfiltration
  for (const pattern of SYSTEM_EXFILTRATION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isSafe: false,
        sanitized: trimmed,
        reason: "Security guardrail violation: prompt requests internal system instructions or security configurations.",
        violationType: "SYSTEM_EXFILTRATION",
      };
    }
  }

  // 3. Check for instruction override / jailbreaks
  for (const pattern of INSTRUCTION_OVERRIDE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isSafe: false,
        sanitized: trimmed,
        reason: "Security guardrail violation: prompt contains instructions that attempt to override AI system safety controls.",
        violationType: "INSTRUCTION_HIJACKING",
      };
    }
  }

  // Strip dangerous HTML script tags / event handlers
  const sanitized = trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");

  return {
    isSafe: true,
    sanitized,
  };
}
