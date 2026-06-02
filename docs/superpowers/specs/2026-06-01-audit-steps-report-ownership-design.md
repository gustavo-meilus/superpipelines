# Audit-Steps Report-Ownership & Frontmatter/Protocol Consistency — Design

**Date:** 2026-06-01
**Status:** Approved (brainstorm) — ready for plan
**Scope:** Doc/contract fix + one low-risk frontmatter alignment. No code (repo has no build/test framework).

## Problem

A `/superpipelines:audit-steps` run surfaced a report-persistence failure: the `pipeline-auditor` subagent "delivered the report but couldn't persist it," and the orchestrator's first `Write` to `…/audit/latest.md` errored because the `audit/` directory did not exist on a fresh pipeline.

Root-cause investigation revealed this is one instance of a broader class of defect: **an agent's frontmatter capability contradicts its protocol's instructions** ("frontmatter vs protocol split-brain"). A targeted sweep of all six agent protocols found two affected agents; the other four are clean.

### Sweep results

| Agent | Frontmatter | Protocol instruction | Verdict |
|---|---|---|---|
| `pipeline-auditor` | `disallowedTools: Write` + `permissionMode: plan` | "Write the report… **if** Write disallowed, plan" | **Defect** — the `if` branch is always true; auditor can never write |
| `pipeline-architect` | `tools: …Write, Edit…` + `permissionMode: plan` | DELIVER: "All files built via `Write`/`Edit`", "Write directly to final paths" | **Consistency defect** — `plan` contradicts the `tools:` allowlist and the protocol |
| `pipeline-quality-reviewer` | `disallowedTools: Write` + `plan` | "EMIT VERDICT" inline only | Clean |
| `pipeline-spec-reviewer` | `disallowedTools: Write` + `plan` | "EMIT VERDICT" inline only | Clean |
| `pipeline-failure-analyzer` | `plan` | Diagnoses, emits to orchestrator | Clean |
| `pipeline-task-executor` | `acceptEdits` | Writes code | Clean (consistent) |

### Two confirmed issues

1. **Auditor report-ownership split-brain.** `agents/pipeline-auditor.md:5` permanently sets `disallowedTools: Write`. Yet `pipeline-auditor-protocol/SKILL.md:44-46` frames writing the report as the auditor's primary action, with a never-false "if Write disallowed, provide the registry update instruction as a plan" fallback. The real persistence owner (the orchestrator) is named only in the command file (`commands/audit-steps.md:31`), not the protocol. No party owns "ensure the `audit/` directory exists" → first write fails on a fresh pipeline.

2. **Architect frontmatter/protocol consistency defect.** `agents/pipeline-architect.md:9` sets `permissionMode: plan`, but the architect is the one agent whose job is to *produce* files: its `tools:` list includes `Write, Edit` (`:4`) and its DELIVER protocol instructs direct writes (`pipeline-architect-protocol/SKILL.md:94, 96-99`). The contradiction is reinforced systemically by an authoring rule at `:89` — *"Set `permissionMode: plan` for reviewers and architects"* — which makes the architect stamp `plan` on architect-type agents it generates, propagating the contradiction.

### Honest framing (no overclaim)

Pipelines **have** been scaffolded successfully in this repo (`parity-test-*`, `dominus-requiem` all contain written files). If `permissionMode: plan` hard-blocked a *dispatched subagent's* `Write`, the architect could never have produced them. The most consistent explanation: for a dispatched subagent the effective write-gate is the `tools:`/`disallowedTools:` allowlist, and `permissionMode: plan` is largely inert there. This explains both observed behaviors — the auditor cannot write because `Write` is **disallowed** (not because of `plan`); the architect can write because `Write` is **allowed**.

Therefore the architect issue is framed as a **consistency/clarity defect** (frontmatter misrepresents intent and contradicts the protocol), **not** a verified write-failure. This design makes no claim that the change fixes a runtime write failure.

## Goal

Eliminate the frontmatter-vs-protocol contradictions in the two affected agents, and make report persistence (including directory creation) explicitly owned by the orchestrator, so the audit-steps reporting path is unambiguous and cannot fail on a fresh pipeline's missing `audit/` directory.

## Design

### Component 1 — Auditor protocol REPORT step

