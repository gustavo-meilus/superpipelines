# Multi-Platform Sub-Plan 1 — OC→CC Backports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backport four OpenCode innovations (model preference per step, `{P}.md` run command, version compatibility advisory, mandatory `plugin_version` in `pipeline-state.json`) into Claude Code's `creating-a-pipeline`, `running-a-pipeline`, `sk-pipeline-paths`, and `sk-pipeline-state` skills.

**Architecture:** Documentation-only changes to existing skill `SKILL.md` files. No new files except a sub-plan SYNC tracking entry. Each backport is an additive edit to a specific phase or schema section, gated by an explicit invariant and a grep-verifiable string.

**Tech Stack:** Markdown skill files (frontmatter + body), JSON schema in skill bodies, no runtime code.

---

## File Structure

**Modify:**
- `skills/creating-a-pipeline/SKILL.md` — Add model-preference question to Phase 2; add `{P}.md` run command to Phase 6 hard-gate list.
- `skills/running-a-pipeline/SKILL.md` — Add Phase 0.5 (version compatibility advisory) before Phase 1.
- `skills/sk-pipeline-paths/SKILL.md` — Add `Run Command` row to Path Templates table.
- `skills/sk-pipeline-state/SKILL.md` — Add `plugin_version` field to schema; make it a required init invariant.

**Create:**
- `docs/SYNC.md` — Cross-repo sync tracker (initial entry: backport batch 1 from superpipelines-opencode v1.0.0 → superpipelines v2.0.0).

**Unchanged:** All agent files, all other skills, all commands, all hooks.

---

## Conventions for this plan

- Verification uses `grep -F` against modified files; the expected output is the inserted literal line.
- All commits use Conventional Commits prefixed `feat(backport):` or `docs(sync):`.
- Each task is a single logical change with one commit.

---

## Task 1: Add model preference question to creating-a-pipeline Phase 2

**Files:**
- Modify: `skills/creating-a-pipeline/SKILL.md` (Phase 2 block around lines 30-33)

- [ ] **Step 1: Read the current Phase 2 block**

Run: `sed -n '30,35p' skills/creating-a-pipeline/SKILL.md`
Expected: lines starting with `### PHASE 2: BRIEF REFINEMENT (4D)` followed by the 4D bullet and the HARD-GATE for missing slots.

- [ ] **Step 2: Insert model-preference bullet between 4D apply and acknowledge-format bullets**

Use Edit with `old_string`:

```
### PHASE 2: BRIEF REFINEMENT (4D)
- Apply the 4D Method to deconstruct core intent and constraints.
- Acknowledge if the user requested a specific output format. If not specified, deduce an appropriate format based on the pipeline's goal (e.g., markdown files, code snippets, code files).
```

`new_string`:

```
### PHASE 2: BRIEF REFINEMENT (4D)
- Apply the 4D Method to deconstruct core intent and constraints.
- **Model preference per step**: For each topology step the architect will generate in Phase 4, ask the user to choose a model tier — `deep` (planning/architecture/review steps; resolves to `claude-opus-4-7`) or `fast` (execution/utility steps; resolves to `claude-sonnet-4-6`). Record the user's mapping in Phase 2 output (`{step_id: tier}`); the architect MUST embed the resolved model string in each generated agent's frontmatter `model:` field during Phase 4. If the user declines to choose, default every step to `claude-sonnet-4-6` per `MODEL_SELECTION: DYNAMIC_DEFAULT_SONNET`. The deep/fast → opus/sonnet mapping is also documented in the `MODEL_SELECTION` invariant update in Sub-Plan 5.
- Acknowledge if the user requested a specific output format. If not specified, deduce an appropriate format based on the pipeline's goal (e.g., markdown files, code snippets, code files).
```

- [ ] **Step 3: Verify the insertion**

Run: `grep -F "Model preference per step" skills/creating-a-pipeline/SKILL.md`
Expected: one line matching the inserted bullet.

- [ ] **Step 4: Commit**

```bash
git add skills/creating-a-pipeline/SKILL.md
git commit -m "feat(backport): add model preference per step to creating-a-pipeline Phase 2"
```

---

## Task 2: Add `{P}.md` Run Command path template to sk-pipeline-paths

**Files:**
- Modify: `skills/sk-pipeline-paths/SKILL.md` (Path Templates table, around lines 38-50)

- [ ] **Step 1: Insert Run Command row above Step Skill row**

Use Edit with `old_string`:

