# Viral Growth Playbook — Superpipelines

> Actionable distillation of the virality research (full evidence:
> `docs/analysis/competitive-landscape-2026-07.md` §3/§6, spec §6, fix plan WI-16..18
> and NI-05). This file is the working checklist for the launch workstream. Refreshed
> 2026-07-02 with the July HN climate signal.

## Table of contents

1. Why the neighbors went viral (mechanics, not vibes)
2. The July 2026 climate shift — and why it favors this project
3. The Superpipelines viral thesis
4. The playbook (ordered actions)
5. Anti-patterns (what would kill it)

## 1. Why the neighbors went viral

| Project | Scale | The actual mechanism |
| :--- | :--- | :--- |
| **Superpowers** (obra) | 0 → 121K stars in ~5 months (~2.3K/day at peak, #2 trending) | A *methodology*, not a tool: "plan before you build, test before you ship, verify before done." Author authority (Perl lead, Keyboardio) + building in public on his blog; zero marketing budget. HN consensus: "kernel of a good idea," criticized as "somewhat overengineered" — the criticism itself kept threads alive. |
| **Karpathy behavioral skill** | ~156K stars in weeks | One viral post by a celebrity, converted into a *one-file, zero-dependency* artifact within days. Speed-to-artifact was the whole play. |
| **GSD** | ~60K stars | Named an enemy (BMAD/Spec-Kit "ceremony") and shipped relentlessly. Positioning against a named alternative gives commentators a story to retell. |
| **OpenClaw** | 9K → 210K+ | Founder authority + a capability demo nobody else could show. |
| **Ruflo** (counter-example) | 250K LoC, only ~31K stars | Engineering weight without a retellable story. Capability does not create virality. |

Common denominators: **(a)** a belief stated in one sentence, **(b)** an artifact installable in 30 seconds, **(c)** an author channel that compounds, **(d)** a named contrast, **(e)** speed from moment → artifact.

## 2. The July 2026 climate shift

HN's technical audience has rotated from shiny demos toward **trust, security, and
stability**. This is the single most favorable market condition this project will
ever get, because Superpipelines' differentiators are literally safety properties:

- Structural (permission-layer) reviewer isolation — a security claim, not a UX claim.
- **The Probe D story**: this repo live-tested its own isolation claim on Codex,
  found it FALSE on unsandboxed hosts (a read-only agent wrote `BREACH` to disk),
  published the transcript, and shipped a host-conditional downgrade with a surfaced
  warning instead of papering over it (`docs/agents/verification/codex-discovery-2026-07.md`,
  v2.5.0). *No competing framework has ever red-teamed its own marketing claim in
  public.* This is the most credible launch artifact the project owns.
- CI that enforces the README against the installer, goldens against translators,
  and profiles against schemas — "we can't ship a claim we don't test."

## 3. The Superpipelines viral thesis

One sentence: **"Your AI reviewer can't edit code. Structurally — and when a host
can't enforce that, we tell you instead of pretending."**

The honest second clause is now part of the hook, not a footnote. In a
trust-rotated market, the Probe D episode converts a weakness into the strongest
possible proof of the first clause.

Answer to the anti-ceremony school (Superpowers/GSD/mattpocock critique that
frameworks "own your process"): *Superpipelines enforces the pieces you'd hand-roll
(isolation, state, portability) and leaves the process — what your pipeline actually
does — entirely yours.* Never compete on lightness; that fight is lost by design.

## 4. The playbook (ordered)

**Gate (done / in flight):** trust hygiene shipped in v2.5.0 — honest install table,
honest invariants, CI enforcement, live-verified Codex schema. Do not promote before
it is on `main` and tagged.

1. **README top fold** (WI-16): hook sentence above → 90-second GIF slot → the
   one-command install → three bullets (structural isolation · one pipeline, every
   platform · crash-resumable state). Everything else below the fold.
2. **Record the two demos** (WI-17):
   - *The denial*: a reviewer agent attempts an edit, the permission layer denies
     it, the pipeline halts with a verdict.
   - *The un-recordable-by-anyone-else clip*: one `.superpipelines/` directory,
     checksummed, running unmodified on Claude Code, Codex, and OpenCode
     split-screen. This is the portability moat made visible.
3. **Write the launch post around Probe D**: title shape — *"We red-teamed our own
   security claim (and it failed on Windows)"*. Include the raw transcript, the
   `BREACH` output, the fix, and the still-open re-probe. This is precisely the
   trust-content HN's July climate rewards, and it carries the isolation thesis
   implicitly. Post the repo link, not a landing page (HN launch guidance: link the
   repo; make it obviously runnable).
4. **Named comparison table** in the README (WI-16): Superpipelines vs Superpowers
   vs GSD on exactly two axes — *isolation: structural vs prompt-convention* and
   *portability: multi-platform vs Claude-Code-only*. Generous and factual; cite
   each project's own README. Note the convergent design validation (their two-axis
   review ≈ our Stage-1/Stage-2 with harder enforcement).
5. **Author channel, 3–5 posts** (spec §6.5): "Prompt-based code review is theater",
   the Probe D post (above), "One pipeline, seven platforms" (with the clip), "What
   crash-resumable agent state looks like". Each ends with the one-command install.
   Superpowers proved this channel alone is sufficient.
6. **Distribution** (WI-15/WI-18): Claude Code community registries
   (claude-plugins.dev, claudedirectory.org, tonsofskills), Codex marketplace +
   skills catalogues, `gh skill publish` + awesome-copilot PR once tier_1e lands,
   agentskills.io ecosystem listing ("the pipeline layer of the Agent Skills
   standard").
7. **Speed rule**: when the next Karpathy-style moment happens in the agent-safety
   or agent-reliability conversation, ship a runnable artifact referencing it within
   48 hours. The Karpathy skill's 156K stars were won on speed-to-artifact, not
   depth.

## 5. Anti-patterns

- **Leading with tiers, invariants, or the phase table.** Architecture-first is the
  documented failure mode; the audience retells beliefs, not matrices.
- **Any claim ahead of its evidence.** One contradiction found by a viral-moment
  reader becomes the top comment. The evidence discipline (transcripts under
  `docs/agents/verification/`, CI badges) is the brand now — keep it absolute.
- **Competing on lightness or simplicity.** Concede it; sell enforcement and
  portability.
- **Disparaging the neighbors.** Superpowers/GSD threads are the discovery surface;
  respectful comparison recruits their audiences, attacks repel them.
- **Launching while the Codex re-probe is open without saying so.** Say it — the
  open item *is* the credibility.
