---
name: creating-a-pipeline
description: Use when the user asks to design a pipeline, build a workflow for X, plan multi-step feature work, or invokes /superpipelines:new-pipeline. Walks git preflight, scope selection, pattern selection, architect dispatch, pre-gate audit, and human approval to produce a runnable named pipeline bundle.
---

# Creating a Pipeline — Scaffolding Workflow

> Orchestrates the end-to-end design and scaffolding of a new multi-agent pipeline. Trigger when the user requests to design a workflow, plan multi-step feature work, or invokes `/superpipelines:new-pipeline`.

<overview>
The Pipeline Creation workflow guides an orchestrator from a raw user brief to an approved, runnable pipeline bundle. It enforces rigorous pre-flight checks (Git status), scope resolution, architectural patterns, and a mandatory audit-architect loop before presenting a final design for human approval.
</overview>

<glossary>
  <term name="Pipeline Scope">The deployment context (Local, Project, or User) determining where artifacts are persisted.</term>
  <term name="Architect Dispatch">Engaging the `pipeline-architect` agent to generate the formal specification, plan, and topology.</term>
  <term name="Pre-gate Audit">A mandatory review by the `pipeline-auditor` to clear critical (SEV-0/1) issues before human review.</term>
</glossary>

## Workflow Phases

<protocol>
### PHASE 0: TIER DETECT
- Load `sk-platform-dispatch` via the `Skill` tool → call `DETECT()` → receive `platform_profile` object.
- Cache `platform_profile` in session context (no state file exists yet during creation).
- IF `platform_profile.degradation_warnings` is non-empty: emit each warning with "⚠️" prefix before proceeding.
- Store `platform_profile` for use in Phase 4 dispatch branching.

### PHASE 0b: GIT PREFLIGHT
- <HARD-GATE>Run git preflight FIRST — before any other action. STOP if the workspace is not a valid git repository and present the user with three options: (a) proceed without git (Pattern 1 or 4 only), (b) initialize git, (c) cancel. Do NOT advance to Phase 1 until this gate is resolved.</HARD-GATE>
- **Goal**: Ensure the environment supports the isolation requirements of the selected pattern.

### PHASE 1: SCOPE & IDENTITY
- <HARD-GATE>Ask the user to choose a deployment scope (`local`, `project`, or `user`) and a pipeline name BEFORE proceeding to Phase 2. Resolve all paths via `sk-pipeline-paths`. Validate the name: lowercase/hyphens only, ≤48 chars, unique in the scope's `registry.json`. Do NOT advance to Phase 2 without a confirmed scope and a valid, unique pipeline name.</HARD-GATE>

### PHASE 2: BRIEF REFINEMENT (4D)
- Apply the 4D Method to deconstruct core intent and constraints.
- **Model preference per step**: For each topology step the architect will generate in Phase 4, ask the user to choose a model tier — `deep` (planning/architecture/review steps; resolves to `claude-opus-4-7`) or `fast` (execution/utility steps; resolves to `claude-sonnet-4-6`). Record the user's mapping in Phase 2 output (`{step_id: tier}`); the architect MUST embed the resolved model string in each generated agent's frontmatter `model:` field during Phase 4. If the user declines to choose, default every step to `claude-sonnet-4-6` per `MODEL_SELECTION: DYNAMIC_DEFAULT_SONNET`. The deep/fast → opus/sonnet mapping is also documented in the `MODEL_SELECTION` invariant update in Sub-Plan 5.
- Acknowledge if the user requested a specific output format. If not specified, deduce an appropriate format based on the pipeline's goal (e.g., markdown files, code snippets, code files).
- <HARD-GATE>If ≥3 critical slots are missing (goal, success criteria, scope, data), STOP and ask targeted questions.</HARD-GATE>

### PHASE 3: PATTERN SELECTION
- Select a topology pattern (Sequential, Parallel, Iterative, Gated, or Spec-Driven) using the `sk-pipeline-patterns` decision tree.
- **Restriction**: If git is absent, limit selection to Pattern 1 or 4.

### PHASE 4: DESIGN & AUDIT LOOP
- **Dispatch Architect** (profile-driven from Phase 0):

  | `dispatch_mechanism` | Architect action |
  |---|---|
  | `native_task` | `Task(pipeline-architect, ...)` — include `platform_profile` in the Task prompt; subagent context is fresh and has no access to the session-cached profile |
  | `native_subagent` | OC native `mode: subagent` dispatch — include `platform_profile` in the dispatch payload |
  | `model_driven` | Model-driven orchestration prompt — include `platform_profile` in the prompt context |
  | `inline` or unknown | `Skill(pipeline-architect-protocol)` → execute inline with own tools — profile already in session context |
- **Output Formatter Rule**: The Architect MUST append a specific `output-formatter` step as the final node in the topology, designed to transform the output into the deduced format and save it to the `<workspace-root>/output/` folder.
- **Dispatch Auditor** (same profile-driven branching as Architect above).
- <HARD-GATE>The `pipeline-auditor` MUST be dispatched after the architect. Do NOT present the human gate without audit results. If any SEV-0 or SEV-1 findings are returned, re-dispatch the Architect to remediate before proceeding.</HARD-GATE>


