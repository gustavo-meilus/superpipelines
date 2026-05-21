# Multi-Platform Sub-Plan 2 — sk-platform-dispatch + Tier 2 Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `sk-platform-dispatch` skill (tier detection + Tier 2 single-agent dispatch protocol), wire it into `running-a-pipeline` Phase 0, and document the Tier 2 dispatch shape in `pipeline-runner-references`.

**Architecture:** One new skill (`skills/sk-platform-dispatch/SKILL.md`) — `disable-model-invocation: true`, `user-invocable: false`, preloaded by `running-a-pipeline`. Two existing files modified: `running-a-pipeline/SKILL.md` (new Phase 0.25 "Tier Detect & Dispatch Load") and `pipeline-runner-references/references/dispatch-protocols.md` (new Tier 2 section). Tier 2 execution loops over `topology.json` steps inline using the orchestrator's own tools (no `Task()`).

**Tech Stack:** Markdown skill body, JSON schema embedded, pseudocode for dispatch logic. No runtime code outside the orchestrator's own tool usage.

---

## File Structure

**Create:**
- `skills/sk-platform-dispatch/SKILL.md` — Tier detection + DISPATCH protocol (≤500 lines).

**Modify:**
- `skills/running-a-pipeline/SKILL.md` — Insert Phase 0.25 (tier detect & load); add Tier-1 vs Tier-2 branch annotation to Phase 3.
- `skills/pipeline-runner-references/references/dispatch-protocols.md` — Append "Tier 2 — Single-Agent Inline" section; update Table of Contents.
- `skills/pipeline-architect-protocol/SKILL.md` — Require generated entry skills to route every step through `sk-platform-dispatch` DISPATCH instead of hardcoded `Task()` calls (closes F2.4).
- `skills/sk-pipeline-paths/SKILL.md` — Add per-tier scope-root table + `PORTABILITY_REWRITE` protocol so `ARTIFACT_PORTABILITY: CC_AND_CODEX_TO_TIER2` actually holds (closes X5).

**Unchanged:** All agents, all other skills, all commands, all hooks.

**Depends on Sub-Plan 1:** Phase 0.5 (version advisory) already inserted. This sub-plan inserts Phase 0.25 *between* Phase 0 and Phase 0.5.

---

## Task 1: Create sk-platform-dispatch SKILL.md

**Files:**
- Create: `skills/sk-platform-dispatch/SKILL.md`

- [ ] **Step 1: Confirm parent dir is empty / does not exist**

Run: `ls skills/sk-platform-dispatch/ 2>&1 || echo MISSING`
Expected: `MISSING` or empty listing.

- [ ] **Step 2: Write the skill file**

Create file at `skills/sk-platform-dispatch/SKILL.md` with this exact content:

````markdown
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
````

- [ ] **Step 3: Verify line count fits the ≤500-line authoring rule**

Run: `wc -l skills/sk-platform-dispatch/SKILL.md`
Expected: a number ≤ 500.

- [ ] **Step 4: Verify description ≤1024 chars**

Run: `awk '/^description:/{sub(/^description: */,""); print length}' skills/sk-platform-dispatch/SKILL.md`
Expected: a number ≤ 1024.

- [ ] **Step 5: Commit**

```bash
git add skills/sk-platform-dispatch/SKILL.md
git commit -m "feat(platform): add sk-platform-dispatch skill for tier detection and Tier 2 inline execution"
```

---

## Task 2: Wire sk-platform-dispatch into running-a-pipeline Phase 0.25

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md`

This task assumes Sub-Plan 1 Task 6 has already inserted Phase 0.5. The new Phase 0.25 lands between Phase 0 and Phase 0.5.

- [ ] **Step 1: Insert Phase 0.25 between Phase 0 and Phase 0.5**

Use Edit with `old_string`:

```
- Present available pipelines to the user and capture the selection (`{ROOT}`, `{P}`, `pattern`).

### PHASE 0.5: VERSION COMPATIBILITY ADVISORY
```

`new_string`:

```
- Present available pipelines to the user and capture the selection (`{ROOT}`, `{P}`, `pattern`).

