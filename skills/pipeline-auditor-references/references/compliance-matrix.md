# Compliance Matrix — Auditor Reference

20-criterion checklist for `pipeline-auditor`. Applied to every file in a pipeline bundle.
Each criterion: PASS / FAIL / PARTIAL / N/A with cited file:line evidence.

## Table of contents

1. Layout & registry (criteria 1–5)
2. Frontmatter (criteria 6–11)
3. Topology (criteria 12–16)
4. Runtime safety (criteria 17–20)

---

## 1. Layout & registry

| # | Criterion | PASS condition |
|---|-----------|----------------|
| 1 | Files under correct scope root | Agents at `agents/superpipelines/{P}/`; skills at `skills/superpipelines/{P}/`; support files at `superpipelines/pipelines/{P}/` — all under the correct scope root resolved by `sk-pipeline-paths` |
| 2 | Registry entry present | `registry.json` in the scope root has an entry for this pipeline with all required fields (`name`, `scope`, `created_at`, `pattern`, `entry_skill`, `agents`, `skills`, `topology_path`, `last_audit`) |
| 3 | Registry consistent with disk | `registry.json[].agents` and `[].skills` match files on disk exactly; `topology_path` resolves to a readable file |
| 4 | Entry skill correctly flagged | `run-{P}/SKILL.md` has `disable-model-invocation: true` AND `user-invocable: true` in frontmatter |
| 5 | Internal skills suppressed | Every skill under `skills/superpipelines/{P}/` other than `run-{P}` has `user-invocable: false` in frontmatter |

## 2. Frontmatter

| # | Criterion | PASS condition |
|---|-----------|----------------|
| 6 | `name` valid | Lowercase + hyphens only, ≤64 chars, matches filename (without `.md`) |
| 7 | `description` triggering-only | Third person, ≤1024 chars, no workflow summary, no first/second person ("I", "you") |
| 8 | `model` appropriate | `sonnet` by default; any non-sonnet model must have a justification comment in the agent body or Architect's Brief |
| 9 | Core agent fields set | `effort` (one of `low/medium/high/xhigh/max`), `maxTurns` (integer), `version` (semver string) all present |
| 10 | `permissionMode` valid | If present: one of `default \| acceptEdits \| plan \| bypassPermissions`; `bypassPermissions` requires an inline justification comment in the agent body |
| 11 | `memory` valid | If present: `none` or `local` only. `memory: project` is a hard SEV-0 violation |

## 3. Topology

| # | Criterion | PASS condition |
|---|-----------|----------------|
| 12 | `topology.json` schema valid | Valid JSON; required top-level keys present; every step has `id`, `depends_on`, `inputs`, `outputs` (see `topology-rules.md` §1) |
| 13 | Agent coverage | Every non-null `step.agent` has a corresponding file; agent `name` frontmatter matches the `agent` field value |
| 14 | Dependency graph integrity | No dangling `depends_on` ids; no orphan steps; topological sort succeeds for non-pattern-3 graphs |
| 15 | Edge consistency | Step inputs reference valid producers; output-input type compatibility preserved where schemas are declared |
| 16 | Spec ↔ tasks coverage | Every acceptance criterion in `spec.md` maps to ≥1 task in `tasks.md`; no orphan tasks (tasks without a corresponding AC) |

## 4. Runtime safety

| # | Criterion | PASS condition |
|---|-----------|----------------|
| 17 | Temp path convention | State and outputs stored at `{ROOT}/superpipelines/temp/{P}/{runId}/` — no `tmp/` or hardcoded absolute paths |
| 18 | No hardcoded absolute paths in agent bodies | Agent bodies reference paths via a scope-root variable (`${SCOPE_ROOT}` or equivalent), never literal `/home/...` or `~/.claude/...` |
| 19 | Write/review isolation honored | Review-role agents (`*-spec-reviewer`, `*-quality-reviewer`) have `disallowedTools: Write, Edit, Bash` (or equivalent) in frontmatter |
| 20 | Cleanup contract present in entry skill | Entry skill body explicitly: (a) writes `status: completed` to `pipeline-state.json` on success, (b) deletes `temp/{P}/{runId}/` on DONE, (c) preserves temp on ESCALATED/FAILED/BLOCKED |

---

## How to use

1. Read each target file with `Read`.
2. Walk criteria 1–20 in order. Mark each PASS / FAIL / PARTIAL / N/A.
3. For every FAIL or PARTIAL: cite the file path, line number, and quoted evidence.
4. Assign severity per `severity-classification.md`.
5. Emit the audit report per `audit-report-template.md`.

Mark PARTIAL when a criterion is half-met (e.g., description has triggering conditions but also contains a workflow summary sentence). Do NOT guess on ambiguous cases — mark PARTIAL and explain.
