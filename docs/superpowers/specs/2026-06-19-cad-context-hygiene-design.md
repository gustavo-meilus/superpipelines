# Skill Invocation and CAD Context Hygiene

## Context

Superpipelines now scaffolds generated pipelines as data-only bundles under `.superpipelines/pipelines/{P}/`. Each generated step agent is a canonical agent definition (CAD): one markdown file containing tool-neutral frontmatter plus the inline operational protocol body. Runtime dispatch materializes those CADs into native agent files per platform.

The bundle already documents several context-hygiene principles: descriptions are routing metadata, large instructions should use progressive disclosure, and generated CADs are the portable source of truth. Matt Pocock's v1.0 skill architecture sharpens the same idea with a stricter invocation split: user-invoked workflow skills carry human-facing summaries and no model-trigger burden, while model-invoked reusable discipline skills keep trigger-rich descriptions only when autonomous reach is valuable.

The current creation path and bundle skill set can be made more efficient and less ambiguous by applying those principles consistently to:

- new pipeline scaffolding;
- the Superpipelines bundle's own skill invocation metadata;
- cross-skill dependency ownership;
- auditor checks that keep stale legacy guidance out of active paths.

This design applies to the Superpipelines bundle and to pipelines created after the change. It does not migrate or audit already-created pipelines.

## Goals

- Make future generated pipelines cheaper and clearer to load by default.
- Keep the current data-only CAD architecture: one CAD file per generated step agent.
- Ensure CAD descriptions are trigger-only metadata, not workflow summaries.
- Standardize generated CAD bodies around a compact, executable structure.
- Allow per-pipeline shared references only when they reduce duplication or encode a stable contract.
- Apply the user-invoked vs model-invoked taxonomy to bundle skills.
- Treat `using-superpipelines` as the bundle router/index, similar to `ask-matt`.
- Keep shared rules in one owning skill or reference instead of duplicating them across workflow bodies.
- Add auditor checks so the hygiene rules are enforceable during pipeline creation and bundle maintenance.

## Non-goals

- Do not reintroduce zero-body generated agents plus companion protocol skills.
- Do not migrate existing generated pipelines.
- Do not change `sk-platform-dispatch` materialization semantics.
- Do not make every generated pipeline create a `references/` directory.
- Do not move bundle-level protocol skills into generated pipeline data.
- Do not add new public commands.
- Do not split, rename, or remove existing public Superpipelines skills or commands.
- Do not rewrite model resolution, dispatch, worktree behavior, or reviewer-isolation semantics.
- Do not perform broad prose/style cleanup unrelated to invocation, context hygiene, or stale generation guidance.

## Design

### Bundle invocation taxonomy

The bundle should classify skills by invocation role before editing descriptions or flags.

User-facing workflow and command entrypoints are the skills users think of as Superpipelines commands or flows:

- `creating-a-pipeline`
- `running-a-pipeline`
- `adding-a-pipeline-step`
- `updating-a-pipeline-step`
- `deleting-a-pipeline-step`
- `change-models`
- `optimizing-a-pipeline`
- `migrating-a-pipeline`
- `using-superpipelines`

These skills should be routed through `using-superpipelines` or explicit command invocation. If the platform supports a strict user-invoked flag, heavy command skills should set `disable-model-invocation: true` unless another model-invoked bundle skill must reach them directly. Their descriptions should be human-facing one-line summaries, not rich trigger lists. The router carries the trigger table.

Reusable discipline, guardrail, and method skills remain model-invoked only when autonomous reach is valuable. Examples include:

- `test-driven-development`
- `systematic-debugging`
- `verification-before-completion`
- `sk-spec-driven-development`
- `sk-claude-code-conventions`

Their descriptions may remain model-facing, but should contain distinct trigger branches rather than workflow summaries.

Internal protocol/reference skills should not be directly user-invoked. They should declare `user-invocable: false`, and should set `disable-model-invocation: true` unless they are intentionally reachable as reusable model-invoked discipline skills. Examples include pipeline agent protocols, model resolver internals, path/state helpers, and platform dispatch helpers.

The implementation should make the smallest safe flag changes. If a platform-specific compatibility concern requires keeping a command skill model-invoked, the description still moves toward trigger-only metadata and `using-superpipelines` remains the intended router.

Before changing invocation flags, implementation must build a small compatibility matrix for the supported skill surfaces: Codex, Claude, Cursor, OpenCode, and the universal fallback. The matrix should record which fields are recognized, ignored, or unsafe for each surface, especially `disable-model-invocation` and `user-invocable`. Flags should only change where semantics are confirmed. Description cleanup applies everywhere because it is platform-neutral.

### Router behavior

