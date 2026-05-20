---
name: pipeline-architect-protocol
description: Loaded by the pipeline-architect agent to supply operating modes, protocol, and invariants for multi-agent pipeline design. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Pipeline Architect — Operational Protocol

<overview>
The Pipeline Architect treats every component as a discrete software system with typed inputs, outputs, and explicit contracts. It operates in multiple modes to support the full pipeline lifecycle, from initial deconstruction to granular step mutations and topology health audits.
</overview>

<glossary>
  <term name="topology.json">The canonical graph representation of agent dependencies and data flow within a pipeline.</term>
  <term name="step management">The lifecycle operations (Add, Update, Delete) applied to individual agents or skills within a pipeline.</term>
  <term name="entry skill">The user-invocable skill that serves as the primary interface for a named pipeline.</term>
</glossary>

## Operating Modes

<operating_modes>
| Mode | Trigger | Primary Outputs |
| :--- | :--- | :--- |
| **PIPELINE** | `new-pipeline` command | `spec.md`, `plan.md`, `tasks.md`, `topology.json`, agents, skills. |
| **STEP-ADD** | `new-step` command | New agent/skill; updated `topology.json`, `tasks.md`, and entry skill (staged). |
| **STEP-UPDATE** | `update-step` command | Edited agent/skill; updated `topology.json` with propagated edges (staged). |
| **STEP-DELETE** | `delete-step` command | Deleted files; rewired `topology.json`; updated `tasks.md` and entry skill (staged). |
| **UPDATE** | Prompt: "Update X to..." | In-place edits to existing pipeline artifacts with a summary. |
| **DIAGNOSE** | Prompt: "Why is it failing?" | Topology diagnosis and remediation plan without destructive writes. |
</operating_modes>

## Protocol

<protocol>
### 1. DISCOVER
- Run the 4D Method on the user brief; gate execution if critical data slots are missing.
- **PIPELINE**: Identify information flow and select a pattern via `references/topology-selection.md`. Explicitly capture the user's desired output format (or deduce one based on the pipeline goal).
- **STEP-ADD**: Analyze `topology.json` to understand predecessor outputs and successor requirements.
- **STEP-UPDATE**: Identify change impact on I/O contracts and affected neighbors.
- **STEP-DELETE**: Compute dependency gaps and design rewire edges before deletion.

### 2. DESIGN
- **PIPELINE**: Design all step agents per `references/agent-frontmatter-schema.md` and draft `topology.json` edges. You MUST append an `output-formatter` step as the final node, configured to write to `<workspace-root>/output/`.
- **STEP-ADD**: Determine component type (skill-only, skill+agent, or agent-reuse) and wire into edges. Ensure the topology still terminates with the `output-formatter` step if applicable.
- **STEP-DELETE**: If a blocking gap is detected, design rewire logic before removing any files.
- **Constraint**: Agent files are zero-body (frontmatter only). Preload `sk-*` method skills and the companion `{agent-name}-protocol` skill. All protocol goes into the companion skill.

### 3. DEVELOP

<EXTREMELY-IMPORTANT>
Every new agent MUST follow the Lean Agent pattern: the agent file is frontmatter-only (zero body text after the closing `---`). All protocol lives in a companion `{agent-name}-protocol` skill. STOP if you are about to write prose into an agent file body.
</EXTREMELY-IMPORTANT>

**For each new agent (REQUIRED, non-optional):**
1. Create the agent file with frontmatter only — no text after the closing `---`.
2. Create `skills/superpipelines/{P}/{agent-name}-protocol/SKILL.md` with `disable-model-invocation: true` and `user-invocable: false`. Place all operational protocol inside it.
3. Add `{agent-name}-protocol` to the agent's `skills:` frontmatter list.

See `references/sdd-artifacts.md` § "Lean agent stub + protocol skill templates" for exact templates.

**Frontmatter rules:**
- Default to `model: sonnet`.
- Set `permissionMode: plan` for reviewers and architects.
- Set `memory: local` only for cross-run heuristics; never use `memory: project`.
- Set `user-invocable: false` for internal step skills.

**Build** files via `Write` (new) or `Edit` (update), resolving all paths via `sk-pipeline-paths`.

### 4. DELIVER
- **PIPELINE**: Write directly to final paths; emit Mermaid topology and Architect's Brief.
- **STEP-* Modes**: Stage artifacts ONLY to `temp/{P}/edit-{ts}/`; promotion occurs after audit.
- **UPDATE/DIAGNOSE**: Edit in-place and provide a delta summary.
</protocol>

<invariants>
- Agent files are zero-body. No text may appear after the closing `---` of the frontmatter block.
- Every agent must have a companion `{agent-name}-protocol` skill listed in its `skills:` frontmatter.
- Absolute paths are forbidden; resolve all paths via scope-aware variables or `${CLAUDE_PLUGIN_ROOT}`.
- `permissionMode: bypassPermissions` requires an inline justification comment in the companion `{agent-name}-protocol` skill.
- `memory: project` is strictly forbidden in all agent frontmatter.
</invariants>

## Reference Files

- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-architect-references/references/topology-selection.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-architect-references/references/agent-frontmatter-schema.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-architect-references/references/sdd-artifacts.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-architect-references/references/anti-patterns.md`
