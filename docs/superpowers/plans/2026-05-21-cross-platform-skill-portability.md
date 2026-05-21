# Cross-Platform Skill Portability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement platform profile system and cross-tier portability fixes across 6 skill files and 5 new JSON profiles so all five portability scenarios work with no gaps.

**Architecture:** A JSON capability profile per tier lives under `skills/sk-platform-dispatch/profiles/`. Skills read capabilities from the loaded profile rather than branching on tier enum strings, decoupling "what a platform can do" (monthly changes) from "how skills respond" (rarely changes). Cross-tier resume is enabled by splitting `metadata.tier` into immutable `source_tier` + mutable `runtime_tier`.

**Tech Stack:** Markdown skill files, JSON profile files. No build step. Verification is line-count checks, spec coverage review, and invariant confirmation.

**Spec:** `docs/superpowers/specs/2026-05-21-cross-platform-skill-portability-design.md`

---

## Task Dependency Order

Tasks 1, 2, 6 are independent — run in parallel.
Task 3 requires Task 1 complete.
Tasks 4 and 5 require Task 3 complete.

---

## Task 1: Create Platform Profile JSON Files

**Files:**
- Create: `skills/sk-platform-dispatch/profiles/tier_1.json`
- Create: `skills/sk-platform-dispatch/profiles/tier_1b.json`
- Create: `skills/sk-platform-dispatch/profiles/tier_1c.json`
- Create: `skills/sk-platform-dispatch/profiles/tier_1d.json`
- Create: `skills/sk-platform-dispatch/profiles/tier_2.json`

- [ ] **Step 1: Create profiles directory and tier_1.json**

```bash
mkdir -p /root/superpipelines/skills/sk-platform-dispatch/profiles
```

Write `skills/sk-platform-dispatch/profiles/tier_1.json`:
```json
{
  "tier": "tier_1",
  "name": "Claude Code",
  "profile_version": "1.0.0",
  "capabilities": {
    "subagents": true,
    "parallel_subagents": true,
    "task_primitive": true,
    "skill_tool": true,
    "worktrees": true,
    "reviewer_isolation": "structural",
    "dispatch_mechanism": "native_task"
  },
  "scope_root": {
    "workspace": ".claude",
    "user": "~/.claude"
  },
  "degradation_warnings": [],
  "extensions": {}
}
```

- [ ] **Step 2: Write tier_1b.json**

Write `skills/sk-platform-dispatch/profiles/tier_1b.json`:
```json
{
  "tier": "tier_1b",
  "name": "OpenCode",
  "profile_version": "1.0.0",
  "capabilities": {
    "subagents": true,
    "parallel_subagents": false,
    "task_primitive": false,
    "skill_tool": true,
    "worktrees": false,
    "reviewer_isolation": "structural",
    "dispatch_mechanism": "native_subagent"
  },
  "scope_root": {
    "workspace": ".opencode",
    "user": "~/.opencode"
  },
  "degradation_warnings": [
    "Parallel fan-out (Pattern 2) degrades to sequential on OpenCode."
  ],
  "extensions": {}
}
```

- [ ] **Step 3: Write tier_1c.json**

Write `skills/sk-platform-dispatch/profiles/tier_1c.json`:
```json
{
  "tier": "tier_1c",
  "name": "Antigravity",
  "profile_version": "1.0.0",
  "capabilities": {
    "subagents": true,
    "parallel_subagents": false,
    "task_primitive": false,
    "skill_tool": true,
    "worktrees": false,
    "reviewer_isolation": "unverified",
    "dispatch_mechanism": "inline"
  },
  "scope_root": {
    "workspace": ".agents",
    "user": "~/.gemini/antigravity"
  },
  "degradation_warnings": [
    "Antigravity Dynamic Subagent dispatch primitive unverified. Falling back to Tier 2 inline execution.",
    "Reviewer isolation is unverified. Treat reviews as advisory until confirmed structural."
  ],
  "extensions": {
    "aspirational": true,
    "verification_pending": ["dispatch_primitive", "reviewer_isolation"]
  }
}
```

- [ ] **Step 4: Write tier_1d.json**

