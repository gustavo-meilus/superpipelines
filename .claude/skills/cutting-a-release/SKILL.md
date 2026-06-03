---
name: cutting-a-release
description: Cut a Superpipelines version release (vX.Y.Z) — verify the 5 version targets agree, draft CHANGELOG + RELEASE-NOTES entries, land them via PR (main is branch-protected), then create the GitHub release + tag and verify. Use when the user asks to cut/ship/publish a release, tag a version, do release work, or write release notes for Superpipelines.
---

# Cutting a Superpipelines Release

Cut a version release after the feature PR(s) are merged into `main`. Full step detail + gotchas live in [RUNBOOK.md](RUNBOOK.md) — read it before acting.

## Hard constraints (read first)

- **`main` is branch-protected.** No direct `git push origin main`. Every change goes through a PR. `gh pr merge <n> --squash --admin` bypasses `REVIEW_REQUIRED` (CI must still be green) — **confirm with the user before any `--admin` override.**
- **JSON must be BOM-free.** Never `Set-Content -Encoding UTF8` for JSON. Use the Edit tool or `python3` writes (`encoding="utf-8"`).
- **5 version targets must agree** before tagging: `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` (`plugins.0.version` — NOT the top-level `1.0.0`), `.cursor-plugin/plugin.json`, `CLAUDE.md` (`- **Project Version**: vX.Y.Z`). First 3 listed in `.version-bump.json`; last 2 are manual.
- **Tag ↔ changelog convention:** every tag `vX.Y.Z` MUST have a matching `## X.Y.Z` CHANGELOG entry and a `## vX.Y.Z` RELEASE-NOTES entry before `gh release create`.
- **gh CLI in Bash tool:** never `--body @'...'@` (PowerShell here-string, fails). Write the body to a temp `.md`, use `--body-file`, then `rm` it. Keep temp files out of commits.

## Workflow

1. **Preflight** — `git fetch origin`; confirm `origin/main` has the feature merge; verify all 5 version targets agree and equal the intended vX.Y.Z; check tag/release naming convention (`vX.Y.Z — <Title Case Name>`).
2. **Sync local main** — `ExitWorktree action:keep` if in a worktree; `git checkout main && git pull --ff-only origin main` (clear stale untracked blockers first — diff against `origin/main`).
3. **Draft doc entries** — add `## X.Y.Z` to `CHANGELOG.md` and a `<release_entry>` to `RELEASE-NOTES.md`, mirroring the previous entry's format exactly. Source bullets from real changes; do not invent.
4. **Land docs via PR** — branch `release-notes-X.Y.Z`, commit, push, `gh pr create` (`--body-file`), wait for CI pass, confirm intent, `gh pr merge --squash --admin --delete-branch`, re-sync main.
5. **Create release + tag** — extract the new CHANGELOG section as the release body, append the install line, `gh release create vX.Y.Z --target main --title "vX.Y.Z — <Title>" --notes-file <tmp>`.
6. **Verify** — tag commit == `origin/main`; release not draft/prerelease; `Closes #N` issues CLOSED; follow-up issues still OPEN.
7. **Aiboarding pointer** (optional) — if release docs don't touch the 3 AIBOARDING sections, no-op advance `last_synced_commit` to HEAD via the same PR + `--admin` flow. Expect one residual drift nag on the bump commit — STOP, do not chase.

## Gotchas checklist

- [ ] Bumped `plugins.0.version` in marketplace.json, not top-level `1.0.0`.
- [ ] All 5 version targets agree before tagging.
- [ ] CHANGELOG + RELEASE-NOTES entries exist before `gh release create`.
- [ ] Used `--body-file` for all gh bodies (never `@'...'@`).
- [ ] No direct push to main — everything via PR.
- [ ] Got user OK before any `--admin` override.
- [ ] Temp files cleaned up, kept out of commits.
