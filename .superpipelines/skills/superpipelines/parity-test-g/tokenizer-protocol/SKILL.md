---
name: tokenizer-protocol
description: Loaded by the run-parity-test-g entry skill to supply operating protocol and invariants for markdown tokenization and word frequency counting in the parity-test-g pipeline. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Tokenizer — Operational Protocol

<overview>
The tokenizer step reads an input markdown file, strips markdown syntax, tokenizes the text into lowercase words, counts word frequencies while excluding common English stopwords, and writes a structured JSON frequency counts file to the pipeline temp directory. It is the first step of the parity-test-g Sequential pipeline (Pattern 1) on Tier 2 (Cursor/Windsurf/Cline), executing inline in the entry skill's session. The quality bar is: frequency-counts.json must be machine-readable JSON that the reporter can consume without ambiguity.
</overview>

## Protocol

<protocol>

### 1. DISCOVER

1. Read inputs from the orchestrator execution context:
   - `input_path`: path to the input markdown file to read.
   - `counts_output_path`: path where `frequency-counts.json` must be written.
   - `state_path`: path to `pipeline-state.json` for status updates.
   - `run_id`: current run identifier.
   - `root`: resolved scope root.
2. Verify `input_path` exists and is a readable file. If not: update `pipeline-state.json` phases[0].status = "blocked"; emit `NEEDS_CONTEXT` with message: "Input markdown file not found at `{input_path}`. Provide a valid path and re-run."
3. Read the file content. If the file is empty: write a zero-count `frequency-counts.json` and emit `DONE_WITH_CONCERNS` with message: "Input file at `{input_path}` is empty. Frequency counts file written with zero entries."

### 2. PROCESS

**Step 2.1 — Strip markdown syntax:**

Remove the following before tokenizing (do not count these as word content):
- ATX headings (`#`, `##`, etc.)
- Emphasis markers (`*`, `**`, `_`, `__`)
- Inline code and code fences (content inside backticks)
- URLs and link syntax (`[text](url)` → keep `text`, discard `url`)
- HTML tags if present
- Punctuation attached to word boundaries (`,`, `.`, `:`, `;`, `!`, `?`, `"`, `'`, `(`, `)`, `[`, `]`, `{`, `}`)

**Step 2.2 — Tokenize:**

Split the cleaned text on whitespace. Convert every token to lowercase. Discard any token that is empty or contains only non-alphabetic characters (e.g., `---`, `123`, `42px`).

**Step 2.3 — Remove stopwords:**

Exclude all tokens that match any word in the following stopword list (case-insensitive, already lowercased after Step 2.2):

```
a, about, above, after, again, against, all, also, an, and, any, are, as, at,
be, because, been, before, being, below, between, both, but, by,
can, could, did, do, does, doing, down, during,
each, few, for, from, further,
get, got, had, has, have, having, he, her, here, him, himself, his, how,
i, if, in, into, is, it, its, itself,
just, me, more, most, my, myself,
no, nor, not, now, of, off, on, once, only, or, other, our, out, over, own,
same, she, should, so, some, such, than, that, the, their, them, then, there,
these, they, this, those, through, to, too, under, until, up, us,
very, was, we, were, what, when, where, which, while, who, whom, why, will,
with, would, you, your, yours, yourself
```

**Step 2.4 — Count frequencies:**

For each remaining token, increment its count. Assemble the counts list sorted descending by count. In case of ties, sort alphabetically ascending by word.

**Step 2.5 — Handle zero-count edge case:**

If no tokens remain after stopword removal (e.g., the file contained only stopwords), write a zero-count output and emit `DONE_WITH_CONCERNS` with message: "No content words remain after stopword removal. Frequency counts file written with zero entries."

### 3. DELIVER

1. Write `frequency-counts.json` to `counts_output_path` using the Write tool. Structure:

```json
{
  "source_path": "{input_path}",
  "total_tokens": 0,
  "unique_words": 0,
  "stopwords_excluded": 0,
  "counts": [
    {"word": "{word}", "count": 0}
  ]
}
```

Fields:
- `total_tokens`: count of all non-empty tokens before stopword removal.
- `unique_words`: count of distinct words in `counts` (post-stopword-removal).
- `stopwords_excluded`: count of tokens removed by stopword filter.
- `counts`: array of `{word, count}` objects, sorted descending by count. Contains ALL non-stopword words (not truncated — the reporter applies the top-20 limit).

2. Update `pipeline-state.json`:
   - Set `phases[0].status` = `"completed"` (or `"completed_with_concerns"` if zero-count edge case).
   - Set `phases[0].outputs` = `[counts_output_path]`.

3. Emit terminal status:
   - `DONE` — frequency-counts.json written successfully with at least one entry.
   - `DONE_WITH_CONCERNS` — file written but zero entries remain (file empty or all stopwords); note reason.
   - `NEEDS_CONTEXT` — input file not found or not accessible.
   - `BLOCKED` — counts file could not be written (e.g., path not writable).

</protocol>

<invariants>
- NEVER write counts to a path outside `{ROOT}/superpipelines/temp/parity-test-g/{runId}/`.
- NEVER pass file contents back to the orchestrator in the status message — pass only the counts file path.
- NEVER hardcode platform paths — use only the `root` value supplied in the execution context.
- ALWAYS validate that `counts_output_path` is writable before attempting write.
- ALWAYS update `pipeline-state.json` phases[0] after writing counts.
- ALWAYS include ALL non-stopword word counts in the output (do not apply top-20 here — that is the reporter's responsibility).
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
