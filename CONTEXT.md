# Superpipelines — Domain Glossary

> Decodes project jargon. Names are load-bearing — when in doubt, use these exact terms.
> Architecture vocabulary (`module`, `interface`, `seam`, `depth`, `adapter`, `locality`, `leverage`) lives in `~/.claude/skills/improve-codebase-architecture/LANGUAGE.md` and is not duplicated here.

## Execution model

- **Pipeline** — a named multi-agent workflow (topology + agents + state) that exists in a scope. Multiple pipelines coexist per workspace.
- **Agent** — a single AI worker emitting exactly one terminal status (`DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`). Form varies by tier: zero-body frontmatter on Tier 1 (CC), `mode: subagent` body ≤150 LOC on Tier 1b (OC), TOML file on Tier 1d (Codex).
- **Skill** — markdown `SKILL.md` with frontmatter. Primary unit of intelligence. Skills are platform-agnostic.
- **Protocol Skill** — companion `{agent-name}-protocol/SKILL.md` holding an agent's operational protocol. CC-only pattern (Tier 1); other tiers embed the protocol in the agent body.
- **Topology** — `topology.json` describing pipeline steps and the edges between them.
- **Registry** — `registry.json` listing all pipelines in a scope.
- **Pipeline State** — JSON file at `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`. Carries `plugin_version`, `metadata.source_tier`, `metadata.runtime_tier`, `metadata.resolved_models[step_id]`.
- **Scope** — where artifacts live: `local` (per-workspace `.claude/`), `project` (committed `<repo>/.claude-pipelines/`), or `user` (`~/.claude/`).

## Tiers and platforms

- **Tier** — execution capability class:
  - **tier_1** — Claude Code; skill-callable `Task()` dispatch.
  - **tier_1b** — OpenCode; `mode: subagent` native dispatch. First-class sibling repo (`superpipelines-opencode`).
  - **tier_1c** — Antigravity CLI 2.0; Dynamic Subagents (aspirational; falls back to Tier 2 if dispatch primitive unverified).
  - **tier_1d** — Codex App/CLI; native model-driven parallel subagents; TOML agents; up to 6 concurrent.
  - **tier_2** — Cursor / Windsurf / Cline; single-agent inline execution.
- **Platform Profile** — JSON capability descriptor per tier; lives at `skills/sk-platform-dispatch/profiles/{tier}.json`. Single source of truth for all per-platform facts.
- **Capability** — a field on `profile.capabilities` describing what the platform can do (`dynamic_subagents`, `skill_tool`, `model_field_format`, `effort_field_name`, `reviewer_isolation`, `dispatch_mechanism`, etc.). Capabilities are **independent** unless proven otherwise — do not couple two capabilities by assumption.

## Model resolution

- **Model Tier** — author-declared role category for an agent: `triage | fast | medium | deep | inherit`. Lives in agent frontmatter as `model_tier:`.
- **Effort Tier** — orthogonal reasoning intensity: `low | medium | high`. Lives in agent frontmatter as `effort_tier:`. Optional.
- **Preference File** — user or workspace overrides for model-tier → concrete-model mapping. Paths: `~/.superpipelines/model-preferences.json` (user), `<workspace>/.superpipelines/model-preferences.json` (workspace).
- **Resolution Algorithm** — the normative 10-step procedure that translates `(agent, profile, prefs) → resolved`. Lives in `sk-model-resolver/references/resolution-algorithm.md`. One source of truth; cited by every adapter.
- **Resolution Adapter** — a concrete execution of the algorithm. Two adapters exist:
  - **Skill adapter** — `sk-model-resolver/SKILL.md` body. Invoked when the Skill tool is available.
  - **Inline adapter** — `running-a-pipeline` Phase 0.4 inline block. Invoked when the Skill tool is unavailable.
  Both adapters cite the algorithm doc and produce identical outputs given identical inputs. Inline adapter uses degenerate (empty) prefs only when file-read also fails.
- **Resolved** — output of the algorithm per agent: `{model, effort, effort_field_name, model_field_format, source, warnings}`.
- **Source** — which of the 5 precedence layers won resolution: `frontmatter_override | workspace_prefs | user_prefs | profile_default | host_inherit`. Always emitted as a literal enum string; never paraphrased.

## Roles owned by the resolver

The resolver module (`sk-model-resolver`) exposes these operations as a pure function — never writes to disk, never calls APIs:

- `RESOLVE(agent, profile, prefs) → resolved`
- `LOAD_PREFS(workspace_root) → { user, workspace }`
- `EMIT(resolved, target_format) → string` — for serializing the model field into agent dispatch payloads
- `RENDER_RESOLUTION_TABLE(resolved[]) → string` — for human-facing rendering in Phase 0.4 output
- `REVERSE_MAP(concrete_model, profile) → tier | null` — for v1 → v2 frontmatter migration
- `DETECT_CATALOG_DRIFT(prefs, profile) → { drifted, message }` — advisory when profile `model_tiers_version` advances past `model_tiers_version_acked` in prefs

## Version stamping

- **`plugin_version`** — stamped on every generated artifact (`topology.json`, `registry.json` entries, `pipeline-state.json`, agent frontmatter). Updated on every mutation. Enables retro-compatibility detection.
- **`profile_version`** — per-profile version, governs profile-schema compatibility.
- **`model_tiers_version`** — per-profile catalog version. When the catalog advances, preference files retain the old value in `model_tiers_version_acked` and the drift detector emits an advisory.
