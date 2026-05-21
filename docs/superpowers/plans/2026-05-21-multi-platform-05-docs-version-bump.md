# Multi-Platform Sub-Plan 5 — CLAUDE.md Invariants & v2.0.0 Version Bump Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the multi-platform invariants in `CLAUDE.md`, bump `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` to `2.0.0`, append a v2.0.0 entry to `CHANGELOG.md`, write release notes, and reconcile the `CLAUDE.md` project version (currently `v1.2.0`) with the actual plugin version.

**Architecture:** Documentation and version-string edits only. No code changes. Final sub-plan in the multi-platform batch — runs after sub-plans 1-4 are merged so the changelog can reference all delivered features.

**Tech Stack:** Markdown (`CLAUDE.md`, `CHANGELOG.md`, `RELEASE-NOTES.md`), JSON (plugin manifests).

---

## File Structure

**Modify:**
- `CLAUDE.md` — Add multi-platform invariants; reconcile project version; document model-tier mapping.
- `.claude-plugin/plugin.json` — Bump `version` to `2.0.0`.
- `.claude-plugin/marketplace.json` — Bump plugin entry `version` to `2.0.0`.
- `CHANGELOG.md` — Prepend v2.0.0 section matching existing `## VERSION — Title (DATE)` format.
- `RELEASE-NOTES.md` — Prepend v2.0.0 section; preserve v1.0.6 (and any prior) history.
- `docs/superpowers/specs/2026-05-20-multi-platform-design.md` — Update §11 row to reflect CC version-compat-check backport (closes X3).

**Unchanged:** All skills (sub-plans 1, 2 already touched these), all agents, all commands, all hooks, all manifests created in sub-plan 3, installer files from sub-plan 4.

**Depends on Sub-Plans 1-4 being merged.**

---

## Task 1: Add multi-platform invariants to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace the architecture-invariants block**

Use Edit with `old_string`:

```
<architecture_invariants>
- `SUB_AGENT_SPAWNING: FALSE` — Subagents never spawn children; orchestration resides in top-level skills or the parent session.
- `WRITE_REVIEW_ISOLATION: TRUE` — The agent generating code is structurally barred from reviewing it.
- `MODEL_SELECTION: DYNAMIC_DEFAULT_SONNET` — Pipeline execution agents default to `claude-sonnet-4-6`. Planning and utility agents may utilize category-based dynamic routing (e.g., `deep-plan`, `quick-audit`).
- `PERMISSION_MODE: PER_AGENT` — Agents declare explicit permission boundaries (e.g., `acceptEdits`, `plan`) in frontmatter.
- `STATE_MANAGEMENT: STRUCTURED_JSON` — State persists to `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`.
- `MULTI_PIPELINE: TRUE` — Multiple named pipelines coexist in isolation per workspace.
- `LEAN_AGENTS: TRUE` — Agent files are frontmatter-only; zero body text is permitted. All operational protocol resides in a companion `{agent-name}-protocol` skill (loaded via the `skills:` list) with `disable-model-invocation: true` and `user-invocable: false`.
</architecture_invariants>
```

`new_string`:

```
<architecture_invariants>
- `SUB_AGENT_SPAWNING: FALSE` — Subagents never spawn children; orchestration resides in top-level skills or the parent session.
- `WRITE_REVIEW_ISOLATION: STRUCTURAL_ON_TIER1_1B_1D; CONVENTION_ONLY_ON_TIER2` — On Tier 1 (CC) the writer is barred from reviewing via agent `tools:` frontmatter; on Tier 1b (OC) via `permission: { edit: deny }`; on Tier 1d (Codex) via TOML `sandbox_mode` (pending per-agent verification). On Tier 2 (Cursor/Windsurf/Cline) the orchestrator runs both writer and reviewer protocols with its own full toolset — isolation is convention-only. Implementations MUST surface this degradation in user-facing reports.
- `MODEL_SELECTION: DYNAMIC_DEFAULT_SONNET` — Pipeline execution agents default to `claude-sonnet-4-6`. Planning and utility agents may utilize category-based dynamic routing (e.g., `deep-plan`, `quick-audit`). The `creating-a-pipeline` Phase 2 model-preference prompt records the user's per-step tier choice: `deep` → `claude-opus-4-7` (planning/architecture/review), `fast` → `claude-sonnet-4-6` (execution/utility). Architect embeds the resolved model string in each generated agent's `model:` frontmatter field during Phase 4.
- `PERMISSION_MODE: PER_AGENT` — Agents declare explicit permission boundaries (e.g., `acceptEdits`, `plan`) in frontmatter.
- `STATE_MANAGEMENT: STRUCTURED_JSON` — State persists to `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`. State carries `plugin_version` and `metadata.tier` from the run start.
- `MULTI_PIPELINE: TRUE` — Multiple named pipelines coexist in isolation per workspace.
- `LEAN_AGENTS_CC_ONLY` — Zero-body + protocol-skill pattern is Claude Code specific. OpenCode uses agent bodies ≤150 lines. Codex uses TOML agent files. Tier 2 platforms use protocol skills inline with no agent files.
- `MULTI_PLATFORM: TRUE` — superpipelines targets CC (Tier 1) + Codex (Tier 1d) + Cursor/Windsurf/Cline (Tier 2) + Antigravity CLI 2.0 (Tier 1c aspirational). superpipelines-opencode targets OC (Tier 1b). Gemini CLI is retired June 18, 2026.
- `TIER_MODEL: 5-TIER` — Tier 1 (CC: skill-callable `Task()`); Tier 1b (OC: `mode: subagent`); Tier 1c (Antigravity: Dynamic Subagents, aspirational); Tier 1d (Codex: native parallel subagents, model-driven, TOML agents, up to 6 concurrent); Tier 2 (Cursor/Windsurf/Cline: single-agent inline).
- `SKILL_PRIMACY: TRUE` — Intelligence lives in `SKILL.md`. Platform manifests (`.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `gemini-extension.json`) are discovery-only.
- `ARTIFACT_PORTABILITY: CC_AND_CODEX_TO_TIER2` — Pipelines scaffolded on CC or Codex run on Tier 2 platforms without modification. OC pipelines use OC-specific agent frontmatter and are not portable without re-scaffolding.
- `OC_FIRST_CLASS: TRUE` — `superpipelines-opencode` is a permanent sibling repo; not deprecated.
- `SYNC_DISCIPLINE: REQUIRED` — Shared skills are kept in sync between this repo and `superpipelines-opencode` via `docs/SYNC.md`.
- `PARITY_TESTING: MANUAL_PHASE1` — No automated cross-platform parity gate in v2.0.0. `docs/SYNC.md` tracks per-skill validation. Automated parity tests are a v2.1 objective.
</architecture_invariants>
```

- [ ] **Step 2: Bump project version metadata**

Use Edit with `old_string`:

```
- **Current Model IDs**: `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5-20251001`.
- **Project Version**: v1.2.0
```

`new_string`:

```
- **Current Model IDs**: `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5-20251001`.
- **Project Version**: v2.0.0
```

- [ ] **Step 3: Verify both edits**

Run: `grep -F "MULTI_PLATFORM: TRUE" CLAUDE.md && grep -F "TIER_MODEL: 5-TIER" CLAUDE.md && grep -F "Project Version**: v2.0.0" CLAUDE.md && echo OK`
Expected: three matches and `OK`.

- [ ] **Step 4: Confirm the old `WRITE_REVIEW_ISOLATION: TRUE` line is gone**

Run: `! grep -F "WRITE_REVIEW_ISOLATION: TRUE" CLAUDE.md && echo "old invariant removed"`
Expected: `old invariant removed`.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md invariants for multi-platform v2.0.0"
```

---

## Task 2: Bump .claude-plugin/plugin.json to 2.0.0

**Files:**
- Modify: `.claude-plugin/plugin.json`

- [ ] **Step 1: Read current**

Run: `grep '"version"' .claude-plugin/plugin.json`
Expected: `"version": "1.0.6",`

- [ ] **Step 2: Bump**

Use Edit with `old_string`:

```
"version": "1.0.6",
```

`new_string`:

```
"version": "2.0.0",
```

- [ ] **Step 3: Verify JSON validity**

