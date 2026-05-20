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
13. [MCP — Phase 2 Scope](#13-mcp--phase-2-scope)
14. [Invariants](#14-invariants)

---

## 1. Context and Problem Statement

Superpipelines (v1.0.6) is a Claude Code-only plugin. It orchestrates multi-agent AI pipelines using Claude Code-specific primitives:

- `Task()` — spawns isolated subagent workers
- `.claude-plugin/plugin.json` + `marketplace.json` — Claude Code plugin manifest
- `.claude/agents/` — subagent type registry
- `isolation: worktree`, `permissionMode`, `maxTurns` — CC frontmatter fields

The broader agent ecosystem (Codex App/CLI, Cursor/Windsurf/Cline, OpenCode, Antigravity CLI, Gemini CLI) has converged on the SKILL.md open standard for skills discovery, and most platforms now support SKILL.md-based plugins. However, each platform has its own plugin manifest format, installation mechanism, and subagent primitive (or lack thereof).

A parallel port effort (`superpipelines-opencode`) revealed that maintaining separate repos leads to architectural drift: the OpenCode version lost Lean Agents, re-introduced agent bodies, and diverged on model IDs and permission schemas. This spec defines the unified architecture.

---

## 2. Ecosystem Analysis

### Verified Platform Capabilities (May 2026)

| Platform | SKILL.md | Plugin Manifest | Subagent primitive | Install mechanism |
|---|---|---|---|---|
| Claude Code | ✅ | `.claude-plugin/plugin.json` + `marketplace.json` | `Task(subagent_type, ...)` | `claude plugin install` |
| Codex App/CLI | ✅ | `.codex-plugin/plugin.json` | Codex worktree agents (parallel) | Codex marketplace / `npx skills add -a codex` |
| OpenCode | ✅ | `.opencode/` + compiled JS | `mode: subagent` agents | Cross-loads `.claude/skills/` + own dirs |
| Cursor | ✅ | `.cursor-plugin/plugin.json` | Background agent (limited) | `npx skills add -a cursor` |
| Windsurf/Cline | ✅ | Rule files | None | `npx skills add -a windsurf/cline` |
| Antigravity CLI | ✅ (soft) | `gemini-extension.json` + AGENTS.md | Task Groups (planning/fast) | `antigravity extensions install` |
| Gemini CLI | ✅ | `gemini-extension.json` | None native | `gemini extensions install` |

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

### superpipelines-opencode (v1.0.0 — to be deprecated)
- OpenCode-specific agent frontmatter (`mode: subagent`, `permission: {...}`)
- Compiled TypeScript plugin (`dist/index.js`)
- Diverged from CC version: missing Lean Agents, protocol skills absent, agents have bodies
- Backport candidates: model preference prompting in `creating-a-pipeline` Phase 2

---

## 4. Goals and Non-Goals

### Goals (Phase 1)

- **G1:** Single repo supports Claude Code, Codex App/CLI, Cursor/Windsurf/Cline, and Antigravity CLI natively
- **G2:** Pipeline *creation* workflow is identical across all platforms
- **G3:** Pipeline *execution* degrades gracefully on platforms without `Task()` via single-agent mode
- **G4:** One installer (`install.sh` / `install.ps1`) auto-detects and wires up all supported platforms
- **G5:** OpenCode continues to work via cross-loading from `.claude/skills/` (no additional OpenCode-specific files required)
- **G6:** Skills remain the canonical source of intelligence — zero duplication of logic in platform manifests
- **G7:** `superpipelines-opencode` repo is deprecated; improvements backported to this repo

### Non-Goals (Phase 1)

- **NG1:** Compiled TypeScript plugin for any platform (OpenCode uses cross-loading instead)
- **NG2:** MCP server (Phase 2)
- **NG3:** Gemini CLI as a separate target (covered by Antigravity's `gemini-extension.json` compatibility)
- **NG4:** True parallel execution on non-CC platforms (graceful degradation to sequential is sufficient)
- **NG5:** Platform-specific agent frontmatter files (agent files are CC-specific; non-CC platforms use single-agent mode with protocol skills)

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
│                                                          │
│  Tier 2 (all others):                                   │
│    sk-platform-dispatch → inline sequential execution   │
│    Protocol skills loaded via Skill tool                 │
│    Same artifacts, same state format, same outputs      │
└─────────────────────────────────────────────────────────┘
```

**Core principle:** Skills are the source of intelligence. Platform manifests are thin wrappers that make skills discoverable. Agent `.md` files are Claude Code-specific and ignored by other platforms. On Tier 2 platforms, protocol skills execute inline without needing agent frontmatter.

---

## 6. Execution Tier Model

### Tier 1 — Multi-Agent (Claude Code)

Current behavior, unchanged. The orchestrator uses `Task(subagent_type, prompt)` to spawn isolated workers. Worktree isolation available for parallel patterns.

### Tier 2 — Single-Agent (Codex, Cursor/Windsurf/Cline, Antigravity, OpenCode)

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

| Pattern | Tier 1 | Tier 2 |
|---|---|---|
| Sequential | Multi-agent | Single-agent (identical outcome) |
| Parallel fan-out | True parallel via Task() | Sequential fan-out (same outputs, slower) |
| Iterative loop | Separate worker per cycle | Inline loop (same logic) |
| Human-gated | Gate after Task() result | Gate after inline execution |
| Spec-Driven (P5) | Parallel tasks + two-stage review | Sequential tasks + inline review |

**Key invariant:** All pipeline artifacts (topology.json, spec.md, state.json, outputs) are identical across tiers. A pipeline created on Claude Code runs on Codex without modification.

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

#### Antigravity CLI + Gemini CLI (new)
```
gemini-extension.json    ← { name, version, contextFileName: "GEMINI.md" }
GEMINI.md                ← Antigravity/Gemini context: commands, usage, pipelines intro
```

#### Universal fallback (new)
```
AGENTS.md               ← Platform-agnostic: introduces Superpipelines commands,
                          pipeline concepts, and trigger phrases for any AGENTS.md-aware tool
```

### 7.2 Context Files

| File | Platforms | Content |
|---|---|---|
| `CLAUDE.md` | Claude Code | Existing architecture reference |
| `GEMINI.md` | Antigravity, Gemini CLI | Context intro, commands, pipeline usage |
| `AGENTS.md` | OpenCode, Antigravity, universal | Commands, trigger phrases, pipeline overview |

### 7.3 OpenCode (Cross-Loading — Zero New Files)

OpenCode natively cross-loads skills from three directories:
1. `.claude/skills/` (installed by CC plugin)
2. `.opencode/skills/` (OpenCode native)
3. `~/.opencode/skills/` (user global)

**If the user also has Claude Code:** CC plugin install populates `.claude/skills/` automatically. OpenCode discovers all pipeline skills with zero additional steps.

**If the user has OpenCode only (no CC):** The installer (`bin/install.js --only opencode`) copies skill files directly to `~/.opencode/skills/superpipelines/` and writes `AGENTS.md` to the workspace root.

**No TypeScript compilation required.** OpenCode runs pipelines in Tier 2 (single-agent mode) using protocol skills. The compiled TypeScript plugin in `superpipelines-opencode` is deprecated.

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
| `opencode` | `opencode` binary or `.opencode/` dir | Writes AGENTS.md; skills auto-discovered |
| `antigravity` | `antigravity` binary on PATH (soft probe — pass `--only antigravity` to force) | `antigravity extensions install https://github.com/gustavo-meilus/superpipelines` |
| `gemini` | `gemini` binary | `gemini extensions install https://github.com/...` |

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

gemini-extension.json

AGENTS.md

GEMINI.md

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
  — Add: model preference question in Phase 2 (backport from superpipelines-opencode)
  — No structural changes

skills/sk-pipeline-paths/SKILL.md
  — No changes (paths are already platform-agnostic)

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

| Feature | Claude Code | Codex | OpenCode | Cursor/Windsurf | Antigravity |
|---|---|---|---|---|---|
| Pipeline creation | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Pipeline auditing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sequential execution (P1) | ✅ Multi-agent | ✅ Single-agent | ✅ Single-agent | ✅ Single-agent | ✅ Single-agent |
| Parallel fan-out (P2) | ✅ True parallel | ⚠️ Sequential | ⚠️ Sequential | ⚠️ Sequential | ⚠️ Sequential |
| Iterative loop (P3) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Human-gated (P4) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Spec-Driven (P5) | ✅ Multi-agent | ✅ Single-agent | ✅ Single-agent | ✅ Single-agent | ✅ Single-agent |
| Worktree isolation | ✅ | ❌ | ❌ | ✅ native | ❓ |
| State management | ✅ | ✅ | ✅ | ✅ | ✅ |
| Slash commands | ✅ | ✅ | ⚠️ via AGENTS.md | ⚠️ per-session | ⚠️ via AGENTS.md |
| Installer auto-detect | ✅ | ✅ | ✅ | ✅ | ✅ (soft probe) |
| Plugin marketplace | ✅ | ✅ | ❌ | ❌ | ❓ |

---

## 12. Migration: superpipelines-opencode

### Backport to main repo

The following improvements from `superpipelines-opencode` are backported to this repo:
- Model preference prompting in `creating-a-pipeline` Phase 2 (let users assign models per step)
- Updated model catalog in `skills/change-models/references/model-catalog.md`

### Deprecation

`superpipelines-opencode` repo is archived after v2.0.0 ships. Its README is updated to redirect users to the main `superpipelines` repo. OpenCode users install via Claude Code plugin (cross-loading handles skill discovery automatically).

### Why compiled TS is not needed

The compiled TypeScript plugin in `superpipelines-opencode` was required because OpenCode's slash command system needed a JS entry point. However:
1. OpenCode already cross-loads skills from `.claude/skills/` — pipeline skills are discoverable without any additional files
2. Slash commands in OpenCode can be triggered via natural language or AGENTS.md instructions
3. Tier 2 single-agent mode requires no agent frontmatter — only protocol skills

---

## 13. MCP — Phase 2 Scope

An optional `superpipelines-mcp` server is deferred to Phase 2. It would expose:

| Primitive | Value |
|---|---|
| Resource: `registry` | List all pipelines in scope |
| Resource: `topology/{P}` | Read pipeline graph |
| Resource: `state/{P}/{runId}` | Read live execution state |
| Tool: `get_pipeline_status` | Query run status |
| Tool: `write_state` | Update pipeline state |

MCP does **not** enable cross-platform subagent spawning (MCP cannot run AI models). Its value is pipeline introspection and state management for IDE dashboards and CI/CD integrations.

---

## 14. Invariants

- `MULTI_PLATFORM: TRUE` — Plugin supports Claude Code, Codex, Cursor/Windsurf/Cline, OpenCode, Antigravity
- `TIER_MODEL: 2-TIER` — Tier 1 (multi-agent, CC only), Tier 2 (single-agent, all others)
- `SKILL_PRIMACY: TRUE` — All intelligence lives in SKILL.md files; platform manifests are discovery-only
- `ARTIFACT_PORTABILITY: TRUE` — Pipelines created on CC run on any Tier 2 platform without modification
- `NO_COMPILED_PLUGINS` — No TypeScript compilation in Phase 1; SKILL.md + JSON manifests only
- `LEAN_AGENTS_CC_ONLY` — Zero-body agent files are CC-specific; Tier 2 uses protocol skills inline
- `SINGLE_REPO: TRUE` — All platform support lives in `superpipelines` repo; `superpipelines-opencode` is deprecated
