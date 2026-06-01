---
name: pipeline-architect-protocol
description: Operational protocol and invariants for multi-agent pipeline design, loaded by the pipeline-architect agent. Use when the pipeline-architect agent initializes any operating mode (PIPELINE, STEP-ADD, STEP-UPDATE, STEP-DELETE, UPDATE, DIAGNOSE).
disable-model-invocation: true
user-invocable: false
---

# Pipeline Architect — Operational Protocol

<overview>
The Pipeline Architect treats every component as a discrete software system with typed inputs, outputs, and explicit contracts. It operates in multiple modes to support the full pipeline lifecycle, from initial deconstruction to granular step mutations and topology health audits.
</overview>

<glossary>
  <term name="topology.json">The canonical graph representation of agent dependencies and data flow within a pipeline.</term>
  <term name="step management">The lifecycle operations (Add, Update, Delete) applied to individual agents or skills within a pipeline.</term>
  <term name="entry skill">The user-invocable skill that serves as the primary interface for a named pipeline.</term>
</glossary>

## Operating Modes

<operating_modes>
| Mode | Trigger | Primary Outputs |
| :--- | :--- | :--- |
| **PIPELINE** | `new-pipeline` command | `spec.md`, `plan.md`, `tasks.md`, `topology.json`, agents, skills. |
| **STEP-ADD** | `new-step` command | New agent/skill; updated `topology.json`, `tasks.md`, and entry skill (staged). |
| **STEP-UPDATE** | `update-step` command | Edited agent/skill; updated `topology.json` with propagated edges (staged). |
| **STEP-DELETE** | `delete-step` command | Deleted files; rewired `topology.json`; updated `tasks.md` and entry skill (staged). |
| **UPDATE** | Prompt: "Update X to..." | In-place edits to existing pipeline artifacts with a summary. |
| **DIAGNOSE** | Prompt: "Why is it failing?" | Topology diagnosis and remediation plan without destructive writes. |
</operating_modes>

## Protocol

<protocol>
### 1. DISCOVER
- Run the 4D Method on the user brief; gate execution if critical data slots are missing.
- **PIPELINE**: Identify information flow and select a pattern via `references/topology-selection.md`. Capture the user's desired output format (or deduce one based on the pipeline goal).
- **STEP-ADD**: Analyze `topology.json` to understand predecessor outputs and successor requirements.
- **STEP-UPDATE**: Identify change impact on I/O contracts and affected neighbors.
- **STEP-DELETE**: Compute dependency gaps and design rewire edges before deletion.

### 2. DESIGN
- **PIPELINE**: Design all step agents per `references/agent-frontmatter-schema.md` and draft `topology.json` edges. An `output-formatter` step MUST be appended as the final node, configured to write to `<workspace-root>/output/`.
- **STEP-ADD**: Determine component type (skill-only, skill+agent, or agent-reuse) and wire into edges. Ensure the topology still terminates with the `output-formatter` step if applicable.
- **STEP-DELETE**: If a blocking gap is detected, design rewire logic before removing any files.
- **Constraint**: Agent files are zero-body (frontmatter only). `sk-*` method skills and the companion `{agent-name}-protocol` skill are preloaded. All protocol goes into the companion skill.
- **Multi-Platform Entry Skill Constraint (v2.0.0+)**: Generated entry skills (`skills/superpipelines/{P}/run-{P}/SKILL.md`) MUST dispatch every step via `sk-platform-dispatch` DISPATCH, not via direct `Task(subagent_type=...)` calls. The entry-skill body loads `sk-platform-dispatch` in its first phase, branches on cached `metadata.runtime_tier`, and calls DISPATCH for every step in topology order. This is the only way generated pipelines stay portable across Tier 1 / Tier 1b / Tier 1c / Tier 1d / Tier 2.
- **Generated Entry Skill Template**: For each step in `topology.json`, emit a dispatch block of the form:
  ```
  Skill("sk-platform-dispatch")
  result = DISPATCH(step={id: "<step.id>", agent: "<step.agent>", protocol_skill: "<step.agent>-protocol", output_paths: [...]}, inputs=<resolved>)
  if result.status != "DONE": handle per status protocol
  ```
  **Entry skill frontmatter MUST include** (C4 compliance):
  ```
  user-invocable: true
  disable-model-invocation: true
  plugin_version: "<current_version>"
  ```
  `user-invocable: true` exposes the pipeline for user invocation. `disable-model-invocation: true` prevents the model from spontaneously re-entering the pipeline mid-dispatch.

  **Entry skill MUST include a Phase 5.x cleanup contract** (C20 compliance):
  - Write `status: "completed"` to `{ROOT}/superpipelines/temp/{P}/{runId}/pipeline-state.json` (UTF-8, no BOM) on success.
  - Delete `{ROOT}/superpipelines/temp/{P}/{runId}/` on DONE.
  - Preserve temp dir and log path on BLOCKED/FAILED/ESCALATED.

  **Entry skill paths MUST use `{ROOT}`** (C22 compliance): every file path in the entry skill and in protocol skills references `{ROOT}` resolved via `sk-pipeline-paths`, never a literal `.claude/`, `.opencode/`, `.agents/`, or `.superpipelines/` directory name. Hard-coding the scope-root directory name breaks portability to non-CC tiers.

  Raw `Task(subagent_type=...)` invocations are forbidden in entry skills for **top-level step dispatch**. Scope of this constraint:
  - **In-scope (MUST use DISPATCH):** the entry skill's main per-step orchestration loop — i.e., the call that hands a step's agent + protocol-skill + inputs to the executor.
  - **Out-of-scope (raw Task() permitted):** (a) the architect's own internal Task() calls during PIPELINE mode; (b) nested Task() calls *inside* a step's protocol skill (e.g., a reviewer protocol that spawns a helper) — those run under the executor selected by DISPATCH and are not themselves top-level dispatch.

