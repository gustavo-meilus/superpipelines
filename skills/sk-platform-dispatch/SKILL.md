---
name: sk-platform-dispatch
description: Use when an orchestrator skill needs to dispatch pipeline steps and the runtime tier is unknown — provides tier detection and a single-agent inline DISPATCH protocol for Tier 2 platforms (Cursor, Windsurf, Cline). Tier 1/1b/1c/1d orchestrators short-circuit to native subagent dispatch.
disable-model-invocation: true
user-invocable: false
---

# Platform Dispatch — Tier Detection & Tier 2 Inline Execution

> Resolves the active execution tier and provides the canonical single-agent dispatch loop for Tier 2 platforms. Preloaded by `running-a-pipeline`. Trigger when dispatching any pipeline step without prior tier knowledge.

<overview>
Superpipelines runs across five runtime tiers (Tier 1 Claude Code, Tier 1b OpenCode, Tier 1c Antigravity, Tier 1d Codex, Tier 2 IDE agents). Only Tier 1 has a skill-callable `Task()` primitive. Tier 1b/1c/1d use model-driven or platform-native subagent dispatch outside the skill layer. Tier 2 has no subagent primitive at all — the orchestrator executes every step inline using its own toolset. This skill encapsulates that branch so orchestrator skills remain tier-agnostic.
</overview>

<glossary>
  <term name="Tier">Runtime execution capability class. Tier 1 = skill-callable parallel subagents; Tier 2 = single-agent inline.</term>
  <term name="DISPATCH">The contract for executing one topology step: input schema, execution mechanism, output schema, status return.</term>
  <term name="Inline Step">A pipeline step executed by the orchestrator itself rather than by a spawned subagent.</term>
</glossary>

## Tier Detection Protocol

<protocol>
DETECT() returns one of: `tier_1`, `tier_1b`, `tier_1c`, `tier_1d`, `tier_2`.

Detection signals are checked in order; first match wins:

1. **Tier 1 (Claude Code):** `Task` tool present in the orchestrator's tool list AND `subagent_type` parameter accepted. Secondary signal: `CLAUDE_CODE` env var set OR `.claude-plugin/plugin.json` resolvable via `${CLAUDE_PLUGIN_ROOT}`.
2. **Tier 1b (OpenCode):** `$OPENCODE_PLUGIN_ROOT` env var set OR agent files using `mode: subagent` frontmatter present under the active scope root.
3. **Tier 1c (Antigravity):** `agy` binary on PATH OR `.agents/skills/` workspace directory present. **Aspirational:** If a Dynamic Subagent dispatch primitive is exposed to skills, treat as Tier 1c; otherwise fall back to Tier 2.
4. **Tier 1d (Codex):** `.codex-plugin/plugin.json` resolvable OR TOML agent files present under `${CODEX_PLUGIN_ROOT}/agents/`.
5. **Tier 2 (fallback):** None of the above. Safe default — sequential inline execution always works.
</protocol>

<invariant>
Tier detection is performed exactly once per orchestrator invocation and cached in the run's `pipeline-state.json` as `metadata.tier`. Re-detection mid-run is forbidden — a runtime switch invalidates state assumptions.
</invariant>

## DISPATCH Contract

<schema>
Inputs to DISPATCH(step, inputs):
- `step.id`           — string, topology node id
- `step.agent`        — string, agent name (used by Tier 1 / 1b / 1d)
- `step.protocol_skill` — string, the `{agent-name}-protocol` skill name (used by Tier 2)
- `step.output_paths` — array of absolute paths the step is expected to produce
- `inputs`            — object, key/value inputs resolved from upstream step outputs

Returns:
- `{ status: "DONE" | "DONE_WITH_CONCERNS" | "NEEDS_CONTEXT" | "BLOCKED", outputs: [path...], concerns?: string, missing_context?: string, blocker?: string }`
</schema>

## Tier-Specific DISPATCH Behavior

