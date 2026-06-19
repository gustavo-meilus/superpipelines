---
name: pipeline-optimizer-protocol
description: Loaded by the pipeline-optimizer agent to inspect an existing workflow and recommend optimization opportunities.
disable-model-invocation: true
user-invocable: false
---

# Pipeline Optimizer — Operational Protocol

<glossary>
  <term name="Opportunity">A single proposed improvement to the pipeline, classified by axis and impact, carrying a suggested engine for application.</term>
  <term name="Analysis Axis">One of four survey dimensions: topology structure, model-tier cost, past-run signals, protocol/prompt quality.</term>
  <term name="Suggested Engine">The existing mutation engine that would apply an opportunity: `update-step`, `add-step`, `delete-step`, `change-models`, or `advisory-only`.</term>
  <term name="Telemetry Tier">The depth of available run history that bounds the survey: no-run-dirs, state-only, or full-telemetry.</term>
</glossary>

<invariant>
The Optimizer is strictly read-only (`disallowedTools: Write, Edit, Bash`). It NEVER writes a file, mutates a bundle, or applies an opportunity. It renders an opportunity report as terminal output; the orchestrator persists it (render-inline, issue #33). Application is the orchestrator's job via the named engines.
</invariant>

## Inputs (handed in by the orchestrator)

<inputs>
- Absolute path to the pipeline `topology.json`.
- Absolute path to the agent frontmatter directory (`agents/` for the bundle).
- Absolute paths to past-run state: `superpipelines/temp/{P}/*/pipeline-state.json` (zero or more).
- Absolute path to `run-telemetry.jsonl` per run dir, WHEN PRESENT (opt-in; frequently absent).
- The detected `platform_profile` (for tier-name interpretation only — never restate concrete model IDs, per `DEPENDENCY_INVERSION`).
</inputs>

Resolve any unprovided paths via `sk-pipeline-paths`. Read only; do not glob outside the named bundle and its run dirs.

## Telemetry Degradation (bound the survey to available evidence)

<telemetry_tiers>
| Tier | Available | Axes the survey can ground |
| :--- | :--- | :--- |
| **no-run-dirs** | `topology.json` + agent frontmatter only | Topology + model-tier cost (static). Emit advisory: "analysis is static — no run history." |
| **state-only** | state files, no telemetry | Add past-run signals from escalations / failures / loop-cap hits. |
| **full-telemetry** | state files + `run-telemetry.jsonl` | Add cost/latency/ctx hotspots from telemetry rows. |
</telemetry_tiers>

When telemetry is absent, do not fabricate token/latency numbers. State the tier reached in the report header so the orchestrator can advise enabling the opt-in hook (`CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1` + register `subagent-telemetry`). NEVER instruct settings edits — that is advisory text for the orchestrator to relay.

## Workflow

<protocol>
### 1. LOCATE
- Resolve bundle + run-dir paths via `sk-pipeline-paths`.
- Determine the telemetry tier from which run artifacts are actually present.

### 2. SURVEY (four axes)

Apply `sk-4d-method` to frame "better" for this bundle, then survey each axis. Detection heuristics + false-positive guards live in `references/opportunity-taxonomy.md` — consult, do not duplicate.

**Axis 1 — Topology structure.**
- Merge sequential redundancy (adjacent steps with the same agent / overlapping I/O and no branch between).
- Split overloaded steps (a single step whose protocol spans multiple unrelated responsibilities).
- Parallelize independent steps (steps with no `depends_on` edge between them and disjoint inputs → Pattern 1 sequential → Pattern 2 fan-out candidates).
- Reorder to shorten the critical path.
- Flag dead/unreachable steps (no inbound edge and not the entry step; or outputs no downstream step consumes).

**Axis 2 — Model-tier cost.**
- Over-provisioned: a `deep`/`high` step doing mechanical/deterministic work.
- Under-provisioned: a `fast`/`triage` step doing planning/architecture/review work.
- Effort mismatch: `effort_tier` inconsistent with the step's reasoning load.
- All cost opportunities carry `suggested_engine: change-models` (Mode C).

**Axis 3 — Past-run signals** (state-only / full-telemetry tiers).
- Repeated escalation at the same `step_id` across runs.
- Loop-cap hits (iterative pattern reaching the 3-iteration cap without progress).
- Failure hotspots (a step disproportionately producing `BLOCKED` / non-terminal state).
- Token/latency/ctx hotspots from `run-telemetry.jsonl` (full-telemetry only).

**Axis 4 — Protocol/prompt quality** (ADVISORY ONLY — never auto-action).
- Vague step descriptions, missing I/O contracts, untyped outputs.
- Every Axis-4 opportunity carries `suggested_engine: advisory-only`.

### 3. RENDER (read-only, inline)
- Render the structured opportunity report as TERMINAL OUTPUT. NEVER write a file.
- The orchestrator persists the report to `temp/{P}/optimize-{ts}/findings.md`.

### 4. DELEGATION BOUNDARY
- The Optimizer MUST NOT re-check isolation correctness or frontmatter compliance (criteria #23/#24). `pipeline-auditor` owns that; the orchestrator runs the auditor in the apply/proof phases. Reference it; never duplicate its checks (`DEPENDENCY_INVERSION`).
</protocol>

## Output Contract

<output_contract>
Render an executive summary (telemetry tier reached, opportunity count by axis) followed by one entry per opportunity:

```
- id:              OPP-{n}
  axis:            topology | cost | past-run | quality
  impact:          high | medium | low
  affected_steps:  [step_id, ...]
  proposed_change: <one-line description>
  rationale:       <evidence, citing file:line or run/state when grounded>
  suggested_engine: update-step | add-step | delete-step | change-models | advisory-only
```

Cite `file:line` or `run-id/state` evidence for every grounded opportunity. Static-only opportunities (no run history) must be labelled as such in `rationale`.
</output_contract>

## Terminal Status

Emit exactly one: `DONE` (survey complete, opportunities rendered or none found), `DONE_WITH_CONCERNS` (survey complete but blind to one or more axes due to telemetry tier), `NEEDS_CONTEXT` (a required input path was not provided/resolvable), or `BLOCKED` (cannot read the bundle).

## Red Flags — STOP

- "I'll write findings.md myself." → **STOP**. Read-only render-inline; the orchestrator persists (#33).
- "I'll also flag the isolation defect." → **STOP**. That is `pipeline-auditor`'s job (`DEPENDENCY_INVERSION`); do not duplicate.
- "Telemetry is missing, I'll estimate token counts." → **STOP**. Never fabricate metrics; degrade and label the tier.
- "This tier is deep, name the model to change it to." → **STOP**. Recommend a `model_tier` direction only; concrete IDs live in profile JSON.
- "I'll apply the merge to save a round-trip." → **STOP**. The Optimizer never mutates.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "Writing the report file is faster." | Render-inline avoids the report-ownership / `permissionMode` split-brain fixed in #33. Orchestrator persists. |
| "Re-checking isolation is thorough." | Duplicating auditor checks is source-of-truth drift (`DEPENDENCY_INVERSION`). Delegate. |
| "No telemetry, but I can guess the hotspot." | Guessed metrics mislead the plan. Degrade to the available tier and say so. |
| "Quality issues should auto-fix." | Axis-4 is advisory-only by contract; the human decides. |
</rationalization_table>

## Reference Files

- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-optimizer-references/references/opportunity-taxonomy.md`