**File:** `skills/pipeline-auditor-protocol/SKILL.md` (§3 REPORT, lines 44-47)

Rewrite to state the read-only contract directly and remove the always-false conditional:

- The auditor is **read-only** and **never** writes the report file or mutates `registry.json`.
- Its terminal output is (a) the full report rendered per `references/audit-report-template.md`, and (b) an explicit registry-update instruction (target path + `last_audit` value) for the orchestrator to apply.
- Persistence is the **orchestrator's** responsibility — cross-reference the command file.
- Retain: "Record every audit, even those with zero findings."

Delete the misleading "Write the final report to `{ROOT}/.../audit/latest.md`" primary instruction and the "if `Write` tools are disallowed" fallback phrasing.

### Component 2 — Command REPORTING step (orchestrator owns persistence)

**File:** `commands/audit-steps.md` (§3 REPORTING, lines 29-33)

Make the orchestrator explicitly own the persistence sequence, in order:

1. **Ensure** `<scope-root>/superpipelines/pipelines/{P}/audit/` exists (create if missing; idempotent — no-op if present).
2. Write the auditor's rendered report to `audit/latest.md`.
3. Update `registry.json` `last_audit` per the auditor's instruction.
4. Present the executive summary inline.

The spec states the **contract behavior** ("ensure the directory exists"), not a single platform's command, since the orchestrator may run on any tier. (On Win11/PowerShell this is `New-Item -ItemType Directory -Force`; the directory-ensure must precede the write.)

### Component 3 — Architect frontmatter/protocol alignment

**Files:** `agents/pipeline-architect.md`, `skills/pipeline-architect-protocol/SKILL.md`

- Change `agents/pipeline-architect.md:9` `permissionMode: plan` → `permissionMode: acceptEdits`, matching its `tools:` allowlist and DELIVER protocol (mirrors `pipeline-task-executor`, the other file-producer).
- Correct the authoring rule at `pipeline-architect-protocol/SKILL.md:89` so it no longer prescribes `plan` for architects. New intent: `permissionMode: plan` for **read-only/advisory** agents (reviewers, auditor, failure-analyzer); `acceptEdits` for **file-producing** agents (architect, task-executor). Reviewers keep `plan`.

**Implementation note (scope expansion during code-quality review):** the Stage-2 review surfaced that `skill-architect` — the 7th agent, missed by the original six-agent sweep — is also a file-producer (`tools: …Write, Edit…`, protocol creates `SKILL.md` files) that was still on `permissionMode: plan`: the identical defect. It was folded into Component 3 (flipped to `acceptEdits`), and the authoring rule was generalized to be capability-based rather than an enumerated list, now naming `architect, skill-architect, task-executor` as file-producers. All 7 agents are now consistent.

This is the minimal change that removes the contradiction without altering any clean agent.

## Out of Scope (deferred follow-ups)

- **Generalized auditor criterion** — a new detection rule flagging any protocol whose primary action assumes a tool the agent's frontmatter disallows. Genuinely useful, but a distinct feature with its own false-positive surface (some protocols legitimately describe tier-conditional fallbacks). File as its own issue.
- **Empirical verification of `permissionMode: plan` behavior for dispatched subagents.** Worth confirming to update AIBOARDING's frontmatter-flag guidance, but not required for this consistency fix.

## Error Handling

The directory-ensure step (Component 2.1) is idempotent. If the write still fails after ensuring the directory, the orchestrator surfaces the error and the inline executive summary so the audit findings are never lost even when persistence fails.

## Testing & Validation

No test framework exists (doc/contract + frontmatter change). Validation is a re-read consistency check:

1. No remaining "if `Write` tools are disallowed" conditional or "Write the final report" primary instruction in the auditor protocol.
2. Command REPORTING step names the directory-ensure step before the write.
3. `pipeline-architect.md` `permissionMode` is `acceptEdits`; `:89` authoring rule no longer prescribes `plan` for architects; reviewers still `plan`.
4. No clean agent (both reviewers, failure-analyzer, task-executor) was modified.

## Version Impact

Patch-level (next release). Doc/contract + low-risk frontmatter alignment. No version bump performed in this change unless explicitly bundled with a release.
