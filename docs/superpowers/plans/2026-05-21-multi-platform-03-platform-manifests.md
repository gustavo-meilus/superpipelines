# Multi-Platform Sub-Plan 3 — Platform Manifests & Context Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-platform plugin manifests (`.codex-plugin/`, `.cursor-plugin/`, `gemini-extension.json`) and universal context files (`AGENTS.md`, `GEMINI.md`) so Codex, Cursor/Windsurf/Cline, and Antigravity CLI 2.0 can discover and load Superpipelines skills/commands/agents from a single repo.

**Architecture:** Discovery-only manifests — zero logic. Each manifest points at the existing `./skills/`, `./agents/`, `./commands/` directories. Context files (`AGENTS.md`, `GEMINI.md`) introduce Superpipelines commands and trigger phrases for platforms that read AGENTS.md/GEMINI.md as session-start context. No skill or agent file changes.

**Tech Stack:** JSON (plugin manifests), Markdown (context files). Per-platform schema URLs where published.

---

## File Structure

**Create:**
- `.codex-plugin/plugin.json` — Codex App/CLI manifest.
- `.cursor-plugin/plugin.json` — Cursor (and Windsurf/Cline via `npx skills add`) manifest.
- `gemini-extension.json` — Antigravity CLI 2.0 manifest (carried over from Gemini extension format; auto-migrates via `agy plugin import gemini`).
- `AGENTS.md` — Universal context file (OpenCode, Codex, any AGENTS.md-aware tool).
- `GEMINI.md` — Antigravity context file (confirmed unchanged from Gemini CLI).

**Modify:** none (manifests stand alone; CLAUDE.md update is sub-plan 5).

**Caveats from spec §7:**
- Codex manifest schema not publicly stabilized — uses minimal documented fields; flagged for verification.
- Antigravity fresh-install manifest filename unverified — using `gemini-extension.json` per spec; safe default.

---

## Task 1: Create Codex plugin manifest

**Files:**
- Create: `.codex-plugin/plugin.json`

- [ ] **Step 1: Verify directory does not exist**

Run: `ls .codex-plugin/ 2>&1 || echo MISSING`
Expected: `MISSING`.

- [ ] **Step 2: Write the manifest**

Create `.codex-plugin/plugin.json` with this exact content:

```json
{
  "name": "superpipelines",
  "version": "2.0.0",
  "description": "Design, generate, and run multi-agent AI pipelines — scope-aware, multi-pipeline, spec-driven, write/review-isolated. Codex App/CLI target (Tier 1d: native parallel subagents, up to 6 concurrent).",
  "author": {
    "name": "Gustavo Meilus",
    "url": "https://github.com/gustavo-meilus"
  },
  "homepage": "https://github.com/gustavo-meilus/superpipelines",
  "repository": "https://github.com/gustavo-meilus/superpipelines",
  "license": "MIT",
  "skills": "./skills/",
  "agents": "./agents/",
  "commands": "./commands/",
  "keywords": [
    "ai-pipelines",
    "subagents",
    "skills",
    "spec-driven-development",
    "orchestration",
    "codex"
  ]
}
```

- [ ] **Step 3: Validate JSON**

Run: `python3 -c "import json; json.load(open('.codex-plugin/plugin.json'))" && echo VALID`
Expected: `VALID`.

- [ ] **Step 4: Commit**

```bash
git add .codex-plugin/plugin.json
git commit -m "feat(codex): add .codex-plugin/plugin.json for Codex App/CLI distribution"
```

---

## Task 2: Create Cursor plugin manifest

**Files:**
- Create: `.cursor-plugin/plugin.json`
- Create: `hooks/hooks-cursor.json` (Cursor-specific empty hook stub — see Task 3)

- [ ] **Step 1: Write the manifest**

Create `.cursor-plugin/plugin.json` with this exact content:

```json
{
  "name": "superpipelines",
  "version": "2.0.0",
  "description": "Design and run multi-agent AI pipelines on Cursor, Windsurf, and Cline (Tier 2: single-agent inline execution; reviewer isolation is convention-only).",
  "author": {
    "name": "Gustavo Meilus",
    "url": "https://github.com/gustavo-meilus"
  },
  "homepage": "https://github.com/gustavo-meilus/superpipelines",
  "repository": "https://github.com/gustavo-meilus/superpipelines",
  "license": "MIT",
  "skills": "./skills/",
  "commands": "./commands/",
  "hooks": "./hooks/hooks-cursor.json",
  "keywords": [
    "ai-pipelines",
    "skills",
    "spec-driven-development",
    "cursor",
    "windsurf",
    "cline"
  ]
}
```

