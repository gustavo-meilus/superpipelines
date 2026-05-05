---
description: Design and scaffold a new named multi-agent pipeline with git preflight, scope selection, pre-gate audit, and entry-skill generation
argument-hint: [brief description of the pipeline]
---

# New Pipeline — Command Reference

> Designs and scaffolds a new named multi-agent pipeline. Includes git preflight, scope selection, execution pattern selection, and mandatory pre-gate audits.

<args>
- **$ARGUMENTS**: Brief description of the intended pipeline.
</args>

<protocol>
### 1. PREFLIGHT
- **Git Check**: Verify workspace for `.git`. If absent, prompt user to initialize or proceed with restricted isolation.
- **Scope Selection**: Select between `local`, `project`, or `user` scopes.
- **Uniqueness**: Resolve a lowercase-hyphen name and verify it against the `registry.json` of the chosen scope.
- **Context Injection**: Check for the presence of a root `PIPELINE-CONTEXT.md`. If missing, suggest or run `/superpipelines:init-deep` to generate hierarchical context maps before proceeding.

### 2. DESIGN
- **4D Analysis**: Run the 4D Method on the brief to select an execution pattern (1–5).
- **Architect Dispatch**: Invoke `pipeline-architect` in PIPELINE mode to produce spec, plan, tasks, topology, agents, and internal skills.

### 3. VERIFICATION
- **Pre-gate Audit**: Execute `pipeline-auditor` in DELTA mode on the generated bundle.
- SEV-0 and SEV-1 findings must be resolved before reaching the human gate.

### 4. DELIVERY
- **Human Gate**: Present the specification and task list for approval or revision.
- **Scaffold Generation**: Write the entry skill with appropriate model-invocation settings.
- **Registry Update**: Append the new pipeline record to the canonical registry file.
</protocol>

<invariants>
- NEVER skip git preflight, scope selection, or the pre-gate audit.
- NEVER proceed to scaffold generation without explicit approval at the human gate.
- Resolve all paths via `sk-pipeline-paths` to ensure scope awareness.
</invariants>
