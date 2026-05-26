# Cross-Platform Skill-Tool Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When `running-a-pipeline` executes on a platform without a skill-loading tool (or without the superpipelines plugin installed), it must detect this, emit an explicit advisory, and use inline fallbacks for Phases 0.25/0.4/0.45 — never silently skip them.

**Architecture:** Three-layer fix in `running-a-pipeline/SKILL.md`: (1) Phase 0.25 adds a skill-tool probe and inline DETECT() fallback with embedded minimal profiles; (2) Phase 0.4 adds an inline model-resolution path; (3) Phase 0.45 adds a HARD-STOP when migration is needed but the skill tool is absent. A Phase 1 filter excludes atomic-staging `edit-*` directories from the resume check. The AGY (Tier 1c) platform profile and `sk-platform-dispatch/SKILL.md` are updated to document the `activate_skill` tool name and plugin-installation requirement.

**Tech Stack:** Markdown skill bodies, JSON profile files. No code — all changes are to `.md` and `.json` files.

**Branch:** `feat/multi-platform-impl` (ships as part of v2.0.0)

---

## File Structure

| File | Change type | Responsibility |
|---|---|---|
| `skills/running-a-pipeline/SKILL.md` | Modify (lines 28–83, 124–127) | Inline fallback logic for Phases 0.25, 0.4, 0.45; Phase 1 filter |
| `skills/sk-platform-dispatch/SKILL.md` | Modify (after heuristics list) | AGY `activate_skill` mapping; installation note |
| `skills/sk-platform-dispatch/profiles/tier_1c.json` | Modify | Add `skill_tool_name`, `skill_tool_requires_extension_installed`, installation note |

No new files. Cache sync required after all three commits.

---

## Task 1: Phase 0.25 — skill-tool probe + INLINE-DETECT()

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` lines 28–38 (Phase 0.25 block)

- [ ] **Step 1: Read the current Phase 0.25 block**

```powershell
Get-Content "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" | Select-Object -Index (27..37)
```
Expected: lines starting with `### PHASE 0.25` through `- Emit all platform_profile.degradation_warnings`.

- [ ] **Step 2: Replace Phase 0.25 with the probe + inline-detect version**

Use Edit tool. Replace from `### PHASE 0.25: TIER DETECT & DISPATCH LOAD` through `- Emit all \`platform_profile.degradation_warnings\` if non-empty.` with:

```markdown
### PHASE 0.25: TIER DETECT & DISPATCH LOAD

**Step 1 — Skill-tool probe.** Identify the correct skill-loading tool:

| Tool present | Action |
|---|---|
| `Skill` tool (Claude Code / Tier 1) | `Skill(superpipelines:sk-platform-dispatch)` → `DETECT()` |
| `activate_skill` tool (Antigravity when plugin installed) | `activate_skill(sk-platform-dispatch)` → `DETECT()` |
| Neither / plugin not installed in this environment | Run INLINE-DETECT() — emit advisory first |

**Step 2 — Load or inline-detect:**

- **Skill tool available**: Load `sk-platform-dispatch`, call `DETECT()` → full `platform_profile`. Cache in session context. Proceed normally.
- **No skill tool available**: Emit the following advisory, then run INLINE-DETECT():

  > ⚠️ **PLATFORM ADVISORY:** No skill-load tool detected in this environment (superpipelines plugin may not be installed here). Running INLINE-DETECT() fallback. Phases 0.4 and 0.45 will use degraded inline algorithms — user/workspace preference files will NOT be consulted. If v1-legacy agents are found in Phase 0.45, migration CANNOT complete on this platform; re-run from Claude Code first.

  **INLINE-DETECT() heuristics** — first match wins:
  1. `CLAUDE_CODE` env var set OR `.claude-plugin/plugin.json` readable → `tier_id = tier_1`
  2. `OPENCODE_CONFIG_DIR` env var set → `tier_id = tier_1b`
  3. `agy` on PATH OR `.agents/skills/` present in workspace → `tier_id = tier_1c`
  4. `.codex-plugin/plugin.json` readable OR TOML agent files under `<workspace>/.agents/` → `tier_id = tier_1d`
  5. None matched → `tier_id = tier_2`

  Read `platform_profile` from the embedded snapshot below using `tier_id`:

  ```json
  {
    "tier_1":  {"tier":"tier_1",  "capabilities":{"dispatch_mechanism":"native_task","skill_tool":true,"task_primitive":true,"dynamic_subagents":false},"model_tiers":{"triage":{"model":"claude-haiku-4-5-20251001"},"fast":{"model":"claude-haiku-4-5-20251001"},"medium":{"model":"claude-sonnet-4-6"},"deep":{"model":"claude-opus-4-7"}},"degradation_warnings":[]},
    "tier_1b": {"tier":"tier_1b","capabilities":{"dispatch_mechanism":"native_subagent","skill_tool":true,"task_primitive":false,"dynamic_subagents":false},"model_tiers":{"triage":{"model":"opencode/small"},"fast":{"model":"opencode/small"},"medium":{"model":"opencode/medium"},"deep":{"model":"opencode/large"}},"degradation_warnings":[]},
    "tier_1c": {"tier":"tier_1c","capabilities":{"dispatch_mechanism":"model_driven","skill_tool":true,"skill_tool_name":"activate_skill","task_primitive":false,"dynamic_subagents":true,"model_field_format":"omit"},"model_tiers":{"triage":{"model":"gemini-3.5-flash"},"fast":{"model":"gemini-3.5-flash"},"medium":{"model":"gemini-3.5-pro"},"deep":{"model":"gemini-3.5-pro"}},"degradation_warnings":["Antigravity uses dynamic subagents — per-step model assignment not supported. Only the orchestrator model tier is user-configurable."]},
    "tier_1d": {"tier":"tier_1d","capabilities":{"dispatch_mechanism":"model_driven","skill_tool":false,"task_primitive":false,"dynamic_subagents":false},"model_tiers":{"triage":{"model":"codex-mini"},"fast":{"model":"codex-mini"},"medium":{"model":"o4-mini"},"deep":{"model":"o3"}},"degradation_warnings":[]},
    "tier_2":  {"tier":"tier_2", "capabilities":{"dispatch_mechanism":"inline","skill_tool":false,"task_primitive":false,"dynamic_subagents":false},"model_tiers":{"triage":{"model":"host_default"},"fast":{"model":"host_default"},"medium":{"model":"host_default"},"deep":{"model":"host_default"}},"degradation_warnings":["Tier 2 has no subagent primitive — all pipeline steps execute inline."]}
  }
  ```

  > **Note:** Inline snapshots are maintenance copies only. When the skill tool is available, always prefer the loaded profile — it reflects the authoritative `profiles/{tier_id}.json`.

<HARD-GATE>`platform_profile` MUST be non-null after Phase 0.25. INLINE-DETECT() defaults to `tier_2` if no heuristic matches — it NEVER returns null. Emitting the advisory is mandatory when using the inline path. NEVER proceed to Phase 0.4 without a resolved platform_profile.</HARD-GATE>

- <HARD-GATE>NEVER perform tier detection more than once per run outside of resume. On resume: re-run DETECT() (or INLINE-DETECT()), compare to `metadata.source_tier`, apply the Cross-Tier Resume Protocol from `sk-platform-dispatch` if tier changed.</HARD-GATE>
- **Fresh run**: Cache `platform_profile` in session context now. During Phase 2 state init, write to state file: `metadata.source_tier = platform_profile.tier`, `metadata.runtime_tier = platform_profile.tier`, `metadata.platform_profile = platform_profile`.
- **Resume run**: Apply Cross-Tier Resume Protocol (defined in `sk-platform-dispatch` § Cross-Tier Resume Protocol). If `runtime_tier` changed: update `metadata.runtime_tier`, `metadata.platform_profile`, append to `metadata.tier_changes`, emit cross-tier advisory.
- **Branch by `platform_profile.capabilities.dispatch_mechanism`** for Phase 3:
  - `native_task` → Phase 3 uses `Task()` dispatch (existing behavior).
  - `native_subagent` / `model_driven` → Phase 3 uses platform-native dispatch (see entry skill).
  - `inline` or unknown → Phase 3 uses Tier 2 Inline Loop from `sk-platform-dispatch`.
- Emit all `platform_profile.degradation_warnings` if non-empty.
```

- [ ] **Step 3: Count lines to verify under 500-line limit**

```powershell
(Get-Content "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md").Count
```
Expected: ≤ 500. If over, flag for scope reduction.

- [ ] **Step 4: Verify HARD-GATE text present**

```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "INLINE-DETECT\(\)" | Measure-Object | Select-Object -ExpandProperty Count
```
Expected: ≥ 4 matches (probe table, heuristics header, HARD-GATE, Phase 0.4 reference).