Note: `agents` field intentionally omitted — Tier 2 platforms execute protocol skills inline without subagent dispatch (see Sub-Plan 2 / `sk-platform-dispatch`).

- [ ] **Step 2: Validate JSON**

Run: `python3 -c "import json; json.load(open('.cursor-plugin/plugin.json'))" && echo VALID`
Expected: `VALID`.

- [ ] **Step 3: Commit**

```bash
git add .cursor-plugin/plugin.json
git commit -m "feat(cursor): add .cursor-plugin/plugin.json for Cursor/Windsurf/Cline distribution"
```

---

## Task 3: Create Cursor-specific hooks file

**Files:**
- Create: `hooks/hooks-cursor.json`

- [ ] **Step 1: Inspect existing CC hooks for shape reference**

Run: `cat hooks/hooks.json | python3 -m json.tool | head -40`
Expected: shows the existing CC hook structure (event keys, command shapes).

- [ ] **Step 2: Write minimal Cursor hooks stub**

Create `hooks/hooks-cursor.json` with this exact content:

```json
{
  "$comment": "Cursor-specific hooks for Superpipelines. Cursor's hook event model differs from Claude Code; this file declares no active hooks pending Cursor hook-API stabilization. Skills handle session-start context via Cursor's rules/AGENTS.md loading instead.",
  "version": "1.0",
  "hooks": {}
}
```

- [ ] **Step 3: Validate JSON**

Run: `python3 -c "import json; json.load(open('hooks/hooks-cursor.json'))" && echo VALID`
Expected: `VALID`.

- [ ] **Step 4: Commit**

```bash
git add hooks/hooks-cursor.json
git commit -m "feat(cursor): add hooks/hooks-cursor.json (empty stub pending Cursor hook-API stabilization)"
```

---

## Task 4: Create Antigravity plugin manifest

**Files:**
- Create: `gemini-extension.json`

Spec note: Antigravity CLI 2.0 continues reading `gemini-extension.json`; `agy plugin import gemini` migrates the same schema. The new "Antigravity plugin" manifest filename for fresh cold installs is unverified per spec §7.1; using `gemini-extension.json` is the safe default.

- [ ] **Step 1: Write the manifest**

Create `gemini-extension.json` with this exact content:

```json
{
  "name": "superpipelines",
  "version": "2.0.0",
  "description": "Design and run multi-agent AI pipelines on Antigravity CLI 2.0 (Tier 1c aspirational: Dynamic Subagents; falls back to Tier 2 single-agent inline if dispatch primitive unavailable to skills).",
  "author": {
    "name": "Gustavo Meilus",
    "url": "https://github.com/gustavo-meilus"
  },
  "homepage": "https://github.com/gustavo-meilus/superpipelines",
  "repository": "https://github.com/gustavo-meilus/superpipelines",
  "license": "MIT",
  "skills": "./skills/",
  "commands": "./commands/",
  "keywords": [
    "ai-pipelines",
    "skills",
    "spec-driven-development",
    "antigravity",
    "gemini"
  ]
}
```

- [ ] **Step 2: Validate JSON**

Run: `python3 -c "import json; json.load(open('gemini-extension.json'))" && echo VALID`
Expected: `VALID`.

- [ ] **Step 3: Commit**

```bash
git add gemini-extension.json
git commit -m "feat(antigravity): add gemini-extension.json for Antigravity CLI 2.0 distribution"
```

---

## Task 5: Create AGENTS.md universal context file

**Files:**
- Create: `AGENTS.md`

- [ ] **Step 1: Write the context file**

Create `AGENTS.md` with this exact content:

````markdown
# Superpipelines — Agent Context

> Universal context file for any AGENTS.md-aware tool (OpenCode, Codex, Cursor, Windsurf, Cline, others). Introduces the Superpipelines commands and pipeline concepts so the active agent recognizes user intent.

## What this plugin does

Superpipelines is a multi-agent pipeline orchestration framework. It lets users design, scaffold, and execute named multi-step AI workflows (specs, plans, tasks, parallel branches, iterative loops, human gates).

## Commands

