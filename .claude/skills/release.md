---
name: release
description: Use when preparing and publishing a new versioned release of superpipelines — bumps versions across all manifests, prepends CHANGELOG.md, overwrites RELEASE-NOTES.md with the latest entry, commits, tags, pushes to main, and creates the GitHub release. Requires being on main with a clean working tree.
user-invocable: true
---

# Superpipelines Release Process

<overview>
Eight-step release workflow for the superpipelines Claude Code plugin. Covers version discovery, user-gated version selection, commit categorization, multi-file version bumping, changelog authoring, staged user approval, git tagging, and GitHub release publication.
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
git describe --tags --abbrev=0     # find the most recent tag, e.g. v1.0.5
git log v1.0.5..HEAD --oneline     # list all commits since last release
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

Update exactly these three files. No others.

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
  CHANGELOG.md                                  (prepend entry)
  RELEASE-NOTES.md                              (overwrite with latest + history)

Git operations:
  commit: "release: v{NEW_VERSION} — {Release Title}"
  tag:    v{NEW_VERSION}
  push:   origin main + tag

Proceed? (yes / show diff / modify)
```

**If the user says "show diff":** Run `git diff` and display it, then re-present the gate.
**If the user says "modify":** Accept their requested changes, update files, then re-present the gate.
**Only proceed to Step 6 on an explicit "yes".**

---

## Step 6 — Commit

```bash
git add package.json \
        .claude-plugin/plugin.json \
        .claude-plugin/marketplace.json \
        CHANGELOG.md \
        RELEASE-NOTES.md

git commit -m "release: v{NEW_VERSION} — {Release Title}"
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

Use `mcp__github__push_files` is not applicable here. Instead, use the GitHub MCP tool `mcp__github__get_latest_release` to confirm the tag is visible on the remote, then instruct the user:

> "The tag `v{NEW_VERSION}` has been pushed. To publish the GitHub release, go to:
> https://github.com/gustavo-meilus/superpipelines/releases/new?tag=v{NEW_VERSION}
>
> Use the following as the release body:"

Then paste the full RELEASE-NOTES.md entry for this version (the `<release_entry>` block and heading, formatted as Markdown).

If the user has `gh` CLI available locally:
```bash
gh release create v{NEW_VERSION} \
  --title "v{NEW_VERSION} — {Release Title}" \
  --notes-file RELEASE-NOTES.md \
  --target main
```

---

## Terminal Status

Emit exactly one of:
- **DONE** — All 8 steps completed; tag pushed; GitHub release created or instructions provided.
- **DONE_WITH_CONCERNS** — Release artifacts published but a non-critical issue was noted (e.g. GitHub release requires manual creation).
- **BLOCKED** — A critical step failed (dirty working tree, tag not created, push rejected). Report the exact error and halt.
