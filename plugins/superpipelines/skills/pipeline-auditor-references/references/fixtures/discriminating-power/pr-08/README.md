# PR-08 Discriminating-Power Test

> Locks PR-08's regex to a known-bad baseline (`pre-baseline.md`, the pre-Q14 algorithm spec with the `agent.role` clause) and a known-good baseline (`post-baseline.md`, the post-Q14 unconditional Step 4). Any future edit to PR-08's regex in `compliance-matrix.md` must continue to discriminate between these two snapshots, or the criterion has lost its enforcement power.

## What this test asserts

The PR-08 criterion's regex, when executed against:

- `pre-baseline.md` → returns a violation count **≥ 1** (the pre-Q14 algorithm Step 4 referenced `agent.role`, a field not declared in `agent-frontmatter-schema.md`; PR-08 must catch it).
- `post-baseline.md` → returns a violation count **= 0** (the post-Q14 Step 4 is unconditional on `dynamic_subagents`; no `agent.role` reference; PR-08 must NOT trip).

If either condition fails, the criterion's regex is broken (false positive, false negative, or both).

## How to run

Read PR-08's `Detection` cell in `skills/pipeline-auditor-references/references/compliance-matrix.md`. Use the concrete v2.0.0 rule (`grep -nE "agent\.role[[:space:]]*(==|!=|<|>)"`). The regex matches *consultation* (comparison-operator use), not bare prose mentions in rationale comments.

```bash
# Pre-baseline (expected: violation count ≥ 1)
grep -nE "agent\.role[[:space:]]*(==|!=|<|>)" skills/pipeline-auditor-references/references/fixtures/discriminating-power/pr-08/pre-baseline.md

# Post-baseline (expected: violation count = 0)
grep -nE "agent\.role[[:space:]]*(==|!=|<|>)" skills/pipeline-auditor-references/references/fixtures/discriminating-power/pr-08/post-baseline.md
```

## How to refresh baselines

- **Pre-baseline:** never refresh. It is an immutable snapshot of `827ff4b:skills/sk-model-resolver/references/resolution-algorithm.md` Step 4 — the specific historical violation this criterion was authored to detect (Q14 grilling-session finding).
- **Post-baseline:** refresh when `resolution-algorithm.md` Step 4 changes in a way that ADR-0001 deems compliant. Re-run the test after refresh to confirm the regex still returns 0.

## Why this matters (rationale)

Pre-Q14, the algorithm consulted `agent.role` — a field that does not exist in the canonical agent frontmatter schema. Every agent had `agent.role == undefined`; `undefined != "orchestrator"` is always true; Step 4 fired for every agent on Tier 1c, *accidentally* producing the correct `host_inherit` output for the wrong reason. A future developer reading the algorithm could plausibly add `role: orchestrator` to an agent file, get no schema validation error, and silently break the implicit-coincidence semantics. PR-08 prevents this class of phantom-field landmine from recurring.