Write `skills/sk-platform-dispatch/profiles/tier_1d.json`:
```json
{
  "tier": "tier_1d",
  "name": "Codex",
  "profile_version": "1.0.0",
  "capabilities": {
    "subagents": true,
    "parallel_subagents": true,
    "task_primitive": false,
    "skill_tool": false,
    "worktrees": false,
    "reviewer_isolation": "unverified",
    "dispatch_mechanism": "model_driven"
  },
  "scope_root": {
    "workspace": ".codex",
    "user": "~/.codex"
  },
  "degradation_warnings": [
    "Codex sandbox_mode per-agent tool restriction unverified. Reviewer isolation treated as advisory until confirmed."
  ],
  "extensions": {
    "max_concurrent_subagents": 6
  }
}
```

- [ ] **Step 5: Write tier_2.json**

Write `skills/sk-platform-dispatch/profiles/tier_2.json`:
```json
{
  "tier": "tier_2",
  "name": "Cursor / Windsurf / Cline",
  "profile_version": "1.0.0",
  "capabilities": {
    "subagents": false,
    "parallel_subagents": false,
    "task_primitive": false,
    "skill_tool": true,
    "worktrees": false,
    "reviewer_isolation": "convention",
    "dispatch_mechanism": "inline"
  },
  "scope_root": {
    "workspace": ".superpipelines",
    "user": "~/.superpipelines"
  },
  "degradation_warnings": [
    "Reviewer isolation is convention-only; reviews are advisory, not structurally enforced.",
    "Parallel fan-out (Pattern 2) degrades to sequential.",
    "Iterative pattern (Pattern 3) cycle limit still enforced inline."
  ],
  "extensions": {}
}
```

- [ ] **Step 6: Verify all 5 files are valid JSON**

```bash
for f in /root/superpipelines/skills/sk-platform-dispatch/profiles/*.json; do
  echo -n "$f: "
  python3 -c "import json,sys; json.load(open('$f')); print('OK')"
done
```

Expected: all 5 print `OK`.

- [ ] **Step 7: Commit**

```bash
git add skills/sk-platform-dispatch/profiles/
git commit -m "feat(platform): add tier capability profile JSON files"
```

---

## Task 2: Update sk-pipeline-state/SKILL.md — State Schema

**Files:**
- Modify: `skills/sk-pipeline-state/SKILL.md`

Current `metadata: {}` in the schema block must be replaced with the full new metadata schema. A backward compat invariant must be added.

- [ ] **Step 1: Read current file to locate edit points**

```bash
grep -n "metadata\|source_tier\|runtime_tier\|backward" /root/superpipelines/skills/sk-pipeline-state/SKILL.md
```

Expected: `metadata: {}` appears once in the schema block, no `source_tier` yet.

- [ ] **Step 2: Replace metadata block in schema**

Find this exact text in `skills/sk-pipeline-state/SKILL.md`:
```
  "metadata": {}
```

Replace with:
```
  "metadata": {
    "source_tier": "<tier_id — tier where pipeline was scaffolded; immutable after init>",
    "runtime_tier": "<tier_id — tier where current execution runs; re-detected on every resume>",
    "platform_profile": "<full profile object snapshot — updated when runtime_tier changes>",
    "tier_changes": [
      { "from": "<tier_id>", "to": "<tier_id>", "at": "<iso8601>" }
    ],
    "source_scope_root": "<original workspace scope root directory name, e.g. .claude>",
    "isolation_warning": "<joined degradation_warnings from active profile; null if none>"
  }
```

- [ ] **Step 3: Add backward compat invariant**

Find this text in the `<invariants>` block:
```
- **Version Stamping**: `plugin_version` MUST be set at state initialization
```

Insert BEFORE that line:
```
- **Backward Compatibility**: Pre-v2.0.0 state files carry `metadata.tier` (single field). On resume of an old state file: treat `metadata.tier` as `source_tier` when `metadata.source_tier` is absent; set `runtime_tier` to the re-detected current tier. New state writes MUST use `source_tier` and `runtime_tier`; never write `metadata.tier` in new state.
```

- [ ] **Step 4: Add tier_changes and platform_profile to glossary**

Find the closing `</glossary>` tag and insert before it:
```
  <term name="source_tier">The execution tier where the pipeline was scaffolded. Set once at run init; never updated.</term>
  <term name="runtime_tier">The execution tier of the current or most-recent run. Re-detected on every resume; updated on cross-tier resume.</term>
  <term name="tier_changes">Append-only audit log of every cross-tier resume event. Never overwritten.</term>
```

