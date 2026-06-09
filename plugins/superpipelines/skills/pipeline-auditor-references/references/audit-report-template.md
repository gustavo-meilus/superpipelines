# Audit Report Template

Standard structure for audit reports emitted by `pipeline-auditor`.

```markdown
# Audit Report — {target file or pipeline name}

**Auditor:** pipeline-auditor v1.0
**Target:** {file path(s)}
**Date:** {ISO 8601}
**Compliance score:** {X / 20 criteria PASS}

## Executive summary

{2–4 sentences: overall verdict, count by severity, recommended action.}

## Findings by severity

### SEV-0 — Hard blockers

| # | File:line | Criterion | Evidence | Fix |
|---|-----------|-----------|----------|-----|
| 1 | {path}:{line} | C{n} | "{quote}" | {one-line fix} |

### SEV-1 — Quality

| # | File:line | Criterion | Evidence | Fix |

### SEV-2 — Drift risk

| # | File:line | Criterion | Evidence | Fix |

### SEV-3 — Style

| # | File:line | Criterion | Evidence | Fix |

## Compliance matrix results

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | name valid | PASS | line 2 |
| 2 | description triggering-only | FAIL | "Processes X by reading…" — workflow summary |
| ... | ... | ... | ... |

## Recommendations

1. {Highest-priority remediation.}
2. ...

## Status

DONE
```

## Authoring rules

- Always emit the executive summary even when no findings — record the audit happened.
- Quote evidence verbatim. Never paraphrase.
- File:line citations are mandatory for every finding.
- Sort within each severity by file path, then line number.
- "Recommended action" in summary maps to a single next step (e.g., "Fix SEV-0s, then re-audit; SEV-1s tracked in followup ticket").

## When to fix vs report

`pipeline-auditor` is read-only by default. Apply fixes ONLY when the user explicitly requests it. Even then:

- SEV-0: prefer Edit (targeted) over Write.
- SEV-1: Edit when ≤3 changes per file; Write only if >50% of body changes.
- SEV-2 / SEV-3: report only; let the user decide.
