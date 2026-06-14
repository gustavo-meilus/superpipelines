# Design Spec — Unified `.superpipelines/` Layout & Data-Only Pipelines

> Status: **APPROVED — spec gate passed 2026-06-14.**
> Author: brainstorming session, 2026-06-13.
> Locked at gate: dispatch model = **Option A (materialize-at-runtime)**; rollout = **minor bump + dual-read back-compat**.

## 1. Problem & Goal

Today a Superpipelines install touches a different per-tool location for every platform
(`.claude/`, `.opencode/`, `.agents/codex/`, `.agents/antigravity/`, `.superpipelines/`),
and generated pipelines are persisted under per-tier **scope roots**. That split forces a
heavy cross-tier machinery at run time (`ENUMERATE_ALL_SCOPE_ROOTS` over 5 roots,
`PORTABILITY_REWRITE`, `source_tier`/`runtime_tier` path rewriting, cross-tier resume path
revalidation) and makes a pipeline non-portable: you cannot copy a pipeline folder to
another machine/tool and have it "just run."

**Goals (from the brief):**
1. Simplify installation — installer only ensures the bundle is present per tool.
2. Simplify Phase 0 — collapse multi-root discovery so it is cheap and not re-derived every run.
3. Make pipelines **migratable / copy-paste portable** across tools and projects.
4. Pipelines behave as standalone features for any tool or project.

