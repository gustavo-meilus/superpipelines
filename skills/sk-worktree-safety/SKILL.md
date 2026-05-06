---
name: sk-worktree-safety
description: Use when creating, populating, verifying, or destroying a git worktree as part of a pipeline — the 4-step safety protocol (verify-ignored, setup-after-create, verify-baseline, commit-before-destroy). Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# Worktree Safety Protocol

Worktrees give parallel pipeline tasks isolated workspaces, but unsafe creation or destruction loses work. The 4-step protocol is mandatory whenever a pipeline uses `isolation: worktree` or creates a worktree manually.

Required for Patterns 2, 2b, 3, 5. Optional (default off) for Pattern 1. Never used for read-only Pattern 4.

---

## When to apply

- About to run `git worktree add`.
- Pipeline frontmatter sets `isolation: worktree`.
- Orchestrator prepares parallel branches for fan-out.
- Recovery script restores from a `pipeline-state.json` that references a worktree.

---

## The 4 Steps (run in order)

### 1. VERIFY_IGNORED

Before creating any worktree, ensure `.worktrees/` (or `worktrees/`) is git-ignored.

```bash
git check-ignore -q .worktrees && echo "ignored" || {
  echo ".worktrees/" >> .gitignore
  git add .gitignore
  git commit -m "chore: ignore worktrees dir"
}
```

**Why:** unignored worktree dirs pollute `git status`, risk accidental commits of secrets, binaries, or generated files.

### 2. SETUP_AFTER_CREATE

After `git worktree add <path> <branch>`, auto-detect project type and run setup:

| Manifest | Setup command |
|----------|---------------|
| `package.json` | `npm install` |
| `Cargo.toml` | `cargo build` |
| `requirements.txt` | `pip install -r requirements.txt` |
| `pyproject.toml` (poetry) | `poetry install` |
| `go.mod` | `go mod download` |
| `Gemfile` | `bundle install` |

If multiple manifests exist, run all applicable. If none, skip and proceed.

### 3. VERIFY_BASELINE

Run the project's full test suite before any implementation begins.

```bash
# Auto-detect:
[ -f package.json ] && npm test 2>&1 | tail -80
[ -f Cargo.toml ]  && cargo test 2>&1 | tail -80
[ -f pyproject.toml ] && pytest 2>&1 | tail -80
```

If tests fail: report failures. **Do NOT proceed without human approval.**

**Why:** distinguishes pre-existing failures from failures caused by implementation. Without a green baseline, every iteration of Pattern 3 looks like a regression.

### 4. COMMIT_BEFORE_DESTROY

Before any worktree removal (container teardown, pipeline end, error abort):

```bash
cd "$WORKTREE_PATH"
if ! git diff --quiet || ! git diff --cached --quiet; then
  git add -A
  git commit -m "wip: pipeline checkpoint before worktree destroy"
fi
git worktree remove "$WORKTREE_PATH"
```

If `git commit` would create a meaningful change worth preserving permanently, prompt the user before `worktree remove`.

**Why:** `git worktree remove` blindly deletes uncommitted work. The `WORKTREE_MERGE_REQUIRED: TRUE` invariant says successful changes MUST be explicitly committed and merged before destruction.

---

## Detection signals

Before running any step, detect the environment:

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

- `GIT_DIR != GIT_COMMON` → already in a linked worktree; skip Step 1 (creation).
- `BRANCH` empty → detached HEAD; cannot branch/push from here. Hand off to user via external controls.

---

## Pattern integration

| Pattern | Worktree behavior |
|---------|-------------------|
| 1 (Sequential) | OPT-IN flag; default OFF |
| 2 / 2b (Parallel Fan-Out) | REQUIRED per branch — each parallel worker gets its own worktree |
| 3 (Iterative Loop) | REQUIRED for the loop scope — rollback on escalation requires isolation |
| 4 (Human-Gated) | NEVER for read-only analysis; REQUIRED for the modification phase |
| 5 (SDD) | REQUIRED per task in Phase 5 |

---

## Common mistakes

- Skipping Step 1 — orphan worktree dirs end up in `git status` and accidentally committed.
- Skipping Step 3 — pre-existing failures get blamed on the pipeline.
- Skipping Step 4 — `worktree remove` silently deletes the workers' results.
- Running `git worktree remove --force` without committing first → unrecoverable loss.
- Reusing a worktree across pipelines without re-running Step 3.

## Red Flags — STOP

- "I'll skip the baseline test, it'll be fine" → run the test. Pre-existing failures are the leading cause of false escalations in Pattern 3.
- "Just `--force` remove the worktree, the pipeline failed anyway" → STOP. Commit first, then remove. Even failed pipelines may have partial findings worth keeping.
- "I don't need to gitignore .worktrees/, the user will see it" → most users don't notice extra dirs in `git status` until secrets leak. Always Step 1.

## Cross-references

- `sk-pipeline-patterns` `references/ai-pipelines-trimmed.md` — full conventions reference.
- `running-a-pipeline` — invokes this skill before parallel dispatch.
- `finishing-a-development-branch` — final commit/merge stage.
- `sk-pipeline-state` — `metadata.worktree_root` field.
