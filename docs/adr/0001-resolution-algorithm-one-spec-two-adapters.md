# ADR-0001 — Resolution algorithm has one normative spec and two adapters

- **Status:** Accepted
- **Date:** 2026-05-25
- **Decision drivers:** Q1, Q2, Q4 of the 2026-05-25 grilling session on Candidate #1 (resolver consolidation)
- **Supersedes:** —
- **Related:** [ADR-0002 — Capability independence](0002-platform-capabilities-are-independent.md)

## Context

`sk-model-resolver` is meant to be the deep module owning the 5-layer model-resolution chain. In practice the v2.0 work produced three artifacts that each describe the algorithm:

1. `sk-model-resolver/SKILL.md` body — full normative pseudocode (10 steps, ~75 LOC).
2. `sk-model-resolver/references/resolution-algorithm.md` — branch-by-branch examples (not normative).
3. `running-a-pipeline/SKILL.md` Phase 0.4 — an *inline* path that runs when the host lacks the Skill tool.

The inline path was added because some hosts (Antigravity without the plugin installed; minimal Tier 2 IDEs) cannot invoke `Skill(sk-model-resolver)` and must execute the algorithm in-band. Today the inline path is a *strict subset* of the full algorithm — it always returns `source: profile_default`, skips branches 4 (`dynamic_subagents`) and 5 (`inherit` / `model_field_format: omit`), and never consults preference files. This means on Tier 1c and Tier 2 the inline path emits literal model names where the profile contract says the field should be omitted entirely. That is incorrect output, not a degraded-mode tradeoff.

Three framings were considered:

- **(a)** Treat the inline path as a separate "degraded" algorithm with its own spec.
- **(b)** Treat the skill body as the seam; byte-diff the reference doc against it.
- **(c)** Treat the reference doc as the seam; both the skill body and the inline path cite it.

Framing (a) hardens the latent bug into an architectural invariant. Framing (b) forces prose-level synchronization, which is exactly the kind of audit the project historically gets wrong. Framing (c) treats the inline path as a peer adapter of the same algorithm, run with degenerate inputs when capabilities require.

## Decision

`sk-model-resolver/references/resolution-algorithm.md` is the **normative source** of the resolution algorithm. It is promoted from examples to specification. Two adapters interpret it:

1. **Skill adapter** — `sk-model-resolver/SKILL.md` body. Invoked via the Skill tool when available.
2. **Inline adapter** — `running-a-pipeline` Phase 0.4 inline block. Invoked when the Skill tool is unavailable.

Both adapters:
- Execute the **same algorithm** with the **same branches**. There is no degraded variant of the algorithm.
- Attempt `LOAD_PREFS` and degrade to empty `{ user: {platforms:{}}, workspace: {platforms:{}} }` only when file-read also fails.
- Emit identical `resolved` objects given identical inputs.
- Render output via `RENDER_RESOLUTION_TABLE(resolved[])` — a resolver-owned operation — to keep table format authority in one place.

`sk-model-resolver/SKILL.md` body shrinks to: public API list, invariants, Red Flags, and a normative pointer to `references/resolution-algorithm.md`. The body never restates algorithm steps.

## Consequences

**Positive:**

- One source of truth for resolution. Changing the algorithm = editing one file.
- The latent Tier 1c / Tier 2 bug (inline path skipping branches 4 and 5) becomes structurally impossible — there is only one set of branches.
- The existing 8 fixtures in `sk-model-resolver/fixtures/` become the regression surface for *every* adapter, not just the skill adapter.
- Future adapters (a hypothetical Kiro tier_1e, a CI-driven resolver test harness, etc.) add a citation, not an algorithm.

**Negative:**

- The inline adapter is no longer "self-contained prose in Phase 0.4." Future readers of `running-a-pipeline` must read the algorithm file to fully understand what P0.4 does. We accept this in exchange for eliminating drift.
- Hosts that have neither Skill tool **nor** file-read tool cannot resolve at all. We treat this as a hard floor: such hosts cannot run pipelines regardless of resolver design.

**Neutral:**

- The auditor gains a criterion that asserts both adapters cite `references/resolution-algorithm.md`. This is mechanical and cheap.

## How to revisit

This ADR should be reopened if any of the following become true:

- A third adapter emerges with capabilities that genuinely cannot be expressed as degenerate inputs to the same algorithm.
- The algorithm gains a branch whose semantics differ between adapters (today none do).
- A runtime profile-validation requirement forces the resolver to become impure (today it is a pure function).

## References

- `sk-model-resolver/SKILL.md`
- `sk-model-resolver/references/resolution-algorithm.md`
- `running-a-pipeline/SKILL.md` Phase 0.4
- `CONTEXT.md` — *Resolution Algorithm*, *Resolution Adapter*
