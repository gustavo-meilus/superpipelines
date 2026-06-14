---
name: sk-pipeline-paths
description: Resolves scope-aware absolute file paths for Superpipelines artifacts across local, project, and user scopes. Use when creating or accessing agents, skills, support files, temporary directories, or the pipeline registry, given a known scope and pipeline name.
user-invocable: false
---

# Pipeline Path Resolver — Scope-Aware Layout

<glossary>
  <term name="Data Root">The single tier-independent base directory (`<workspace>/.superpipelines/` or `~/.superpipelines/`) where all generated pipeline DATA is persisted (`RESOLVE_DATA_ROOT`).</term>
  <term name="Scope Root">A per-tier base directory (`.claude/`, `.opencode/`, …) resolved by `RESOLVE_SCOPE_ROOT`. No longer the artifact location — used only for read-only legacy back-compat and as the native materialization target.</term>
  <term name="Pipeline Registry">A central `registry.json` file tracking all pipelines within a specific scope.</term>
  <term name="Staging Directory">A temporary `temp/{P}/edit-{ts}/` directory used for atomic mutations.</term>
</glossary>

## Data Root & Git Integration

Generated pipelines (v2.x+) are **data** under the single tier-independent data root
(`RESOLVE_DATA_ROOT`); the per-tier scope roots below are legacy/materialization only.

<data_roots_table>
| Scope | Physical Root | Git Status | Persistence |
| :--- | :--- | :--- | :--- |
| **Project** | `<workspace>/.superpipelines/` | Committed | Shared with the team. |
| **Local** | `<workspace>/.superpipelines/` | Ignored | Machine-specific/temporary. |
| **User** | `~/.superpipelines/` | External | Global across all workspaces. |
</data_roots_table>

<invariant>
`project` and `local` scopes share the same physical directory; the distinction is managed via `.gitignore` entries for `.superpipelines/`.
</invariant>

## Per-Tier Scope Roots (legacy back-compat reads + native materialization target)

These per-tier roots no longer locate generated pipeline data (see Data Root above). They are
consumed only by (a) `ENUMERATE_ALL_SCOPE_ROOTS` read-only legacy back-compat and (b) `sk-platform-dispatch`
MATERIALIZE, which writes the ephemeral native agent file into the host's own dir.

<scope_roots_per_tier>
| Tier | Workspace root | User root |
| :--- | :--- | :--- |
| Tier 1 (CC) | `<workspace>/.claude/` | `~/.claude/` |
| Tier 1b (OC) | `<workspace>/.opencode/` | `~/.opencode/` |
| Tier 1c (Antigravity) | `<workspace>/.agents/antigravity/` | `~/.antigravity/` |
| Tier 1d (Codex) | `<workspace>/.agents/codex/` | `~/.codex/` |
| Tier 2 (Cursor/Windsurf/Cline) | `<workspace>/.superpipelines/` | `~/.superpipelines/` |
</scope_roots_per_tier>

<invariant>
Tier 1c and Tier 1d use sub-namespaced paths (`.agents/antigravity/` and `.agents/codex/`) to avoid silent collisions on `.agents/` when both platforms coexist in the same workspace. The `.agents/` parent directory remains AGENTS.md-aware.
</invariant>

<protocol>
RESOLVE_SCOPE_ROOT(scope, tier):
  base = per-tier table above [tier] [scope-bucket]
  return absolute_path(base)

RESOLVE_DATA_ROOT(scope):
  // Data-only pipelines (v2.x+): the single artifact root for ALL generated
  // pipeline DATA. Tier-INDEPENDENT — NOT the tier-1 scope root, a sibling of it.
  // Only dispatch + model resolution remain tier-specific (design spec §4).
  if scope in {project, local}: return RESOLVE_HOST_WORKSPACE() + "/.superpipelines"
  if scope == user:             return expand("~/.superpipelines")

RESOLVE_HOST_WORKSPACE():
  // The main-worktree root, NOT a linked worktree's cwd. Artifacts and state
  // MUST anchor here so they survive worktree teardown (issue #31).
  common = `git rev-parse --path-format=absolute --git-common-dir`   // → <host>/.git
  if command succeeds: return dirname(strip_trailing("/.git", common))
  else (not a git repo): return cwd

