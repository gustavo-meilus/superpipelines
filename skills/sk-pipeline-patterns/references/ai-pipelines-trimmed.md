# AI Pipelines — Trimmed Runtime Reference

> Canonical runtime reference for pipeline conventions. Cross-refs to `sk-claude-code-conventions` and `sk-*` skills carry the depth that this file omits.

## Table of contents

1. Core architecture invariants
2. Execution patterns 1–6 (gated)
3. Subagent status protocol
4. Write/review isolation
5. Worktree safety
6. Pipeline state schema + recovery
7. Rationalization resistance
8. Strict conventions essentials
9. Cross-references

---

## 1. Core architecture invariants

- `SUB_AGENT_SPAWNING: FALSE` — Subagents never spawn children. Orchestration lives in top-level skills (`creating-a-pipeline`, `running-a-pipeline`) or the parent session.
- `ANT_SWARM_PRINCIPLE: TRUE` — Prefer many small-context agents over single large-context agents. Reasoning quality degrades around 40–60% context fill.
- `PIPELINE_PHASE_ISOLATION: TRUE` — Tester, Analyzer, Healer (and Executor / Stage-1 Reviewer / Stage-2 Reviewer) are separate instances.
- `WORKTREE_MERGE_REQUIRED: TRUE` — If `isolation: worktree` is used, the orchestrator MUST commit and merge successful changes before worktree destruction. See `sk-worktree-safety`.

Agent definition cap: body ≤150 lines STRICT. Depth lives in companion `<agent>-references/references/*.md` (read on demand).

---

## 2. Execution patterns

Distilled selection table. Full per-pattern details in `sk-pipeline-patterns` SKILL.md.

| # | Name | Information flow | Worktree | Use when |
|---|------|------------------|----------|----------|
| 1 | Sequential | A → file → B → file → C | OPT-IN | Linear, dependent phases |
| 2 | Parallel Fan-Out / Merge | [A, B, C] → D | REQUIRED per branch | Independent analyses converge |
| 2b | Parallel with QA | [QA, Worker_A, Worker_B] | REQUIRED per branch | Concurrent QA validation |
| 3 | Iterative Loop | Tester → Analyzer → Fixer → restart | REQUIRED for loop scope | Fix/heal cycles |
| 4 | Human-Gated | Phase → GATE → APPROVE/REVISE | NEVER for read-only; REQUIRED for modification | Destructive or irreversible |
| 5 | Spec-Driven (SDD) | spec → plan → tasks → GATE → parallel implement | REQUIRED per task | Multi-step features |
| 6 | 4D Wrapper | Per-invocation: Deconstruct→Diagnose→Develop→Deliver | n/a | Inside Patterns 1–5, every turn |

### Pattern 3 escalation protocol (HARD-GATE)

After 3 failed iterations without measurable progress: STOP. Do NOT attempt iteration 4.

Early-stop signal: each fix reveals a new failure in a different location (architectural problem, not a fixable bug).

Action on early stop: escalate to human or invoke Pattern 4. Write current state to `pipeline-state.json` with `status: "escalated"`.

### Pattern 5 human approval gate (HARD-GATE)

Phase 4b — before parallel implementation:

> "Spec and tasks written. Review `spec.md` and `tasks.md` before I begin parallel implementation. [APPROVE | REVISE]"

Wait for APPROVE. If REVISE, return to Phase 1 or 2 based on the feedback type (see `sk-4d-method` feedback routing).

Rationale: Phase 5 dispatches N parallel agents. Misunderstood spec means N agents produce wrong output simultaneously. Gate cost: ~1 minute. Ungated mistake cost: discard all parallel work and restart.

---

## 3. Subagent status protocol

Every agent emits exactly one terminal status before exiting.

| Status | Condition | Orchestrator action |
|--------|-----------|---------------------|
| `DONE` | Task completed; outputs written | Proceed to next phase |
| `DONE_WITH_CONCERNS` | Task done; agent flagged doubts about correctness or scope | Read concerns; address before review if they touch correctness/scope, else proceed |
| `NEEDS_CONTEXT` | Cannot begin — critical info missing | Identify missing context; re-dispatch with same model + added context |
| `BLOCKED` | Cannot complete even with context | (1) provide more context; (2) higher effort/model; (3) decompose; (4) escalate to human. NEVER retry same approach |

Output schemas:

```json
{ "status": "DONE", "outputs": ["{path1}", "{path2}"] }
{ "status": "DONE_WITH_CONCERNS", "concerns": "<text>", "outputs": [...] }
{ "status": "NEEDS_CONTEXT", "missing": "<what is needed>" }
{ "status": "BLOCKED", "reason": "<description>", "attempted": "<what was tried>" }
```

Never ignore a non-`DONE` status. Never re-dispatch without addressing the root cause.

---

## 4. Write/review isolation

`WRITE_REVIEW_ISOLATION: TRUE`. Writer ≠ Reviewer (separate instances). Two stages:

- **Stage 1 (Spec Compliance):** Does output match spec exactly? Under-build AND over-build both fail.
- **Stage 2 (Code Quality):** Idiomatic? Maintainable? Edge cases per spec handled?