### PHASE 5: HUMAN APPROVAL
- Present the topology diagram, spec summary, full task list, and audit results to the user.
- **Approval Required**: Do NOT generate the entry skill until the user explicitly approves the design.
- <HARD-GATE>When the user approves, proceed DIRECTLY to Phase 6 (scaffold generation). Do NOT ask for runtime inputs (e.g., "what's the topic?"). The pipeline does not run here — it is scaffolded. Running is a separate command (`/superpipelines:run-pipeline`).</HARD-GATE>

### PHASE 6: FINALIZATION
- <HARD-GATE>Write ALL of the following to disk before ending the session. Do NOT tell the user the pipeline is ready until every file is confirmed written:
  1. `<scope-root>/superpipelines/pipelines/{P}/spec.md`
  2. `<scope-root>/superpipelines/pipelines/{P}/plan.md`
  3. `<scope-root>/superpipelines/pipelines/{P}/tasks.md`
  4. `<scope-root>/superpipelines/pipelines/{P}/topology.json` (with `plugin_version` AND `source_tier` stamped — `source_tier` = `platform_profile.tier` from Phase 0)
  5. `<scope-root>/superpipelines/pipelines/{P}/{P}.md` (Run Launcher — single-page launcher document referencing the entry skill, registry entry, topology, and last-run state. Required artifact. NOTE: on Claude Code this is a documentation/discovery file only; CC does NOT auto-register it as a `/superpipelines:{P}` slash command. On OpenCode the same artifact is auto-routed by OC's scope-aware command resolver. Cross-platform `/superpipelines:{P}` direct invocation is OC-only in v2.0.0.)
  6. `<scope-root>/skills/superpipelines/{P}/run-{P}/SKILL.md` (entry skill, `user-invocable: true`)
  7. All step agents under `<scope-root>/agents/superpipelines/{P}/` — each MUST be zero-body (frontmatter only); and all companion `{agent-name}-protocol` skills under `<scope-root>/skills/superpipelines/{P}/` (with `plugin_version` stamped in agent frontmatter; `disable-model-invocation: true` and `user-invocable: false` in protocol skills)
  8. Updated `<scope-root>/superpipelines/registry.json` (with `plugin_version` AND `source_tier` stamped — `source_tier` = `platform_profile.tier` from Phase 0)
</HARD-GATE>
- Confirm to the user: "Pipeline `{P}` scaffolded. Use `/superpipelines:run-pipeline` to execute it. Launcher reference at `<scope-root>/superpipelines/pipelines/{P}/{P}.md` (Claude Code: this is a documentation/discovery file ONLY — it is NOT registered as a `/superpipelines:{P}` slash command). On OpenCode the same launcher IS auto-routed as `/superpipelines:{P}` direct invocation."
</protocol>

<invariants>
- NEVER hardcode paths; always resolve via `sk-pipeline-paths`.
- NEVER generate the entry skill before human approval of the `tasks.md` and `topology.json`.
- All internal step skills MUST be marked `user-invocable: false`.
- Any modification to the design MUST trigger a re-audit for SEV-0/1 issues.
- ALWAYS stamp `plugin_version` in `topology.json`, the registry entry, and agent frontmatter to the current superpipelines version.
- NEVER use `Task()` directly in Phase 4 without checking `platform_profile.capabilities.task_primitive`; use profile-driven dispatch branching.
- ALWAYS include `platform_profile` in the dispatch payload or Task prompt when invoking the Architect or Auditor; subagent and model-driven contexts are fresh and cannot read the session-cached profile.
</invariants>

## Red Flags — STOP
- "The brief is detailed enough, I'll skip git preflight and scope selection." → **STOP**. Phases 0 and 1 are mandatory regardless of brief quality. A detailed brief does not substitute for git verification or scope confirmation.
- "The user approved, what's the topic for the first run?" → **STOP**. Approval triggers Phase 6 (scaffold generation), not a run. Writing files to disk comes first. Running is `/superpipelines:run-pipeline`.
- "The audit only found SEV-2 issues, let's proceed." → **STOP**. SEV-0/1 must be zero before the human gate.
- "The user said skip the spec." → **STOP**. The spec is the non-negotiable contract for parallel execution.
- "I'll skip the human gate to save time." → **STOP**. One misunderstanding at this stage wastes all downstream implementation.
- "I'll write state to `tmp/pipeline-state.json`." → **STOP**. The canonical state path is `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`. The legacy `tmp/` path is retired.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "The audit is extra overhead." | SEV-0 topology errors only surface at runtime. Pre-flight auditing is 10x cheaper than runtime recovery. |
| "Git preflight is unnecessary." | Worktree patterns silently fail in non-git workspaces. Preflight prevents mid-run deadlocks. |
| "I'll generate the entry skill now." | Entry skills are expensive to refactor if the user revises the underlying topology. Wait for approval. |
</rationalization_table>

## Reference Files
- `sk-pipeline-paths/SKILL.md` — Scope and path resolution.
- `sk-pipeline-patterns/SKILL.md` — Topology selection tree.
- `sk-4d-method/SKILL.md` — Brief deconstruction framework.
- `sk-pipeline-state/SKILL.md` — State initialization schema.
