---
name: sk-pipeline-paths
description: Use when resolving scope-aware file paths for superpipelines artifacts — agents, skills, support files, temp directories, or the pipeline registry. Reference whenever scope (local, project, user) and a pipeline name are known and an absolute path is needed.
disable-model-invocation: true
user-invocable: false
---

# sk-pipeline-paths

Canonical path resolver for the superpipelines v2 layout. All generated pipeline artifacts live under a scope-dependent root. Never hardcode paths; always resolve through these templates.

## Scope roots

| Scope | Root prefix | Committed to git? | Note |
|-------|-------------|-------------------|------|
| `project` | `<workspace>/.claude/` | Yes | Team-shared pipelines |
| `local` | `<workspace>/.claude/` | No — add `.claude/` to `.gitignore` | Machine-only / throwaway |
| `user` | `~/.claude/` | No | Global, available in all workspaces |

`project` and `local` share the same physical root (`.claude/`). The distinction is whether that directory is gitignored.

## Path templates

Given `{ROOT}` (resolved above) and pipeline name `{P}`:

| Artifact | Path |
|----------|------|
| Pipeline registry | `{ROOT}/superpipelines/registry.json` |
| Spec / plan / tasks | `{ROOT}/superpipelines/pipelines/{P}/spec.md` (same dir for `plan.md`, `tasks.md`) |
| Topology graph | `{ROOT}/superpipelines/pipelines/{P}/topology.json` |
| Latest audit report | `{ROOT}/superpipelines/pipelines/{P}/audit/latest.md` |
| Entry skill | `{ROOT}/skills/superpipelines/{P}/run-{P}/SKILL.md` |
| Internal step skill | `{ROOT}/skills/superpipelines/{P}/{step}/SKILL.md` |
| Step agent | `{ROOT}/agents/superpipelines/{P}/{agent-name}.md` |
| Pipeline state | `{ROOT}/superpipelines/temp/{P}/{runId}/pipeline-state.json` |
| Run outputs | `{ROOT}/superpipelines/temp/{P}/{runId}/outputs/` |
| Staged edits | `{ROOT}/superpipelines/temp/{P}/edit-{ts}/` |

## Resolution procedure

```
1. Determine scope: ask user (local | project | user) if not already known.
2. Set ROOT:
   - local or project → realpath(workspace) + "/.claude"
   - user             → expand $HOME + "/.claude"
   Never pass literal ~ into agent spawn prompts — expand to absolute path first.
3. Validate {P}: lowercase + hyphens only, ≤48 chars, unique in ROOT/superpipelines/registry.json.
4. Use all resulting paths as absolute paths in Write / Edit / Bash / agent dispatch calls.
```

## Registry schema (registry.json)

```json
{
  "version": 1,
  "pipelines": [
    {
      "name": "{P}",
      "scope": "local | project | user",
      "created_at": "<ISO 8601>",
      "pattern": "1 | 2 | 2b | 3 | 4 | 5",
      "entry_skill": "run-{P}",
      "agents": ["agents/superpipelines/{P}/{name}.md"],
      "skills":  ["skills/superpipelines/{P}/{step}/SKILL.md"],
      "topology_path": "superpipelines/pipelines/{P}/topology.json",
      "last_audit": {
        "status": "PASS | PASS_WITH_WARNINGS | FAIL | null",
        "ran_at": "<ISO 8601 or null>",
        "report": "superpipelines/pipelines/{P}/audit/latest.md"
      }
    }
  ]
}
```

## Pipeline name constraints

- Lowercase + hyphens only (`[a-z0-9-]+`).
- ≤48 chars — the entry skill is named `run-{P}`; combined name must stay ≤64 chars.
- Must be unique within the chosen scope's `registry.json`. On collision suggest `{name}-2`.
