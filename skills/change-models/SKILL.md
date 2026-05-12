---
name: change-models
description: Use when the user wants to quickly and interactively change the LLM models assigned to pipeline step agents. Applies changes to agent frontmatter. Invoke via /superpipelines:change-models.
user-invocable: true
---

# Change Models — Interactive Model Reassignment

> Enables quick, interactive model reassignment across pipeline agents within a selected pipeline. Applies changes to agent YAML frontmatter files.

<overview>
The Change Models workflow provides a streamlined interface for swapping LLM models across a pipeline's agents. It supports three interaction modes — bulk application, individual selection, and natural language instruction — and enforces a confirm-before-write protocol to prevent unintended changes.
</overview>

<glossary>
  <term name="Model Catalog">A unified list of available LLM models sourced from local configuration or a static fallback.</term>
  <term name="Agent Frontmatter">YAML header in agent `.md` files containing metadata like `name`, `model`, `maxTurns`, etc.</term>
  <term name="Fuzzy Match">A name-matching algorithm that normalizes and compares model names to resolve natural language references.</term>
</glossary>

## Workflow Phases

<protocol>

### $ARGUMENTS FAST-PATH

When `$ARGUMENTS` is provided (e.g., `all to claude-3-5-sonnet`), the command enters a fast-path that minimizes interactivity:

- **Phases 0–2**: Automatically scoped:
  - Pipeline: Defaults to "All pipelines" unless the instruction names a specific pipeline.
  - Agent selection: Auto-selected based on the `<target>` in the instruction:
    - `all` → all agents in the scoped pipeline(s)
    - Numeric ranges (e.g., `steps 1-3`) → agents by their Phase 2 table index
    - Named agents (e.g., `my-pipeline/generator`) → exact name match
- **Phase 3**: Skip mode selection. Parse `$ARGUMENTS` as Mode C instruction. Fuzzy-match model names against the catalog assembled in Phase 1. Present the confirmation table.
- **Phases 4–5**: Proceed normally with application, verification, and summary.

The fast-path still gates on user confirmation of the change table before any writes occur.

### PHASE 0: PIPELINE SELECTION

- Read the project's local registry at `<workspace>/.claude/superpipelines/registry.json`. If the file does not exist or contains zero pipelines, report this to the user and abort gracefully.
- If the registry contains multiple pipelines, present them as a numbered list and ask the user to select which pipeline to change models for.
- Include an "All pipelines" option to scope the change to every pipeline in the project.
- Store the selected pipeline name(s) for use in subsequent phases.
- If only one pipeline exists, auto-select it and inform the user.
- **Fast-path**: When `$ARGUMENTS` is provided, skip interactive pipeline selection. Default to "All pipelines" unless the instruction names a specific pipeline.

### PHASE 1: MODEL DISCOVERY

- **Static Fallback**: Load the curated catalog in `references/model-catalog.md`.
- **Custom Provider Discovery**: If available, read user's Claude Code configuration to identify any configured models.
- Assemble the catalog for later use. Do NOT present it yet — it will be shown in Phase 3 when the user needs to pick a model.

### PHASE 2: AGENT SELECTION

- **Agent Scan**: Scan only the selected pipeline's agent files:
  - `<workspace>/.claude/agents/superpipelines/<pipeline>/**/*.md`
  - If "All pipelines" was selected, scan `<workspace>/.claude/agents/superpipelines/**/*.md`
- Read each agent file's YAML frontmatter to extract the current `model` field (if any).
- **Display Table**: Present a numbered table:
  ```
  #   Agent                              Current Model              Source
  1   my-pipeline/generator               claude-sonnet-4-6           frontmatter
  2   my-pipeline/reviewer                claude-haiku-4-5            frontmatter
  ```
- If no agent files are found for the selected pipeline(s), report this to the user and abort gracefully.
- **Selection Options**:
  - Select individual agents by number (e.g., `1,3,5`)
  - Select a range (e.g., `1-3`)
  - Select all agents (`all`)

### PHASE 3: CHANGE MODE

**HARD-GATE**: When `$ARGUMENTS` is empty or not provided, you MUST present the three modes (A, B, C) to the user. NEVER fabricate, infer, or assume `$ARGUMENTS`. The absence of arguments means the user has not specified their intent — ask them what they want.

Present three interaction modes:

#### Mode A — Apply to All
- Re-present the model catalog.
- Select a single model from the catalog.
- That model will be assigned to all agents selected in Phase 2.

#### Mode B — Select Individually
- For each selected agent, re-present the model catalog and let the user pick individually.
- Allow the user to press Enter to skip an agent (keep current model).

#### Mode C — Natural Language Instruction
- The `$ARGUMENTS` from the command (or a free-text input) are parsed as a model change instruction.
- **Instruction Format**: `<target> to <model-name>` where `<target>` can be:
  - Agent numbers (by table index): `steps 1-3`
  - Agent names: `my-pipeline/generator`
  - `all` — all selected agents
- **Fuzzy Matching**: Normalize the model name input (lowercase, strip spaces and special characters) and compare against catalog.
- Present a **confirmation table** before applying.

### PHASE 4: APPLICATION

- For each agent in the confirmation table:
  1. Read the agent `.md` file.
  2. Parse the YAML frontmatter.
  3. If `model` field exists: update its value.
  4. If `model` field does not exist: add `model: <new-value>` after the `name` field (or as the second line of frontmatter if no `name`).
  5. Write the updated file using the Edit tool.
- **Atomicity**: Stage all changes mentally; apply them one by one. If any write fails, report the failure and continue with the remaining agents.
- **Invariant**: Only the `model` field in the frontmatter is modified. No other frontmatter fields or body content is altered.

### PHASE 5: VERIFICATION & SUMMARY

- Re-read all modified agent files.
- Parse the frontmatter and confirm the `model` field matches the assigned value.
- Present a final summary table:
  ```
  Agent                        Previous Model              New Model              Status
  my-pipeline/generator         claude-sonnet-4-6          claude-haiku-4-5       ✅ Applied
  ```
</protocol>

<invariants>
- NEVER modify an agent file without user confirmation of the change table.
- NEVER remove existing frontmatter fields; only add or update the `model` field.
- ALWAYS fall back to the static catalog (`references/model-catalog.md`) on network or discovery failures.
- ALWAYS preserve the exact format and ordering of existing frontmatter fields when editing.
- NEVER modify the `plugin_version` field during model changes.
</invariants>

## Fuzzy Matching Algorithm

<matching_protocol>
### Step 1: Normalize
- Lowercase the input.
- Remove all spaces, hyphens, underscores, dots, and special characters.
- Example: "Claude 3.5 Sonnet" → "claude35sonnet"

### Step 2: Exact Match
- Compare normalized input against normalized model IDs and display names in the catalog.
- If exact match found, return it immediately.

### Step 3: Prefix Match
- Check if the normalized input is a prefix of any catalog entry.
- Return all prefix matches.

### Step 4: Disambiguation
- If multiple candidates remain, present them grouped by provider and ask the user to select.
</matching_protocol>

## Reference Files
- `references/model-catalog.md` — Static fallback model catalog for offline use.
- `sk-pipeline-paths/SKILL.md` — Scope and path resolution for registries and agents.
- `sk-4d-method/SKILL.md` — Brief deconstruction for natural language instructions.
