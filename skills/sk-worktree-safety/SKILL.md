---
name: sk-worktree-safety
description: "Enforces a mandatory 4-step safety protocol (Ignore, Setup, Baseline, Commit) for creating, managing, and destroying git worktrees in pipeline isolation contexts. Use when a pipeline step declares `isolation: worktree`, when parallel pattern tasks require branch isolation, or when the iterative or spec-driven patterns require atomic rollback capability."
disable-model-invocation: true
user-invocable: false
---

# Worktree Safety Protocol — Isolated Execution

> Defines the mandatory 4-step protocol (Ignore, Setup, Baseline, Commit) for creating, managing, and destroying git worktrees.

<glossary>
  <term name="Worktree">An isolated git workspace sharing the same repository object but operating on a different branch and path.</term>
  <term name="Baseline Verification">Running the project's test suite before modification to identify pre-existing failures.</term>
  <term name="Atomic Teardown">Committing all uncommitted work before removing the worktree directory.</term>
</glossary>

## The 4-Step Safety Protocol

<protocol>
### 1. VERIFY_IGNORED
The `.worktrees/` directory must be git-ignored before any worktree is created, to prevent accidental commits or workspace pollution.
```bash
git check-ignore -q .worktrees || { echo ".worktrees/" >> .gitignore && git add .gitignore && git commit -m "chore: ignore worktrees"; }
```

### 2. SETUP_AFTER_CREATE
Manifests are auto-detected (`package.json`, `Cargo.toml`, etc.) and the corresponding installation commands (`npm install`, `cargo build`) are run to prepare the isolated environment.

### 3. VERIFY_BASELINE
The project's full test suite is run before any modifications.
- **Failures Found**: Results are reported to the user. **DO NOT PROCEED** with implementation without explicit human authorization.
- **Goal**: Distinguishes between pre-existing issues and pipeline-introduced regressions.

### 4. COMMIT_BEFORE_DESTROY
All changes are added and committed before any worktree is removed, preserving the work-in-progress state.
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
Environment state is verified before execution:
- **`GIT_DIR != GIT_COMMON`**: Already in a linked worktree; Step 1 is skipped.
- **Branch empty**: Detached HEAD detected; branching/pushing is not possible. Escalate to user.
</signals>

<invariants>
- NEVER skip the baseline test; it is the leading cause of false escalations in iterative loops.
- NEVER use `git worktree remove --force` without a preceding commit to preserve findings.
- ALWAYS verify that `.worktrees/` is ignored before creation.
</invariants>

## Red Flags — STOP
- "I'll skip the baseline test, it'll be fine." → **STOP**. Pre-existing failures will corrupt the pipeline metrics.
- "Just force-remove the worktree, the pipeline failed." → **STOP**. Commit partial findings first to aid debugging.

## Reference Files
- `sk-pipeline-patterns/SKILL.md` — Topology selection.
- `sk-pipeline-state/SKILL.md` — `metadata.worktree_root` tracking.
- `finishing-a-development-branch/SKILL.md` — Final merge protocol.
