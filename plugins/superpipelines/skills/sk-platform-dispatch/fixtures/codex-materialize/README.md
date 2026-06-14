# Fixture — Codex (Tier 1d) materialization (CAD → agent TOML)

Proves `TRANSLATE_CAD_TO_CODEX` + the tier-neutral `MATERIALIZE` for issue #65 (AC1, AC2, AC4).

Given a tool-neutral **canonical agent def (CAD)** and the Codex-resolved model object,
`MATERIALIZE` on a `model_driven` + `toml_split` profile writes a native Codex agent **TOML** file
into `<scope-root>/agents/superpipelines/{P}/{name}.toml` (dir + `.toml` ext from `tier_1d.json`
`extensions.native_agent_dir` / `native_agent_ext`). The protocol body is embedded as a
triple-quoted `instructions` string (TOML has no frontmatter/body split).

## Inputs

- `input/doc-writer.cad.md` — writer CAD (`write_files:true`, `network:false`). The **same** CAD
  that materializes to CC (#62) and OC (#66) — AC3's "same canonical defs as CC".
- `input/doc-reviewer.cad.md` — reviewer CAD (`write_files:false`). The structural reviewer.
- `input/triage-probe.cad.md` — `model_tier: triage` read-only step, present to exercise the
  **low→minimal** effort map (AC4).
- `input/resolved-models.json` — `resolved_models` on tier_1d. `effort_emit_map` is applied
  upstream by `sk-model-resolver` (step 9), so `triage-probe.effort` is already `"minimal"`; the
  translator emits `resolved.effort` verbatim.

## Expected outputs (`expected-codex/`)

| CAD field | doc-writer | doc-reviewer | triage-probe |
|---|---|---|---|
| `model` ← resolved | `gpt-5.4` | `gpt-5.4` | `gpt-5.4-mini` |
| `model_reasoning_effort` ← resolved.effort | `medium` | `medium` | `minimal` ✅ **low→minimal (AC4)** |
| `sandbox_mode` ← `write_files` | `workspace-write` | `read-only` ✅ **structural reviewer isolation (AC2)** | `read-only` |
| `[sandbox_workspace_write] network_access` (writer + `network:false`) | `false` | *(absent — reviewer)* | *(absent)* |
| `turn_limit` ← `turn_budget` | `30` | `15` | `10` |
| `instructions` | CAD body verbatim | CAD body verbatim | CAD body verbatim |

## Assertions

- **AC1** — every CAD materializes to valid Codex TOML with `model` / `model_reasoning_effort` /
  `sandbox_mode` set from capabilities + resolved model.
- **AC2** — `write_files:false` → `sandbox_mode = "read-only"` (structural; reviewer cannot
  write or shell-write). `read-only` also covers `run_shell:false` + `network:false`.
- **AC4** — `triage-probe` (low/triage tier) emits `model_reasoning_effort = "minimal"` — the
  `effort_emit_map` `low → minimal` translation, applied by the resolver and emitted verbatim.

## Notes

- TOML table-ordering: the `[sandbox_workspace_write]` table is emitted **after** all top-level
  keys (TOML rule — bare keys after a table header belong to that table). The golden writer file
  honors this.
- `turn_limit` and the `[sandbox_workspace_write]` key names follow the Codex agent-config schema
  (Codex config docs, read 2026-06-14); AC3's live Codex run is the confirmation gate — if Codex's
  actual keys differ, the goldens and `TRANSLATE_CAD_TO_CODEX` change together.
- Codex isolates per-thread at the app level (no per-subagent worktree), so `isolation_required`
  carries no extra materialized primitive and no degradation warning is configured for tier_1d.
- The materialized file is disposable cache: regenerated every run, never read as source. The CAD
  under `.superpipelines/pipelines/{P}/agents/` is the single source of truth.