`using-superpipelines` becomes the explicit router/index for the bundle. Its body should help the user or orchestrator choose the correct workflow without loading every workflow body.

The router owns:

- command-to-skill routing;
- ambiguous-request handling;
- which workflows are user-facing;
- which skills are internal support;
- when to run direct codebase Q&A instead of invoking a pipeline workflow.

Workflow skills should not duplicate the full routing table. They may state their local trigger and refer back to the router for global command selection.

### Description rules

Descriptions should be pruned according to invocation role.

For model-invoked skills:

- front-load the leading trigger words;
- use one trigger per distinct branch;
- avoid workflow summaries such as "reads X, analyzes Y, writes Z";
- include "when another skill needs..." only when direct model reach is actually needed.

For user-invoked skills:

- use a short human-facing summary;
- strip "Use when the user says..." trigger lists;
- keep command discovery in the router or command docs.

For internal protocol/reference skills:

- state what agent or bundle step loads the skill;
- do not advertise broad user workflows;
- avoid duplicating protocol details in the description.

Every edited description should be tested against three expected invocations and three false-positive prompts before shipping.

### Dependency ownership

Cross-skill dependencies should be expressed as skill invocation, not deep references into another skill's private files.

Preferred:

```text
Load `sk-pipeline-patterns` to select the topology.
```

Avoid:

```text
Read `../sk-pipeline-patterns/references/topology-selection.md`.
```

Shared reference files stay owned by the skill that owns the concept. Other skills reach that material by loading the owning skill unless the reference is explicitly declared a public normative reference. Public normative references must be named as such in the owning skill.

Generated pipeline references are different: they are pipeline data files under `DATA_ROOT/pipelines/{P}/references/`, not registered skills and not bundle-level references.

### Single source of truth and stale guidance

The active generation path must describe one layout:

- data-only pipeline artifacts under `.superpipelines/pipelines/{P}/`;
- one CAD file per generated agent;
- inline protocol body inside each CAD;
- no generated companion `-protocol` skills;
- no generated source artifacts under tool directories.

Legacy old-root guidance may remain only where needed for migration, backward-compatible audit, or fixtures. It must be labelled as legacy-only. Active architect templates, fix templates, topology rules, and anti-pattern references must not tell the architect or auditor to create zero-body generated agents or companion protocol skills for new pipelines.

The implementation should specifically check and update:

- `pipeline-architect-references/references/agent-frontmatter-schema.md`;
- `pipeline-architect-references/references/anti-patterns.md`;
- `pipeline-auditor-references/references/fix-templates.md`;
- `pipeline-auditor-references/references/topology-rules.md`;
- `pipeline-auditor-references/references/compliance-matrix.md`;
- fixtures, examples, snapshots, and tests that assert generated pipeline shape;
- source and packaged copies under `plugins/superpipelines/skills/`.

Generated pipeline fixtures or examples that intentionally preserve pre-change behavior must be labelled legacy-only. Tests for new scaffolding should assert the data-only CAD shape, inline protocol body, required sections, and absence of companion protocol skills.

### Packaging synchronization

The source of truth for bundled skills remains `skills/`. Packaged copies under `plugins/superpipelines/skills/` must mirror source after implementation.

After source edits, implementation must run the packaging sync/check path:

```text
node scripts/package-codex-plugin.js
node scripts/package-codex-plugin.js --check
```

The single-shot implementation should also add executable validation for objective CAD/BUNDLE hygiene checks over repo-owned sources only. The validator should live in the existing Node validation surface where practical: either as part of `node scripts/package-codex-plugin.js --check` or as a companion `scripts/` check that the package check calls. It should not scan or migrate real user-created pipelines under local runtime roots such as `.superpipelines/`, `.codex/`, `.agents/`, `.claude/`, or home-directory pipeline stores.

The hard validator should focus on objective checks:

- CAD fixtures/templates do not contain skill invocation metadata such as `disable-model-invocation` or `user-invocable`.
- Repo-owned CAD fixtures/templates include required body sections such as `## Required Sources`, `## Protocol`, `## Completion Criterion`, and `<invariants>`.
- Stale active-path phrases for zero-body agents, companion protocol skills, and generated tool-dir source artifacts are absent outside clearly labelled legacy, migration, old-root, or fixture-discrimination material.
- Packaged plugin mirrors remain synchronized with source skills.

Description quality should remain a review/evidence concern rather than a hard lint rule. The evidence file should record before/after description lengths and manual invocation checks, but the executable validator should avoid subjective "workflow summary" heuristics that would create noisy false positives.

If the package script exposes additional validation failures unrelated to the edited scope, those should be reported rather than silently worked around.

Implementation should record lightweight before/after evidence for context hygiene:

- edited skill description lengths before and after cleanup;
- `rg` hit counts for stale active-path phrases such as `zero-body`, `companion protocol`, `-protocol skill`, and generated artifacts under tool directories;
- which hits remain intentionally because they are legacy-only, fixtures, or migration documentation.
- the exact executable hygiene validation command and a concise pass/fail summary.

This is not a performance benchmark. It is verification evidence that the single-shot cleanup reached the intended surface.

### CAD shape

The architect continues to generate one CAD file for each step agent:

```text
DATA_ROOT/pipelines/{P}/agents/{agent-name}.md
```

Each CAD keeps the existing canonical frontmatter contract:

- `schema_version`
- `name`
- `description`
- `role`
- `review_stage`
- `model_tier`
- `effort_tier`
- `turn_budget`
- `capabilities`
- `tool_hints`
- `isolation_required`
- `io_contract`
- `protocol_skills`
- `status_protocol`
- `plugin_version`

The `description` field remains third-person, trigger-only routing metadata. It must not summarize the agent's workflow.

CAD frontmatter is not skill frontmatter. Invocation fields such as `disable-model-invocation` and `user-invocable` belong to bundle skills only, subject to the compatibility matrix above. Generated CADs keep the canonical agent schema unless the schema is deliberately extended in a separate design. For this change, CAD context hygiene means improving CAD descriptions and bodies, not adding skill-invocation metadata to generated agent definitions.

### CAD body contract

Every generated CAD body uses this structure unless the pipeline is explicitly minimal. Braced values in the template are placeholders for generated content, not unresolved requirements.

```markdown
# {Agent Display Name} - Operational Protocol

<overview>
{One short paragraph describing the agent's responsibility and quality bar.}
</overview>

## Required Sources
- {source} - {why this source is required}

## Protocol

<protocol>
### 1. DISCOVER
{What to read and verify before acting.}

### 2. PROCESS
{Core operational steps.}

### 3. DELIVER
{Output schema, persistence expectations, and terminal status emission.}
</protocol>

## Completion Criterion
{Visible condition that proves this step is done.}

<invariants>
- {Non-negotiable rule.}
- Emit exactly one terminal status: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED.
</invariants>
```

Reviewer, safety, debugging, and discipline-enforcing agents also include:

```markdown
## Red Flags - STOP
- "{rationalization}" -> {corrective action}
```

The body should not restate the frontmatter description. The overview states the agent's responsibility; the description states when the agent should be selected.

### Per-pipeline references

The architect may create:

```text
DATA_ROOT/pipelines/{P}/references/{name}.md
```

References are allowed only when one of these conditions is true:

- Two or more CADs need the same rubric, schema, checklist, or examples.
- The shared material is long enough that inlining it would make a CAD harder to scan.
- The shared material is a stable contract, such as a finding schema, severity rubric, output schema, or review checklist.

One-off operational instructions stay inline in the CAD that uses them.

The architect should use a practical duplication heuristic instead of a fixed token threshold. If repeated material causes multiple CADs to carry substantially the same rubric, schema, checklist, examples, or review rules, extract it into a per-pipeline reference and justify the extraction. If only one CAD needs the material, keep it inline unless it is a stable contract or clearly harms scanability.

CAD bodies reference these files from `Required Sources` and explain why each file is required. The runtime behavior stays unchanged: the executing agent reads the CAD body first, then reads required references as directed.

When a generated reference file is created, the architect records a short justification in the architect brief or adjacent scaffold summary. The justification states whether the reference exists because of multi-agent reuse, scanability, or stable-contract value.

The creation flow must produce a scaffold summary artifact or section that is available to the auditor. It records the generated CAD count, reference files created, the justification for each reference, and any deliberate exceptions to the default inline-body pattern. This summary is the primary evidence for `CAD-09`.

Explicitly minimal or tracer pipelines may omit `Required Sources` only when no external source is required. In that case, the CAD body must include:

```markdown
## Required Sources
- None. This step is self-contained.
```

### Creation flow

`creating-a-pipeline` should tell the architect that generated CADs must follow the CAD context-hygiene contract.

`pipeline-architect-protocol` should own the generation rule:

- Generate one CAD per step agent.
- Keep protocol logic inline in the CAD.
- Use per-pipeline references only for reused or contract-like shared material.
- Never generate companion `-protocol` skills for new data-only pipelines.

`pipeline-architect-references/references/sdd-artifacts.md` should provide the canonical CAD template with the new body contract.

`pipeline-architect-references/references/agent-frontmatter-schema.md` should be rewritten as a legacy-only reference or replaced by pointers to the canonical CAD schema. The active generation path must live in `sdd-artifacts.md` and the canonical agent-def references, not in the legacy zero-body agent template.

### Audit rules

