---
name: reporter-protocol
description: Loaded by the run-parity-test-g entry skill to supply operating protocol and invariants for top-20 word frequency report formatting in the parity-test-g pipeline. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Reporter — Operational Protocol

<overview>
The reporter step reads the structured word frequency counts produced by the tokenizer, selects the top-20 words by frequency, and writes a plain-text word frequency report to `{ROOT}/output/parity-test-g-word-freq.txt`. It is the final step of the parity-test-g Sequential pipeline (Pattern 1) on Tier 2 (Cursor/Windsurf/Cline), executing inline in the entry skill's session. The quality bar is: the output must list at most 20 words (or fewer if fewer exist) in descending frequency order, one per line, with no stopwords present.
</overview>

## Protocol

<protocol>

### 1. DISCOVER

1. Read inputs from the orchestrator execution context:
   - `counts_path`: path to `frequency-counts.json` written by the tokenizer step.
   - `output_path`: path where the final word frequency report must be written (always `{ROOT}/output/parity-test-g-word-freq.txt`).
   - `state_path`: path to `pipeline-state.json` for status updates.
   - `run_id`: current run identifier.
   - `root`: resolved scope root.
2. Verify `counts_path` exists and is a readable file. If not: update `pipeline-state.json` phases[1].status = "blocked"; emit `BLOCKED` with message: "Tokenizer frequency counts not found at `{counts_path}`. The tokenizer step may have failed."
3. Parse the counts JSON. If JSON is malformed: update `pipeline-state.json` phases[1].status = "blocked"; emit `BLOCKED` with message: "Frequency counts at `{counts_path}` are not valid JSON. Re-run the tokenizer step."

### 2. PROCESS

**Step 2.1 — Select top-20:**

Take the first 20 entries from `counts.counts` (already sorted descending by count by the tokenizer). If fewer than 20 entries exist, use all available entries. Record `words_reported` = number of entries selected.

**Step 2.2 — Handle zero-entry edge case:**

If `counts.counts` is empty, note `words_reported` = 0; proceed to deliver (the output will contain only the header and a sentinel line).

**Step 2.3 — Render the report:**

Format the plain-text report using the following template:

```
Word Frequency Report — parity-test-g
======================================
Source file : {counts.source_path}
Total tokens: {counts.total_tokens}
Unique words: {counts.unique_words}
Stopwords excluded: {counts.stopwords_excluded}
Generated   : {iso8601-timestamp}

Rank  Word                  Count
----  --------------------  -----
   1  {word}                {count}
   2  {word}                {count}
  ...
  20  {word}                {count}
```

Rules:
- Rank column: right-aligned integer, width 4.
- Word column: left-aligned, width 20.
- Count column: right-aligned integer, width 5.
- If `words_reported` < 20, the table ends after the last available word. Do NOT pad with empty rows.
- If `words_reported` = 0, replace the table with a single line: `  (no content words found after stopword removal)`

### 3. DELIVER

1. Create the `{root}/output/` directory if it does not exist.
2. Write the rendered report to `output_path` using the Write tool.
3. Update `pipeline-state.json`:
   - Set `phases[1].status` = `"completed"` (or `"completed_with_concerns"` if zero words reported).
   - Set `phases[1].outputs` = `[output_path]`.
   - Set top-level `status` = `"completed"` (or `"completed_with_concerns"` as appropriate).
   - Set `completed_at` = current ISO-8601 timestamp.
4. Emit terminal status:
   - `DONE` — report written successfully with at least one word entry.
   - `DONE_WITH_CONCERNS` — report written but contained zero word entries (note reason).
   - `BLOCKED` — counts file missing or malformed; output not written.

</protocol>

<invariants>
- ALWAYS write the output to exactly `{ROOT}/output/parity-test-g-word-freq.txt` — never a different path.
- ALWAYS include the header block (source file, token counts, timestamp) in the output even when zero words are reported.
- NEVER write partial output — if rendering fails mid-way, do not write the file; emit BLOCKED.
- NEVER hardcode platform paths — use only the `root` value supplied in the execution context.
- ALWAYS update `pipeline-state.json` phases[1] and top-level status after writing.
- NEVER apply a different top-N limit — the limit is exactly 20 (or all available if fewer than 20 exist).
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
