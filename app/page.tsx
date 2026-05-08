"use client";
// app/page.tsx
// Professional Skeptic — main audit page.

import { useState } from "react";
import { AuditForm } from "@/components/audit/AuditForm";
import { AuditReportView } from "@/components/report/AuditReportView";
import { TruthSurface } from "@/components/truth-surface/TruthSurface";
import type { AuditReport, TruthSurfaceState } from "@/types";

const INITIAL_SURFACE_STATE: TruthSurfaceState = {
  github_ingestion: "partial",
  text_ingestion: "live",
  analysis: "live",
  scoring: "live",
  markdown_export: "live",
  deployment: "unresolved",
  tlc_registration: "partial",
};

export default function HomePage() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: { github_url?: string; pasted_text?: string }) {
    setIsLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? `Request failed: ${res.status}`);
        return;
      }

      setReport(json as AuditReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Professional Skeptic
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Evidence-grounded failure detection for AI repositories, research claims, and build plans.
            Identifies unsupported claims, missing evidence, build-readiness failures, and unresolved required inputs.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-muted px-2 py-0.5 font-mono">C-RSP governed</span>
            <span className="rounded bg-muted px-2 py-0.5 font-mono">TLC registered</span>
            <span className="rounded bg-muted px-2 py-0.5 font-mono">CRSP-PROFESSIONAL-SKEPTIC-001</span>
          </div>
        </header>

        {/* Truth surface — always visible per INVARIANT_TRUTH_SURFACE_001 */}
        <TruthSurface
          state={INITIAL_SURFACE_STATE}
          unresolved_inputs={[
            "Deployment target: Vercel production deployment not yet verified",
            "TLC registration: partial — project files exist, commit not yet finalized",
          ]}
        />

        {/* Audit form */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Submit for Audit
          </h2>
          <AuditForm onSubmit={handleSubmit} isLoading={isLoading} />
        </section>

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="rounded border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <p className="font-semibold mb-1">Audit failed</p>
            <p>{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-8 space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-sm text-muted-foreground">
              Running Professional Skeptic analysis...
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              Ingesting content, generating findings, scoring evidence quality
            </p>
          </div>
        )}

        {/* Report */}
        {report && !isLoading && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Audit Report
            </h2>
            <AuditReportView report={report} />
          </section>
        )}

        {/* Footer */}
        <footer className="pt-8 border-t border-border text-xs text-muted-foreground/60 space-y-1">
          <p>Professional Skeptic — governed by The Living Constitution (TLC)</p>
          <p>Contract: CRSP-PROFESSIONAL-SKEPTIC-001 | Status: Draft → Active pending verification</p>
          <p>
            Analysis powered by Gemini 2.0 Flash. GitHub ingestion: metadata + README only (PARTIAL coverage).
          </p>
        </footer>
      </div>
    </main>
  );
}