### 3. DEVELOP

<EXTREMELY-IMPORTANT>
Every new agent MUST follow the Lean Agent pattern: the agent file is frontmatter-only (zero body text after the closing `---`). All protocol lives in a companion `{agent-name}-protocol` skill. STOP if about to write prose into an agent file body.
</EXTREMELY-IMPORTANT>

**For each new agent (REQUIRED, non-optional):**
1. Create the agent file with frontmatter only — no text after the closing `---`.
2. Create `skills/superpipelines/{P}/{agent-name}-protocol/SKILL.md` with `disable-model-invocation: true` and `user-invocable: false`. All operational protocol resides inside it.
3. Add `{agent-name}-protocol` to the agent's `skills:` frontmatter list.

See `references/sdd-artifacts.md` § "Lean agent stub + protocol skill templates" for exact templates.

**Frontmatter rules:**
- Write `model_tier:` (one of `triage | fast | medium | deep | inherit`) and optional `effort_tier:` (`low | medium | high`). A concrete `model:` field MUST NOT be written — that is resolved at runtime by `sk-model-resolver`. Defaults: planning/architecture/review steps → `deep`; coding/execution → `medium`; utility/formatting → `fast`; routers/classifiers → `triage`.
- Set `permissionMode` to match the agent's write capability: `plan` for read-only/advisory agents whose protocol never writes files (reviewers, auditor, failure-analyzer — typically carrying `disallowedTools: Write`); `acceptEdits` for file-producing agents whose protocol creates or edits files (architect, skill-architect, task-executor). The mode MUST agree with the agent's `tools:`/`disallowedTools:` capability and its protocol's write behavior.
- Set `memory: local` only for cross-run heuristics; `memory: project` is forbidden.
- Set `user-invocable: false` for internal step skills.
- **Reviewer-agent isolation recipe (all tiers)**: When generating a reviewer agent, the architect MUST consult `platform_profile.extensions.reviewer_isolation_recipe` (a free-form string carried by each tier profile under `skills/sk-platform-dispatch/profiles/`). If present, the recipe is applied verbatim to the generated agent frontmatter. If absent or empty, the tier's structural isolation source is whichever native mechanism the profile already encodes (CC: agent `tools:` allowlist; OC: `permission: { edit: deny }`; Tier 2: convention-only — surface degradation). Per-tier recipe text MUST NOT be duplicated in this skill body — the profile JSON is the single source of truth so new tiers drop in as profile data without skill edits.

All files are built via `Write` (new) or `Edit` (update), resolving all paths via `sk-pipeline-paths`.

### 4. DELIVER
- **PIPELINE**: Write directly to final paths; emit Mermaid topology and Architect's Brief.
- **STEP-* Modes**: Stage artifacts ONLY to `temp/{P}/edit-{ts}/`; promotion occurs after audit.
- **UPDATE/DIAGNOSE**: Edit in-place and provide a delta summary.
</protocol>

<invariants>
- Agent files are zero-body. No text may appear after the closing `---` of the frontmatter block.
- Every agent must have a companion `{agent-name}-protocol` skill listed in its `skills:` frontmatter.
- Absolute paths are forbidden; resolve all paths via scope-aware variables or `${CLAUDE_PLUGIN_ROOT}`.
- `permissionMode: bypassPermissions` requires an inline justification comment in the companion `{agent-name}-protocol` skill.
- `memory: project` is strictly forbidden in all agent frontmatter.
- Generated entry skills MUST route every step through `sk-platform-dispatch` DISPATCH. Direct `Task(subagent_type=...)` invocations in entry-skill bodies are forbidden as of v2.0.0; they break Tier 1b/1c/1d/2 execution and violate `MULTI_PLATFORM: TRUE`.
- Entry skill MUST have `disable-model-invocation: true` AND `user-invocable: true` (C4). `disable-model-invocation: false` lets the model spontaneously re-enter the pipeline — auditor flags as SEV-2.
- Entry skill MUST include a cleanup contract (C20): write `status: "completed"` to state on DONE; delete `temp/{P}/{runId}/` on DONE; preserve on BLOCKED/FAILED/ESCALATED.
- NEVER hardcode `.claude/`, `.opencode/`, `.agents/`, `.superpipelines/` in entry skill or protocol skill paths (C22 portability). Always use `{ROOT}` resolved via `sk-pipeline-paths`.
</invariants>

## Reference Files

- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-architect-references/references/topology-selection.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-architect-references/references/agent-frontmatter-schema.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-architect-references/references/sdd-artifacts.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-architect-references/references/anti-patterns.md`
