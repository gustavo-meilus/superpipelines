---
name: creating-a-pipeline
description: Use when the user asks to design a pipeline, build a workflow for X, plan multi-step feature work, or invokes /superpipelines:new-pipeline. Walks git preflight, scope selection, pattern selection, architect dispatch, pre-gate audit, and human approval to produce a runnable named pipeline bundle.
---

# Creating a Pipeline

End-to-end workflow for designing and scaffolding a new named multi-agent pipeline. Owns the path from a user brief to an approved, runnable pipeline bundle.

## When this fires

- `/superpipelines:new-pipeline` invoked.
- "Design a pipeline that…" / "Build me a workflow for…"
- Multi-step feature work where no pipeline or spec exists yet.

When NOT to use:

- A pipeline exists and user wants to run it → `running-a-pipeline`.
- User wants to add / update / delete a step → step-management skills.
- Single-line fix or rename → execute directly.

## Workflow

### Phase 0 — Git preflight

```bash
git -C "$(pwd)" rev-parse --is-inside-work-tree 2>/dev/null
```

If the command fails (not a git repo), present three options via `AskUserQuestion`:

1. **Proceed without git** — worktree-isolated patterns (2, 2b, 3, 5) will be disabled for this pipeline.
2. **Run git init here** — run `git init`, then continue.
3. **Cancel** — stop; emit `BLOCKED`.

Record the decision in pipeline metadata. If git is absent and user proceeds: restrict available patterns to 1 and 4 in Phase 3.

### Phase 1 — Scope selection

Ask via `AskUserQuestion`:

> Which scope should this pipeline use?
> - `local` — `.claude/` in this workspace, **not** committed (machine-only)
> - `project` — `.claude/` in this workspace, committed to git (team-shared)
> - `user` — `~/.claude/`, global across all workspaces

Resolve all output paths for the rest of this workflow using `sk-pipeline-paths`.

For `local` scope: note to the user that `.claude/` should be added to `.gitignore` if they intend to keep the pipeline private. Do not auto-modify `.gitignore` — that is the user's decision.

### Phase 2 — Name and collision check

Ask for a pipeline name. Validate:
- Lowercase + hyphens only (`[a-z0-9-]+`).
- ≤48 chars (entry skill will be named `run-{P}`, combined must stay ≤64).
- Not already present in `{ROOT}/superpipelines/registry.json` for the chosen scope.

On collision: suggest `{name}-2` or ask the user for a different name.

### Phase 3 — Brief intake (4D Deconstruct)

Apply the 4D Method per `sk-4d-method` (internally — surface only if user asks "show 4D"):

1. Extract core intent and constraints.
2. Surface implicit assumptions (audience, scope, success criteria).
3. Restate as a precise task definition.

<HARD-GATE>
If three or more critical slots are missing (goal, constraints, success criteria, scope, affected data), STOP and ask 3–5 targeted questions framed as options. Do NOT proceed with hidden assumptions.
</HARD-GATE>

If the brief is vague ("not sure what we need"), invoke `brainstorming` first.

### Phase 4 — Pattern selection

Use the decision tree from `sk-pipeline-patterns`:

```
Multi-step with dependencies?
├── No → no pipeline; execute directly.
└── Yes
    ├── Sub-tasks independent and mergeable?  → Pattern 2 / 2b (Parallel Fan-Out)
    ├── Fix / heal cycle needed?              → Pattern 3 (Iterative Loop)
    ├── Destructive / irreversible action?    → Pattern 4 (Human-Gated)
    ├── Feature needing spec/plan/tasks?      → Pattern 5 (SDD) ← most common
    └── Strictly linear, dependent phases?   → Pattern 1 (Sequential)
```

If git is absent (Phase 0): restrict to Pattern 1 or 4 only. State the chosen pattern and a 1-sentence rationale.

### Phase 5 — Architect dispatch

Dispatch `pipeline-architect` in PIPELINE mode with:
- The 4D-refined brief from Phase 3.
- The selected pattern.
- Scope root and pipeline name (resolved via `sk-pipeline-paths`).
- Instruction to produce: `spec.md`, `plan.md`, `tasks.md`, `topology.json`, all step agents, and all internal step skills.
- Note: all step skills must have `user-invocable: false`; entry skill will be generated in Phase 7.

Wait for `DONE` or `DONE_WITH_CONCERNS`. Handle `NEEDS_CONTEXT` / `BLOCKED` per the status protocol.

### Phase 6 — Pre-gate audit

Dispatch `pipeline-auditor` in DELTA mode on all newly written files:
- All step agent files.
- All internal step skill files.
- The `topology.json`.

<HARD-GATE>
If the auditor returns any SEV-0 or SEV-1 findings: dispatch `pipeline-architect` in UPDATE mode to fix them. Re-run the audit. Do NOT proceed to Phase 7 until the audit returns no SEV-0/1 findings.
</HARD-GATE>

### Phase 7 — Human approval gate

Present to the user:
- The Mermaid topology diagram from the Architect's Brief.
- A summary of `spec.md` (goal + acceptance criteria).
- The full `tasks.md`.
- The audit result (pass/warnings).

Ask via `AskUserQuestion`:

> Pipeline "{P}" is ready for review. [APPROVE | REVISE]

On `REVISE`: collect specific feedback; return to Phase 3 or Phase 4. Do NOT generate the entry skill until approved.

### Phase 8 — Entry-skill generation

Write `{ROOT}/skills/superpipelines/{P}/run-{P}/SKILL.md` with:
- Frontmatter: `name: run-{P}`, `disable-model-invocation: true`, `user-invocable: true`.
- Description: triggering conditions only (e.g., "Use when the user wants to run the {P} pipeline end-to-end").
- Body: orchestrates full pipeline execution — state init → per-step dispatch in topology order → Stage 1 spec review → Stage 2 quality review → cleanup. References step agents and skills by their resolved absolute paths.

### Phase 9 — Registry write

Create or update `{ROOT}/superpipelines/registry.json` with the new pipeline record (see `sk-pipeline-paths` registry schema). Set `last_audit` to the Phase 6 audit result.

Emit terminal status:

```json
{ "status": "DONE", "outputs": ["<entry skill path>", "<registry path>"] }
```

## Common mistakes

- Skipping Phase 0 → worktree operations silently fail mid-run.
- Skipping Phase 6 audit → broken topology ships and surfaces only at first run.
- Generating the entry skill before APPROVE → wastes work if user revises.
- Writing state to `tmp/` instead of `superpipelines/temp/{P}/{runId}/` → path convention violated.

## Red Flags — STOP

- "The audit only found SEV-2 issues, let's proceed" → SEV-0/1 must be clear before the human gate. Re-dispatch architect.
- "The user said skip the spec" → The spec is the contract for parallel workers. Use `brainstorming` if the brief is vague.
- "I'll skip the human gate to save time" → N parallel workers implement the spec. One misunderstanding = N wrong implementations.

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "The pipeline looks correct, the audit is extra overhead" | SEV-0 topology errors only surface at run-time without the audit. Gate cost: ~30s. Recovery cost: re-run from Phase 5. |
| "The user knows git, no need for the preflight" | Worktree creation silently fails in non-git workspaces. The preflight prevents a blocked mid-run escalation. |
| "One iteration should fix the SEV-1" | Re-audit after every fix. A fix may introduce a new violation. |
