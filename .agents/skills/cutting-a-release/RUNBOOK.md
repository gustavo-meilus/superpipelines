# Release Runbook — Superpipelines (full detail)

Derived from the v2.2.0 release (2026-06-03). Repo: `C:\Users\gmeil\Github\superpipelines` (default branch `main`, branch-protected). Platform: Win11 / PowerShell + Bash tool.

## Hard constraints (read before acting)

1. **`main` is branch-protected**: direct `git push origin main` is **rejected** (`repository rule violations`), and PRs are `BLOCKED` on `REVIEW_REQUIRED`. Every change to main goes through a PR. With owner/admin creds, `gh pr merge <n> --squash --admin` bypasses the required-review block (CI must still be green). Confirm the user actually wants the admin-override bypass before using it.
2. **No build/test framework.** CI = one GitHub Action, "Validate Plugin Manifests" (validates JSON manifests + required-files presence). Verification is `rg`/Read assertions + `python3 -c "import json; json.load(...)"`.
3. **JSON must be BOM-free.** Never `Set-Content -Encoding UTF8` for JSON. Use the Edit tool or `python3` writes (`encoding="utf-8"`).
4. **Version source of truth:** `.version-bump.json` lists the synced files: `package.json` (`version`), `.claude-plugin/plugin.json` (`version`), `.claude-plugin/marketplace.json` (`plugins.0.version`). NOT auto-synced (edit manually): `.cursor-plugin/plugin.json` (`version`), `CLAUDE.md` (`- **Project Version**: vX.Y.Z`). NOTE marketplace.json has TWO version fields — bump `plugins.0.version`, NOT the top-level marketplace `version` (`1.0.0`).
5. **Tag ↔ changelog convention** (stated in `CHANGELOG.md` header): every git tag `vX.Y.Z` MUST have a matching `## X.Y.Z` CHANGELOG entry and a `## vX.Y.Z` RELEASE-NOTES entry. A release without these is inconsistent.
6. **gh CLI quirks:** `--body @'...'@` is PowerShell here-string syntax and FAILS in the Bash tool — always write the body to a temp `.md` and use `--body-file`. `gh release view --json isLatest` is not a valid field on this gh version; a normal (non-draft/prerelease) release is latest by default.
7. **Worktree note:** feature work happens in `.claude/worktrees/<name>` (via `EnterWorktree`). The release itself happens on the **main checkout** — `ExitWorktree action:keep` returns there. The main working dir may hold stale untracked drafts that block `git pull --ff-only`; diff them against `origin/main`, and if the committed copy is authoritative, `rm` the untracked ones before pulling.

## Step-by-step: cut a release (vX.Y.Z)

Assumes the feature PR(s) are already merged into `main` and the version bump (manifests + CLAUDE.md) shipped inside that feature PR. If the bump did NOT ship in the feature PR, do it as part of the release-docs PR in Step 3.

### 0. Preflight
- `git fetch origin --quiet`
- Confirm `origin/main` HEAD includes the feature merge: `git log origin/main --oneline -3`.
- Confirm versions agree across all 5 targets and equal the intended vX.Y.Z:
  `python3 -c "import json; print(json.load(open('package.json'))['version'], json.load(open('.claude-plugin/plugin.json'))['version'], json.load(open('.cursor-plugin/plugin.json'))['version'], json.load(open('.claude-plugin/marketplace.json'))['plugins'][0]['version'])"` and `rg -n "Project Version" CLAUDE.md`.
- Check existing tags/releases for naming convention: `git tag --sort=-v:refname | head` and `gh release list --limit 5`. Title form is `vX.Y.Z — <Title Case Feature Name>`.

### 1. Sync local main
- Return to main checkout if in a worktree: `ExitWorktree action:keep`.
- `git checkout main` then `git pull --ff-only origin main`.
- If pull aborts on untracked files: inspect `git status --short`; for each blocker, `diff <(git show origin/main:PATH) PATH` — if identical or the committed version is authoritative, `rm` the untracked file; then re-pull.

