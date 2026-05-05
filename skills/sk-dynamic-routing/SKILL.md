---
name: sk-dynamic-routing
description: Use when determining the appropriate LLM for a specific pipeline stage. Defines category constraints for dynamic model routing, allowing specific utility and planning agents to diverge from the Sonnet default.
disable-model-invocation: true
user-invocable: false
---

# Dynamic Model Routing — Intent-Based Capability Mapping

> Provides the ruleset for dynamically assigning Large Language Models based on the task intent category. Trigger when architecting new pipelines or configuring subagents to ensure cost-efficiency and optimal reasoning paths.

<overview>
While Superpipelines maintains `claude-sonnet-4-6` as the baseline default for all implementation workers, certain specialized roles (e.g., fast audits, deep architectural planning, vision analysis) benefit from dynamic routing. This skill defines the permitted categories and fallback chains for those overrides.
</overview>

<glossary>
  <term name="Category">An intent-based tag that dictates the model requirement (e.g., `quick-audit`, `deep-plan`).</term>
  <term name="Fallback Chain">The sequence of alternative models if the primary is unavailable or rate-limited.</term>
</glossary>

## Category Mappings

<categories_table>
| Category | Primary Model | Fallback Chain | Use Case |
| :--- | :--- | :--- | :--- |
| **`default`** | `claude-sonnet-4-6` | *None* | Implementation, general tasks, and task-execution. |
| **`deep-plan`** | `claude-opus-4-7` | `gpt-5.4` -> `sonnet-4-6` | High-stakes architectural planning (e.g., `pipeline-architect`). |
| **`quick-audit`** | `claude-haiku-4-5-20251001` | *None* | Fast, broad pattern matching and codebase grepping. |
| **`visual`** | `gemini-3.1-pro` | `gpt-5.4` | Tasks requiring image processing, UI screenshots, or diagram analysis. |
</categories_table>

## Routing Protocol

<protocol>
### 1. EVALUATE INTENT
- Determine the nature of the specific task or agent role.
- If it is standard code implementation or a functional review, the category MUST be `default`.

### 2. ASSIGN CATEGORY
- If the role is exclusively planning, architecture, or deep conceptual alignment, assign `deep-plan`.
- If the role is pure read-only utility (fast file searching, lint aggregation), assign `quick-audit`.
- If the role requires interpreting screenshots, assign `visual`.

### 3. CONFIGURATION OVERRIDE
- When generating an agent or scaffold, set the `model:` field in the frontmatter according to the primary model of the selected category.
- Add a comment or meta-tag noting the category intent for future auditing.
</protocol>

<invariants>
- NEVER override `pipeline-task-executor` or `pipeline-spec-reviewer`; they MUST remain on `claude-sonnet-4-6` (`default`).
- NEVER route to a model not explicitly defined in the category mapping table.
- Maintain `MODEL_SELECTION: DYNAMIC_DEFAULT_SONNET` adherence.
</invariants>
