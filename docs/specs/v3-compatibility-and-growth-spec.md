# Superpipelines v3 — Compatibility & Growth Specification

> Deep-analysis specification and LLM handoff document. Produced 2026-07-02 against
> repository state v2.4.0. Verifies the codebase against the official Claude Code,
> Codex, and GitHub Copilot CLI documentation (current as of June–July 2026), against
> proven peer projects (Superpowers, GSD, awesome-copilot, official plugin
> marketplaces), and registers every gap found with severity, evidence, and
> acceptance criteria. Companion to
> `docs/analysis/competitive-landscape-2026-07.md` (market context and virality
> rationale — read it first for the "why"; this document is the "what to do").

## How to use this document (handoff instructions for an LLM)

1. Work the **Gap Register** (§3) in severity order (SEV-1 → SEV-3). Each gap is
   self-contained: evidence, affected files, fix direction, acceptance criteria.
2. Every fix touching per-platform facts MUST land in
   `skills/sk-platform-dispatch/profiles/{tier_id}.json` — never in skill bodies
   (`DEPENDENCY_INVERSION: PROFILE_DRIVEN` in `CLAUDE.md` is binding).
3. Items marked **VERIFY** require empirical testing on a live host before the fix
   merges; do not mark them done from documentation reading alone.
4. §4 (Copilot CLI tier) is a full new-platform proposal — implement as one milestone.
5. §5 (CI) and §6 (virality) are independent workstreams; they can proceed in parallel.
6. Re-run the auditor (`/superpipelines:audit-steps`) after any profile or CAD-schema
   change; auditor criteria CAD-01..05 and criterion 22 are the regression net.

## Table of Contents