- [ ] **Step 5: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "fix(running-a-pipeline): Phase 0.25 skill-tool probe + INLINE-DETECT() fallback

When no skill-load tool is available (plugin not installed on current platform),
emit advisory and use inline tier-detection + embedded profile snapshots.
Resolves silent phase-skip observed on Antigravity CLI smoke test.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Phase 0.4 — inline model-resolution fallback

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` Phase 0.4 block (after the existing HARD-GATEs)

- [ ] **Step 1: Locate insertion point**

```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "Persist.*resolved_models.*preference_files" | Select-Object LineNumber
```
This finds the `Persist` bullet at end of Phase 0.4. Insert the inline-fallback block immediately after the last Phase 0.4 bullet and before the `<invariant>` tag.

- [ ] **Step 2: Insert inline fallback block**

Use Edit tool to insert after `- Persist \`metadata.resolved_models\`, \`metadata.preference_files_consulted\`, \`metadata.model_tiers_version_at_run\` to state file.`:

```markdown

**If INLINE-DETECT() was used (skill tool unavailable):**
- Skip `sk-model-resolver` load — tool not available in this environment.
- For each node in `topology.json` (iterate every node, same rule as full path):
  - Read `model_tier` from `topology.json` node entry (file is always local).
  - Resolve model: `resolved.model = platform_profile.model_tiers[node.model_tier].model`
  - Set `resolved.source = "profile_default"` (inline path cannot check preference files).
  - Set `resolved.warnings = []`.
  - Cache `resolved` to `state.metadata.resolved_models[step_id]`.
- Emit the resolution table in the identical format as the full path. Source column: `profile_default` for every row.
- Emit one aggregate advisory line: `"⚠️ [inline-resolution] User/workspace preference files not consulted. Re-run from a platform with Skill-tool support to apply preference overrides."`
- Persist `metadata.resolved_models` and `metadata.model_tiers_version_at_run` to state file.

<HARD-GATE>The resolution table MUST be emitted even in inline mode. NEVER skip the table or the state-file persistence step regardless of which path was taken. A missing table is a phase-skip defect.</HARD-GATE>
```

- [ ] **Step 3: Verify insertion**

```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "inline-resolution" | Select-Object LineNumber, Line
```
Expected: one match with the aggregate advisory line.

- [ ] **Step 4: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "fix(running-a-pipeline): Phase 0.4 inline model-resolution fallback

When INLINE-DETECT() was used, resolve model tiers directly from topology.json
using the inline profile snapshot. Table still emitted; source = profile_default.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Phase 0.45 — inline migration HALT

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` Phase 0.45 HARD-GATE block

- [ ] **Step 1: Locate the existing migration HARD-GATE text**

```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "MUST load.*sk-model-migration" | Select-Object LineNumber, Line
```

- [ ] **Step 2: Replace the single HARD-GATE with a branching version**

Use Edit tool to replace:

```markdown
  - <HARD-GATE>MUST load `sk-model-migration` via the `Skill` tool and execute the migration protocol. NEVER classify migration as "optional", "deferred", "informational", or "user discretion". The presence of a v1-legacy candidate is unambiguous evidence of schema drift that breaks dispatch metadata, audit reporting, and tier resolution provenance. The only legitimate skip path is the `plugin_version >= 2.0.0` classifier above.</HARD-GATE>
  - Pass the candidate list to `sk-model-migration`.
  - The migration protocol (creates git checkpoint + rewrites frontmatter + commits + stamps `plugin_version` to current) is non-interactive past the dirty-tree confirmation; do not insert additional prompts.
  - Re-run Phase 0.4 (resolution) against the migrated agents.
