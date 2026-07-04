@AGENTS.md

<!-- aiboarding-begin:claude-notes -->
# Claude Code Notes

**Project Version**: v2.5.0

`CLAUDE.md` is a wrapper. Keep durable cross-agent context in `AGENTS.md`; keep Claude-only workflow notes here.

Before architecture, skill, agent, manifest, model-routing, or dispatch edits, treat `AGENTS.md`, `docs/adr/`, and the relevant `skills/*/SKILL.md` as required context.

For this repo, Claude Code plugin agents are intentionally frontmatter-only. Structural barriers for plugin-shipped agents come from `tools:` and `disallowedTools:`; do not rely on plugin-scope `permissionMode` as the enforcement mechanism.

Use `.aiboarding/tools/check-size-budget AGENTS.md` after onboarding edits. On Windows without Git Bash, aiboarding hooks may not execute, but native `@AGENTS.md` loading still works.
<!-- aiboarding-end:claude-notes -->
