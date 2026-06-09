---
name: sk-hashline-protocol
description: Enforces hash-anchored line verification to prevent stale-line edits during file mutations. Use when any agent performs file mutations in a worktree — mandates that read lines carry content-identifier hashes and that those hashes are verified before an edit is committed.
disable-model-invocation: true
user-invocable: false
---

# Hashline Protocol — Anchored Edit Verification

<overview>
The Hashline Protocol ensures atomic mutation safety. Every line read is tagged with a 16-character content-identifier hash; an edit is only committed when the underlying file state matches the recorded hash, eliminating stale-line and whitespace-drift errors.
</overview>

<glossary>
  <term name="Content Identifier Hash">A 16-character string appended to a line representing its exact content state.</term>
  <term name="Hashline Edit">A mutation operation that references the content-identifier hash rather than a line number.</term>
</glossary>

## Protocol Execution

<protocol>
### 1. READ WITH HASHES
- Target files are read with line-level hash annotations.
- Expected format: `<line_number>#<HASH>| <content>`
- Example: `42#a3f9b2c1d8e04f7a| return result`

### 2. PREPARE THE EDIT
- The target block is identified by its content, not its line number.
- The edit payload includes the explicit `<HASH>` identifiers alongside the target content.
- Example payload reference: `#a3f9b2c1d8e04f7a` → replacement content.

### 3. VERIFICATION (PRE-WRITE)
- The harness recalculates the current hash of each target line before writing.
- If the current hash does **not** match the recorded hash, the write operation is **REJECTED**.
- On rejection, the file is re-read to acquire fresh hashes; the hash is never guessed or synthesized.

### 4. COMMIT
- When all hashes match, the mutation is committed to the isolated worktree for Stage 1 functional review.
</protocol>

<invariants>
- NEVER target a file edit using static line numbers; always anchor to the Content Identifier Hash.
- ALWAYS re-read the file upon a hash mismatch; never guess or synthesize the current state.
- Edits must be fully localized to the targeted hashes to prevent collateral mutations.
</invariants>

## Reference Skills

- `sk-worktree-safety` — Isolated worktree safety principles.
