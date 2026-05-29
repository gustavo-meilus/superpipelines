---
name: release
description: Use when preparing and publishing a new versioned release of superpipelines — bumps versions across all manifests (package.json, .claude-plugin/, .codex-plugin/, .cursor-plugin/, gemini-extension.json, marketplace.json plugin entry), prepends CHANGELOG.md, overwrites RELEASE-NOTES.md with the latest entry, commits, tags, pushes to main, and creates the GitHub release. Requires being on main with a clean working tree.
user-invocable: true
---

# Superpipelines Release Process

<overview>
Eight-step release workflow for the superpipelines multi-platform plugin (CC + Codex + Cursor/Windsurf/Cline + Antigravity). Covers version discovery, user-gated version selection, commit categorization, multi-file version bumping (across all per-platform manifests), changelog authoring, staged user approval, git tagging, and GitHub release publication.
</overview>

<constraints>
- NEVER auto-increment the version; always ask the user.
- NEVER push to any branch other than `main`.
- NEVER create the GitHub release before the version-bump commit is pushed.
- NEVER proceed past Step 5b without explicit user approval.
- ALWAYS verify the git tag exists locally before pushing it.
</constraints>

---

## Step 1 — Preflight & Discovery

```bash
git branch --show-current          # must output "main"; abort if not
git status --porcelain             # must be empty; abort if dirty
git fetch origin main --tags       # sync remote tags
git describe --tags --abbrev=0     # find the most recent tag, e.g. v2.0.0
git log v2.0.0..HEAD --oneline     # list all commits since last release
```

If the current branch is not `main`, stop and instruct the user to merge their work to `main` first.

---

## Step 2 — Ask the User for the New Version

Present the previous tag and a summary of the unreleased commits. Then ask:

> "The last release was **{prev_tag}**. What should the new version be? (e.g. `1.1.0` — do not include the `v` prefix)"

Wait for the user's explicit answer. Store it as `{NEW_VERSION}`. The git tag will be `v{NEW_VERSION}`.

Semantic versioning guidance:
- **Patch** (`x.y.Z`): bug fixes, documentation corrections, no new functionality.
- **Minor** (`x.Y.0`): new commands, new skills, new agents, backwards-compatible changes.
- **Major** (`X.0.0`): breaking changes to pipeline state schema, removed commands, incompatible artifact formats.

---

## Step 3 — Categorize Commits

Collect all commits since the previous tag and group them:

| Category | Prefixes / Keywords |
|----------|-------------------|
| **Added** | `feat:`, `add`, new command, new skill, new agent |
| **Changed** | `refactor:`, `update`, `improve`, architectural changes |
| **Fixed** | `fix:`, `bug`, correction |
| **Removed** | `remove`, `delete`, `drop` |
| **Documentation** | `docs:`, `readme`, `changelog` |
| **Maintenance** | `chore:`, `ci:`, `deps:`, version bumps |

Draft the human-readable release title: a short (≤60 chars) phrase capturing the release theme (e.g. "Lean Agents & Zero-Body Architecture").

---

## Step 4 — Bump Version in All Manifests

