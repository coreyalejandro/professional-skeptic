// lib/skeptic/engine.ts
// Professional Skeptic finding engine.
// Calls Gemini API to generate structured findings.
// Per INVARIANT_SKEPTIC_001: failure detection, not agreeable summarization.
// Per INVARIANT_EVIDENCE_001: every finding requires evidence reference or missing-evidence label.
// Per INVARIANT_FALSIFICATION_001: every finding requires a falsification test.

import type {
  Finding,
  FindingCategory,
  Severity,
  AuditReport,
  IngestionStatus,
  Scores,
  FunctionalStatus,
} from "@/types";
import type { GitHubRepoMeta, FetchedFile } from "@/lib/ingestion/github";
import { generateMarkdownExport } from "@/lib/export/markdown";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface GeminiFinding {
  id: string;
  title: string;
  category: FindingCategory;
  severity: Severity;
  confidence: number;
  evidence_source: string;
  evidence_excerpt: string;
  evidence_truth_category: string;
  falsification_test: string;
  recommended_repair: string;
  detail: string;
}

interface GeminiScores {
  build_readiness: number;
  evidence_quality: number;
  implementation_feasibility: number;
  governance_risk: number;
  rationale: string;
  limitations: string;
}

interface GeminiResponse {
  executive_summary: string;
  what_exists: string[];
  what_is_missing: string[];
  findings: GeminiFinding[];
  scores: GeminiScores;
  known_unknowns: string[];
}

function buildPrompt(
  ingestionStatus: IngestionStatus,
  content: string
): string {
  return `You are a Professional Skeptic agent. Your function is evidence-grounded failure detection — NOT agreeable summarization.

INGESTION COVERAGE: ${ingestionStatus.coverage.toUpperCase()}
FILES FETCHED: ${ingestionStatus.files_fetched.join(", ") || "none"}
KNOWN UNKNOWNS: ${ingestionStatus.known_unknowns.join("; ")}
INGESTION NOTES: ${ingestionStatus.notes}

CONTENT TO AUDIT:
---
${content.slice(0, 12000)}
---

You MUST identify:
1. Unsupported claims (assertions without cited evidence, benchmarks without methodology, performance claims without baselines)
2. Missing dependencies (undeclared deps, missing env vars, missing auth, missing infra)
3. Missing tests (no unit/integration/e2e evidence, no CI/CD, no evaluation plan)
4. Build-readiness failures (cannot be deployed or run as described)
5. Evaluation gaps (no metrics, no baselines, no success criteria, no failure modes documented)
6. Safety and governance risks (data privacy, model safety, access control, audit trail gaps)
7. Technical debt risks (architectural shortcuts, undocumented hacks, coupling risks)
8. Unresolved required inputs (mandatory fields that say "TBD", "TBD", "N/A", or are missing)
9. Scope risks (claims that exceed what is actually present or implemented)

RULES:
- Do NOT produce generic summaries or praise
- Every finding MUST have evidence_source pointing to exact text, section, or "MISSING — not present in provided content"
- Every finding MUST have a falsification_test: a concrete action that could confirm or refute the finding
- confidence: 0.0–1.0 (be honest — lower confidence for inferences, higher for direct evidence)
- severity: critical | high | medium | low | info
- evidence_truth_category: verified_fact | inferred_risk | unsupported_claim | missing_evidence | unresolved_required_input
- Scores 0–100. governance_risk: higher = more risk (not lower). Scores MUST degrade when evidence is missing.
- NEVER present scores as formal certification

Respond with a single JSON object matching this schema exactly:
{
  "executive_summary": "string — concise, honest, evidence-grounded",
  "what_exists": ["string array — only verifiable facts from the content"],
  "what_is_missing": ["string array — specific gaps with evidence references"],
  "findings": [
    {
      "id": "F-001",
      "title": "string",
      "category": "unsupported_claim|missing_dependency|missing_tests|build_readiness|evaluation_gap|safety_governance|technical_debt|unresolved_input|scope_risk|evidence_gap",
      "severity": "critical|high|medium|low|info",
      "confidence": 0.0,
      "evidence_source": "string — exact location or MISSING",
      "evidence_excerpt": "string — quoted text or empty",
      "evidence_truth_category": "verified_fact|inferred_risk|unsupported_claim|missing_evidence|unresolved_required_input",
      "falsification_test": "string — concrete action to confirm or refute",
      "recommended_repair": "string — specific, actionable",
      "detail": "string — full explanation"
    }
  ],
  "scores": {
    "build_readiness": 0,
    "evidence_quality": 0,
    "implementation_feasibility": 0,
    "governance_risk": 0,
    "rationale": "string",
    "limitations": "string — what evidence was missing that would change the scores"
  },
  "known_unknowns": ["string array — what could not be evaluated from available content"]
}`;
}

