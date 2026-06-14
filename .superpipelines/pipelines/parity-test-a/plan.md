# Plan: parity-test-a

## Tech stack

- Platform: Claude Code (Tier 1)
- Agent format: Zero-body YAML frontmatter + companion protocol SKILL.md
- Dispatch: `Task()` primitive via abstract `DISPATCH(mode="task", ...)` notation
- Model: `model_tier: fast` → `claude-haiku-4-5-20251001` (resolved at runtime)
- Scope root: `.claude/` (workspace)

## Architecture

```
Entry Skill (run-parity-test-a)
  │
  ├─ DISPATCH reader (worktree-isolated)
  │     reads {INPUT_PATH} (YAML)
  │     writes {ROOT}/temp/parity-test-a/{runId}/key-value-data.json
  │
  └─ DISPATCH summarizer (worktree-isolated)
        reads key-value-data.json
        writes {ROOT}/output/parity-test-a-summary.txt
```

## API contracts

**key-value-data.json**
```json
{
  "source_path": "string",
  "total_keys": "number",
  "entries": [
    { "key": "string", "value": "string", "raw_type": "string" }
  ]
}
```

## Dependency matrix

| Component | Depends on | Owned by |
|-----------|-----------|----------|
| reader agent | entry skill dispatch | reader-protocol SKILL.md |
| summarizer agent | reader output | summarizer-protocol SKILL.md |
| entry skill | reader + summarizer | run-parity-test-a SKILL.md |

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| YAML parse failure | low | reader emits BLOCKED with parse error detail |
| Output dir missing | low | entry skill creates `output/` before dispatch |

## Explicit design decisions

- Zero-body agents: protocol in companion skill, not agent body (CC-specific `LEAN_AGENTS_CC_ONLY`).
- `model_tier: fast` for both steps: triage tasks, no reasoning required.
- Worktree isolation on all steps: consistent with Tier 1 capability, even when not strictly required for a non-reviewer pipeline.