Run: `python3 -c "import json; p=json.load(open('.claude-plugin/plugin.json')); assert p['version']=='2.0.0'; print('OK')"`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "chore(release): bump .claude-plugin/plugin.json to v2.0.0"
```

---

## Task 3: Bump .claude-plugin/marketplace.json to 2.0.0

**Files:**
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Read current**

Run: `grep '"version"' .claude-plugin/marketplace.json`
Expected: two `"version"` matches — the marketplace's own (`1.0.0`) and the superpipelines plugin entry (`1.0.6`). Only the plugin-entry version bumps; the marketplace `version` field is unchanged.

- [ ] **Step 2: Bump plugin entry only**

Use Edit with `old_string`:

```
      "version": "1.0.6",
```

`new_string`:

```
      "version": "2.0.0",
```

- [ ] **Step 3: Verify**

Run: `python3 -c "import json; m=json.load(open('.claude-plugin/marketplace.json')); v=[p['version'] for p in m['plugins'] if p['name']=='superpipelines'][0]; assert v=='2.0.0'; print('OK')"`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add .claude-plugin/marketplace.json
git commit -m "chore(release): bump superpipelines marketplace entry to v2.0.0"
```

---

## Task 4: Append v2.0.0 section to CHANGELOG.md

**Files:**
- Modify: `CHANGELOG.md`

Existing format (verified at plan-write time): `## VERSION — Title (YYYY-MM-DD)` with em-dash and parens; sub-headings `### Architecture & Governance`, `### Added`. New entry must match.

- [ ] **Step 1: Anchor on the existing 1.0.6 heading**

Use Edit with `old_string`:

```
## 1.0.6 — Lean Agents & Zero-Body Architecture (2026-05-20)
```

`new_string`:

```
## 2.0.0 — Multi-Platform (2026-05-21)

### Architecture & Governance

- **Multi-Platform Targets** — Single repo now supports Claude Code (Tier 1), Codex App/CLI (Tier 1d), Cursor/Windsurf/Cline (Tier 2), and Antigravity CLI 2.0 (Tier 1c aspirational). OpenCode (Tier 1b) remains in the sibling `superpipelines-opencode` repo.
- **5-Tier Execution Model** — New `TIER_MODEL: 5-TIER` invariant in `CLAUDE.md`. See spec `docs/superpowers/specs/2026-05-20-multi-platform-design.md` §6.
- **Tier-Aware Write/Review Isolation** — `WRITE_REVIEW_ISOLATION: TRUE` invariant replaced by `STRUCTURAL_ON_TIER1_1B_1D; CONVENTION_ONLY_ON_TIER2`. On Tier 2 the orchestrator runs both writer and reviewer protocols with full tools; reviews are advisory. Surfaced at run start and run end.
- **Skill Primacy** — `SKILL_PRIMACY: TRUE` invariant. Intelligence lives in `SKILL.md`; platform manifests are discovery-only.
- **Sync Discipline** — `SYNC_DISCIPLINE: REQUIRED` invariant. `docs/SYNC.md` tracks per-skill cross-repo sync between `superpipelines` and `superpipelines-opencode`.
- **Manual Parity Testing (Phase 1)** — `PARITY_TESTING: MANUAL_PHASE1` invariant. Automated cross-platform parity tests are a v2.1 objective.

### Added — Multi-Platform Targets

- **Codex App/CLI (Tier 1d)** — `.codex-plugin/plugin.json` manifest. Native parallel subagents, model-driven dispatch, up to 6 concurrent threads, TOML agent files.
- **Cursor / Windsurf / Cline (Tier 2)** — `.cursor-plugin/plugin.json` manifest + `hooks/hooks-cursor.json` stub. Single-agent inline execution via `sk-platform-dispatch`.
- **Antigravity CLI 2.0 (Tier 1c aspirational)** — `gemini-extension.json` manifest. Tier 1c if Dynamic Subagent dispatch is exposed to skills; falls back to Tier 2 otherwise.
- **Universal context files** — `AGENTS.md` (any AGENTS.md-aware tool) and `GEMINI.md` (Antigravity CLI 2.0).
- **Universal installer** — `bin/install.js` Node.js entrypoint with platform auto-detection; `install.sh` POSIX wrapper; `install.ps1` PowerShell wrapper. Flags: `--all`, `--only`, `--dry-run`, `--list`, `--uninstall`, `--non-interactive`, `--with-init`.
- **`sk-platform-dispatch` skill** — Tier detection + Tier 2 single-agent inline dispatch loop + per-tier scope-root resolution + Tier 2 degradation surfacing.
- **`docs/SYNC.md`** — Cross-repo skill sync tracker between `superpipelines` and `superpipelines-opencode`.
- **Per-tier scope roots in `sk-pipeline-paths`** — `PORTABILITY_REWRITE` enables CC-scaffolded pipelines to run on Tier 2 by rewriting `.claude/` paths to `.superpipelines/` at read/write time.

### Added — OC → CC Backports

- **Model preference per step** in `creating-a-pipeline` Phase 2. Deep tier → `claude-opus-4-7`; fast tier → `claude-sonnet-4-6`. Embedded in generated agent `model:` frontmatter by the architect.
- **`{P}.md` Run Launcher artifact** in `creating-a-pipeline` Phase 6. Launcher document referenced by registry and runner. Note: CC does NOT auto-register `{P}.md` as a slash command — `/superpipelines:{P}` direct invocation is OpenCode-only in v2.0.0.
- **Phase 0.5 version-compatibility advisory** in `running-a-pipeline` — non-blocking warning on major-version mismatch.
- **Mandatory `plugin_version`** in `pipeline-state.json` schema, stamped at run init.

### Changed

- `CLAUDE.md` Architecture Invariants block fully revised — see Architecture & Governance above.
- `CLAUDE.md` Project Version reconciled to `v2.0.0` (was `v1.2.0`, out of sync with plugin manifest at `v1.0.6`).
- `running-a-pipeline` gained Phase 0.25 (tier detect & dispatch load) and Phase 0.5 (version-compatibility advisory).
- `pipeline-architect-protocol` now requires generated entry skills to dispatch every step via `sk-platform-dispatch` DISPATCH rather than direct `Task(subagent_type=...)` calls. Existing entry skills predating v2.0.0 continue to work on Tier 1; tier portability requires regenerating with the new architect.
- `pipeline-runner-references/references/dispatch-protocols.md` documents Tier 2 single-agent inline dispatch.
- All five plugin manifests (`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` plugin entry, `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `gemini-extension.json`) versioned at `2.0.0`.