| Command | Purpose |
|---------|---------|
| `/superpipelines:new-pipeline` | Design a new pipeline end-to-end (brief → spec → topology → audit → scaffold). |
| `/superpipelines:run-pipeline` | List installed pipelines and execute one. |
| `/superpipelines:audit-pipeline` | Audit an existing pipeline's spec/plan/topology. |
| `/superpipelines:new-step` | Add a step to an existing pipeline. |
| `/superpipelines:update-step` | Modify an existing step. |
| `/superpipelines:delete-step` | Remove a step. |
| `/superpipelines:change-models` | Reassign model tiers across pipeline steps. |
| `/superpipelines:init-deep` | Deep project initialization (full architecture analysis). |
| `/superpipelines:{P}` | Direct invocation of a scaffolded pipeline named `{P}`. |

## Trigger phrases

The active agent should invoke a Superpipelines command when the user requests:

- "design a workflow / pipeline for X" → `/superpipelines:new-pipeline`
- "run the {name} pipeline" / "execute X" → `/superpipelines:run-pipeline` or `/superpipelines:{P}`
- "audit pipeline X" → `/superpipelines:audit-pipeline`
- "plan multi-step feature work" → `/superpipelines:new-pipeline`

## Execution tier

Superpipelines runs on five tiers. The active platform's tier determines parallelism and reviewer-isolation strength:

| Tier | Platform | Subagents | Reviewer isolation |
|------|----------|-----------|--------------------|
| 1 | Claude Code | Skill-callable `Task()` (true parallel) | Structural |
| 1b | OpenCode | `mode: subagent` agents | Structural |
| 1c | Antigravity CLI 2.0 | Dynamic Subagents (aspirational) | TBD |
| 1d | Codex App/CLI | Model-driven, TOML agents (up to 6 concurrent) | Pending verification |
| 2 | Cursor / Windsurf / Cline | None — single-agent inline | Convention-only (advisory) |

**Tier 2 caveat:** On Cursor, Windsurf, and Cline, the orchestrator executes both writer and reviewer protocols with its own full toolset. Reviews are advisory, not structurally enforced.

## Pipeline artifacts

All pipelines produce these files under the active scope root (`<workspace>/.claude/`, `<workspace>/.opencode/`, or `~/.claude/`):

- `superpipelines/pipelines/{P}/spec.md` — Approved specification.
- `superpipelines/pipelines/{P}/plan.md` — Implementation plan.
- `superpipelines/pipelines/{P}/tasks.md` — Task list with dependencies.
- `superpipelines/pipelines/{P}/topology.json` — Step graph.
- `superpipelines/pipelines/{P}/{P}.md` — Single-page launcher (direct-invocation entry).
- `superpipelines/temp/{P}/{runId}/pipeline-state.json` — Live run state.

## Skill primacy