function parseFindingCategory(raw: string): FindingCategory {
  const valid: FindingCategory[] = [
    "unsupported_claim", "missing_dependency", "missing_tests",
    "build_readiness", "evaluation_gap", "safety_governance",
    "technical_debt", "unresolved_input", "scope_risk", "evidence_gap",
  ];
  return valid.includes(raw as FindingCategory)
    ? (raw as FindingCategory)
    : "evidence_gap";
}

function parseSeverity(raw: string): Severity {
  const valid: Severity[] = ["critical", "high", "medium", "low", "info"];
  return valid.includes(raw as Severity) ? (raw as Severity) : "medium";
}

export async function runSkepticAnalysis(
  content: string,
  ingestionStatus: IngestionStatus,
  reportId: string
): Promise<AuditReport> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Cannot run analysis.");
  }

  const prompt = buildPrompt(ingestionStatus, content);

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        // 8192 is too small for large repos — thinking tokens eat into the budget
        // before JSON output, truncating mid-object. 32768 gives enough headroom.
        maxOutputTokens: 32768,
      },
      // Limit thinking budget so tokens go to output, not internal reasoning.
      // gemini-2.5-flash accepts thinkingConfig; 1024 is enough for this task.
      thinkingConfig: {
        thinkingBudget: 1024,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
  }

  const raw = await res.json();

  // Gemini 2.5-flash is a thinking model — it may:
  // 1. Return multiple parts (thought + output)
  // 2. Wrap JSON in markdown fences ```json ... ```
  // 3. Include preamble text before the JSON object
  // Collect all text parts and find the one containing a JSON object.
  const parts: string[] = (raw?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p?.text ?? "")
    .filter(Boolean);

  // Strip markdown fences and extract the first {...} JSON object found
  function extractJson(s: string): string | null {
    // Remove ```json ... ``` or ``` ... ``` fences
    const stripped = s
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    // Try to find a JSON object
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return stripped.slice(start, end + 1);
    }
    return null;
  }

  let jsonStr: string | null = null;
  for (const part of parts) {
    jsonStr = extractJson(part);
    if (jsonStr) break;
  }

  // Last resort: concatenate all parts and try again
  if (!jsonStr && parts.length > 0) {
    jsonStr = extractJson(parts.join("\n"));
  }

  let parsed: GeminiResponse;
  try {
    parsed = JSON.parse(jsonStr ?? "{}");
  } catch {
    // Emit a degraded report rather than a hard crash so the UI shows the failure
    throw new Error(
      `Gemini returned non-JSON response. Raw text (first 300 chars): ${parts.join("").slice(0, 300)}`
    );
  }

  const findings: Finding[] = (parsed.findings ?? []).map(
    (f: GeminiFinding): Finding => ({
      id: f.id ?? `F-${Math.random().toString(36).slice(2, 6)}`,
      title: f.title ?? "Untitled finding",
      category: parseFindingCategory(f.category),
      severity: parseSeverity(f.severity),
      confidence: Math.min(1, Math.max(0, Number(f.confidence) || 0.5)),
      evidence: {
        source: f.evidence_source ?? "MISSING",
        excerpt: f.evidence_excerpt ?? "",
        truth_category:
          (f.evidence_truth_category as Finding["evidence"]["truth_category"]) ??
          "missing_evidence",
      },
      falsification_test:
        f.falsification_test ?? "MISSING — no falsification test provided",
      recommended_repair:
        f.recommended_repair ?? "MISSING — no repair recommended",
      detail: f.detail ?? "",
    })
  );

  const categorize = (cat: FindingCategory) =>
    findings.filter((f) => f.category === cat);

  const scores: Scores = {
    build_readiness: Number(parsed.scores?.build_readiness ?? 0),
    evidence_quality: Number(parsed.scores?.evidence_quality ?? 0),
    implementation_feasibility: Number(
      parsed.scores?.implementation_feasibility ?? 0
    ),
    governance_risk: Number(parsed.scores?.governance_risk ?? 0),
    rationale: parsed.scores?.rationale ?? "Score rationale not provided.",
    limitations:
      parsed.scores?.limitations ?? "Score limitations not documented.",
  };

  const functionalStatus: Record<string, FunctionalStatus> = {
    github_ingestion: ingestionStatus.input_type === "github_url"
      ? ingestionStatus.coverage
      : "unresolved",
    text_ingestion: ingestionStatus.input_type !== "github_url"
      ? ingestionStatus.coverage
      : "unresolved",
    analysis: "live",
    scoring: "live",
    markdown_export: "unresolved",
    deployment: "unresolved",
    tlc_registration: "partial",
  };

  const report: AuditReport = {
    report_id: reportId,
    generated_at: new Date().toISOString(),
    input_summary: ingestionStatus.notes,
    ingestion_status: ingestionStatus,
    executive_summary: parsed.executive_summary ?? "No summary generated.",
    what_exists: parsed.what_exists ?? [],
    what_is_missing: parsed.what_is_missing ?? [],
    unsupported_claims: categorize("unsupported_claim"),
    build_readiness_risks: [
      ...categorize("build_readiness"),
      ...categorize("missing_dependency"),
    ],
    technical_debt_risks: [
      ...categorize("technical_debt"),
      ...categorize("scope_risk"),
    ],
    evaluation_gaps: [
      ...categorize("evaluation_gap"),
      ...categorize("missing_tests"),
    ],
    safety_governance_concerns: categorize("safety_governance"),
    unresolved_inputs: [
      ...categorize("unresolved_input"),
      ...categorize("evidence_gap"),
    ],
    all_findings: findings,
    scores,
    known_unknowns: [
      ...ingestionStatus.known_unknowns,
      ...(parsed.known_unknowns ?? []),
    ],
    functional_status: functionalStatus,
  };

  report.markdown_export = generateMarkdownExport(report);
  report.functional_status.markdown_export = "live";

  return report;
}

