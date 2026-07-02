# Fixture — Claude Code (Tier 1) materialization (CAD → agent YAML)

Proves `TRANSLATE_CAD_TO_CC` + the tier-neutral `MATERIALIZE` for fix-plan WI-03,
including the `effort:` emission enabled by `tier_1.json effort_field_name` (GAP-03).

Materialization fixture: native `agents/superpipelines` paths here are disposable runtime cache outputs for dispatcher testing. They are not new-pipeline authoring guidance.

Given a tool-neutral **canonical agent def (CAD)** and the CC-resolved model object,
`MATERIALIZE` on a `native_task` + `shorthand` profile writes a native Claude Code agent
Markdown file into `<scope-root>/agents/superpipelines/{P}/{name}.md` (dir + `.md` ext from
`tier_1.json` `extensions.native_agent_dir` / `native_agent_ext`). The translator returns
frontmatter only (`body_inlined: false`); MATERIALIZE appends the CAD body below it.

## Inputs

- `input/doc-writer.cad.md`, `input/doc-reviewer.cad.md`, `input/triage-probe.cad.md` —
  the **same** CADs as the codex- and oc-materialize fixtures (portability: one def, three
  native dialects). Input files are shared verbatim; their descriptions may reference the
  sibling fixtures' assertions.
- `input/resolved-models.json` — `resolved_models` on tier_1: `medium → claude-sonnet-4-6`
  (effort `medium`), `triage → claude-haiku-4-5-20251001` (effort `low`). CC accepts effort
  values `low|medium|high|xhigh|max`; our vocabulary maps identity, so no `effort_emit_map`
  is configured and the translator emits `resolved.effort` verbatim.

## Expected outputs (`expected-cc/`)

| CAD field | doc-writer | doc-reviewer | triage-probe |
|---|---|---|---|
| `description` ← cad | verbatim | verbatim | verbatim |
| `model_tier` ← cad | `medium` | `medium` | `triage` |
| `effort` ← resolved.effort | `medium` | `medium` | `low` ✅ **profile-gated emission (GAP-03)** |
| `maxTurns` ← `turn_budget` | `30` | `15` | `10` |
| `tools` ← capabilities + hints | `Read, Write, Edit, Bash, Glob, Grep` | `Read, Glob, Grep` | `Read, Glob, Grep` |
| `disallowedTools` (reviewer) | *(absent — writer)* | `Write, Edit, Bash` ✅ **structural isolation** | `Write, Edit, Bash` |
| `permissionMode` | `acceptEdits` | `plan` | `plan` |
| `isolation` ← `isolation_required` | `worktree` | *(absent)* | *(absent)* |
| body | CAD body appended verbatim | same | same |

## Assertions

- **AC1** — every CAD materializes to valid CC agent YAML (`name` + `description` present —
  required by CC agent-file discovery) with tools/permissions derived from capabilities.
- **AC2** — `write_files:false` → `tools:` read-class only + `disallowedTools: Write, Edit,
  Bash` + `permissionMode: plan` (structural; enforced at project scope where materialized
  agents live — plugin-scope agents enforce tools/disallowedTools only, see BUNDLE-08).
- **AC3** — `effort:` is emitted from `resolved.effort` gated on the profile's
  `effort_field_name`, never hardcoded; `triage-probe` carries `effort: low` verbatim
  (identity map — contrast Codex's `low → minimal`).

## Notes

- `model:` is deliberately absent from the materialized file — on `native_task` the resolved
  model is passed in the `Task()` payload, which overrides frontmatter.
- `resolved-models.json` model IDs restate `tier_1.json model_tiers` for fixture readability;
  the profile remains the single source of truth (drift here is a fixture bug, not a spec).
- The materialized file is disposable cache: regenerated every run, never read as source. The
  CAD under `.superpipelines/pipelines/{P}/agents/` is the single source of truth.
