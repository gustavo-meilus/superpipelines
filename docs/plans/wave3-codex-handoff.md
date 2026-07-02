# Wave 3 Handoff — Live-Host Codex Verification (WI-11 + WI-12)

> Handoff document for a fresh agent session running **inside Codex (GPT-5.5) on a
> machine with a live Codex App/CLI install** — the one environment Waves 1–2 could
> not reach. You are the verification instrument: the point of this wave is to
> replace documented guesses about Codex behavior with observed evidence, then make
> the repo agree with the evidence.
>
> Parent plan: `docs/plans/fix-plan-2026-07.md` (§6, items WI-11 and WI-12 — read
> those two items first; this document adds only the live-host specifics).
> Spec: `docs/specs/v3-compatibility-and-growth-spec.md` (GAP-05, GAP-06).
> Do not re-derive Wave 1–2 context; it is recorded in the plan's Execution Status.

## Operating rules

1. **Evidence before edits.** Run the probe, capture the transcript, then change
   code/docs to match what you observed — never the reverse. Commit transcripts
   under `docs/agents/verification/` (create the directory).
2. **One work item = one commit** on branch
   `claude/superpipelines-comparison-analysis-k68cb4` (continue it; do not branch
   off main). Push after each commit.
3. **Profile-driven fixes only.** Per-platform facts belong in
   `skills/sk-platform-dispatch/profiles/tier_1d.json`; if a fix tempts you to edit
   an orchestrator skill body with a Codex-specific value, stop — that is the
   defect pattern this repo's `DEPENDENCY_INVERSION` invariant forbids
   (`CLAUDE.md`).
4. **After every content change**: `npm run check:all` must be green, and
   `npm run package:codex` must be re-run so `plugins/superpipelines/` mirrors
   source (CI enforces both).
5. If an assumption fails and the fix is ambiguous, record the failing transcript,
   write the options into the transcript file, and stop for the maintainer rather
   than guessing.

## WI-11 — Verify the headless plugin verbs (spec GAP-05)

**Current guess** (in `bin/install.js`, `PLATFORMS[]` entry `codex`):

```
codex plugin marketplace add gustavo-meilus/superpipelines
codex plugin add superpipelines@superpipelines-marketplace
```

The documented *interactive* flow is `/plugin marketplace add` + `/plugin install`;
whether the headless CLI verb is `add` or `install`, and how the marketplace name is
derived, is exactly what you must observe.

**Steps**

1. `codex --version` and `codex plugin --help` (and `codex plugin marketplace --help`)
   — capture the actual subcommand grammar.
2. Run `node bin/install.js --only codex` from the repo root. Capture full output.
3. Confirm the plugin is visible: open Codex, run `/plugins` (or the headless
   equivalent the help revealed); confirm `superpipelines` is listed and its skills
   are discoverable in a **fresh** Codex session (type `/` and look for
   `superpipelines` entries, or ask "what superpipelines skills are available?").
4. Save the transcript to
   `docs/agents/verification/codex-install-2026-07.md` (raw commands + outputs +
   your one-paragraph verdict at top).
5. If the verbs differ from the guess: fix `PLATFORMS[].install()` /
   `uninstallCmd` in `bin/install.js`, then `npm run docs:install-table` (the README
   regenerates from the installer — do not hand-edit the table).
6. Retire the Codex "pending verification" note from `RELEASE-NOTES.md` (search for
   it; state the verified syntax and link the transcript).

**Done when**: transcript committed; install exits 0 on this host; plugin + skills
visible in a fresh session; `npm run check:install-docs` green; RELEASE-NOTES note
retired. Commit as `fix: verify Codex headless plugin install flow on live host (WI-11)`.

## WI-12 — Verify Codex discovery + agent TOML keys (spec GAP-06)

Four probes. The payload for A, C, D is the golden fixture set at
`skills/sk-platform-dispatch/fixtures/codex-materialize/expected-codex/*.toml`
(doc-writer, doc-reviewer, triage-probe).

### Probe A — nested agent-directory discovery

The dispatcher (`sk-platform-dispatch/SKILL.md`, MATERIALIZE) writes agent TOMLs to
`.codex/agents/superpipelines/{P}/{name}.toml`. Official docs confirm
`.codex/agents/` but not recursive subdirectory scanning.

1. Copy the three fixture TOMLs to `.codex/agents/superpipelines/parity-probe/` in a
   scratch workspace.
2. In a fresh Codex session in that workspace, attempt to invoke/dispatch each agent
   by name (`doc-writer`, `doc-reviewer`, `triage-probe`). Record whether each
   resolves.
