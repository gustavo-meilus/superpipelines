# Launch Checklist - v2.5.0 Trust Release

This checklist converts the launch-readiness research into release actions. It is intentionally operational: if an item is not checkable, it does not belong here.

## Gate

- [ ] PR #90 merged to `main`.
- [ ] `v2.5.0` tag and GitHub release created from the CHANGELOG section.
- [ ] PR #89 either merged first or closed as superseded by PR #90.
- [ ] GitHub release body links the Codex discovery transcript and names the open Hyper-V re-probe.
- [ ] Repository description updated to: `Multi-agent pipelines for AI coding tools with structurally isolated reviewers and crash-resumable state.`
- [ ] Repository topics include: `ai-agents`, `agent-skills`, `claude-code`, `codex`, `opencode`, `cursor`, `windsurf`, `cline`, `developer-tools`, `code-review`, `workflow-automation`.
- [ ] Social preview image uploaded from `assets/social-preview.svg` or a rendered PNG equivalent.

## Evidence links to keep visible

- Codex install verification: `docs/agents/verification/codex-install-2026-07.md`
- Codex discovery and BREACH transcript: `docs/agents/verification/codex-discovery-2026-07.md`
- Privacy policy: `PRIVACY.md`
- Security reporting: `SECURITY.md`
- Contribution evidence rules: `CONTRIBUTING.md`

## Launch assets

- [ ] Record the reviewer-denial clip: reviewer attempts a write, host blocks it, pipeline reports the verdict.
- [ ] Record the portability clip: one pipeline directory, checksum shown, running on Claude Code, Codex, and OpenCode.
- [ ] Replace the README demo-slot note with the final GIF or video links.
- [ ] Keep the README first viewport focused on the hook, install, and three proof bullets.
- [ ] Prepare screenshots of the `BREACH` transcript and the v2.5.0 warning downgrade.

## Hacker News plan

- Use `docs/launch/show-hn-draft.md` as the working post.
- Link the repository, not a landing page.
- Be online for the first 7 hours after posting; current Show HN traffic still concentrates comment activity early.
- Reply in technical detail. Do not ask friends or coworkers for booster comments.
- Lead with the failure transcript and the fix; avoid superlatives.

## Distribution

- [ ] Claude Code community registries: claude-plugins.dev, claudedirectory.org, tonsofskills.
- [ ] Codex marketplace and compatible skills catalogues.
- [ ] agentskills.io ecosystem discussion or showcase submission.
- [ ] Blog/post series:
  - Prompt-based code review is theater.
  - We red-teamed our own security claim.
  - One pipeline, many coding agents.
  - What crash-resumable agent state looks like.

## Source-backed launch rules

- Hacker News launch guidance emphasizes a clear one-sentence description, technical detail, easy trial, modest language, and feedback-oriented replies: https://news.ycombinator.com/yli.html
- Current Show HN listings confirm GitHub repos and developer tools are normal launch targets: https://news.ycombinator.com/show
- Agent Skills positioning should emphasize portable skill folders with `SKILL.md`, scripts, references, and assets: https://agentskills.io/home
- GitHub repository topics and social previews are first-touch discovery surfaces: https://docs.github.com/articles/classifying-your-repository-with-topics and https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview
- Recent agent-security coverage makes the trust angle timely; do not launch with vague safety claims: https://www.tomshardware.com/tech-industry/cyber-security/ai-coding-agents-can-be-tricked-into-installing-malware-via-clean-github-repositories-mozillas-0din-team-shows-how-claude-code-can-be-exploited-by-its-own-helpfulness
