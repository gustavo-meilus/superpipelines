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
- **Q16 degraded-state preflight** — IF the marker file `${CLAUDE_PLUGIN_ROOT}/.session-hook-degraded` exists, emit:
  > ⚠️ SessionStart hook degraded (Git Bash not found on the previous session start). Auto-loading of `using-superpipelines` routing context was skipped. To restore: install Git for Windows (Git Bash), then restart this session.
  
  Do not delete the marker automatically — it is cleared by the next successful SessionStart hook.
- Load `sk-platform-dispatch` via the `Skill` tool → call `DETECT()` → receive `platform_profile` object.
- Cache `platform_profile` in session context (no state file exists yet during creation).
- IF `platform_profile.degradation_warnings` is non-empty: emit each warning with "⚠️" prefix before proceeding.
- Store `platform_profile` for use in Phase 4 dispatch branching.

### PHASE 0b: GIT PREFLIGHT
- <HARD-GATE>Run git preflight FIRST — before any other action. STOP if the workspace is not a valid git repository and present the user with three options: (a) proceed without git (Pattern 1 or 4 only), (b) initialize git, (c) cancel. Do NOT advance to Phase 1 until this gate is resolved.</HARD-GATE>
- **Goal**: Ensure the environment supports the isolation requirements of the selected pattern.

### PHASE 1: SCOPE & IDENTITY
- <HARD-GATE>Ask the user to choose a deployment scope (`local`, `project`, or `user`) and a pipeline name BEFORE proceeding to Phase 2. Resolve all paths via `sk-pipeline-paths`. Validate the name: lowercase/hyphens only, ≤48 chars, unique in the scope's `registry.json`. Do NOT advance to Phase 2 without a confirmed scope and a valid, unique pipeline name.</HARD-GATE>
- **Q15 cross-scope uniqueness check**: After name validation in the chosen scope, scan all OTHER merged scope roots (via `sk-pipeline-paths.ENUMERATE_ALL_SCOPE_ROOTS`) for entries with the same name. IF a same-name pipeline exists in another scope or tier, prompt the user explicitly:
  > ⚠️ A pipeline named `{P}` already exists in {other-scope / other-tier} (scaffolded {date}). Creating another `{P}` in {this-scope / this-tier} is allowed but may cause disambiguation prompts at run-time. Continue? [y/N]
  
  Only proceed on explicit `y`. Default `N` prevents silent collisions.

### PHASE 2: BRIEF REFINEMENT (4D)
- Apply the 4D Method to deconstruct core intent and constraints.

- **Q6 capability-gated model prompting.** Before asking per-step model questions, branch on the active `platform_profile`:
  - IF `platform_profile.capabilities.dynamic_subagents == true` (Tier 1c — host owns subagent model selection) OR `platform_profile.capabilities.model_field_format == "omit"` (Tier 2 — host IDE owns all model selection):
    - **Skip** the per-step model_tier table below.
    - Ask **one** question: "What model tier should the pipeline orchestrator run at? (triage | fast | medium | deep; default `fast`)". Record as `orchestrator_tier`.
    - Write `model_tier: inherit` on every generated agent (the architect will honor this in Phase 4).
    - Stamp authoring intent: in Phase 6 the topology.json gains `metadata.model_intent_scaffold_tier` recording what the author *would have* picked per step had the platform supported per-step selection. This makes the pipeline cross-tier portable: when run later on a per-step-honoring tier (1, 1b, 1d), the intent is recoverable.
  - ELSE: proceed with the per-step table below.

- **Model preference per step (4-tier)**: For each topology step the architect will generate in Phase 4, ask the user to choose a model tier:

  | Tier | Use cases |
  |---|---|
  | `triage` | Routers, classifiers, simple decisions (cheapest model) |
  | `fast` | Execution, utility, code generation workhorse-cheap |
  | `medium` | Standard coding workhorse |
  | `deep` | Planning, architecture, review (most capable model) |

  Recommended defaults: planning/architecture/review → `deep`; coding/execution → `medium`; utility/formatting → `fast`; routers/classifiers → `triage`.

  Optionally ask per-step `effort_tier` (`low | medium | high`). Skip = use the tier's default effort from the active profile.

  Record `{step_id: {model_tier, effort_tier}}` in Phase 2 output. The architect MUST write `model_tier:` (and optional `effort_tier:`) to each generated agent's frontmatter in Phase 4. The architect MUST NOT write `model:` — that field is resolved at runtime by `sk-model-resolver`.

  Per `DEPENDENCY_INVERSION: PROFILE_DRIVEN`, concrete per-tier model IDs live exclusively in `skills/sk-platform-dispatch/profiles/{tier_id}.json` and user/workspace preference files. NEVER hardcode model IDs in this skill body or in generated agents.

  If the user declines per-step choice, default every step to `fast`.