```
| **Entry Skill** | `skills/superpipelines/{P}/run-{P}/SKILL.md` |
| **Step Skill** | `skills/superpipelines/{P}/{step}/SKILL.md` |
```

`new_string`:

```
| **Entry Skill** | `skills/superpipelines/{P}/run-{P}/SKILL.md` |
| **Run Command** | `superpipelines/pipelines/{P}/{P}.md` |
| **Step Skill** | `skills/superpipelines/{P}/{step}/SKILL.md` |
```

- [ ] **Step 2: Verify**

Run: `grep -F "| **Run Command** |" skills/sk-pipeline-paths/SKILL.md`
Expected: exactly one matching line.

- [ ] **Step 3: Commit**

```bash
git add skills/sk-pipeline-paths/SKILL.md
git commit -m "feat(backport): add Run Command path template to sk-pipeline-paths"
```

---

## Task 3: Add `{P}.md` Run Launcher artifact to creating-a-pipeline Phase 6

**Architectural note (F1.1 resolution):** Claude Code slash commands are registered exclusively via files under the plugin's `commands/` directory declared in `.claude-plugin/plugin.json`. Per-pipeline `{P}.md` artifacts at `<scope-root>/superpipelines/pipelines/{P}/{P}.md` are **launcher documents**, not registered slash commands. The OpenCode `/superpipelines:{P}` direct-invocation behavior relies on OC's scope-aware command routing which CC does not replicate. On CC, the canonical invocation remains `/superpipelines:run-pipeline` (which lists registered pipelines and dispatches the selected entry skill). `{P}.md` serves as: (a) a human-readable launcher reference, (b) an artifact the runner/auditor can grep, (c) a candidate file for future CC command-router integration. **Do not claim `/superpipelines:{P}` works on CC in any user-facing text.**

**Files:**
- Modify: `skills/creating-a-pipeline/SKILL.md` (Phase 6 hard-gate list, around lines 52-60)

- [ ] **Step 1: Insert Run Launcher bullet between topology.json and Entry Skill items**

Use Edit with `old_string`:

```
  4. `<scope-root>/superpipelines/pipelines/{P}/topology.json` (with `plugin_version` stamped)
  5. `<scope-root>/skills/superpipelines/{P}/run-{P}/SKILL.md` (entry skill, `user-invocable: true`)
```

`new_string`:

```
  4. `<scope-root>/superpipelines/pipelines/{P}/topology.json` (with `plugin_version` stamped)
  5. `<scope-root>/superpipelines/pipelines/{P}/{P}.md` (Run Launcher — single-page launcher document referencing the entry skill, registry entry, topology, and last-run state. Required artifact. NOTE: on Claude Code this is a documentation/discovery file only; CC does NOT auto-register it as a `/superpipelines:{P}` slash command. On OpenCode the same artifact is auto-routed by OC's scope-aware command resolver. Cross-platform `/superpipelines:{P}` direct invocation is OC-only in v2.0.0.)
  6. `<scope-root>/skills/superpipelines/{P}/run-{P}/SKILL.md` (entry skill, `user-invocable: true`)
```

- [ ] **Step 2: Renumber the remaining list items (6→7, 7→8)**

Use Edit with `old_string`:

```
  6. All step agents under `<scope-root>/agents/superpipelines/{P}/` — each MUST be zero-body (frontmatter only); and all companion `{agent-name}-protocol` skills under `<scope-root>/skills/superpipelines/{P}/` (with `plugin_version` stamped in agent frontmatter; `disable-model-invocation: true` and `user-invocable: false` in protocol skills)
  7. Updated `<scope-root>/superpipelines/registry.json` (with `plugin_version` stamped)
```

`new_string`:

```
  7. All step agents under `<scope-root>/agents/superpipelines/{P}/` — each MUST be zero-body (frontmatter only); and all companion `{agent-name}-protocol` skills under `<scope-root>/skills/superpipelines/{P}/` (with `plugin_version` stamped in agent frontmatter; `disable-model-invocation: true` and `user-invocable: false` in protocol skills)
  8. Updated `<scope-root>/superpipelines/registry.json` (with `plugin_version` stamped)
```

- [ ] **Step 3: Update final confirmation line to mention launcher location**

Use Edit with `old_string`:

```
- Confirm to the user: "Pipeline `{P}` scaffolded. Use `/superpipelines:run-pipeline` to execute it."
```

`new_string`:

```
- Confirm to the user: "Pipeline `{P}` scaffolded. Use `/superpipelines:run-pipeline` to execute it. Launcher reference at `<scope-root>/superpipelines/pipelines/{P}/{P}.md`. On OpenCode the same launcher is invocable directly as `/superpipelines:{P}`."
```

- [ ] **Step 4: Verify all three edits landed**

Run: `grep -c "^\s*[0-9]\+\." skills/creating-a-pipeline/SKILL.md`
Expected: at least 8 (the renumbered Phase 6 list).

Run: `grep -F "Run Launcher" skills/creating-a-pipeline/SKILL.md`
Expected: one line matching the inserted item.

Run: `grep -F "Launcher reference at" skills/creating-a-pipeline/SKILL.md`
Expected: one matching line.

- [ ] **Step 5: Commit**

```bash
git add skills/creating-a-pipeline/SKILL.md
git commit -m "feat(backport): add {P}.md Run Launcher artifact to creating-a-pipeline Phase 6"
```

---

## Task 4: Add `plugin_version` field to sk-pipeline-state schema

**Files:**
- Modify: `skills/sk-pipeline-state/SKILL.md` (schema block around lines 30-53; invariants around lines 36 and 85-88)

- [ ] **Step 1: Insert `plugin_version` field at top of schema (after `pipeline_id`)**

Use Edit with `old_string`:

```json
{
  "pipeline_id": "<uuid>",
  "pipeline_name": "<P>",
  "scope_root": "<absolute path>",
  "run_id": "<uuid>",
  "started_at": "<iso8601>",
  "pattern": "1 | 2 | 2b | 3 | 4 | 5",
```

`new_string`:

```json
{
  "pipeline_id": "<uuid>",
  "pipeline_name": "<P>",
  "plugin_version": "<semver — copied from .claude-plugin/plugin.json at run start>",
  "scope_root": "<absolute path>",
  "run_id": "<uuid>",
  "started_at": "<iso8601>",
  "pattern": "1 | 2 | 2b | 3 | 4 | 5",
```

- [ ] **Step 2: Add `plugin_version` to the invariants block**

Use Edit with `old_string`:

```
<invariants>
- **No Model Coupling**: Never use the model's native memory tool for pipeline state management; use structured JSON.
- **Atomic Renaming**: Direct writes to `pipeline-state.json` are forbidden.
- **Explicit Resumption**: NEVER auto-resume from an `escalated` or `failed` state without explicit user confirmation.
</invariants>
```

`new_string`:

```
<invariants>
- **No Model Coupling**: Never use the model's native memory tool for pipeline state management; use structured JSON.
- **Atomic Renaming**: Direct writes to `pipeline-state.json` are forbidden.
- **Explicit Resumption**: NEVER auto-resume from an `escalated` or `failed` state without explicit user confirmation.
- **Version Stamping**: `plugin_version` MUST be set at state initialization by reading the `version` field from `.claude-plugin/plugin.json`. It is read-only after init and used by `running-a-pipeline` for compatibility advisory.
</invariants>
```

- [ ] **Step 3: Verify**

Run: `grep -F "plugin_version" skills/sk-pipeline-state/SKILL.md`
Expected: at least 2 matching lines (schema field + invariant).

- [ ] **Step 4: Commit**

```bash
git add skills/sk-pipeline-state/SKILL.md
git commit -m "feat(backport): require plugin_version in pipeline-state.json schema"
```

---

## Task 5: Update running-a-pipeline Phase 2 to stamp `plugin_version` at init

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` (Phase 2 invariants line, around line 36)

- [ ] **Step 1: Add `plugin_version` to Phase 2 invariants**

Use Edit with `old_string`:

```
- **Invariants**: Must include `pipeline_id`, `started_at`, and the selected execution `pattern`.
```

`new_string`:

```
- **Invariants**: Must include `pipeline_id`, `started_at`, `plugin_version` (read from `.claude-plugin/plugin.json` at init), and the selected execution `pattern`.
```

- [ ] **Step 2: Verify**

Run: `grep -F "plugin_version" skills/running-a-pipeline/SKILL.md`
Expected: one matching line in Phase 2.

- [ ] **Step 3: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "feat(backport): stamp plugin_version in pipeline-state.json at init"
```

---

