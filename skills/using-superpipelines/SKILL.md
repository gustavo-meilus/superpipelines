---
name: using-superpipelines
description: Use when starting any conversation in a project that has the superpipelines plugin installed — establishes how to design, run, and manage AI pipelines, when to invoke pipeline-specific skills, and which subagents handle which roles
---

<SUBAGENT-STOP>
If dispatched as a subagent to execute a specific task, skip this skill. Subagents do not orchestrate; they perform a single role and exit with a status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED).
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If a pipeline skill applies to the user's request, invoke it. Do not rationalize past it.

Pipelines fail silently when skills are skipped — the agent believes it followed the workflow, but the body never loaded. Trust the routing rules below.
</EXTREMELY-IMPORTANT>

## What superpipelines is

A plugin for designing and running multi-agent AI pipelines. Supports multiple named pipelines per workspace, three deployment scopes (local / project / user), and step-level create/update/delete operations with integrated audit.

## Instruction priority

1. User's explicit instructions (CLAUDE.md / direct messages) — highest.
2. Superpipelines skills — override default behavior where they conflict.
3. Default system prompt — lowest.

If the user says "skip the spec phase," follow the user. The user is in control.

## How to access skills

Use the `Skill` tool to invoke any skill by name. Follow the skill's content. Never `Read` a SKILL.md directly — body still loads but discovery and caching break.

## Routing rules — when to invoke which skill

| User says / situation | Skill to invoke |
|-----------------------|-----------------|
| "Design a pipeline" / "Build a workflow for…" / `/new-pipeline` | `creating-a-pipeline` |
| "Run the pipeline" / "Which pipelines are available?" / `/run-pipeline` | `running-a-pipeline` |
| "Add a step to [pipeline]" / `/new-step` | `adding-a-pipeline-step` |
| "Update [step] in [pipeline]" / `/update-step` | `updating-a-pipeline-step` |
| "Delete / remove [step] from [pipeline]" / `/delete-step` | `deleting-a-pipeline-step` |
| "Audit [pipeline]" / "Review my pipeline definitions" / `/audit-pipeline` | dispatch `pipeline-auditor` subagent |
| Ambiguous request before any pipeline work | run the 4D Method internally — load `sk-4d-method` |
| About to start multi-step feature work | load `sk-spec-driven-development` |
| About to author or modify an agent / skill | load `sk-claude-code-conventions` |
| Choosing an execution pattern | load `sk-pipeline-patterns` |

The detailed routing checklist is in `references/skill-routing.md`.

## The Rule

Invoke relevant or requested skills BEFORE any response or action. Even a 1% chance a pipeline skill applies = invoke and check. If wrong, drop it.

## Pipeline invariants (memorize)

- `SUB_AGENT_SPAWNING: FALSE` — Subagents don't spawn children. Orchestration lives at the parent session / top-level skill.
- `WRITE_REVIEW_ISOLATION: TRUE` — The agent that writes never reviews. Stage 1 (spec compliance) gates Stage 2 (code quality).
- `MODEL_SELECTION: SONNET_ONLY` — Every agent defaults to `model: sonnet`. Non-sonnet requires explicit user opt-in.
- `PERMISSION_MODE: PER_AGENT` — `permissionMode` may be set per agent: `acceptEdits` for executors, `plan` for reviewers. `bypassPermissions` requires documented justification.
- `MEMORY: LOCAL_ONLY` — `memory: local` is allowed for learned heuristics. `memory: project` is forbidden.
- `MULTI_PIPELINE: TRUE` — Multiple named pipelines coexist per workspace, each in an isolated bundle.
- Pipeline state lives in `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`.
- Temp dirs are deleted on `DONE`; preserved on `ESCALATED / FAILED / BLOCKED`.
- Agents emit exactly one of `DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED` before exiting.

## Common mistakes

- Reading a SKILL.md with `Read` instead of invoking via `Skill` tool — body still loads, but discovery and caching break.
- Dispatching Stage 2 review without Stage 1 passing — over-build is a Stage 1 failure, not Stage 2.
- Letting an iterative loop run forever — hard cap at 3 iterations without measurable progress.
- Storing pipeline state under `tmp/` instead of `<scope-root>/superpipelines/temp/{P}/{runId}/` — convention violated.
- Deleting a step without gap analysis — creates a silently broken pipeline.

## Red Flags — STOP

- "I already know what the pipeline should do, skip the spec" → Run `creating-a-pipeline` anyway. The spec is the contract that lets parallel workers stay in sync.
- "One more iteration should fix it" (after 2+ failures with new failures appearing in new locations) → STOP. Escalate per Pattern 3.
- "The reviewer agent and the executor can be the same" → NO. `WRITE_REVIEW_ISOLATION: TRUE` is non-negotiable.
- "I'll skip the worktree for a small change" → If Pattern 2/2b/3/5 selected, worktree is required. Run `sk-worktree-safety`.
- "The audit is optional for a quick change" → Audit is mandatory on every pipeline mutation. It is the guard against silent gaps and flaws.