The auditor should add CAD hygiene criteria after the existing `CAD-01..CAD-05` checks:

- `CAD-06`: description is third-person, trigger-only, and contains no workflow summary.
- `CAD-07`: CAD body includes the required operational sections: overview, Required Sources, Protocol, Completion Criterion, and invariants.
- `CAD-08`: Completion Criterion is explicit and verifiable.
- `CAD-09`: per-pipeline references are justified by reuse, scanability, or stable-contract value.
- `CAD-10`: new data-only pipelines do not use stale legacy patterns: no zero-body generated agents, no generated companion protocol skills, and no generated source artifacts under tool directories.

`CAD-06`, `CAD-07`, and `CAD-08` should normally be SEV-2 unless the missing content makes execution ambiguous enough to break the step contract. `CAD-10` should be SEV-1 because it violates the data-only architecture and can break portability. `CAD-09` should normally be SEV-3 or PARTIAL because over-inlining or over-splitting is an efficiency problem unless it causes a direct contract conflict.

Bundle-level hygiene criteria must live in one canonical audit surface. If the existing pipeline auditor is the tool used for bundle maintenance, these checks belong in its references and report schema. If bundle maintenance uses a different path, implementation must identify that path and wire the checks there. At minimum, each `BUNDLE-*` check must have a concrete manual verification checklist in the owning audit reference; they should not exist only in this design document.

The canonical bundle-maintenance audit surface should include:

- `BUNDLE-01`: skill descriptions match invocation role: human-facing summary for user-only skills, model-facing triggers for model-invoked skills, loader summary for internal protocol skills.
- `BUNDLE-02`: invocation flags match role: command/workflow, reusable discipline, or internal protocol/reference.
- `BUNDLE-03`: workflow-summary descriptions are flagged when they include internal process details instead of routing triggers or human summaries.
- `BUNDLE-04`: internal protocol/reference skills are not user-invocable unless explicitly justified.
- `BUNDLE-05`: cross-skill deep reference links are flagged unless they point to an explicitly public normative reference.
- `BUNDLE-06`: active authoring paths contain no stale generated-agent guidance for zero-body agents, companion protocol skills, or tool-dir source artifacts.
- `BUNDLE-07`: packaged plugin copies mirror source skill files after edits.

`BUNDLE-06` should be SEV-1 because stale generation guidance can create non-portable pipelines. `BUNDLE-01..BUNDLE-05` are normally SEV-2 unless they make a skill unreachable or falsely auto-invoked. `BUNDLE-07` is SEV-1 for release readiness because packaged users would receive different behavior than source users.

### Runtime impact

`sk-platform-dispatch` remains mostly unchanged. Materialization still reads one CAD per agent and emits the native agent representation for the current tier. Per-pipeline references are ordinary data files read by the executing protocol when required; they are not separate registered skills.

## Success Criteria

- New pipeline scaffolding instructions consistently describe CADs as one file with inline protocol body.
- Generated CAD descriptions are trigger-only metadata.
- Generated CAD bodies include a completion criterion by default.
- Shared references are available for reused rubrics, schemas, checklists, and templates without becoming mandatory.
- The auditor can detect stale legacy generation patterns before human approval.
- Bundle skills are classified by invocation role.
- `using-superpipelines` owns command/workflow routing instead of scattering a full routing table through workflow skills.
- Internal protocol/reference skills are not user-facing entrypoints.
- Cross-skill dependencies no longer deep-link into private reference files unless the target is an explicit public normative reference.
- Active authoring references no longer tell new pipelines to generate zero-body agents or companion protocol skills.
- Packaged plugin skill copies are synced with source skill changes.
- An executable repo-owned hygiene validator checks objective CAD/BUNDLE drift and is run as part of, or immediately alongside, the package check.
- Existing generated pipelines are unaffected.

## Decisions

- Explicitly minimal or tracer pipelines still include `Required Sources`, but may declare `None. This step is self-contained.`
- New `references/` files require a short scaffold-time justification.
- The legacy zero-body agent guidance should be removed from the active generation path and retained only as legacy documentation if still needed for migration or audit support.
- `using-superpipelines` is the bundle router/index and should absorb global command-routing responsibility.
- Heavy workflow skills should be user-invoked where platform compatibility allows; when compatibility requires model reach, their descriptions still follow trigger-only metadata and defer routing breadth to the router.
- Reusable discipline skills stay model-invoked only when autonomous reach is valuable.
- Internal protocol skills are loader-facing, not user-facing.
- Hard validation is limited to objective repo-owned checks; subjective skill-description quality stays in evidence and review.
- Legacy stale-pattern hits are allowed only when clearly labelled as legacy, migration, old-root, or fixture-discrimination material.