<dispatch_tiers>
| Tier | Mechanism | Reviewer isolation |
|------|-----------|--------------------|
| Tier 1 | `Task(subagent_type=step.agent, prompt=build_prompt(step, inputs))` | Structural — reviewer agent's `tools:` frontmatter omits Write/Edit |
| Tier 1b | OpenCode native subagent dispatch via `mode: subagent` agent file | Structural — reviewer agent's `permission: { edit: deny }` |
| Tier 1c | Antigravity Dynamic Subagent (if primitive exposed); else fall through to Tier 2 | Unverified — treat as advisory until confirmed |
| Tier 1d | Skill emits an orchestration prompt instructing the model to fan out per `topology.json`; the orchestrating Codex model spawns subagents from the TOML registry per its native behavior. Skill does NOT call a dispatch primitive on this tier. | TOML `sandbox_mode` — verify per-agent tool restriction |
| Tier 2 | Inline loop in orchestrator session (see Tier 2 Inline Loop below) | None — convention only |
</dispatch_tiers>

## Tier 2 Inline Loop

<protocol>
The orchestrator (the model running the entry skill) executes every step using its own tools. There is no subagent boundary.

For each step in `topology.json` (dependency order):

1. **Load protocol**: `Skill(step.protocol_skill)` — loads the agent's full protocol into the orchestrator's context.
2. **Resolve inputs**: read upstream step outputs from disk using paths recorded in `pipeline-state.json[phases][upstream].outputs`.
3. **Execute inline**: the orchestrator performs the protocol's actions using `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`. No `Task()` call.
4. **Persist outputs**: write all output files to the paths declared in `step.output_paths`.
5. **Self-verify**: run the protocol's stated verification steps inline. Capture pass/fail.
6. **Update state**: append phase entry to `pipeline-state.json` with `status`, `outputs`, `error` via the atomic write pattern from `sk-pipeline-state`.
7. **Status check**: emit one terminal status per the contract above.
8. **Branch on status**:
   - `DONE` → proceed to next step.
   - `DONE_WITH_CONCERNS` → read concerns; proceed if observational; address inline if correctness/scope.
   - `NEEDS_CONTEXT` → re-execute the step with added context loaded from the named files. Bounded retry: maximum 2 attempts.
   - `BLOCKED` → set `state.status = "escalated"`, preserve temp dir, surface to user with the blocker text, stop the loop.

**Parallel patterns (Pattern 2 / 2b) degrade to sequential on Tier 2.** The dispatch loop processes branch workers one at a time in declared order. A merger step receives all branch outputs only after each branch finishes sequentially.

**Iterative patterns (Pattern 3) execute inline.** The orchestrator runs tester → analyzer → fixer in the same session; cycle limit (3) and architectural-escalation gate from `dispatch-protocols.md` Pattern 3 still apply.

**Spec-Driven (Pattern 5) on Tier 2:** Tasks execute sequentially. Each task's two-stage review runs inline — the orchestrator reads `spec.md`, applies the spec-reviewer protocol, then applies the quality-reviewer protocol. **Reviewer isolation is convention-only.** The orchestrator runs both writer and reviewer protocols with its own full toolset. There is no structural barrier preventing a reviewer from writing. Document this degradation in any user-facing report and treat Tier 2 reviews as advisory, not structurally enforced.
</protocol>

## Per-Tier Scope-Root Resolution

<scope_roots_per_tier>
| Tier | Scope-root fallback chain (first writable wins) |
|------|-------------------------------------------------|
| Tier 1 (CC) | `<workspace>/.claude/` → `~/.claude/` |
| Tier 1b (OC) | `<workspace>/.opencode/` → `~/.opencode/` |
| Tier 1c (Antigravity) | `<workspace>/.agents/` → `~/.gemini/antigravity/` |
| Tier 1d (Codex) | `<workspace>/.codex/` → `~/.codex/` |
| Tier 2 (Cursor/Windsurf/Cline) | `<workspace>/.superpipelines/` (universal fallback — created on demand) |
</scope_roots_per_tier>

