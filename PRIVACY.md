# Privacy Policy — Superpipelines

Superpipelines is a local-only orchestration plugin. It collects no data and
sends nothing anywhere.

## What the plugin stores, and where

- **Pipeline artifacts and state** — written only to your workspace
  (`<workspace>/.superpipelines/`) or your home directory
  (`~/.superpipelines/`), per the scope you choose at pipeline creation.
- **Materialized agent files** — disposable cache written under the host
  tool's local scope root (e.g. `.claude/agents/superpipelines/`), regenerated
  per run and safe to delete.
- **Model preferences** — `model-preferences.json` under the same local roots,
  only if you create them via `/superpipelines:change-models`.

## Telemetry

There is none by default. An **opt-in, disabled-by-default** `SubagentStop`
hook can capture per-step cost/latency signals to a local
`run-telemetry.jsonl` file inside the run directory so
`/superpipelines:optimize-pipeline` can use past-run data. It is not
registered in `hooks/hooks.json`, the plugin never auto-edits your settings to
enable it, and even when enabled it writes only to local files. See
`hooks/README-telemetry.md`.

## Network access

The plugin makes no network calls of its own. All model traffic goes through
the host tool (Claude Code, Codex, OpenCode, etc.) under that tool's own
privacy policy. The installers (`install.sh`, `install.ps1`,
`bin/install.js`) fetch only this repository's published files from GitHub.

## Questions

Open an issue at
[gustavo-meilus/superpipelines](https://github.com/gustavo-meilus/superpipelines/issues).
