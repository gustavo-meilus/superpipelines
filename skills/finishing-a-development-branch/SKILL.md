---
name: finishing-a-development-branch
description: Use when implementation is complete, tests pass, and integration decisions are pending — presents structured options for merge, PR, or cleanup of the development branch
---

# Finishing a Development Branch — Integration Protocol

> Facilitates the structured conclusion of development work by verifying readiness and presenting integration options. Trigger when implementation is complete, tests pass, and integration decisions (merge, PR, or cleanup) are pending.

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
- Run the project's primary test suite (e.g., `npm test`, `pytest`).
- <HARD-GATE>If tests fail, STOP. You cannot proceed to integration options until all tests are green.</HARD-GATE>

### 2. DETERMINE BASE BRANCH
- Identify the split point (e.g., `git merge-base HEAD main`).
- Confirm the base branch with the user if ambiguity exists.

### 3. PRESENT STRUCTURED OPTIONS
- Present exactly these four options without modification:
  1. **Merge back to [base] locally**
  2. **Push and create a Pull Request**
  3. **Keep the branch as-is (Handle later)**
  4. **Discard this work**

### 4. EXECUTE CHOICE
- **Option 1**: Checkout base, pull latest, merge, re-verify tests, and delete feature branch.
- **Option 2**: Push to origin and create PR using the `gh` CLI.
- **Option 4**: Request explicit typed confirmation ("discard") before destructive deletion.

### 5. CLEANUP
- For Options 1, 2, and 4: Remove the associated git worktree to maintain repository hygiene.
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