<EXTREMELY-IMPORTANT>
Stage 1 MUST pass before Stage 2 begins. Running Stage 2 on spec-noncompliant output is wasted work.
</EXTREMELY-IMPORTANT>

`OVER_BUILD_IS_SPEC_FAILURE` — adding unrequested features fails Stage 1. The reviewer does NOT excuse "useful extras."

`REVIEW_LOOP` — reviewer finds issues → implementer fixes → reviewer re-reviews. Terminate only when reviewer approves.

After any Stage 2 fix, re-run Stage 1 (the fix can break ACs or introduce over-build).

See `sk-write-review-isolation` for full output schemas and review loop.

---

## 5. Worktree safety

4-step protocol when `isolation: worktree` is used:

1. **VERIFY_IGNORED** — `.worktrees/` (or `worktrees/`) is git-ignored. If not, add and commit before creating any worktree.
2. **SETUP_AFTER_CREATE** — auto-detect manifest (`package.json`, `Cargo.toml`, `requirements.txt`, `go.mod`, etc.) and run setup.
3. **VERIFY_BASELINE** — run the full test suite before any implementation. If failing, do not proceed without human approval.
4. **COMMIT_BEFORE_DESTROY** — never `git worktree remove` with uncommitted changes; commit (or stash + commit) first.

See `sk-worktree-safety` for detection signals, per-pattern requirements, and Red Flags.

---

## 6. Pipeline state schema

Path: `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json` (scope-resolved by `sk-pipeline-paths`, NOT plugin-relative — plugin dirs wipe on update).

```json
{
  "pipeline_id": "<uuid>",
  "pipeline_name": "<P>",
  "scope_root": "<resolved scope root>",
  "run_id": "<uuid>",
  "started_at": "<iso8601>",
  "pattern": "1 | 2 | 2b | 3 | 4 | 5",
  "status": "running | completed | escalated | failed",
  "current_phase": 0,
  "phases": [
    { "index": 0, "name": "<phase>", "status": "pending|running|done|failed", "agent": "<name>", "outputs": ["<path>"], "error": null }
  ],
  "metadata": {}
}
```

Atomic writes: write to `pipeline-state.json.tmp`, then `mv` to final path.

Recovery rules:

- `status: running` AND `started_at < 1h ago` → live; refuse to start new.
- `status: running` AND `started_at > 1h ago` → treat as crashed; prompt user.
- `status: completed` → skip; "already done."
- `status: escalated | failed` → surface to human; do NOT auto-resume.
- Parse error → do NOT auto-resume; escalate.

See `sk-pipeline-state` for full rules and worked examples.

---

## 7. Rationalization resistance

Three mechanisms required in discipline-enforcing content:

1. `<HARD-GATE>` — wraps non-negotiable checkpoints (e.g., max iterations, human approval).
2. `<EXTREMELY-IMPORTANT>` — wraps rules frequently rationalized away. Use sparingly to preserve signal.
3. **Red Flags + Rationalization Table** — bullet list of exact rationalization phrases → corrective action; table of `| Excuse | Reality |`.

See `sk-rationalization-resistance` for tag conventions and authoring rules.

---

## 8. Strict conventions essentials

- `MODEL_SELECTION: SONNET_ONLY` — every pipeline agent is `model: sonnet`. Scale via `effort: low | medium | high | xhigh | max`.
- `PERMISSION_MODE: PER_AGENT` — each pipeline agent may declare `permissionMode: default | acceptEdits | plan | bypassPermissions`. Never use `bypassPermissions` without explicit user justification documented in the agent body.
- `STATE_MANAGEMENT: STRUCTURED_JSON` — `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json` only. No `memory: project`. `memory: local` is allowed for agents that persist learned heuristics.
- `AUTO_MEMORY: DISABLED` — `autoMemoryEnabled: false` in settings; `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` env var. Reclaims 658+ tokens.
- `BOUND_STDOUT: TRUE` — pipe long outputs through `tail -80` etc. before passing back.
- `SCOPE_FILE_READS: TRUE` — Read specific line ranges over full files when possible.
- `PASS_PATHS_NOT_CONTENT: TRUE` for large files. Exception: task text is content (extract once at orchestrator, pass extracted text to each worker — never tell the worker "find your task in tasks.md").
- `MCP tool naming: ServerName:tool_name` — always fully qualified.
- Path variables: `${CLAUDE_PLUGIN_ROOT}` (plugin dir, wipes on update), `${CLAUDE_PLUGIN_DATA}` (persists across updates), `${user_config.KEY}` (user config).
- Description discipline: triggering conditions only, NEVER workflow summary. See `sk-claude-code-conventions`.

---

## 9. Cross-references

- `sk-pipeline-patterns` — pattern selection skill that loads this file.
- `sk-4d-method` — Pattern 6 wrapper details.
- `sk-spec-driven-development` — Pattern 5 details + artifact templates.
- `sk-pipeline-state` — schema + recovery rules.
- `sk-worktree-safety` — 4-step protocol.
- `sk-write-review-isolation` — Stage 1/2 output schemas.
- `sk-rationalization-resistance` — tag conventions.
- `sk-claude-code-conventions` — frontmatter schemas, model selection, prompt-cache discipline.