Intelligence lives in `skills/*/SKILL.md`. Platform manifests (`.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `gemini-extension.json`) are discovery-only — they declare where skills/agents/commands live, not what they do.

## More

- Repo: https://github.com/gustavo-meilus/superpipelines
- OpenCode sibling: https://github.com/gustavo-meilus/superpipelines-opencode
````

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "feat(context): add AGENTS.md universal context file"
```

---

## Task 6: Create GEMINI.md Antigravity context file

**Files:**
- Create: `GEMINI.md`

Spec note (§7.2): Antigravity CLI 2.0 migration guide explicitly states `GEMINI.md` and `AGENTS.md` keep working unchanged; no `ANTIGRAVITY.md` introduced. The Antigravity plugin manifest does not declare context files via a `contextFiles` field (unverified — schema unpublished); `GEMINI.md` at the repo root is auto-loaded by Antigravity CLI by convention. If Antigravity later publishes a context-file field, add it in a v2.0.1 patch.

- [ ] **Step 1: Write the context file**

Create `GEMINI.md` with this exact content:

````markdown
# Superpipelines — Antigravity CLI 2.0 Context

> Loaded by Antigravity CLI 2.0 (Go-based `agy`, successor to Gemini CLI) at session start. Mirrors AGENTS.md but uses Antigravity-specific terminology and skills/workflows paths.

## What this plugin does

Superpipelines designs, scaffolds, and executes named multi-step AI workflows on Antigravity CLI 2.0 using Dynamic Subagents (aspirational Tier 1c) or single-agent inline fallback (Tier 2).

## Commands

Same as universal AGENTS.md. See `AGENTS.md` in this repo or the README.

## Antigravity-specific paths

| Resource | Location |
|----------|----------|
| Workspace skills | `.agents/skills/` |
| Global skills | `~/.gemini/antigravity/skills/` |
| Workspace workflows (Scheduled Tasks) | `.agents/workflows/{NAME}.md` |
| Global workflows | `~/.gemini/antigravity/global_workflows/{NAME}.md` |
| Workspace rules | `.agents/rules/` |
| Global rules | `~/.gemini/GEMINI.md` |

## Migration from Gemini CLI

Gemini CLI is deprecated June 18, 2026. Migrate existing extensions:

```bash
agy plugin import gemini
```

This converts `gemini-extension.json` extensions to the Antigravity plugin format in place. Superpipelines ships `gemini-extension.json` for compatibility with both pre- and post-migration installs.

## Scheduled Tasks for pipelines

Each scaffolded pipeline produces a single-page launcher at `superpipelines/pipelines/{P}/{P}.md`. To run a pipeline on a schedule under Antigravity, drop a Scheduled Task file at `.agents/workflows/{P}-scheduled.md` referencing the launcher. Pipeline state preserves across runs in `superpipelines/temp/{P}/{runId}/pipeline-state.json`.

## Execution tier

Tier 1c (Dynamic Subagents) if the dispatch primitive is exposed to skills; otherwise falls back to Tier 2 (single-agent inline). The active orchestrator detects tier via `sk-platform-dispatch` at run start. See §6 of `docs/superpowers/specs/2026-05-20-multi-platform-design.md` for verification status.

## More

- Repo: https://github.com/gustavo-meilus/superpipelines
- Antigravity migration guide: https://antigravity.google/docs/migration
````

- [ ] **Step 2: Commit**

```bash
git add GEMINI.md
git commit -m "feat(antigravity): add GEMINI.md context file for Antigravity CLI 2.0"
```

---

## Task 7: End-of-batch verification

**Files:** none

- [ ] **Step 1: Run combined verification**

```bash
echo "--- Manifests exist and parse ---" && \
python3 -c "import json; [json.load(open(f)) for f in ['.codex-plugin/plugin.json', '.cursor-plugin/plugin.json', 'gemini-extension.json', 'hooks/hooks-cursor.json']]" && \
echo "MANIFESTS VALID" && \
echo "--- Context files exist ---" && \
test -f AGENTS.md && test -f GEMINI.md && \
grep -F "Superpipelines" AGENTS.md > /dev/null && \
grep -F "Antigravity CLI 2.0" GEMINI.md > /dev/null && \
echo "CONTEXT FILES PRESENT" && \
echo "--- Version consistency across manifests ---" && \
python3 -c "
import json
versions = {
  '.codex-plugin/plugin.json': json.load(open('.codex-plugin/plugin.json'))['version'],
  '.cursor-plugin/plugin.json': json.load(open('.cursor-plugin/plugin.json'))['version'],
  'gemini-extension.json': json.load(open('gemini-extension.json'))['version'],
}
assert len(set(versions.values())) == 1, f'Version mismatch: {versions}'
print(f'All manifests at version {next(iter(versions.values()))}')
" && \
echo "ALL PLATFORM MANIFESTS PRESENT"
```

Expected final line: `ALL PLATFORM MANIFESTS PRESENT`. Version check confirms all three new manifests are at `2.0.0`.

- [ ] **Step 2: Note — `.claude-plugin/plugin.json` and `marketplace.json` are bumped to 2.0.0 in sub-plan 5 (docs + version bump), not here.**

---

## Out of scope

- `.claude-plugin/plugin.json` version bump → sub-plan 5.
- Installer auto-detection logic → sub-plan 4.
- `CLAUDE.md` invariants → sub-plan 5.

---

## Self-Review Checklist

1. **Spec coverage:** Spec §7.1 (manifests for Codex, Cursor, Antigravity), §7.2 (context files CLAUDE.md/GEMINI.md/AGENTS.md). Tasks 1-6 cover each. ✅
2. **Placeholder scan:** No `TBD`/`TODO` inside task content (legitimate caveats are quoted from spec). ✅
3. **Type/name consistency:** `2.0.0` version string identical across Tasks 1, 2, 4 and verified by Task 7 script. Schema field names (`skills`, `agents`, `commands`, `hooks`) match the spec §7.1 manifest examples. ✅