```

With:

```markdown
  - **If skill tool available**:
    <HARD-GATE>MUST load `sk-model-migration` via the Skill tool and execute the migration protocol. NEVER classify migration as "optional", "deferred", "informational", or "user discretion". The presence of a v1-legacy candidate is unambiguous evidence of schema drift that breaks dispatch metadata, audit reporting, and tier resolution provenance. The only legitimate skip path is the `plugin_version >= 2.0.0` classifier above.</HARD-GATE>
    - Pass the candidate list to `sk-model-migration`.
    - The migration protocol (creates git checkpoint + rewrites frontmatter + commits + stamps `plugin_version` to current) is non-interactive past the dirty-tree confirmation; do not insert additional prompts.
    - Re-run Phase 0.4 (resolution) against the migrated agents.
  - **If INLINE-DETECT() was used (skill tool unavailable)**:
    <HARD-GATE>MUST emit the following and STOP — do NOT proceed to Phase 0.5 or any later phase:
    `"❌ MIGRATION REQUIRED — CANNOT PROCEED: {N} v1-legacy agent(s) found in pipeline '{P}'. Migration requires sk-model-migration (Skill tool not available in this environment). Re-run /superpipelines:run-pipeline from Claude Code to complete migration before executing this pipeline on this platform."`
    Do NOT rationalize continuing with un-migrated agents. The resolver source, warnings, and state-file resolved_models[step_id] cannot be trusted while v1 schema is present.</HARD-GATE>
```

- [ ] **Step 3: Verify branching text present**

```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "MIGRATION REQUIRED" | Select-Object LineNumber
```
Expected: one match.

- [ ] **Step 4: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "fix(running-a-pipeline): Phase 0.45 HARD-STOP when migration needed but Skill tool absent

If INLINE-DETECT() was used and v1-legacy agents are found, emit MIGRATION REQUIRED
and halt. Previously the migration HARD-GATE only covered the Skill-tool path and had
no branch for platforms where sk-model-migration cannot be loaded.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Phase 1 — staging-dir filter

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` Phase 1 block (line ~124)

- [ ] **Step 1: Locate Phase 1 block**

```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "PHASE 1: RESUME CHECK" | Select-Object LineNumber
```

- [ ] **Step 2: Insert run-directory filter rule**

Use Edit tool to replace:

```markdown
### PHASE 1: RESUME CHECK
- Check for existing run directories in `{ROOT}/superpipelines/temp/{P}/`.
- **Logic**: If runs exist, prompt the user to start new or resume.
```

With:

```markdown
### PHASE 1: RESUME CHECK
- Check for existing run directories in `{ROOT}/superpipelines/temp/{P}/`.
- **Valid run directory criteria**: name matches `{P}-{YYYYMMDD-HHMMSS}` AND contains `pipeline-state.json`.
  - Directories whose names begin with `edit-` are atomic-staging artifacts from `adding-a-pipeline-step` / `deleting-a-pipeline-step` mutations — **EXCLUDE** them from the resume list.
  - Directories without `pipeline-state.json` are incomplete or foreign — **EXCLUDE** them.
- **Logic**: If valid runs exist, prompt the user to start new or resume.
```

- [ ] **Step 3: Verify**

```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "edit-.*EXCLUDE" | Select-Object LineNumber
```
Expected: one match.

- [ ] **Step 4: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "fix(running-a-pipeline): Phase 1 excludes edit-* staging dirs from resume list

atomic-staging dirs (edit-{ts}) from add-step/delete-step were being shown as
candidate runs — they contain no pipeline-state.json and are not run state.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: sk-platform-dispatch — AGY skill-tool mapping

**Files:**
- Modify: `skills/sk-platform-dispatch/SKILL.md` (after the Tier Detection Protocol heuristics list, before the `</protocol>` or invariant block)

- [ ] **Step 1: Read the heuristics list end**

```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\sk-platform-dispatch\SKILL.md" -Pattern "^5\. \*\*Tier 2" | Select-Object LineNumber
```
This finds heuristic #5. Insert the new section after the `After resolving tier_id: READ(...)` block and before `### Profile capability fields`.

- [ ] **Step 2: Insert AGY skill-tool mapping**

Use Edit tool to insert after `Return the full profile object. Caller caches it in \`pipeline-state.json\` as \`metadata.platform_profile\` and sets \`metadata.runtime_tier = profile.tier\`.`:

```markdown

### Platform-specific skill-load tool names

When calling skills from within a running-a-pipeline orchestration, use the correct tool name for the current platform:

| Tier | Skill-load tool | Note |
|---|---|---|
| Tier 1 (Claude Code) | `Skill` | `Skill(superpipelines:sk-platform-dispatch)` |
| Tier 1c (Antigravity CLI, plugin installed) | `activate_skill` | `activate_skill(sk-platform-dispatch)` |
| Tier 1b (OpenCode) | `skill` (lowercase) | OC tool naming convention |
| Tier 1d (Codex) / Tier 2 | N/A — no skill tool | Use `running-a-pipeline` INLINE-DETECT() fallback |

**Antigravity CLI (Tier 1c) — installation requirement:** The superpipelines plugin must be installed in AGY's extension registry for `activate_skill` to resolve it. If superpipelines is only installed in Claude Code, `activate_skill` will fail to resolve the skill even though `skill_tool: true` in the profile. In that case, `running-a-pipeline` Phase 0.25 INLINE-DETECT() handles the fallback automatically. This is expected behavior for cross-platform handoff scenarios where not all platforms share a unified plugin registry.
```

