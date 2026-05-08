> MACHINE LAW NOTICE: Any obligation, restriction, halt condition,
> verifier, acceptance rule, or lifecycle rule stated in this Markdown
> but absent from the paired JSON is non-authoritative and shall not be enforced.
> The authoritative machine-law instance is: docs/governance/CRSP-PROFESSIONAL-SKEPTIC-001.json

# CRSP-PROFESSIONAL-SKEPTIC-001 — Professional Skeptic Build Contract

**Status:** Draft
**Schema version:** 4.0
**Contract ID:** CRSP-PROFESSIONAL-SKEPTIC-001
**Paired JSON:** docs/governance/CRSP-PROFESSIONAL-SKEPTIC-001.json
**Authority:** The Living Constitution (github.com/coreyalejandro/the-living-constitution)

---

## Objective

Build Professional Skeptic as a standalone public product repository governed by C-RSP and registered inside The Living Constitution.

Professional Skeptic is a failure-detection agent that audits AI repositories, research claims, and build plans. It identifies unsupported claims, missing evidence, build-readiness failures, technical debt risks, evaluation gaps, safety/governance risks, and unresolved required inputs.

---

## Topology

Dual-Topology:
- Standalone public product repo: github.com/coreyalejandro/professional-skeptic (reviewable product surface)
- TLC governed project: projects/professional-skeptic inside the-living-constitution (authority, contract mirror, lifecycle status)

---

## Dependencies

- Next.js App Router + TypeScript + React + ShadCN UI + Tailwind CSS
- LLM provider: Google Gemini (gemini-2.0-flash-001)
- Environment variable: GEMINI_API_KEY (required)
- Environment variable: GITHUB_TOKEN (optional — raises GitHub API rate limit)
- GitHub public REST API for repository metadata ingestion
- Deployment: Vercel

---

## Unresolved Required Inputs

- baseline.commit — initial repo commit hash not yet recorded
- verifier_modules[*].sha256 — computed after scripts exist

---

## Functional Status

See STATUS.json for current functional state of each capability.

---

## Acceptance Criteria Summary

1. Standalone repo with complete Next.js App Router TypeScript scaffold
2. Professional Skeptic registered in TLC under projects/professional-skeptic
3. App accepts GitHub URL or pasted text
4. Ingestion layer labels coverage truthfully (live/partial/failed/mocked/unresolved)
5. Report includes all required sections including executive summary, what exists, what is missing, unsupported claims, build-readiness risks, evaluation gaps, safety/governance, falsification tests, known unknowns, functional status
6. Each finding includes category, severity, confidence, evidence source, falsification test, and repair recommendation
7. System produces evidence-grounded critique, not generic summarization
8. Scores include rationale and limitations — not presented as formal certification
9. Markdown export works
10. Truth surface persists through entire workflow
11. Documentation supports blind-man self-sufficiency
12. No unsupported capability claims
