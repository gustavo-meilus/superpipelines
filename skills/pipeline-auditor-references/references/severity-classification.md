# Severity Classification — Auditor Reference

Findings classified into four severity tiers.

| Severity | Definition | Block ship? |
|----------|-----------|-------------|
| **SEV-0** | Hard blocker — pipeline will fail or produce silent data loss | YES |
| **SEV-1** | Quality issue — degraded behavior, wasted tokens, drift risk | Should fix before merge |
| **SEV-2** | Drift risk — works today, fragile under common changes | Track for next iteration |
| **SEV-3** | Style — token over-budget, suboptimal section ordering, missing examples | Optional |

---

## SEV-0 examples

- Subagent attempts to spawn children (`SUB_AGENT_SPAWNING: FALSE` violated).
- `memory: project` in agent frontmatter.
- `permissionMode: bypassPermissions` without inline justification in agent body.
- `memory: local` on a reviewer agent (reviewers must not persist heuristics).
- Tool churn mid-session (skills list mutated, tools added/removed).
- Missing required-field in plugin manifest.
- Reviewer agent has `Write` or `Edit` enabled (write/review isolation broken).
- Stage 2 dispatch without Stage 1 PASS gate.
- Worktree destroy without commit-before-destroy step.

## SEV-1 examples

- Agent body >150 lines.
- Skill body >500 lines.
- No output contract declared.
- Vague identity / no single goal.
- Over-tooled subagent (≥10 tools, most unused).
- Description not third-person.
- Missing `skills:` preload when 4D / SDD warranted.
- Pattern 3 used without max-iterations cap.
- `tasks.md` missing acceptance criteria for some tasks.

## SEV-2 examples

- No automated success criteria for agent self-verification.
- Generic chain-of-thought without role-specific framing.
- Token waste (boilerplate prose, redundant examples).
- Missing uncertainty permission ("if you don't know, ask").
- References nested >1 level deep from SKILL.md.
- Reference file >100 lines without ToC.
- Description >1024 chars (truncation).

## SEV-3 examples

- Suboptimal section ordering (Quick Reference before Overview).
- Slight token over-budget vs. peer agents.
- Missing concrete code example.
- Unix path inconsistency (Windows backslashes used in body).
- Inconsistent pronouns across sections.
- Stale model IDs cited in examples (e.g., `claude-3-5-sonnet`).

---

## Severity assignment rules

- A SEV-0 in any file blocks the pipeline. Surface immediately.
- SEV-1s aggregate per agent — three SEV-1s in one agent escalates to SEV-0 review (architectural rewrite warranted).
- A SEV-2 that compounds across multiple agents (e.g., all agents missing self-verification) is a SEV-1 architectural concern.
- SEV-3 issues are reported but never block.

## Reporting format

In the audit report, group findings by severity with most-severe first. Each finding includes:

- File path + line range.
- Compliance matrix criterion # (if applicable).
- Quoted evidence.
- Suggested fix (use `references/fix-templates.md`).