## Task 6: Add Phase 0.5 version compatibility advisory to running-a-pipeline

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md` (insert new Phase 0.5 between Phase 0 and Phase 1, around lines 26-29)

- [ ] **Step 1: Insert Phase 0.5 block between Phase 0 and Phase 1**

Use Edit with `old_string`:

```
### PHASE 0: DISCOVERY & SELECTION
- Resolve all scope roots via `sk-pipeline-paths`.
- Read and merge `registry.json` files from `local`, `project`, and `user` scopes.
- Present available pipelines to the user and capture the selection (`{ROOT}`, `{P}`, `pattern`).

### PHASE 1: RESUME CHECK
```

`new_string`:

```
### PHASE 0: DISCOVERY & SELECTION
- Resolve all scope roots via `sk-pipeline-paths`.
- Read and merge `registry.json` files from `local`, `project`, and `user` scopes.
- Present available pipelines to the user and capture the selection (`{ROOT}`, `{P}`, `pattern`).

### PHASE 0.5: VERSION COMPATIBILITY ADVISORY
- Read the pipeline's stamped `plugin_version` from its `registry.json` entry (or from `topology.json` if the registry entry predates version stamping).
- Read the currently installed plugin version from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`.
- **Compare major versions** (semver `MAJOR.minor.patch`):
  - Match → proceed silently.
  - Pipeline major < installed major → emit advisory: `"⚠️ Pipeline '{P}' was scaffolded under plugin v{pipeline_version}; installed plugin is v{installed_version}. Schema or topology conventions may have changed. Review the migration notes before resuming."` and ask the user to confirm continuation.
  - Pipeline major > installed major → emit advisory: `"⚠️ Pipeline '{P}' targets a newer plugin (v{pipeline_version}) than is installed (v{installed_version}). Upgrade recommended; running anyway may fail on unsupported features."` and ask the user to confirm continuation.
  - Missing `plugin_version` on the pipeline (pre-stamping era) → emit informational note only; do not block.
- **Advisory only — never blocks execution.** The user's confirmation is required only on a major mismatch.

### PHASE 1: RESUME CHECK
```

- [ ] **Step 2: Add version-advisory invariant to the invariants block**

Use Edit with `old_string`:

```
- ALWAYS read from the registry before execution to ensure pipeline validity.
- ALWAYS preserve the temp directory on any status other than `completed`.
- NEVER pass full file content to the entry skill; use absolute paths.
- All state updates must utilize the atomic write pattern.
```

`new_string`:

```
- ALWAYS read from the registry before execution to ensure pipeline validity.
- ALWAYS preserve the temp directory on any status other than `completed`.
- NEVER pass full file content to the entry skill; use absolute paths.
- All state updates must utilize the atomic write pattern.
- ALWAYS perform Phase 0.5 version-compatibility advisory before resume or fresh run; advisory is non-blocking but requires user confirmation on major-version mismatch.
```

- [ ] **Step 3: Verify both edits**

Run: `grep -F "PHASE 0.5: VERSION COMPATIBILITY ADVISORY" skills/running-a-pipeline/SKILL.md`
Expected: one matching line.

Run: `grep -F "version-compatibility advisory" skills/running-a-pipeline/SKILL.md`
Expected: one matching line.

- [ ] **Step 4: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "feat(backport): add Phase 0.5 version compatibility advisory to running-a-pipeline"
```

---

## Task 7: Create SYNC.md cross-repo tracker

**Files:**
- Create: `docs/SYNC.md`

- [ ] **Step 1: Confirm parent dir exists**

Run: `ls docs/`
Expected: shows `superpowers/` directory.

- [ ] **Step 2: Write SYNC.md**

Create file at `docs/SYNC.md` with this exact content:

```markdown
# SYNC.md — Cross-Repo Skill Sync Tracker

> Tracks which skills are kept in sync between `superpipelines` (Claude Code, Tier 1) and `superpipelines-opencode` (OpenCode, Tier 1b). Per `SYNC_DISCIPLINE: REQUIRED` invariant (Multi-Platform Design Spec §13).

## Sync Direction Convention

- **OC → CC**: OpenCode introduces a runtime innovation; backport the protocol/schema to CC.
- **CC → OC**: Claude Code introduces a pipeline pattern or invariant; forward-port to OC.

Each entry records: skill, last-synced version of each side, direction, and date.

## Synced Skills

