# SYNC.md — Cross-Repo Skill Sync Tracker

> Tracks which skills are kept in sync between `superpipelines` (Claude Code, Tier 1) and `superpipelines-opencode` (OpenCode, Tier 1b). Per `SYNC_DISCIPLINE: REQUIRED` invariant (Multi-Platform Design Spec §13).

## Sync Direction Convention

- **OC → CC**: OpenCode introduces a runtime innovation; backport the protocol/schema to CC.
- **CC → OC**: Claude Code introduces a pipeline pattern or invariant; forward-port to OC.

Each entry records: skill, last-synced version of each side, direction, and date.

## Synced Skills

| Skill | superpipelines version | superpipelines-opencode version | Last sync direction | Last sync date | Notes |
|---|---|---|---|---|---|
| `creating-a-pipeline` | v2.0.0 | v1.0.0 | OC → CC | 2026-05-21 | Backport batch 1: model preference per step (Phase 2); `{P}.md` Run Launcher artifact (Phase 6, launcher-doc only on CC; OC retains direct `/superpipelines:{P}` routing). |
| `running-a-pipeline` | v2.0.0 | v1.0.0 | OC → CC | 2026-05-21 | Backport batch 1: Phase 0.5 version-compatibility advisory; mandatory `plugin_version` stamping at init. |
| `sk-pipeline-paths` | v2.0.0 | v1.0.0 | OC → CC | 2026-05-21 | Backport batch 1: added `Run Command` row to path templates table. |
| `sk-pipeline-state` | v2.0.0 | v1.0.0 | OC → CC | 2026-05-21 | Backport batch 1: `plugin_version` field added to schema and invariants. |
| `sk-pipeline-patterns` | v2.0.0 | v1.0.0 | — | — | No drift recorded. Verify before next release. |

## Pending Sync (Next Cycle)

- `sk-platform-dispatch` (CC-new in v2.0.0) — evaluate whether OC needs an equivalent Tier 2 fallback skill.
- Phase 0.5 version advisory (CC-new in v2.0.0) — forward-port to OC if not already present in v1.0.0.

## Process

1. Before a release, walk this table and diff each "synced" skill across repos.
2. If divergence is intentional (platform-specific), document the reason in Notes.
3. If divergence is drift, port and bump both versions.
4. Update `Last sync date` to the date of the commit.