- [ ] **Step 5: Verify line count ≤ 500**

```bash
wc -l /root/superpipelines/skills/sk-pipeline-state/SKILL.md
```

Expected: output ≤ 500.

- [ ] **Step 6: Commit**

```bash
git add skills/sk-pipeline-state/SKILL.md
git commit -m "feat(state): add source_tier, runtime_tier, tier_changes to pipeline-state schema"
```

---

## Task 3: Update sk-platform-dispatch/SKILL.md — Profile-Driven DETECT/DISPATCH

**Files:**
- Modify: `skills/sk-platform-dispatch/SKILL.md`

This is the largest single edit. Three sections change: DETECT(), DISPATCH contract, and degradation surfacing. The cross-tier resume protocol (Phase 0.25 update) is documented here as the canonical protocol — `running-a-pipeline` references it.

- [ ] **Step 1: Read current file to understand structure**

```bash
grep -n "^##\|^###\|DETECT\|DISPATCH\|degradation\|resume\|metadata\.tier" /root/superpipelines/skills/sk-platform-dispatch/SKILL.md
```

Note the line numbers of: `## Tier Detection Protocol`, `## DISPATCH Contract`, `## Tier 2 Degradation Surfacing`.

- [ ] **Step 2: Replace Tier Detection Protocol section**

Find the entire `## Tier Detection Protocol` section (from `## Tier Detection Protocol` through the closing `</protocol>` tag before `## DISPATCH Contract`).

Replace with:
```markdown
## Tier Detection Protocol

<protocol>
DETECT() returns a platform profile object (not a raw tier string).

Detection heuristics run in order — first match wins:

1. **Tier 1 (Claude Code):** `Task` tool present AND `subagent_type` parameter accepted. Secondary: `CLAUDE_CODE` env var set OR `.claude-plugin/plugin.json` resolvable via `${CLAUDE_PLUGIN_ROOT}`.
2. **Tier 1b (OpenCode):** `$OPENCODE_PLUGIN_ROOT` env var set OR agent files using `mode: subagent` frontmatter present under the active scope root.
3. **Tier 1c (Antigravity):** `agy` binary on PATH OR `.agents/skills/` workspace directory present.
4. **Tier 1d (Codex):** `.codex-plugin/plugin.json` resolvable OR TOML agent files present under `${CODEX_PLUGIN_ROOT}/agents/`.
5. **Tier 2 (fallback):** None of the above. Safe default — sequential inline execution always works.

After resolving `tier_id`:

```
READ(skills/sk-platform-dispatch/profiles/{tier_id}.json) → profile object
```

Return the full profile object. Caller caches it in `pipeline-state.json` as `metadata.platform_profile` and sets `metadata.runtime_tier = profile.tier`.
</protocol>

<invariant>
Tier detection is performed exactly once per orchestrator invocation. On resume: re-run DETECT() to get `runtime_tier`; compare to `metadata.source_tier`; if different, append to `metadata.tier_changes` and emit cross-tier resume advisory. Re-detection mid-run (outside resume) is forbidden.
</invariant>
```

- [ ] **Step 3: Replace DISPATCH Contract section**

Find the `## DISPATCH Contract` section through its closing `</schema>` tag.

Replace with:
```markdown
## DISPATCH Contract

<schema>
Inputs to DISPATCH(step, inputs, profile):
- `step.id`             — string, topology node id
- `step.agent`          — string, agent name (used by Tier 1 / 1b / 1d)
- `step.protocol_skill` — string, the `{agent-name}-protocol` skill name (used by Tier 2 and inline)
- `step.output_paths`   — array of absolute paths the step is expected to produce
- `inputs`              — object, key/value inputs resolved from upstream step outputs
- `profile`             — platform profile object from DETECT()

Returns:
- `{ status: "DONE" | "DONE_WITH_CONCERNS" | "NEEDS_CONTEXT" | "BLOCKED", outputs: [path...], concerns?: string, missing_context?: string, blocker?: string }`
</schema>
```

- [ ] **Step 4: Replace Tier-Specific DISPATCH Behavior section**

Find the `## Tier-Specific DISPATCH Behavior` section and its `<dispatch_tiers>` table through the closing `</dispatch_tiers>` tag.

