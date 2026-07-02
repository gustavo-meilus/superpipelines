# Show HN Draft - Superpipelines

Title options:

1. Show HN: Superpipelines - AI code review where reviewers cannot edit code
2. Show HN: We red-teamed our AI reviewer isolation claim, and it failed on Codex
3. Show HN: Superpipelines - multi-agent coding pipelines with honest isolation warnings

Recommended title: **Show HN: Superpipelines - AI code review where reviewers cannot edit code**

## Draft post

Hi HN, I am building Superpipelines, an open-source plugin for running multi-agent coding workflows across Claude Code, OpenCode, Codex, Cursor, Windsurf, and Cline.

The core idea is simple: the agent that reviews code should not be the same agent that edits it, and it should not be able to "just fix one small thing" while reviewing. On hosts with permission-layer support, Superpipelines materializes reviewer agents with write-deny constraints. On hosts that cannot enforce that, the run is downgraded and the warning is written into the pipeline metadata.

The part I think HN will find most interesting is the failure case. We tested the Codex `sandbox_mode = "read-only"` claim on a live host and the reviewer wrote a file containing `BREACH`. Instead of hiding that, v2.5.0 ships a host-conditional downgrade: Codex remains structural on sandbox-capable hosts, but unsandboxed sessions such as `danger-full-access` are marked advisory and surfaced to the user.

The transcript is here:

https://github.com/gustavo-meilus/superpipelines/blob/main/docs/agents/verification/codex-discovery-2026-07.md

What the project does:

- Creates a spec, plan, task list, topology, and run state for a named workflow.
- Dispatches writer and reviewer roles through the native primitives of each coding tool where available.
- Keeps run state local and resumable after a crash or context reset.
- Runs CI checks that compare README install commands against the installer, generated agent goldens against translators, and platform profiles against schemas.

Install:

```bash
npx -y superpipelines-install
```

The project is MIT licensed, local-only by default, and the plugin itself collects no telemetry.

I would especially like feedback on the enforcement model: where you think the reviewer boundary is useful, where it is too heavy, and which host behaviors should be treated as hard stops instead of warnings.

## Reply notes

- If someone says the project is heavy: agree with the tradeoff. It is for teams that want enforcement, state, and portability more than minimal ceremony.
- If someone asks whether Codex is safe: answer narrowly. Sandbox-capable hosts can enforce the TOML setting; unsandboxed sessions cannot, and Superpipelines surfaces that downgrade.
- If someone compares it to Superpowers or GSD: be respectful. The overlap is plan/test/verify discipline; the difference is permission-layer isolation and cross-platform materialization.
- If someone asks about OpenClaw/Cline/agentjacking: connect the concern to the repo's local-only privacy policy, security policy, and explicit no-overclaim stance.
