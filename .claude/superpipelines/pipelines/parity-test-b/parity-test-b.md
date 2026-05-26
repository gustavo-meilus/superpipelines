# parity-test-b

> Parity pipeline for Tier 1 (Claude Code). Sequential, 3 steps, with structural write/review isolation.
> Entry skill: `run-parity-test-b`

## Goal

Read a JSON file and produce a data quality report listing null values and type inconsistencies per top-level key, with a read-only reviewer step validating findings before the final report is written.

## Steps

1. **analyzer** — Reads the JSON file, checks each top-level value for null and type inconsistency, writes `findings.json` to temp.
2. **reviewer** — Validates the findings schema for completeness and correctness. READ-ONLY (`permissionMode: plan`, `disallowedTools: Write, Edit, Bash`, worktree isolated). Verdict via terminal output text.
3. **reporter** — Renders the final markdown data quality report from findings and reviewer verdict. Only dispatched on `approved` or `approved_with_concerns` verdict.

## Reviewer Isolation

Structural (Tier 1): the reviewer agent runs in a separate worktree with `permissionMode: plan` and `disallowedTools: Write, Edit, Bash`. The CC host enforces write-deny at the tool call level. The writer (analyzer) and reviewer never share the same agent context.

## Usage

Invoke via the `run-parity-test-b` skill. Supply the path to a JSON file when prompted.
