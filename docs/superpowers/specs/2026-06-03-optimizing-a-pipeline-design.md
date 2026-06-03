# optimizing-a-pipeline — Design Spec

> Status: APPROVED (grilled 2026-06-03). Target plugin version: **2.2.0** (new feature → minor bump from 2.1.3).

## Problem

There is no on-demand way to take an *existing* pipeline and find/apply structural improvements — merge redundant steps, split overloaded ones, parallelize independent ones, right-size model tiers, or act on past-run pain. `creating-a-pipeline` only builds new; `update/add/delete-step` mutate one step at a time with no whole-topology survey and no cross-change reasoning. Users want a guided "optimize this pipeline" workflow that surveys, proposes, gets approval, and applies a coherent multi-change plan safely.

## Goal

A new on-demand workflow `optimizing-a-pipeline` (command `/superpipelines:optimize-pipeline`) that: surveys a selected pipeline via a dedicated read-only analyst agent; runs a discovery session (4D → brainstorming → grilling) to lock an optimization plan with the user; batch-applies the approved plan atomically through the existing mutation/model engines; and proves the result with a mandatory static audit (+ optional live smoke-run). Plus a hook-based telemetry capture so future runs feed cost/latency signals into the analysis.

## Non-Goals

- No automated runtime benchmark / parity gate (`PARITY_TESTING: MANUAL_PHASE1` unchanged).
- No re-implementation of isolation/frontmatter compliance checks — those stay owned by `pipeline-auditor` (`DEPENDENCY_INVERSION`).
- No new model-tier resolution logic — tier changes delegate to `change-models` Mode C.
- Telemetry is **not** on by default; no auto-edit of user settings.

## Architecture

### Components (new)

| Artifact | Kind | Notes |
|---|---|---|
| `skills/optimizing-a-pipeline/SKILL.md` | orchestration skill | `user-invocable: false`; gerund-named like `creating-a-pipeline`. Owns the whole workflow. |
| `commands/optimize-pipeline.md` | slash command | imperative-named like `new-pipeline`/`update-step`. Thin wrapper → loads the skill. |
| `agents/pipeline-optimizer.md` | zero-body worker agent | read-only analyst, mirrors `pipeline-auditor` frontmatter. |
| `skills/pipeline-optimizer-protocol/SKILL.md` | protocol skill | `disable-model-invocation: true`, `user-invocable: false`. Full survey protocol. |
| `skills/pipeline-optimizer-references/` | reference dir (no SKILL.md) | opportunity taxonomy + heuristics catalog (ToC if >100 lines). |
| `hooks/subagent-telemetry` | hook script (extensionless, polyglot) | `SubagentStop` capture → `run-telemetry.jsonl`. Ships **disabled by default**. |

### Modified

| Artifact | Change |
|---|---|
| `skills/sk-pipeline-grilling/SKILL.md` | add **`MODE=optimization`** (interrogate user against analyst findings, one opportunity at a time, reconcile). |
| `skills/using-superpipelines/SKILL.md` | add routing-table row `/optimize-pipeline → optimizing-a-pipeline`. |
| `.claude-plugin/marketplace.json`, `package.json`, `.version-bump.json`, `CLAUDE.md` | version bump to 2.2.0 at release (separate gate). |
| `README.md` | document the new command. |

### `pipeline-optimizer` agent — frontmatter contract