### Deprecated

- **Gemini CLI** as a distribution target — runtime retired June 18, 2026. Migrate to Antigravity CLI 2.0 via `agy plugin import gemini`.

### Known Limitations (Phase 1)

- `--uninstall` flag in `bin/install.js` is a stub in v2.0.0 — prints a per-platform pointer message; full uninstall logic deferred to v2.1.
- `--with-init` flag in `bin/install.js` is reserved (no-op) in v2.0.0.
- Tier 1c (Antigravity Dynamic Subagents) is aspirational — falls back to Tier 2 unless the dispatch primitive is verified exposed to skills.
- Tier 1d (Codex) per-agent isolation via TOML `sandbox_mode` is pending verification; treated as convention-only until confirmed.
- Codex plugin-install command syntax (`codex plugin add ...`) in the installer is unverified against a stable Codex release; patch in v2.0.1 if the verified command differs.
- No automated cross-platform parity gate. Per-skill validation tracked manually in `docs/SYNC.md`.
- True parallel execution on Tier 2 degrades to sequential — Cursor/Windsurf/Cline have no subagent primitive.

### Non-Goals (Phase 1)

- Merging the `superpipelines` and `superpipelines-opencode` repos (OC remains a permanent sibling).
- True parallel execution on Tier 2.
- Automated cross-platform parity tests (Phase 2 objective).

## 1.0.6 — Lean Agents & Zero-Body Architecture (2026-05-20)
```

- [ ] **Step 2: Verify the new heading is the first version heading**

Run: `grep -n '^## [0-9]' CHANGELOG.md | head -3`
Expected: first match `## 2.0.0 — Multi-Platform (2026-05-21)`, second `## 1.0.6 — Lean Agents...`.

