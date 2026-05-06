# Agent Frontmatter Schema — Architect Reference

Canonical YAML frontmatter for pipeline subagents. Use this when generating new agent files via `pipeline-architect`.

## Schema

```yaml
---
name: lowercase-hyphens          # ≤64 chars, matches filename
description: triggering conditions only — third person, ≤1024 chars
tools: Read, Write, Edit, Bash, Glob, Grep   # explicit allowlist
disallowedTools: Write, Edit                 # explicit denylist (read-only agents)
model: sonnet                                 # SONNET_ONLY default; non-sonnet requires user opt-in
effort: low | medium | high | xhigh | max
maxTurns: 25                                  # bounds execution
version: "1.0"                                # bump on breaking change
permissionMode: default | acceptEdits | plan | bypassPermissions   # optional; omit = default
memory: none | local                          # optional; omit = none. NEVER "project"
skills:                                       # ONLY sk-* preloaded method skills
  - sk-4d-method
  - sk-pipeline-paths
mcpServers:
  - server-name
background: false
isolation: worktree                           # Patterns 2/2b/3/5
---
```

## Field rules

| Field | Required | Notes |
|-------|----------|-------|
| `name` | yes | Lowercase + hyphens only. Matches filename (without `.md`). |
| `description` | yes | Routing contract. Triggering conditions only. NEVER summarize workflow. Third person. |
| `tools` | recommended | Minimal allowlist. Read-only agents: omit Write/Edit/Bash. |
| `disallowedTools` | optional | Use to deny tools the agent must never call. Reviewers must deny Write/Edit/Bash. |
| `model` | yes | `sonnet` by default. Non-sonnet: document user opt-in in Architect's Brief and agent body. |
| `effort` | yes | Architect/auditor: `high`. Workers: `medium`. Triage: `low`. |
| `maxTurns` | yes | Read-only: 15–25. Generation: 30–40. Validation: 10–15. |
| `version` | yes | Bump major on breaking change to output schema or required inputs. |
| `permissionMode` | optional | `acceptEdits` for implementation agents; `plan` for analysis-only; omit or `default` for standard. `bypassPermissions` requires inline justification in agent body. |
| `memory` | optional | `local` for agents persisting learned heuristics. Omit (= `none`) for stateless agents. NEVER `project`. |
| `skills` | recommended | ONLY shared `sk-*` skills. Never large workflow skills. Never companion-reference skills. |
| `isolation` | conditional | `worktree` for parallel/iterative patterns. Omit for read-only analysis. |
| `background` | optional | `true` only for fire-and-forget observers. Default `false`. |

## NEVER use

- `memory: project` — state goes to `pipeline-state.json` in the temp directory.
- Companion `<agent>-references` in `skills:` frontmatter — read reference files on demand via `Read`.
- Large workflow skills (`brainstorming`, `creating-a-pipeline`, etc.) in `skills:` frontmatter.
- Hooks specifying per-agent Bash auto-allow when `Bash(*)` is already in plugin `settings.json` permissions.

## permissionMode selection guide

| Agent role | Recommended permissionMode |
|------------|---------------------------|
| Implementation / task-executor | `acceptEdits` |
| Architect (design only) | `plan` |
| Auditor / reviewer | `plan` (reviewers also use `disallowedTools`) |
| Orchestrator skill | omit (controlled by plugin `settings.json`) |
| Agent requiring unrestricted access | `bypassPermissions` — ONLY with documented user justification in agent body |

## memory selection guide

| Agent role | Recommended memory |
|------------|-------------------|
| Stateless worker (most agents) | omit or `none` |
| Agent learning command patterns across runs | `local` |
| Any agent | NEVER `project` |

## Effort selection

| Task type | Effort |
|-----------|--------|
| Triage / routing / extraction | `low` |
| Most worker agents | `medium` |
| Architect / auditor / multi-file analysis | `high` |
| Cross-system integration with competing constraints | `xhigh` |
| Truly ambiguous, last-resort problems | `max` |

## Capability contract (agent body)

Every agent body must declare its contract near the top:

```markdown
# Inputs required: {task_file_path}, {project_context}, {scope_root}
# Output schema: { "status": "DONE|BLOCKED|...", "outputs": [...] }
# Breaking change log: v1.0 — initial release
```

## Versioning rules

Breaking (bump major):
- Output schema changes (field names, types, required fields).
- Required input changes.
- Tool removal that orchestrator depends on.
- Status protocol changes.

Non-breaking (no bump):
- Internal reasoning improvements.
- Optional output fields added.
- Effort level changes.
- `permissionMode` or `memory` changes.
- Tools added that don't change output schema.