// INVARIANT: the superpipelines/temp/{P}/{runId}/ artifact + state tree ALWAYS
// resolves under RESOLVE_HOST_WORKSPACE(), never a linked worktree path. Code
// edits stay isolated in the worktree; coordination artifacts land on the host.

// LEGACY back-compat only. Data-only pipelines store paths relative to DATA_ROOT
// (tier-independent), so PORTABILITY_REWRITE is a no-op for them and retires for paths
// (design spec §4). It still rewrites old-root (pre-v2) cross-tier paths.
PORTABILITY_REWRITE(artifact_path, source_tier, target_tier):
  if source_tier == target_tier: return artifact_path
  if source_tier == "data" OR target_tier == "data": return artifact_path  // data paths are tier-independent
  source_root = per-tier table[source_tier][workspace_or_user]
  target_root = per-tier table[target_tier][workspace_or_user]
  return artifact_path.replace(source_root, target_root, count=1)

// Discovery & resume: DATA-ROOT FIRST, legacy multi-root as a self-gating back-compat
// tail. The DEFAULT cost is two REGISTRY reads (workspace + user `.superpipelines/`);
// the §4 "no per-tier loop" win is about registry enumeration — registries are read
// (in running-a-pipeline Phase 0) ONLY for the roots returned here. The legacy tail is
// a profile-driven `dir_exists` sweep that parses NO registries and returns [] on an
// all-data workspace, so a workspace with only data-only pipelines reads exactly two
// registries. Legacy back-compat (design spec §8) is preserved for any workspace that
// still holds a pre-v2 old-root dir, with the per-tier dir names sourced from the
// profiles (DEPENDENCY_INVERSION: PROFILE_DRIVEN) — never duplicated in this body.
ENUMERATE_PIPELINE_ROOTS(workspace) → [{tier, scope, root, layout}, ...]:
  roots = []
  // (1) Data-only roots — canonical, tier-independent. Two dir checks, no per-tier loop.
  IF dir_exists(RESOLVE_DATA_ROOT(project)): roots.append({tier: "data", scope: "workspace", root: RESOLVE_DATA_ROOT(project), layout: "data"})
  IF dir_exists(RESOLVE_DATA_ROOT(user)):    roots.append({tier: "data", scope: "user",      root: RESOLVE_DATA_ROOT(user),    layout: "data"})
  // (2) Legacy per-tier roots — read-only back-compat tail; ENUMERATE_ALL_SCOPE_ROOTS
  //     returns [] when no legacy root dir exists (the common all-data case), so this
  //     adds no registry I/O and is its own gate.
  roots += ENUMERATE_ALL_SCOPE_ROOTS(workspace)   // each annotated layout: "legacy"; [] on all-data workspace
  return roots

// Legacy multi-root enumeration — RETAINED as the self-gating back-compat tail above.
// Old-root pipelines (pre-v2) still list/resume via these 5 per-tier scope roots. Reads
// the per-tier scope-root dir names from the profile JSONs (single source of truth) and
// does `dir_exists` only — it parses NO registries, so on an all-data workspace it
// returns [] cheaply (small profile reads + dir stats, no per-pipeline I/O).
ENUMERATE_ALL_SCOPE_ROOTS(workspace) → [{tier, scope, root, layout}, ...]:
  roots = []
  FOR tier IN [tier_1, tier_1b, tier_1c, tier_1d, tier_2]:
    profile = READ(skills/sk-platform-dispatch/profiles/{tier}.json)
    workspace_root = workspace + "/" + profile.scope_root.workspace
    user_root      = expand(profile.scope_root.user)
    // A legacy old-root pipeline lives under the scope root's `superpipelines/` subdir
    // (path templates below). tier_2's scope root IS the data root, so its legacy
    // old-root pipelines are the ones whose registry sits at `<root>/superpipelines/...`,
    // distinct from the data-only `<root>/registry.json` — no double-count.
    IF dir_exists(workspace_root + "/superpipelines"): roots.append({tier, scope: "workspace", root: workspace_root, layout: "legacy"})
    IF dir_exists(user_root + "/superpipelines"):      roots.append({tier, scope: "user",      root: user_root,      layout: "legacy"})
  return roots
</protocol>