- Acknowledge if the user requested a specific output format. If not specified, deduce an appropriate format based on the pipeline's goal (e.g., markdown files, code snippets, code files).
- <HARD-GATE>If ≥3 critical slots are missing (goal, success criteria, scope, data), STOP and ask targeted questions.</HARD-GATE>

### PHASE 3: PATTERN SELECTION
- Select a topology pattern (Sequential, Parallel, Iterative, Gated, or Spec-Driven) using the `sk-pipeline-patterns` decision tree.
- **Q7 capability gating**: Build the available-pattern list dynamically:
  ```
  IF !git_repo: patterns = [1, 4]
  ELIF !platform_profile.capabilities.worktrees: patterns = [1, 4]
  ELSE IF !platform_profile.capabilities.parallel_subagents: patterns = [1, 3, 4]   # Pattern 3 needs worktrees but not parallelism
  ELSE: patterns = [1, 2, 3, 4, 5]
  ```
  When narrowing, emit an advisory naming the missing capability and the excluded patterns: e.g., "Pattern 2/3/5 require `worktrees`, unavailable on `<platform>`. Limited to Patterns 1 and 4."
- **Restriction**: If git is absent OR `worktrees: false`, limit selection to Pattern 1 or 4 (these are the only patterns that do not require writer isolation via worktrees).

### PHASE 4: DESIGN & AUDIT LOOP
- **Dispatch Architect** (profile-driven from Phase 0):

  | `dispatch_mechanism` | Architect action |
  |---|---|
  | `native_task` | `Task(pipeline-architect, ...)` — include `platform_profile` in the Task prompt; subagent context is fresh and has no access to the session-cached profile |
  | `native_subagent` | OC native `mode: subagent` dispatch — include `platform_profile` in the dispatch payload |
  | `model_driven` | Model-driven orchestration prompt — include `platform_profile` in the prompt context |
  | `inline` or unknown | `Skill(pipeline-architect-protocol)` → execute inline with own tools — profile already in session context |
- **Architect output rule for agent frontmatter**: every generated agent file MUST declare `model_tier:` (one of `triage | fast | medium | deep | inherit`) and MAY declare `effort_tier:` (`low | medium | high`). The architect MUST NOT write a concrete `model:` field — that resolves at runtime via `sk-model-resolver`. For preview-only display in Phase 5, the architect MAY call `sk-model-resolver.RESOLVE` and `EMIT` against the active profile, but the resolved string is for the approval table only, never written to agent files.
- **Output Formatter Rule**: The Architect MUST append a specific `output-formatter` step as the final node in the topology, designed to transform the output into the deduced format and save it to the `<workspace-root>/output/` folder.
- **Dispatch Auditor** (same profile-driven branching as Architect above).
- <HARD-GATE>The `pipeline-auditor` MUST be dispatched after the architect. Do NOT present the human gate without audit results. If any SEV-0 or SEV-1 findings are returned, re-dispatch the Architect to remediate before proceeding.</HARD-GATE>


### PHASE 5: HUMAN APPROVAL
- Present the topology diagram, spec summary, full task list, and audit results to the user.
- **Q6 cross-tier flattening footnote**: IF `platform_profile.capabilities.dynamic_subagents == true` OR `platform_profile.capabilities.model_field_format == "omit"`, append to the resolution preview table a footnote:
  > "This platform owns model selection. Per-step picks have been stored as authoring intent (`topology.json metadata.model_intent_scaffold_tier`); they take effect only when the pipeline is run on a per-step-capable tier (1, 1b, 1d)."
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
  9. **Preference bootstrap check**: IF `~/.superpipelines/model-preferences.json` does NOT contain an entry for `platform_profile.tier`, emit advisory: "No model preferences configured for `<platform_profile.name>`. Run `/superpipelines:change-models` Mode E to set them, or accept profile defaults at first run." This is non-blocking — scaffolding completes either way.
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
