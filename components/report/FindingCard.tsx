"use client";
// components/report/FindingCard.tsx

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Finding, Severity } from "@/types";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "bg-red-900/40 border-red-600/50",
  high: "bg-orange-900/30 border-orange-600/40",
  medium: "bg-yellow-900/20 border-yellow-600/30",
  low: "bg-blue-900/20 border-blue-600/30",
  info: "bg-muted/20 border-muted/30",
};

const SEVERITY_BADGE: Record<Severity, string> = {
  critical: "bg-red-700 text-white",
  high: "bg-orange-600 text-white",
  medium: "bg-yellow-600 text-black",
  low: "bg-blue-600 text-white",
  info: "bg-muted text-muted-foreground",
};

const TRUTH_LABEL: Record<string, string> = {
  verified_fact: "Verified Fact",
  inferred_risk: "Inferred Risk",
  unsupported_claim: "Unsupported Claim",
  missing_evidence: "Missing Evidence",
  unresolved_required_input: "Unresolved Input",
  functional_status: "Functional Status",
};

interface FindingCardProps {
  finding: Finding;
}

export function FindingCard({ finding }: FindingCardProps) {
  return (
    <Card className={`border ${SEVERITY_COLORS[finding.severity]}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase ${SEVERITY_BADGE[finding.severity]}`}
          >
            {finding.severity}
          </span>
          <Badge variant="outline" className="text-xs">
            {finding.category.replace(/_/g, " ")}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            Confidence: {Math.round(finding.confidence * 100)}%
          </span>
        </div>
        <CardTitle className="text-sm mt-1">{finding.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {finding.detail && (
          <p className="text-muted-foreground">{finding.detail}</p>
        )}

        <div className="rounded bg-black/20 p-2 space-y-1 font-mono text-xs">
          <div className="flex gap-2">
            <span className="text-yellow-500 shrink-0">Evidence:</span>
            <span className="text-muted-foreground">{finding.evidence.source}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-yellow-500 shrink-0">Category:</span>
            <span className="text-muted-foreground">
              {TRUTH_LABEL[finding.evidence.truth_category] ?? finding.evidence.truth_category}
            </span>
          </div>
          {finding.evidence.excerpt && (
            <blockquote className="border-l-2 border-yellow-600/50 pl-2 text-muted-foreground/80 italic">
              {finding.evidence.excerpt}
            </blockquote>
          )}
        </div>

        <div className="rounded bg-blue-950/20 border border-blue-700/30 p-2 text-xs space-y-1">
          <p className="text-blue-400 font-semibold uppercase text-xs tracking-widest">
            Falsification Test
          </p>
          <p className="text-muted-foreground">{finding.falsification_test}</p>
        </div>

        <div className="rounded bg-green-950/20 border border-green-700/30 p-2 text-xs space-y-1">
          <p className="text-green-400 font-semibold uppercase text-xs tracking-widest">
            Recommended Repair
          </p>
          <p className="text-muted-foreground">{finding.recommended_repair}</p>
        </div>
      </CardContent>
    </Card>
  );
}
