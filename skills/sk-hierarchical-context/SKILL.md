---
name: sk-hierarchical-context
description: Use when initiating or updating localized PIPELINE-CONTEXT.md files across a repository. Crawls the project to generate token-efficient context maps summarizing directory contents and architectural boundaries.
disable-model-invocation: true
user-invocable: false
---

# Hierarchical Context Maps — Distributed Architecture Context

> Generates and maintains localized `PIPELINE-CONTEXT.md` files throughout the project tree. Trigger during the `/superpipelines:init-deep` command or during the PREFLIGHT phase of new pipeline creation to ensure agents have lean, relevant context without bloated global prompts.

<overview>
The Hierarchical Context system distributes architectural knowledge across the repository instead of centralizing it in a single massive file. By placing a `PIPELINE-CONTEXT.md` in relevant subdirectories, agents operating within that directory automatically acquire the necessary context for their specific scope, conserving tokens and improving reasoning focus.
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
For each significant directory, create a `PIPELINE-CONTEXT.md` adhering to strict LLM-readability standards (Scribius format):
- **H1-First & Summary:** Begin with an H1 header (`# Directory Name`) followed immediately by a blockquote summary (`> `).
- **Cache-Stable Ordering:** Place static context (purpose, constraints) before any volatile elements.
- **XML-Anchored Content:** Wrap structured information in semantic XML envelopes:
  - `<directory_purpose>`: A concise summary of what the directory does.
  - `<architectural_constraints>`: Specific rules (e.g., "no database access in components").
  - `<key_exports>`: Bulleted list of primary modules and their responsibilities.
  - `<pipeline_relationship>`: How this directory interacts with the broader system.
- **Voice & Tone:** Enforce third-person impersonal voice, positive scoping, and unambiguous noun anchors (never use "this" or "it" without a noun). Omit all preambles.

### 3. ROOT CONTEXT INJECTION
- Generate a root-level `PIPELINE-CONTEXT.md` that serves as the entry point, detailing the overall system architecture and linking to subdirectory context maps.

### 4. MAINTENANCE
- When files are significantly refactored during pipeline execution, flag the relevant `PIPELINE-CONTEXT.md` for a required update.
</protocol>

<invariants>
- NEVER generate a single monolithic context file; always distribute context hierarchically.
- ALWAYS respect `.gitignore` when traversing the repository.
- Ensure context maps are concise and free of redundant code snippets (use summaries).
- ALWAYS format `PIPELINE-CONTEXT.md` files according to Scribius standards (XML envelopes, H1-first, impersonal voice).
</invariants>

## Reference Files

- `${CLAUDE_PLUGIN_ROOT}/skills/sk-pipeline-paths/SKILL.md` — Path resolution guidelines.
