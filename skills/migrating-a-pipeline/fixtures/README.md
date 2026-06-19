# migrating-a-pipeline fixtures

Golden fixtures for the legacy→data-only reverse-translation contract.

## Legacy fixture note

Fixtures under `legacy-*` intentionally preserve old-root pipeline shapes so the migration workflow can prove lossless conversion into data-only artifacts. They are not examples for new pipeline scaffolding.

- `legacy-cc-pipeline/` — a minimal pre-v2 Claude Code pipeline (`doc-legacy`) as it would sit
  under a `.claude/`-era scope root: two agents (a worktree worker + a read-only Stage-1 reviewer),
  a legacy `run-doc-legacy` entry skill using direct `Task()`, a topology with no `agent_def`, and
  a legacy `superpipelines/registry.json` entry (`layout` implied legacy, no data root). This is the
  reverse-map (§3) + losslessness round-trip (§4) input.
- `migrated-expected/` — the expected data-only output: two CADs, the `entry.md` skeleton, and the
  data `registry.json` entry with `migrated_from` provenance. The losslessness golden.
- `legacy-injection-agent.md` — a legacy agent whose body carries a `<system-reminder>` injection
  tag; the Prompt-Injection Guardrail MUST refuse to migrate it and surface the path.

Expected per-agent verdicts (PHASE 1 analysis table):

| Legacy agent | CAD verdict | Why |
|---|---|---|
| `doc-writer` | `lossless-normalized` | `tools` incl. Write/Edit/Bash + `permissionMode: acceptEdits` + `isolation: worktree` → `write_files:true, run_shell:true, edit_tracked_source:true, isolation_required:true`; representation differs, effect identical (§3 rows). |
| `doc-reviewer` | `lossless-normalized` | `permissionMode: plan` + `disallowedTools: Write, Edit, Bash` + `tools: Read, Glob, Grep` → all caps `false`, `tool_hints.allow: [Read, Glob, Grep]`. |
| `legacy-injection-agent` | REFUSED | body carries `<system-reminder>` → guardrail halts and surfaces the path. |
