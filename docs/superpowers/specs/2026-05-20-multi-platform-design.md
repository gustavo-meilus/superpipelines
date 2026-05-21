# Superpipelines — Multi-Platform Design Spec

**Date:** 2026-05-20
**Status:** Approved
**Version target:** v2.0.0

---

## Table of Contents

1. [Context and Problem Statement](#1-context-and-problem-statement)
2. [Ecosystem Analysis](#2-ecosystem-analysis)
3. [Existing Assets](#3-existing-assets)
4. [Goals and Non-Goals](#4-goals-and-non-goals)
5. [Architecture Overview](#5-architecture-overview)
6. [Execution Tier Model](#6-execution-tier-model)
7. [Distribution Architecture](#7-distribution-architecture)
8. [Platform Dispatch Skill](#8-platform-dispatch-skill-sk-platform-dispatch)
9. [Installer Design](#9-installer-design)
10. [File Layout Changes](#10-file-layout-changes)
11. [Platform Compatibility Matrix](#11-platform-compatibility-matrix)
12. [Migration: superpipelines-opencode](#12-migration-superpipelines-opencode)
13. [Invariants](#13-invariants)

---

## 1. Context and Problem Statement

Superpipelines (v1.0.6) is a Claude Code-only plugin. It orchestrates multi-agent AI pipelines using Claude Code-specific primitives:

- `Task()` — spawns isolated subagent workers
- `.claude-plugin/plugin.json` + `marketplace.json` — Claude Code plugin manifest
- `.claude/agents/` — subagent type registry
- `isolation: worktree`, `permissionMode`, `maxTurns` — CC frontmatter fields

The broader agent ecosystem (Codex App/CLI, Cursor/Windsurf/Cline, OpenCode, Antigravity CLI, Gemini CLI) has converged on the SKILL.md open standard for skills discovery, and most platforms now support SKILL.md-based plugins. However, each platform has its own plugin manifest format, installation mechanism, and subagent primitive (or lack thereof).

A parallel port (`superpipelines-opencode`) revealed that OpenCode requires a fundamentally different agent architecture: native subagent support via `mode: subagent`, agent bodies ≤150 lines (vs CC's zero-body Lean Agents), a separate scope root (`.opencode/`), and platform-specific artifacts. These are intentional platform differences, not drift. This spec defines the unified architecture that treats both CC and OC as first-class targets while adding Codex, Cursor/Windsurf/Cline, and Antigravity.

---

## 2. Ecosystem Analysis

### Verified Platform Capabilities (May 2026)

| Platform | SKILL.md | Plugin Manifest | Subagent primitive | Install mechanism |
|---|---|---|---|---|
| Claude Code | ✅ | `.claude-plugin/plugin.json` + `marketplace.json` | `Task(subagent_type, ...)` | `claude plugin install` |
| Codex App/CLI | ✅ | `.codex-plugin/plugin.json` | Codex worktree agents (parallel) | Codex marketplace / `npx skills add -a codex` |
| OpenCode | ✅ | `.opencode/opencode.json` + compiled JS entry | `mode: subagent` agents (bodies ≤150 lines) | `.opencode/skills/`, `~/.opencode/skills/` |
| Cursor | ✅ | `.cursor-plugin/plugin.json` | Background agent (limited) | `npx skills add -a cursor` |
| Windsurf/Cline | ✅ | Rule files | None | `npx skills add -a windsurf/cline` |
| Antigravity CLI 2.0 | ✅ | Antigravity plugin format (replaces `gemini-extension.json`) | Dynamic Subagents (native parallel) | `agy plugin install` / `/plugin install` in-CLI |
| ~~Gemini CLI~~ | ~~✅~~ | ~~`gemini-extension.json`~~ | ~~None~~ | **DEPRECATED June 18, 2026** → migrate to Antigravity CLI via `agy plugin import gemini` |

### Reference Project Lessons

**obra/superpowers (v5.1.0) — Gold standard for distribution:**
- Per-platform manifests (`.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`) in one repo
- `gemini-extension.json` for Gemini/Antigravity
- Shared `skills/` dir across all platforms
- `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` per-platform context files
- **Gap:** No pipeline orchestration — methodology skills only, no execution model

**JuliusBrussee/caveman — Gold standard for universal installation:**
- 30+ agent platforms from one `install.sh` + `bin/install.js`
- Auto-detects installed agents, runs platform-native install for each
- `npx skills add` as universal fallback for IDE agents
- Unified uninstaller, `--dry-run`, `--only <platform>` flags
- **Gap:** Single-purpose (token compression), no orchestration, no state management

**Key insight from both:** Skills are already platform-agnostic. The distribution layer (manifests + installer) is what requires per-platform work.

---

## 3. Existing Assets

### This repo (superpipelines — Claude Code, v1.0.6)
- 7 pipeline agents (Lean Agents, zero-body, protocol skills pattern)
- ~20 skills covering creation, execution, audit, patterns, utilities
- 8 commands (`/new-pipeline`, `/run-pipeline`, `/audit-pipeline`, etc.)
- Marketplace listing via `marketplace.json`

### superpipelines-opencode (v1.0.0 — parallel first-class implementation)
- OC-native agent frontmatter: `mode: subagent`, `hidden: true`, `steps:`, `permission: { edit: allow, bash: allow }`, bodies ≤150 lines
- `task: {"*": "deny"}` on task-executor — prevents recursive subagent spawning
- Scope root: `.opencode/` (project) / `~/.opencode/` (user) — separate from CC's `.claude/`
- `$OPENCODE_PLUGIN_ROOT` env var (vs CC's `$CLAUDE_PLUGIN_ROOT`)
- `sk-opencode-code-conventions` skill (OC-specific, not in CC)
- Compiled TypeScript entry point (`dist/index.js`) for slash command routing in OC

**OC innovations not yet in CC — to backport:**
- Model preference selection per step in `creating-a-pipeline` Phase 2
- `{P}.md` run command file as Phase 6 artifact (enables `/superpipelines:{P}` direct invocation)
- Version compatibility advisory check in `running-a-pipeline` (major version diff → warning)
- `plugin_version` stamped in every generated artifact including `pipeline-state.json`

---

## 4. Goals and Non-Goals

### Goals (Phase 1)

- **G1:** Single repo supports Claude Code, Codex App/CLI, Cursor/Windsurf/Cline, and Antigravity CLI natively
- **G2:** Pipeline *creation* workflow is identical across all platforms
- **G3:** Pipeline *execution* degrades gracefully on platforms without native subagent support (Cursor, Windsurf, Cline, Codex) via single-agent mode; OpenCode uses `mode: subagent`; Antigravity CLI 2.0 uses Dynamic Subagents (dispatch primitive pending verification)
- **G4:** One installer (`install.sh` / `install.ps1`) auto-detects and wires up all supported platforms
- **G5:** OpenCode is a first-class target with its own agent files, scope root (`.opencode/`), and platform manifest — not treated as a CC cross-load consumer
- **G6:** Skills remain the canonical source of intelligence — zero duplication of logic in platform manifests
- **G7:** OC innovations (run command, model selection, version check) are backported to CC; `superpipelines-opencode` continues as the OC platform release

### Non-Goals (Phase 1)

- **NG1:** Merging CC and OC agent files into a single format (platform agent schemas are fundamentally different)
- **NG3:** Gemini CLI as a separate target (covered by Antigravity's `gemini-extension.json` compatibility)
- **NG4:** True parallel execution on Cursor/Windsurf/Cline/Antigravity (graceful degradation to sequential is sufficient)
- **NG5:** Eliminating the separate `superpipelines-opencode` repo (OC's compiled JS entry point requirement makes full unification impractical without a build system)

---

## 5. Architecture Overview

The transformation has two independent axes:

```
┌─────────────────────────────────────────────────────────┐
│  AXIS 1: DISTRIBUTION                                    │
│  How Superpipelines gets installed on each platform      │
│                                                          │
│  .claude-plugin/     → Claude Code marketplace          │
│  .codex-plugin/      → Codex marketplace                │
│  .cursor-plugin/     → npx skills add / IDE             │
│  gemini-extension.json → Antigravity / Gemini           │
│  AGENTS.md           → Universal fallback               │
│  install.sh          → Auto-detector                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  AXIS 2: RUNTIME                                         │
│  How pipelines execute per platform                      │
│                                                          │
│  Tier 1 (Claude Code):                                  │
│    Task(subagent_type, ...) → true parallel subagents   │
│    Zero-body agents + protocol skills (Lean Agents)     │
│    Scope root: .claude/                                  │
│                                                          │
│  Tier 1b (OpenCode):                                    │
│    mode: subagent agents → native OC subagent dispatch  │
│    Agent bodies <= 150 lines (no protocol companion)    │
│    Scope root: .opencode/                               │
│    {P}.md run commands per pipeline                     │
│                                                          │
│  Tier 1c (Antigravity CLI 2.0):                         │
│    Dynamic Subagents (native parallel, Go CLI "agy")   │
│    Skills/Hooks/SKILL.md preserved from Gemini CLI     │
│    Scheduled Tasks (background automation)              │
│    Dispatch mechanism: TBD (⚠️ needs official docs)    │
│                                                          │
│  Tier 2 (Codex, Cursor/Windsurf/Cline):                │
│    sk-platform-dispatch → inline sequential execution   │
│    Protocol skills loaded via Skill tool                 │
│    Same artifacts, same state format, same outputs      │
└─────────────────────────────────────────────────────────┘
```

**Core principle:** Skills are the canonical source of intelligence. Platform manifests make skills discoverable. Agent `.md` files are platform-specific (CC: zero-body Lean Agents; OC: bodies ≤150 lines). Tier 2 platforms execute protocol skills inline without agent frontmatter. Antigravity (Tier 1c) upgraded from original Tier 2 assessment — Dynamic Subagents confirmed; dispatch primitive pending official docs.

---

## 6. Execution Tier Model

### Tier 1 — Multi-Agent (Claude Code)

Current behavior, unchanged. The orchestrator uses `Task(subagent_type, prompt)` to spawn isolated workers. Worktree isolation available for parallel patterns.

### Tier 1b — Native Subagent (OpenCode)

OpenCode has its own subagent dispatch mechanism distinct from CC's `Task()`:

- Agent files use `mode: subagent` + `hidden: true` frontmatter
- Bodies contain protocol inline (≤150 lines) — no separate companion protocol skill
- `task: {"*": "deny"}` on leaf workers prevents recursive spawning
- Scope root is `.opencode/` (project) or `~/.opencode/` (user) — separate from CC's `.claude/`
- `$OPENCODE_PLUGIN_ROOT` resolves the plugin installation path
- Run commands: each pipeline generates `superpipelines/{P}/{P}.md` enabling `/superpipelines:{P}` direct invocation
- Version compatibility: `running-a-pipeline` emits advisory warning on major version mismatch

OC pipeline execution is multi-agent (not single-agent) but uses OC's native dispatch, not `Task()`. Parallel fan-out degrades to sequential because OC does not have worktree isolation equivalent.

### Tier 1c — Dynamic Subagents (Antigravity CLI 2.0)

Antigravity CLI 2.0 (announced Google I/O May 19, 2026) is the successor to Gemini CLI, which is deprecated June 18, 2026. Key facts:

- **Go-based CLI** (`agy` command) — snappier than Gemini CLI's Node.js base
- **Dynamic Subagents**: native parallel agent orchestration (confirmed; dispatch primitive details pending official docs verification)
- **Scheduled Tasks**: background automation — agents run without locking terminal (similar to Codex Automations)
- **Plugin format**: Antigravity plugins (renamed from Gemini CLI "extensions"). Migration: `agy plugin import gemini` converts old `gemini-extension.json` extensions
- **Plugin install**: `/plugin install {name}@{marketplace}` within CLI, or `npx antigravity-awesome-skills --antigravity`
- **Skills/Hooks/SKILL.md**: all preserved from Gemini CLI
- **Context file**: `GEMINI.md` continues unchanged (confirmed — migration guide explicitly states "GEMINI.md and AGENTS.md in the workspace, plus ~/.gemini/GEMINI.md globally, all keep working unchanged"). No ANTIGRAVITY.md introduced.
- **Skills directories**: `~/.gemini/antigravity/skills/` (global, auto-loaded), `.agents/skills/` (workspace). Legacy `.gemini/skills/` must be manually relocated.
- **Workflows (Scheduled Tasks)**: `.md` files in `.agents/workflows/` (workspace) or `~/.gemini/antigravity/global_workflows/<NAME>.md` (global). Cron-style scheduling.
- **Rules**: `.agents/rules/` directory (workspace), `~/.gemini/GEMINI.md` (global).
- **Models**: Gemini 3.5 Flash default (4x faster than Gemini 3.1 Pro per benchmarks)

⚠️ **Gap**: Specific agent frontmatter schema for Antigravity Dynamic Subagents not publicly documented. Known: agents can spawn subagents, depth cap is recommended to prevent budget overruns, subagents run asynchronously (non-blocking terminal). Unknown: whether a `Task()`-equivalent dispatch primitive is exposed to skills, or whether orchestration is model-driven only. **Implementation decision**: treat Antigravity as Tier 1c if Dynamic Subagent dispatch is confirmed available to skills; fall back to Tier 2 (single-agent inline) otherwise. Verify before implementing Tier 1c dispatch logic.

### Tier 2 — Single-Agent (Codex, Cursor/Windsurf/Cline)

The orchestrator (the model running the entry skill) executes all pipeline steps inline:

```
For each step in topology.json (dependency order):
  1. Skill(tool, "{step}-protocol")     — load protocol
  2. Execute protocol using own tools   — Read, Write, Edit, Bash, Glob, Grep
  3. Write outputs to canonical paths
  4. Update pipeline-state.json
  5. Check status (DONE / BLOCKED / etc.)
  6. If BLOCKED: surface to user; stop
```

**Tier detection:** Orchestrator checks whether `Task` tool is present in its available tool list. Secondary signal: check for `CLAUDE_CODE` environment variable or `.claude-plugin/` directory in context.
- `Task` available → Tier 1
- `Task` not available → Tier 2
- Ambiguous: default to Tier 2 (safe fallback — sequential always works)

**Pattern behavior on Tier 2:**

| Pattern | Tier 1 (CC) | Tier 1b (OC) | Tier 2 (Codex/Cursor/Antigravity) |
|---|---|---|---|
| Sequential | Multi-agent | Native OC subagents | Single-agent inline |
| Parallel fan-out | True parallel | Sequential (no worktree) | Sequential |
| Iterative loop | Separate worker per cycle | Native OC agents | Inline loop |
| Human-gated | Gate after Task() | Gate after OC subagent | Gate after inline exec |
| Spec-Driven (P5) | Parallel tasks + two-stage review | Sequential tasks + native review | Sequential tasks + inline review |

**Key invariants:**
- Pipeline data artifacts (topology.json, spec.md, state.json, outputs) are identical across Tier 1 and Tier 2.
- A pipeline created on CC can run on Tier 2 platforms without modification.
- A pipeline created on OC (Tier 1b) uses OC-specific agent frontmatter and run commands — these agents are non-portable to CC without re-scaffolding.

---

## 7. Distribution Architecture

### 7.1 Platform Manifests

#### Claude Code (existing)
```
.claude-plugin/
  plugin.json      ← $schema: claude-code-plugin-manifest.json
  marketplace.json ← $schema: claude-code-marketplace.json
```

#### Codex App/CLI (new)
```
.codex-plugin/
  plugin.json      ← Codex plugin schema
                     skills: ./skills/
                     agents: ./agents/
                     commands: ./commands/
```

#### Cursor / IDE agents (new)
```
.cursor-plugin/
  plugin.json      ← Cursor plugin schema
                     skills: ./skills/
                     hooks: ./hooks/hooks-cursor.json
```
Distribution via `npx skills add superpipelines -a cursor` (and equivalents for windsurf, cline).

#### Antigravity CLI 2.0 (new — replaces Gemini CLI target)
```
gemini-extension.json    ← Plugin manifest (Antigravity CLI continues reading gemini-extension.json;
                           plugin format renamed "Antigravity plugins" but migration via
                           `agy plugin import gemini` uses same schema. Exact new manifest
                           filename for fresh plugins is ⚠️ TBD — official docs are JS SPA.
                           Safe default: keep gemini-extension.json; it migrates automatically.)

GEMINI.md                ← Context file (confirmed unchanged — migration guide: "GEMINI.md
                           and AGENTS.md all keep working unchanged". NO ANTIGRAVITY.md.)

.agents/
  skills/                ← Workspace skills (canonical Antigravity location)
  workflows/             ← Scheduled Tasks (.md files, cron-style)
  rules/                 ← Rules (workspace-level)
```
Global paths: `~/.gemini/antigravity/skills/` (skills), `~/.gemini/antigravity/global_workflows/` (workflows).

Install: `/plugin install superpipelines@superpipelines` within Antigravity CLI, or
`npx skills install superpipelines` for terminal-level.

Migration from Gemini extension: `agy plugin import gemini` auto-converts old format.

> **Gemini CLI**: No longer a distribution target. Deprecated June 18, 2026.

#### Universal fallback (new)
```
AGENTS.md               ← Platform-agnostic: introduces Superpipelines commands,
                          pipeline concepts, and trigger phrases for any AGENTS.md-aware tool
```

### 7.2 Context Files

| File | Platforms | Content |
|---|---|---|
| `CLAUDE.md` | Claude Code | Existing architecture reference |
| `GEMINI.md` | Antigravity CLI 2.0 | Context intro, commands, pipeline usage (confirmed unchanged from Gemini CLI — migration guide explicit) |
| `AGENTS.md` | OpenCode, universal | Commands, trigger phrases, pipeline overview |

### 7.3 OpenCode (Tier 1b — Maintained via superpipelines-opencode)

OpenCode is a first-class platform with its own dedicated repo (`superpipelines-opencode`). It is NOT cross-loading from CC's `.claude/` directory.

OC scope roots:
- Project: `<workspace>/.opencode/`
- User: `~/.opencode/`

OC uses a compiled JS entry point (`dist/index.js` via `opencode.json`) for slash command routing. The unified installer handles OC installation by directing users to `superpipelines-opencode`.

**Relationship between repos:**
- `superpipelines` (this repo) = CC + Tier 2 platforms
- `superpipelines-opencode` = OC Tier 1b platform
- Skills shared in spirit — kept in sync via periodic cross-repo backports
- Agent files are NOT shared — CC uses zero-body + protocol skill, OC uses bodies ≤150 lines

**From `superpipelines-opencode`, the installer (`bin/install.js --only opencode`) directs users to:**
```
https://github.com/gustavo-meilus/superpipelines-opencode
```

---

## 8. Platform Dispatch Skill (`sk-platform-dispatch`)

**New file:** `skills/sk-platform-dispatch/SKILL.md`

```yaml
name: sk-platform-dispatch
description: Platform detection and dispatch abstraction. Load before executing any pipeline step. Provides tier detection and single-agent execution protocol for Tier 2 platforms.
disable-model-invocation: true
user-invocable: false
```

**Protocol:**

```
DETECT:
  if Task tool available in current context:
    tier = 1  (Claude Code multi-agent)
  else:
    tier = 2  (single-agent inline)

DISPATCH(step, inputs):
  if tier == 1:
    Task(subagent_type=step.agent, prompt=build_prompt(step, inputs))
  else:
    Skill(step.protocol_skill, args=inputs)
    [execute inline]
    write outputs to step.output_paths
    return { status, outputs }

STATUS_PROTOCOL (both tiers):
  DONE            → proceed to next step
  DONE_WITH_CONCERNS → read concerns; proceed if observational; address if correctness
  NEEDS_CONTEXT   → re-dispatch with added context
  BLOCKED         → surface to user; stop; preserve state for resume
```

**Changes to `running-a-pipeline`:**
- Add Phase 0: load `sk-platform-dispatch`, set tier
- Tier 1: existing dispatch logic (unchanged)
- Tier 2: new inline loop using sk-platform-dispatch's DISPATCH protocol

---

## 9. Installer Design

A unified Node.js installer (`bin/install.js`) auto-detects all supported platforms and runs the appropriate install command. Mirrors caveman's installer architecture.

### Detection Matrix

| Platform ID | Detection signal | Install command |
|---|---|---|
| `claude-code` | `claude` binary on PATH | `claude plugin marketplace add ... && claude plugin install superpipelines@superpipelines` |
| `codex` | `codex` binary on PATH or `~/.codex/` config dir exists | Codex marketplace install |
| `cursor` | `.cursor/` config dir exists | `npx skills add superpipelines -a cursor` |
| `windsurf` | `.windsurf/` config dir exists | `npx skills add superpipelines -a windsurf` |
| `cline` | `.clinerules/` or Cline extension present | `npx skills add superpipelines -a cline` |
| `opencode` | `opencode` binary or `.opencode/` dir | Redirect to `superpipelines-opencode` (separate repo, OC Tier 1b) |
| `antigravity` | `agy` binary on PATH | Install `gemini-extension.json` + skills to `.agents/skills/`; `agy plugin import gemini` migrates from Gemini extension |

### Installer Flags

```
--all                 Install for all detected platforms
--only <id>           Install for one platform (repeatable)
--dry-run             Print commands, write nothing
--with-init           Drop rule files into current repo (.cursor/rules/, etc.)
--list                Print detection matrix and exit
--uninstall           Remove all installed platforms
--non-interactive     Never prompt; use defaults
```

### Shell Wrappers

```bash
# install.sh (macOS/Linux/WSL)
curl -fsSL https://raw.githubusercontent.com/.../main/install.sh | bash

# install.ps1 (Windows PowerShell)
irm https://raw.githubusercontent.com/.../main/install.ps1 | iex
```

---

## 10. File Layout Changes

### New files in this repo

```
.codex-plugin/
  plugin.json

.cursor-plugin/
  plugin.json

gemini-extension.json   ← Antigravity plugin manifest (migrates automatically via agy plugin import gemini)

AGENTS.md

GEMINI.md               ← Antigravity context file (confirmed — GEMINI.md unchanged in Antigravity CLI)

bin/
  install.js           ← Node.js unified installer

install.sh             ← Shell wrapper (macOS/Linux/WSL)
install.ps1            ← PowerShell wrapper (Windows)

hooks/
  hooks-cursor.json    ← Cursor-specific hook configuration

skills/
  sk-platform-dispatch/
    SKILL.md           ← NEW: platform detection + dispatch abstraction
```

### Modified files

```
skills/running-a-pipeline/SKILL.md
  — Add: load sk-platform-dispatch at start
  — Add: Tier 2 single-agent execution branch

skills/pipeline-runner-references/references/dispatch-protocols.md
  — Add: Tier 2 dispatch pseudocode section

skills/creating-a-pipeline/SKILL.md
  — Add: model preference question in Phase 2 (backport from OC)
  — Add: {P}.md run command to Phase 6 checklist (backport from OC)
  — Add: version compatibility advisory to running-a-pipeline (backport from OC)

skills/running-a-pipeline/SKILL.md
  — Add: load sk-platform-dispatch at start
  — Add: Tier 2 single-agent execution branch
  — Add: version compatibility advisory check (backport from OC)

skills/sk-pipeline-paths/SKILL.md
  — Add: Run Command path template: superpipelines/{P}/{P}.md (backport from OC)

.claude-plugin/plugin.json
  — Bump version to 2.0.0

.claude-plugin/marketplace.json
  — Bump version to 2.0.0

CLAUDE.md
  — Update architecture invariants (add MULTI_PLATFORM: TRUE, TIER_MODEL: 2-TIER)
  — Update project version to v2.0.0
```

### Unchanged files

All agent files, all existing skills (except running-a-pipeline and creating-a-pipeline noted above), all commands, hooks/hooks.json, all reference files.

---

## 11. Platform Compatibility Matrix

| Feature | Claude Code (T1) | OpenCode (T1b) | Antigravity 2.0 (T1c) | Codex (T2) | Cursor/Windsurf (T2) |
|---|---|---|---|---|---|
| Pipeline creation | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Pipeline auditing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sequential (P1) | ✅ Multi-agent | ✅ OC native | ✅ Dynamic Subagents | ✅ Single-agent | ✅ Single-agent |
| Parallel fan-out (P2) | ✅ True parallel | ⚠️ Sequential | ✅ Dynamic Subagents | ⚠️ Sequential | ⚠️ Sequential |
| Iterative loop (P3) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Human-gated (P4) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Spec-Driven (P5) | ✅ Multi-agent | ✅ OC native | ✅ Dynamic Subagents | ✅ Single-agent | ✅ Single-agent |
| Background / scheduled | ❌ | ❌ | ✅ Scheduled Tasks | ✅ Automations | ❌ |
| Worktree isolation | ✅ | ❌ | ⚠️ unverified | ❌ | ✅ native |
| Named pipeline command | `/superpipelines:{P}` | `/superpipelines:{P}` | Via workflows (.agents/workflows/{P}.md) | ❌ | ❌ |
| Version compat check | ❌ | ✅ advisory | ❌ | ❌ | ❌ |
| Model-per-step | ❌ | ✅ | ⚠️ unverified | ❌ | ❌ |
| State management | ✅ | ✅ | ✅ | ✅ | ✅ |
| Slash commands | ✅ native | ✅ native | ✅ native | ✅ | ⚠️ per-session |
| Plugin marketplace | ✅ | ❌ | ✅ (`agy`) | ✅ | ❌ |
| Installer auto-detect | ✅ | ✅ (→ OC repo) | ✅ (`agy` on PATH) | ✅ | ✅ |

---

## 12. Relationship: superpipelines + superpipelines-opencode

### Two repos, coordinated releases

`superpipelines` (this repo) and `superpipelines-opencode` are sibling repositories, each targeting distinct runtime tiers. Neither is deprecated.

| | superpipelines | superpipelines-opencode |
|---|---|---|
| Tier | 1 (CC) + 2 (Codex/Cursor/Antigravity) | 1b (OpenCode native) |
| Agent format | Zero-body + protocol skill | Bodies ≤150 lines |
| Scope root | `.claude/` | `.opencode/` |
| Plugin manifest | `.claude-plugin/plugin.json` | `.opencode/opencode.json` + `dist/index.js` |
| Env var | `$CLAUDE_PLUGIN_ROOT` | `$OPENCODE_PLUGIN_ROOT` |

### Backports: OC → CC (this repo)

The following OC innovations are backported to `creating-a-pipeline` and `running-a-pipeline` in this repo:

1. **Model preference per step** — Phase 2 of `creating-a-pipeline` asks user to assign model tiers (deep/fast) to steps; embedded in generated agent frontmatter
2. **`{P}.md` run command artifact** — Phase 6 generates `superpipelines/{P}/{P}.md`; added to CC's `sk-pipeline-paths` path table and `creating-a-pipeline` Phase 6 checklist
3. **Version compatibility advisory** — `running-a-pipeline` warns on major version mismatch between pipeline's `plugin_version` and installed plugin
4. **`plugin_version` in `pipeline-state.json`** — already partially in CC; made mandatory in state initialization

### Sync discipline

Skills that are logically identical across repos (e.g., `creating-a-pipeline`, `running-a-pipeline`, `sk-pipeline-patterns`) must be kept in sync. Recommended: track divergence via a `SYNC.md` file in each repo listing which skills have been synced and at what version.

---

## 13. Invariants

- `MULTI_PLATFORM: TRUE` — superpipelines targets CC + Codex + Cursor/Windsurf/Cline + Antigravity CLI 2.0; superpipelines-opencode targets OC; Gemini CLI is retired
- `TIER_MODEL: 4-TIER` — Tier 1 (CC multi-agent Task()), Tier 1b (OC mode:subagent), Tier 1c (Antigravity Dynamic Subagents — dispatch primitive TBD), Tier 2 (single-agent inline)
- `SKILL_PRIMACY: TRUE` — Intelligence lives in SKILL.md; platform manifests are discovery-only
- `ARTIFACT_PORTABILITY: CC_TO_TIER2` — Pipelines from CC run on Tier 2 without modification; OC pipelines use OC-specific agent frontmatter (not portable to CC without re-scaffolding)
- `LEAN_AGENTS_CC_ONLY` — Zero-body + protocol skill pattern is CC-specific; OC uses bodies ≤150 lines; Tier 2 uses protocol skills inline
- `OC_FIRST_CLASS: TRUE` — superpipelines-opencode is a permanent sibling repo, not deprecated
- `SYNC_DISCIPLINE: REQUIRED` — Shared skills must be kept in sync across both repos via SYNC.md tracking
