# Fix Plan — Working the v3 Spec One Gap at a Time

> Execution plan for `docs/specs/v3-compatibility-and-growth-spec.md`. Breaks every
> registered gap into independently-grabbable, dependency-ordered work items in the
> agent-brief format this repo's issue tracker uses (see `docs/agents/issue-tracker.md`,
> `docs/agents/triage-labels.md`). Each item is a vertical slice: complete, verifiable
> on its own, publishable as a GitHub issue with the `ready-for-agent` label via
> `/superpipelines` triage conventions or Matt Pocock's `/to-issues` flow.
>
> Produced 2026-07-02 after studying `mattpocock/skills` (README + all 18 skills).
> §1 records what that study changes about *how* we fix, not just *what*.

## Table of Contents

- [1. Lessons Adopted from mattpocock/skills](#1-lessons-adopted-from-mattpocockskills)
- [2. Execution Model](#2-execution-model)
- [3. Dependency Graph](#3-dependency-graph)
- [4. Work Items — Wave 1: Trust & Truth (v2.5.0)](#4-work-items--wave-1-trust--truth-v250)
- [5. Work Items — Wave 2: Enforcement in CI (v2.6.0)](#5-work-items--wave-2-enforcement-in-ci-v260)
- [6. Work Items — Wave 3: Codex Verified (v2.7.0)](#6-work-items--wave-3-codex-verified-v270)
- [7. Work Items — Wave 4: Copilot Tier + Launch (v3.0.0)](#7-work-items--wave-4-copilot-tier--launch-v300)
- [8. New Improvement Points Surfaced by the Study](#8-new-improvement-points-surfaced-by-the-study)
- [9. Publishing These Items as Issues](#9-publishing-these-items-as-issues)

---

## 1. Lessons Adopted from mattpocock/skills

The repo (`mattpocock/skills`, ~60K-newsletter author, updated continuously through
2026) is the strongest current example of the *small, composable, anti-ceremony*
school — the same school GSD belongs to, and the direct counterweight to
Superpipelines' spec-grade heaviness. Five lessons are binding for this plan; three
more feed §8 as new improvement points.

**L1 — Vertical slices with checkable completion criteria.** His `to-issues` skill:
every issue is a thin slice through *all* layers, demoable on its own, published in
dependency order. His `writing-great-skills` skill: every step ends on a *checkable,
exhaustive* completion criterion, because a vague criterion invites premature
completion. Every work item below has both.

**L2 — Fresh context per item.** His main flow clears context between issues
("start a fresh session per issue"), staying inside the smart zone. The waves below
assume one session (or one dispatched agent) per work item; items never share a
session except where explicitly marked as a pair.

**L3 — The setup-skill pattern is already ours.** Superpipelines' `CLAUDE.md`
"Agent skills" block, `docs/agents/{issue-tracker,triage-labels,domain}.md`, and
`CONTEXT.md`/`docs/adr` layout are the literal output of his
`/setup-matt-pocock-skills`. This plan therefore writes agent briefs in *his* issue
template (What to build / Acceptance criteria / Blocked by) — the repo's tooling and
maintainer already speak it.

**L4 — Verify the claim before grilling it** (his `triage` step 3). Every work item
that fixes an "unverified" behavior (Codex verbs, discovery paths, Copilot tools
enforcement) puts the *verification transcript* in the acceptance criteria, not just
the fix. A confirmed verification makes a stronger brief — and a stronger README.

**L5 — Two-axis review discipline.** His `code-review` runs Standards and Spec as
parallel isolated sub-agents and refuses to merge their rankings. Superpipelines'
Stage-1 (spec) / Stage-2 (quality) split is the same idea with stronger enforcement —
this is *convergent validation* of the project's core design, and Wave-4 marketing
should say so (respectfully, per the named-comparison strategy).

---

## Execution Status (2026-07-02)

**Waves 1 and 2 are executed** on branch `claude/superpipelines-comparison-analysis-k68cb4`,
one commit per work item: WI-01 (`ec14afe`), WI-02 (`bea7cb1`), WI-03 (`28ed520`),
WI-04 (`eae4040`), WI-05 (`2c5b714`, with the recorded GEMINI.md deviation),
WI-06 (`81a5a2b`), WI-07 (`df658e4`), WI-08 (`97296a9`), WI-09 (`bdedfe7`),
WI-10 (`361360d`). All acceptance criteria verified locally (`npm run check:all` green;
seeded failures demonstrated for the version, URL-integrity, and parity checks).
Wave 3 (WI-11/WI-12) is next and requires a live Codex host (`ready-for-human`).
**Wave 3 update (2026-07-02, later):** WI-11 verified PASS on Codex CLI 0.142.5 and
WI-12 probes ran (PR #89 / `docs/agents/verification/`). Follow-up applied on this
branch: Probe C schema fixes landed everywhere in lockstep (translator emits
`description` + scalar `developer_instructions`, `turn_limit` retired, effort map now
identity `low → low`; goldens, parity harness, packager, and references updated), and
Probe D's read-only breach is handled host-conditionally — `tier_1d.json` gains
`extensions.isolation_unsandboxed_warning` and the dispatch skill's mandatory runtime
guard degrades reviewer isolation to advisory (with the warning surfaced and stamped
into `metadata.isolation_warning`) when the session sandbox is disabled. The global
`structural` claim stands for sandbox-capable hosts pending the option-2 re-probe on a
Hyper-V-capable machine (still open).
WI-13 stays queued behind WI-12 as planned — the Codex `instructions` vs
`developer_instructions` outcome sets the precedent for how translator/golden/packager
disagreements resolve before a fourth translator is added.

## 2. Execution Model

- **One work item = one branch = one session/agent = one PR.** Items within a wave
  with no mutual `Blocked by` may run in parallel.
- Every item's acceptance criteria are the merge gate; a criterion that can't be
  checked mechanically names the artifact that evidences it (transcript, fixture,
  CI job).
- Items marked **[VERIFY-HOST]** need a live host (Codex / Copilot CLI) and are the
  only items an unattended agent cannot finish alone — they end at
  `ready-for-human` with everything else staged.
- Spec references (`GAP-nn`, `§n`) point into
  `docs/specs/v3-compatibility-and-growth-spec.md`.

## 3. Dependency Graph

```
Wave 1:  WI-01 ─┬─▶ WI-02          WI-03   WI-04   WI-05   WI-06
                └─▶ (Wave 2 WI-07 job 6)
Wave 2:  WI-07 ─▶ WI-08 ─▶ WI-09          WI-10
Wave 3:  WI-11 ─▶ WI-12   (both [VERIFY-HOST])
Wave 4:  WI-13 ─▶ WI-14 ─▶ WI-15          WI-16 ─▶ WI-17 ─▶ WI-18
Cross:   WI-16 blocked by ALL of Wave 1; WI-18 blocked by everything.
```

---

## 4. Work Items — Wave 1: Trust & Truth (v2.5.0)

### WI-01 · Make the installer the single source of truth for install commands

*Spec: GAP-01 · Label: `bug`, `ready-for-agent`*

**What to build.** A generator (`scripts/generate-install-docs.js`) that renders the
README Quick-Start platform table from `bin/install.js`'s `PLATFORMS[].install()`
output, plus the rewritten README rows. Delete the
`claude plugin install github:…` and `codex plugin add github:…` shorthands and all
"(syntax pending verification)" text from README; the open Codex verification note
moves to RELEASE-NOTES only (it is retired by WI-11).

**Acceptance criteria**
- [ ] `node scripts/generate-install-docs.js --check` exits non-zero when README
      commands diverge from installer output (the future CI hook).
- [ ] README contains zero occurrences of `github:` install shorthand and zero
      occurrences of "pending verification".
- [ ] `node bin/install.js --dry-run --all` output commands appear verbatim in the
      README table.

**Blocked by.** None — can start immediately.

### WI-02 · Correct the `PERMISSION_MODE` invariant for plugin-scope agents

*Spec: GAP-02 · Label: `bug`, `ready-for-agent`*

**What to build.** Documentation-truth fix across three sites: (1) `CLAUDE.md`
`PERMISSION_MODE: PER_AGENT` gains the caveat that Claude Code ignores
`permissionMode` (and `hooks`, `mcpServers`) on plugin-shipped subagents, so
`tools:`/`disallowedTools:` are the sole structural barrier on that path; (2)
`skills/sk-claude-code-conventions/SKILL.md` states the same rule where it teaches
agent frontmatter; (3) README "Design Principles" paragraph reworded so it claims
only what the tools-allowlist enforces. Confirm (and state) that **materialized**
per-pipeline agents under `.claude/agents/superpipelines/{P}/` are project-scope,
where `permissionMode` IS honored — `TRANSLATE_CAD_TO_CC` keeps emitting it.

**Acceptance criteria**
- [ ] All three sites updated; grep for `permissionMode` in README/CLAUDE.md shows
      no unqualified enforcement claim for plugin-shipped agents.
- [ ] A new auditor criterion (compliance-matrix) flags any doc asserting
      permissionMode enforcement on the plugin path as SEV-2 drift.
- [ ] `TRANSLATE_CAD_TO_CC` spec text in `sk-platform-dispatch/SKILL.md` unchanged
      w.r.t. emitting `permissionMode` (materialized path stays correct).

**Blocked by.** WI-01 (both edit the same README section; land WI-01 first).

### WI-03 · Emit `effort` on Claude Code (profile drift fix)

*Spec: GAP-03 · Label: `bug`, `ready-for-agent`*

**What to build.** `profiles/tier_1.json`: set `effort_field_name: "effort"`, add
`effort_emit_map` if CC's accepted values differ from `low|medium|high` (check the
subagents doc; add the mapping only if needed), bump `model_tiers_version`.
Extend `TRANSLATE_CAD_TO_CC` in `sk-platform-dispatch/SKILL.md` to emit the field
from `resolved.effort`, gated exactly like the OC/Codex translators (profile-driven,
never hardcoded). Update the dispatch-tier table row that currently reads
"Ignored (CC has no effort field)". Add a CC-materialize fixture
(`fixtures/cc-materialize/`) mirroring the codex/oc fixture layout, asserting
`effort:` in the expected output.

**Acceptance criteria**
- [ ] `tier_1.json` validates against `profile.schema.json`.
- [ ] New `fixtures/cc-materialize/` with input CADs + `expected-cc/` files
      including the `effort:` line; README in the fixture dir explains it.
- [ ] No concrete model IDs or effort literals added to any skill body outside the
      translator's field-name indirection (auditor SEV-2 rule holds).

**Blocked by.** None.

### WI-04 · Add PRIVACY.md and manifest URL integrity

*Spec: GAP-07 · Label: `bug`, `ready-for-agent`*

**What to build.** A short `PRIVACY.md` (the plugin stores all state locally under
`.superpipelines/`; the SessionStart/telemetry hooks write only local files — cite
`hooks/README-telemetry.md`; no data leaves the machine). Extend
`scripts/package-codex-plugin.js --check` to assert every relative/blob URL in all
four manifests resolves to a file in the repo.

**Acceptance criteria**
- [ ] `PRIVACY.md` exists and the `.codex-plugin/plugin.json` link resolves.
- [ ] `npm run check:codex-plugin` fails if any manifest URL points at a missing
      in-repo file (demonstrated by a test run with a temporarily broken URL).

**Blocked by.** None.

### WI-05 · Move Antigravity to Roadmap; retire GEMINI.md

*Spec: GAP-11 (scope: honesty items only; the README rewrite itself is WI-16) ·
Label: `enhancement`, `ready-for-agent`*

**What to build.** Remove the Tier 1c "aspirational" row from the README headline
matrix and AGENTS.md tier table into a new "Roadmap" section that states plainly
what is unverified. Fold `GEMINI.md`'s still-relevant content into the Antigravity
notes (Gemini CLI retired 2026-06-18 — already past) and delete the file; update the
README Repository-Layout tree accordingly. Do NOT touch `tier_1c.json` or dispatch
logic — the runtime path stays; only its *advertising* moves.

**Acceptance criteria**
- [ ] No "aspirational"/"unverified" wording above the README fold.
- [ ] `GEMINI.md` gone; no dangling references (`grep -rn GEMINI.md` clean except
      CHANGELOG history).
- [ ] `sk-platform-dispatch` tier_1c detection and profile untouched (diff scope
      check).

**Blocked by.** None. (WI-16 rebases on this.)

**Executed deviation (2026-07-02).** GEMINI.md is NOT deleted: inspection showed it
is the session-context file Antigravity loads at start (the platform's global-rules
path is `~/.gemini/GEMINI.md`), i.e. runtime surface, not documentation — and this
plan preserves the runtime path. The file stays with a roadmap-tier label in the
README layout tree; only the headline tables moved Antigravity to Roadmap.

### WI-06 · Tier 2 manual-install fallback

*Spec: GAP-12 · Label: `enhancement`, `ready-for-agent`*

**What to build.** `bin/install.js` gains a printed manual fallback when
`npx skills` fails for a Tier 2 target (copy `plugins/superpipelines/skills/` into
the tool's skills directory — print the concrete per-tool path), and the README
Tier 2 row links a short "Manual install" subsection.

**Acceptance criteria**
- [ ] Simulated `npx` failure (PATH without npx) produces the manual instructions
      instead of a bare skip warning.
- [ ] README manual-install subsection exists and is generated/checked by the
      WI-01 generator or explicitly excluded from its check scope.

**Blocked by.** WI-01 (generator owns the README table).

---

## 5. Work Items — Wave 2: Enforcement in CI (v2.6.0)

### WI-07 · CI overhaul: run what already exists

*Spec: GAP-08 (§5 jobs 1–4, 6) · Label: `enhancement`, `ready-for-agent`*

**What to build.** Rewrite `.github/workflows/ci.yml` with jobs: **manifests**
(JSON-parse all four + version agreement across the 5 release targets + URL
integrity via WI-04's check), **profiles** (validate `profiles/*.json` against
`profile.schema.json`; `fixtures/valid` pass, `fixtures/invalid` fail),
**guards** (`check-cad-hygiene.js`, `check-worktree-gating.js`,
`check-delete-step-guards.js`, `check:codex-plugin`), **installer-smoke**
(`--list` + `--dry-run --all` on ubuntu/macos/windows; diff against README via
WI-01's `--check`). Every job runnable locally via an npm script.

**Acceptance criteria**
- [ ] All jobs green on the PR itself.
- [ ] Each job fails when seeded with a deliberate defect (one commit per seed,
      reverted — evidence in the PR description).
- [ ] `package.json` scripts mirror every CI job 1:1.

**Blocked by.** WI-01, WI-04 (consumes both checks).

### WI-08 · Authoring lints + preload budget

*Spec: GAP-08 job 4, GAP-09 · Label: `enhancement`, `ready-for-agent`*

**What to build.** `scripts/check-authoring-rules.js`: skill bodies ≤500 lines;
`description` (+`when_to_use`) ≤1536 chars; `agents/*.md` frontmatter-only;
references >100 lines have a ToC; no concrete model IDs (`claude-|gpt-|gemini-`)
in skill bodies outside `profiles/` and preference files. Plus
`scripts/report-preload-budget.js`: per repo agent, sum the line counts of its
`skills:` list; soft budget 1200 lines for `model_tier: fast` agents; report table
in CI output, failing only on hard authoring rules, warning on budget.

**Acceptance criteria**
- [ ] Both scripts wired as CI jobs and npm scripts.
- [ ] Current repo passes hard rules (fix any existing violations in this PR —
      list them in the PR body).
- [ ] Budget report visible in CI logs with per-agent totals.

**Blocked by.** WI-07.

### WI-09 · Materialization-parity job

*Spec: GAP-08 job 5 · Label: `enhancement`, `ready-for-agent`*

**What to build.** `scripts/check-materialization-parity.js`: implements each
`TRANSLATE_CAD_TO_*` as a pure textual transform (CAD frontmatter+body →
native file) and diffs against `fixtures/{codex,oc,cc}-materialize/expected-*/`.
This is executable-spec: where script and SKILL.md pseudocode disagree, the fixture
decides and both are corrected. Update `CLAUDE.md` `PARITY_TESTING` to
`TRANSLATION_AUTOMATED_DISPATCH_MANUAL`.

**Acceptance criteria**
- [ ] Script reproduces every existing expected-output fixture byte-for-byte
      (normalized trailing whitespace allowed).
- [ ] CI job green; seeded translator regression turns it red (evidence in PR).
- [ ] `CLAUDE.md` invariant updated in the same PR.

**Blocked by.** WI-08 (lint baseline first), WI-03 (cc fixture exists).

### WI-10 · Scheduled profile-drift review

*Spec: GAP-10 · Label: `enhancement`, `ready-for-agent`*

**What to build.** A monthly `workflow_dispatch`+`schedule` workflow that opens a
templated issue ("Profile drift review — {month}") listing the checks: CC subagent
frontmatter field list, Codex agent TOML keys and plugin verbs, Copilot agent
frontmatter, model catalogs vs `model_tiers`, `model_tiers_version` staleness >90
days. Plus the same checklist added to the `cutting-a-release` skill.

**Acceptance criteria**
- [ ] Manually dispatched run opens the issue with the checklist and
      `needs-triage` label.
- [ ] `cutting-a-release` SKILL.md contains the drift-check step.

**Blocked by.** WI-07.

---

## 6. Work Items — Wave 3: Codex Verified (v2.7.0)

### WI-11 · [VERIFY-HOST] Codex headless plugin verbs

*Spec: GAP-05 · Label: `bug`, `ready-for-human` (agent stages, human runs host)*

**What to build.** Verification transcript of `bin/install.js --only codex` on a
live Codex install (`codex --help` for the plugin subcommand grammar first). Encode
the verified verbs in `PLATFORMS[].install()`; if `plugin add` vs `plugin install`
differs from the current guess, fix and regenerate README (WI-01 generator).
Record the transcript under `docs/agents/verification/codex-install-2026-MM.md`.

**Acceptance criteria**
- [ ] Transcript committed showing exit-0 install on a real host, plugin visible in
      Codex `/plugins`.
- [ ] Installer + README agree with the transcript (generator check green).
- [ ] RELEASE-NOTES verification note retired.

**Blocked by.** WI-01.

### WI-12 · [VERIFY-HOST] Codex discovery: agent subdirs + skills path

*Spec: GAP-06 · Label: `bug`, `ready-for-human`*

**What to build.** Two live probes: (a) dispatch the `codex-materialize` fixture
agents from `.codex/agents/superpipelines/{P}/` — if nested dirs are not scanned,
flip `tier_1d.json extensions.native_agent_dir` to flat `agents/` with
`{P}--{name}.toml` filenames (profile-only change; translator filename rule follows
the profile) and update the registration-assumption text in
`sk-platform-dispatch/SKILL.md`; (b) fresh-session skill visibility after plugin
install via the `.agents/skills/` path — if stale, point `.codex-plugin/plugin.json
skills` at the verified location. Also verify `turn_limit` and scalar
`instructions` against the live agent parser; correct the translator if either is
rejected. **Known internal inconsistency to resolve here:**
`scripts/package-codex-plugin.js` enforces scalar `developer_instructions` in the
live `.codex/agents/*.toml`, while `TRANSLATE_CAD_TO_CODEX` and the
codex-materialize goldens emit `instructions` — the live host decides which key is
real; packager, translator, and goldens then change together.

**Acceptance criteria**
- [ ] Probe transcripts committed (same `docs/agents/verification/` dir).
- [ ] All three fixture agents resolve and dispatch on the live host, reviewer
      provably read-only (`sandbox_mode` denial observed).
- [ ] Any layout change confined to `tier_1d.json` + fixtures (dependency-inversion
      check: no orchestrator-skill edits beyond the registration-assumption text).

**Blocked by.** WI-11 (same host session), WI-09 (fixtures are the probe payload).

---

## 7. Work Items — Wave 4: Copilot Tier + Launch (v3.0.0)

### WI-13 · tier_1e profile + Copilot translator + fixtures

*Spec: §4.1–4.2 · Label: `enhancement`, `ready-for-agent`*

**What to build.** `profiles/tier_1e.json` per the spec sketch (schema extended with
the `native_agent_file` dispatch-mechanism enum value);
`TRANSLATE_CAD_TO_COPILOT` section in `sk-platform-dispatch/SKILL.md` emitting flat
`.github/agents/superpipelines-{P}-{name}.agent.md` files (reviewers MUST emit an
explicit `tools:` allowlist — omission grants all tools); DETECT() heuristic
inserted before Tier 2; `fixtures/copilot-materialize/` with expected outputs;
installer entry `{ id: 'copilot' }`. Ship with the degradation warning ON
(isolation unverified) — WI-14 decides its fate.

**Acceptance criteria**
- [ ] Profile validates; parity job (WI-09) covers the new translator and is green.
- [ ] Reviewer fixture output contains an explicit read-only `tools:` list; writer
      fixture omits none of the required frontmatter.
- [ ] No skill body outside `sk-platform-dispatch` names Copilot (grep check —
      dependency inversion holds).

**Blocked by.** WI-09, WI-12 (translator conventions finalized).

### WI-14 · [VERIFY-HOST] Copilot isolation probe

*Spec: §4.3 · Label: `enhancement`, `ready-for-human`*

**What to build.** The probe agent (read-only `tools:`, protocol instructs a write
attempt + outcome report) run via `copilot --agent`; transcript committed. Outcome
writes the profile: write blocked → `reviewer_isolation: "structural"`, drop the
degradation warning, invariant text gains Tier 1e; write succeeded →
`"convention"`, warning stays, README tier row says so honestly.

**Acceptance criteria**
- [ ] Transcript committed; `tier_1e.json` matches the observed outcome.
- [ ] README/AGENTS.md tier tables show the evidenced classification only.

**Blocked by.** WI-13.

### WI-15 · Copilot distribution

*Spec: §4.5, §6.4 · Label: `enhancement`, `ready-for-agent`*

**What to build.** Publish user-facing skills via `gh skill publish`; PR to
`github/awesome-copilot`; README install row for Copilot generated by WI-01's
generator.

**Acceptance criteria**
- [ ] `gh skill add gustavo-meilus/superpipelines` (or the published slug) works —
      transcript committed.
- [ ] awesome-copilot PR opened (link in the issue).

**Blocked by.** WI-14.

### WI-16 · README rewrite around the hook

*Spec: §6.1, GAP-11 remainder · Label: `enhancement`, `ready-for-agent`*

**What to build.** Top fold in order: hook ("Your AI reviewer can't edit code.
Structurally."), demo GIF placeholder slot (WI-17 fills it), one-command install
(generator-owned), three bullets (structural isolation · one pipeline every
platform · crash-resumable state). Tier matrix, phases, patterns move below the
fold; invariants stay in CLAUDE.md only. Add the two-axis named comparison table
(vs Superpowers, GSD): *isolation: structural vs prompt-convention* ·
*portability: multi-platform vs CC-only* — factual and generous; note the
convergent two-axis-review validation (§1 L5).

**Acceptance criteria**
- [ ] Top fold ≤40 lines before the first `---`.
- [ ] Generator check (WI-01) still green.
- [ ] Comparison table cites each project's own README positioning, no
      disparagement.

**Blocked by.** All of Wave 1; WI-14 (tier table must show evidenced claims).

### WI-17 · The demo artifact

*Spec: §6.2 · Label: `enhancement`, `ready-for-human` (recording needs hosts)*

**What to build.** Two clips: (a) 90-second reviewer-denial demo — reviewer attempts
an edit, permission layer denies, pipeline halts with the verdict; (b) split-screen
of the same pipeline directory running unmodified on Claude Code, Codex, and
OpenCode. Scripted scenario committed (`docs/demo/scenario.md`) so re-recording is
reproducible; GIFs/MP4s under `assets/`, embedded in README slot.

**Acceptance criteria**
- [ ] Scenario script committed; both assets embedded; README renders them.
- [ ] The split-screen uses one `.superpipelines/` pipeline dir, byte-identical
      across the three hosts (checksum shown in the clip or scenario doc).

**Blocked by.** WI-12 (Codex leg must actually work), WI-16 (slot exists).

### WI-18 · Launch checklist

*Spec: §6.4–6.6, §8 · Label: `enhancement`, `ready-for-human`*

**What to build.** Directory submissions (claude-plugins.dev, claudedirectory.org,
tonsofskills, Codex catalogues), agentskills.io ecosystem listing, and the 3–5 post
series outlines committed under `docs/launch/` (titles per spec §6.5; each ends
with the one-command install). Gate: §6.6 trust hygiene — this item may not start
until every Wave 1 item and WI-07 are merged.

**Acceptance criteria**
- [ ] `docs/launch/checklist.md` with submission links/status.
- [ ] Post outlines committed.
- [ ] Gate condition recorded as checked (link the merged PRs).

**Blocked by.** Everything above.

---

## 8. New Improvement Points Surfaced by the Study

Not in the original gap register; discovered by contrast with `mattpocock/skills`.
File as `needs-triage` issues — they are opinions until the maintainer grills them.

**NI-01 — Skill-body pruning pass (sediment/no-op hunt).** His `writing-great-skills`
vocabulary (no-ops, sediment, leading words, duplication) applied to the 4,477 lines
of Superpipelines SKILL.md bodies would likely cut 20–30%. Highest-value targets:
`sk-platform-dispatch` (470 lines — much is genuinely load-bearing reference, but the
repeated per-tier "registration assumption" paragraphs are one meaning stated four
times: a leading-word candidate), and the `Red Flags — STOP` sections that restate
invariants already listed above them (duplication). A pruning pass is also the best
preparation for the preload-budget work (WI-08): fewer lines preloaded per agent.

**NI-02 — Description discipline.** His rule: descriptions carry *triggers only*,
one per branch, identity pruned. Several Superpipelines skill descriptions embed
workflow summaries (the authoring rules already forbid this — audit against the rule
with WI-08's lint by adding a heuristic: description sentences containing "performs",
"executes", "walks" flag for review).

**NI-03 — Router-skill parity.** `using-superpipelines` plays the role of his
`ask-matt` router. Compare: his router narrates *flows* (main flow, on-ramps,
crossing sessions) rather than listing skills. Restructure `using-superpipelines`
as flows (create → run → maintain → migrate; on-ramps: audit, optimize, failure
analysis) — cheaper to remember, better invocation.

**NI-04 — `/handoff` counterpart.** Superpipelines has crash-resume via state files
but no *conversation*-level handoff. His `handoff` skill (16 lines) compacts a
session into a document for a fresh agent — directly useful between `creating-a-
pipeline` approval and `running-a-pipeline` execution sessions. Candidate small
skill: `sk-pipeline-handoff`, emitting a pointer document (never duplicating state
that `pipeline-state.json` already carries — his rule: reference artifacts, don't
duplicate them).

**NI-05 — Positioning insight (feeds WI-16/WI-18).** His README explicitly attacks
GSD/BMAD/Spec-Kit for "owning the process" and "taking away your control." That
critique applies to Superpipelines too — and the honest answer is the comparison
axis Superpipelines actually wins: *the pieces you'd hand-roll (isolation, state,
portability) are enforced; the process you want to own (what the pipeline does) is
yours.* Use this framing in the comparison table rather than competing on
lightness, which would be lost.

---

## 9. Publishing These Items as Issues

When the maintainer says go: publish WI-01…WI-18 in dependency order (blockers
first, so `Blocked by` references real issue numbers) via the conventions in
`docs/agents/issue-tracker.md` — `gh issue create` with the body template from each
work item above (Parent: this plan; What to build; Acceptance criteria; Blocked by),
labels: category from each header + `ready-for-agent` (or `ready-for-human` for the
[VERIFY-HOST] items). NI-01…NI-05 go up as `needs-triage`. Every issue body starts
with the triage disclaimer line required by the repo's triage conventions when
AI-generated.
