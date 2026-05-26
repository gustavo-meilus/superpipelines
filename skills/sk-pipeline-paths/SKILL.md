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

## Per-Tier Scope Roots (Multi-Platform v2.0.0+)

<scope_roots_per_tier>
| Tier | Workspace root | User root |
| :--- | :--- | :--- |
| Tier 1 (CC) | `<workspace>/.claude/` | `~/.claude/` |
| Tier 1b (OC) | `<workspace>/.opencode/` | `~/.opencode/` |
| Tier 1c (Antigravity) | `<workspace>/.agents/antigravity/` | `~/.antigravity/` |
| Tier 1d (Codex) | `<workspace>/.agents/codex/` | `~/.codex/` |
| Tier 2 (Cursor/Windsurf/Cline) | `<workspace>/.superpipelines/` | `~/.superpipelines/` |

(Q5: Tier 1c and Tier 1d previously both resolved to `<workspace>/.agents/` — a workspace using both Antigravity and Codex collided silently on the same path. Sub-namespacing `.agents/antigravity/` and `.agents/codex/` removes the collision while preserving the AGENTS.md-aware `.agents/` parent directory.)
</scope_roots_per_tier>

<protocol>
RESOLVE_SCOPE_ROOT(scope, tier):
  base = per-tier table above [tier] [scope-bucket]
  return absolute_path(base)

PORTABILITY_REWRITE(artifact_path, source_tier, target_tier):
  if source_tier == target_tier: return artifact_path
  source_root = per-tier table[source_tier][workspace_or_user]
  target_root = per-tier table[target_tier][workspace_or_user]
  return artifact_path.replace(source_root, target_root, count=1)

// Q5: Multi-root enumeration for discovery and resume.
// Discovery (running-a-pipeline Phase 0) and resume scanning (Phase 1) MUST
// enumerate all 5 per-tier scope roots under both `<workspace>/` and `~/`,
// returning merged results annotated with the source_tier per entry.
ENUMERATE_ALL_SCOPE_ROOTS(workspace) → [{tier, scope, root}, ...]:
  roots = []
  FOR tier IN [tier_1, tier_1b, tier_1c, tier_1d, tier_2]:
    profile = READ(skills/sk-platform-dispatch/profiles/{tier}.json)
    workspace_root = workspace + "/" + profile.scope_root.workspace
    user_root      = expand(profile.scope_root.user)
    IF dir_exists(workspace_root): roots.append({tier, scope: "workspace", root: workspace_root})
    IF dir_exists(user_root):      roots.append({tier, scope: "user",      root: user_root})
  return roots
</protocol>

<invariant>
Path resolution MUST consult `metadata.runtime_tier` from the pipeline state for any artifact read/write on a non-Tier-1 tier. CC-scaffolded pipelines running on Tier 2 invoke `PORTABILITY_REWRITE(path, "tier_1", "tier_2")` at every state-update site. The original (source-tier) path is stamped in `pipeline-state.json` `metadata.source_scope_root` for audit.
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
| **Run Command** | `superpipelines/pipelines/{P}/{P}.md` |
| **Step Skill** | `skills/superpipelines/{P}/{step}/SKILL.md` |
| **Step Agent** | `agents/superpipelines/{P}/{agent-name}.md` |
| **Pipeline State** | `superpipelines/temp/{P}/{runId}/pipeline-state.json` |
| **Staged Edits** | `superpipelines/temp/{P}/edit-{ts}/` |
</path_templates>

## Pipeline Name Constraints

<constraints>
- **Format**: Lowercase alphanumeric and hyphens only (`[a-z0-9-]+`).
- **Length**: Maximum 48 characters to accommodate the `run-` prefix within the 64-character skill limit.
- **Uniqueness within scope**: Must be unique within the chosen scope's `registry.json`.
- **Uniqueness across scopes (Q15)**: Same-name pipelines MAY exist in different scopes (e.g., a project-scope `deploy-feature` and a user-scope `deploy-feature`). Scaffolding-time uniqueness checks in `creating-a-pipeline` Phase 1 MUST expand to all merged scopes and prompt the user to confirm when a same-name pipeline already exists elsewhere (no silent allow).
</constraints>

## Collision Semantics (Q15)

When `ENUMERATE_ALL_SCOPE_ROOTS` returns multiple registry entries with the same pipeline name across different scopes or tiers, the resolution contract is:

**Precedence rule (highest wins):**
1. `workspace/project` > `workspace/local` > `user/global`
2. Within the same scope-bucket, `runtime_tier` > other tiers.

**Disambiguation prompt (Q15):** When two or more entries tie after applying precedence (e.g., same-name pipeline in both `workspace/project tier_1` and `workspace/project tier_2`), the runner MUST present a disambiguated list and require explicit selection:

```
Multiple pipelines named `deploy-feature` found:
  [1] project scope / tier_1  (.claude/)            scaffolded 2026-04-10
  [2] project scope / tier_2  (.superpipelines/)    scaffolded 2026-05-12
Pick one: [1/2]
```

No silent first-wins. The slash-command form (`/superpipelines:{P}`, OC-only) follows the same precedence rule; OC's command resolver MUST honor it.

## Registry Entry Schema (Q15)

Each registry entry carries an explicit `scope` field to disambiguate project-vs-local entries that share the same physical `.claude/` directory:

```json
{
  "name": "deploy-feature",
  "scope": "project | local | user",
  "source_tier": "tier_1 | tier_1b | tier_1c | tier_1d | tier_2",
  "plugin_version": "2.0.0",
  "...": "..."
}
```

The merge logic treats `(name, scope, source_tier)` as the composite identity key.

<invariants>
- NEVER hardcode absolute paths; always resolve via the current `{ROOT}` and `{P}` context.
- ALWAYS expand `~` to the absolute home directory path before passing it to agent spawn prompts.
- Atomic mutations MUST use the staged edits path before promotion to final locations.
</invariants>

## Reference Files

- `sk-pipeline-state/SKILL.md` — State persistence schema.
- `sk-claude-code-conventions/SKILL.md` — Frontmatter and directory rules.
