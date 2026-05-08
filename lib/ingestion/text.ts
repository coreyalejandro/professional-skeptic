// lib/ingestion/text.ts
// Ingest pasted text (research claim, README, build plan, proposal excerpt).
// TRUTH LABEL: coverage is "live" for pasted text — exactly what was provided.

import type { IngestionStatus, InputType } from "@/types";

export interface TextIngestionResult {
  content: string;
  word_count: number;
  char_count: number;
  status: IngestionStatus;
  error?: string;
}

export function detectInputType(text: string): InputType {
  const lower = text.toLowerCase();
  if (lower.includes("## architecture") || lower.includes("## tech stack") || lower.includes("## features")) {
    return "readme";
  }
  if (lower.includes("build plan") || lower.includes("sprint") || lower.includes("milestone") || lower.includes("op-")) {
    return "build_plan";
  }
  if (lower.includes("abstract") || lower.includes("methodology") || lower.includes("hypothesis") || lower.includes("literature")) {
    return "research_claim";
  }
  if (lower.includes("proposed") || lower.includes("proposal") || lower.includes("budget") || lower.includes("deliverable")) {
    return "proposal_excerpt";
  }
  return "pasted_text";
}

export function ingestText(raw: string): TextIngestionResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      content: "",
      word_count: 0,
      char_count: 0,
      error: "Empty input",
      status: {
        input_type: "pasted_text",
        coverage: "failed",
        files_fetched: [],
        known_unknowns: ["No content provided"],
        notes: "Input was empty or whitespace-only",
      },
    };
  }
  const input_type = detectInputType(trimmed);
  const word_count = trimmed.split(/\s+/).filter(Boolean).length;
  return {
    content: trimmed,
    word_count,
    char_count: trimmed.length,
    status: {
      input_type,
      coverage: "live",
      files_fetched: ["pasted_text"],
      known_unknowns: [
        "Only the pasted excerpt is available — no linked files, repositories, or external references were fetched",
        "Claims referencing external sources cannot be verified from this text alone",
      ],
      notes: `Pasted text ingested successfully (${word_count} words). Detected input type: ${input_type}.`,
    },
  };
}