- [ ] **Step 3: Verify insertion**

```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\sk-platform-dispatch\SKILL.md" -Pattern "activate_skill" | Measure-Object | Select-Object -ExpandProperty Count
```
Expected: ≥ 2 matches (table row + body text).

- [ ] **Step 4: Commit**

```bash
git add skills/sk-platform-dispatch/SKILL.md
git commit -m "fix(sk-platform-dispatch): document AGY activate_skill tool name + installation note

Callers on Tier 1c must use activate_skill (not Skill). If plugin not installed
in AGY, running-a-pipeline INLINE-DETECT() fallback is the correct path.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: tier_1c.json — skill-tool clarification

**Files:**
- Modify: `skills/sk-platform-dispatch/profiles/tier_1c.json`

- [ ] **Step 1: Read current file**

```powershell
Get-Content "C:\Users\gmeil\Github\superpipelines\skills\sk-platform-dispatch\profiles\tier_1c.json"
```
Expected: JSON with `"skill_tool": true` in capabilities.

- [ ] **Step 2: Add skill_tool_name and extension note**

Use Edit tool to replace:

```json
    "skill_tool": true,
```

With:

```json
    "skill_tool": true,
    "skill_tool_name": "activate_skill",
    "skill_tool_requires_extension_installed": true,
```

Then replace the `"extensions"` block:

```json
  "extensions": {
    "default_orchestrator_model": "gemini-3.5-flash",
    "subagent_model_control": "orchestrator-only"
  },
```

With:

```json
  "extensions": {
    "default_orchestrator_model": "gemini-3.5-flash",
    "subagent_model_control": "orchestrator-only",
    "installation_note": "skill_tool is only available when the superpipelines AGY extension is installed in AGY's extension registry. Without it, running-a-pipeline Phase 0.25 falls back to INLINE-DETECT()."
  },
```

- [ ] **Step 3: Verify JSON is valid**

```powershell
$content = Get-Content "C:\Users\gmeil\Github\superpipelines\skills\sk-platform-dispatch\profiles\tier_1c.json" -Raw
try { $null = [System.Text.Json.JsonDocument]::Parse($content); Write-Host "JSON valid" } catch { Write-Host "INVALID: $_" }
```
Expected: `JSON valid`

- [ ] **Step 4: Commit**

```bash
git add skills/sk-platform-dispatch/profiles/tier_1c.json
git commit -m "fix(tier_1c): document skill_tool_name=activate_skill + installation requirement

skill_tool: true is correct only when superpipelines extension is installed in AGY.
Without it, running-a-pipeline INLINE-DETECT() is the expected fallback path.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Cache sync + verification

**Files:**
- Mirror: 3 modified files to CC plugin cache.

- [ ] **Step 1: Copy all 3 changed files to cache**

```powershell
$base_src = "C:\Users\gmeil\Github\superpipelines"
$base_dst = "C:\Users\gmeil\.claude\plugins\cache\superpipelines-marketplace\superpipelines\2.0.0"

$pairs = @(
    @{src="$base_src\skills\running-a-pipeline\SKILL.md";                       dst="$base_dst\skills\running-a-pipeline\SKILL.md"},
    @{src="$base_src\skills\sk-platform-dispatch\SKILL.md";                     dst="$base_dst\skills\sk-platform-dispatch\SKILL.md"},
    @{src="$base_src\skills\sk-platform-dispatch\profiles\tier_1c.json";        dst="$base_dst\skills\sk-platform-dispatch\profiles\tier_1c.json"}
)
foreach ($p in $pairs) {
    Copy-Item -Path $p.src -Destination $p.dst -Force
    $match = (Get-FileHash $p.src).Hash -eq (Get-FileHash $p.dst).Hash
    Write-Host "$(Split-Path $p.src -Leaf): match=$match"
}
```
Expected: 3 lines, each `match=True`.

- [ ] **Step 2: Verify no inline phase smell introduced**

