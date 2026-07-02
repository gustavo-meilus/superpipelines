# Contributing to Superpipelines

Superpipelines is a trust-sensitive orchestration project. Contributions are welcome, but changes that affect installer output, platform profiles, reviewer isolation, or generated agent files must include evidence.

## Before opening a PR

1. Sync with `main` and create a focused branch.
2. Keep each PR to one behavioral claim or one documentation slice.
3. Run the full local gate:

```bash
npm run check:all
```

4. Put the command output summary in the PR description.

## Required evidence

- Installer or README install changes: include `node scripts/generate-install-docs.js --check`.
- Platform profile changes: include `npm run check:profiles`.
- Translator, CAD, or generated-agent changes: include `npm run check:parity`.
- Codex package changes: include `npm run check:codex-plugin`.
- Any claim about a live host behavior: include a transcript under `docs/agents/verification/`.

## Review expectations

- Claims must be no broader than the evidence.
- Reviewer isolation is a security boundary. Do not weaken it without a matching README, AGENTS.md, release-note, and profile update.
- If a host cannot enforce an isolation claim, surface the degradation rather than hiding it.

## Community

Follow the [Code of Conduct](CODE_OF_CONDUCT.md). For security issues, use [SECURITY.md](SECURITY.md) instead of a public issue when sensitive details are involved.
