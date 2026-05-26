# Fixture PR-04 — VIOLATION: inline adapter skips LOAD_PREFS when Skill tool absent

**Expected finding:** SEV-1 — the inline adapter (Phase 0.4) does not attempt
`LOAD_PREFS` independently of the Skill-tool probe result.

**Severity rationale:** SEV-1 (not SEV-2) because this silently produces incorrect
output on production tiers: Tier 1c (Antigravity without plugin) and Tier 2
(Cursor/Windsurf/Cline) both have file-read capability but no Skill tool. Skipping
LOAD_PREFS means workspace and user model preferences are silently ignored, causing
wrong model selection in production without any error surfaced to the user.

---

## Simulated bad running-a-pipeline/SKILL.md Phase 0.4 inline block

```markdown
### Phase 0.4 — Model Resolution (INLINE path)

INLINE-DETECT() fired: Skill tool unavailable. Proceeding with inline resolution.

NOTE: User and workspace preference files will NOT be consulted (Skill tool absent).

For each agent in topology:
  - If agent frontmatter has explicit `model:`, use it (source: frontmatter_override).
  - Otherwise, use profile.model_tiers[agent.model_tier].model (source: profile_default).
```

**Violations:**
1. The inline block explicitly states prefs will not be consulted — this is the
   capability-coupling anti-pattern from ADR-0002: it infers `prefs_unavailable`
   from `skill_tool_unavailable`, which is false for Tier 1c and Tier 2.
2. The inline block skips branches 4 (`dynamic_subagents`) and 5 (`model_field_format:
   omit`) — the latent bug identified in ADR-0001.
3. No `LOAD_PREFS` call present.

---

## Compliant pattern (for remediation reference)

```markdown
### Phase 0.4 — Model Resolution (INLINE path)

# Algorithm: skills/sk-model-resolver/references/resolution-algorithm.md (normative source)

INLINE-DETECT() fired: Skill tool unavailable. Executing algorithm inline.

LOAD_PREFS(workspace_root):
  Attempt to read workspace pref file. Attempt to read user pref file.
  If either read fails, degrade that source to {platforms: {}}.
  prefs = { user: <result or empty>, workspace: <result or empty> }

Execute all algorithm branches with the loaded prefs.
Call RENDER_RESOLUTION_TABLE(resolved[]) and print verbatim.
```

---

## Detection

Extract the Phase 0.4 *Inline Path* block and count `LOAD_PREFS(` invocations
(opening paren required — invocation syntax, not the bare identifier):

```bash
sed -n '/\*\*Inline Path/,/<HARD-GATE>/p' \
  skills/running-a-pipeline/SKILL.md | grep -c "LOAD_PREFS("
```

Result `0` = SEV-1 PR-04 violation: the inline adapter never invokes LOAD_PREFS,
silently dropping user/workspace preferences on Tier 1c and Tier 2 hosts.

**Bare-name mentions elsewhere in the file** (public API summaries, Red Flag prose,
Rationalization Table) do NOT satisfy this criterion. Invocation syntax with an
opening paren is required, inside the inline-path block range.

## Discriminating-power test

This fixture is paired with snapshots under `fixtures/discriminating-power/pr-04/`:
- `pre-baseline.md` (from `39dd0e6`) → the scoped grep returns **0** — the criterion fires SEV-1.
- `post-baseline.md` (post-S2) → the scoped grep returns **≥ 1** — the criterion is silent.

The whole-file naive grep returns ≥1 against **both** baselines (the pre-refactor
file had one LOAD_PREFS mention outside the inline block), which is why the
scope-extraction step is load-bearing. Any future edit to PR-04's regex that
drops the scope extraction will silently re-introduce the SEV-1 false negative.
