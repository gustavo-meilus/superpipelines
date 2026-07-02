# Codex Install Verification — 2026-07

## Verdict

Verified on Codex CLI `0.142.5`: the headless install grammar currently encoded in `bin/install.js` is correct. The Codex leg succeeds with `codex plugin marketplace add gustavo-meilus/superpipelines` followed by `codex plugin add superpipelines@superpipelines-marketplace`; `codex plugin list` reports `superpipelines@superpipelines-marketplace` installed and enabled; a fresh `codex exec` session can see installed `superpipelines:` skills.

## Environment

Workspace: `C:\Users\gmeil\Github\superpipelines-wave3`

Branch: `claude/superpipelines-comparison-analysis-k68cb4`

## Transcript

### `codex --version`

```text
codex-cli 0.142.5
exit: 0
```

### `codex plugin --help`

```text
Manage Codex plugins

Usage: codex plugin [OPTIONS] <COMMAND>

Commands:
  add          Install a plugin from a configured marketplace snapshot
  list         List plugins available from configured marketplace snapshots
  marketplace  Add, list, upgrade, or remove configured plugin marketplaces
  remove       Remove an installed plugin from local config and cache
  help         Print this message or the help of the given subcommand(s)

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
  --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
  --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
  -h, --help
          Print help (see a summary with '-h')
exit: 0
```

### `codex plugin marketplace --help`

```text
Add, list, upgrade, or remove configured plugin marketplaces

Usage: codex plugin marketplace [OPTIONS] <COMMAND>

Commands:
  add      Add a local or Git marketplace to the configured marketplace sources
  list     List plugin marketplaces Codex is currently considering and their roots
  upgrade  Refresh configured Git marketplace snapshots
  remove   Remove a configured marketplace source by name
  help     Print this message or the help of the given subcommand(s)

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
  --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`
  --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`
  -h, --help
          Print help (see a summary with '-h')
exit: 0
```

### `node bin/install.js --only codex`

```text
== Installing for Codex App/CLI (tier 1d) ==
+ codex plugin marketplace add gustavo-meilus/superpipelines
Marketplace `superpipelines-marketplace` is already added from https://github.com/gustavo-meilus/superpipelines.git.
Installed marketplace root: C:\Users\gmeil\.codex\.tmp\marketplaces\superpipelines-marketplace
+ codex plugin add superpipelines@superpipelines-marketplace
Added plugin `superpipelines` from marketplace `superpipelines-marketplace`.
Installed plugin root: C:\Users\gmeil\.codex\plugins\cache\superpipelines-marketplace\superpipelines\2.4.0
If `codex plugin add` failed: open Codex, run `/plugins`, and complete installation manually.

=== Install summary ===
  ✓ Codex App/CLI: success

Marketplace: https://github.com/gustavo-meilus/superpipelines
exit: 0
```

### `codex plugin list`

```text
Marketplace `superpipelines-marketplace`
C:\Users\gmeil\.codex\.tmp\marketplaces\superpipelines-marketplace\.agents\plugins\marketplace.json

PLUGIN                                     STATUS              VERSION  PATH
superpipelines@superpipelines-marketplace  installed, enabled  2.4.0    C:\Users\gmeil\.codex\.tmp\marketplaces\superpipelines-marketplace\plugins\superpipelines

Marketplace `openai-curated`
C:\Users\gmeil\.codex\.tmp\plugins\.agents\plugins\marketplace.json

PLUGIN                     STATUS              VERSION   PATH
superpowers@openai-curated installed, enabled  3fdeeb49  C:\Users\gmeil\.codex\.tmp\plugins\plugins\superpowers
... other openai-curated marketplace entries omitted; none affect the Superpipelines verdict.
exit: 0
```

### Fresh-session skill visibility

Command:

```powershell
codex exec -s read-only -C C:\Users\gmeil\Github\superpipelines-wave3 --ephemeral "Without reading files or searching, list the installed skills whose names begin with superpipelines:. If none are visible in your session context, say NONE."
```

Relevant output:

```text
Installed `superpipelines:` skills visible in this session:

`superpipelines:analyzer-protocol`
`superpipelines:reporter-protocol`
`superpipelines:reviewer-protocol`
`superpipelines:run-parity-test-f`
`superpipelines:adding-a-pipeline-step`
`superpipelines:brainstorming`
`superpipelines:change-models`
`superpipelines:creating-a-pipeline`
`superpipelines:deleting-a-pipeline-step`
`superpipelines:finishing-a-development-branch`
`superpipelines:migrating-a-pipeline`
`superpipelines:optimizing-a-pipeline`
`superpipelines:pipeline-architect-protocol`
`superpipelines:pipeline-auditor-protocol`
`superpipelines:pipeline-failure-analyzer-protocol`
`superpipelines:pipeline-optimizer-protocol`
`superpipelines:pipeline-quality-reviewer-protocol`
`superpipelines:pipeline-spec-reviewer-protocol`
`superpipelines:pipeline-task-executor-protocol`
`superpipelines:running-a-pipeline`
`superpipelines:sk-4d-method`
`superpipelines:sk-claude-code-conventions`
`superpipelines:sk-dynamic-routing`
`superpipelines:sk-hashline-protocol`
`superpipelines:sk-hierarchical-context`
`superpipelines:sk-model-migration`
`superpipelines:sk-model-resolver`
`superpipelines:sk-pipeline-grilling`
`superpipelines:sk-pipeline-paths`
`superpipelines:sk-pipeline-patterns`
`superpipelines:sk-pipeline-state`
`superpipelines:sk-platform-dispatch`
`superpipelines:sk-rationalization-resistance`
`superpipelines:sk-spec-driven-development`
`superpipelines:sk-worktree-safety`
`superpipelines:sk-write-review-isolation`
`superpipelines:skill-architect-protocol`
`superpipelines:systematic-debugging`
`superpipelines:test-driven-development`
`superpipelines:updating-a-pipeline-step`
`superpipelines:using-superpipelines`
`superpipelines:verification-before-completion`
exit: 0
```
