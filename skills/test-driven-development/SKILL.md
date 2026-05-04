---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---

# Test-Driven Development (TDD) — Quality Protocol

> Enforces a "test-first" implementation cycle to ensure code correctness, maintainability, and regression safety. Trigger when implementing any feature, bugfix, or architectural refactor before writing production code.

<overview>
TDD is governed by the Iron Law: **NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST**. By watching a test fail before implementing a solution, we prove that the test is valid and that the resulting code satisfies a specific, verified requirement rather than an assumed implementation.
</overview>

<glossary>
  <term name="Red Phase">The stage where a minimal, failing test is authored and verified to fail for the expected reason.</term>
  <term name="Green Phase">The stage where the minimal amount of code is written to satisfy the failing test.</term>
  <term name="Refactor Phase">The stage where code is cleaned and optimized while ensuring all tests remain green.</term>
</glossary>

## The TDD Cycle

<protocol>
### 1. RED — WRITE FAILING TEST
- Write a single, minimal test describing the desired behavior or bug reproduction.
- <invariant>Use real code and avoid mocks unless interacting with external, non-deterministic systems.</invariant>
- **Verify RED**: Run the test and confirm it fails. If it passes, the test is invalid or testing existing behavior.

### 2. GREEN — MINIMAL IMPLEMENTATION
- Write the **simplest possible code** to make the test pass.
- <invariant>Avoid adding unrequested features (YAGNI) or "while-I'm-here" refactors.</invariant>
- **Verify GREEN**: Run the test and confirm it passes alongside all existing tests.

### 3. REFACTOR — CLEAN UP
- Improve names, remove duplication, and extract helpers.
- Ensure the tests stay green throughout the refactoring process.
</protocol>

<EXTREMELY-IMPORTANT>
If you wrote production code before the test: **DELETE IT**. Start over from Step 1. Do not "adapt" existing code; the ritual of failure is what guarantees the validity of the test suite.
</EXTREMELY-IMPORTANT>

## Verification Checklist

<verification_checklist>
- [ ] Every new function/method has a corresponding test.
- [ ] Each test was observed failing before implementation began.
- [ ] Failure was due to missing logic, not typos or configuration errors.
- [ ] Minimal code was written to achieve a green state.
- [ ] No unrequested logic (over-build) was introduced.
- [ ] Output is pristine with no warnings or silent errors.
</verification_checklist>

## Red Flags — STOP
- "I'll write the tests after to verify it works." → **STOP**. Tests-after prove nothing; they only verify what was built, not what was required.
- "The test passed immediately." → **STOP**. Your test is invalid or you are testing logic that already exists.
- "Deleting this code is wasteful." → **STOP**. Sunk cost fallacy. Keeping unverified code is technical debt.
- "I manually tested it, so it's fine." → **STOP**. Manual testing is non-deterministic and non-reproducible.

## Rationalization Table

<rationalization_table>
| Excuse | Reality |
| :--- | :--- |
| "Too simple to test." | Simple code is the most frequent source of silent failures. Tests take seconds. |
| "Already manually tested." | Ad-hoc testing provides no record and cannot prevent future regressions. |
| "Keep as reference." | Keeping "reference" code leads to adapting it, which is just testing-after. Delete it. |
| "TDD slows me down." | TDD is faster than the inevitable debugging cycle caused by untested code. |
</rationalization_table>

## Reference Files
- `systematic-debugging/SKILL.md` — Root cause protocol.
- `verification-before-completion/SKILL.md` — Final verification gate.
- `sk-write-review-isolation/SKILL.md` — Review isolation rules.
- `testing-anti-patterns.md` — Common TDD pitfalls.