Replace with:
```markdown
## Tier-Specific DISPATCH Behavior

Skills branch on `profile.capabilities` flags — NOT on `profile.tier` string. This ensures unknown future platforms with familiar capabilities route correctly without skill edits.

```
mechanism = profile.capabilities.dispatch_mechanism
SWITCH mechanism:
  "native_task"     → Task(subagent_type=step.agent, prompt=build_prompt(step, inputs))
  "native_subagent" → OC native mode:subagent dispatch via step.agent file
  "model_driven"    → Emit orchestration prompt; Codex model fans out per topology.json
  "inline"          → Tier 2 inline loop (see Tier 2 Inline Loop below)
  DEFAULT (unknown) → fallback to "inline" + emit:
                      "⚠️ Unknown dispatch_mechanism '{mechanism}'. Falling back to inline execution."
```

<dispatch_tiers>
| `dispatch_mechanism` | Reviewer isolation source | Notes |
|---|---|---|
| `native_task` | `profile.capabilities.reviewer_isolation` = `structural` | Agent `tools:` frontmatter restricts reviewer |
| `native_subagent` | `structural` | OC `permission: { edit: deny }` on reviewer agent |
| `model_driven` | `unverified` | Codex `sandbox_mode` per-agent unverified — treat as advisory |
| `inline` | `convention` or `unverified` | Orchestrator runs both writer and reviewer protocols |
</dispatch_tiers>
```

- [ ] **Step 5: Replace Tier 2 Degradation Surfacing section**

Find `## Tier 2 Degradation Surfacing` through its end (before `## Worktree Behavior`).

Replace with:
```markdown
## Degradation Surfacing (Profile-Driven)

Degradation warnings are owned by the profile — not hardcoded in skills. When a profile has non-empty `degradation_warnings`:

```
warnings = profile.degradation_warnings
IF warnings is non-empty:
  1. Emit each warning at run START with "⚠️" prefix (running-a-pipeline Phase 0.25)
  2. Emit each warning at run END in entry skill completion summary
  3. Write join(warnings, "\n") to pipeline-state.json as metadata.isolation_warning
```

Adding or changing a degradation message for any platform requires editing only that tier's JSON profile. No skill edits required.
```

- [ ] **Step 6: Add Cross-Tier Resume Protocol section**

Find `## Status Protocol Reference` and insert BEFORE it:

```markdown
## Cross-Tier Resume Protocol

Invoked by `running-a-pipeline` Phase 0.25 when resuming an existing run:

```
new_profile = DETECT()
new_tier    = new_profile.tier
prev_tier   = metadata.runtime_tier ?? metadata.tier  // backward compat

IF new_tier != prev_tier:
  append { from: prev_tier, to: new_tier, at: iso8601_now() }
          to metadata.tier_changes (atomic write)
  metadata.runtime_tier    = new_tier
  metadata.platform_profile = new_profile
  metadata.isolation_warning = join(new_profile.degradation_warnings)
  emit: "⚠️ Cross-tier resume: scaffolded on {metadata.source_tier},
         now running on {new_tier}.
         Dispatch adapts to {new_tier} capabilities."
  emit each new_profile.degradation_warning

ELSE:
  proceed silently (no tier change, no log entry)
```

`metadata.source_tier` is NEVER updated on resume. It records where the pipeline was originally scaffolded, permanently.

```

- [ ] **Step 7: Update invariants to remove hardcoded tier references**

Find in the `<invariants>` block at the bottom:
```
- NEVER call `Task()` on Tier 2 — the tool is absent and the call will fail or be ignored.
- NEVER suppress the Tier 2 reviewer-isolation degradation warning; surface it in every user-facing summary.
```

Replace with:
```
- NEVER call `Task()` when `profile.capabilities.task_primitive` is false — the tool is absent and the call will fail or be ignored.
- NEVER suppress degradation warnings from `profile.degradation_warnings`; surface in every user-facing summary and write to `metadata.isolation_warning`.
```

- [ ] **Step 8: Update Red Flags to use capability flags**

Find:
```
- "I'll skip tier detection since I know this is Claude Code." → **STOP**. Detection is cheap; explicit caching enables resume from any tier-aware checkpoint.
```

Replace with:
```
- "I'll skip tier detection since I know this is Claude Code." → **STOP**. Detection is cheap; profile caching enables resume, portability validation, and cross-tier advisory from any checkpoint.
- "I'll branch on `metadata.tier == 'tier_2'` instead of reading the profile." → **STOP**. Tier string branching breaks when new platforms arrive. Always branch on `profile.capabilities` flags.
```