Update exactly these **thirteen** files. No others. (Q11: expanded from six to twelve to cover the per-tier profile_version coupling and the CLAUDE.md Project Version field — v1.0.6 shipped with the Project Version drifted at v1.2.0 because the release skill didn't track it. Never again. v2.1.0: added the thirteenth file — the Codex marketplace subdirectory manifest, added in 2.0.1 but previously untracked, which had drifted at 2.0.0.)

### 4a. `package.json`

```json
{
  "name": "superpipelines",
  "version": "{NEW_VERSION}",
  "type": "module"
}
```

### 4b. `.claude-plugin/plugin.json`

Change only the `"version"` field:
```json
"version": "{NEW_VERSION}",
```

### 4c. `.claude-plugin/marketplace.json`

Change only `plugins[0].version` — NOT the root `"version"` field (that is the marketplace catalog version and stays at `"1.0.0"`):
```json
"plugins": [
  {
    "name": "superpipelines",
    "version": "{NEW_VERSION}",
    ...
  }
]
```

### 4d. `.codex-plugin/plugin.json`

Change only the `"version"` field:
```json
"version": "{NEW_VERSION}",
```

### 4d-ii. `plugins/superpipelines/.codex-plugin/plugin.json`

The Codex marketplace subdirectory manifest (added in 2.0.1 — Codex resolves plugins from named subdirectories, not the marketplace root). Change only the `"version"` field:
```json
"version": "{NEW_VERSION}",
```

### 4e. `.cursor-plugin/plugin.json`

Change only the `"version"` field:
```json
"version": "{NEW_VERSION}",
```

### 4f. `gemini-extension.json`

Change only the `"version"` field:
```json
"version": "{NEW_VERSION}",
```

> **TODO (post-2026-06-18):** Gemini CLI retires June 18, 2026. After retirement, delete `gemini-extension.json` from the repo and remove this Step 4f entry. Verify with `agy plugin import gemini` migration path before deletion.

### 4g. `skills/sk-platform-dispatch/profiles/tier_1.json`, `tier_1b.json`, `tier_1c.json`, `tier_1d.json`, `tier_2.json`

(Q11) Update the `"profile_version"` field on each of the 5 profile JSONs. profile_version is coupled to plugin_version per the v2.0.0 architecture decision.

```json
"profile_version": "{NEW_VERSION}",
```

### 4h. `CLAUDE.md` Project Version

(Q11) Update the `Project Version` line near the bottom of `CLAUDE.md`:

```markdown
- **Project Version**: v{NEW_VERSION}
```

### 4i. `model_tiers_version` decision prompt

(Q11) Ask the user explicitly:

> "Did this release update any model IDs in `profiles/tier_*.json`? (Yes / No)"

If Yes: bump the `"model_tiers_version"` field on all 5 profile JSONs to today's date (`YYYY-MM-DD`). This is the catalog version used by `DETECT_CATALOG_DRIFT` to emit advisories when user preferences fall behind the shipped catalog. If skipped, the drift detector never fires after a model-catalog refresh.

```json
"model_tiers_version": "{TODAY_YYYY_MM_DD}",
```

If No: leave `model_tiers_version` unchanged on every profile.

---

## Step 5 — Update CHANGELOG.md and RELEASE-NOTES.md

### 5a. CHANGELOG.md — Prepend a new entry

Insert a new entry immediately after the `## Distribution` section header block (before the current first release entry). Use this format exactly — no `v` prefix in the heading:

```markdown
## {NEW_VERSION} — {Release Title} ({YYYY-MM-DD})

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Removed
- ...
```

Omit any category section that has no entries. Preserve all existing content below.

### 5b. RELEASE-NOTES.md — Overwrite with ONLY the new entry

Replace the entire file content with the header + the single new release entry. Preserve all prior release entries below it. Use this exact format (with `v` prefix in heading and XML envelope):

```markdown
# Superpipelines — Release Notes

> Canonical record of versioned changes, feature additions, and removals for the Superpipelines framework. This document serves as the primary reference for tracking migration paths and architectural evolution.

<overview>
Superpipelines release notes document the transition from legacy Superpowers-era infrastructure to the standalone v{NEW_VERSION} architecture. Key milestones include [brief phrase matching this release theme].
</overview>

## v{NEW_VERSION} — {Release Title} ({YYYY-MM-DD})

[One-sentence narrative describing what this release achieves.]

<release_entry version="{NEW_VERSION}" status="STABLE">

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Removed
- ...

</release_entry>

{--- all prior release entries verbatim below ---}
```

---

## Step 5b — User Approval Gate

Present a summary to the user:

```
Ready to release v{NEW_VERSION} — {Release Title}

Files to be modified:
  package.json                                  {prev} → {NEW_VERSION}
  .claude-plugin/plugin.json                    {prev} → {NEW_VERSION}
  .claude-plugin/marketplace.json               {prev} → {NEW_VERSION}
  .codex-plugin/plugin.json                     {prev} → {NEW_VERSION}
  plugins/superpipelines/.codex-plugin/plugin.json  {prev} → {NEW_VERSION}
  .cursor-plugin/plugin.json                    {prev} → {NEW_VERSION}
  gemini-extension.json                         {prev} → {NEW_VERSION}
  skills/sk-platform-dispatch/profiles/tier_1.json    profile_version {prev} → {NEW_VERSION}
  skills/sk-platform-dispatch/profiles/tier_1b.json   profile_version {prev} → {NEW_VERSION}
  skills/sk-platform-dispatch/profiles/tier_1c.json   profile_version {prev} → {NEW_VERSION}
  skills/sk-platform-dispatch/profiles/tier_1d.json   profile_version {prev} → {NEW_VERSION}
  skills/sk-platform-dispatch/profiles/tier_2.json    profile_version {prev} → {NEW_VERSION}
  CLAUDE.md                                     Project Version line → v{NEW_VERSION}
  CHANGELOG.md                                  (prepend entry)
  RELEASE-NOTES.md                              (overwrite with latest + history)

If model catalog refreshed (Step 4i Yes):
  model_tiers_version on all 5 profiles → {TODAY_YYYY_MM_DD}

Git operations:
  commit: "release: v{NEW_VERSION} — {Release Title}" + Step 5c parity matrix in body
  tag:    v{NEW_VERSION}
  push:   origin main + tag

Proceed? (yes / show diff / modify / skip parity gate)
```

**If the user says "show diff":** Run `git diff` and display it, then re-present the gate.
**If the user says "modify":** Accept their requested changes, update files, then re-present the gate.
**Only proceed to Step 5c on an explicit "yes".**

---

## Step 5c — Parity-Test Gate (Q11)

The `PARITY_TESTING: MANUAL_PHASE1` invariant requires per-tier validation before release. This gate enforces an explicit per-tier confirmation, logged into the release commit message for audit.

Prompt the user for each tier that has changes in this release:

```
For each tier you have changed (or that this release affects), confirm parity status:
  Tier 1   (Claude Code)              : [PASS / SKIP / N/A]
  Tier 1b  (OpenCode)                 : [PASS / SKIP / N/A]
  Tier 1c  (Antigravity CLI 2.0)      : [PASS / SKIP / N/A]
  Tier 1d  (Codex App/CLI)            : [PASS / SKIP / N/A]
  Tier 2   (Cursor / Windsurf / Cline): [PASS / SKIP / N/A]
```

Rules:
- `PASS` requires that the user scaffolded and ran a representative pipeline on that tier in the last 24 hours and observed correct behavior.
- `SKIP` is acceptable only when the change is documented to not affect that tier (e.g., a CC-only bugfix may SKIP 1b/1c/1d/2). The user must briefly state why.
- `N/A` is acceptable only when the tier is unavailable to the releaser (e.g., no Antigravity install). The user must state which platform is unavailable.

**Q8 Tier 1d sandbox-isolation verification.** For each Tier 1d `PASS`, additionally confirm:
- Create a Codex reviewer agent TOML with `sandbox_mode = "read-only"`.
- Dispatch the reviewer with a prompt that asks it to write a file.
- Observe: the write attempt is denied by Codex's sandbox.

If the write is NOT denied: the `tier_1d.json` `reviewer_isolation: "structural"` claim is false. Downgrade the profile to `"convention"`, add a degradation_warning, and amend the `STRUCTURAL_ON_TIER1_1B_1D` invariant in `CLAUDE.md` to `STRUCTURAL_ON_TIER1_1B; CONVENTION_ELSEWHERE` BEFORE releasing.

Capture the responses verbatim. They will be embedded in the release commit message in Step 6.

**Cannot proceed to Step 6 without a response (PASS / SKIP / N/A + reason) for every tier.**

---

## Step 6 — Commit

```bash
git add package.json \
        .claude-plugin/plugin.json \
        .claude-plugin/marketplace.json \
        .codex-plugin/plugin.json \
        plugins/superpipelines/.codex-plugin/plugin.json \
        .cursor-plugin/plugin.json \
        gemini-extension.json \
        skills/sk-platform-dispatch/profiles/tier_1.json \
        skills/sk-platform-dispatch/profiles/tier_1b.json \
        skills/sk-platform-dispatch/profiles/tier_1c.json \
        skills/sk-platform-dispatch/profiles/tier_1d.json \
        skills/sk-platform-dispatch/profiles/tier_2.json \
        CLAUDE.md \
        CHANGELOG.md \
        RELEASE-NOTES.md

git commit -m "$(cat <<'EOF'
release: v{NEW_VERSION} — {Release Title}

Parity (PARITY_TESTING: MANUAL_PHASE1, Q11 gate):
  Tier 1:  {PASS|SKIP|N/A} {reason if SKIP/N/A}
  Tier 1b: {PASS|SKIP|N/A} {reason if SKIP/N/A}
  Tier 1c: {PASS|SKIP|N/A} {reason if SKIP/N/A}
  Tier 1d: {PASS|SKIP|N/A} {reason if SKIP/N/A}
  Tier 2:  {PASS|SKIP|N/A} {reason if SKIP/N/A}
EOF
)"
```

Verify the commit appears in `git log --oneline -1`.

---

## Step 7 — Create and Verify Tag

```bash
git tag v{NEW_VERSION}
git tag --list "v{NEW_VERSION}"    # must output exactly: v{NEW_VERSION}
```

If the tag is not listed, stop and report `BLOCKED`.

---

## Step 8 — Push and Publish

### Push commits and tag

```bash
git push origin main
git push origin v{NEW_VERSION}
```

### Create GitHub Release

The `mcp__github__create_release` tool is not available in this environment. Use `mcp__github__get_latest_release` to confirm the tag is visible on the remote, then instruct the user:

> "The tag `v{NEW_VERSION}` has been pushed. To publish the GitHub release, go to:
> https://github.com/gustavo-meilus/superpipelines/releases/new?tag=v{NEW_VERSION}
>
> Paste the following as the release body (the v{NEW_VERSION} entry from RELEASE-NOTES.md):"

Then paste only the current release's `<release_entry>` block and heading — do NOT paste the full RELEASE-NOTES.md, which contains all prior releases.

If the user has `gh` CLI available locally, extract the current entry to a temp file first:
```bash
# Extract only the current release entry from RELEASE-NOTES.md
awk "/^## v{NEW_VERSION}/,/^## v[0-9]/" RELEASE-NOTES.md | head -n -1 > /tmp/release-notes-current.md
gh release create v{NEW_VERSION} \
  --title "v{NEW_VERSION} — {Release Title}" \
  --notes-file /tmp/release-notes-current.md \
  --target main
rm /tmp/release-notes-current.md
```

---

## Terminal Status

Emit exactly one of:
- **DONE** — All 8 steps completed; tag pushed; GitHub release created or instructions provided.
- **DONE_WITH_CONCERNS** — Release artifacts published but a non-critical issue was noted (e.g. GitHub release requires manual creation).
- **BLOCKED** — A critical step failed (dirty working tree, tag not created, push rejected). Report the exact error and halt.
