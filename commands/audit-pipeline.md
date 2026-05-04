---
description: Audit one or all pipelines against layout, frontmatter, topology, and runtime-safety standards — produces a severity-classified report (SEV-0/1/2/3) with cited evidence
argument-hint: [pipeline-name | --all | path/glob]
---

# Audit Pipeline — Command Reference

> Audits one or all pipelines against layout, frontmatter, topology, and runtime-safety standards. Produces a severity-classified report (SEV-0 to SEV-3) with cited evidence.

<args>
- **$ARGUMENTS**: Optional. Accepts a pipeline name, `--all`, or a file path/glob. Defaults to all pipelines if empty.
</args>

<operating_modes>
- **Named Pipeline/Path** → `FULL` mode: Audits the complete bundle or specific files.
- **`--all`** → `SCOPE-WIDE` mode: Audits every pipeline across all available scopes.
</operating_modes>

<protocol>
### 1. INITIALIZATION
- Dispatch the `pipeline-auditor` subagent.
- Resolve targets and scope roots via `sk-pipeline-paths`.

### 2. CLASSIFICATION & AUDIT
- Classify files into categories: subagent, internal skill, entry skill, reference, topology, or registry.
- Apply the 20-criterion compliance matrix across the four standard bands.
- Execute topology graph rules, including edge consistency and cycle checks.

### 3. REPORTING
- Classify all findings by severity (SEV-0 to SEV-3).
- Write the report to `<scope-root>/superpipelines/pipelines/{P}/audit/latest.md`.
- Update the `last_audit` timestamp in `registry.json`.
- Present the executive summary inline to the user.
</protocol>

<invariants>
- The command is read-only by default.
- SEV-0/1 fixes require explicit user authorization and are routed to the `pipeline-architect` with a remediation plan.
</invariants>