Run: `grep -F "## 2.0.0 — Multi-Platform (2026-05-21)" CHANGELOG.md`
Expected: one match.

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(release): add v2.0.0 changelog entry"
```

---

## Task 5: Prepend v2.0.0 section to RELEASE-NOTES.md

**Files:**
- Modify (prepend, NOT overwrite): `RELEASE-NOTES.md`

Existing file has the header preamble + `## v1.0.6 — Lean Agents & Zero-Body Architecture (2026-05-20)` section. New v2.0.0 section is inserted between the preamble and the existing v1.0.6 heading. History MUST be preserved.

- [ ] **Step 1: Verify current first version heading**

Run: `grep -n "^## v" RELEASE-NOTES.md | head -3`
Expected: first match is `## v1.0.6 — Lean Agents & Zero-Body Architecture (2026-05-20)`.

- [ ] **Step 2: Insert v2.0.0 section above the v1.0.6 heading**

Use Edit with `old_string`:

```
## v1.0.6 — Lean Agents & Zero-Body Architecture (2026-05-20)
```

`new_string` (the v2.0.0 block followed by a blank line and the original v1.0.6 heading):

````markdown
## v2.0.0 — Multi-Platform Release (2026-05-21)

### Highlights

Superpipelines now runs on **five execution tiers** spanning Claude Code, OpenCode, Codex, Cursor, Windsurf, Cline, and Antigravity CLI 2.0. One repo, one installer, one set of skills.

### Multi-platform execution model

| Tier | Platform | Subagent primitive |
|------|----------|--------------------|
| 1 | Claude Code | Skill-callable `Task()` |
| 1b | OpenCode (sibling repo) | `mode: subagent` agents |
| 1c | Antigravity CLI 2.0 | Dynamic Subagents (aspirational) |
| 1d | Codex App/CLI | Native model-driven subagents (up to 6 concurrent) |
| 2 | Cursor / Windsurf / Cline | Single-agent inline via `sk-platform-dispatch` |

### Universal installer

```bash
# macOS / Linux / WSL
curl -fsSL https://raw.githubusercontent.com/gustavo-meilus/superpipelines/main/install.sh | bash

# Windows PowerShell
irm https://raw.githubusercontent.com/gustavo-meilus/superpipelines/main/install.ps1 | iex

# Pick one platform
node bin/install.js --only claude-code
```

Auto-detects every supported platform. Use `--list` to see detection results, `--dry-run` to preview commands, `--all` to install for every detected platform.

### OpenCode-originated improvements (backported to CC)

- **Per-step model preference** in the pipeline creation flow. Deep tier → `claude-opus-4-7`; fast tier → `claude-sonnet-4-6`.
- **Run Launcher artifact** `<scope-root>/superpipelines/pipelines/{P}/{P}.md` (launcher document; on CC this is a discovery file, not a slash command — `/superpipelines:{P}` direct invocation remains OpenCode-only in v2.0.0).
- **Version-compatibility advisory** at run start.
- **`plugin_version` stamping** in `pipeline-state.json`.

### Write/Review isolation — degradation made explicit

The `WRITE_REVIEW_ISOLATION` invariant is now tier-aware:

- **Tier 1 (CC)** — structural, enforced via agent `tools:` frontmatter.
- **Tier 1b (OC)** — structural, enforced via `permission: { edit: deny }`.
- **Tier 1d (Codex)** — pending per-agent `sandbox_mode` verification.
- **Tier 2 (Cursor/Windsurf/Cline)** — convention-only. Reviews are advisory. The orchestrator surfaces this degradation at run start (stderr advisory) and run end (state-file footer + entry-skill summary).

### Breaking changes

- `WRITE_REVIEW_ISOLATION: TRUE` invariant removed. Replaced by tier-aware `STRUCTURAL_ON_TIER1_1B_1D; CONVENTION_ONLY_ON_TIER2`. Tooling that hard-asserted the boolean form must update.
- New `metadata.tier` and `plugin_version` fields required at state init. Pre-v2.0.0 runs without these fields surface informational notes at resume; do not block.
- Generated entry skills now route through `sk-platform-dispatch` DISPATCH instead of direct `Task()`. Existing pre-v2.0.0 entry skills continue to work on Tier 1; tier portability requires regenerating with the v2.0.0 architect.
- `CLAUDE.md` Project Version jumps from `v1.2.0` (stale) to `v2.0.0`. Plugin manifest version (`1.0.6` → `2.0.0`) is now the source of truth.

