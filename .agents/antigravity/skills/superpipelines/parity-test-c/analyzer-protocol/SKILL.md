---
name: analyzer-protocol
description: Loaded by the analyzer agent to supply operating protocol and invariants for document analysis in the parity-test-c pipeline. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Analyzer — Operational Protocol

<overview>
The analyzer agent reads a target text document, extracts key themes and structural metadata, and writes a structured JSON findings file to the pipeline temp directory. It is the first step of the parity-test-c Sequential pipeline (Pattern 1) on Tier 1c (Antigravity CLI). The quality bar is: findings must be machine-readable JSON that the summarizer can consume without ambiguity.
</overview>

## Protocol

<protocol>

### 1. DISCOVER

1. Read inputs from the orchestrator dispatch context:
   - `input_document_path`: path to the text document to analyze.
   - `findings_output_path`: path where `analyzer-findings.json` must be written.
   - `state_path`: path to `pipeline-state.json` for status updates.
   - `run_id`: current run identifier.
   - `root`: resolved scope root.
2. Verify `input_document_path` exists and is readable. If not: emit `NEEDS_CONTEXT` with message: "Input document not found at `{input_document_path}`. Provide a valid path and re-run."
3. Read the document contents (use `Read` tool).

### 2. PROCESS

1. Extract key themes (3–7 themes). A theme is a recurring concept, topic, or argument present across multiple sections.
2. Extract structural metadata:
   - `sections`: list of detected section headings or logical divisions (e.g., "Introduction", "Methods", "Results").
   - `word_count`: approximate word count of the document.
   - `tone`: infer one of `formal | informal | neutral` based on vocabulary and sentence structure.
3. Record `source_path` = `input_document_path`.
4. Assemble the findings object:

```json
{
  "themes": ["theme-1", "theme-2"],
  "structure": {
    "sections": ["Introduction", "Body", "Conclusion"],
    "word_count": 1200,
    "tone": "formal"
  },
  "source_path": "{input_document_path}"
}
```

### 3. DELIVER

1. Write `analyzer-findings.json` to `findings_output_path` using the `Write` tool.
2. Update `pipeline-state.json`:
   - Set `phases[0].status` = `"completed"` (or `"completed_with_concerns"` if any theme confidence is low).
   - Set `phases[0].outputs` = `[findings_output_path]`.
3. Emit terminal status:
   - `DONE` — findings written successfully, all themes extracted with high confidence.
   - `DONE_WITH_CONCERNS` — findings written but one or more themes have low confidence (note which themes and why).
   - `NEEDS_CONTEXT` — input document not found or unreadable.
   - `BLOCKED` — findings could not be written (e.g., disk write failure).

</protocol>

<invariants>
- NEVER write findings to a path outside `{ROOT}/superpipelines/temp/parity-test-c/{runId}/`.
- NEVER pass document contents to the orchestrator in the status message — pass only the findings file path.
- ALWAYS validate that `findings_output_path` is writable before attempting write.
- ALWAYS update `pipeline-state.json` after writing findings.
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
