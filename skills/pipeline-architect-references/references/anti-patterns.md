# Pipeline Architecture Anti-Patterns

Catalog of common failure modes when designing pipelines and agents. Each entry: name, symptoms, fix.

## Table of contents

1. The Diver
2. The Mega-Prompt
3. Context Dumping
4. Silent Failures
5. Tool Sprawl
6. Vague Description
7. Leaky Context
8. Over-Tooled
9. Workflow-Skill Preload
10. Companion-Reference Preload
11. Per-Agent Bash Hook with Global Allow
12. Memory Leak (memory: project)
13. Synchronous Iterative Loop
14. Single-Stage Review
15. Worktree Reuse Without Re-Baseline
16. Path-Traversal Handoff
17. Unqualified MCP Tool Names
18. Concurrent State Race
19. Hardcoded Plugin Paths

---

## 1. The Diver

**Symptoms:** One agent does everything (research + plan + implement + test + review). Context fills past 60%; reasoning quality collapses.

**Fix:** Decompose into RPI loop with separate agents per phase. `ANT_SWARM_PRINCIPLE: TRUE`. Pattern 5 is the canonical decomposition.

## 2. The Mega-Prompt

**Symptoms:** Agent body >150 lines; one giant numbered list; no structural sections.

**Fix:** Body ≤150 lines. Move depth to companion `<agent>-references/references/*.md`. Use clearly-named sections.

## 3. Context Dumping

**Symptoms:** Orchestrator pastes entire file contents into spawn prompts. Subagent context bloated with material it doesn't need.

**Fix:** `PASS_PATHS_NOT_CONTENT: TRUE`. Pass file path; let the worker read it. Exception: task text is content (extract from `tasks.md` once at orchestrator, pass extracted text per worker).

## 4. Silent Failures

**Symptoms:** Agent reports success; downstream phase fails; orchestrator can't tell what went wrong because no terminal status was emitted.

**Fix:** Every agent emits exactly one of `DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED` with the agent's output schema. Orchestrator NEVER ignores a non-`DONE` status.

## 5. Tool Sprawl

**Symptoms:** Agent has 15+ tools in `tools:` field. Most never invoked. Tool definitions consume context budget.

**Fix:** Minimal allowlist. Audit utilization: if a tool is invoked 0 times across 3 iterations, prune it.

## 6. Vague Description

**Symptoms:** "Helps with code review" — orchestrator can't decide when to dispatch. Agent never gets routed to the right tasks.

**Fix:** Triggering conditions only. Specific, action-oriented, includes WHEN and WHAT. Third person.

## 7. Leaky Context

**Symptoms:** Agent body references `CLAUDE.md`, parent system prompt, "as discussed earlier."

**Fix:** Body is self-contained. Receives all context via inputs. Never references parent state.

## 8. Over-Tooled

**Symptoms:** Read-only reviewer agent has Write/Edit tools. Reviewer accidentally edits the file it's reviewing.

**Fix:** Enforce `disallowedTools: Write, Edit` on reviewer agents. Reviewers READ ONLY.

## 9. Workflow-Skill Preload

**Symptoms:** Agent frontmatter `skills: [brainstorming, creating-a-pipeline, running-a-pipeline]`. Every agent startup injects ~3000 tokens of workflow content.

**Fix:** `skills:` preloads ONLY shared `sk-*` method skills (≤100 lines each). Workflow skills are session-level lazy invocation, not pre-injection.

## 10. Companion-Reference Preload

**Symptoms:** Agent frontmatter `skills: [pipeline-architect-references]`. Bloats startup context with files agent might never read.

**Fix:** Companion reference skills have NO `SKILL.md`. Agent reads `references/*.md` on demand via `Read` tool. Never preload.

## 11. Per-Agent Bash Hook with Global Allow

**Symptoms:** Every agent has `hooks: PreToolUse: matcher: Bash` with allow-stamp; plugin `settings.json` ALSO has `Bash(*)` in permissions.

**Fix:** Pick one. Prefer global `Bash(*)` in `settings.json`; remove per-agent hooks. Less noise, same outcome.

## 12. Memory Leak

**Symptoms:** Agent uses `memory: project` to persist state across runs. State scattered across `.claude/memory/*` files.

**Fix:** All pipeline state lives in `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json` per `STATE_MANAGEMENT: STRUCTURED_JSON`. `memory: local` is allowed for learned heuristics. Memory tool must never be used for deterministic pipeline state.

## 13. Synchronous Iterative Loop

**Symptoms:** Pattern 3 with no max-iterations cap; agents loop until context exhausted.

**Fix:** `<HARD-GATE>` after 3 failed iterations without measurable progress. Escalate per Pattern 3 escalation protocol.

## 14. Single-Stage Review

**Symptoms:** One reviewer checks both spec compliance and code quality. Stage 2 issues mask Stage 1 failures (or vice versa).

**Fix:** TWO stages, separate agents. Stage 1 (spec compliance) gates Stage 2 (code quality). Re-Stage-1 after every Stage 2 fix.

## 15. Worktree Reuse Without Re-Baseline

**Symptoms:** Pipeline reuses an existing worktree without running test baseline. Pre-existing failures get blamed on the new pipeline.

**Fix:** `sk-worktree-safety` Step 3: VERIFY_BASELINE every time, even on reused worktrees.

## 16. Path-Traversal Handoff

**Symptoms:** Agent uses `../../` paths to reference files outside its plugin/worktree.

**Fix:** All paths relative and start with `./`. Use symlinks if cross-tree references are required. `${CLAUDE_PLUGIN_ROOT}` for plugin-relative paths.

## 17. Unqualified MCP Tool Names

**Symptoms:** Agent calls `bigquery_schema` without server qualifier. Fails when multiple MCP servers expose tools with similar names.

**Fix:** Always fully qualified: `ServerName:tool_name` (e.g., `BigQuery:bigquery_schema`).

## 18. Concurrent State Race

**Symptoms:** Two pipelines run concurrently in same workspace; each overwrites the other's state.

**Fix:** Each named pipeline `{P}` gets its own directory under `superpipelines/temp/{P}/`. Within the same `{P}`, only one active run is allowed. Orchestrator refuses to start if active state exists.

## 19. Hardcoded Plugin Paths

**Symptoms:** Agent body references `~/.claude/agents/...` or absolute paths.

**Fix:** `${CLAUDE_PLUGIN_ROOT}` for plugin-relative; `${CLAUDE_PLUGIN_DATA}` for persistent state; never `~/.claude/...`.
