# Plan: parity-test-i

## Tech stack

- Platform: OpenCode v1.15.10 (Tier 1b)
- Dispatch mechanism: `native_subagent` — OC spawns each agent as a distinct subagent process via `DISPATCH(mode="subagent", ...)`
- Agent format: YAML frontmatter + protocol body ≤150 lines (`.md` files)
- Skill format: Superpipelines v2.0.0 SKILL.md protocol (entry skill only — no companion protocol skills on Tier 1b)
- State format: `pipeline-state.json` (structured JSON per `STATE_MANAGEMENT: STRUCTURED_JSON`)
- Output format: Plain text (.txt)
- Model selection: `opencode/big-pickle` — declared in each agent's frontmatter (`model_field_format: provider_prefixed`)

## Architecture

```
User
  │
  ▼
run-parity-test-i (entry skill — SKILL.md, disable-model-invocation: true)
  │
  │  [Surface Tier 1b degradation warning before execution]
  │
  │  Sequential — Pattern 1 (native_subagent dispatch)
  │
  ├──► DISPATCH(mode="subagent", agent="inspector", context={...})
  │      Reads the input JSON file
  │      Extracts each top-level key and the type of its value
  │      Writes key-type-data.json to temp directory
  │      Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
  │
  └──► DISPATCH(mode="subagent", agent="formatter", context={...})
         Reads key-type-data.json from temp directory
         Formats human-readable summary with one line per key
         Writes parity-test-i-summary.txt to output/
         Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
```

**Key Tier 1b constraints:**
- Each step dispatched as a native subagent via `DISPATCH(mode="subagent", agent="{name}", context={...})`.
- NOT `Task()` — Tier 1b uses `task_primitive: false`.
- Sequential only — `parallel_subagents: false` on Tier 1b.
- The protocol lives in the agent body (≤150 lines). There are NO companion protocol skills.

## API contracts

### Inspector output (written to pipeline-state.json phases[0].outputs)

```json
{
  "key_type_data_path": "{ROOT}/superpipelines/temp/parity-test-i/{runId}/key-type-data.json",
  "total_keys": 5
}
```

### key-type-data.json schema

```json
{
  "source_path": "{path-to-input-json-file}",
  "total_keys": 5,
  "keys": [
    { "key": "name",    "type": "string"  },
    { "key": "version", "type": "number"  },
    { "key": "active",  "type": "boolean" },
    { "key": "config",  "type": "object"  },
    { "key": "tags",    "type": "array"   }
  ]
}
```

`keys` is ordered by the original top-level key insertion order in the JSON file. Value types are exactly one of: `string`, `number`, `boolean`, `object`, `array`, `null`.

### Formatter output (written to pipeline-state.json phases[1].outputs)

```json
{
  "summary_path": "{ROOT}/output/parity-test-i-summary.txt",
  "total_keys": 5
}
```

### parity-test-i-summary.txt format

```
parity-test-i — JSON Key/Type Summary
Source: {path-to-input-json-file}
Generated: {iso8601}
─────────────────────────────────────
name     : string
version  : number
active   : boolean
config   : object
tags     : array
─────────────────────────────────────
Total top-level keys: 5
```

## Dependency matrix

| Component | Depends on | Owned by |
|---|---|---|
| `run-parity-test-i` (entry skill) | OpenCode session | Entry skill (orchestrator) |
| `inspector` subagent | entry skill dispatch | `inspector` native subagent |
| `formatter` subagent | inspector `key-type-data.json` | `formatter` native subagent |
| `output/parity-test-i-summary.txt` | formatter step | formatter agent |

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Input file not found | medium | inspector emits `NEEDS_CONTEXT` with clear path advisory |
| Input file is not valid JSON | medium | inspector emits `BLOCKED` with parse error detail |
| key-type-data.json malformed | low | formatter validates JSON before processing; emits `BLOCKED` if invalid |
| Sequential bottleneck | low | Pattern 1 is the only option on Tier 1b; documented non-goal |

## Rollout plan

- Phase 1: Manual scaffold verification (this pipeline).
- Phase 2: Manual execution on OpenCode v1.15.10 to verify native subagent dispatch and agent body protocol execution.
- Rollback procedure: Delete `output/parity-test-i-summary.txt` and `superpipelines/temp/parity-test-i/`.

## Explicit design decisions

- **Pattern 1 (Sequential)**: The only tier-safe pattern for Tier 1b (`parallel_subagents: false`).
- **Agent bodies instead of protocol skills**: Tier 1b places the full protocol in the agent body (≤150 lines). No companion `{agent-name}-protocol/SKILL.md` files are created.
- **`model_field_format: provider_prefixed`**: Each agent declares `model: opencode/big-pickle` in its YAML frontmatter. This is the triage tier model (free, no paid subscription required).
- **No `reasoningEffort`**: The `reasoningEffort` field applies to `opencode` and `opencode-go` providers only. `opencode/big-pickle` is the triage tier; no effort field is emitted.
- **Native subagent dispatch**: `DISPATCH(mode="subagent", agent="{name}", context={...})` — not `Task()`. Tier 1b has `task_primitive: false`.
- **Findings written to temp files**: Avoids context-bloating downstream steps (anti-pattern #3 — Context Dumping). Each step receives file paths, not contents.
- **Single degradation warning**: Only 1 warning from the tier_1b profile must be surfaced (`parallel_subagents: false` → Pattern 2 unavailable).
