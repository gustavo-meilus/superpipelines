# Superpipelines and Loop Engineering

Loop engineering is the practice of designing the repeatable control loop around an AI agent instead of prompting it step by step: a trigger starts the run, the agent acts with bounded tools, a verifier checks the output, failures feed a bounded retry, and the loop stops on pass criteria, iteration caps, or human escalation. The term entered wide use in mid-2026 through Addy Osmani's essay and LangChain's writing on stacked agent loops (sources below).

Superpipelines is a loop engineering framework for AI coding agents. It does not replace prompting; it replaces manual prompt-by-prompt steering with reusable, bounded, review-gated pipelines. This page maps each loop ingredient to the concrete Superpipelines mechanism that implements it.

## Ingredient mapping

| Loop ingredient | Superpipelines mechanism |
| :--- | :--- |
| Trigger | Manual today: `/superpipelines:run-pipeline` or a direct `/superpipelines:{P}` launcher. Scheduled and event-driven triggers (GitHub Actions templates) are on the roadmap. |
| Goal / spec | `creating-a-pipeline` runs a brief-hardening interrogation, then `pipeline-architect` generates `spec.md`, `plan.md`, and `tasks.md`. The spec is the contract that synchronizes parallel workers. |
| Context loading | Repo instructions (`AGENTS.md` / `CLAUDE.md`), per-pipeline protocol skills, and optional `PIPELINE-CONTEXT.md` maps from `/superpipelines:init-deep`. |
| Action / tool use | Writer agents receive implementation tasks with explicit tool allowlists; task executors work one bounded task each, in isolated worktrees where the pattern requires it. |
| Observation | Reviewers read diffs, test output, and logs. Orchestrators read structured state, not chat history. |
| Verification | Two-stage review: Stage 1 spec compliance gates Stage 2 quality audit. Reviewer agents are structurally denied Write/Edit/Bash on hosts that enforce tool restrictions. |
| Bounded retry | The iterative loop pattern caps repair at 3 iterations without measurable progress, then escalates. A failure analyzer decides between fix and architectural escalation. |
| Stop condition | Pass criteria, the iteration cap, and human gates at high-stakes transitions. The pipeline halts rather than rationalizing past a failed gate. |
| Memory / trace | Crash-resumable state at `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json` with a phase ledger and checkpoints. Interrupted runs resume from the last stable step. |
| Safety boundary | Permission-layer isolation per host (`tools:`/`disallowedTools:` on Claude Code, `permission: { edit: deny }` on OpenCode, `sandbox_mode = "read-only"` on sandboxed Codex), with an explicit advisory warning wherever a host cannot enforce the boundary. |

## What we claim, and what we do not

Claims this project stands behind:

- Superpipelines turns AI coding assistants into disciplined engineering loops with isolated review, resumable state, and bounded repair.
- Reviewer isolation is structural where the host supports tool restrictions, and honestly advisory where it does not. The degradation is surfaced, never hidden.
- The same pipeline definition materializes natively across Claude Code, OpenCode, and Codex, and runs inline on Cursor, Windsurf, and Cline.

Claims you will not find here:

- Not "the first loop engineering framework". Others use the term; the practice predates the name.
- Not "fully autonomous software engineering". The value is bounded autonomy: hard caps, human gates, honest verdicts.
- Not "replaces prompt engineering". Prompts move into durable artifacts (specs, skills, reviewer rubrics); they do not disappear.
- Not "guaranteed safe". A loop is only as trustworthy as its verifier and its permission model, and both depend on the host.

## The known gap: triggers

A complete loop engineering story includes event-driven triggers (a CI failure, a labeled issue, a schedule). Superpipelines is command-driven today. Documented GitHub Actions trigger templates are the planned first step; until they ship, this page lists the gap rather than papering over it.

## Sources

- Addy Osmani, "Loop Engineering": https://addyosmani.com/blog/loop-engineering/ (also on O'Reilly Radar)
- LangChain, "The Art of Loop Engineering": https://www.langchain.com/blog/the-art-of-loop-engineering
- Agent Skills open standard: https://agentskills.io
