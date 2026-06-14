# Fixture — OpenCode (Tier 1b) materialization (CAD → `mode: subagent`)

Proves `TRANSLATE_CAD_TO_OC` + `MATERIALIZE` for issue #66 (AC1, AC2, AC5).

Given a tool-neutral **canonical agent def (CAD)** and the OC-resolved model object, `MATERIALIZE`
on a `native_subagent` profile writes a native OpenCode `mode: subagent` agent file into
`<scope-root>/agent/superpipelines/{P}/{name}.md` (dir from `tier_1b.json`
`extensions.native_agent_dir`).

## Inputs

- `input/doc-writer.cad.md` — writer CAD (`write_files:true`, `run_shell:true`, `network:false`,
  `isolation_required:true`). Same CAD that materializes to CC in the migration fixtures.
- `input/doc-reviewer.cad.md` — reviewer CAD (all capabilities false). The structural reviewer.
- `input/resolved-models.json` — `resolved_models` for both steps on tier_1b (`model_tier: medium`
  → `opencode-go/qwen3.6-plus`, effort `medium`). Mirrors `sk-model-resolver` OC emit.

## Expected outputs (`expected-oc/`)

| CAD field | doc-writer | doc-reviewer |
|---|---|---|
| `mode` | `subagent` | `subagent` |
| `model` (provider-prefixed) | `opencode-go/qwen3.6-plus` | `opencode-go/qwen3.6-plus` |
| `reasoningEffort` (provider-gated; `opencode-go` ∈ applies-list) | `medium` | `medium` |
| `maxTurns` ← `turn_budget` | `30` | `15` |
| `permission.edit` (← `write_files:false`) | *(absent — writer)* | `deny` ✅ **structural reviewer isolation** |
| `permission.bash` (← `run_shell:false`) | *(absent)* | `deny` |
| `permission.webfetch` (← `network:false`) | `deny` | `deny` |
| `tools` ← `tool_hints.allow` (OC lowercase ids) | `[read, write, edit, bash, glob, grep]` | `[read, glob, grep]` |
| body | CAD body verbatim | CAD body verbatim |

## Degradation assertion (AC5)

`doc-writer` declares `isolation_required: true`. OC has no worktree primitive
(`tier_1b.json` `capabilities.worktrees: false`), so `MATERIALIZE` surfaces
`extensions.isolation_unavailable_warning` (with `{name}` → `doc-writer`) and appends it to
`metadata.isolation_warning`. The write/review boundary itself is **unaffected** — it is
enforced by `permission: { edit: deny }` on the reviewer, not by the worktree. Only filesystem
isolation degrades. The warning text is NOT written into the materialized agent file.

## Notes

- Tool names are normalized to OpenCode's lowercase ids (`Read`→`read`, etc.) and the permission
  vocabulary (`edit` / `bash` / `webfetch`, value `deny`) follows the OpenCode agent config schema
  (OpenCode agent/permission docs, read 2026-06-14). These key names are the tier_1b materialization
  recipe; AC3's live OC run is the confirmation gate — if OC's actual permission keys differ, the
  golden outputs and `TRANSLATE_CAD_TO_OC` change together. `permission` is the authoritative
  structural gate; `tools` is the capability-consistent allow-list.
- The materialized file is disposable cache: regenerated every run, never read as source. The CAD
  under `.superpipelines/pipelines/{P}/agents/` is the single source of truth.
