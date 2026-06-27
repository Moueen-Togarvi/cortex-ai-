// ─── AI Guardrails Library ───
// PII detection, content filtering, output validation, and policy evaluation

import { db } from "./db";

// ── PII Detection Patterns ──────────────────────────────────────

export interface PIIEntity {
  type: "email" | "phone" | "ssn" | "credit_card" | "ip_address" | "date_of_birth" | "address" | "passport" | "custom";
  value: string;
  start: number;
  end: number;
  severity: "low" | "medium" | "high" | "critical";
  label: string;
}

const PII_PATTERNS: Array<{
  type: PIIEntity["type"];
  pattern: RegExp;
  label: string;
  severity: PIIEntity["severity"];
}> = [
  {
    type: "email",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    label: "Email Address",
    severity: "medium",
  },
  {
    type: "phone",
    pattern: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    label: "Phone Number",
    severity: "medium",
  },
  {
    type: "ssn",
    pattern: /\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b/g,
    label: "Social Security Number",
    severity: "critical",
  },
  {
    type: "credit_card",
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    label: "Credit Card Number",
    severity: "critical",
  },
  {
    type: "ip_address",
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    label: "IP Address",
    severity: "low",
  },
  {
    type: "date_of_birth",
    pattern: /\b(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(19|20)\d{2}\b/g,
    label: "Date of Birth",
    severity: "high",
  },
];

// ── Content Filter Patterns ─────────────────────────────────────

interface ContentViolation {
  type: string;
  matched: string;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
}

const CONTENT_FILTER_RULES: Array<{
  category: string;
  patterns: RegExp[];
  severity: ContentViolation["severity"];
}> = [
  {
    category: "harmful_content",
    patterns: [
      /\b(how to (make|create|build|cook) (a|an) (bomb|weapon|explosive|drug|meth))\b/gi,
    ],
    severity: "critical",
  },
  {
    category: "self_harm",
    patterns: [
      /\b(how to (kill|harm|end|hurt) (myself|yourself))\b/gi,
    ],
    severity: "critical",
  },
  {
    category: "hate_speech",
    patterns: [
      /\b(all \w+ (are|should be|must be) (inferior|stupid|worthless|evil))\b/gi,
    ],
    severity: "high",
  },
  {
    category: "personal_attacks",
    patterns: [
      /\b(you (are|'re) (an? )?(idiot|stupid|dumb|moron|fool|trash))\b/gi,
    ],
    severity: "medium",
  },
  {
    category: "profanity",
    patterns: [
      /\b(fuck|shit|damn|asshole|bitch)\b/gi,
    ],
    severity: "low",
  },
];

// ── Output Validation Rules ─────────────────────────────────────

interface OutputValidationIssue {
  type: string;
  message: string;
  severity: "low" | "medium" | "high";
}

const OUTPUT_RULES: Array<{
  type: string;
  check: (output: string) => OutputValidationIssue | null;
}> = [
  {
    type: "max_length",
    check: (output) => output.length > 10000
      ? { type: "max_length", message: `Output exceeds maximum length (${output.length}/10000)`, severity: "medium" }
      : null,
  },
  {
    type: "empty_response",
    check: (output) => output.trim().length === 0
      ? { type: "empty_response", message: "Output is empty", severity: "high" }
      : null,
  },
  {
    type: "code_injection",
    check: (output) => {
      const hasExecPatterns = /<script[^>]*>|javascript:|eval\(|document\./gi.test(output);
      return hasExecPatterns
        ? { type: "code_injection", message: "Output contains potential code injection patterns", severity: "critical" }
        : null;
    },
  },
  {
    type: "json_validity",
    check: (output) => {
      const jsonMatch = output.match(/```json\s*\n?([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          JSON.parse(jsonMatch[1]);
        } catch {
          return { type: "json_validity", message: "JSON code block contains invalid JSON", severity: "medium" };
        }
      }
      return null;
    },
  },
  {
    type: "hallucination_check",
    check: (output) => {
      const patterns = ["I'm not sure", "I don't have information", "I cannot verify"];
      const hasUncertainty = patterns.some((p) => output.toLowerCase().includes(p.toLowerCase()));
      if (hasUncertainty && output.length > 2000) {
        return { type: "hallucination_check", message: "Response contains uncertainty markers despite being lengthy — possible hallucination risk", severity: "low" };
      }
      return null;
    },
  },
];

// ── Core Functions ──────────────────────────────────────────────

// Detect PII entities in text
export function detectPII(text: string): PIIEntity[] {
  const entities: PIIEntity[] = [];

  for (const rule of PII_PATTERNS) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      entities.push({
        type: rule.type,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        severity: rule.severity,
        label: rule.label,
      });
    }
  }

  return entities;
}

// Mask PII entities in text
export function maskPII(text: string, maskChar: string = "[REDACTED]"): string {
  let masked = text;
  for (const rule of PII_PATTERNS) {
    masked = masked.replace(rule.pattern, maskChar);
  }
  return masked;
}

// Filter content for policy violations
export function filterContent(text: string): ContentViolation[] {
  const violations: ContentViolation[] = [];

  for (const rule of CONTENT_FILTER_RULES) {
    for (const pattern of rule.patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        violations.push({
          type: rule.category,
          matched: match[0],
          severity: rule.severity,
          category: rule.category,
        });
      }
    }
  }

  return violations;
}

// Validate output against rules
export function validateOutput(output: string): OutputValidationIssue[] {
  const issues: OutputValidationIssue[] = [];
  for (const rule of OUTPUT_RULES) {
    const issue = rule.check(output);
    if (issue) issues.push(issue);
  }
  return issues;
}

// ── Policy Evaluation ───────────────────────────────────────────

export interface GuardrailEvalResult {
  policyId: string;
  policyName: string;
  policyType: string;
  passed: boolean;
  action: string;
  severity: string;
  violations: Array<{
    type: string;
    matched: string;
    severity: string;
  }>;
  maskedText?: string;
  latencyMs: number;
}

// Evaluate a text against all enabled guardrail policies
export async function evaluateGuardrails(
  text: string,
  scope?: string,
): Promise<{ passed: boolean; results: GuardrailEvalResult[]; blocked: boolean }> {
  const startTime = Date.now();
  const policies = await db.guardrailPolicy.findMany({
    where: {
      enabled: true,
      OR: [
        { scope: "all" },
        ...(scope ? [{ scope }] : []),
      ],
    },
  });

  const results: GuardrailEvalResult[] = [];
  let overallPassed = true;
  let blocked = false;

  for (const policy of policies) {
    const policyStart = Date.now();
    const config = JSON.parse(policy.config);
    let passed = true;
    let violations: GuardrailEvalResult["violations"] = [];
    let maskedText: string | undefined;

    switch (policy.type) {
      case "pii_detection": {
        const entities = detectPII(text);
        if (entities.length > 0) {
          passed = false;
          violations = entities.map((e) => ({
            type: e.type,
            matched: e.value,
            severity: e.severity,
          }));
          if (policy.action === "mask") {
            maskedText = maskPII(text, config.maskChar || "[REDACTED]");
          }
          if (policy.action === "block" && policy.severity === "critical") {
            blocked = true;
          }
        }
        break;
      }
      case "content_filter": {
        const contentViolations = filterContent(text);
        if (contentViolations.length > 0) {
          passed = false;
          violations = contentViolations.map((v) => ({
            type: v.type,
            matched: v.matched,
            severity: v.severity,
          }));
          if (policy.action === "block") {
            blocked = true;
          }
        }
        break;
      }
      case "output_validation": {
        const issues = validateOutput(text);
        if (issues.length > 0) {
          passed = false;
          violations = issues.map((i) => ({
            type: i.type,
            matched: i.message,
            severity: i.severity,
          }));
          if (policy.action === "block" && issues.some((i) => i.severity === "critical")) {
            blocked = true;
          }
        }
        break;
      }
    }

    if (!passed) overallPassed = false;

    results.push({
      policyId: policy.id,
      policyName: policy.name,
      policyType: policy.type,
      passed,
      action: policy.action,
      severity: policy.severity,
      violations,
      maskedText,
      latencyMs: Date.now() - policyStart,
    });

    // Record evaluation in database
    try {
      await db.guardrailEval.create({
        data: {
          policyId: policy.id,
          input: text,
          output: JSON.stringify({ passed, violations }),
          passed,
          violations: JSON.stringify(violations),
          maskedOutput: maskedText,
          latencyMs: Date.now() - policyStart,
        },
      });
    } catch (error) {
      console.error("[Guardrail] Failed to record eval:", error);
    }
  }

  return { passed: overallPassed, results, blocked };
}

// Seed default guardrail policies
export async function seedDefaultGuardrailPolicies(): Promise<void> {
  const count = await db.guardrailPolicy.count();
  if (count > 0) return;

  const defaults = [
    {
      name: "PII Detection",
      description: "Detect and optionally mask personally identifiable information (emails, phone numbers, SSNs, credit cards)",
      type: "pii_detection",
      enabled: true,
      scope: "all",
      config: JSON.stringify({ maskChar: "[REDACTED]", detectEmails: true, detectPhones: true, detectSSN: true, detectCreditCards: true }),
      severity: "high",
      action: "flag",
    },
    {
      name: "Content Safety Filter",
      description: "Filter harmful, hateful, or inappropriate content from inputs and outputs",
      type: "content_filter",
      enabled: true,
      scope: "all",
      config: JSON.stringify({ filterHarmful: true, filterHateSpeech: true, filterProfanity: true, filterSelfHarm: true }),
      severity: "high",
      action: "block",
    },
    {
      name: "Output Quality Validator",
      description: "Validate LLM outputs for quality, format, and safety issues",
      type: "output_validation",
      enabled: true,
      scope: "all",
      config: JSON.stringify({ maxLength: 10000, checkCodeInjection: true, checkJSONValidity: true, checkHallucination: true }),
      severity: "medium",
      action: "flag",
    },
    {
      name: "Strict PII Masking for Agents",
      description: "Automatically mask all PII in agent interactions",
      type: "pii_detection",
      enabled: true,
      scope: "agent",
      config: JSON.stringify({ maskChar: "***", detectEmails: true, detectPhones: true, detectSSN: true, detectCreditCards: true, detectIPs: false, detectDOB: false }),
      severity: "critical",
      action: "mask",
    },
  ];

  for (const policy of defaults) {
    await db.guardrailPolicy.create({ data: policy });
  }
}