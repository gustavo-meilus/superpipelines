---
name: sk-hashline-protocol
description: Use whenever performing file mutations to prevent stale-line edits. Mandates appending content hashes to read lines and verifying those hashes before committing an edit operation to a worktree.
disable-model-invocation: true
user-invocable: false
---

# Hashline Protocol — Anchored Edit Verification

> Enforces a hash-anchored modification protocol to prevent source code corruption. Invoked during the `DEVELOP` and `IMPLEMENT` phases to ensure code edits target verifiable content hashes rather than fragile, static line numbers.

<overview>
The Hashline Protocol ensures atomic mutation safety. By tagging every line read with a 16-character content identifier hash, the system guarantees that edits only occur if the underlying file state matches the expected state, eliminating stale-line and whitespace-drift errors.
</overview>

<glossary>
  <term name="Content Identifier Hash">A 16-character string appended to a line representing its exact content state.</term>
  <term name="Hashline Edit">A mutation operation referencing the hash rather than line number.</term>
</glossary>

## Protocol Execution

<protocol>
### 1. READ WITH HASHES
- When reading target files, request the content to be annotated with line hashes.
- Format expectation: `<line_number>#<HASH>| <content>`

### 2. PREPARE THE EDIT
- Identify the exact block of code to be modified.
- Include the explicit `<HASH>` identifiers in your edit payload alongside the target content.

### 3. VERIFICATION (PRE-WRITE)
- The harness calculates the current hash of the target lines before writing.
- If the current hash does NOT match the requested hash, the write operation is **REJECTED**.
- In case of rejection, the agent must re-read the file to acquire fresh hashes and re-attempt the edit.

### 4. COMMIT
- If the hashes match, the mutation is committed to the isolated worktree for subsequent Stage 1 functional review.
</protocol>

<invariants>
- NEVER target a file edit using static line numbers; always anchor to the Content Identifier Hash.
- ALWAYS re-read the file upon a hash mismatch; never guess or synthesize the current state.
- Ensure the edit is fully localized to the targeted hashes to prevent over-build or collateral mutations.
</invariants>

## Reference Files

- `${CLAUDE_PLUGIN_ROOT}/skills/sk-worktree-safety/SKILL.md` — Isolated worktree principles.
