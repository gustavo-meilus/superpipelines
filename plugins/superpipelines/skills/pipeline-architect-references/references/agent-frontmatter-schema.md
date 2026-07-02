# Legacy Agent Frontmatter Schema - Architect Reference

This reference applies only to legacy old-root pipeline artifacts that still use tool-native agent files under `agents/superpipelines/{P}/` plus companion protocol skills under `skills/superpipelines/{P}/`.

New pipeline scaffolding MUST NOT use this schema. New data-only pipelines use the canonical agent definition (CAD): one file at `DATA_ROOT/pipelines/{P}/agents/{agent-name}.md` containing tool-neutral frontmatter plus inline protocol body. For new CADs, use:

- `pipeline-auditor-references/references/canonical-agent-def.md` for schema authority.
- `pipeline-architect-references/references/sdd-artifacts.md` for the authoring template.

## Table of contents

1. Legacy Old-Root Schema / Schema
2. Field rules
3. NEVER use
4. permissionMode selection guide
5. memory selection guide
6. Effort selection
7. Protocol skill companion
8. Operating Modes / Workflow
9. Reference Files

## Legacy Old-Root Schema

## Schema

```yaml
---
name: lowercase-hyphens          # ≤64 chars, matches filename
description: triggering conditions only — third person, ≤1024 chars
tools: Read, Write, Edit, Bash, Glob, Grep   # explicit allowlist
disallowedTools: Write, Edit                 # explicit denylist (read-only agents)
model_tier: medium                            # triage | fast | medium | deep | inherit (runtime-resolved via sk-model-resolver)
effort_tier: medium                           # low | medium | high (optional; orthogonal to model_tier)
maxTurns: 25                                  # bounds execution
version: "1.0"                                # bump on breaking change
plugin_version: "1.0.6"                       # superpipelines version that created/last-modified this agent
permissionMode: default | acceptEdits | plan | bypassPermissions   # optional; omit = default
memory: none | local                          # optional; omit = none. NEVER "project"
skills:                                       # sk-* method skills + ONE companion {name}-protocol skill
  - sk-4d-method
  - sk-pipeline-paths
  - pipeline-{name}-protocol                  # companion protocol skill; holds all operational logic
mcpServers:
  - server-name
background: false
isolation: worktree                           # ONLY for steps that modify tracked code under Patterns 2/2b/3/5.
                                                  # OMIT for data-retrieval/generation agents (no tracked-code writes):
                                                  # a worktree with no tracked changes is auto-cleaned by Claude Code,
                                                  # destroying any gitignored artifact the agent produced.
                                                  # Worktrees branch from the DEFAULT branch, not the parent HEAD.
---
```

## Field rules

| Field | Required | Notes |
|-------|----------|-------|
| `name` | yes | Lowercase + hyphens only. Matches filename (without `.md`). |
| `description` | yes | Routing contract. Triggering conditions only. NEVER summarize workflow. Third person. |
| `tools` | recommended | Minimal allowlist. Read-only agents: omit Write/Edit/Bash. |
| `disallowedTools` | optional | Use to deny tools the agent must never call. Reviewers must deny Write/Edit/Bash. |
| `model_tier` | yes | One of `triage | fast | medium | deep | inherit`. Runtime-resolved via `sk-model-resolver`. Architect MUST emit this; MUST NOT emit `model:`. |
| `effort_tier` | optional | One of `low | medium | high`. Orthogonal to `model_tier`. Emitted only on platforms with `effort_field_name` set. |
| `model` | DISCOURAGED | Escape hatch. Explicit concrete model bypasses tier resolution. Auditor surfaces as SEV-3 info. Use only for advanced cases (e.g., custom fine-tuned model). |
| `maxTurns` | yes | Read-only: 15–25. Generation: 30–40. Validation: 10–15. |
| `version` | yes | Bump major on breaking change to output schema or required inputs. |
| `plugin_version` | yes | The superpipelines package version (semver) that created or last modified this agent. Stamp at creation and on any mutation (add/update/delete step). Enables future retro-compatibility checks. |
| `permissionMode` | optional | `acceptEdits` for implementation agents; `plan` for analysis-only; omit or `default` for standard. `bypassPermissions` requires inline justification in the companion `{name}-protocol` skill. |
| `memory` | optional | `local` for agents persisting learned heuristics. Omit (= `none`) for stateless agents. NEVER `project`. |
| `skills` | recommended | `sk-*` method skills plus the ONE companion `{agent-name}-protocol` skill. Never large workflow skills. Never `*-references` skills. |
| `isolation` | conditional | `worktree` ONLY for steps that modify tracked code under Patterns 2/2b/3/5. OMIT for any agent that does not write tracked code (read-only analysis AND data-retrieval/generation agents that only emit coordination artifacts). A worktree with no tracked changes is auto-cleaned by Claude Code, destroying gitignored artifacts; and worktrees branch from the default branch, not the parent HEAD. |
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
| Agent requiring unrestricted access | `bypassPermissions` — ONLY with documented user justification in the companion `{name}-protocol` skill |

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

## Protocol skill companion

Every agent file is zero-body (no text after the closing `---`). All operational logic lives in a companion skill:

```markdown
---
name: pipeline-{name}-protocol
description: Loaded by the pipeline-{name} agent to supply operating modes, protocol, and invariants. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Pipeline {Name} — Operational Protocol

<overview>...</overview>
<glossary>...</glossary>
## Operating Modes / Workflow
<protocol>...</protocol>
<invariants>...</invariants>
## Reference Files
```

Place the companion skill at `skills/superpipelines/{P}/{agent-name}-protocol/SKILL.md`.

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
