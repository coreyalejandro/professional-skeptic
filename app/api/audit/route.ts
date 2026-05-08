// app/api/audit/route.ts
// POST /api/audit — Professional Skeptic analysis endpoint.

import { NextRequest, NextResponse } from "next/server";
import { validateAuditRequest } from "@/lib/ingestion/validate";
import { ingestGitHubRepo } from "@/lib/ingestion/github";
import { ingestText } from "@/lib/ingestion/text";
import { runSkepticAnalysis, buildContentString } from "@/lib/skeptic/engine";

export async function POST(req: NextRequest) {
  let body: { github_url?: string; pasted_text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // OP-03: Input validation
  const validation = validateAuditRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error, input_type: validation.input_type },
      { status: 422 }
    );
  }

  const reportId = `PS-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  try {
    let content = "";
    let ingestionStatus;

    if (validation.input_type === "github_url") {
      // OP-04: GitHub ingestion (extended: metadata + README + file tree + sampled source files)
      const github = await ingestGitHubRepo(body.github_url!);
      if (github.status.coverage === "failed") {
        return NextResponse.json(
          {
            error: github.error ?? "GitHub ingestion failed",
            ingestion_status: github.status,
          },
          { status: 422 }
        );
      }
      content = buildContentString(
        github.meta,
        null,
        github.file_tree,
        github.fetched_files
      );
      ingestionStatus = github.status;
    } else {
      // OP-04: Text ingestion
      const text = ingestText(body.pasted_text ?? "");
      if (text.status.coverage === "failed") {
        return NextResponse.json(
          { error: text.error, ingestion_status: text.status },
          { status: 422 }
        );
      }
      content = buildContentString(null, text.content);
      ingestionStatus = text.status;
    }

    // OP-05, OP-06, OP-07, OP-08: Analysis + scoring + report + export
    const report = await runSkepticAnalysis(content, ingestionStatus, reportId);
    return NextResponse.json(report);
  } catch (err) {
    console.error("Audit pipeline error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal error during analysis",
      },
      { status: 500 }
    );
  }
}
