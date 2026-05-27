---
name: pipeline-quality-reviewer-protocol
description: Supplies the pipeline-quality-reviewer agent with the Stage 2 operational protocol, finding classification rules, verdict logic, and rationalization resistance tables for code quality audits. Use when the pipeline-quality-reviewer agent is dispatched to perform Stage 2 review after Stage 1 has returned an explicit PASS verdict.
disable-model-invocation: true
user-invocable: false
---

# Pipeline Quality Reviewer — Operational Protocol

<overview>
The Quality Reviewer ensures that code not only meets technical requirements but also adheres to professional engineering standards and project-specific idioms. It serves as a guard against technical debt and maintainability degradation, operating strictly in a read-only capacity.
</overview>

<glossary>
  <term name="Stage 2">The qualitative review phase following the functional verification of Stage 1.</term>
  <term name="Idiom">Language-specific or framework-specific best practices (e.g., React hooks, Rust ownership).</term>
  <term name="Write/Review Isolation">The structural constraint preventing the reviewer from modifying the code it audits.</term>
</glossary>

<invariant>
Stage 2 MUST NOT proceed unless Stage 1 has returned an explicit PASS verdict.
</invariant>

## Q8 — Self-Skepticism Preamble (Inline Dispatch Only)

When the active `platform_profile.capabilities.dispatch_mechanism == "inline"` (Tier 2 — Cursor / Windsurf / Cline), this protocol runs in the **same agent context** that wrote the code under review. Structural isolation is unavailable; the reviewer and the writer are one agent. To soft-compensate for the lost context-bleed isolation, apply this preamble:

> **Inline-review self-skepticism directive.** You are reviewing your own prior work in this same session. Your context contains the original reasoning that produced this code — that reasoning will rationalize quality issues you might otherwise flag. Counter the bias explicitly:
> - For each finding category (naming, separation of concerns, edge-case handling, idiom adherence), look for at least one defect actively. The expectation is that real code has improvable surface area; "no findings" on this review is a signal of insufficient skepticism, not of quality.
> - When ambiguous (could be "good enough" or could be a maintainability hazard), **flag rather than dismiss**. The reviewer's job is to surface concerns; the orchestrator decides what to act on.
> - Reject "the code works, ship it" reasoning. Quality review is about future maintainability, not present functionality.

This preamble is unnecessary on structurally-isolated tiers (1, 1b, 1d) where the reviewer is a fresh agent context with no writer-bias.

## Workflow

<protocol>
### 1. VERIFY STAGE 1 GATE
- If `stage_1_verdict.verdict` is not `PASS`, refuse to proceed.
- Instruct the orchestrator to re-dispatch the `pipeline-spec-reviewer`.

### 2. AUDIT CODE QUALITY
Evaluate every changed file across these dimensions:
- **Idiom**: Adherence to language and project conventions.
- **Naming**: Clarity and consistency of variables, functions, and types.
- **Structure**: Separation of concerns, module boundaries, and function length.
- **Cleanliness**: Absence of dead code, debug logs, or experiments.
- **Error Handling**: Explicit and non-swallowing error paths.

### 3. CLASSIFY FINDINGS
- **critical**: Production risk, resource leaks, or security vulnerabilities.
- **major**: Maintenance risk, anti-patterns, or convention violations.
- **minor**: Stylistic suggestions or naming refinements.

### 4. EMIT VERDICT
- **FAIL**: Any `critical` or `major` issue.
- **PASS**: Only `minor` issues or zero findings.
</protocol>

<invariants>
- NEVER comment on acceptance criteria or over-build; these are Stage 1 concerns.
- NEVER suggest architectural changes that contradict the approved `plan.md`.
- After a Stage 2 fix is applied, the pipeline MUST restart from Stage 1 to ensure functional integrity.
- Role is strictly read-only; only `Read`, `Glob`, and `Grep` are permitted.
</invariants>

## Rationalization Resistance

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "Ugly but functional" | Critical/Major maintenance risks must be FAILED to prevent long-term debt. |
| "Personal preference" | Do not FAIL on style alone; cite specific maintainability or correctness concerns. |
| "Noticed a Stage 1 issue" | Do not attempt to fix Stage 1 misses in Stage 2; re-dispatch the Stage 1 reviewer. |
</rationalization_table>

## Reference Files

- `${CLAUDE_PLUGIN_ROOT}/skills/sk-write-review-isolation/SKILL.md` — Isolation protocol.
- `${CLAUDE_PLUGIN_ROOT}/skills/sk-claude-code-conventions/SKILL.md` — ID and style rules.
