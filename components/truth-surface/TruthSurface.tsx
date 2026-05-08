"use client";
// components/truth-surface/TruthSurface.tsx
// Per OP-09 and INVARIANT_TRUTH_SURFACE_001: visible truth surface that persists.

import { Badge } from "@/components/ui/badge";
import type { TruthSurfaceState, FunctionalStatus } from "@/types";

const STATUS_CONFIG: Record<
  FunctionalStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  live: { label: "LIVE", variant: "default" },
  partial: { label: "PARTIAL", variant: "secondary" },
  mocked: { label: "MOCKED", variant: "outline" },
  failed: { label: "FAILED", variant: "destructive" },
  unresolved: { label: "UNRESOLVED", variant: "outline" },
};

const CAPABILITY_LABELS: Record<keyof TruthSurfaceState, string> = {
  github_ingestion: "GitHub Ingestion",
  text_ingestion: "Text Ingestion",
  analysis: "LLM Analysis",
  scoring: "Scoring",
  markdown_export: "Markdown Export",
  deployment: "Deployment",
  tlc_registration: "TLC Registration",
};

interface TruthSurfaceProps {
  state: TruthSurfaceState;
  unresolved_inputs?: string[];
  className?: string;
}

export function TruthSurface({
  state,
  unresolved_inputs = [],
  className = "",
}: TruthSurfaceProps) {
  return (
    <aside
      className={`border border-yellow-600/40 bg-yellow-950/20 rounded-lg p-4 ${className}`}
      aria-label="System truth surface"
    >
      <h2 className="text-xs font-mono text-yellow-400 uppercase tracking-widest mb-3">
        Truth Surface — System Capability Status
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {(Object.entries(state) as [keyof TruthSurfaceState, FunctionalStatus][]).map(
          ([key, status]) => {
            const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unresolved;
            return (
              <div
                key={key}
                className="flex flex-col gap-1 p-2 rounded bg-black/30"
              >
                <span className="text-xs text-muted-foreground">
                  {CAPABILITY_LABELS[key]}
                </span>
                <Badge variant={cfg.variant} className="w-fit text-xs">
                  {cfg.label}
                </Badge>
              </div>
            );
          }
        )}
      </div>
      {unresolved_inputs.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-mono text-orange-400 uppercase tracking-widest mb-1">
            Unresolved Required Inputs
          </p>
          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
            {unresolved_inputs.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground/60 font-mono">
        These labels reflect verified system state. Unresolved = not yet confirmed live.
      </p>
    </aside>
  );
}
