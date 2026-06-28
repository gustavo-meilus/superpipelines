---
name: pipeline-architect-protocol
description: Loaded by the pipeline-architect agent to design or mutate Superpipelines pipeline topology and data-only CAD artifacts.
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
- **PIPELINE**: Design all step agents per the canonical CAD schema in `pipeline-auditor-references/references/canonical-agent-def.md` and the CAD authoring template in `references/sdd-artifacts.md`; draft `topology.json` edges. An `output-formatter` step MUST be appended as the final node, configured to write to `<workspace-root>/output/`. **Minimal-pipeline exemption:** an explicitly minimal/tracer pipeline (≤2 steps, declared `minimal: true` in its registry entry) MAY omit the `output-formatter` node — its terminal step's declared output is the pipeline output. Do not auto-inject a formatter into a `minimal` pipeline.
- **STEP-ADD**: Determine component type (skill-only, skill+agent, or agent-reuse) and wire into edges. Ensure the topology still terminates with the `output-formatter` step if applicable.
- **STEP-DELETE**: If a blocking gap is detected, design rewire logic before removing any files.
- **Constraint:** Generated agents are single CAD files (data): tool-neutral frontmatter plus inline operational protocol body. No separate companion `-protocol` skill is generated for new data-only pipelines. Bundle `sk-*` method skills may be referenced via `protocol_skills`.
- **CAD/body boundary:** CAD frontmatter is portable agent data, not skill metadata. Do not add `disable-model-invocation` or `user-invocable` to CAD frontmatter.
- **Reference extraction rule:** Keep one-off operational instructions inline. Create `DATA_ROOT/pipelines/{P}/references/{name}.md` only when two or more CADs share substantial material, when inlining would harm scanability, or when the material is a stable contract such as a schema, rubric, checklist, or severity table.
- **Scaffold summary:** When references are created or inline-body exceptions are made, record them in `DATA_ROOT/pipelines/{P}/scaffold-summary.md`.
- **Data-Only Entry Constraint (v2.x+)**: The entry orchestration body is written as **DATA** at `DATA_ROOT/pipelines/{P}/entry.md` (NOT a tool-registered skill). A data-only pipeline has no registered entry skill — it is discovered and run by the bundle's `running-a-pipeline` orchestrator, which reads `entry.md` + `topology.json` from the data root. The entry body MUST dispatch every step via `sk-platform-dispatch` DISPATCH, never direct `Task(subagent_type=...)`. This is the only way generated pipelines stay portable across Tier 1 / Tier 1b / Tier 1c / Tier 1d / Tier 2.
- **Generated Entry Body Template** (`entry.md` data): For each step in `topology.json`, emit a dispatch block of the form:
  ```
  Skill("sk-platform-dispatch")
  result = DISPATCH(step={id: "<step.id>", agent: "<step.agent>", agent_def: "pipelines/{P}/agents/<step.agent>.md", output_paths: [...]}, inputs=<resolved>)
  if result.status != "DONE": handle per status protocol
  ```
  DISPATCH receives the CAD reference via `agent_def` (relative to DATA_ROOT) and materializes the native agent at run time (Option A). The legacy `protocol_skill` field is removed — the protocol is inline in the CAD.
  **Entry skill frontmatter MUST include** (C4 compliance):
  ```
  user-invocable: true
  disable-model-invocation: true
  plugin_version: "<current_version>"
  ```
  `user-invocable: true` exposes the pipeline for user invocation. `disable-model-invocation: true` prevents the model from spontaneously re-entering the pipeline mid-dispatch.

  **Entry body MUST include a Phase 5.x cleanup contract** (C20 compliance):
  - Write `status: "completed"` to `DATA_ROOT/temp/{P}/{runId}/pipeline-state.json` (UTF-8, no BOM) on success.
  - Delete `DATA_ROOT/temp/{P}/{runId}/` on DONE.
  - Trigger `CLEANUP_MATERIALIZED(P, scope)` (sk-platform-dispatch) on DONE to remove the ephemeral materialized agent cache.
  - Preserve temp dir and log path on BLOCKED/FAILED/ESCALATED.

  **Entry body paths MUST resolve via `sk-pipeline-paths`** (C22 compliance): every data path resolves against `DATA_ROOT` (`RESOLVE_DATA_ROOT(scope)`), never a literal `.claude/`, `.opencode/`, `.agents/` directory name. Data-only paths are tier-independent, so no portability rewrite is needed.

  Raw `Task(subagent_type=...)` invocations are forbidden in entry skills for **top-level step dispatch**. Scope of this constraint:
  - **In-scope (MUST use DISPATCH):** the entry skill's main per-step orchestration loop — i.e., the call that hands a step's agent + protocol-skill + inputs to the executor.
  - **Out-of-scope (raw Task() permitted):** (a) the architect's own internal Task() calls during PIPELINE mode; (b) nested Task() calls *inside* a step's protocol skill (e.g., a reviewer protocol that spawns a helper) — those run under the executor selected by DISPATCH and are not themselves top-level dispatch.

### 3. DEVELOP

<EXTREMELY-IMPORTANT>
Every new agent is written as ONE canonical agent def (CAD) file as DATA at
`DATA_ROOT/pipelines/{P}/agents/{agent-name}.md`: tool-neutral frontmatter PLUS the inline
protocol body (the operational protocol that used to live in a companion `-protocol` skill).
Nothing is written to `agents/superpipelines/...` or `skills/superpipelines/...` as source —
those tool dirs hold only ephemeral materialization cache, owned by DISPATCH at run time.
</EXTREMELY-IMPORTANT>

