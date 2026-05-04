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
- Verify the current workspace is a valid git repository.
- **Failures**: Prompt the user to proceed without git (disabling worktree patterns), initialize git, or cancel.
- **Goal**: Ensure the environment supports the isolation requirements of the selected pattern.

### PHASE 1: SCOPE & IDENTITY
- Select scope (`local`, `project`, or `user`) and resolve paths via `sk-pipeline-paths`.
- Validate the pipeline name: lowercase/hyphens, ≤48 chars, and unique in the registry.

### PHASE 2: BRIEF REFINEMENT (4D)
- Apply the 4D Method to deconstruct core intent and constraints.
- <HARD-GATE>If ≥3 critical slots are missing (goal, success criteria, scope, data), STOP and ask targeted questions.</HARD-GATE>

### PHASE 3: PATTERN SELECTION
- Select a topology pattern (Sequential, Parallel, Iterative, Gated, or Spec-Driven) using the `sk-pipeline-patterns` decision tree.
- **Restriction**: If git is absent, limit selection to Pattern 1 or 4.

### PHASE 4: DESIGN & AUDIT LOOP
- **Dispatch Architect**: Generate `spec.md`, `plan.md`, `tasks.md`, `topology.json`, and all step-specific agents/skills.
- **Dispatch Auditor**: Review all generated files.
- <HARD-GATE>If any SEV-0 or SEV-1 findings are returned, re-dispatch the Architect to remediate before proceeding.</HARD-GATE>

### PHASE 5: HUMAN APPROVAL
- Present the topology diagram, spec summary, full task list, and audit results to the user.
- **Approval Required**: Do NOT generate the entry skill until the user explicitly approves the design.

### PHASE 6: FINALIZATION
- Generate the entry skill (`run-{P}/SKILL.md`) for full orchestration.
- Register the pipeline in `registry.json` with the latest audit results.
</protocol>

<invariants>
- NEVER hardcode paths; always resolve via `sk-pipeline-paths`.
- NEVER generate the entry skill before human approval of the `tasks.md` and `topology.json`.
- All internal step skills MUST be marked `user-invocable: false`.
- Any modification to the design MUST trigger a re-audit for SEV-0/1 issues.
</invariants>

## Red Flags — STOP
- "The audit only found SEV-2 issues, let's proceed." → **STOP**. SEV-0/1 must be zero before the human gate.
- "The user said skip the spec." → **STOP**. The spec is the non-negotiable contract for parallel execution.
- "I'll skip the human gate to save time." → **STOP**. One misunderstanding at this stage wastes all downstream implementation.

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
