# Fixture — Antigravity (1c) + Tier 2 dispatch (no materialization)

Issue #67. These two tiers do **not** get structural per-step materialization, so there is no
golden agent file to diff. The verifiable artifact is the **dispatch decision** and the
**degradation warnings surfaced** from the same canonical agent def (CAD) used on CC/OC/Codex.

## Inputs

- `input/doc-writer.cad.md` — writer CAD (`write_files:true`). Same CAD as the CC/OC/Codex fixtures.
- `input/doc-reviewer.cad.md` — reviewer CAD (`write_files:false`). The would-be structural reviewer.

(Reuse the canonical CADs from `../codex-materialize/input/` — identical content; copied here so the
fixture is self-contained.)

## Expected behavior

### Antigravity (Tier 1c) — `model_driven`, `dynamic_subagents:true`, `model_field_format:"omit"`

- **No materialized file written.** AGY auto-manages dynamic subagents at the orchestrator tier.
- Dispatch passes the CAD's **inline protocol body** as the subagent task
  (`build_prompt(step, inputs) + cad.body`).
- **Per-step model OMITTED** — the host orchestrator owns subagent model selection (AC2).
- Reviewer isolation is **convention-only**: the reviewer CAD's `write_files:false` carries **no**
  structural write-deny on this tier; the dynamic subagent shares the orchestrator context.
- **Degradation surfaced** (AC3) — both `tier_1c.json` `degradation_warnings`:
  1. per-step model assignment unsupported (orchestrator tier only);
  2. reviewer isolation convention-only (review output is a self-check).

### Tier 2 (Cursor / Windsurf / Cline) — `inline`

- **No subagent boundary.** The inline loop reads the CAD's protocol **body as data**
  (`Read(step.agent_def)`, NOT `Skill(step.protocol_skill)`) and executes inline (AC1).
- Generated (data-only) agents therefore have **no dependency on a discovered protocol skill**.
- **No model emitted** — host IDE selects the model (`model_tiers` all `inherit`).
- Reviewer isolation is **convention-only**: writer and reviewer are the same agent in the same
  context. Review steps run the reviewer protocol as a self-check, not structural verification.
- **Degradation surfaced** (AC3) — `tier_2.json` `degradation_warnings` (reviewer isolation
  impossible; Pattern 2/3 unavailable; model owned by host).

## Surfacing mechanism

Both tiers' warnings reach the user through the existing profile-driven path (no per-tier code):
`running-a-pipeline` Phase 0.25 emits every `profile.degradation_warnings` entry at run start, the
entry skill repeats them at run end, and they are written to
`pipeline-state.json metadata.isolation_warning`. See `SKILL.md` "Degradation Surfacing".

## AC4 (live Tier 2 end-to-end run)

Deferred to a fresh post-merge session on a Tier 2 host: run a data-only pipeline inline and confirm
it completes reading CAD bodies, with the convention-isolation degradation surfaced in the report.
