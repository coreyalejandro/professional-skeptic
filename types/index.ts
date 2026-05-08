// Professional Skeptic — Core Types
// Truth categories per C-RSP INVARIANT_TRUTH_SURFACE_001

export type TruthCategory =
  | "verified_fact"
  | "inferred_risk"
  | "unsupported_claim"
  | "missing_evidence"
  | "unresolved_required_input"
  | "functional_status";

export type FunctionalStatus =
  | "live"
  | "partial"
  | "mocked"
  | "failed"
  | "unresolved";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type FindingCategory =
  | "unsupported_claim"
  | "missing_dependency"
  | "missing_tests"
  | "build_readiness"
  | "evaluation_gap"
  | "safety_governance"
  | "technical_debt"
  | "unresolved_input"
  | "scope_risk"
  | "evidence_gap";

export interface Evidence {
  source: string; // file path, URL, section heading, or "MISSING"
  excerpt?: string;
  truth_category: TruthCategory;
}

export interface Finding {
  id: string;
  title: string;
  category: FindingCategory;
  severity: Severity;
  confidence: number; // 0.0 – 1.0
  evidence: Evidence; // required per INVARIANT_EVIDENCE_001
  falsification_test: string; // required per INVARIANT_FALSIFICATION_001
  recommended_repair: string;
  detail: string;
}

export interface Scores {
  build_readiness: number; // 0–100
  evidence_quality: number;
  implementation_feasibility: number;
  governance_risk: number; // lower = less risk
  rationale: string;
  limitations: string;
}

export type InputType =
  | "github_url"
  | "pasted_text"
  | "readme"
  | "build_plan"
  | "research_claim"
  | "proposal_excerpt"
  | "unknown";

export interface IngestionStatus {
  input_type: InputType;
  coverage: FunctionalStatus;
  files_fetched: string[];
  known_unknowns: string[];
  notes: string;
}

export interface AuditRequest {
  input_type: InputType;
  github_url?: string;
  pasted_text?: string;
}

export interface AuditReport {
  report_id: string;
  generated_at: string;
  input_summary: string;
  ingestion_status: IngestionStatus;
  executive_summary: string;
  what_exists: string[];
  what_is_missing: string[];
  unsupported_claims: Finding[];
  build_readiness_risks: Finding[];
  technical_debt_risks: Finding[];
  evaluation_gaps: Finding[];
  safety_governance_concerns: Finding[];
  unresolved_inputs: Finding[];
  all_findings: Finding[];
  scores: Scores;
  known_unknowns: string[];
  functional_status: Record<string, FunctionalStatus>;
  markdown_export?: string;
}

export interface TruthSurfaceState {
  github_ingestion: FunctionalStatus;
  text_ingestion: FunctionalStatus;
  analysis: FunctionalStatus;
  scoring: FunctionalStatus;
  markdown_export: FunctionalStatus;
  deployment: FunctionalStatus;
  tlc_registration: FunctionalStatus;
}
