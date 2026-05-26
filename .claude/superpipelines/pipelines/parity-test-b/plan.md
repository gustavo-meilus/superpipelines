# Plan: parity-test-b

## Tech stack

- Platform: Claude Code (Tier 1)
- Agent format: Zero-body YAML frontmatter + companion protocol SKILL.md
- Dispatch: `Task()` primitive via abstract `DISPATCH(mode="task", ...)` notation
- Models: `model_tier: fast` for analyzer/reporter → `claude-haiku-4-5-20251001`; `model_tier: medium` for reviewer → `claude-sonnet-4-6`
- Scope root: `.claude/` (workspace)

## Architecture

```
Entry Skill (run-parity-test-b)
  │
  ├─ DISPATCH analyzer (worktree-isolated, acceptEdits)
  │     reads {INPUT_PATH} (JSON)
  │     writes {ROOT}/temp/parity-test-b/{runId}/findings.json
  │
  ├─ DISPATCH reviewer (worktree-isolated, plan + disallowedTools: Write,Edit,Bash)
  │     reads findings.json (READ-ONLY)
  │     emits REVIEWER VERDICT block via terminal output text
  │     verdict: approved | approved_with_concerns | rejected
  │
  └─ DISPATCH reporter (worktree-isolated, acceptEdits) — only on approved verdict
        reads findings.json + reviewer verdict from context
        writes {ROOT}/output/parity-test-b-report.md
```

## API contracts

**findings.json**
```json
{
  "source_path": "string",
  "analyzed_at": "string (iso8601)",
  "total_keys": "number",
  "issue_count": "number",
  "keys": [
    { "key": "string", "type": "string", "is_null": "boolean",
      "type_inconsistent": "boolean", "issue_count": "number" }
  ]
}
```

**REVIEWER VERDICT block (terminal text)**
```
REVIEWER VERDICT: {approved|approved_with_concerns|rejected}
COMPLETENESS: {summary}
CONCERNS: {list or "none"}
NOTES: {brief notes}
```

## Dependency matrix

| Component | Depends on | Owned by |
|-----------|-----------|----------|
| analyzer agent | entry skill dispatch | analyzer-protocol SKILL.md |
| reviewer agent | analyzer output | reviewer-protocol SKILL.md |
| reporter agent | analyzer output + reviewer verdict | reporter-protocol SKILL.md |
| entry skill | all three agents | run-parity-test-b SKILL.md |

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Reviewer emits BLOCKED | low | entry skill does not dispatch reporter; preserves temp |
| JSON parse failure | low | analyzer emits BLOCKED with parse error |
| Reviewer verdict parsing failure | low | entry skill treats unparseable verdict as BLOCKED |

## Explicit design decisions

- `model_tier: medium` for reviewer: extra capacity for schema validation reasoning.
- Reviewer has `isolation: worktree` + `permissionMode: plan` + `disallowedTools: Write, Edit, Bash`: three-layer structural isolation per Tier 1 `WRITE_REVIEW_ISOLATION: STRUCTURAL` invariant.
- Reviewer verdict in terminal text (not a file): enforces the isolation contract — reviewer cannot write the verdict file; the entry skill reads it from the subagent's return value.
