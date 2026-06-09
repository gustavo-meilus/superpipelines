---
name: sk-dynamic-routing
description: Maps pipeline agent roles to intent-based model categories on Tier 1 (Claude Code). Use when a Tier 1 pipeline stage requires model assignment beyond the two-slot fast/deep abstraction — e.g., pure read-only audit agents, deep architectural planners, or visual-analysis roles. Non-CC tiers resolve models via platform_profile.model_tiers only; this skill must not be invoked on tier_1b/1c/1d/2.
disable-model-invocation: true
user-invocable: false
---

# Dynamic Model Routing — Intent-Based Capability Mapping

<overview>
This skill is **Claude Code-scoped (tier_1 only)**. Superpipelines on Tier 1 maintains `claude-sonnet-4-6` as the baseline default for implementation workers (the Tier 1 resolution of `platform_profile.model_tiers.fast`). Certain specialized roles — fast audits, deep architectural planning, visual analysis — benefit from dynamic routing beyond the two-slot `fast`/`deep` abstraction. This skill defines the CC-specific categories and fallback chains for those overrides. Non-CC tiers do not consult this skill; they resolve models via `platform_profile.model_tiers` only.
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
- Standard code implementation or functional review maps to category `default`.

### 2. ASSIGN CATEGORY
- Roles exclusively concerned with planning, architecture, or deep conceptual alignment → `deep-plan`.
- Roles restricted to read-only utility (fast file searching, lint aggregation) → `quick-audit`.
- Roles that interpret screenshots or diagrams → `visual`.

### 3. CONFIGURATION OVERRIDE
- When generating an agent or scaffold, the `model:` field in the frontmatter is set to the primary model of the selected category.
- A comment or meta-tag noting the category intent is added for future auditing.
</protocol>

<invariants>
- NEVER override `pipeline-task-executor` or `pipeline-spec-reviewer`; they MUST remain on `claude-sonnet-4-6` (`default`).
- NEVER route to a model not explicitly defined in the category mapping table.
- Maintain `MODEL_SELECTION: DYNAMIC_DEFAULT_SONNET` adherence. On Tier 1 the `default` category equals `platform_profile.model_tiers.fast` (`claude-sonnet-4-6`).
- NEVER invoke this skill from tier-agnostic orchestrator skills (`creating-a-pipeline`, `pipeline-architect-protocol`, `sk-platform-dispatch`). Caller MUST gate on `platform_profile.tier == "tier_1"` before reading this skill's category table.
</invariants>
