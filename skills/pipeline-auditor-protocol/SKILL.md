---
name: pipeline-auditor-protocol
description: Loaded by the pipeline-auditor agent to supply operating modes, workflow, and invariants for standards-enforcement auditing. Not user-invocable.
disable-model-invocation: true
user-invocable: false
---

# Pipeline Auditor — Operational Protocol

<overview>
The Pipeline Auditor provides a rigorous, read-only verification layer. It classifies findings across four severity bands (SEV-0 to SEV-3) and produces evidence-backed reports to ensure all components adhere to the canonical framework specifications.
</overview>

<glossary>
  <term name="Compliance Matrix">A 22-criterion checklist covering layout, frontmatter, topology, and runtime safety.</term>
  <term name="Severity Bands">Classification levels from SEV-0 (Critical/Blocking) to SEV-3 (Informational/Style).</term>
  <term name="Audit Report">A generated Markdown document summarizing findings with quoted evidence and remediation paths.</term>
</glossary>

<invariant>
The Auditor is strictly read-only; it cannot modify files. Remediation must be routed to the `pipeline-architect`.
</invariant>

## Operating Modes

<operating_modes>
| Mode | Trigger | Scope |
| :--- | :--- | :--- |
| **FULL** | Direct invocation or first audit. | Entire pipeline bundle: all agents, skills, and topology. |
| **DELTA** | Triggered by mutation commands. | Changed files plus immediate neighbors and the entry skill. |
| **SCOPE-WIDE** | `audit-pipeline --all` command. | FULL audit across all registered pipelines in all scope roots. |
</operating_modes>

## Workflow

<protocol>
### 1. LOCATE
- Resolve paths via `sk-pipeline-paths`.
- **FULL**: Glob all agents and skills; read `topology.json` and the registry.
- **DELTA**: Target only changed files and their graph neighbors.
- **SCOPE-WIDE**: Iterate through all scope roots and registered pipelines.

### 2. AUDIT
- **Compliance Matrix**: Execute the 22-criterion check in `references/compliance-matrix.md` (criteria 1–22, including 10a and new criterion 22 PORTABILITY CHECK — SEV-1).
- **Topology Rules**: Verify graph validity, agent coverage, and edge consistency via `references/topology-rules.md`.
- Assign severity per `references/severity-classification.md` and select fixes from `references/fix-templates.md`.

### 3. REPORT
- Write the final report to `{ROOT}/.../audit/latest.md` using the template in `references/audit-report-template.md`.
- Emit an executive summary inline. If `Write` tools are disallowed, provide the registry update instruction as a plan.
- Record every audit, even those with zero findings.

### 4. FIX ROUTING
- Auditor remains read-only.
- **SEV-0/1**: Route to `pipeline-architect` with the remediation plan.
- **SEV-2/3**: Surface to the user for manual decision.

### Model-Tier Resolution Criteria (v2.0)

| ID | Criterion | SEV | Detection |
|---|---|---|---|
| MT-01 | Hardcoded model ID in skill body | SEV-2 | `grep -E "claude-(sonnet\|opus\|haiku)-[0-9]\|gpt-5\.[0-9]\|gemini-3\." skills/**/SKILL.md skills/**/references/*.md` returns matches outside `skills/sk-platform-dispatch/profiles/` |
| MT-02 | Agent missing both `model_tier:` and `model:` | SEV-1 | Agent frontmatter has neither field. Runtime resolver tolerates (defaults to `fast`) but scaffold-time auditor blocks: explicit declaration required for v2.0+ agents. |
| MT-03 | Agent has explicit `model:` without comment justification | SEV-3 | Escape hatch in use. Surface to reviewer; do not block. |
| MT-04 | Profile JSON missing `model_tiers_version` field | SEV-2 | Required for drift detection. |
| MT-05 | Preference file references a model not in any profile's catalog | SEV-2 | Compare every `prefs.platforms[*].tiers[*]` value against the union of all profiles' `model_tiers[*].model`. Mismatch likely typo or stale ID. |
| MT-06 | Agent has `effort_tier:` set on a platform with `effort_field_name == null` | SEV-3 | Effort will be silently ignored on this platform — inform user. Detection requires knowing the source/runtime tier. |

### Resolution

- MT-01: Move the hardcoded ID to a profile JSON; reference via `platform_profile.model_tiers[tier]`.
- MT-02: Add `model_tier:` to the agent (architect should have done this in Phase 4).
- MT-03: Add a comment line above `model:` documenting WHY the escape hatch is needed.
- MT-04: Add `"model_tiers_version": "YYYY-MM-DD"` to the profile.
- MT-05: Run `/superpipelines:change-models` Mode F (catalog refresh) to reconcile.
- MT-06: Either drop `effort_tier:` or accept that it's a no-op on this platform.
</protocol>

<invariants>
- Cite `file:line` and quote evidence verbatim for every finding.
- DELTA mode must ignore findings outside the changed scope to prevent unrelated blocking.
- NEVER skip the compliance matrix checks, regardless of file appearance.
- NEVER create or modify pipeline components directly.
- Criterion 22 (PORTABILITY CHECK) applies in FULL and DELTA modes. FULL scope: all agents, skills, and topology.json. DELTA scope: changed files only — PLUS the entry skill unconditionally (entry skill is always in scope for portability checks regardless of which files changed).
</invariants>

## Reference Files

- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-auditor-references/references/compliance-matrix.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-auditor-references/references/topology-rules.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-auditor-references/references/severity-classification.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-auditor-references/references/audit-report-template.md`
- `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-auditor-references/references/fix-templates.md`
