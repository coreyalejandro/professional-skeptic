// lib/ingestion/validate.ts
// Input validation for audit requests.

import type { AuditRequest, InputType } from "@/types";

export interface ValidationResult {
  valid: boolean;
  input_type: InputType;
  error?: string;
}

const GITHUB_URL_PATTERN = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;

export function validateAuditRequest(raw: {
  github_url?: string;
  pasted_text?: string;
}): ValidationResult {
  const { github_url, pasted_text } = raw;

  if (github_url && github_url.trim()) {
    const url = github_url.trim();
    if (!GITHUB_URL_PATTERN.test(url)) {
      return {
        valid: false,
        input_type: "unknown",
        error: `Malformed GitHub URL. Expected format: https://github.com/owner/repo — got: ${url}`,
      };
    }
    return { valid: true, input_type: "github_url" };
  }

  if (pasted_text && pasted_text.trim().length > 0) {
    if (pasted_text.trim().length < 20) {
      return {
        valid: false,
        input_type: "unknown",
        error: "Pasted text is too short to audit (minimum 20 characters).",
      };
    }
    return { valid: true, input_type: "pasted_text" };
  }

  return {
    valid: false,
    input_type: "unknown",
    error: "No input provided. Provide a GitHub repository URL or paste text to audit.",
  };
}

export function buildAuditRequest(raw: {
  github_url?: string;
  pasted_text?: string;
}): AuditRequest | null {
  const v = validateAuditRequest(raw);
  if (!v.valid) return null;
  if (v.input_type === "github_url") {
    return { input_type: "github_url", github_url: raw.github_url!.trim() };
  }
  return { input_type: "pasted_text", pasted_text: raw.pasted_text!.trim() };
}
