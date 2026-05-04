---
name: sk-worktree-safety
description: Use when creating, populating, verifying, or destroying a git worktree as part of a pipeline — the 4-step safety protocol (verify-ignored, setup-after-create, verify-baseline, commit-before-destroy). Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# Worktree Safety Protocol — Isolated Execution

> Defines the mandatory 4-step protocol (Ignore, Setup, Baseline, Commit) for creating, managing, and destroying git worktrees. Trigger when utilizing `isolation: worktree` or preparing parallel branches for pipeline tasks.

<overview>
Worktrees provide critical isolation for parallel pipeline tasks, but improper handling risks data loss or workspace pollution. This protocol ensures that every worktree is properly ignored, initialized with a verified baseline, and committed before destruction to preserve all generated artifacts and findings.
</overview>

<glossary>
  <term name="Worktree">An isolated git workspace sharing the same repository object but operating on a different branch and path.</term>
  <term name="Baseline Verification">Running the project's test suite before modification to identify pre-existing failures.</term>
  <term name="Atomic Teardown">Committing all uncommitted work before removing the worktree directory.</term>
</glossary>

## The 4-Step Safety Protocol

<protocol>
### 1. VERIFY_IGNORED
Ensure the `.worktrees/` directory is git-ignored to prevent accidental pollution of the main workspace or commits.
```bash
git check-ignore -q .worktrees || { echo ".worktrees/" >> .gitignore && git add .gitignore && git commit -m "chore: ignore worktrees"; }
```

### 2. SETUP_AFTER_CREATE
Auto-detect manifests (`package.json`, `Cargo.toml`, etc.) and run the corresponding installation commands (`npm install`, `cargo build`) to prepare the isolated environment.

### 3. VERIFY_BASELINE
Run the project's full test suite.
- **Failures Found**: Report results to the user. **DO NOT PROCEED** with implementation without explicit human authorization.
- **Goal**: Distinguish between pre-existing issues and pipeline-introduced regressions.

### 4. COMMIT_BEFORE_DESTROY
Before removing any worktree, add and commit all changes to preserve the work-in-progress state.
```bash
cd "$WORKTREE_PATH" && git add -A && git commit -m "wip: pipeline checkpoint"
git worktree remove "$WORKTREE_PATH"
```
</protocol>

## Pattern Integration

<integration_table>
| Pattern | Worktree Requirement | Rationale |
| :--- | :--- | :--- |
| **1. Sequential** | Optional | Linear flow may not require isolation. |
| **2. Parallel** | **Mandatory** | Required for fanned-out task isolation. |
| **3. Iterative** | **Mandatory** | Enables atomic rollback on escalation. |
| **4. Gated** | Conditional | Required only during the modification phase. |
| **5. Spec-Driven** | **Mandatory** | Enforced per-task during Phase 5 (Implement). |
</integration_table>

## Detection Signals

<signals>
Before execution, verify the environment state:
- **`GIT_DIR != GIT_COMMON`**: Already in a linked worktree; skip Step 1.
- **Branch empty**: Detached HEAD detected; cannot branch/push. Escalate to user.
</signals>

<invariants>
- NEVER skip the baseline test; it is the leading cause of false escalations in iterative loops.
- NEVER use `git worktree remove --force` without an preceding commit to preserve findings.
- ALWAYS verify that `.worktrees/` is ignored before creation.
</invariants>

## Red Flags — STOP
- "I'll skip the baseline test, it'll be fine." → **STOP**. Pre-existing failures will corrupt the pipeline metrics.
- "Just force-remove the worktree, the pipeline failed." → **STOP**. Commit partial findings first to aid debugging.

## Reference Files
- `sk-pipeline-patterns/SKILL.md` — Topology selection.
- `sk-pipeline-state/SKILL.md` — `metadata.worktree_root` tracking.
- `finishing-a-development-branch/SKILL.md` — Final merge protocol.
