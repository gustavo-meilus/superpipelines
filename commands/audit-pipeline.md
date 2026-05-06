---
description: Audit one or all pipelines against layout, frontmatter, topology, and runtime-safety standards — produces a severity-classified report (SEV-0/1/2/3) with cited evidence
argument-hint: [pipeline-name | --all | path/glob]
---

# /superpipelines:audit-pipeline

Dispatch the `pipeline-auditor` subagent.

Target: $ARGUMENTS (defaults to all pipelines in all scopes if empty)

Mode selection:

- **No argument or pipeline name** → `FULL` mode: audit the named pipeline's complete bundle (agents, skills, `topology.json`, registry entry, entry skill contract).
- **`--all`** → `SCOPE-WIDE` mode: audit every pipeline across all available scopes.
- **File path or glob** → `FULL` mode on the specified files only.

The auditor will:

1. Resolve target pipeline(s) and scope roots via `sk-pipeline-paths`.
2. Classify each file: subagent / internal step skill / entry skill / reference / topology / registry.
3. Apply the 20-criterion compliance matrix (`pipeline-auditor-references/compliance-matrix.md`) across 4 bands: layout & registry, frontmatter, topology, runtime safety.
4. Apply topology graph rules (`pipeline-auditor-references/topology-rules.md`): coverage, edge consistency, cycle check, entry-skill contract, registry consistency.
5. Classify all findings by severity (SEV-0 / SEV-1 / SEV-2 / SEV-3).
6. Write the report to `<scope-root>/superpipelines/pipelines/{P}/audit/latest.md` and update `registry.json` `last_audit`.
7. Present the executive summary inline.

Read-only by default. To apply SEV-0/1 fixes, ask explicitly — the auditor hands off to `pipeline-architect` with a remediation plan.
