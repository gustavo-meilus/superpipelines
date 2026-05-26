# Plan: parity-test-e

## Tech stack

- Platform: Codex CLI (Tier 1d)
- Dispatch mechanism: model_driven (host orchestrates TOML subagents)
- Agent format: TOML (`.toml`) — NOT YAML frontmatter `.md` files
- Skill format: Superpipelines v2.0.0 SKILL.md protocol
- State format: `pipeline-state.json` (structured JSON per `STATE_MANAGEMENT: STRUCTURED_JSON`)
- Output format: Markdown

## Architecture

```
User
  │
  ▼
run-parity-test-e (entry skill, model_driven dispatch)
  │
  │  Sequential — Pattern 1
  │
  ├──► extractor agent  (extractor.toml)
  │      Reads the changelog markdown file
  │      Extracts breaking-change and new-feature entries
  │      Writes entries to pipeline-state.json + entries temp file
  │      Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
  │
  └──► formatter agent  (formatter.toml)
         Reads extractor entries file
         Renders concise release summary markdown
         Writes output/parity-test-e-release-summary.md
         Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
```

## API contracts

### Extractor output (written to pipeline-state.json phases[0].outputs)

```json
{
  "entries_path": "{ROOT}/superpipelines/temp/parity-test-e/{runId}/changelog-entries.json",
  "version_count": 3,
  "breaking_count": 2,
  "feature_count": 5
}
```

### changelog-entries.json schema

```json
{
  "changelog_path": "{path-to-changelog-file}",
  "version_count": 3,
  "breaking_changes": [
    {"version": "v2.0.0", "description": "Renamed config key X to Y."}
  ],
  "new_features": [
    {"version": "v2.0.0", "description": "Added support for multi-platform dispatch."}
  ]
}
```

### Formatter output (written to pipeline-state.json phases[1].outputs)

```json
{
  "summary_path": "{ROOT}/output/parity-test-e-release-summary.md",
  "breaking_count": 2,
  "feature_count": 5
}
```

## Dependency matrix

| Component | Depends on | Owned by |
|---|---|---|
| `run-parity-test-e` (entry skill) | Platform dispatch | Orchestrator (host) |
| `extractor` agent | `run-parity-test-e` dispatch | Codex model_driven |
| `formatter` agent | `extractor` entries in state | Codex model_driven |
| `output/parity-test-e-release-summary.md` | `formatter` agent | formatter |

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Changelog file not found | medium | extractor emits `NEEDS_CONTEXT` with clear path advisory |
| Changelog has no recognized version headers | low | extractor emits `DONE_WITH_CONCERNS` with zero-entry output |
| changelog-entries.json malformed | low | formatter validates JSON before rendering; emits `BLOCKED` if invalid |

## Rollout plan

- Phase 1: Manual scaffold verification (this pipeline).
- Phase 2: Manual execution on Codex CLI to verify model_driven dispatch and TOML agent loading.
- Rollback procedure: Delete `output/parity-test-e-release-summary.md` and `superpipelines/temp/parity-test-e/`.

## Explicit design decisions

- **Pattern 1 (Sequential)**: Chosen because Tier 1d has `worktrees: false`, which excludes Patterns 2, 3, and 5. Pattern 1 is the correct tier-safe choice for Codex.
- **TOML agent files**: Required by Tier 1d (`model_field_format: toml_split`). Agents are `.toml` files — NOT YAML frontmatter `.md` files.
- **Per-step model in TOML**: Tier 1d supports per-step model assignment. `model = "gpt-5.4-mini"` and `model_reasoning_effort = "medium"` are set directly in each agent TOML (fast tier, effort_emit_map: medium → "medium").
- **sandbox_mode**: Writer agents use `sandbox_mode = "workspace-write"` per the reviewer_isolation_recipe; reviewer agents (none in this pipeline) would use `sandbox_mode = "read-only"`.
- **Entries written to temp file**: Avoids context-bloating the formatter spawn prompt (anti-pattern #3 — Context Dumping). The formatter receives a file path, not content.
- **No `model_intent_scaffold_tier`**: Not needed on Tier 1d (`dynamic_subagents: false` — per-step model works natively). Per-step model is written directly in each agent TOML.
