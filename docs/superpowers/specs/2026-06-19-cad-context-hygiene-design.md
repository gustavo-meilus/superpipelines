# CAD Context Hygiene for New Pipelines

## Context

Superpipelines now scaffolds generated pipelines as data-only bundles under `.superpipelines/pipelines/{P}/`. Each generated step agent is a canonical agent definition (CAD): one markdown file containing tool-neutral frontmatter plus the inline operational protocol body. Runtime dispatch materializes those CADs into native agent files per platform.

The bundle already documents several context-hygiene principles: descriptions are routing metadata, large instructions should use progressive disclosure, and generated CADs are the portable source of truth. The current creation path can be made more efficient and less ambiguous by applying those principles consistently to new pipeline scaffolding.

This design applies only to pipelines created after the change. It does not migrate or audit already-created pipelines.

## Goals

- Make future generated pipelines cheaper and clearer to load by default.
- Keep the current data-only CAD architecture: one CAD file per generated step agent.
- Ensure CAD descriptions are trigger-only metadata, not workflow summaries.
- Standardize generated CAD bodies around a compact, executable structure.
- Allow per-pipeline shared references only when they reduce duplication or encode a stable contract.
- Add auditor checks so the hygiene rules are enforceable during pipeline creation.

## Non-goals

- Do not reintroduce zero-body generated agents plus companion protocol skills.
- Do not migrate existing generated pipelines.
- Do not change `sk-platform-dispatch` materialization semantics.
- Do not make every generated pipeline create a `references/` directory.
- Do not move bundle-level protocol skills into generated pipeline data.

## Design

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

CAD bodies reference these files from `Required Sources` and explain why each file is required. The runtime behavior stays unchanged: the executing agent reads the CAD body first, then reads required references as directed.

When a generated reference file is created, the architect records a short justification in the architect brief or adjacent scaffold summary. The justification states whether the reference exists because of multi-agent reuse, scanability, or stable-contract value.

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

### Runtime impact

`sk-platform-dispatch` remains mostly unchanged. Materialization still reads one CAD per agent and emits the native agent representation for the current tier. Per-pipeline references are ordinary data files read by the executing protocol when required; they are not separate registered skills.

## Success Criteria

- New pipeline scaffolding instructions consistently describe CADs as one file with inline protocol body.
- Generated CAD descriptions are trigger-only metadata.
- Generated CAD bodies include a completion criterion by default.
- Shared references are available for reused rubrics, schemas, checklists, and templates without becoming mandatory.
- The auditor can detect stale legacy generation patterns before human approval.
- Existing generated pipelines are unaffected.

## Decisions

- Explicitly minimal or tracer pipelines still include `Required Sources`, but may declare `None. This step is self-contained.`
- New `references/` files require a short scaffold-time justification.
- The legacy zero-body agent guidance should be removed from the active generation path and retained only as legacy documentation if still needed for migration or audit support.
