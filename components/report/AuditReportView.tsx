"use client";
// components/report/AuditReportView.tsx
// Renders the full Professional Skeptic audit report.
// Per OP-07: all required sections present, evidence and unknowns separated.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FindingCard } from "./FindingCard";
import { TruthSurface } from "@/components/truth-surface/TruthSurface";
import type { AuditReport, TruthSurfaceState } from "@/types";

interface AuditReportViewProps {
  report: AuditReport;
}

function ScoreBar({ label, value, inverted = false }: { label: string; value: number; inverted?: boolean }) {
  const display = Math.min(100, Math.max(0, value));
  const color = inverted
    ? display > 66 ? "bg-red-600" : display > 33 ? "bg-yellow-600" : "bg-green-600"
    : display > 66 ? "bg-green-600" : display > 33 ? "bg-yellow-600" : "bg-red-600";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{display}/100</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${display}%` }} />
      </div>
    </div>
  );
}

export function AuditReportView({ report }: AuditReportViewProps) {
  const [copied, setCopied] = useState(false);

  const surfaceState: TruthSurfaceState = {
    github_ingestion: (report.functional_status.github_ingestion as TruthSurfaceState["github_ingestion"]) ?? "unresolved",
    text_ingestion: (report.functional_status.text_ingestion as TruthSurfaceState["text_ingestion"]) ?? "unresolved",
    analysis: (report.functional_status.analysis as TruthSurfaceState["analysis"]) ?? "unresolved",
    scoring: (report.functional_status.scoring as TruthSurfaceState["scoring"]) ?? "unresolved",
    markdown_export: (report.functional_status.markdown_export as TruthSurfaceState["markdown_export"]) ?? "unresolved",
    deployment: (report.functional_status.deployment as TruthSurfaceState["deployment"]) ?? "unresolved",
    tlc_registration: (report.functional_status.tlc_registration as TruthSurfaceState["tlc_registration"]) ?? "unresolved",
  };

  function handleCopy() {
    if (report.markdown_export) {
      navigator.clipboard.writeText(report.markdown_export).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  function handleDownload() {
    if (!report.markdown_export) return;
    const blob = new Blob([report.markdown_export], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.report_id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const findingGroups = [
    { label: "Unsupported Claims", findings: report.unsupported_claims, color: "text-red-400" },
    { label: "Build-Readiness Risks", findings: report.build_readiness_risks, color: "text-orange-400" },
    { label: "Technical Debt Risks", findings: report.technical_debt_risks, color: "text-yellow-400" },
    { label: "Evaluation Gaps", findings: report.evaluation_gaps, color: "text-purple-400" },
    { label: "Safety / Governance Concerns", findings: report.safety_governance_concerns, color: "text-pink-400" },
    { label: "Unresolved Required Inputs", findings: report.unresolved_inputs, color: "text-blue-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Truth surface — persists through entire report per OP-09 */}
      <TruthSurface state={surfaceState} unresolved_inputs={report.ingestion_status.known_unknowns} />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-mono text-muted-foreground">Report ID: {report.report_id}</p>
          <p className="text-xs font-mono text-muted-foreground">
            Generated: {new Date(report.generated_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={!report.markdown_export}>
            {copied ? "Copied!" : "Copy Markdown"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={!report.markdown_export}>
            Download .md
          </Button>
        </div>
      </div>

      {/* Ingestion status */}
      <Card className="border-yellow-600/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono text-yellow-400 uppercase tracking-widest">
            Ingestion Status
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1 text-muted-foreground">
          <p><span className="text-foreground font-semibold">Type:</span> {report.ingestion_status.input_type}</p>
          <p><span className="text-foreground font-semibold">Coverage:</span> {report.ingestion_status.coverage.toUpperCase()}</p>
          <p><span className="text-foreground font-semibold">Fetched:</span> {report.ingestion_status.files_fetched.join(", ") || "none"}</p>
          <p className="italic">{report.ingestion_status.notes}</p>
        </CardContent>
      </Card>

      {/* Executive summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
          {report.executive_summary}
        </CardContent>
      </Card>

      {/* Scores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Scores</CardTitle>
          <p className="text-xs text-muted-foreground">
            These are estimates — not formal certifications. Scores degrade when evidence is missing.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <ScoreBar label="Build Readiness" value={report.scores.build_readiness} />
          <ScoreBar label="Evidence Quality" value={report.scores.evidence_quality} />
          <ScoreBar label="Implementation Feasibility" value={report.scores.implementation_feasibility} />
          <ScoreBar label="Governance Risk (higher = more risk)" value={report.scores.governance_risk} inverted />
          <Separator />
          <p className="text-xs text-muted-foreground">{report.scores.rationale}</p>
          <p className="text-xs text-muted-foreground italic">{report.scores.limitations}</p>
        </CardContent>
      </Card>

      {/* What exists / missing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-400">What Exists (Verified Facts)</CardTitle>
          </CardHeader>
          <CardContent>
            {report.what_exists.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No verified facts identified.</p>
            ) : (
              <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                {report.what_exists.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-400">What Is Missing</CardTitle>
          </CardHeader>
          <CardContent>
            {report.what_is_missing.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No gaps identified.</p>
            ) : (
              <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                {report.what_is_missing.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Findings by category */}
      {findingGroups.map(({ label, findings, color }) => (
        <section key={label}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className={`text-sm font-semibold ${color}`}>{label}</h2>
            <Badge variant="outline" className="text-xs">{findings.length}</Badge>
          </div>
          {findings.length === 0 ? (
            <p className="text-xs text-muted-foreground italic pl-2">No findings in this category.</p>
          ) : (
            <div className="space-y-3">
              {findings.map((f) => <FindingCard key={f.id} finding={f} />)}
            </div>
          )}
        </section>
      ))}

      {/* Known unknowns */}
      <Card className="border-blue-600/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-blue-400">Known Unknowns</CardTitle>
          <p className="text-xs text-muted-foreground">Items that could not be evaluated from available content.</p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
            {report.known_unknowns.map((u, i) => <li key={i}>{u}</li>)}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