- [ ] **Step 9: Verify line count ≤ 500**

```bash
wc -l /root/superpipelines/skills/sk-platform-dispatch/SKILL.md
```

Expected: ≤ 500.

- [ ] **Step 10: Commit**

```bash
git add skills/sk-platform-dispatch/SKILL.md
git commit -m "feat(dispatch): profile-driven DETECT/DISPATCH and cross-tier resume protocol"
```

---

## Task 4: Update creating-a-pipeline/SKILL.md — Tier-Aware Routing

**Files:**
- Modify: `skills/creating-a-pipeline/SKILL.md`

Two changes: (1) insert new Phase 0 tier detect before git preflight; (2) update Phase 4 architect/auditor dispatch to be profile-driven; (3) add source_tier stamp to Phase 6.

- [ ] **Step 1: Insert new Phase 0 (Tier Detect) before existing Phase 0**

In `skills/creating-a-pipeline/SKILL.md`, find the start of the `<protocol>` block:
```
### PHASE 0: GIT PREFLIGHT
```

Insert BEFORE that line:
```markdown
### PHASE 0: TIER DETECT
- Load `sk-platform-dispatch` via the `Skill` tool → call `DETECT()` → receive `platform_profile` object.
- Cache `platform_profile` in session context (no state file exists yet during creation).
- IF `platform_profile.degradation_warnings` is non-empty: emit each warning with "⚠️" prefix before proceeding.
- Store `platform_profile` for use in Phase 4 dispatch branching.

```

Then rename the existing `### PHASE 0: GIT PREFLIGHT` to `### PHASE 0b: GIT PREFLIGHT` so ordering is clear.

- [ ] **Step 2: Update Phase 4 to use profile-driven dispatch**

Find in Phase 4:
```
- **Dispatch Architect**: Generate `spec.md`, `plan.md`, `tasks.md`, `topology.json`, and all step-specific agents/skills.
```

Replace the two dispatch lines (Architect and Auditor) with:
```markdown
- **Dispatch Architect** (profile-driven):
  - `dispatch_mechanism == "native_task"` → `Task(pipeline-architect, ...)`
  - `dispatch_mechanism == "native_subagent"` → OC native `mode: subagent` dispatch
  - `dispatch_mechanism == "model_driven"` → model-driven orchestration prompt
  - `dispatch_mechanism == "inline"` OR unknown → `Skill(pipeline-architect-protocol)` then execute inline using own `Read`/`Write`/`Edit`/`Bash` tools
- **Dispatch Auditor** (same profile-driven branching as Architect above).
```

- [ ] **Step 3: Add source_tier stamp to Phase 6**

Find in Phase 6:
```
  8. Updated `<scope-root>/superpipelines/registry.json` (with `plugin_version` stamped)
```

Replace with:
```
  8. Updated `<scope-root>/superpipelines/registry.json` (with `plugin_version` AND `source_tier` stamped — `source_tier` = `platform_profile.tier` from Phase 0)
```

Also find:
```
  4. `<scope-root>/superpipelines/pipelines/{P}/topology.json` (with `plugin_version` stamped)
```

Replace with:
```
  4. `<scope-root>/superpipelines/pipelines/{P}/topology.json` (with `plugin_version` AND `source_tier` stamped)
```

- [ ] **Step 4: Add invariant for profile-driven dispatch**

Find the `<invariants>` block and add:
```
- NEVER use `Task()` directly in Phase 4 without checking `platform_profile.capabilities.task_primitive`; use profile-driven dispatch branching.
```

- [ ] **Step 5: Verify line count ≤ 500**

```bash
wc -l /root/superpipelines/skills/creating-a-pipeline/SKILL.md
```

Expected: ≤ 500.

- [ ] **Step 6: Commit**

```bash
git add skills/creating-a-pipeline/SKILL.md
git commit -m "feat(creating): add Tier Detect phase and profile-driven architect/auditor dispatch"
```

---

## Task 5: Update running-a-pipeline/SKILL.md — Cross-Tier Resume + Phase 0.6

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md`

Two changes: (1) update Phase 0.25 to use cross-tier resume protocol from `sk-platform-dispatch`; (2) insert new Phase 0.6 portability validator between Phase 0.5 and Phase 1.

- [ ] **Step 1: Replace Phase 0.25 content**

Find the full `### PHASE 0.25: TIER DETECT & DISPATCH LOAD` section through its closing `</HARD-GATE>`.