### 2. Draft the two doc entries (match existing format exactly)
- Read the most recent entry in each file to mirror structure:
  - `CHANGELOG.md`: `## X.Y.Z — Title (YYYY-MM-DD)` then `### Added` / `### Fixed` / `### Changed` / `### Documentation` bullets. Insert ABOVE the previous `## <prev>` heading.
  - `RELEASE-NOTES.md`: a one-paragraph summary, then `<release_entry version="X.Y.Z" status="STABLE"> ... </release_entry>`, with `### Added` / `### Safety` / `### Documentation` sections. Insert ABOVE the previous `## v<prev>` heading. Also extend the `<overview>` paragraph's trailing "milestones" sentence with the new version.
- Use the Edit tool (anchored on the previous version heading). Date = today (convert any relative date to absolute ISO).
- Source the bullet content from the feature's CHANGELOG-worthy changes; do NOT invent. Keep it consistent with the spec/plan and the auditor verdict.

### 3. Land the docs via PR (main is protected)
- `git checkout -b release-notes-X.Y.Z`
- `git add CHANGELOG.md RELEASE-NOTES.md && git commit -m "docs(release): add X.Y.Z changelog + release-notes entries"`
- `git push -u origin release-notes-X.Y.Z`
- Write PR body to a temp `.md`; `gh pr create --base main --head release-notes-X.Y.Z --title "docs(release): X.Y.Z changelog + release-notes" --body-file <tmp>`; `rm` the tmp.
- Wait for CI: `gh pr checks <n>` until "Validate Plugin Manifests" = pass.
- Confirm intent, then merge: `gh pr merge <n> --squash --admin --delete-branch` (admin override clears `REVIEW_REQUIRED`).
- Re-sync: `git checkout main && git pull --ff-only origin main`. Verify `rg -n "^## X.Y.Z" CHANGELOG.md`.

### 4. Create the GitHub release + tag
- Extract the new CHANGELOG section as the release body:
  `awk '/^## X\.Y\.Z/{f=1;next} /^## <prev>/{f=0} f' CHANGELOG.md > <tmp>` then append an install line:
  `**Install:** /plugin install superpipelines@superpipelines-marketplace --version vX.Y.Z`.
- `gh release create vX.Y.Z --target main --title "vX.Y.Z — <Title>" --notes-file <tmp>`; `rm` the tmp.
  (This creates the tag `vX.Y.Z` on the current main HEAD.)

### 5. Verify
- `git fetch origin --tags --quiet`; assert `git rev-list -n1 vX.Y.Z` == `git rev-parse origin/main`.
- `gh release view vX.Y.Z --json tagName,targetCommitish,isDraft,isPrerelease` (expect not draft/prerelease).
- If the feature PR used `Closes #N`: `gh issue view N --json state` → CLOSED.
- Confirm any follow-up issues remain OPEN as intended.

### 6. Advance the aiboarding pointer (optional housekeeping)
- The `<aiboarding-drift>` hook nags while `AIBOARDING.md` `last_synced_commit` < HEAD. Run the `update-aiboarding` skill to triage.
- Release docs (CHANGELOG/RELEASE-NOTES) do NOT touch the 3 AIBOARDING sections → **No-op advance**: bump `last_synced_commit` to current HEAD only, no body rewrite.
- Land it via the same PR + `--admin` squash-merge flow (main is protected).
- **Known steady state:** after the bump merges, the hook fires once more on the bump commit itself (the pointer can't equal HEAD without another commit). This is expected — STOP, do not chase it. Prior precedent: commit `fef4cf4`.

## Gotchas checklist (quick)
- [ ] Bumped `plugins.0.version` in marketplace.json, not the top-level `1.0.0`.
- [ ] All 5 version targets agree before tagging.
- [ ] CHANGELOG + RELEASE-NOTES entries exist before `gh release create` (tag↔changelog convention).
- [ ] Used `--body-file` for all gh bodies (never `@'...'@` in the Bash tool).
- [ ] Did not direct-push to main; everything via PR.
- [ ] Got user OK before any `--admin` override.
- [ ] Temp files (`.pr-body.md`, `.rel-notes.md`, etc.) cleaned up — keep them OUT of commits.

## Reference example (v2.2.0)
- Feature `optimizing-a-pipeline`. Issue #40 (closed), feature PR #39, release-docs PR #42, aiboarding-sync PR #43. Follow-up #41 (telemetry env-var wiring) left OPEN.
- Release: tag `v2.2.0` → commit `32c6970`. Title: `v2.2.0 — Optimizing a Pipeline`.
