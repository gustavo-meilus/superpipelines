# Criterion 25 Discriminating-Power Test

> Locks criterion 25 (frontmatter ↔ protocol capability coherence, issue #34)
> against three baselines that exercise its central false-positive surface: a
> **blocked primary action** (must FAIL, SEV-1) vs a **documented tier-conditional
> fallback** (must PASS) vs a **corrected delegation** (must PASS). Criterion 25
> is judgment-based, not a single regex — these fixtures pin the classification
> boundary the criterion must reproduce.

## What this test asserts

Run criterion 25's detection (build forbidden-tool set from the agent
frontmatter; read the protocol's primary-action region; classify each
forbidden-tool mention) against each pair:

- `split-brain-*.md` → **SEV-1 finding.** The agent declares `disallowedTools: Write`
  yet the protocol's primary action ("Write the report to `<path>`") is an
  unconditional imperative on the blocked tool. Primary path is dead at runtime.
- `fallback-*.md` → **PASS.** Same `disallowedTools: Write`, but the `Write`
  mention is guarded as a documented conditional fallback ("if the orchestrator
  is unavailable … otherwise hand off"). The primary path delegates; the mention
  is a tier-conditional fallback, not the main job. A criterion that flags this
  has lost discriminating power (false positive on legitimate authoring).
- `corrected-*.md` → **PASS.** The protocol's primary action delegates persistence
  and self-cites the read-only contract ("NEVER writes the report file"). No
  forbidden tool on the primary path.

If `split-brain-*` does NOT FAIL, the criterion has lost enforcement power. If
`fallback-*` or `corrected-*` FAILs, the criterion over-fires.

## Files

| File | Agent frontmatter | Primary action | Expected |
|------|-------------------|----------------|----------|
| `split-brain-agent.md` + `split-brain-protocol.md` | `disallowedTools: Write` | "Write the report to …" (unconditional) | SEV-1 |
| `fallback-agent.md` + `fallback-protocol.md` | `disallowedTools: Write` | delegate; Write only "if orchestrator unavailable" | PASS |
| `corrected-agent.md` + `corrected-protocol.md` | `disallowedTools: Write` | delegate; "NEVER writes the report file" | PASS |

## How to refresh baselines

Refresh only if criterion 25's detection definition in
`compliance-matrix.md` changes. After any refresh, re-run all three and confirm
the SEV-1 / PASS / PASS split holds. Never weaken `split-brain-*` into a passing
state — it is the canonical #34 violation this criterion was authored to catch.

## Provenance

Synthetic fixtures derived from the real #33 auditor split-brain (the auditor
protocol once assumed a `Write` its frontmatter forbade) and its corrected form.