Mirrors `pipeline-auditor` (read-only analyst):
```yaml
tools: Read, Glob, Grep
disallowedTools: Write, Edit, Bash
model_tier: deep        # whole-topology analysis = planning/architecture class
effort_tier: high
permissionMode: plan
# NO isolation field (data/analysis agent — runs in host cwd, issue #31)
skills:
  - sk-4d-method
  - sk-pipeline-paths
  - pipeline-optimizer-protocol
```
**Read-only render-inline (issue #33):** the agent NEVER writes. It renders the opportunity report as terminal output; the orchestrator persists it. This avoids the report-ownership / `permissionMode` split-brain fixed in #33.

**One multi-goal worker (2026 research):** all four analysis axes read the same small artifact set (`topology.json` + agent frontmatter + state files + telemetry log). Splitting into per-axis workers pays the documented 58–285% multi-agent token overhead with zero specialization gain. Single worker. (Sources: orchestrator-worker is ~70% of 2026 production but only pays when sub-tasks need genuine domain specialization or parallelism — these don't.)

### Analysis axes (the optimizer's protocol)

1. **Topology structure** — merge sequential redundancy, split overloaded steps, parallelize independent steps (Pattern 1→2 candidates), reorder, flag dead/unreachable steps.
2. **Model-tier cost** — flag over-provisioned (`deep` doing trivial work) / under-provisioned steps. Recommendation routes to `change-models` Mode C.
3. **Past-run signals** — read `superpipelines/temp/{P}/*/pipeline-state.json` for escalations, failures, loop-cap hits; read `run-telemetry.jsonl` for token/latency/ctx hotspots when present.
4. **Protocol/prompt quality** — soft advisory only (vague descriptions, missing I/O contracts). No auto-action.

Isolation-correctness is **delegated** to `pipeline-auditor` (the optimizer calls it; never re-checks #23/#24 itself).

### Telemetry capture (sub-feature)

**Constraint:** per-subagent token usage is NOT exposed to the orchestrator model (Anthropic issues #21837, #22625). Therefore the log MUST be hook-authored, not model-authored.

- `SubagentStop` hook reads `~/.claude/agent-metrics.jsonl` (per-invocation `input_tokens`/`output_tokens`/`cache_read`/`cache_creation`) and/or the transcript, and appends a row to `superpipelines/temp/{P}/{runId}/run-telemetry.jsonl`:
  `{ ts, step_id, agent, model, input_tok, output_tok, cache_read, cache_creation, ctx_size, duration_ms, status }`.
- `ctx_size` ≈ cumulative transcript tokens at the step boundary.
- **Opt-in + advisory:** ships disabled. The optimizer degrades gracefully across three tiers: (a) no run dirs → topology/cost axes only + "analysis is static" advisory; (b) state files but no telemetry → escalation/failure/loop signals; (c) full telemetry → add cost/latency signals. On first optimize with telemetry off, emit how to enable (`CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1` + register the hook). NEVER auto-edit settings.

## Workflow (skill phases)

- **Phase 0 — Selection.** Multi-scope registry discovery (reuse `running-a-pipeline` Phase 0 pattern); user picks `{P}`. Tier-detect via `sk-platform-dispatch`.
- **Phase 0.5 — No-active-run soft gate.** Scan `temp/{P}/*` for non-terminal state. If a `running`/`escalated` run exists → ask the user: **(a) discard those run states** and proceed, or **(b) abort** and handle manually. Never silently mutate under a live run.
- **Phase 1 — Survey.** Dispatch `pipeline-optimizer` (profile-driven dispatch, same branching as creating-a-pipeline Phase 4). It renders the opportunity report; orchestrator persists to `temp/{P}/optimize-{ts}/findings.md`.
- **Phase 2 — Discovery.** `sk-4d-method` (define "better" for this pipeline) → `superpipelines:brainstorming` (divergent: alternative redesigns/trade-offs) → `sk-pipeline-grilling MODE=optimization` (convergent: lock each opportunity one at a time, reconcile against discovered constraints).
- **Phase 3 — Plan gate (single human approval).** Present the optimization plan: opportunities chosen, the resulting topology diff, model-tier diffs, predicted effect. ONE `AskUserQuestion` approval. (Plan-gate + batch-apply: a multi-change optimization is one semantic change; its parts interact and must be approved/audited/promoted together.)
- **Phase 4 — Batch apply.** Pre-mutation snapshot (`edit-{ts}/backup/` + git checkpoint). Stage ALL changes in one `edit-{ts}/`: topology changes via architect STEP-* modes + the `update/add/delete-step` engine; model-tier changes via `change-models` Mode C. ONE combined `pipeline-auditor` DELTA pass over the whole delta (SEV-0/1 must be 0). All-or-nothing atomic promotion; rollback from snapshot on any failure. Bump `plugin_version`; stamp `topology.metadata.optimization = { ts, opportunities_applied:[...], baseline_ref }`.
- **Phase 5 — Post-apply proof.** MANDATORY full `pipeline-auditor` pass + graph-integrity check (all `depends_on` resolve, no orphan edges, I/O contracts chain). Any failure → auto-rollback. Then OFFER an optional live smoke-run via `running-a-pipeline`. Write durable `superpipelines/pipelines/{P}/optimization-report-{ts}.md`.

## Safety invariants

- No mutation under a live run (soft gate w/ discard-or-abort choice).
- Snapshot + git checkpoint before any production write.
- All-or-nothing promotion; rollback on audit/graph/promotion failure.
- SEV-0/1 == 0 gates both the DELTA (pre-promote) and full (post-promote) audits.
- `plugin_version` re-stamped on `topology.json`, registry entry, every touched agent.
- Optimizer is read-only; orchestration only at top level (`SUB_AGENT_SPAWNING: FALSE`).

## Open decisions (resolved by convention)

- Read-only render-inline analyst (#33). · `model_tier: deep`. · Tier changes → `change-models` Mode C. · New `sk-pipeline-grilling MODE=optimization`. · Telemetry opt-in + advisory.

## Sources (web research, 2026)

- Multi-agent overhead / when specialization pays: agentsindex.ai, decodethefuture.org, dev.to multi-agent guides.
- Agent observability / token+ctx telemetry: Braintrust, Uptrace (OpenTelemetry GenAI), Portkey.
- CC token-usage exposure gap: Anthropic claude-code issues [#21837](https://github.com/anthropics/claude-code/issues/21837), [#22625](https://github.com/anthropics/claude-code/issues/22625); CC OTEL docs + agent-metrics.jsonl.
