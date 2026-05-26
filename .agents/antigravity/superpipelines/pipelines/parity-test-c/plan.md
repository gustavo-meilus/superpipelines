# Plan: parity-test-c

## Tech stack

- Platform: Antigravity CLI (Tier 1c)
- Dispatch mechanism: model_driven (host orchestrates subagents)
- Skill format: Superpipelines v2.0.0 SKILL.md protocol
- State format: `pipeline-state.json` (structured JSON per `STATE_MANAGEMENT: STRUCTURED_JSON`)
- Output format: Markdown

## Architecture

```
User
  │
  ▼
run-parity-test-c (entry skill, model_driven dispatch)
  │
  │  Sequential — Pattern 1
  │
  ├──► analyzer agent
  │      Reads input document
  │      Extracts themes + structure metadata
  │      Writes findings to pipeline-state.json
  │      Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
  │
  └──► summarizer agent  (receives findings path from state)
         Reads analyzer findings
         Renders structured markdown summary
         Writes output/parity-test-c-summary.md
         Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
```

## API contracts

### Analyzer output (written to pipeline-state.json phases[0].outputs)

```json
{
  "findings_path": "{ROOT}/superpipelines/temp/parity-test-c/{runId}/analyzer-findings.json",
  "theme_count": 3,
  "structure_sections": ["Introduction", "Body", "Conclusion"]
}
```

### analyzer-findings.json schema

```json
{
  "themes": ["theme-1", "theme-2", "theme-3"],
  "structure": {
    "sections": ["section-name"],
    "word_count": 0,
    "tone": "formal | informal | neutral"
  },
  "source_path": "{path-to-input-document}"
}
```

### Summarizer output (written to pipeline-state.json phases[1].outputs)

```json
{
  "summary_path": "{ROOT}/output/parity-test-c-summary.md",
  "word_count": 0
}
```

## Dependency matrix

| Component | Depends on | Owned by |
|---|---|---|
| `run-parity-test-c` (entry skill) | Platform dispatch | Orchestrator (host) |
| `analyzer` agent | `run-parity-test-c` dispatch | Antigravity model_driven |
| `summarizer` agent | `analyzer` findings in state | Antigravity model_driven |
| `output/parity-test-c-summary.md` | `summarizer` agent | summarizer |

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Input document not found | medium | analyzer emits `NEEDS_CONTEXT` with clear path advisory |
| analyzer-findings.json malformed | low | summarizer validates JSON before rendering; emits `BLOCKED` with diff if invalid |
| Host model selection produces degraded output | low | Tier 1c degradation_warning surfaced at run start; results are best-effort |

## Rollout plan

- Phase 1: Manual scaffold verification (this pipeline).
- Phase 2: Manual execution on Antigravity CLI to verify model_driven dispatch.
- Rollback procedure: Delete `output/parity-test-c-summary.md` and `superpipelines/temp/parity-test-c/`.

## Explicit design decisions

- **Pattern 1 (Sequential)**: Chosen because Tier 1c has `worktrees: false`, which excludes Patterns 2, 3, and 5. Pattern 1 is the correct tier-safe choice.
- **model_tier: inherit on all step agents**: Required by Tier 1c (`model_field_format: omit`). The host orchestrator owns model assignment.
- **model_intent_scaffold_tier: medium for all steps**: Records the author's per-step intent for cross-tier portability. On a per-step-capable tier (1, 1b, 1d), these steps would run at `medium`.
- **Findings written to state + temp file**: Avoids context-bloating the summarizer spawn prompt (anti-pattern #3 — Context Dumping). The summarizer receives a file path, not content.