### PHASE 0.25: TIER DETECT & DISPATCH LOAD
- Load `sk-platform-dispatch` via the `Skill` tool.
- Run `DETECT()` from the loaded skill.
- Cache the result in the run's `pipeline-state.json` as `metadata.tier` during Phase 2 state initialization.
- <HARD-GATE>NEVER perform tier detection more than once per run. If `metadata.tier` is already set (resume case), trust the cached value and skip re-detection.</HARD-GATE>
- **Branch by tier**:
  - `tier_1` → Phase 3 uses native `Task()` dispatch (existing behavior).
  - `tier_1b` / `tier_1c` / `tier_1d` → Phase 3 uses the platform's native subagent dispatch (see entry skill).
  - `tier_2` → Phase 3 uses the Tier 2 Inline Loop from `sk-platform-dispatch`. Emit one user-facing notice: `"Running on Tier 2 ({platform}). Reviewer isolation is convention-only; reviews are advisory, not structurally enforced."`

### PHASE 0.5: VERSION COMPATIBILITY ADVISORY
```

- [ ] **Step 2: Annotate Phase 3 with tier-branch reference**

Use Edit with `old_string`:

```
### PHASE 3: ENTRY SKILL DISPATCH
- Invoke the pipeline's entry skill (`run-{P}`).
- **Context Handoff**: Pass absolute paths to the scope root, state file, and topology.
- **Responsibility**: The entry skill owns step dispatch, two-stage review (Stage 1 gates Stage 2), and cleanup.
```

`new_string`:

```
### PHASE 3: ENTRY SKILL DISPATCH
- Invoke the pipeline's entry skill (`run-{P}`).
- **Context Handoff**: Pass absolute paths to the scope root, state file, topology, AND `metadata.tier` from Phase 0.25.
- **Tier branch**: Entry skill MUST call `sk-platform-dispatch` DISPATCH for each step rather than hardcoding `Task()`. Entry skills generated under Tier 1 may keep direct `Task()` calls for backward compatibility, but new entry skills SHOULD route through DISPATCH for tier portability.
- **Responsibility**: The entry skill owns step dispatch, two-stage review (Stage 1 gates Stage 2), and cleanup.
```

- [ ] **Step 3: Add tier-cache invariant**

Use Edit with `old_string`:

```
- ALWAYS perform Phase 0.5 version-compatibility advisory before resume or fresh run; advisory is non-blocking but requires user confirmation on major-version mismatch.
```

`new_string`:

```
- ALWAYS perform Phase 0.5 version-compatibility advisory before resume or fresh run; advisory is non-blocking but requires user confirmation on major-version mismatch.
- ALWAYS perform Phase 0.25 tier detection exactly once per run; cached `metadata.tier` is the source of truth for resume.
```

- [ ] **Step 4: Add reference file**

Use Edit with `old_string`:

```
## Reference Files
- `sk-pipeline-paths/SKILL.md` — Scope root resolution.
- `sk-pipeline-state/SKILL.md` — State schema and recovery rules.
- `sk-write-review-isolation/SKILL.md` — Two-stage review protocol.
- `creating-a-pipeline/SKILL.md` — Pipeline scaffolding.
```

`new_string`:

```
## Reference Files
- `sk-pipeline-paths/SKILL.md` — Scope root resolution.
- `sk-pipeline-state/SKILL.md` — State schema and recovery rules.
- `sk-platform-dispatch/SKILL.md` — Tier detection and Tier 2 inline dispatch.
- `sk-write-review-isolation/SKILL.md` — Two-stage review protocol.
- `creating-a-pipeline/SKILL.md` — Pipeline scaffolding.
```

- [ ] **Step 5: Verify**

Run: `grep -F "PHASE 0.25: TIER DETECT & DISPATCH LOAD" skills/running-a-pipeline/SKILL.md`
Expected: one line.

Run: `grep -F "sk-platform-dispatch" skills/running-a-pipeline/SKILL.md`
Expected: at least 2 lines (Phase 0.25 reference + Reference Files).

- [ ] **Step 6: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "feat(platform): wire sk-platform-dispatch into running-a-pipeline Phase 0.25"
```

---

## Task 3: Extend dispatch-protocols.md with Tier 2 section

**Files:**
- Modify: `skills/pipeline-runner-references/references/dispatch-protocols.md`

- [ ] **Step 1: Update Table of Contents**

Use Edit with `old_string`:

```
1. Common dispatch shape (Claude Code)
2. Pattern 1 — Sequential
3. Pattern 2 / 2b — Parallel Fan-Out
4. Pattern 3 — Iterative Loop
5. Pattern 4 — Human-Gated
6. Pattern 5 — Spec-Driven Development
7. Status protocol handling
```

`new_string`:

```
1. Common dispatch shape (Claude Code)
2. Pattern 1 — Sequential
3. Pattern 2 / 2b — Parallel Fan-Out
4. Pattern 3 — Iterative Loop
5. Pattern 4 — Human-Gated
6. Pattern 5 — Spec-Driven Development
7. Tier 2 — Single-Agent Inline Dispatch
8. Status protocol handling
```