`sk-pipeline-paths` resolves scope-root by reading `metadata.tier` from the pipeline state and walking the chain above. For Tier 2, if a pipeline was scaffolded on CC (paths reference `.claude/`), the dispatch layer rewrites `.claude/` → `.superpipelines/` at read/write time so portable artifacts continue to resolve. This rewrite is invertible: state files stamp the original scope-root string for auditability.

<invariant>
Path resolution MUST consult `metadata.tier` for any artifact write on a non-CC tier. Hardcoded `.claude/` paths in scaffolding output break `ARTIFACT_PORTABILITY: CC_AND_CODEX_TO_TIER2`.
</invariant>

## Tier 2 Degradation Surfacing

The Tier 2 reviewer-isolation degradation MUST be surfaced in two places:

1. **At run start** — `running-a-pipeline` Phase 0.25 prints a one-line stderr advisory: `"⚠️ Tier 2 ({platform}) detected. Reviewer isolation is convention-only; reviews are advisory."`
2. **At run end** — the entry skill's completion summary includes a footer: `"REVIEW_ISOLATION: CONVENTION_ONLY (Tier 2). Treat all spec/quality review verdicts as advisory."` This footer is also written to `pipeline-state.json` as `metadata.isolation_warning` so post-hoc audits surface it without re-running.

The same surfacing applies on Tier 1c (if Tier 1c falls back to Tier 2) and on Tier 1d (until per-agent `sandbox_mode` is verified). Tier 1 / Tier 1b emit no advisory — isolation is structural.

## Worktree Behavior

<worktree_rules>
| Tier | Worktree |
|------|----------|
| Tier 1 | Per-subagent via `isolation: worktree` agent frontmatter |
| Tier 1b | None (OC does not expose worktree primitive) |
| Tier 1c | Unverified |
| Tier 1d | Per-thread at app level (not per-subagent) |
| Tier 2 | None — orchestrator works in the user's active workspace |
</worktree_rules>

On Tier 2, the orchestrator MUST verify the workspace is clean (no uncommitted changes) before starting a destructive step, and MUST commit between steps to enable rollback. If the workspace is dirty, surface to user and stop.

## Status Protocol Reference

| Worker status | Orchestrator action (any tier) |
|---------------|--------------------------------|
| `DONE` | Proceed to next phase. |
| `DONE_WITH_CONCERNS` | Read concerns. If correctness/scope: address before review. If observational: proceed. |
| `NEEDS_CONTEXT` | Identify missing context; re-dispatch with same model + added context. Max 2 retries on Tier 2. |
| `BLOCKED` | (1) provide more context; (2) higher effort/model (Tier 1 only); (3) decompose; (4) escalate. NEVER retry same approach. |

<invariants>
- NEVER perform tier detection more than once per run; cache result in `metadata.tier`.
- NEVER call `Task()` on Tier 2 — the tool is absent and the call will fail or be ignored.
- NEVER suppress the Tier 2 reviewer-isolation degradation warning; surface it in every user-facing summary.
- Tier 2 inline execution MUST update `pipeline-state.json` after every step, not at end of run.
</invariants>

## Red Flags — STOP

- "I'll skip tier detection since I know this is Claude Code." → **STOP**. Detection is cheap; explicit caching enables resume from any tier-aware checkpoint.
- "I'll call `Task()` from the Tier 2 inline loop." → **STOP**. Tier 2 has no `Task()` primitive; the call fails. Use inline `Skill` + own tools.
- "Reviewer ran clean on Tier 2, so the code is verified." → **STOP**. Tier 2 reviewer isolation is convention-only. Surface the degradation to the user; do not promote advisory reviews to structural guarantees.
- "I'll re-detect tier after a tool failure to see if something changed." → **STOP**. Tier is immutable per run. A tool failure is a tool failure, not a tier change.

## Reference Files

- `pipeline-runner-references/references/dispatch-protocols.md` — Tier-specific dispatch shapes.
- `sk-pipeline-state/SKILL.md` — State schema (including `metadata.tier`).
- `sk-pipeline-patterns/SKILL.md` — Pattern definitions referenced by Tier 2 inline loop.
- `running-a-pipeline/SKILL.md` — Loads this skill in Phase 0.25.
