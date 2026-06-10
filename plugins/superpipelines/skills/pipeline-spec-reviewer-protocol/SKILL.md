---
name: pipeline-spec-reviewer-protocol
description: Supplies the Stage 1 functional-verification protocol to the pipeline-spec-reviewer agent: acceptance-criteria compliance checks, under-build/over-build detection, binary verdict emission, and rationalization resistance. Use when the pipeline-spec-reviewer agent activates to verify that an executor's output matches its specification before Stage 2 may proceed.
disable-model-invocation: true
user-invocable: false
---

# Pipeline Spec Reviewer — Operational Protocol

<overview>
The Spec Reviewer serves as the functional gatekeeper, ensuring that implementations match their specifications with zero scope creep. It operates as a binary pass/fail gate; Stage 2 (Quality Review) cannot commence until Stage 1 returns a PASS.
</overview>

<glossary>
  <term name="Stage 1">The functional verification phase focused on acceptance criteria (AC) compliance.</term>
  <term name="Under-build">Failure to meet one or more mandatory acceptance criteria.</term>
  <term name="Over-build">Scope creep, including unrequested features or modifications to files outside the allowlist.</term>
</glossary>

<invariant>
The Spec Reviewer MUST NOT comment on code quality, idioms, or style; these are strictly Stage 2 concerns.
</invariant>

## Q8 — Self-Skepticism Preamble (Inline Dispatch Only)

When the active `platform_profile.capabilities.dispatch_mechanism == "inline"` (Tier 2 — Cursor / Windsurf / Cline), this protocol runs in the **same agent context** that wrote the code under review. Structural isolation is unavailable; the reviewer and the writer are one agent. To soft-compensate for the lost assumption-blindness defense, apply this preamble:

> **Inline-review self-skepticism directive.** You are reviewing your own prior work in this same session. Your context already contains the reasoning that produced the code under review — that reasoning will bias you toward accepting it. Counter the bias explicitly:
> - Treat every acceptance criterion as a binary check; do not extrapolate intent from the spec to cover gaps in the implementation.
> - When in doubt about whether an AC is met, **flag rather than pass**. The default is FAIL; PASS requires affirmative evidence.
> - List the specific lines / files that satisfy each AC. If you cannot point to lines, the AC is unverified.
> - Reject any "the spirit of the AC is met" reasoning. Spec compliance is mechanical, not interpretive.

This preamble is unnecessary on structurally-isolated tiers (1, 1b, 1d) where the reviewer is a fresh agent context.

## Workflow

<protocol>
### 1. ANALYZE REQUIREMENTS
- Read `spec.md` and the task description to refresh acceptance criteria.
- Extract task-specific ACs from `tasks.md`.

### 2. VERIFY COMPLIANCE
Evaluate the executor's output against each AC:
- **MET**: AC is fully satisfied by the output.
- **UNDER-BUILD**: AC is missing or partially satisfied. Triggers a FAIL.

### 3. AUDIT SCOPE CREEP
Check every modified file for over-build:
- **File Allowlist**: Were any files modified outside the task's `files` list?
- **Unrequested Features**: Are there new functions, helpers, or features not defined in the spec?
- **Note**: "Useful extras" are treated as contract violations. Triggers a FAIL.

### 4. EMIT VERDICT
- **PASS**: All ACs met and zero over-build detected.
- **FAIL**: Any instance of under-build or over-build.
</protocol>

<invariants>
- Stage 1 is binary; "mostly met" is a FAIL.
- Unclear acceptance criteria result in a FAIL to ensure the specification is corrected.
- The reviewer role is strictly read-only; use `Read`, `Glob`, and `Grep` exclusively.
</invariants>

## Rationalization Resistance

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "Useful over-build" | Creep violates the contract parallel workers depend on; FAIL always. |
| "Mostly met" | Mostly = Under-build. Functional correctness is not a gradient. |
| "Trust the executor" | Executors cannot review themselves. Verify every AC against the actual output. |
</rationalization_table>

## Reference Files

- `${CLAUDE_PLUGIN_ROOT}/skills/sk-write-review-isolation/SKILL.md` — Isolation protocol.
- `${CLAUDE_PLUGIN_ROOT}/skills/sk-claude-code-conventions/SKILL.md` — Formatting rules.
