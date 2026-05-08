# Professional Skeptic

Evidence-grounded failure detection for AI repositories, research claims, and build plans.

Governed by [The Living Constitution](https://github.com/coreyalejandro/the-living-constitution) | Contract: CRSP-PROFESSIONAL-SKEPTIC-001

---

## What it does

Professional Skeptic audits GitHub repositories (public), research claims, README files, build plans, and proposal excerpts. For each audit it produces:

- Unsupported claims with evidence references
- Missing dependencies and build-readiness failures
- Evaluation gaps and missing test evidence
- Safety and governance risks
- Technical debt risks
- Unresolved required inputs
- Falsification tests for each finding
- Build-readiness, evidence quality, and governance risk scores
- Markdown export of the full report
- A visible truth surface labeling what is live, partial, mocked, failed, or unresolved

---

## Current functional status

| Capability | Status |
|---|---|
| Text ingestion (pasted content) | LIVE |
| GitHub ingestion (metadata + README) | PARTIAL — source files not fetched |
| LLM analysis (Gemini 2.0 Flash) | LIVE |
| Scoring | LIVE |
| Markdown export | LIVE |
| Deployment (Vercel) | UNRESOLVED |
| TLC registration | PARTIAL |

GitHub ingestion is intentionally limited to repository metadata and README content retrieved via the GitHub REST API. Full source code is not fetched. The UI and reports label this explicitly.

---

## Setup

### Requirements

- Node.js 18+
- npm
- A Gemini API key (free tier works for testing)

### Install

```bash
git clone https://github.com/coreyalejandro/professional-skeptic
cd professional-skeptic
npm install
```

### Configure environment

```bash
cp .env.example .env.local
# Edit .env.local and set GEMINI_API_KEY
```

### Run locally

```bash
npm run dev
# Open http://localhost:3000
```

### Build

```bash
npm run build
```

### Type check

```bash
npx tsc --noEmit
```

### Verify

```bash
bash scripts/verify-professional-skeptic.sh
```

---

## How to use

1. Open the app at http://localhost:3000
2. Paste a GitHub repository URL (public) or paste text to audit
3. Click "Run Professional Skeptic Audit"
4. Review findings — each includes severity, evidence source, truth category, falsification test, and recommended repair
5. Use "Copy Markdown" or "Download .md" to export the report

---

## Governance

- **Authority:** [The Living Constitution](https://github.com/coreyalejandro/the-living-constitution)
- **Contract:** [CRSP-PROFESSIONAL-SKEPTIC-001](docs/governance/CRSP-PROFESSIONAL-SKEPTIC-001.md)
- **TLC project path:** projects/professional-skeptic inside the-living-constitution repo
- **Truth surface:** STATUS.json

---

## What this does NOT do

- This does not analyze private repositories unless GITHUB_TOKEN is set and repository access is granted
- This does not claim full source code analysis — only metadata and README are fetched from GitHub
- This does not train or fine-tune models
- This does not provide safety certification, legal compliance, or formal verification
- This does not provide persistence — audit results are not stored between sessions

---

## Blind-Man Self-Sufficiency check

A new reviewer starting from this README can:
- Install the project (`npm install`)
- Configure environment variables (`.env.example` documents all required vars)
- Run locally (`npm run dev`)
- Build (`npm run build`)
- Understand current functional status (STATUS.json and the truth surface in the UI)
- Run verification (`scripts/verify-professional-skeptic.sh`)

If any of the above steps fails, check `verification/CRSP-PROFESSIONAL-SKEPTIC-001/` for documented failures.
