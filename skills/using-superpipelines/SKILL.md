---
name: using-superpipelines
description: Use when starting any conversation in a project that has the superpipelines plugin installed — establishes how to design, run, and manage AI pipelines, when to invoke pipeline-specific skills, and which subagents handle which roles
---

# Using Superpipelines — Core Orchestration Reference

> Establishes the foundational rules for designing, executing, and managing multi-agent AI pipelines. Trigger when starting any conversation in a project where Superpipelines is installed.

<SUBAGENT-STOP>
If dispatched as a subagent to execute a specific task, skip this skill. Subagents do not orchestrate; they perform a single role and exit with a terminal status (DONE, NEEDS_CONTEXT, BLOCKED).
</SUBAGENT-STOP>

<overview>
Superpipelines is a framework for designing and running multi-agent workflows across three deployment scopes (Local, Project, User). It enforces rigorous architectural standards, including non-negotiable write/review isolation, model selection constraints, and audit-driven mutations to ensure stability in production AI environments.
</overview>

<EXTREMELY-IMPORTANT>
If a pipeline skill applies to the user's request, invoke it. Do not rationalize past it. Pipelines fail silently when specialized skills are skipped—the orchestrator must trust the defined routing protocols.
</EXTREMELY-IMPORTANT>

## Skill Routing Protocols

<routing_table>
| User Request / Situation | Skill to Invoke | Rationale |
| :--- | :--- | :--- |
| `/new-pipeline` or "Design a workflow" | `creating-a-pipeline` | End-to-end scaffolding. |
| `/run-pipeline` or "Execute [P]" | `running-a-pipeline` | Registry-driven launcher. |
| `/new-step` or "Add capability" | `adding-a-pipeline-step` | Topology mutation. |
| `/update-step` or "Modify agent" | `updating-a-pipeline-step` | Contract-aware update. |
| `/delete-step` or "Remove step" | `deleting-a-pipeline-step` | Gap-analysis removal. |
| `/audit-pipeline` | `pipeline-auditor` | Security/topology review. |
| Ambiguous / Discovery phase | `sk-4d-method` | Intent deconstruction. |
| Implementation / Task execution | `sk-spec-driven-development` | Contracted development. |
| Authoring Agents or Skills | `sk-claude-code-conventions` | Format enforcement. |
</routing_table>

## Core Pipeline Invariants

<invariants>
- **`SUB_AGENT_SPAWNING: FALSE`**: Subagents must not spawn children; orchestration is restricted to the top-level parent.
- **`WRITE_REVIEW_ISOLATION: TRUE`**: The agent that writes code never reviews it. Stage 1 (Compliance) gates Stage 2 (Quality).
- **`MODEL_SELECTION: SONNET_ONLY`**: All agents default to `model: sonnet` unless the user explicitly opts into another model.
- **`STATE_PERSISTENCE`**: All state must reside in `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`.
- **`ATOMIC_MUTATION`**: Topology changes must be staged in `edit-{ts}/` before promotion.
</invariants>

## Red Flags — STOP
- "I already know what to do, skip the spec." → **STOP**. The spec is the contract for parallel worker synchronization.
- "One more iteration should fix it." → **STOP**. Hard cap at 3 iterations without measurable progress; escalate per Pattern 3.
- "The reviewer and executor can be the same." → **STOP**. Write/review isolation is a non-negotiable security boundary.
- "Skip the worktree for a small change." → **STOP**. If the pattern requires isolation, the safety protocol is mandatory.
- "The brief is detailed, I'll skip git preflight and scope selection." → **STOP**. `creating-a-pipeline` Phases 0 and 1 are mandatory. Run them before the 4D analysis.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "I'll read the skill file directly." | Using `Read` instead of `Skill` tool breaks discovery, caching, and body-loading logic. |
| "The user said it's urgent, skip audit." | A 30-second audit prevents silent topology gaps that lead to catastrophic runtime failure. |
| "The state file is too complex." | Standardized state is the only path to reliable resumption and multi-step recovery. |
| "The brief is complete, skip preflight." | Git preflight and scope selection are non-negotiable. A rich brief does not substitute for environment validation or deployment scope confirmation. |
| "I'll write state to `tmp/`." | The canonical state path is `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`. The `tmp/` path is a retired pattern. |
</rationalization_table>

## Reference Files
- `sk-pipeline-paths/SKILL.md` — Scope and path resolution.
- `sk-pipeline-patterns/SKILL.md` — Topology selection.
- `sk-write-review-isolation/SKILL.md` — Two-stage review protocol.
- `sk-rationalization-resistance/SKILL.md` — Resistance mechanism standards.
