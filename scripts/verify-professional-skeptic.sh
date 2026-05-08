#!/usr/bin/env bash
# scripts/verify-professional-skeptic.sh
# Verifies the Professional Skeptic product repo against C-RSP predicates.
# Usage: bash scripts/verify-professional-skeptic.sh

set -euo pipefail

PASS=0
FAIL=0
ERRORS=()

check() {
  local desc="$1"
  local condition="$2"
  if eval "$condition" > /dev/null 2>&1; then
    echo "  PASS  $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $desc"
    FAIL=$((FAIL + 1))
    ERRORS+=("$desc")
  fi
}

echo ""
echo "Professional Skeptic — C-RSP Verification"
echo "Contract: CRSP-PROFESSIONAL-SKEPTIC-001"
echo "=========================================="
echo ""

echo "## Scaffold (OP-01)"
check "package.json exists" "[ -f package.json ]"
check "app/page.tsx exists" "[ -f app/page.tsx ]"
check "app/layout.tsx exists" "[ -f app/layout.tsx ]"
check "app/api/audit/route.ts exists" "[ -f app/api/audit/route.ts ]"
check "tsconfig.json exists" "[ -f tsconfig.json ]"
check "Tailwind CSS configured (v4 uses globals.css, no tailwind.config.ts)" "grep -q 'tailwindcss' app/globals.css 2>/dev/null || grep -q '@import' app/globals.css 2>/dev/null"
check "components.json exists" "[ -f components.json ]"
check "README.md exists" "[ -f README.md ]"
check "STATUS.json exists" "[ -f STATUS.json ]"
check ".env.example exists" "[ -f .env.example ]"

echo ""
echo "## Governance artifacts (PRED-001, PRED-002)"
check "Contract JSON exists" "[ -f docs/governance/CRSP-PROFESSIONAL-SKEPTIC-001.json ]"
check "Contract Markdown exists" "[ -f docs/governance/CRSP-PROFESSIONAL-SKEPTIC-001.md ]"
check "Markdown has MACHINE LAW NOTICE" "grep -q 'MACHINE LAW NOTICE' docs/governance/CRSP-PROFESSIONAL-SKEPTIC-001.md"

echo ""
echo "## Types and library modules"
check "types/index.ts exists" "[ -f types/index.ts ]"
check "lib/ingestion/validate.ts exists" "[ -f lib/ingestion/validate.ts ]"
check "lib/ingestion/github.ts exists" "[ -f lib/ingestion/github.ts ]"
check "lib/ingestion/text.ts exists" "[ -f lib/ingestion/text.ts ]"
check "lib/skeptic/engine.ts exists" "[ -f lib/skeptic/engine.ts ]"
check "lib/export/markdown.ts exists" "[ -f lib/export/markdown.ts ]"

echo ""
echo "## Components"
check "components/audit/AuditForm.tsx exists" "[ -f components/audit/AuditForm.tsx ]"
check "components/report/FindingCard.tsx exists" "[ -f components/report/FindingCard.tsx ]"
check "components/report/AuditReportView.tsx exists" "[ -f components/report/AuditReportView.tsx ]"
check "components/truth-surface/TruthSurface.tsx exists" "[ -f components/truth-surface/TruthSurface.tsx ]"

echo ""
echo "## Evidence and verification directories (PRED-008)"
check "verification/CRSP-PROFESSIONAL-SKEPTIC-001 dir exists" "[ -d verification/CRSP-PROFESSIONAL-SKEPTIC-001 ]"
check "evidence/sample-audits dir exists" "[ -d evidence/sample-audits ]"
check "evidence/failure-cases dir exists" "[ -d evidence/failure-cases ]"

echo ""
echo "## Environment documentation (HALT-019)"
check ".env.example has GEMINI_API_KEY" "grep -q 'GEMINI_API_KEY' .env.example"

echo ""
echo "=========================================="
echo "PASS: $PASS  FAIL: $FAIL"
if [ ${#ERRORS[@]} -gt 0 ]; then
  echo ""
  echo "Failed checks:"
  for e in "${ERRORS[@]}"; do
    echo "  - $e"
  done
  echo ""
  echo "Status: VERIFICATION INCOMPLETE — lifecycle state remains Draft"
  exit 1
else
  echo ""
  echo "Status: STRUCTURAL VERIFICATION PASS"
  echo "Note: Build verification (npm run build) must be run separately."
  echo "Note: Lifecycle transition to Active requires build evidence in verification/CRSP-PROFESSIONAL-SKEPTIC-001/build.jsonl"
  exit 0
fi
