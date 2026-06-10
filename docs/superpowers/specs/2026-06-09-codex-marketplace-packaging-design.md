# Codex Marketplace Packaging

## Problem

The Codex user-level plugin install succeeds, but bundled Superpipelines skills
do not load. The installed cache contains only:

- `.codex-plugin/plugin.json`

It does not contain a `skills/` directory. The marketplace package manifest also
declares component paths that escape the plugin root:

```json
"skills": "../../skills/",
"agents": "../../.agents/codex/agents/",
"commands": "../../commands/"
```

Codex requires plugin component paths to be `./...` paths inside the plugin
root. It rejects escaping paths and does not document `agents` or `commands` as
valid bundled component fields. The failure is therefore packaging, not
user-level enablement.

## Goals

- Make the Codex marketplace package self-contained under
  `plugins/superpipelines/`.
- Package Superpipelines skills at `plugins/superpipelines/skills/`.
- Use the Codex-native manifest shape: `"skills": "./skills/"`.
- Prevent future releases from shipping a marketplace package with no bundled
  `SKILL.md` files.
- Keep Codex subagent discovery aligned with documented `.codex/agents/`
  locations, not undocumented plugin manifest fields.

## Non-Goals

- Do not change Claude Code, OpenCode, Antigravity, Cursor, Windsurf, or Cline
  packaging.
- Do not redesign pipeline runtime state layout.
- Do not make Codex load subagents through `plugin.json`.
- Do not duplicate command support into Codex unless Codex documents a commands
  component field later.

## Design

`plugins/superpipelines/` becomes the complete Codex marketplace package root:

```text
plugins/superpipelines/
  .codex-plugin/
    plugin.json
  skills/
    ...
  README.md
  LICENSE
```

The packaged manifest declares only supported Codex plugin components:

```json
"skills": "./skills/"
```

Unsupported manifest fields are removed:

```json
"agents": "...",
"commands": "..."
```

The packaged `skills/` tree mirrors the repo root `skills/` tree because those
are the durable orchestration skills for Superpipelines. Generated per-project
pipeline skills under `.agents/skills/superpipelines/` remain project-scoped
artifacts and are not bundled as marketplace plugin skills.

Codex subagents stay outside the plugin manifest. Project-scoped agents live in
`<project>/.codex/agents/`. If Superpipelines needs global user agents, a setup
or installer step should copy agent TOML files into `~/.codex/agents/`.

## Packaging Guard

Add a repository script that validates the Codex marketplace package before
release:

- `plugins/superpipelines/.codex-plugin/plugin.json` exists and parses as JSON.
- The manifest has `"skills": "./skills/"`.
- The manifest does not contain `agents` or `commands`.
- `plugins/superpipelines/skills/` exists.
- At least one `plugins/superpipelines/skills/**/SKILL.md` file exists.
- No manifest component path escapes the package root.

The script should be runnable locally and from release checks. It may also sync
the packaged skills from the root `skills/` tree if the repo already has a
release-prep workflow that supports generated package content.

## Data Flow

1. Developer updates source skills under `skills/`.
2. Packaging step syncs or validates `plugins/superpipelines/skills/`.
3. Codex marketplace index points to `./plugins/superpipelines`.
4. Codex installs that package into its user-level plugin cache.
5. Codex reads `.codex-plugin/plugin.json`, resolves `./skills/` inside the
   cached plugin root, and exposes the bundled skills.

## Error Handling

The guard script fails fast with a clear message naming the violated invariant.
It should not silently repair malformed manifests during validation mode. If a
sync mode is added, it should run before validation and then validate the final
package tree.

## Testing

- Parse the packaged manifest as JSON.
- Run the packaging guard.
- Verify `plugins/superpipelines/skills/**/SKILL.md` exists.
- Reinstall or cache-bust the Codex plugin.
- Confirm the user-level cache contains
  `skills/**/SKILL.md` under the installed `superpipelines` plugin directory.
- Start a fresh Codex session and confirm Superpipelines skills are visible.

## Packaging Source Decision

Use generated packaging, not hand-maintained duplicate skills. The implementation
should add a repeatable sync or package-prep step so the packaged skills stay in
lockstep with root `skills/`.