- [ ] **Step 2: Append Tier 2 section before "Status protocol handling"**

Use Edit with `old_string`:

```
## Status protocol handling
```

`new_string`:

````
## Tier 2 — Single-Agent Inline Dispatch

On Tier 2 (Cursor, Windsurf, Cline), the orchestrator has no `Task()` primitive. Every step is executed inline by the orchestrator's own session using `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`. Pattern-specific behavior:

```
# Pattern 1 (Sequential):
for step in topology.steps_in_order():
  Skill(step.protocol_skill)
  execute inline → write step.output_paths
  update pipeline-state.json (atomic)
  branch on status per status protocol

# Pattern 2 / 2b (Parallel Fan-Out → degrades to Sequential):
for branch in topology.branches:    # processed serially, not in a single message
  Skill(branch.protocol_skill)
  execute inline → write branch.output_paths
Skill(merger.protocol_skill)
execute inline → write merger.output_paths

# Pattern 3 (Iterative Loop):
for iteration in 1..MAX_ITERATIONS (3):
  Skill(tester.protocol_skill); execute inline
  if tests passed: break
  Skill(analyzer.protocol_skill); execute inline
  if architectural: escalate
  Skill(fixer.protocol_skill); execute inline
  if iteration >= 2 and failure_count_not_decreasing: escalate

# Pattern 4 (Human-Gated):
Skill(agent.protocol_skill); execute inline
AskUserQuestion("APPROVE / REJECT / REVISE?")
match → continue / fail / re-execute inline with revision feedback

# Pattern 5 (SDD):
Phases 1-4 (architect, validate, gate) executed inline.
Phase 5 per task:
  Skill(executor.protocol_skill); execute inline
  Skill(spec-reviewer.protocol_skill); execute inline      ← convention-only isolation
  if FAIL: re-execute executor with fix prompt
  Skill(quality-reviewer.protocol_skill); execute inline   ← convention-only isolation
  commit
```

**Critical Tier 2 caveats:**
- **No worktree isolation.** Orchestrator works in the user's active workspace. Verify clean state before destructive steps; commit between steps to enable rollback.
- **Reviewer isolation is convention-only.** The orchestrator runs both writer and reviewer protocols with full tools. Surface this degradation in every user-facing report. Treat reviews as advisory.
- **No true parallelism.** Pattern 2/2b degrade to sequential. Inform the user when degrading.
- **Bounded retry on NEEDS_CONTEXT.** Max 2 retries per step before escalating.

## Status protocol handling
````

- [ ] **Step 3: Verify**

Run: `grep -F "## Tier 2 — Single-Agent Inline Dispatch" skills/pipeline-runner-references/references/dispatch-protocols.md`
Expected: one line.

Run: `grep -F "convention-only isolation" skills/pipeline-runner-references/references/dispatch-protocols.md`
Expected: at least 2 lines (spec-reviewer + quality-reviewer comments).

- [ ] **Step 4: Commit**

```bash
git add skills/pipeline-runner-references/references/dispatch-protocols.md
git commit -m "docs(platform): document Tier 2 single-agent inline dispatch in dispatch-protocols.md"
```

---

## Task 4: Update pipeline-architect-protocol to emit DISPATCH-aware entry skills

**Files:**
- Modify: `skills/pipeline-architect-protocol/SKILL.md`

Without this update, entry skills scaffolded after v2.0.0 still hardcode `Task(subagent_type=...)` calls and fail on Tier 1b/1c/1d/2. The architect MUST be updated to emit entry skills that route every step through `sk-platform-dispatch` DISPATCH.

- [ ] **Step 1: Read current architect-protocol DESIGN section**

Run: `grep -n "DESIGN\|entry skill\|Task(" skills/pipeline-architect-protocol/SKILL.md`
Expected: shows the DESIGN section and any current Task() references in scaffolding templates.

- [ ] **Step 2: Add DISPATCH-emission directive to PIPELINE mode design**

Use Edit to add this bullet to the DESIGN section (anchor on the existing "All protocol goes into the companion skill." line):

`old_string`:

```
- **Constraint**: Agent files are zero-body (frontmatter only). Preload `sk-*` method skills and the companion `{agent-name}-protocol` skill. All protocol goes into the companion skill.
```

`new_string`:

```
- **Constraint**: Agent files are zero-body (frontmatter only). Preload `sk-*` method skills and the companion `{agent-name}-protocol` skill. All protocol goes into the companion skill.
- **Multi-Platform Entry Skill Constraint (v2.0.0+)**: Generated entry skills (`skills/superpipelines/{P}/run-{P}/SKILL.md`) MUST dispatch every step via `sk-platform-dispatch` DISPATCH, not via direct `Task(subagent_type=...)` calls. The entry-skill body must load `sk-platform-dispatch` in its first phase, branch on cached `metadata.tier`, and call DISPATCH for every step in topology order. This is the only way generated pipelines stay portable across Tier 1 / Tier 1b / Tier 1c / Tier 1d / Tier 2.
- **Generated Entry Skill Template**: For each step in `topology.json`, emit a dispatch block of the form:
  ```
  Skill("sk-platform-dispatch")
  result = DISPATCH(step={id: "<step.id>", agent: "<step.agent>", protocol_skill: "<step.agent>-protocol", output_paths: [...]}, inputs=<resolved>)
  if result.status != "DONE": handle per status protocol
  ```
  Do NOT emit raw `Task(subagent_type=...)` invocations in entry skills. (Architect's own internal Task() calls during PIPELINE mode are unchanged — this constraint applies only to the *generated* entry skills.)
```

- [ ] **Step 3: Add corresponding invariant**

Find the `<invariants>` block in `pipeline-architect-protocol/SKILL.md` and append:

`old_string` (anchor on the closing tag — adjust to actual existing last invariant):

```
</invariants>
```

`new_string`:

```
- Generated entry skills MUST route every step through `sk-platform-dispatch` DISPATCH. Direct `Task(subagent_type=...)` invocations in entry-skill bodies are forbidden as of v2.0.0; they break Tier 1b/1c/1d/2 execution and violate `MULTI_PLATFORM: TRUE`.
</invariants>
```

**Note:** If the file has multiple `</invariants>` tags (per-mode blocks), apply only to the PIPELINE-mode block. Use `grep -n "</invariants>" skills/pipeline-architect-protocol/SKILL.md` first to confirm.

- [ ] **Step 4: Verify**

Run: `grep -F "Multi-Platform Entry Skill Constraint" skills/pipeline-architect-protocol/SKILL.md`
Expected: one match.

Run: `grep -F "sk-platform-dispatch" skills/pipeline-architect-protocol/SKILL.md`
Expected: at least 2 matches (template block + invariant).

- [ ] **Step 5: Commit**

```bash
git add skills/pipeline-architect-protocol/SKILL.md
git commit -m "feat(platform): require generated entry skills to route via sk-platform-dispatch"
```

---

## Task 5: Add tier-aware scope-root resolution to sk-pipeline-paths

**Files:**
- Modify: `skills/sk-pipeline-paths/SKILL.md`

Without this, the `ARTIFACT_PORTABILITY: CC_AND_CODEX_TO_TIER2` invariant breaks — CC pipelines reference `.claude/` paths that don't exist on Cursor/Windsurf/Cline.

- [ ] **Step 1: Add Per-Tier Scope Roots section after the existing Scope Roots table**

Use Edit to insert below the `<scope_roots_table>` block:

`old_string`:

```
<invariant>
`project` and `local` scopes share the same physical directory; the distinction is managed via `.gitignore` entries for `.claude/`.
</invariant>
```

`new_string`:

```
<invariant>
`project` and `local` scopes share the same physical directory; the distinction is managed via `.gitignore` entries for `.claude/`.
</invariant>

## Per-Tier Scope Roots (Multi-Platform v2.0.0+)

<scope_roots_per_tier>
| Tier | Workspace root | User root |
| :--- | :--- | :--- |
| Tier 1 (CC) | `<workspace>/.claude/` | `~/.claude/` |
| Tier 1b (OC) | `<workspace>/.opencode/` | `~/.opencode/` |
| Tier 1c (Antigravity) | `<workspace>/.agents/` | `~/.gemini/antigravity/` |
| Tier 1d (Codex) | `<workspace>/.codex/` | `~/.codex/` |
| Tier 2 (Cursor/Windsurf/Cline) | `<workspace>/.superpipelines/` | `~/.superpipelines/` |
</scope_roots_per_tier>

<protocol>
RESOLVE_SCOPE_ROOT(scope, tier):
  base = per-tier table above [tier] [scope-bucket]
  return absolute_path(base)

PORTABILITY_REWRITE(artifact_path, source_tier, target_tier):
  if source_tier == target_tier: return artifact_path
  source_root = per-tier table[source_tier][workspace_or_user]
  target_root = per-tier table[target_tier][workspace_or_user]
  return artifact_path.replace(source_root, target_root, count=1)
</protocol>

<invariant>
Path resolution MUST consult `metadata.tier` from the pipeline state for any artifact read/write on a non-Tier-1 tier. CC-scaffolded pipelines running on Tier 2 invoke `PORTABILITY_REWRITE(path, 1, 2)` at every state-update site. The original (source-tier) path is stamped in `pipeline-state.json` `metadata.source_scope_root` for audit.
</invariant>
```

