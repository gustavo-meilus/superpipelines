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
### PHASE 0: GIT PREFLIGHT
- <HARD-GATE>Run git preflight FIRST — before any other action. STOP if the workspace is not a valid git repository and present the user with three options: (a) proceed without git (Pattern 1 or 4 only), (b) initialize git, (c) cancel. Do NOT advance to Phase 1 until this gate is resolved.</HARD-GATE>
- **Goal**: Ensure the environment supports the isolation requirements of the selected pattern.

### PHASE 1: SCOPE & IDENTITY
- <HARD-GATE>Ask the user to choose a deployment scope (`local`, `project`, or `user`) and a pipeline name BEFORE proceeding to Phase 2. Resolve all paths via `sk-pipeline-paths`. Validate the name: lowercase/hyphens only, ≤48 chars, unique in the scope's `registry.json`. Do NOT advance to Phase 2 without a confirmed scope and a valid, unique pipeline name.</HARD-GATE>

### PHASE 2: BRIEF REFINEMENT (4D)
- Apply the 4D Method to deconstruct core intent and constraints.
- Acknowledge if the user requested a specific output format. If not specified, deduce an appropriate format based on the pipeline's goal (e.g., markdown files, code snippets, code files).
- <HARD-GATE>If ≥3 critical slots are missing (goal, success criteria, scope, data), STOP and ask targeted questions.</HARD-GATE>

### PHASE 3: PATTERN SELECTION
- Select a topology pattern (Sequential, Parallel, Iterative, Gated, or Spec-Driven) using the `sk-pipeline-patterns` decision tree.
- **Restriction**: If git is absent, limit selection to Pattern 1 or 4.

### PHASE 4: DESIGN & AUDIT LOOP
- **Dispatch Architect**: Generate `spec.md`, `plan.md`, `tasks.md`, `topology.json`, and all step-specific agents/skills.
- **Output Formatter Rule**: The Architect MUST append a specific `output-formatter` step as the final node in the topology, designed to transform the output into the deduced format and save it to the `<workspace-root>/output/` folder.
- **Dispatch Auditor**: Review all generated files in DELTA mode.
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
  4. `<scope-root>/superpipelines/pipelines/{P}/topology.json`
  5. `<scope-root>/skills/superpipelines/{P}/run-{P}/SKILL.md` (entry skill, `user-invocable: true`)
  6. All step agents and skills under `<scope-root>/agents/superpipelines/{P}/` and `<scope-root>/skills/superpipelines/{P}/`
  7. Updated `<scope-root>/superpipelines/registry.json`
</HARD-GATE>
- Confirm to the user: "Pipeline `{P}` scaffolded. Use `/superpipelines:run-pipeline` to execute it."
</protocol>

<invariants>
- NEVER hardcode paths; always resolve via `sk-pipeline-paths`.
- NEVER generate the entry skill before human approval of the `tasks.md` and `topology.json`.
- All internal step skills MUST be marked `user-invocable: false`.
- Any modification to the design MUST trigger a re-audit for SEV-0/1 issues.
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
