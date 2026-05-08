// lib/export/markdown.ts
// Markdown export for Professional Skeptic audit report.
// Per AC-009: must include all required sections and truth-state labels.

import type { AuditReport, Finding } from "@/types";

function severityIcon(s: string): string {
  switch (s) {
    case "critical": return "🔴";
    case "high": return "🟠";
    case "medium": return "🟡";
    case "low": return "🔵";
    default: return "⚪";
  }
}

function statusLabel(s: string): string {
  switch (s) {
    case "live": return "✅ LIVE";
    case "partial": return "⚠️ PARTIAL";
    case "mocked": return "🔶 MOCKED";
    case "failed": return "❌ FAILED";
    default: return "❓ UNRESOLVED";
  }
}

function renderFinding(f: Finding): string {
  return [
    `### ${severityIcon(f.severity)} [${f.severity.toUpperCase()}] ${f.title}`,
    ``,
    `- **Category:** ${f.category}`,
    `- **Confidence:** ${Math.round(f.confidence * 100)}%`,
    `- **Evidence source:** ${f.evidence.source}`,
    `- **Truth category:** ${f.evidence.truth_category}`,
    f.evidence.excerpt ? `- **Excerpt:** > ${f.evidence.excerpt}` : "",
    ``,
    `**Detail:** ${f.detail}`,
    ``,
    `**Falsification test:** ${f.falsification_test}`,
    ``,
    `**Recommended repair:** ${f.recommended_repair}`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

export function generateMarkdownExport(report: AuditReport): string {
  const lines: string[] = [];

  lines.push(`# Professional Skeptic Audit Report`);
  lines.push(`**Report ID:** ${report.report_id}`);
  lines.push(`**Generated:** ${report.generated_at}`);
  lines.push(`**Input analyzed:** ${report.input_summary}`);
  lines.push(``);

  // Functional status / truth surface
  lines.push(`## Functional Status`);
  lines.push(`> TRUTH SURFACE: These labels reflect verified system state, not claimed capability.`);
  lines.push(``);
  for (const [key, val] of Object.entries(report.functional_status)) {
    lines.push(`- **${key}:** ${statusLabel(val)}`);
  }
  lines.push(``);

  // Ingestion
  lines.push(`## Ingestion Status`);
  lines.push(`- **Coverage:** ${statusLabel(report.ingestion_status.coverage)}`);
  lines.push(`- **Input type:** ${report.ingestion_status.input_type}`);
  lines.push(`- **Files fetched:** ${report.ingestion_status.files_fetched.join(", ") || "none"}`);
  lines.push(`- **Notes:** ${report.ingestion_status.notes}`);
  lines.push(``);

  // Executive summary
  lines.push(`## Executive Summary`);
  lines.push(report.executive_summary);
  lines.push(``);

  // Scores
  lines.push(`## Scores`);
  lines.push(`> These scores are NOT formal certifications. They are estimates based on available evidence.`);
  lines.push(``);
  lines.push(`| Dimension | Score |`);
  lines.push(`|---|---|`);
  lines.push(`| Build Readiness | ${report.scores.build_readiness}/100 |`);
  lines.push(`| Evidence Quality | ${report.scores.evidence_quality}/100 |`);
  lines.push(`| Implementation Feasibility | ${report.scores.implementation_feasibility}/100 |`);
  lines.push(`| Governance Risk | ${report.scores.governance_risk}/100 (higher = more risk) |`);
  lines.push(``);
  lines.push(`**Rationale:** ${report.scores.rationale}`);
  lines.push(``);
  lines.push(`**Limitations:** ${report.scores.limitations}`);
  lines.push(``);

  // What exists
  lines.push(`## What Exists (Verified Facts)`);
  if (report.what_exists.length === 0) {
    lines.push(`_No verified facts identified._`);
  } else {
    for (const item of report.what_exists) {
      lines.push(`- ${item}`);
    }
  }
  lines.push(``);

  // What is missing
  lines.push(`## What Is Missing`);
  if (report.what_is_missing.length === 0) {
    lines.push(`_No gaps identified._`);
  } else {
    for (const item of report.what_is_missing) {
      lines.push(`- ${item}`);
    }
  }
  lines.push(``);

  // Findings by section
  const sections: { label: string; findings: Finding[] }[] = [
    { label: "Unsupported Claims", findings: report.unsupported_claims },
    { label: "Build-Readiness Risks", findings: report.build_readiness_risks },
    { label: "Technical Debt Risks", findings: report.technical_debt_risks },
    { label: "Evaluation Gaps", findings: report.evaluation_gaps },
    { label: "Safety / Governance Concerns", findings: report.safety_governance_concerns },
    { label: "Unresolved Required Inputs", findings: report.unresolved_inputs },
  ];

  for (const section of sections) {
    lines.push(`## ${section.label}`);
    if (section.findings.length === 0) {
      lines.push(`_No findings in this category._`);
    } else {
      for (const f of section.findings) {
        lines.push(renderFinding(f));
        lines.push(``);
      }
    }
    lines.push(``);
  }

  // Known unknowns
  lines.push(`## Known Unknowns`);
  lines.push(`> Items that could not be evaluated from available content.`);
  lines.push(``);
  if (report.known_unknowns.length === 0) {
    lines.push(`_None recorded._`);
  } else {
    for (const u of report.known_unknowns) {
      lines.push(`- ${u}`);
    }
  }
  lines.push(``);

  lines.push(`---`);
  lines.push(`_Generated by Professional Skeptic — evidence-grounded failure detection_`);
  lines.push(`_Coverage: ${statusLabel(report.ingestion_status.coverage)} | Analysis: ${statusLabel(report.functional_status.analysis ?? "unresolved")}_`);

  return lines.join("\n");
}