export function buildContentString(
  githubMeta: GitHubRepoMeta | null,
  pastedText: string | null,
  fileTree?: string[],
  fetchedFiles?: FetchedFile[]
): string {
  const parts: string[] = [];

  if (githubMeta) {
    parts.push(`# Repository: ${githubMeta.full_name}`);
    parts.push(`Description: ${githubMeta.description ?? "None provided"}`);
    parts.push(`Primary language: ${githubMeta.language ?? "Unknown"}`);
    parts.push(`Topics: ${githubMeta.topics.join(", ") || "None"}`);
    parts.push(`License: ${githubMeta.license ?? "None"}`);
    parts.push(`Open issues: ${githubMeta.open_issues_count}`);
    parts.push(`Size (KB): ${githubMeta.size}`);
    parts.push(`Last push: ${githubMeta.pushed_at}`);
    if (githubMeta.readme_content) {
      parts.push("\n## README Content\n");
      parts.push(githubMeta.readme_content.slice(0, 4000));
    } else {
      parts.push("\n## README\nMISSING — no README found in repository.");
    }

    if (fileTree && fileTree.length > 0) {
      parts.push("\n## Repository File Tree\n");
      parts.push(fileTree.slice(0, 300).join("\n"));
      if (fileTree.length > 300) {
        parts.push(`\n[...${fileTree.length - 300} more paths not shown]`);
      }
    } else {
      parts.push("\n## Repository File Tree\nUNAVAILABLE — could not fetch file tree.");
    }

    if (fetchedFiles && fetchedFiles.length > 0) {
      parts.push("\n## Source File Contents (sampled)\n");
      let remaining = 6000; // token budget for source files
      for (const f of fetchedFiles) {
        if (remaining <= 0) {
          parts.push(`\n[Remaining ${fetchedFiles.length} file(s) omitted — token budget reached]`);
          break;
        }
        const snippet = f.content.slice(0, Math.min(remaining, 1500));
        remaining -= snippet.length;
        parts.push(`\n### ${f.path}${f.truncated ? " [TRUNCATED]" : ""}\n\`\`\`\n${snippet}\n\`\`\``);
      }
    } else {
      parts.push("\n## Source File Contents\nNot fetched — source content unavailable for analysis.");
    }
  }

  if (pastedText) {
    parts.push("\n## Pasted Content\n");
    parts.push(pastedText);
  }

  return parts.join("\n");
}