Replace with:
```markdown
### PHASE 0.25: TIER DETECT & DISPATCH LOAD
- Load `sk-platform-dispatch` via the `Skill` tool.
- Call `DETECT()` → receive `platform_profile` object.
- <HARD-GATE>NEVER perform tier detection more than once per run outside of resume. On resume: re-run DETECT(), compare to `metadata.source_tier`, apply the Cross-Tier Resume Protocol from `sk-platform-dispatch` if tier changed.</HARD-GATE>
- **Fresh run**: Set `metadata.source_tier = platform_profile.tier`, `metadata.runtime_tier = platform_profile.tier`, `metadata.platform_profile = platform_profile` during Phase 2 state init.
- **Resume run**: Apply Cross-Tier Resume Protocol (defined in `sk-platform-dispatch` § Cross-Tier Resume Protocol). If `runtime_tier` changed: update `metadata.runtime_tier`, `metadata.platform_profile`, append to `metadata.tier_changes`, emit cross-tier advisory.
- **Branch by `platform_profile.capabilities.dispatch_mechanism`** for Phase 3:
  - `native_task` → Phase 3 uses `Task()` dispatch (existing behavior).
  - `native_subagent` / `model_driven` → Phase 3 uses platform-native dispatch (see entry skill).
  - `inline` or unknown → Phase 3 uses Tier 2 Inline Loop from `sk-platform-dispatch`.
- Emit all `platform_profile.degradation_warnings` if non-empty.
```

- [ ] **Step 2: Insert Phase 0.6 between Phase 0.5 and Phase 1**

Find:
```
### PHASE 1: RESUME CHECK
```

Insert BEFORE it:
```markdown
### PHASE 0.6: PORTABILITY VALIDATION
- IF `metadata.runtime_tier == metadata.source_tier`: skip silently.
- ELSE:
  - `source_root` = `profile[source_tier].scope_root.workspace` (read from the source tier's profile JSON)
  - `target_root` = `platform_profile.scope_root.workspace`
  - Scan entry skill content for occurrences of `source_root + "/"` string.
  - IF found:
    - Emit: `"⚠️ Portability defect: entry skill contains '{source_root}/' path(s) that will not resolve on {runtime_tier} ({target_root}/). Options: [Abort] [Auto-rewrite in memory] [Proceed as advisory]"`
    - **Auto-rewrite**: Replace `source_root + "/"` with `target_root + "/"` in entry skill content in-memory only. Do NOT write to disk unless user explicitly requests. Preserves original file for audit.
    - **Abort**: Stop. User must regenerate entry skill with v2.0.0 architect.
    - **Proceed as advisory**: Continue with a note in `metadata.isolation_warning`.
  - IF not found: proceed silently.

```

- [ ] **Step 3: Update invariants**

Find:
```
- ALWAYS perform Phase 0.25 tier detection exactly once per run; cached `metadata.tier` is the source of truth for resume.
```

Replace with:
```
- ALWAYS perform Phase 0.25 tier detection exactly once per fresh run; on resume, re-detect and apply Cross-Tier Resume Protocol if tier changed.
- ALWAYS perform Phase 0.6 portability validation when `runtime_tier != source_tier`; never silently proceed with unvalidated cross-tier paths.
- `metadata.source_tier` is immutable after Phase 2 init. Never overwrite it, even on cross-tier resume.
```

- [ ] **Step 4: Verify line count ≤ 500**

```bash
wc -l /root/superpipelines/skills/running-a-pipeline/SKILL.md
```

Expected: ≤ 500.

- [ ] **Step 5: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "feat(running): cross-tier resume protocol and Phase 0.6 portability validator"
```

---

## Task 6: Update pipeline-auditor-protocol + Compliance Matrix — PORTABILITY SEV-1

**Files:**
- Modify: `skills/pipeline-auditor-protocol/SKILL.md`
- Modify: `skills/pipeline-auditor-references/references/compliance-matrix.md`

- [ ] **Step 1: Add PORTABILITY CHECK to compliance matrix**

In `skills/pipeline-auditor-references/references/compliance-matrix.md`, find the `## 4. Runtime safety` section heading and its table.