- [1. Current State — What Is Verified Good](#1-current-state--what-is-verified-good)
- [2. Official-Documentation Baseline (June–July 2026)](#2-official-documentation-baseline-junejuly-2026)
- [3. Gap Register](#3-gap-register)
- [4. Proposal: GitHub Copilot CLI Tier (tier_1e)](#4-proposal-github-copilot-cli-tier-tier_1e)
- [5. CI & Parity Automation Plan](#5-ci--parity-automation-plan)
- [6. Virality Workstream (Reinforced)](#6-virality-workstream-reinforced)
- [7. Comparison Against Proven Projects](#7-comparison-against-proven-projects)
- [8. Milestones for Later Versions](#8-milestones-for-later-versions)
- [9. Sources](#9-sources)

---

## 1. Current State — What Is Verified Good

Findings from full-repo review that should be **preserved** (do not "fix" these):

1. **The installer is already correct where the README is wrong.**
   `bin/install.js` uses the documented marketplace-first flow for Claude Code
   (`claude plugin marketplace add` → `claude plugin install
   superpipelines@superpipelines-marketplace`) and a marketplace flow for Codex.
   The README Quick-Start table contradicts it (see GAP-01).
2. **CAD → native translation is architecturally sound.** The capability-intent
   schema (`capabilities.write_files/run_shell/network/edit_tracked_source`) with
   per-tier translators (`TRANSLATE_CAD_TO_CC/OC/CODEX`) matches how each platform
   actually enforces restrictions: CC `tools:`+`disallowedTools:`, OpenCode
   `permission: { edit: deny }`, Codex `sandbox_mode = "read-only"`. The Codex
   agent-TOML shape (`name`, `description`, `model`, `model_reasoning_effort`,
   `sandbox_mode`, scalar `instructions`) matches the official custom-agent format
   documented for `~/.codex/agents/` / `.codex/agents/`.
3. **Fail-closed dispatch.** MATERIALIZE/DISPATCH return `BLOCKED` when a
   materialized agent fails to resolve rather than silently falling back to a
   generic subagent — this preserves the isolation guarantee under discovery
   failure. Keep this behavior in any new tier.
4. **Skill authoring matches current Claude Code semantics.** Protocol skills use
   `disable-model-invocation: true` + `user-invocable: false`, which is exactly the
   documented invocation-control model; skill bodies are written as standing
   instructions, matching the documented skill-content lifecycle (invoked SKILL.md
   persists for the session and is not re-read).
5. **Guard scripts exist** (`scripts/check-cad-hygiene.js`,
   `check-worktree-gating.js`, `check-delete-step-guards.js`,
   `package-codex-plugin.js --check`) with fixtures under
   `skills/sk-platform-dispatch/fixtures/` (codex-materialize, oc-materialize,
   non-materializing-dispatch) — they are simply not wired into CI (GAP-08).
6. **Profile-driven dependency inversion is real, not aspirational.** Adding a
   platform genuinely reduces to a profile JSON + detection heuristic + translator
   branch. §4 exploits this.

---

## 2. Official-Documentation Baseline (June–July 2026)

Facts verified against current official documentation; the Gap Register cites these.

### 2.1 Claude Code

| Fact | Status vs repo |
| :--- | :--- |
| Subagent frontmatter supports: `description`, `prompt`, `tools`, `disallowedTools`, `model`, `permissionMode`, `mcpServers`, `hooks`, `maxTurns`, `skills`, `initialPrompt`, `memory`, `effort`, `background`, `isolation`, `color` | Repo uses a compatible subset — but see `effort` (GAP-03) |
| **Plugin-shipped subagents IGNORE `hooks`, `mcpServers`, and `permissionMode`** (security restriction; `tools`/`disallowedTools` still honored) | Directly affects `PERMISSION_MODE: PER_AGENT` for the 8 repo agents shipped via the plugin (GAP-02) |
| `skills:` frontmatter preloads FULL skill content into the subagent at startup (not just descriptions) | Repo agents preload 3–7 skills each; budget audit needed (GAP-09) |
| Agent discovery: `.claude/agents/` scanned recursively, walking up from cwd; nested same-name resolution is closest-wins (v2.1.178+) | Supports the Option A same-session materialization assumption on CC — registration assumption holds per docs |
| `disallowedTools` applied before `tools`; both support MCP patterns | Matches repo usage |
| `isolation: worktree` branches from the default branch (not parent `HEAD`), auto-cleans if unchanged | Worktree semantics doc-confirmed |
| Custom commands merged into skills; `.claude/commands/*.md` keep working | `commands/` layout remains valid (GAP-11 optional consolidation) |
| Plugin distribution: `claude plugin marketplace add <owner/repo>` + `claude plugin install <plugin>@<marketplace>`; no `--version` pin on install (CHANGELOG claims pinning — verify) | Installer correct; README wrong (GAP-01); CHANGELOG pin syntax **VERIFY** |
| Agent Skills is an open standard (agentskills.io, opened 2025-12-18) | Repo skills are conformant; leverage in §6 |

### 2.2 Codex App/CLI

| Fact | Status vs repo |
| :--- | :--- |
| Custom agents: standalone TOML under `~/.codex/agents/` (personal) or `.codex/agents/` (project); one agent per file; `name` field is source of truth; optional `model`, `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`, `skills.config` inherit from parent session when omitted | Matches `TRANSLATE_CAD_TO_CODEX` output shape. **VERIFY**: (a) recursive discovery of `agents/superpipelines/{P}/` subdirectories, (b) the `turn_limit` key, (c) `instructions` scalar as the body carrier (repo migrated to it in v2.3.x per RELEASE-NOTES) |
| `sandbox_mode = "read-only"` is a documented per-agent value | Reviewer isolation recipe confirmed |
| Plugins: marketplace launched 2026-03-27; `/plugin marketplace add owner/repo` + `/plugin install plugin@marketplace`; bundles skills, app mappings, MCP config | Installer uses `codex plugin marketplace add` + `codex plugin add` — headless-CLI verb (`add` vs `install`) **VERIFY** (GAP-05) |
| Skills: SKILL.md standard; `$skill-installer` for curated skills; auto-detection of new skills; official skills catalogue exists | `.codex-plugin/plugin.json` points `skills` at `../.agents/skills/` — cross-tool path per repo profile note; **VERIFY** against current Codex skill-discovery paths (GAP-06) |
| Subagents: model-driven fan-out; custom agents with per-agent model config | Matches tier_1d profile |

### 2.3 GitHub Copilot CLI

| Fact | Status vs repo |
| :--- | :--- |
| Custom agents: `<name>.agent.md` (Markdown + YAML frontmatter) in `.github/agents/` (three scope locations); frontmatter: `name`, `description`, `tools` (allowlist; omit = all tools), `model` (IDE contexts), `target` | **No Copilot support in repo at all** (GAP-04, §4) |
| Explicit invocation: `copilot --agent <name> --prompt "…"` | Enables deterministic dispatch |
| Agent Skills supported across Copilot surfaces since 2025-12-18; `gh skill` discovers/installs/updates/publishes skills from GitHub repos | Distribution channel unexploited (§6) |
| `tools:` allowlist enforcement fidelity in the CLI questioned in community discussion #179811 | Gates the tier's isolation classification — **VERIFY** empirically |

---

## 3. Gap Register

Severity: **SEV-1** = breaks a stated invariant or a user's first-touch experience;
**SEV-2** = source-of-truth drift / unverified load-bearing claim; **SEV-3** = quality,
polish, or opportunity cost.

### GAP-01 · SEV-1 · README install commands contradict the installer and official docs

- **Evidence**: `README.md:29` ships `claude plugin install github:gustavo-meilus/superpipelines`;
  `README.md:30` ships `codex plugin add github:gustavo-meilus/superpipelines` marked
  "syntax pending verification". `bin/install.js:70-94` already implements the correct
  marketplace-first flows. `CHANGELOG.md` header shows the correct CC flow.
- **Impact**: first-touch failure for exactly the users most likely to amplify the
  project; "pending verification" text on the front page is a trust leak.
- **Fix**: make the README table emit the same commands `bin/install.js` runs (single
  source: consider generating the table from `PLATFORMS[].install()` via a script in
  `scripts/`). Delete "pending verification" from README; keep open verification items
  in RELEASE-NOTES only.
- **Acceptance**: every command in the README Quick-Start executes successfully on a
  host with the respective CLI installed; a CI check diffs README commands against
  `bin/install.js` output (`--dry-run --all`).

### GAP-02 · SEV-1 · `permissionMode` is ignored for plugin-shipped agents on Claude Code

- **Evidence**: Official subagents doc: "plugin subagents don't support the `hooks`,
  `mcpServers`, or `permissionMode` frontmatter fields. These fields are ignored when
  loading agents from a plugin." All 8 repo agents (`agents/*.md`) ship via the plugin
  and declare `permissionMode` (`plan` on reviewers, `acceptEdits` on writers).
- **Impact**: the `PERMISSION_MODE: PER_AGENT` invariant is silently unenforced for
  plugin-scope agents. Reviewer isolation itself is **not** broken — `tools:` +
  `disallowedTools:` remain honored and are the actual structural barrier — but the
  documented defense-in-depth layer (`permissionMode: plan`) does not exist on the
  plugin path, and `CLAUDE.md`/README imply it does.
- **Fix**: (a) treat `tools`/`disallowedTools` as the sole plugin-path enforcement and
  say so in `CLAUDE.md` (amend `PERMISSION_MODE: PER_AGENT` with the plugin-scope
  caveat) and in `sk-claude-code-conventions`; (b) note that **materialized** pipeline
  agents written to `.claude/agents/superpipelines/{P}/` are project-scope agents where
  `permissionMode` IS honored — the CAD translation already emits it there, which is
  correct and should be kept; (c) audit criterion: any doc claiming `permissionMode`
  enforcement for the plugin-shipped agents is a defect.
- **Acceptance**: `CLAUDE.md` invariant text updated; auditor criterion added;
  README "Design Principles" paragraph no longer implies permissionMode enforcement on
  plugin agents.

### GAP-03 · SEV-2 · tier_1 profile says Claude Code has no effort field — it now does

- **Evidence**: `profiles/tier_1.json` sets `effort_field_name: null`; dispatch table in
  `sk-platform-dispatch/SKILL.md:331` says "Ignored (CC has no effort field)". Official
  docs now list `effort` among supported subagent frontmatter fields.
- **Impact**: `effort_tier` in CADs silently drops on CC; Codex/OpenCode get effort
  control, CC doesn't — asymmetric behavior for the same pipeline.
- **Fix**: set `effort_field_name: "effort"` in `tier_1.json` (with an
  `effort_emit_map` if value vocabularies differ — **VERIFY** accepted values);
  extend `TRANSLATE_CAD_TO_CC` to emit it; bump `model_tiers_version`; add a
  quarterly profile-drift review chore (see GAP-10).
- **Acceptance**: codex-materialize-style fixture added for CC translation asserting
  `effort:` emission; dispatch-table row corrected.

### GAP-04 · SEV-1 · GitHub Copilot CLI entirely unsupported

- **Evidence**: zero Copilot references in the repo (grep confirms); Copilot CLI has
  custom agents + Agent Skills + `gh skill` distribution since December 2025.
- **Impact**: largest-install-base CLI absent from a project whose core claim is
  "runs across AI coding platforms"; also forfeits the `gh skill` discovery channel.
- **Fix**: implement §4 (tier_1e proposal).
- **Acceptance**: §4 acceptance criteria.

### GAP-05 · SEV-2 · Codex headless plugin verbs unverified in the installer

- **Evidence**: `bin/install.js:86-89` uses `codex plugin marketplace add` +
  `codex plugin add`, with a comment asserting Codex uses `add` not `install`; the
  documented interactive flow is `/plugin marketplace add` + `/plugin install`.
- **Impact**: universal installer may fail on the Codex leg; failure is caught
  (partial-install state + manual `/plugins` fallback note) but is still first-touch
  friction.
- **Fix**: **VERIFY** headless verbs against `codex --help` on a current build; encode
  the verified commands; add the verification to the release checklist
  (`cutting-a-release` skill).
- **Acceptance**: a recorded transcript (docs/agents or RELEASE-NOTES) of a successful
  `bin/install.js --only codex` run on a live Codex install.

### GAP-06 · SEV-2 · Codex skill-discovery path (`.agents/skills/`) and agent-subdir discovery unverified

- **Evidence**: `.codex-plugin/plugin.json` points `skills` at `../.agents/skills/`;
  tier_1d profile note claims Codex discovers `.agents/skills` + `$HOME/.agents/skills`.
  MATERIALIZE writes agent TOML to `.codex/agents/superpipelines/{P}/` — official docs
  confirm `.codex/agents/` but not recursive subdirectory scanning.
- **Impact**: if Codex does not scan nested agent dirs, every Codex dispatch returns
  `BLOCKED` (correct fail-closed behavior, but the tier is then unusable); if the
  skills path is stale, the plugin installs with no skills.
- **Fix**: **VERIFY** both on a live Codex host. If subdirs are not scanned, flatten
  the materialization target to `.codex/agents/` with `{P}--{name}.toml` prefixed
  filenames (namespace collision-safe) via `extensions.native_agent_dir` — profile-only
  change by design.
- **Acceptance**: live-host dispatch of the codex-materialize fixture resolves all
  three agents; skills visible in a fresh Codex session after plugin install.

### GAP-07 · SEV-2 · `.codex-plugin/plugin.json` references a missing PRIVACY.md

- **Evidence**: manifest `privacyPolicyURL` →
  `https://github.com/gustavo-meilus/superpipelines/blob/main/PRIVACY.md`; the file
  does not exist (verified). Marketplace listings render this as a dead link.
- **Fix**: add a short PRIVACY.md (the plugin collects nothing; hooks telemetry is
  local — cite `hooks/README-telemetry.md`) or drop the field.
- **Acceptance**: link resolves or field removed; `check:codex-plugin` extended to
  assert every URL in the manifest resolves in-repo.

### GAP-08 · SEV-1 · CI does not run any of the project's own guards

- **Evidence**: `.github/workflows/ci.yml` (26 lines) only JSON-parses
  `.claude-plugin/*.json` and checks three files exist. Not run: profile schema
  validation against `profile.schema.json` (+ `fixtures/valid|invalid`),
  `check-cad-hygiene.js`, `check-worktree-gating.js`, `check-delete-step-guards.js`,
  `package-codex-plugin.js --check`, authoring-rule lints (skill ≤500 lines,
  description ≤1536 chars, agents zero-body, references >100 lines need ToC),
  installer `--dry-run` smoke, materialization fixture diffs.
- **Impact**: the repo's strongest credibility asset (its own discipline) is
  unenforced; `PARITY_TESTING: MANUAL_PHASE1` persists by default.
- **Fix**: implement §5.
- **Acceptance**: §5 acceptance criteria.

### GAP-09 · SEV-3 · Preloaded-skill context budget unaudited

- **Evidence**: `skills:` on subagents injects FULL skill content at startup (docs);
  e.g. `pipeline-architect.md` preloads 7 skills (sk-4d-method,
  sk-spec-driven-development, sk-dynamic-routing, sk-claude-code-conventions,
  sk-pipeline-patterns, sk-pipeline-paths, pipeline-architect-protocol).
- **Impact**: startup context cost per dispatch; on smaller `model_tier: fast`
  reviewers this can crowd the working window.
- **Fix**: add a CI report summing preloaded-skill line counts per agent; set a soft
  budget (e.g. ≤1200 lines total preload for `fast`-tier agents); trim or demote
  rarely-used preloads to Skill-tool invocation.
- **Acceptance**: budget report in CI; all agents within budget or exempted with
  justification.

### GAP-10 · SEV-2 · No scheduled profile-drift detection

- **Evidence**: `model_tiers_version` stamps exist (2026-05-29 / 2026-05-19) and
  `running-a-pipeline` Phase 0.4 emits an advisory, but nothing *updates* the
  profiles; GAP-03 is exactly the drift class this misses (capability drift, not just
  model-catalog drift).
- **Fix**: monthly scheduled CI job (or documented release-checklist step) that
  re-verifies each profile's capability facts against the platforms' llms.txt /
  changelogs and opens an issue on drift. Include: CC frontmatter field list, Codex
  agent TOML keys, plugin CLI verbs, model catalogs.
- **Acceptance**: first drift-review issue template merged; checklist wired into
  `cutting-a-release`.

### GAP-11 · SEV-3 · Docs/front-page complexity and stale rows

- **Evidence**: README leads with a 5-tier matrix including an "aspirational" tier
  (Antigravity, unverified) and "(syntax pending verification)"; `GEMINI.md` persists
  although Gemini CLI retires 2026-06-18 (already past); commands/skills duplication
  is now optional in CC (commands merged into skills).
- **Fix**: move Antigravity to a Roadmap section; archive `GEMINI.md` content into the
  Antigravity notes; rewrite README top per §6.1; keep `commands/` (still valid,
  needed for non-CC tiers) but note the CC merge in `sk-claude-code-conventions`.
- **Acceptance**: README top-fold contains hook → demo → install → 3 bullets; no
  "aspirational/pending" language above the fold; GEMINI.md removed or redirected.

### GAP-12 · SEV-3 · Tier 2 install path depends on a third-party CLI without a fallback

- **Evidence**: Cursor/Windsurf/Cline installs run `npx -y skills add superpipelines
  -a <tool>` (Vercel `skills` CLI). If the registry entry or CLI changes, Tier 2
  install breaks with no fallback.
- **Fix**: add a `--manual` printout mode (copy `plugins/superpipelines/skills` into
  the tool's skills dir) and a smoke test in CI (`npx -y skills --version`).
- **Acceptance**: documented manual fallback in README + installer note.

---

## 4. Proposal: GitHub Copilot CLI Tier (tier_1e)

New platform profile — per `DEPENDENCY_INVERSION`, this is a profile JSON + detection
heuristic + one translator branch. No orchestrator-skill edits should be necessary.

### 4.1 Profile sketch (`skills/sk-platform-dispatch/profiles/tier_1e.json`)

```jsonc
{
  "tier": "tier_1e",
  "name": "GitHub Copilot CLI",
  "capabilities": {
    "subagents": true,                  // custom agents invocable; VERIFY autonomous delegation depth
    "parallel_subagents": false,        // VERIFY; assume sequential until proven
    "task_primitive": false,
    "skill_tool": true,                 // Agent Skills supported since 2025-12-18
    "worktrees": false,
    "reviewer_isolation": "structural_unverified",  // pending §4.3 outcome
    "dispatch_mechanism": "native_agent_file",       // new mechanism value
    "model_field_format": "omit",       // `model` honored in IDEs, not guaranteed in CLI
    "effort_field_name": null,
    "provider_families": ["openai", "anthropic", "google"]
  },
  "scope_root": { "workspace": ".github", "user": "~/.copilot" },   // VERIFY user scope path
  "extensions": {
    "native_agent_dir": "agents",              // .github/agents/
    "native_agent_ext": ".agent.md",
    "reviewer_isolation_recipe": "Emit tools: allowlist excluding write/shell tools in .agent.md frontmatter. Enforcement fidelity in the CLI is unverified (community discussion #179811) — classify structural only after the §4.3 probe passes.",
    "explicit_invocation": "copilot --agent {name} --prompt {prompt}"
  },
  "degradation_warnings": [
    "Copilot CLI reviewer isolation is pending structural verification; treat reviews as advisory until the isolation probe passes on this host."
  ]
}
```

### 4.2 Translator: `TRANSLATE_CAD_TO_COPILOT(cad, resolved, profile)`

Emit `.github/agents/superpipelines-{P}-{cad.name}.agent.md` (flat filename —
filename charset is restricted to `[.\-_a-zA-Z0-9]`, and subdirectory scanning is
unverified):

```yaml
---
name: {cad.name}
description: {cad.description}
# capability intent → tools allowlist (omit = ALL tools, so reviewers MUST emit it):
# write_files:false → tools: ["read", "grep", "glob"]  (VERIFY canonical tool names)
# run_shell:false   → exclude shell/terminal tool
# network:false     → exclude fetch/web tools
tools: [...]
---
{cad.body verbatim}
```

Rules: a reviewer (`write_files: false`) MUST always emit an explicit `tools:` list —
omission grants all tools, which would silently destroy isolation. `model` is emitted
only if the CLI is verified to honor it; otherwise omit (host default).

### 4.3 Isolation probe (gates the tier classification)

Ship a fixture agent (`tools:` read-only) whose protocol *instructs it to attempt* a
file write and report the outcome. Run via `copilot --agent isolation-probe`. If the
write is blocked → set `reviewer_isolation: "structural"` and drop the degradation
warning; if it succeeds → classify as Tier 2-equivalent (`convention`) and keep the
warning. Document the probe transcript in `docs/agents/`.

### 4.4 Detection heuristic (sk-platform-dispatch DETECT() step, insert before Tier 2)

`copilot` binary on PATH, OR `.github/agents/` exists with `*.agent.md` entries.

### 4.5 Distribution

Publish the user-facing skills through `gh skill publish` and submit to
`github/awesome-copilot`. `AGENTS.md` already covers Copilot's custom-instructions
surface — verify Copilot CLI reads it (it reads repo instructions; **VERIFY** exact
filename set).

### 4.6 Acceptance criteria

- Profile validates against `profile.schema.json` (extend schema for the new
  `dispatch_mechanism` enum value).
- Copilot-materialize fixture (input CADs → expected `.agent.md` files) added and
  green in CI.
- Isolation probe transcript recorded; `reviewer_isolation` set from evidence, not
  assumption.
- README tier table gains the row only after the probe result is known — with an
  honest isolation column.
- Installer gains `{ id: 'copilot', detect: which('copilot'), install: [...] }`.

---

## 5. CI & Parity Automation Plan

Replace the 26-line `ci.yml` with jobs (all runnable locally via npm scripts):

1. **manifests** — JSON-parse all four manifests; assert cross-manifest version
   agreement (the 5 version targets from `cutting-a-release`); assert every URL field
   resolves in-repo (catches GAP-07).
2. **profiles** — validate every `profiles/*.json` against `profile.schema.json`;
   fixtures under `profiles/fixtures/valid|invalid` must pass/fail respectively.
3. **guards** — run `check-cad-hygiene.js`, `check-worktree-gating.js`,
   `check-delete-step-guards.js`, `package-codex-plugin.js --check`.
4. **authoring-lints** (new script) — skill bodies ≤500 lines; description +
   `when_to_use` ≤1536 chars; `agents/*.md` are frontmatter-only; references >100
   lines contain a ToC; no concrete model IDs in skill bodies (grep for
   `claude-|gpt-` outside profiles/prefs — enforces `DEPENDENCY_INVERSION`).
5. **materialization-parity** (new script) — run each `TRANSLATE_CAD_TO_*` as a pure
   textual transform over `fixtures/*/input/` and diff against `expected-*/`. Add the
   CC-expected and (post-§4) Copilot-expected fixture sets. This is the automatable
   core of parity; it retires `PARITY_TESTING: MANUAL_PHASE1` for the translation
   layer (live-host dispatch remains a release-checklist manual step until GAP-05/06
   verification lands).
6. **installer-smoke** — `node bin/install.js --list` and `--dry-run --all` on
   ubuntu/macos/windows matrices; diff dry-run output against the README Quick-Start
   commands (GAP-01 regression net).
7. **preload-budget** — GAP-09 report.

Acceptance: all jobs green on main; README CI badge reflects the expanded workflow;
`CLAUDE.md` updates `PARITY_TESTING` to `TRANSLATION_AUTOMATED_DISPATCH_MANUAL`.

---

## 6. Virality Workstream (Reinforced)

Context and evidence in `docs/analysis/competitive-landscape-2026-07.md` §3–§6.
Binding decisions for the next versions:

### 6.1 README rewrite (single highest-leverage change)

Top fold, in order: (1) hook — **"Your AI reviewer can't edit code. Structurally."**;
(2) 90-second demo GIF: a reviewer attempting an edit, the permission layer denying
it, the pipeline halting with a verdict; (3) the one-command install (post GAP-01
fix); (4) three bullets: structural isolation · one pipeline, every platform ·
crash-resumable state. Tier matrices, invariants, phase tables move below the fold or
to docs. Rationale: every viral peer (Superpowers, GSD, Karpathy skill) leads with a
belief, not an architecture.

### 6.2 The un-recordable-by-anyone-else demo

Split-screen clip of the *same pipeline directory* running unmodified on Claude Code,
Codex, and OpenCode. Ship it in the README and as the anchor of every post. No
competitor can produce this artifact; it is the portability moat made visible.

### 6.3 Named, respectful comparison

README section comparing Superpipelines vs Superpowers vs GSD on exactly two axes:
*isolation (structural vs prompt-convention)* and *portability (multi-platform vs
Claude-Code-only)*. GSD demonstrated that naming alternatives creates retellable
content; keep it factual and generous.

### 6.4 Distribution checklist

- Claude Code: own marketplace (done) + submit to community registries
  (claude-plugins.dev, claudedirectory.org, tonsofskills).
- Codex: publish to the Codex plugin marketplace ecosystem; list in the community
  skills catalogues.
- Copilot: `gh skill publish` + PR to `github/awesome-copilot` (post-§4).
- Standard: register/reference at agentskills.io ecosystem lists — position as
  "the pipeline layer of the Agent Skills standard."

### 6.5 Author channel

3–5 build-in-public posts: "Prompt-based code review is theater", "One pipeline,
seven platforms" (with the §6.2 clip), "What crash-resumable agent state looks
like", "Materializing one agent definition into three native dialects". Each ends
with the one-command install. The Superpowers trajectory (~2K stars/day, zero paid
marketing, all author-channel) is the template.

### 6.6 Trust hygiene (virality brings scrutiny)

Before any promotion push: GAP-01, GAP-07, GAP-08, GAP-11 must be closed. The first
wave of viral scrutiny reads the README against the repo; contradictions become the
top comment.

---

## 7. Comparison Against Proven Projects

| Dimension | Superpipelines v2.4.0 | Superpowers (obra) | GSD | awesome-copilot / official channels |
| :--- | :--- | :--- | :--- | :--- |
| Core claim | Structural isolation + cross-platform pipelines | SDLC methodology via composable skills | Spec-driven phases, wave parallelism, anti-ceremony | Curated distribution |
| Isolation | Permission-layer (tools/sandbox/permission-deny) on T1/1b/1d | Prompt/convention discipline | Fresh-context subagents (context isolation, not write-deny) | n/a |
| Portability | One CAD → CC/OC/Codex native dialects (unique) | CC + manual OpenCode port | CC only | per-platform |
| Crash recovery | Structured resumable state + cross-tier resume | none | commit-per-task granularity | n/a |
| First-touch UX | **Weaker**: README/install drift (GAP-01), tier jargon up front | One command, immediate value | One command, opinionated README | one command (`gh skill`) |
| CI discipline | Guards exist, not wired (GAP-08) | modest | modest | n/a |
| Narrative | **Weakest link** — architecture-first | Methodology-first (viral) | Enemy-naming + speed (viral) | n/a |
| Distribution | Own marketplace only | Marketplace + directories + author blog | Marketplace + roundups | native registries |

Net: Superpipelines is ahead of every viral peer on enforcement architecture and
portability, and behind all of them on first-touch UX, narrative, and distribution.
The gaps in §3 close the former; §6 closes the latter.

---

## 8. Milestones for Later Versions

| Milestone | Contents | Gate |
| :--- | :--- | :--- |
| **v2.5.0 — Trust & Truth** | GAP-01, GAP-02, GAP-03, GAP-07, GAP-11, GAP-12 | README commands proven in CI; invariant text honest |
| **v2.6.0 — Enforcement in CI** | GAP-08 (§5 jobs 1–7), GAP-09, GAP-10 | `PARITY_TESTING` invariant upgraded |
| **v2.7.0 — Codex verified** | GAP-05, GAP-06 live-host verification; fixes if discovery assumptions fail | Recorded transcripts; Codex leg of installer proven |
| **v3.0.0 — Copilot tier + launch** | §4 tier_1e end-to-end; §6.1–6.5 executed; Antigravity moved to roadmap | Isolation probe result published; demo clip live; announcement posts ready |

Sequencing rationale: never promote (v3.0 launch) before trust hygiene (v2.5) and
enforcement (v2.6) are in place — §6.6.

---

## 9. Sources

Official documentation (verified June–July 2026):

- Claude Code skills — https://code.claude.com/docs/en/skills
- Claude Code subagents (frontmatter fields, plugin-agent restrictions, discovery, worktree isolation, skill preloading) — https://code.claude.com/docs/en/sub-agents
- Codex subagents & custom agent TOML — https://developers.openai.com/codex/subagents ; https://developers.openai.com/codex/config-reference
- Codex plugins & marketplace — https://developers.openai.com/codex/plugins ; https://codex.danielvaughan.com/2026/04/11/codex-marketplace-plugin-distribution/ ; https://codex.danielvaughan.com/2026/04/27/codex-cli-custom-agent-definitions-toml-specialised-subagents/
- Codex skills & catalogue — https://developers.openai.com/codex/skills ; https://codex.danielvaughan.com/2026/05/14/openai-skills-catalogue-codex-cli-official-curated-experimental-skill-installer/
- Copilot CLI custom agents — https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli ; https://docs.github.com/en/copilot/reference/custom-agents-configuration
- Copilot agent skills + `gh skill` — https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills ; https://github.blog/changelog/2025-12-18-github-copilot-now-supports-agent-skills/
- Copilot CLI tools-frontmatter enforcement question — https://github.com/orgs/community/discussions/179811
- Agent Skills open standard — https://agentskills.io/home ; https://github.com/agentskills/agentskills

Peer projects & ecosystem analysis: see
`docs/analysis/competitive-landscape-2026-07.md` §Sources.