- [ ] **Step 2: Verify**

Run: `grep -F "Per-Tier Scope Roots" skills/sk-pipeline-paths/SKILL.md`
Expected: one match.

Run: `grep -F "PORTABILITY_REWRITE" skills/sk-pipeline-paths/SKILL.md`
Expected: at least 2 matches.

- [ ] **Step 3: Commit**

```bash
git add skills/sk-pipeline-paths/SKILL.md
git commit -m "feat(platform): add per-tier scope-root resolution and portability rewrite to sk-pipeline-paths"
```

---

## Task 6: End-of-batch verification

**Files:** none

- [ ] **Step 1: Run combined grep gate**

```bash
echo "--- sk-platform-dispatch ---" && \
test -f skills/sk-platform-dispatch/SKILL.md && \
grep -F "DETECT()" skills/sk-platform-dispatch/SKILL.md && \
grep -F "Tier 2 Inline Loop" skills/sk-platform-dispatch/SKILL.md && \
grep -F "Tier 2 Degradation Surfacing" skills/sk-platform-dispatch/SKILL.md && \
grep -F "Per-Tier Scope-Root Resolution" skills/sk-platform-dispatch/SKILL.md && \
echo "--- running-a-pipeline wiring ---" && \
grep -F "PHASE 0.25: TIER DETECT & DISPATCH LOAD" skills/running-a-pipeline/SKILL.md && \
grep -F "sk-platform-dispatch" skills/running-a-pipeline/SKILL.md && \
echo "--- dispatch-protocols reference ---" && \
grep -F "Tier 2 — Single-Agent Inline Dispatch" skills/pipeline-runner-references/references/dispatch-protocols.md && \
echo "--- architect emits DISPATCH-aware entry skills ---" && \
grep -F "Multi-Platform Entry Skill Constraint" skills/pipeline-architect-protocol/SKILL.md && \
echo "--- sk-pipeline-paths tier-aware ---" && \
grep -F "Per-Tier Scope Roots" skills/sk-pipeline-paths/SKILL.md && \
grep -F "PORTABILITY_REWRITE" skills/sk-pipeline-paths/SKILL.md && \
echo "ALL PLATFORM DISPATCH HOOKS PRESENT"
```

Expected: each grep prints its match; final line `ALL PLATFORM DISPATCH HOOKS PRESENT`.

---

## Out of scope

- Per-tier reviewer-isolation verification on Tier 1c (Antigravity) and Tier 1d (Codex) — flagged as TBD in spec; resolved during implementation/QA, not in this plan.
- Entry skill code generation changes (architect generates entry skills that call DISPATCH instead of `Task()` directly) — handled when `pipeline-architect` is next updated; out of this sub-plan's scope.
- `CLAUDE.md` invariant `TIER_MODEL: 5-TIER` — sub-plan 5.

---

## Self-Review Checklist

1. **Spec coverage:** Spec §8 (`sk-platform-dispatch` skill), §6 (Execution Tier Model) Tier 2 branch, §13 (`ARTIFACT_PORTABILITY` + isolation invariant), §10 (modified files). Task 1 creates the skill; Task 2 wires it in; Task 3 documents it in the runner reference; Task 4 closes F2.4 (architect emits DISPATCH-aware entry skills); Task 5 closes X5 (tier-aware path resolution). ✅
2. **Placeholder scan:** No TBD/TODO inside task steps. The skill body itself contains "TBD"/"unverified" for legitimately unknown Tier 1c capabilities (per spec). ✅
3. **Type/name consistency:** `metadata.tier`, `DETECT()`, `DISPATCH(step, inputs)`, `PORTABILITY_REWRITE`, `sk-platform-dispatch` spelled identically across all tasks. ✅
4. **F2.3 (Tier 1d row architectural mismatch):** Resolved by rewriting Tier 1d DISPATCH row to "skill emits orchestration prompt; model spawns subagents per Codex native behavior; skill does NOT call a primitive". ✅
5. **G-A (degradation surfacing location):** Resolved — Per-Tier Scope-Root section + Tier 2 Degradation Surfacing section in `sk-platform-dispatch` define start-of-run advisory, end-of-run footer, and `metadata.isolation_warning` field. ✅
