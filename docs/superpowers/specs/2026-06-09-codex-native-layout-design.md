# Codex Native Platform Layout

## Problem

The Codex plugin (Tier 1d) uses a non-standard layout: agents, skills, and
pipeline state live under `.agents/codex/` — a location Codex never scans
natively. Agent TOML files use Claude Code's format (`skills = ["name"]`,
`version`, `plugin_version`) instead of Codex-native fields
(`instructions = """..."""`). The plugin manifest declares `"agents"` and
`"commands"` fields that are not standard Codex `plugin.json` fields.

## Solution

Mirror the Claude Code platform layout onto Codex-native paths and formats.

### File moves

| From | To | Reason |
|------|----|--------|
| `.agents/codex/agents/` | `.codex/agents/` | Codex scans `.codex/agents/` for project agents |
| `.agents/codex/skills/` | `.agents/skills/` | Codex scans `.agents/skills/` for skills |
| `.agents/codex/superpipelines/` | `.codex/superpipelines/` | New scope root; matches CC `.claude/superpipelines/` pattern |

### Agent TOML rewrite

Remove: `version`, `plugin_version`, `skills = ["name"]`
Add: scalar `instructions = """..."""` (required by Codex, with protocol content inline)

### Plugin manifest cleanup

Remove `"agents"` and `"commands"` from `.codex-plugin/plugin.json`.
Keep `"skills": "./skills/"` (correct format per Codex docs).

### Registry path update

`scope_root`: `.agents/codex` → `.codex`
Skill paths: adjust `"skills/..."` → `"../.agents/skills/..."` (skills now outside scope root)

### Deletion

`.agents/codex/` entire tree after migration.
