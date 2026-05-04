---
name: sk-pipeline-paths
description: Use when resolving scope-aware file paths for superpipelines artifacts — agents, skills, support files, temp directories, or the pipeline registry. Reference whenever scope (local, project, user) and a pipeline name are known and an absolute path is needed.
disable-model-invocation: true
user-invocable: false
---

# Pipeline Path Resolver — Scope-Aware Layout

> Resolves absolute file paths for Superpipelines artifacts across local, project, and user scopes. Trigger when creating or accessing agents, skills, temporary directories, or the pipeline registry.

<overview>
The Path Resolver enforces a canonical layout for the Superpipelines v2 architecture. It eliminates hardcoded paths by providing scope-dependent roots and templates for every artifact type, ensuring consistency across diverse workspace environments.
</overview>

<glossary>
  <term name="Scope Root">The base directory (`.claude/` or `~/.claude/`) where artifacts are persisted.</term>
  <term name="Pipeline Registry">A central `registry.json` file tracking all pipelines within a specific scope.</term>
  <term name="Staging Directory">A temporary `temp/{P}/edit-{ts}/` directory used for atomic mutations.</term>
</glossary>

## Scope Roots & Git Integration

<scope_roots_table>
| Scope | Physical Root | Git Status | Persistence |
| :--- | :--- | :--- | :--- |
| **Project** | `<workspace>/.claude/` | Committed | Shared with the team. |
| **Local** | `<workspace>/.claude/` | Ignored | Machine-specific/temporary. |
| **User** | `~/.claude/` | External | Global across all workspaces. |
</scope_roots_table>

<invariant>
`project` and `local` scopes share the same physical directory; the distinction is managed via `.gitignore` entries for `.claude/`.
</invariant>

## Path Templates

<path_templates>
| Artifact Type | Path Template (relative to ROOT) |
| :--- | :--- |
| **Registry** | `superpipelines/registry.json` |
| **Spec/Plan/Tasks** | `superpipelines/pipelines/{P}/` |
| **Topology Graph** | `superpipelines/pipelines/{P}/topology.json` |
| **Audit Report** | `superpipelines/pipelines/{P}/audit/latest.md` |
| **Entry Skill** | `skills/superpipelines/{P}/run-{P}/SKILL.md` |
| **Step Skill** | `skills/superpipelines/{P}/{step}/SKILL.md` |
| **Step Agent** | `agents/superpipelines/{P}/{agent-name}.md` |
| **Pipeline State** | `superpipelines/temp/{P}/{runId}/pipeline-state.json` |
| **Staged Edits** | `superpipelines/temp/{P}/edit-{ts}/` |
</path_templates>

## Pipeline Name Constraints

<constraints>
- **Format**: Lowercase alphanumeric and hyphens only (`[a-z0-9-]+`).
- **Length**: Maximum 48 characters to accommodate the `run-` prefix within the 64-character skill limit.
- **Uniqueness**: Must be unique within the chosen scope's `registry.json`.
</constraints>

<invariants>
- NEVER hardcode absolute paths; always resolve via the current `{ROOT}` and `{P}` context.
- ALWAYS expand `~` to the absolute home directory path before passing it to agent spawn prompts.
- Atomic mutations MUST use the staged edits path before promotion to final locations.
</invariants>

## Reference Files

- `sk-pipeline-state/SKILL.md` — State persistence schema.
- `sk-claude-code-conventions/SKILL.md` — Frontmatter and directory rules.