**For each new agent (REQUIRED, non-optional):**
1. Write the CAD file at `DATA_ROOT/pipelines/{P}/agents/{agent-name}.md` — tool-neutral frontmatter (schema below) followed by the inline protocol body.
2. Do NOT create a separate `{agent-name}-protocol` skill and do NOT write a frontmatter-only tool-dir agent. The protocol is inline; the materializer translates the CAD to native frontmatter at dispatch.

Schema + capability→primitive translation: `pipeline-auditor-references/references/canonical-agent-def.md`. See `references/sdd-artifacts.md` § "Canonical agent-def template" for the exact template.

**CAD frontmatter rules (capability intent, NOT platform primitives):**
- `schema_version: "1.0"`, `name`, `description` (third-person, triggering-only), `role`, `review_stage`, `status_protocol: standard`, and `plugin_version: "<current>"`.
- Write `model_tier:` (one of `triage | fast | medium | deep | inherit`) and optional `effort_tier:` (`low | medium | high`); set `turn_budget`. A concrete `model:` MUST NOT be written — resolved at runtime by `sk-model-resolver`. Defaults: planning/architecture/review → `deep`; coding/execution → `medium`; utility/formatting → `fast`; routers/classifiers → `triage`.
- `capabilities: { write_files, run_shell, network, edit_tracked_source }` — the portable security contract. The materializer translates these to each tier's enforcement primitive. Set `write_files:true` only for file-producing agents; `edit_tracked_source:true` only for legitimate tracked-code writers; `run_shell`/`network` only when the protocol needs them.
- `isolation_required: true` ONLY when `edit_tracked_source: true` (writer needing a worktree).
- Optional `tool_hints.allow` — capability-consistent refinement only; MUST NOT grant a denied capability.
- `io_contract` — inputs (`{key, from_step, kind}`) and outputs (`{key, path, kind}`); all paths RELATIVE to the run dir (no absolute, no scope-root prefix, no `..`).
- `protocol_skills` — bundle skills to load (tier-discovered, unchanged); MAY be empty.
- `memory: project` is forbidden.
- **Reviewer isolation = `capabilities.write_files: false`.** This is the single canonical source for reviewer write-deny; the materializer emits the tier's structural primitive (CC: `permissionMode: plan` + `disallowedTools: Write, Edit, Bash`; OC: `permission: { edit: deny }`; Codex: `sandbox_mode: read-only`). Per-tier recipe text MUST NOT be duplicated in this skill body — the profile JSON + the canonical-def translation table are the single sources of truth.

All files are built via `Write` (new) or `Edit` (update), resolving all paths via `sk-pipeline-paths` (`RESOLVE_DATA_ROOT(scope)`).

### 4. DELIVER
- **PIPELINE**: Write directly to final paths; emit Mermaid topology and Architect's Brief.
- **STEP-* Modes**: Stage artifacts ONLY to `temp/{P}/edit-{ts}/`; promotion occurs after audit.
- **STEP-DELETE completion manifest**: Before returning from STEP-DELETE mode, emit a completion manifest covering every file the architect was tasked with touching. Each entry MUST include the production path, staged path when present, and one status:
  - `edited` — staged content was intentionally changed from the production source.
  - `copied-unchanged` — staged content is byte-identical to the production source.
  - `deleted` — the file is intentionally removed and has no staged replacement.
  The manifest is mandatory even when the topology edit succeeds. The delete-step orchestrator reads it before delta audit and treats `copied-unchanged` on expected markdown updates as a blocking partial-exit signal.
- **UPDATE/DIAGNOSE**: Edit in-place and provide a delta summary.
</protocol>

<invariants>
- Generated agents are CAD files (data) at `DATA_ROOT/pipelines/{P}/agents/{agent-name}.md`: tool-neutral frontmatter + inline protocol body. NEVER write a generated agent or step protocol to `agents/superpipelines/...` or `skills/superpipelines/...` as source — those tool dirs hold only ephemeral materialization cache owned by DISPATCH.
- CAD frontmatter expresses capability intent (`capabilities.*`), not platform primitives; the materializer translates at dispatch. `tool_hints.allow` MUST NOT grant a denied capability.
- Absolute paths are forbidden; `io_contract` paths are relative to the run dir; resolve scope paths via `sk-pipeline-paths` (`RESOLVE_DATA_ROOT`).
- `memory: project` is strictly forbidden in all agent frontmatter.
- The generated entry body (`entry.md`, data) MUST route every step through `sk-platform-dispatch` DISPATCH, passing `agent_def`. Direct `Task(subagent_type=...)` invocations are forbidden; they break Tier 1b/1c/1d/2 execution and violate `MULTI_PLATFORM: TRUE`.
- Entry body MUST include a cleanup contract (C20): write `status: "completed"` to state on DONE; delete `DATA_ROOT/temp/{P}/{runId}/` on DONE; trigger `CLEANUP_MATERIALIZED(P, scope)` on DONE; preserve on BLOCKED/FAILED/ESCALATED.
- NEVER hardcode `.claude/`, `.opencode/`, `.agents/` in entry/CAD paths. Data paths resolve against `DATA_ROOT` via `sk-pipeline-paths`.
</invariants>

## Reference Files

- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-architect-references/references/topology-selection.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-architect-references/references/agent-frontmatter-schema.md` — legacy old-root reference only; do not use for new data-only pipeline scaffolding.
- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-architect-references/references/sdd-artifacts.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-architect-references/references/anti-patterns.md`
