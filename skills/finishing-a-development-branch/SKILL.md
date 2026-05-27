---
name: finishing-a-development-branch
description: Structured integration protocol that enforces a test-verification gate and presents branch disposition options (merge, PR, keep, or discard). Use when implementation is complete, all tests pass, and an integration decision for the development branch is pending.
---

# Finishing a Development Branch — Integration Protocol

> Ensures work is integrated or preserved according to explicit user choice. A mandatory test verification gate is enforced before any options are presented, preventing promotion of broken or unverified code to the base branch.

<overview>
Finishing a Development Branch ensures that work is integrated or preserved according to the user's explicit choice. It enforces a mandatory test verification gate before any options are presented, preventing the promotion of broken or unverified code to the base branch.
</overview>

<glossary>
  <term name="Base Branch">The target for integration, typically `main` or `master`.</term>
  <term name="Worktree">An isolated directory for development; must be cleaned after integration.</term>
  <term name="PR Gate">Option 2, which involves pushing the branch and creating a Pull Request via `gh pr create`.</term>
</glossary>

## The Completion Protocol

<protocol>
### 1. VERIFY TESTS (THE GATE)
- The project's primary test suite is run (e.g., `npm test`, `pytest`).
- <HARD-GATE>If tests fail, STOP. Integration options cannot be presented until all tests are green.</HARD-GATE>

### 2. DETERMINE BASE BRANCH
- The split point is identified (e.g., `git merge-base HEAD main`).
- The base branch is confirmed with the user if ambiguity exists.

### 3. PRESENT STRUCTURED OPTIONS
- Exactly these four options are presented without modification:
  1. **Merge back to [base] locally**
  2. **Push and create a Pull Request**
  3. **Keep the branch as-is (Handle later)**
  4. **Discard this work**

### 4. EXECUTE CHOICE
- **Option 1**: Base is checked out, latest is pulled, branch is merged, tests are re-verified, and the feature branch is deleted.
- **Option 2**: Branch is pushed to origin and a PR is created using the `gh` CLI.
- **Option 4**: Explicit typed confirmation ("discard") is required before destructive deletion.

### 5. CLEANUP
- For Options 1, 2, and 4: The associated git worktree is removed to maintain repository hygiene.
</protocol>

<invariants>
- NEVER proceed with integration if the verification gate fails.
- NEVER cleanup the worktree for Option 3 (Keep as-is).
- ALWAYS re-verify tests on the base branch after a local merge (Option 1).
- ALWAYS obtain "discard" confirmation before executing Option 4.
</invariants>

## Completion Patterns

<patterns>
| Option | Merge | Push | Cleanup Branch | Cleanup Worktree |
| :--- | :--- | :--- | :--- | :--- |
| **1. Merge Locally** | ✓ | - | ✓ | ✓ |
| **2. Create PR** | - | ✓ | - | ✓ |
| **3. Keep As-Is** | - | - | - | - |
| **4. Discard** | - | - | ✓ (force) | ✓ |
</patterns>

## Red Flags — STOP
- "I'll merge now and fix the tests later." → **STOP**. Integration of failing code is a SEV-0 failure.
- "What should I do next?" → **STOP**. Present the four structured options defined in the protocol.
- "Deleting worktree automatically." → **STOP**. Option 3 requires worktree preservation.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "PR handles testing anyway." | Local verification prevents broken builds and reduces CI overhead. |
| "It's just a one-line change." | One-line changes are the leading cause of "it worked in my head" regressions. |
| "Discarding is faster than cleanup." | Unconfirmed discards cause irreversible data loss. |
</rationalization_table>

## Reference Files
- `sk-worktree-safety/SKILL.md` — Worktree management.
- `verification-before-completion/SKILL.md` — Final evidence gate.
- `running-a-pipeline/SKILL.md` — Integration point for pipeline completion.