| Skill | superpipelines version | superpipelines-opencode version | Last sync direction | Last sync date | Notes |
|---|---|---|---|---|---|
| `creating-a-pipeline` | v2.0.0 | v1.0.0 | OC → CC | 2026-05-21 | Backport batch 1: model preference per step (Phase 2); `{P}.md` Run Launcher artifact (Phase 6, launcher-doc only on CC; OC retains direct `/superpipelines:{P}` routing). |
| `running-a-pipeline` | v2.0.0 | v1.0.0 | OC → CC | 2026-05-21 | Backport batch 1: Phase 0.5 version-compatibility advisory; mandatory `plugin_version` stamping at init. |
| `sk-pipeline-paths` | v2.0.0 | v1.0.0 | OC → CC | 2026-05-21 | Backport batch 1: added `Run Command` row to path templates table. |
| `sk-pipeline-state` | v2.0.0 | v1.0.0 | OC → CC | 2026-05-21 | Backport batch 1: `plugin_version` field added to schema and invariants. |
| `sk-pipeline-patterns` | v2.0.0 | v1.0.0 | — | — | No drift recorded. Verify before next release. |

## Pending Sync (Next Cycle)

- `sk-platform-dispatch` (CC-new in v2.0.0) — evaluate whether OC needs an equivalent Tier 2 fallback skill.
- Phase 0.5 version advisory (CC-new in v2.0.0) — forward-port to OC if not already present in v1.0.0.

## Process

1. Before a release, walk this table and diff each "synced" skill across repos.
2. If divergence is intentional (platform-specific), document the reason in Notes.
3. If divergence is drift, port and bump both versions.
4. Update `Last sync date` to the date of the commit.
```

- [ ] **Step 3: Verify**

Run: `grep -F "Sync Direction Convention" docs/SYNC.md`
Expected: one matching line.

- [ ] **Step 4: Commit**

```bash
git add docs/SYNC.md
git commit -m "docs(sync): add SYNC.md cross-repo skill sync tracker"
```

---

## Task 8: End-of-batch verification grep

**Files:** none (read-only verification)

- [ ] **Step 1: Verify every backport string is present**

Run:

```bash
echo "--- creating-a-pipeline ---" && \
grep -F "Model preference per step" skills/creating-a-pipeline/SKILL.md && \
grep -F "Run Launcher —" skills/creating-a-pipeline/SKILL.md && \
grep -F "Launcher reference at" skills/creating-a-pipeline/SKILL.md && \
echo "--- running-a-pipeline ---" && \
grep -F "PHASE 0.5: VERSION COMPATIBILITY ADVISORY" skills/running-a-pipeline/SKILL.md && \
grep -F "plugin_version" skills/running-a-pipeline/SKILL.md && \
echo "--- sk-pipeline-paths ---" && \
grep -F "| **Run Command** |" skills/sk-pipeline-paths/SKILL.md && \
echo "--- sk-pipeline-state ---" && \
grep -F '"plugin_version":' skills/sk-pipeline-state/SKILL.md && \
grep -F "Version Stamping" skills/sk-pipeline-state/SKILL.md && \
echo "--- SYNC.md ---" && \
grep -F "Backport batch 1" docs/SYNC.md && \
echo "ALL BACKPORTS PRESENT"
```

Expected: each grep prints its match; final line `ALL BACKPORTS PRESENT`. If any grep fails, the script exits non-zero — go back to the failing task and re-apply the edit.

- [ ] **Step 2: No commit needed (verification only)**

---

## Out of scope for this sub-plan

- `CLAUDE.md` invariant updates (`MULTI_PLATFORM: TRUE`, `TIER_MODEL: 5-TIER`, `WRITE_REVIEW_ISOLATION`) — handled in sub-plan 5 (docs + version bump) so all CLAUDE.md changes land in one commit.
- Plugin version bump to `2.0.0` — sub-plan 5.
- `sk-platform-dispatch` skill — sub-plan 2.
- Platform manifests — sub-plan 3.
- Installer — sub-plan 4.
- Forward-porting CC additions to `superpipelines-opencode` — out of repo; tracked in `docs/SYNC.md` as a pending item.

---

## Self-Review Checklist (run before declaring this plan done)

1. **Spec coverage:** Multi-Platform Design Spec §3 lists exactly four OC innovations to backport. Tasks 1-6 cover all four (1: model-pref, 2+3: Run Command, 4+5: plugin_version, 6: version advisory). Task 7 covers `SYNC_DISCIPLINE: REQUIRED` (§13). ✅
2. **Placeholder scan:** No `TBD`, no `TODO`, no "implement appropriately". Each step shows the literal text to insert. ✅
3. **Type/name consistency:** `plugin_version` (snake_case, JSON field) used identically in Tasks 4, 5, 6, and 8. `Run Command` capitalization identical in Tasks 2, 3, 7, 8. ✅