<invariant>
For **data-only** pipelines (v2.x+), artifact and state paths are **tier-independent** — they resolve under the single `.superpipelines/` data root (`RESOLVE_DATA_ROOT`) regardless of runtime tier, so `PORTABILITY_REWRITE` is a **no-op for paths** and is not invoked at state-update sites. `PORTABILITY_REWRITE` survives only on the **legacy back-compat** path, where an old per-tier-rooted pipeline discovered via `ENUMERATE_ALL_SCOPE_ROOTS` is read/resumed on a different runtime tier; there it consults `metadata.runtime_tier` and stamps `metadata.source_scope_root` for audit.
</invariant>

## Path Templates

### Data-Only Path Templates (v2.x — relative to DATA_ROOT)

The canonical templates for new pipelines. DATA_ROOT = `RESOLVE_DATA_ROOT(scope)` (the
`.superpipelines/` root). Everything a pipeline needs — including the entry orchestration body
and the step protocols — is DATA here; nothing is written to a tool dir as source.

<data_path_templates>
| Artifact Type | Path Template (relative to DATA_ROOT) |
| :--- | :--- |
| **Registry** | `registry.json` |
| **Spec/Plan/Tasks** | `pipelines/{P}/` |
| **Topology Graph** | `pipelines/{P}/topology.json` |
| **Audit Report** | `pipelines/{P}/audit/latest.md` |
| **Canonical Agent Def (CAD)** | `pipelines/{P}/agents/{agent-name}.md` |
| **Step Protocol (data)** | `pipelines/{P}/skills/{step}/SKILL.md` |
| **Entry (data)** | `pipelines/{P}/entry.md` |
| **Run Command (data)** | `pipelines/{P}/{P}.md` |
| **Pipeline State** | `temp/{P}/{runId}/pipeline-state.json` |
| **Staged Edits** | `temp/{P}/edit-{ts}/` |
</data_path_templates>

**Materialized CC Agent (ephemeral cache — Option A dispatch):**
`RESOLVE_SCOPE_ROOT(scope, tier_1) + "/agents/superpipelines/{P}/{agent-name}.md"`. Written by
`sk-platform-dispatch` MATERIALIZE just before native dispatch, translated from the CAD;
regenerated every run; **never read as source**; cleaned at Phase 4 completion. This is the
one place generated content lands in a tool dir, and it is disposable cache, not source.

### Legacy Path Templates (READ-ONLY back-compat — old-root pipelines only)

Pipelines scaffolded before v2.x persist under per-tier scope roots (`{ROOT}` =
`RESOLVE_SCOPE_ROOT(scope, tier)`). These templates are a **read-only** back-compat path for
discovery and resume of existing pipelines — they are **never a write target** for new
scaffolds (design spec §8: old-root writes removed immediately, old-root reads kept one major).

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
- **Uniqueness across scopes**: Same-name pipelines MAY exist in different scopes (e.g., a project-scope `deploy-feature` and a user-scope `deploy-feature`). Scaffolding-time uniqueness checks in `creating-a-pipeline` Phase 1 MUST expand to all merged scopes and prompt the user to confirm when a same-name pipeline already exists elsewhere (no silent allow).
</constraints>

## Collision Semantics

When discovery (`ENUMERATE_PIPELINE_ROOTS`, which merges the data roots with the gated legacy `ENUMERATE_ALL_SCOPE_ROOTS` tail) returns multiple registry entries with the same pipeline name across different scopes or tiers, the resolution contract is:

**Precedence rule (highest wins):**
1. `workspace/project` > `workspace/local` > `user/global`
2. Within the same scope-bucket, `runtime_tier` > other tiers.

**Disambiguation prompt:** When two or more entries tie after applying precedence (e.g., same-name pipeline in both `workspace/project tier_1` and `workspace/project tier_2`), the runner MUST present a disambiguated list and require explicit selection:

```
Multiple pipelines named `deploy-feature` found:
  [1] project scope / tier_1  (.claude/)            scaffolded 2026-04-10
  [2] project scope / tier_2  (.superpipelines/)    scaffolded 2026-05-12
Pick one: [1/2]
```

No silent first-wins. The slash-command form (`/superpipelines:{P}`, OC-only) follows the same precedence rule; OC's command resolver MUST honor it.

## Registry Entry Schema

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
