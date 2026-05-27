---
name: sk-hierarchical-context
description: Generates and maintains localized PIPELINE-CONTEXT.md files distributed across the project tree, producing token-efficient context maps that summarize directory purposes and architectural boundaries. Use when the `/superpipelines:init-deep` command runs, when the PREFLIGHT phase of a new pipeline creation requires context initialization, or when significant refactoring invalidates existing context maps.
disable-model-invocation: true
user-invocable: false
---

# Hierarchical Context Maps — Distributed Architecture Context

> Distributes architectural knowledge across the repository by placing a `PIPELINE-CONTEXT.md` in each significant subdirectory. Agents operating within a directory acquire scope-relevant context automatically, conserving tokens and improving reasoning focus.

<overview>
The Hierarchical Context system places localized `PIPELINE-CONTEXT.md` files throughout the project tree rather than centralizing knowledge in a single large file. An agent working in `src/api/` loads only the context relevant to that directory instead of an entire monolithic prompt.
</overview>

<glossary>
  <term name="Context Map">A localized markdown file (`PIPELINE-CONTEXT.md`) describing the purpose and boundaries of its resident directory.</term>
  <term name="Deep Initialization">The recursive process of generating context maps for all significant project directories.</term>
</glossary>

## Protocol Execution

<protocol>
### 1. DIRECTORY TRAVERSAL
- Identify all significant architectural boundaries (e.g., `src/`, `components/`, `api/`, `utils/`).
- Skip ignored directories (e.g., `node_modules/`, `.git/`, `dist/`).

### 2. CONTEXT GENERATION
For each significant directory, create a `PIPELINE-CONTEXT.md` adhering to LLM-readability standards (Scribius format):
- **H1-First & Summary:** Begin with an H1 header (`# Directory Name`) followed immediately by a blockquote summary (`> `).
- **Cache-Stable Ordering:** Place static context (purpose, constraints) before volatile elements.
- **XML-Anchored Content:** Wrap structured information in semantic XML envelopes:
  - `<directory_purpose>`: A concise summary of what the directory does.
  - `<architectural_constraints>`: Specific rules (e.g., "no database access in components").
  - `<key_exports>`: Bulleted list of primary modules and their responsibilities.
  - `<pipeline_relationship>`: How the directory interacts with the broader system.
- **Voice & Tone:** Third-person impersonal voice, positive scoping, and unambiguous noun anchors (never "this" or "it" without a preceding noun). Preambles omitted.

### 3. ROOT CONTEXT INJECTION
- Generate a root-level `PIPELINE-CONTEXT.md` that serves as the entry point, detailing the overall system architecture and linking to subdirectory context maps.

### 4. MAINTENANCE
- When files are significantly refactored during pipeline execution, flag the relevant `PIPELINE-CONTEXT.md` for a required update.
</protocol>

<invariants>
- NEVER generate a single monolithic context file; always distribute context hierarchically.
- ALWAYS respect `.gitignore` when traversing the repository.
- Context maps remain concise and free of redundant code snippets; summaries replace inline code.
- ALWAYS format `PIPELINE-CONTEXT.md` files according to Scribius standards (XML envelopes, H1-first, impersonal voice).
</invariants>

## Reference Files

- `${CLAUDE_PLUGIN_ROOT}/skills/sk-pipeline-paths/SKILL.md` — Path resolution guidelines.