3. **If nested dirs are NOT scanned**: flatten via profile only — set
   `tier_1d.json extensions.native_agent_dir` to `"agents"` and add an
   `extensions.native_agent_filename` convention (`"{P}--{name}"`), update the
   MATERIALIZE filename rule and the Codex registration-assumption paragraph in
   `sk-platform-dispatch/SKILL.md`, and regenerate/move the goldens accordingly.
   Re-probe from the flat location to confirm.

### Probe B — skills discovery path

`.codex-plugin/plugin.json` points `skills` at `../.agents/skills/`; the tier_1d
profile note claims Codex discovers `.agents/skills` and `~/.agents/skills`.

1. After the WI-11 install, in a fresh session, confirm the superpipelines skills
   actually load (Probe WI-11 step 3 may already cover this — if so, cite it).
2. If they don't: find where Codex currently reads skills from (`codex --help`,
   config docs, or `~/.codex/config.toml`), point the manifest `skills` field there,
   re-run `npm run check:codex-plugin`, and update the
   `extensions.skill_tool_note` in `tier_1d.json`.

### Probe C — TOML keys: `instructions` vs `developer_instructions`, `turn_limit`

**Known internal inconsistency (you resolve it):**
`scripts/package-codex-plugin.js` (`validateCodexAgentTomls`) enforces scalar
`developer_instructions = """…"""` in the live `.codex/agents/*.toml`, while
`TRANSLATE_CAD_TO_CODEX` (SKILL.md) and the golden fixtures emit `instructions`.
At most one is what the live parser accepts.

1. Create two minimal agents in `.codex/agents/`, identical except one uses
   `instructions`, the other `developer_instructions`. Invoke both; observe which
   (or both) carries the system prompt (ask each agent to repeat a marker sentence
   embedded in its instructions).
2. Same probe for `turn_limit`: include it and observe whether Codex rejects the
   file or honors/ignores the key (an unknown-key parse error vs silent accept are
   both possible — record which).
3. **Make the repo agree with the winner — all four sites together, one commit**:
   `TRANSLATE_CAD_TO_CODEX` in `sk-platform-dispatch/SKILL.md`, the
   `expected-codex/*.toml` goldens, `scripts/check-materialization-parity.js`
   (`translateToCodex`), and `scripts/package-codex-plugin.js`
   (`validateCodexAgentTomls`) plus the live `.codex/agents/*.toml` files if the key
   changes. `npm run check:parity` and `npm run check:codex-plugin` are your proof
   they now agree.

### Probe D — reviewer isolation is real

1. Dispatch `doc-reviewer` (materialized with `sandbox_mode = "read-only"`) and
   instruct it to attempt writing a file (e.g. "create probe-output.txt with the
   word BREACH"). Record the denial (or the breach — if it writes, that is a SEV-1
   finding: record it, do NOT paper over it, stop for the maintainer).
2. Dispatch `doc-writer` and confirm it CAN write — proving the denial above comes
   from `sandbox_mode`, not a broken setup.

### WI-12 wrap-up

- Save all probe transcripts to
  `docs/agents/verification/codex-discovery-2026-07.md` (one file, sectioned A–D,
  verdicts at top).
- Any profile change: bump nothing else — `profile_version` stays until release;
  run `npm run check:profiles`.
- Update the tier_1d row facts anywhere they surface only if evidence changed them
  (`README.md` tier table regenerates nothing — it is hand-maintained below the
  install table; `AGENTS.md` row; `sk-platform-dispatch` prose).
- `npm run check:all` green; `npm run package:codex`; commit as
  `fix: verify Codex discovery, TOML keys, and read-only isolation on live host (WI-12)`;
  push.

## After Wave 3

Report back: per-probe verdict table + links to the two transcript files + whether
WI-13 (Copilot tier, `ready-for-agent`) is now unblocked. Do not start WI-13 in the
same session — it belongs to a fresh context per the plan's execution model.

## Quick reference

| Thing | Where |
| :--- | :--- |
| Parent plan (WI-11/WI-12 acceptance criteria) | `docs/plans/fix-plan-2026-07.md` §6 |
| Spec gaps | `docs/specs/v3-compatibility-and-growth-spec.md` GAP-05, GAP-06 |
| Codex profile | `skills/sk-platform-dispatch/profiles/tier_1d.json` |
| Codex translator (normative pseudocode) | `skills/sk-platform-dispatch/SKILL.md` §Codex (Tier 1d) materialization |
| Golden fixtures (probe payload) | `skills/sk-platform-dispatch/fixtures/codex-materialize/` |
| Parity harness (must stay green) | `scripts/check-materialization-parity.js` (`npm run check:parity`) |
| Packager + TOML validator | `scripts/package-codex-plugin.js` (`npm run check:codex-plugin`) |
| Installer | `bin/install.js` (README table via `npm run docs:install-table`) |
| Full local gate | `npm run check:all` |
| Branch | `claude/superpipelines-comparison-analysis-k68cb4` |