```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "^### \d+\. "
```
Expected: zero matches (no inline `### N.` step numbering in the skill body).

- [ ] **Step 3: Verify INLINE-DETECT presence in final file**

```powershell
Select-String -Path "C:\Users\gmeil\Github\superpipelines\skills\running-a-pipeline\SKILL.md" -Pattern "INLINE-DETECT" | Measure-Object | Select-Object -ExpandProperty Count
```
Expected: ≥ 4 hits (probe table, heuristics block, Phase 0.4 reference, Phase 0.45 reference).

---

## Task 8: Smoke-test handoff

These changes are behavioral (runtime skill-body interpretation) and cannot be tested via grep alone. The test requires running the affected skill on a platform WITHOUT the Skill tool.

- [ ] **Step 1: CC test — verify Skill tool path still works**

Restart CC. In any workspace, run `/superpipelines:run-pipeline`. Confirm:
- No `PLATFORM ADVISORY` emitted (Skill tool IS available on CC)
- Phase 0.25 proceeds normally (DETECT() loads from profile JSON)
- Phase 0.4 resolution table uses correct sources (not all `profile_default`)

- [ ] **Step 2: AGY test — verify inline fallback fires**

In AGY workspace WITHOUT superpipelines extension installed, run `/superpipelines:running-a-pipeline`. Confirm:
- `⚠️ PLATFORM ADVISORY: No skill-load tool detected...` emitted before Phase 0.4
- Resolution table emitted with `profile_default` for all rows
- If no v1-legacy agents: proceeds to Phase 0.5 normally
- If v1-legacy agents present: emits `❌ MIGRATION REQUIRED — CANNOT PROCEED` and halts

- [ ] **Step 3: On PASS, update execution log**

Append to `docs/superpowers/plans/2026-05-24-cross-platform-model-resolver.execution.log`:

```markdown
## 2026-05-25 — Cross-platform fallback (plan 2026-05-25-cross-platform-skill-tool-fallback)

running-a-pipeline Phase 0.25: INLINE-DETECT() fallback added. Phase 0.4/0.45 inline paths added.
Phase 1 staging-dir filter added. sk-platform-dispatch AGY guidance added. tier_1c.json updated.

CC regression test: PASS|PENDING
AGY fallback test: PASS|PENDING
```

Commit:
```bash
git add docs/superpowers/plans/2026-05-24-cross-platform-model-resolver.execution.log
git commit -m "test(running-a-pipeline): record cross-platform fallback smoke test results"
```

---

## Self-Review

**Spec coverage:**
- Silent phase-skip on platforms without Skill tool → Tasks 1, 2, 3 ✓
- Phase 1 staging-dir misidentification → Task 4 ✓
- AGY `activate_skill` naming and plugin requirement → Tasks 5, 6 ✓
- Cache sync → Task 7 ✓
- Smoke test → Task 8 ✓

**Placeholder scan:** No TBD/TODO. Every Edit step shows exact old_string and new_string. Every PowerShell/bash step has expected output.

**Line-count check:** `running-a-pipeline/SKILL.md` starts at 197 lines. Tasks 1–4 add approximately 85 lines → ~282 lines total. Well under the 500-line authoring limit from CLAUDE.md.

**DEPENDENCY_INVERSION note:** Inline profile snapshots in Phase 0.25 duplicate content from `profiles/*.json`. This is a deliberate, documented exception for platforms where the profile files are unreachable. The snapshots are labeled "maintenance copies only" and the full profile load is always preferred when the Skill tool is available. This is not a SEV-2 drift violation — it is the fallback safety net.

**Type consistency:** `INLINE-DETECT()` used consistently across Tasks 1–4. `platform_profile` object shape identical between full path and inline path.

---

## Notes for Executor

- Tasks 1–4 all touch `skills/running-a-pipeline/SKILL.md` sequentially. Read the file fresh before each Edit to avoid stale-context errors.
- Tasks 5 and 6 are independent of Tasks 1–4 and can run after or in parallel with them.
- Task 7 (cache sync) must run after ALL five preceding tasks are committed.
- If Task 1 puts the skill over 500 lines: trim the inline profile JSON to one line per tier (already compact) or reduce commentary. Preserve all HARD-GATE text.
- The inline profile snapshots MUST be kept in sync with `profiles/*.json` when those profiles are updated. This is a new maintenance obligation — flag to the user.
