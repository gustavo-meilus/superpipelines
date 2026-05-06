# Skill Routing — Decision Table

When to invoke which superpipelines skill or agent. Source of truth for the routing rules in `using-superpipelines` SKILL.md.

## User-facing workflow skills

| Trigger phrase / context | Invoke |
|--------------------------|--------|
| "Design a pipeline that…" | `creating-a-pipeline` |
| "Build me a workflow for…" | `creating-a-pipeline` |
| "Plan multi-step feature work" | `creating-a-pipeline` |
| `/superpipelines:new-pipeline` invoked | `creating-a-pipeline` |
| "Run the pipeline" / "Execute [name]" | `running-a-pipeline` |
| "Which pipelines are available?" | `running-a-pipeline` |
| "Resume the pipeline" / `/run-pipeline --resume` | `running-a-pipeline` |
| `/superpipelines:run-pipeline` invoked | `running-a-pipeline` |
| "Add a step to [pipeline]" / "Insert [X] into [pipeline]" | `adding-a-pipeline-step` |
| `/superpipelines:new-step` invoked | `adding-a-pipeline-step` |
| "Update [step] in [pipeline]" / "Change how [step] works" | `updating-a-pipeline-step` |
| `/superpipelines:update-step` invoked | `updating-a-pipeline-step` |
| "Remove / delete [step] from [pipeline]" | `deleting-a-pipeline-step` |
| `/superpipelines:delete-step` invoked | `deleting-a-pipeline-step` |
| "Audit [pipeline]" / "Review my pipeline" | dispatch `pipeline-auditor` (FULL mode) |
| "Audit all pipelines" / `/audit-pipeline --all` | dispatch `pipeline-auditor` (SCOPE-WIDE mode) |
| `/superpipelines:audit-pipeline` invoked | dispatch `pipeline-auditor` |

## Subagent dispatch (direct)

| Trigger | Subagent | Mode |
|---------|----------|------|
| Design a full pipeline | `pipeline-architect` | PIPELINE |
| Add a step to an existing pipeline | `pipeline-architect` | STEP-ADD |
| Update an existing pipeline step | `pipeline-architect` | STEP-UPDATE |
| Delete a step from an existing pipeline | `pipeline-architect` | STEP-DELETE |
| Audit pipeline files | `pipeline-auditor` | FULL / DELTA / SCOPE-WIDE |
| Implement a task | `pipeline-task-executor` | — |
| Stage 1: spec compliance review | `pipeline-spec-reviewer` | — |
| Stage 2: code quality review (after Stage 1 passes) | `pipeline-quality-reviewer` | — |
| Iterative loop failure diagnosis | `pipeline-failure-analyzer` | — |

## Shared method skills (preloaded by agents — only invoke explicitly when authoring)

| Use case | Skill |
|----------|-------|
| Ambiguous request needs structured processing | `sk-4d-method` |
| Multi-step feature needs spec/plan/tasks | `sk-spec-driven-development` |
| Authoring or modifying an agent or skill | `sk-claude-code-conventions` |
| Choosing an execution pattern (Sequential, Fan-Out, Iterative, Human-Gated, SDD) | `sk-pipeline-patterns` |
| Resolving scope-aware artifact paths | `sk-pipeline-paths` |
| Tracking pipeline state across iterations | `sk-pipeline-state` |
| About to use a git worktree | `sk-worktree-safety` |
| Setting up two-stage review | `sk-write-review-isolation` |
| Authoring a discipline-enforcing skill | `sk-rationalization-resistance` |

## Supporting skills (loaded by workflow skills as needed)

| Use case | Skill |
|----------|-------|
| Refining a vague request via Socratic questions | `brainstorming` (loaded by `creating-a-pipeline` Phase 3) |
| Closing out the pipeline (merge / PR / cleanup) | `finishing-a-development-branch` (loaded by entry skill end phase) |
| Project signals TDD requirement | `test-driven-development` (loaded by `pipeline-task-executor`) |
| Iterative-loop failure diagnosis | `systematic-debugging` (loaded by `pipeline-failure-analyzer`) |
| Self-verify before reporting DONE | `verification-before-completion` (every executor) |

## When NOT to invoke a skill

- Trivial single-step tasks (rename, typo fix, config flip) — execute directly.
- Read-only Q&A about the codebase — use Read/Glob/Grep directly.
- User has explicitly said "skip the spec phase" or similar — user instruction wins.
- Subagent dispatched to perform a single role — skip orchestration skills, run the task, emit status.