**Locked decisions (this session):**
- **Architecture:** *Data-only pipelines + per-tool bundle stays.* (AskUserQuestion #2)
- The **bundle** (shipped skills/agents/commands incl. the `running-a-pipeline` orchestrator)
  remains a native per-tool plugin installed by the existing 5 installers. No attempt to unify
  the bundle itself under `.superpipelines/`. It is installed once and rarely changes.
- **Dispatch model:** *Option A — materialize-at-runtime* (§5). Preserves structural write/review/worktree isolation.
- **Rollout:** minor version bump + dual-read back-compat (§8); old-root reads kept one major, old-root writes removed immediately.

## 2. Feasibility Findings (June 2026 official docs)

No tool natively scans a single shared `.superpipelines/` directory for **executable**
skills/agents. Each tool has its own discovery dir, and the "shared" conventions that exist
do not agree:

| Tool | Native discovery of skills/agents | Arbitrary external dir? | Shared/open convention |
|---|---|---|---|
| Claude Code (T1) | `.claude/`, `~/.claude/`; plugins via marketplace | **No settings key.** Only `--plugin-dir <path>` launch flag (repeatable, accepts `.zip`) or a *skills-dir plugin* in `~/.claude/skills/<name>/` that auto-loads with no install | — |
| Codex (T1d) | `.agents/skills` (walks cwd→repo root) + `$HOME/.agents/skills` + `/etc/codex/skills`; TOML agents | Fixed paths | `.agents/skills` (cross-tool) |
| OpenCode (T1b) | `.opencode/`, `~/.config/opencode/`, Claude-compat paths | **Yes** — `OPENCODE_CONFIG_DIR` env var → any dir, full structure | Claude-compat paths |
| Antigravity (T1c) | plugin dir `~/.gemini/antigravity-cli/plugins/<n>/`; `~/.gemini/skills` shared across all Antigravity tools | Fixed paths | `~/.gemini/skills` |
| Tier 2 | file-read inline; `npx skills` *copies* into `~/.cursor/skills` etc. | n/a (inline) | `~/.ai-skills/` default |

**Implication:** the only way to get true tool-agnostic, copy-paste pipelines is to stop
requiring tools to *discover* generated pipeline artifacts. Generated pipelines become **pure
data** that the always-installed bundle orchestrator **reads and interprets** — never
tool-registered skills/agents.

Sources: CC plugins (`code.claude.com/docs/en/plugins`), CC `.claude` dir
(`code.claude.com/docs/en/claude-directory`), Codex skills
(`developers.openai.com/codex/skills`), OpenCode config (`opencode.ai/docs/config/`),
Antigravity skills (Dazbo, Google Cloud Community), Vercel `skills` CLI changelog.

## 3. Target Layout

### 3.1 Single artifact root (replaces per-tier scope roots for generated pipelines)

```
<workspace>/.superpipelines/          # project + local scope (gitignore split, as today)
  registry.json
  pipelines/
    {P}/
      spec.md  plan.md  tasks.md
      topology.json
      agents/{agent-name}.md          # canonical, tool-neutral agent defs (data)
      skills/{step}/SKILL.md          # canonical step protocols (data)
      entry.md                        # the run-{P} orchestration body (data)
      audit/latest.md
      {P}.md                          # run command body (data)
  temp/{P}/{runId}/pipeline-state.json
  temp/{P}/edit-{ts}/                 # atomic staging (unchanged semantics)

~/.superpipelines/                    # user scope (global pipelines + model-preferences.json)
```

Notes:
- `model-preferences.json` already lives at `~/.superpipelines/` and
  `<workspace>/.superpipelines/` (the resolver's `LOAD_PREFS`), so the preference layer is
  **already unified** — no change there.
- Tier 2 already uses `.superpipelines/` as its scope root, so Tier 2 is the reference shape.
- **project vs local** scope semantics are preserved (the registry entry keeps its `scope`
  field); they continue to share one physical dir, distinguished by `.gitignore`.

### 3.2 What moves out of tool dirs

Generated executable artifacts that today live at scope-root top-level
(`skills/superpipelines/{P}/...`, `agents/superpipelines/{P}/...`) move **into**
`.superpipelines/pipelines/{P}/` as data. Nothing generated is written to `.claude/skills`,
`.agents/`, etc. anymore (except possibly an ephemeral materialization at dispatch — see §5
Option A).

## 4. Phase 0 Simplification (the run-time payoff)

| Today | After |
|---|---|
| `ENUMERATE_ALL_SCOPE_ROOTS` reads 5 per-tier roots × {workspace, user}, merges, annotates `source_tier` | Read `<workspace>/.superpipelines/registry.json` + `~/.superpipelines/registry.json`. Two reads, no per-tier loop. |
| `source_tier` / `runtime_tier` path divergence; `PORTABILITY_REWRITE` at every state write | Paths are tier-independent (all under `.superpipelines/`). `PORTABILITY_REWRITE` retires for **paths**. |
| Phase 0.6 portability validation rewrites `.claude/`→`.superpipelines/` in entry skills | No path rewrite needed. Phase 0.6 shrinks to the **frontmatter-compat** check only (see §6). |
| Phase 1 multi-root resume scan across 5 roots | Single-root resume scan. |
| Cross-tier resume path revalidation | Eliminated for paths (tier still affects dispatch + model resolution, not location). |

**Tier detection still runs** (Phase 0.25) — it selects the *dispatch mechanism* and *model
tiers*, which remain genuinely platform-specific. What collapses is everything **path- and
location-related**. This is the "Phase 0 not re-deriving location every run" win.

## 5. OPEN DECISION — Dispatch Model

The current DISPATCH contract assumes native discovery:
`native_task → Task(subagent_type=step.agent, …)` requires `step.agent` to be a **registered
agent type**; the Tier 2 inline loop opens with `Skill(step.protocol_skill)` requiring the
protocol to be a **discovered skill**. Data-only must change how an agent def becomes a
running subagent. Two models:

### Option A — Materialize-at-runtime (hybrid) — ✅ SELECTED AT GATE

Canonical defs are data in `.superpipelines/`. Just before dispatching a step, the
orchestrator writes that step's agent def into the active tool's **native agent dir** as an
ephemeral file, dispatches natively, and treats the native file as a disposable cache
(regenerated every run, never hand-maintained).

- **Per tier materialization target & translation:**
  - T1 (CC): write `~/.claude/agents/superpipelines/{P}/{agent}.md` (or workspace
    `.claude/agents/...`); `Task(subagent_type="{agent}", model=resolved.model)`. Frontmatter
    `tools:`, `permission-mode:`, `isolation: worktree` are emitted → **structurally enforced**.
  - T1b (OC): write under the OC scope root (or a dir named by `OPENCODE_CONFIG_DIR`);
    `mode: subagent`, `permission: { edit: deny }` on reviewers → structural.
  - T1d (Codex): write the agent **TOML** with `model`, `model_reasoning_effort`,
    `sandbox_mode = "read-only"` on reviewers → structural. (Phase 3 already rewrites Codex
    TOML at dispatch — this is a natural extension.)
  - T1c (Antigravity): dynamic subagents; orchestrator-tier only (unchanged).
  - T2: no subagent boundary — read def as data, run inline (same as Option B for this tier).
- **Pros:** preserves `WRITE_REVIEW_ISOLATION: STRUCTURAL_ON_TIER1_1B_1D`; keeps copy-paste
  portability (canonical source is the data def; native file is generated); reuses the
  existing per-tier translation logic already in DISPATCH.
- **Cons:** a transient per-tool write at run time (orchestrator-owned, auto-cleaned);
  slightly more orchestrator work per step; needs a cleanup contract (remove or namespace the
  materialized dir on completion).
- **Migration symmetry:** this is essentially what `creating-a-pipeline` does *once at
  scaffold time* today, moved to *per-run, from the data def*. The translation code mostly
  exists; it changes **when** and **from where** it runs.

### Option B — Pure data (convention-only enforcement)

Orchestrator spawns a generic subagent (`subagent_type=general-purpose` on CC, equivalent
elsewhere) with the agent's protocol injected as the prompt. Nothing is written to any tool
dir.

- **Pros:** simplest; truly zero tool-dir footprint; one code path across tiers.
- **Cons:** `tools:` restriction, `permission-mode:`, and `isolation: worktree` degrade to
  **convention-only on every tier** — the prompt asks, nothing enforces. This downgrades
  `WRITE_REVIEW_ISOLATION` from structural to convention for *all* generated pipelines (today
  only Tier 2 has that posture). Worktree isolation loss also affects Patterns 2/3/5 (the
  multi-writer-collision protection that Phase 0.6 Q7 hard-aborts to defend).

### Recommendation

**Option A.** It delivers the user's full goal (single data root, copy-paste portability,
Phase 0 collapse) **without** sacrificing the structural write/review/worktree isolation that
the framework treats as a non-negotiable security boundary. Option B's simplicity is real but
trades a security invariant the project elsewhere refuses to relax. If a future "ultra-light"
Tier wants B, it can be a per-tier capability flag (`materialize: false`), not the default.

## 6. Residual Cross-Tier Concerns After Unification

Unifying *location* does not erase all portability work — two things remain genuinely
platform-specific and must stay:

1. **Agent frontmatter dialect.** OC `mode: subagent`, Codex TOML, CC YAML differ. In the
   data-only model the **canonical def is tool-neutral** and the orchestrator translates at
   materialization (Option A) — which actually **solves** OC non-portability
   (`ARTIFACT_PORTABILITY: … OC_NOT_PORTABLE` could be upgraded). Phase 0.6's OC-frontmatter
   abort becomes unnecessary *if* defs are stored tool-neutral. This is a real bonus of the reframe.
2. **Dispatch mechanism + model tiers.** Still resolved per tier at run time (Phase 0.25 /
   0.45). Unchanged.

## 7. Impacted Components (touch-point inventory)

- `bin/install.js`, `install.sh`, `install.ps1` — no functional change required for the
  pipeline-portability goal (bundle install unchanged). Optional: messaging that pipelines
  live under `.superpipelines/`.
- `skills/sk-pipeline-paths/SKILL.md` — collapse per-tier scope-root table to single
  `.superpipelines/` root; retire `PORTABILITY_REWRITE` for paths; simplify
  `ENUMERATE_ALL_SCOPE_ROOTS` to one/two reads; update path templates (§3.1).
- `skills/running-a-pipeline/SKILL.md` — simplify Phase 0 (single-root discovery), Phase 0.6
  (drop path rewrite; keep/relocate frontmatter-compat note), Phase 1 (single-root resume),
  Phase 2 (`scope_root_dir` becomes constant). Phase ordering contract preserved.
- `skills/sk-platform-dispatch/SKILL.md` — DISPATCH reads agent def **from data** and
  materializes (Option A) before native dispatch; update Tier 2 inline loop to
  `Read(protocol file)` instead of `Skill(step.protocol_skill)`; update scope-root table.
- `skills/creating-a-pipeline/SKILL.md` (+ `pipeline-architect`) — write generated artifacts
  to `.superpipelines/pipelines/{P}/` as tool-neutral data; stop writing to
  `skills/superpipelines/...` and `agents/superpipelines/...`.
- `adding-/updating-/deleting-a-pipeline-step`, `pipeline-auditor`, `optimizing-a-pipeline`,
  `sk-pipeline-state`, profiles' `scope_root` fields — follow the layout change.
- `CLAUDE.md` invariants — `STATE_MANAGEMENT`, scope-root references, `ARTIFACT_PORTABILITY`
  updated to reflect the single root.

## 8. Migration / Back-Compat

- **New pipelines:** scaffold data-only under `.superpipelines/`.
- **Existing pipelines** under `.claude/`, `.agents/*`, `.opencode/`: keep the multi-root
  enumeration as a **read-only back-compat path** so old pipelines still list/resume; offer a
  one-shot `migrate-pipeline` that moves a pipeline's artifacts into `.superpipelines/` and
  rewrites its registry entry. Do not break running on the old layout in the same major.
- **Version stamping** (`plugin_version`) and the existing audit gates carry over unchanged.
- This is a layout-affecting change → likely a **minor or major** bump with an ADR
  (`docs/adr/`) recording the single-root decision and the dispatch-model choice.

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Option A leaves stale materialized agent files in tool dirs | Namespace under `…/agents/superpipelines/{P}/`; clean on Phase 4 completion; treat as cache (regenerate, never read as source). |
| Tool-neutral canonical def must capture every dialect's needs | Define one schema with fields that translate to each tier; lossless for CC/OC/Codex; validated by auditor. |
| Back-compat dual-read complexity during transition | Time-box it to one major; ship `migrate-pipeline`; remove old-root *writes* immediately, keep old-root *reads* temporarily. |
| Copy-pasting a pipeline that references absolute paths | Canonical defs use only relative-to-`.superpipelines/` paths; orchestrator resolves against the active root at run time. |
| Worktree isolation under Option B (if chosen) | Do not choose B as default; gate behind a per-tier `materialize: false` flag if ever needed. |

## 10. Gate Resolutions

1. **Dispatch model:** ✅ **Option A — materialize-at-runtime.** [RESOLVED]
2. **Rollout:** ✅ **Minor bump + dual-read back-compat** (old-root reads kept one major;
   old-root writes removed immediately; ship `migrate-pipeline`). [RESOLVED]
3. **Tool-neutral canonical agent-def schema:** specify in a **separate follow-up spec before
   coding** — it is the load-bearing contract for Option A's translation step. [RESOLVED]
4. **`OC_NOT_PORTABLE` upgrade:** in-scope **bonus**, verified during implementation; not a
   blocking deliverable. [RESOLVED]
```

