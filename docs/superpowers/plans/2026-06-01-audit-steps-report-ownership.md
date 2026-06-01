# Audit-Steps Report-Ownership & Frontmatter/Protocol Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the frontmatter-vs-protocol contradictions in the `pipeline-auditor` and `pipeline-architect` agents, and make audit-report persistence (including directory creation) explicitly owned by the orchestrator.

**Architecture:** Three independent doc/frontmatter edits to four files. No code, no runtime logic. Each task is a self-contained edit verified by re-reading the file and grepping for the absence of the old phrasing and presence of the new contract. Tasks are order-independent; do them in listed order for clean commits.

**Tech Stack:** Markdown skill/command/agent files. No build, no test framework (this repo's CI only validates JSON manifests + required-file presence). "Tests" here are grep/read consistency assertions run via the Bash tool.

**Spec:** `docs/superpowers/specs/2026-06-01-audit-steps-report-ownership-design.md`

**Branch:** `fix/audit-steps-report-ownership` (already created; spec commit `38efb8f` lives here).

---

## Reference: why each change (read before starting)

- The `pipeline-auditor` agent (`agents/pipeline-auditor.md:5`) sets `disallowedTools: Write, Edit, Bash`. It can **never** write. Its protocol must say so plainly and hand persistence to the orchestrator.
- The orchestrator (driven by `commands/audit-steps.md`) is the real persister. It must ensure the `audit/` directory exists before writing, or the first write on a fresh pipeline fails.
- The `pipeline-architect` agent (`agents/pipeline-architect.md:4,9`) has `tools: …Write, Edit…` and a DELIVER protocol that writes files, but `permissionMode: plan` contradicts that. Align it to `acceptEdits` (matching `pipeline-task-executor`, the other file-producer) and fix the authoring rule that propagates `plan` to architects.
- **Do NOT modify** `pipeline-quality-reviewer`, `pipeline-spec-reviewer`, `pipeline-failure-analyzer`, or `pipeline-task-executor` — the sweep confirmed they are consistent. Reviewers/auditor/analyzer keep `permissionMode: plan`.
- **PowerShell BOM trap:** all four files are Markdown; edit them with the Edit tool (not `Set-Content -Encoding UTF8`). No JSON is touched in this plan.

---

## Task 1: Auditor protocol REPORT step — state read-only contract

**Files:**
- Modify: `skills/pipeline-auditor-protocol/SKILL.md:44-47`

- [ ] **Step 1: Verify the current text matches what the plan expects**

Run:
```bash
sed -n '44,47p' skills/pipeline-auditor-protocol/SKILL.md
```
Expected output:
```
### 3. REPORT
- Write the final report to `{ROOT}/.../audit/latest.md` using the template in `references/audit-report-template.md`.
- Emit an executive summary inline. If `Write` tools are disallowed, provide the registry update instruction as a plan.
- Record every audit, even those with zero findings.
```
If it differs, STOP and re-baseline against the live file before editing.

- [ ] **Step 2: Replace the REPORT step body**

Use the Edit tool on `skills/pipeline-auditor-protocol/SKILL.md`.

Replace exactly this block:
```markdown
### 3. REPORT
- Write the final report to `{ROOT}/.../audit/latest.md` using the template in `references/audit-report-template.md`.
- Emit an executive summary inline. If `Write` tools are disallowed, provide the registry update instruction as a plan.
- Record every audit, even those with zero findings.
```
with:
```markdown
### 3. REPORT
- The auditor is read-only (`disallowedTools: Write, Edit, Bash`) and NEVER writes the report file or mutates `registry.json`. Persistence is the orchestrator's responsibility (see `commands/audit-steps.md` REPORTING).
- Render the full report per `references/audit-report-template.md` as terminal output, and emit it inline together with the executive summary.
- Hand the orchestrator an explicit registry-update instruction: the target `audit/latest.md` path and the `last_audit` timestamp value to record.
- Record every audit, even those with zero findings.
```

- [ ] **Step 3: Verify the old phrasing is gone and the new contract is present**

Run:
```bash
grep -n "if \`Write\` tools are disallowed\|Write the final report" skills/pipeline-auditor-protocol/SKILL.md; echo "---"; grep -n "NEVER writes the report\|Persistence is the orchestrator" skills/pipeline-auditor-protocol/SKILL.md
```
Expected: the first grep returns NOTHING (no matches); the second grep returns two lines.

- [ ] **Step 4: Confirm the file is still well-formed around the edit**

Run:
```bash
sed -n '44,52p' skills/pipeline-auditor-protocol/SKILL.md
```
Expected: the new `### 3. REPORT` block followed immediately by the unchanged `### 4. FIX ROUTING` heading.

- [ ] **Step 5: Commit**

```bash
git add skills/pipeline-auditor-protocol/SKILL.md
git commit -m "fix(auditor): state read-only report contract; orchestrator owns persistence

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Command REPORTING step — orchestrator ensures audit/ dir before write

**Files:**
- Modify: `commands/audit-steps.md:29-33`

- [ ] **Step 1: Verify the current text matches what the plan expects**

Run:
```bash
sed -n '29,33p' commands/audit-steps.md
```
Expected output:
```
### 3. REPORTING
- Classify all findings by severity (SEV-0 to SEV-3).
- Write the report to `<scope-root>/superpipelines/pipelines/{P}/audit/latest.md`.
- Update the `last_audit` timestamp in `registry.json`.
- Present the executive summary inline to the user.
```
If it differs, STOP and re-baseline.

- [ ] **Step 2: Replace the REPORTING step body**

Use the Edit tool on `commands/audit-steps.md`.

Replace exactly this block:
```markdown
### 3. REPORTING
- Classify all findings by severity (SEV-0 to SEV-3).
- Write the report to `<scope-root>/superpipelines/pipelines/{P}/audit/latest.md`.
- Update the `last_audit` timestamp in `registry.json`.
- Present the executive summary inline to the user.
```
with:
```markdown
### 3. REPORTING
- Classify all findings by severity (SEV-0 to SEV-3).
- The auditor is read-only and never persists; the orchestrator owns persistence, in order:
  1. Ensure `<scope-root>/superpipelines/pipelines/{P}/audit/` exists, creating it if missing (idempotent — no-op if present). This MUST precede the write so a fresh pipeline's first audit cannot fail on a missing directory.
  2. Write the auditor's rendered report to `audit/latest.md`.
  3. Update the `last_audit` timestamp in `registry.json` per the auditor's instruction.
- Present the executive summary inline to the user. If the write fails after the directory is ensured, surface the error and the inline summary so findings are never lost.
```

- [ ] **Step 3: Verify the directory-ensure contract is present and ordered before the write**

Run:
```bash
grep -n "Ensure .*audit/\` exists\|MUST precede the write" commands/audit-steps.md
```
Expected: two matching lines (the ensure step and the ordering clause).

- [ ] **Step 4: Confirm the block is well-formed**

Run:
```bash
sed -n '29,40p' commands/audit-steps.md
```
Expected: the new `### 3. REPORTING` block followed by the unchanged `</protocol>` and `<invariants>` lines.

- [ ] **Step 5: Commit**

```bash
git add commands/audit-steps.md
git commit -m "fix(audit-steps): orchestrator ensures audit/ dir before writing report

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Architect frontmatter + authoring-rule alignment

**Files:**
- Modify: `agents/pipeline-architect.md:9`
- Modify: `skills/pipeline-architect-protocol/SKILL.md:89`

- [ ] **Step 1: Verify both current lines match what the plan expects**

Run:
```bash
sed -n '9p' agents/pipeline-architect.md; echo "---"; sed -n '89p' skills/pipeline-architect-protocol/SKILL.md
```
Expected output:
```
permissionMode: plan
---
- Set `permissionMode: plan` for reviewers and architects.
```
If either differs, STOP and re-baseline.

- [ ] **Step 2: Change the architect agent's permissionMode**

Use the Edit tool on `agents/pipeline-architect.md`.

Replace exactly:
```
permissionMode: plan
```
with:
```
permissionMode: acceptEdits
```
(This file has exactly one `permissionMode:` line — the frontmatter at line 9. The Edit will be unique.)

- [ ] **Step 3: Fix the authoring rule that propagates plan to architects**

Use the Edit tool on `skills/pipeline-architect-protocol/SKILL.md`.

Replace exactly:
```markdown
- Set `permissionMode: plan` for reviewers and architects.
```
with:
```markdown
- Set `permissionMode: plan` for read-only/advisory agents (reviewers, auditor, failure-analyzer); set `permissionMode: acceptEdits` for file-producing agents (architect, task-executor). The mode MUST match the agent's `tools:`/`disallowedTools:` capability and its protocol's write behavior.
```

- [ ] **Step 4: Verify both edits landed and `plan` is no longer prescribed for architects**

Run:
```bash
sed -n '9p' agents/pipeline-architect.md; echo "---"; grep -n "permissionMode: plan\` for reviewers and architects" skills/pipeline-architect-protocol/SKILL.md; echo "---"; grep -n "acceptEdits\` for file-producing agents" skills/pipeline-architect-protocol/SKILL.md
```
Expected: line 9 is `permissionMode: acceptEdits`; the middle grep returns NOTHING; the last grep returns one line.

- [ ] **Step 5: Confirm no clean agent was touched**

Run:
```bash
git diff --name-only
```
Expected: exactly `agents/pipeline-architect.md` and `skills/pipeline-architect-protocol/SKILL.md` (plus nothing from quality-reviewer, spec-reviewer, failure-analyzer, or task-executor).

- [ ] **Step 6: Commit**

```bash
git add agents/pipeline-architect.md skills/pipeline-architect-protocol/SKILL.md
git commit -m "fix(architect): align permissionMode acceptEdits with tools/DELIVER; correct authoring rule

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Final consistency audit of the whole change

**Files:** none modified — verification only.

- [ ] **Step 1: Re-run the frontmatter-vs-protocol sweep to confirm both defects are closed**

Run:
```bash
echo "=== auditor: no stale write claim ==="; grep -n "Write the final report\|if \`Write\` tools are disallowed" skills/pipeline-auditor-protocol/SKILL.md
echo "=== command: dir-ensure present ==="; grep -n "Ensure .*audit/\` exists" commands/audit-steps.md
echo "=== architect: acceptEdits ==="; sed -n '9p' agents/pipeline-architect.md
echo "=== authoring rule fixed ==="; grep -n "file-producing agents (architect, task-executor)" skills/pipeline-architect-protocol/SKILL.md
```
Expected: first grep empty; second grep one line; line 9 `permissionMode: acceptEdits`; last grep one line.

- [ ] **Step 2: Confirm reviewers still carry plan (must NOT have changed)**

Run:
```bash
grep -n "permissionMode: plan" agents/pipeline-quality-reviewer.md agents/pipeline-spec-reviewer.md agents/pipeline-auditor.md agents/pipeline-failure-analyzer.md
```
Expected: one `permissionMode: plan` match in each of the four files.

- [ ] **Step 3: Confirm the full set of changed files for the branch**

Run:
```bash
git diff --name-only main...HEAD
```
Expected exactly:
```
docs/superpowers/plans/2026-06-01-audit-steps-report-ownership.md
docs/superpowers/specs/2026-06-01-audit-steps-report-ownership-design.md
skills/pipeline-auditor-protocol/SKILL.md
commands/audit-steps.md
agents/pipeline-architect.md
skills/pipeline-architect-protocol/SKILL.md
```
(Order may vary.)

- [ ] **Step 4: Commit the plan document itself (if not already committed)**

```bash
git add docs/superpowers/plans/2026-06-01-audit-steps-report-ownership.md
git commit -m "docs(plan): audit-steps report-ownership implementation plan

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Notes for the implementer

- These are documentation/contract edits. There is no code to run and no test suite. The "tests" are the grep/sed verification commands embedded in each task — treat a failed expectation as a red build.
- Do not add the deferred follow-ups (generalized auditor criterion; empirical plan-mode verification) — they are explicitly out of scope per the spec.
- Keep third-person impersonal voice (CLAUDE.md authoring rule). The replacement text above already follows it.
- After all tasks, this branch is ready for a PR against `main`. Version bump is NOT part of this plan (handled at release time per the spec's Version Impact note).