### Known limitations

- `--uninstall` flag stub (full uninstall deferred to v2.1).
- `--with-init` flag reserved (no-op).
- Tier 1c (Antigravity Dynamic Subagents) aspirational — falls back to Tier 2 unless dispatch primitive verified.
- Tier 1d (Codex) `sandbox_mode` per-agent isolation pending verification.
- Codex installer command syntax unverified against a stable release.
- No automated cross-platform parity gate (manual tracking via `docs/SYNC.md`).

### Deprecations

- **Gemini CLI** as a distribution target. Runtime retires June 18, 2026. Migrate to Antigravity CLI 2.0 via `agy plugin import gemini`.

### Repo relationship

- `superpipelines` (this repo) — Tier 1 (CC), Tier 1d (Codex), Tier 2 (Cursor/Windsurf/Cline), Tier 1c aspirational (Antigravity).
- `superpipelines-opencode` — Tier 1b (OpenCode). Permanent sibling repo, not deprecated. Shared skills tracked in `docs/SYNC.md`.

### Upgrade path

Existing Claude Code users:

```bash
claude plugin update superpipelines
```

Or re-run the installer to pull v2.0.0 plus any newly detected platforms:

```bash
curl -fsSL https://raw.githubusercontent.com/gustavo-meilus/superpipelines/main/install.sh | bash
```

### Full changelog

See `CHANGELOG.md`.

## v1.0.6 — Lean Agents & Zero-Body Architecture (2026-05-20)
````

(The final line above is the existing v1.0.6 heading — re-anchored so the Edit preserves it.)

- [ ] **Step 3: Verify history is preserved**

Run: `grep -c "^## v" RELEASE-NOTES.md`
Expected: ≥ 2 (at least the new v2.0.0 heading plus the preserved v1.0.6 heading; more if the original file had additional version sections).

Run: `grep -F "v2.0.0 — Multi-Platform Release (2026-05-21)" RELEASE-NOTES.md && grep -F "v1.0.6 — Lean Agents" RELEASE-NOTES.md && echo OK`
Expected: two matches and `OK`.

- [ ] **Step 4: Commit**

```bash
git add RELEASE-NOTES.md
git commit -m "docs(release): prepend v2.0.0 release notes; preserve history"
```

---

## Task 6: End-of-release verification

**Files:** none

- [ ] **Step 1: Run version-consistency gate across every manifest**

```bash
python3 - <<'PY'
import json
manifests = {
    '.claude-plugin/plugin.json': json.load(open('.claude-plugin/plugin.json'))['version'],
    '.codex-plugin/plugin.json': json.load(open('.codex-plugin/plugin.json'))['version'],
    '.cursor-plugin/plugin.json': json.load(open('.cursor-plugin/plugin.json'))['version'],
    'gemini-extension.json': json.load(open('gemini-extension.json'))['version'],
}
m = json.load(open('.claude-plugin/marketplace.json'))
manifests['marketplace.json (superpipelines entry)'] = [p['version'] for p in m['plugins'] if p['name']=='superpipelines'][0]
versions = set(manifests.values())
assert versions == {'2.0.0'}, f'Version mismatch: {manifests}'
print('All manifest versions == 2.0.0')
PY
```

Expected: `All manifest versions == 2.0.0`.

- [ ] **Step 2: Run docs-version gate**

```bash
grep -F "Project Version**: v2.0.0" CLAUDE.md && \
grep -F "## 2.0.0 — Multi-Platform (2026-05-21)" CHANGELOG.md && \
grep -F "v2.0.0 — Multi-Platform Release (2026-05-21)" RELEASE-NOTES.md && \
grep -F "v1.0.6 — Lean Agents" RELEASE-NOTES.md && \
echo "DOCS V2.0.0 CONSISTENT (history preserved)"
```

Expected: four matches and `DOCS V2.0.0 CONSISTENT (history preserved)`.

