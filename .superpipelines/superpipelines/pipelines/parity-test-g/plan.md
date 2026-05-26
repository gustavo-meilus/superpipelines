# Plan: parity-test-g

## Tech stack

- Platform: Cursor/Windsurf/Cline (Tier 2)
- Dispatch mechanism: `inline` — no Task() primitive, no subagent processes; all steps execute in the entry skill's session
- Agent format: NONE — Tier 2 has no agent files
- Skill format: Superpipelines v2.0.0 SKILL.md protocol
- State format: `pipeline-state.json` (structured JSON per `STATE_MANAGEMENT: STRUCTURED_JSON`)
- Output format: Plain text (.txt)
- Model selection: `inherit` — host IDE owns model; no per-step model emitted

## Architecture

```
User
  │
  ▼
run-parity-test-g (entry skill — inline execution, same session)
  │
  │  [Surface all 3 degradation warnings before execution]
  │
  │  Sequential — Pattern 1 (inline)
  │
  ├──► LOAD tokenizer-protocol/SKILL.md → EXECUTE inline
  │      Reads the input markdown file
  │      Tokenizes text, counts word frequencies
  │      Excludes common English stopwords
  │      Writes frequency-counts.json to temp directory
  │      Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
  │
  └──► LOAD reporter-protocol/SKILL.md → EXECUTE inline
         Reads frequency-counts.json from temp directory
         Selects top 20 words by frequency
         Writes parity-test-g-word-freq.txt to output/
         Emits: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
```

**Key Tier 2 constraint:** The entry skill does NOT spawn subagents or call `Task()`. It loads each protocol skill's SKILL.md into context and executes the protocol directly within the same session — sequential, inline, one step at a time.

## API contracts

### Tokenizer output (written to pipeline-state.json phases[0].outputs)

```json
{
  "counts_path": "{ROOT}/superpipelines/temp/parity-test-g/{runId}/frequency-counts.json",
  "total_tokens": 412,
  "unique_words": 183,
  "stopwords_excluded": 97
}
```

### frequency-counts.json schema

```json
{
  "source_path": "{path-to-input-markdown-file}",
  "total_tokens": 412,
  "unique_words": 183,
  "stopwords_excluded": 97,
  "counts": [
    {"word": "pipeline", "count": 18},
    {"word": "skill", "count": 14}
  ]
}
```

`counts` is sorted descending by `count`. All entries in `counts` are non-stopword tokens, lowercase.

### Reporter output (written to pipeline-state.json phases[1].outputs)

```json
{
  "report_path": "{ROOT}/output/parity-test-g-word-freq.txt",
  "words_reported": 20
}
```

## Dependency matrix

| Component | Depends on | Owned by |
|---|---|---|
| `run-parity-test-g` (entry skill) | Host IDE session | Orchestrator (inline) |
| tokenizer step | `run-parity-test-g` inline load | Same session |
| reporter step | tokenizer `frequency-counts.json` | Same session |
| `output/parity-test-g-word-freq.txt` | reporter step | reporter protocol |

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Input file not found | medium | tokenizer emits `NEEDS_CONTEXT` with clear path advisory |
| Input file is empty or has no words after stopword removal | low | tokenizer emits `DONE_WITH_CONCERNS` with zero-count output |
| frequency-counts.json malformed | low | reporter validates JSON before rendering; emits `BLOCKED` if invalid |
| User expects structural reviewer isolation | medium | All 3 degradation warnings surfaced before execution; self-skepticism preamble in any reviewer protocol |

## Rollout plan

- Phase 1: Manual scaffold verification (this pipeline).
- Phase 2: Manual execution on Cursor/Windsurf/Cline to verify inline dispatch and protocol skill loading.
- Rollback procedure: Delete `output/parity-test-g-word-freq.txt` and `superpipelines/temp/parity-test-g/`.

## Explicit design decisions

- **Pattern 1 (Sequential)**: The only tier-safe pattern for Tier 2 (`worktrees: false`, `parallel_subagents: false`, `subagents: false`).
- **No agent files**: Tier 2 architecture prohibits separate agent processes. Protocol skills are loaded and executed inline.
- **model_field_format: omit**: Tier 2 does not support per-step model selection. The host IDE owns the model. No `model:` fields are emitted anywhere.
- **Inline execution**: The entry skill loads `tokenizer-protocol/SKILL.md` then `reporter-protocol/SKILL.md` sequentially in the same session context.
- **Counts written to temp file**: Avoids context-bloating the reporter execution (anti-pattern #3 — Context Dumping). The reporter receives a file path, not contents.
- **Convention-only reviewer isolation**: No structural isolation possible on Tier 2. Self-skepticism preamble is required in any reviewer protocol per architectural invariant.
- **All 3 degradation warnings surfaced**: Mandatory per `WRITE_REVIEW_ISOLATION: STRUCTURAL_ON_TIER1_1B_1D; CONVENTION_ONLY_ON_TIER2` and the profile's `degradation_warnings` array.
