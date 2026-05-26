# ADR-0002 — Platform capabilities are independent until proven otherwise

- **Status:** Accepted
- **Date:** 2026-05-25
- **Decision drivers:** Q3 of the 2026-05-25 grilling session on Candidate #1
- **Supersedes:** —
- **Related:** [ADR-0001 — Resolution algorithm: one spec, two adapters](0001-resolution-algorithm-one-spec-two-adapters.md)

## Context

Platform profiles (`skills/sk-platform-dispatch/profiles/{tier}.json`) describe per-tier capabilities as a flat list of boolean and enum fields: `skill_tool`, `task_primitive`, `worktrees`, `dynamic_subagents`, `model_field_format`, `effort_field_name`, and so on. Each capability is meant to be an independent atomic claim about what the platform can do.

In practice the v2.0 implementation conflated multiple capabilities into a single observation. The clearest example: the inline-resolution path in `running-a-pipeline` Phase 0.4 was authored on the assumption that *"if Skill tool is unavailable, preference files are also unavailable."* The shipped code reflects this — when `INLINE-DETECT` fires, the inline adapter substitutes empty prefs and emits an advisory that "user/workspace preference files will NOT be consulted."

These two capabilities are independent:

- **`skill_tool`** — whether the host exposes a tool that loads SKILL.md files (`Skill` on CC, `activate_skill` on Antigravity, etc.).
- **File-read capability** — whether the host exposes any tool that reads files from disk.

A host can lack one without lacking the other. Antigravity without the superpipelines plugin installed has no `activate_skill`, but it still has file reading. Coupling them produces a feature gap (prefs ignored unnecessarily) and a documentation lie (the advisory tells the user prefs were skipped even when reading would have worked).

The grilling session surfaced two such latent couplings (one for prefs ↔ skill tool, one for algorithm executability ↔ skill loadability). Both were treatable as the same architectural defect.

## Decision

Each capability declared in `platform_profile.capabilities` is treated as an **independent atomic claim**. Code that branches on one capability MUST NOT silently assume the value of another.

Operationally:

- When a capability gate fires, the code path consumes only that one capability. If the path needs another capability, it probes (or attempts and gracefully degrades) the second one independently.
- Inferring capability B from capability A is permitted only when the inference is *documented* either:
  - In the platform profile JSON as an explicit dependent flag (e.g. `skill_tool_requires_extension_installed: true`), or
  - In `sk-platform-dispatch/SKILL.md` with a citation to why the coupling holds for *all current and foreseeable* tiers.
- Adding a new capability flag to a profile may not retroactively introduce a coupling to an existing flag. If such a coupling exists, the algorithm or skill body must check both flags independently and behave correctly when only one is present.

The auditor gains a criterion that flags any prose stating *"if not-X then assume not-Y"* without a profile-level or skill-body-level justification.

## Consequences

**Positive:**

- Each platform's capability surface is honest. Profile fields mean what they say.
- New hosts with unusual capability combinations (file-read but no skill-load; skill-load but no worktree; etc.) get correct behavior without per-host special cases.
- Adapter authors can reason locally — "does my path need capability X?" — instead of having to know the historical pairing between X and Y.
- The latent bug pattern surfaced in the grilling session (inline resolver assuming prefs absence) becomes a class of bug the auditor catches.

**Negative:**

- Each capability check is one more `try` (with a small graceful-degradation arm) instead of one inferred-from-context branch. The cost is roughly three lines of LLM-prose per check.
- Some couplings are *actually* universal (e.g. "no Skill tool AND no file-read tool" → cannot resolve at all). This ADR does not forbid that combination from being a terminal failure — it forbids *silently assuming* the combination.

**Neutral:**

- `CONTEXT.md` now records this principle in the glossary entry for *Capability*. New contributors encounter it before reading skill bodies.

## How to revisit

This ADR should be reopened if a future platform genuinely has a hardware-level coupling between two capabilities that cannot be probed independently. To date no such coupling has been observed; all known couplings have been authoring shortcuts, not platform truths.

## References

- `skills/sk-platform-dispatch/SKILL.md` — `DETECT()` and capability fields
- `skills/sk-platform-dispatch/profiles/*.json` — capability surface per tier
- `skills/running-a-pipeline/SKILL.md` Phase 0.25 (skill-tool probe) and Phase 0.4 (resolution)
- `CONTEXT.md` — *Capability*