- [ ] **Step 3: Run invariants gate**

```bash
grep -F "MULTI_PLATFORM: TRUE" CLAUDE.md && \
grep -F "TIER_MODEL: 5-TIER" CLAUDE.md && \
grep -F "STRUCTURAL_ON_TIER1_1B_1D; CONVENTION_ONLY_ON_TIER2" CLAUDE.md && \
grep -F "LEAN_AGENTS_CC_ONLY" CLAUDE.md && \
grep -F "SKILL_PRIMACY: TRUE" CLAUDE.md && \
grep -F "ARTIFACT_PORTABILITY: CC_AND_CODEX_TO_TIER2" CLAUDE.md && \
grep -F "OC_FIRST_CLASS: TRUE" CLAUDE.md && \
grep -F "SYNC_DISCIPLINE: REQUIRED" CLAUDE.md && \
grep -F "PARITY_TESTING: MANUAL_PHASE1" CLAUDE.md && \
echo "ALL INVARIANTS PRESENT"
```

Expected: nine matches and `ALL INVARIANTS PRESENT`.

- [ ] **Step 4: No commit needed (verification only)**

---

## Task 7: Update spec §11 Compatibility Matrix for version-compat-check backport

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-multi-platform-design.md` (§11 row)

Spec §11 table currently shows "Version compat check" only for OC. Sub-Plan 1 backported it to CC. Without this fix, spec stays stale.

- [ ] **Step 1: Update the row**

Use Edit with `old_string`:

```
| Version compat check | ❌ | ✅ advisory | ❌ | ❌ | ❌ |
```

`new_string`:

```
| Version compat check | ✅ advisory (v2.0.0+) | ✅ advisory | ❌ | ❌ | ❌ |
```

- [ ] **Step 2: Verify**

Run: `grep -F "| Version compat check | ✅ advisory (v2.0.0+) |" docs/superpowers/specs/2026-05-20-multi-platform-design.md`
Expected: one match.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-20-multi-platform-design.md
git commit -m "docs(spec): update §11 — version compat check is now CC + OC after v2.0.0 backport"
```

---

## Out of scope

- Git tag creation (`git tag v2.0.0`) — release ritual, not a code change. Tagged after merge to `main`.
- npm publish / claude plugin publish — release pipeline; out of plan scope.
- Cross-repo backport to `superpipelines-opencode` — tracked in `docs/SYNC.md`; performed in the OC repo's own release cycle.

---

## Self-Review Checklist

1. **Spec coverage:** Spec §10 "Modified files" → `CLAUDE.md` invariants + version bump to `2.0.0` for both `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`. Spec §13 invariants list mirrored exactly in Task 1's `new_string`. Task 7 closes X3 (spec §11 staleness). ✅
2. **Placeholder scan:** No `TBD`/`TODO` in shipped content. Tasks 4-5 contain complete release-notes and changelog markdown. ✅
3. **Type/name consistency:** `v2.0.0` / `2.0.0` string consistent across Tasks 1-7. Invariant key names (`MULTI_PLATFORM`, `TIER_MODEL`, `WRITE_REVIEW_ISOLATION`, `SKILL_PRIMACY`, `ARTIFACT_PORTABILITY`, `OC_FIRST_CLASS`, `SYNC_DISCIPLINE`, `PARITY_TESTING`, `LEAN_AGENTS_CC_ONLY`) match spec §13 verbatim. ✅
4. **F5.1/F5.3/F5.7 (changelog format):** Task 4 anchors on the existing `## 1.0.6 — Lean Agents…` heading and emits matching `## 2.0.0 — Multi-Platform (2026-05-21)` format. Verification grep updated. ✅
5. **F5.2 (release-notes history preservation):** Task 5 prepends rather than overwrites; verification asserts both v2.0.0 and v1.0.6 headings remain. ✅
6. **F1.2 (model-selection invariant):** Task 1 `MODEL_SELECTION` invariant updated to document deep/fast → opus/sonnet mapping. ✅
7. **F4.7 (uninstall stub disclosure):** Task 4 changelog includes "Known Limitations" section listing `--uninstall` stub, `--with-init` reserved, Tier 1c/1d caveats. ✅