The table currently ends at criterion 21. Add criterion 22 to the table:

```
| 22 | No hardcoded scope-root paths (PORTABILITY) | Entry skill, all step agents, all protocol skills, and topology.json contain no hardcoded scope-root directory names (`.claude/`, `.opencode/`, `.codex/`, `.agents/`, `.superpipelines/`) outside of comments that explicitly document `PORTABILITY_REWRITE`. Paths must use `{ROOT}` template variable resolved via `sk-pipeline-paths`. — **SEV-1** |
```

Also update the Table of Contents entry for section 4:
Find:
```
4. Runtime safety (criteria 17–20)
```
Replace with:
```
4. Runtime safety (criteria 17–22)
```

And update the "How to use" step 1 reference:
Find:
```
2. Walk criteria 1–21 (including 10a) in order.
```
Replace with:
```
2. Walk criteria 1–22 (including 10a) in order.
```

- [ ] **Step 2: Add PORTABILITY CHECK to pipeline-auditor-protocol**

In `skills/pipeline-auditor-protocol/SKILL.md`, find:
```
### 2. AUDIT
- **Compliance Matrix**: Execute the 20-criterion check in `references/compliance-matrix.md`.
```

Replace with:
```
### 2. AUDIT
- **Compliance Matrix**: Execute the 22-criterion check in `references/compliance-matrix.md` (criteria 1–22, including 10a and new criterion 22 PORTABILITY CHECK).
```

Also in the `<invariants>` block, add:
```
- Criterion 22 (PORTABILITY CHECK) applies in FULL and DELTA modes. In DELTA mode, scan only changed files and the entry skill (entry skill is always in scope for portability checks regardless of delta scope).
```

- [ ] **Step 3: Verify compliance matrix line count**

```bash
wc -l /root/superpipelines/skills/pipeline-auditor-references/references/compliance-matrix.md
```

Expected: ≤ 500.

- [ ] **Step 4: Commit**

```bash
git add skills/pipeline-auditor-protocol/SKILL.md \
        skills/pipeline-auditor-references/references/compliance-matrix.md
git commit -m "feat(auditor): add criterion 22 PORTABILITY CHECK SEV-1 for hardcoded scope-root paths"
```

---

## Final Verification

- [ ] **Verify spec coverage**

Check each acceptance criterion from the spec:

```bash
# All 5 profile files exist
ls /root/superpipelines/skills/sk-platform-dispatch/profiles/

# State schema updated
grep -n "source_tier\|runtime_tier\|tier_changes" /root/superpipelines/skills/sk-pipeline-state/SKILL.md

# Dispatch is profile-driven (no tier string branches)
grep -n "tier_2\|tier_1b\|tier_1c\|tier_1d" /root/superpipelines/skills/sk-platform-dispatch/SKILL.md
# Expected: only in detection heuristics and profile load path — NOT in dispatch branching

# creating-a-pipeline has Phase 0 tier detect
grep -n "PHASE 0: TIER DETECT\|PHASE 0b:" /root/superpipelines/skills/creating-a-pipeline/SKILL.md

# running-a-pipeline has Phase 0.6
grep -n "PHASE 0.6" /root/superpipelines/skills/running-a-pipeline/SKILL.md

# Compliance matrix has criterion 22
grep -n "22\|PORTABILITY" /root/superpipelines/skills/pipeline-auditor-references/references/compliance-matrix.md
```

- [ ] **Line count check on all modified skills**

```bash
wc -l \
  /root/superpipelines/skills/sk-platform-dispatch/SKILL.md \
  /root/superpipelines/skills/sk-pipeline-state/SKILL.md \
  /root/superpipelines/skills/running-a-pipeline/SKILL.md \
  /root/superpipelines/skills/creating-a-pipeline/SKILL.md \
  /root/superpipelines/skills/pipeline-auditor-protocol/SKILL.md
```

Expected: each ≤ 500 lines.

- [ ] **No tier string branching in dispatch**

```bash
grep -n "== ['\"]tier_" /root/superpipelines/skills/sk-platform-dispatch/SKILL.md
```

Expected: zero matches in DISPATCH section. Any matches should only be in DETECT() detection heuristics or profile load, not in dispatch branching logic.

- [ ] **Commit final verification**

```bash
git log --oneline -8
```

Expected: 6 commits from this plan visible (Tasks 1–6).
