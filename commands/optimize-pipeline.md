---
description: Optimize an existing pipeline on demand — survey topology, model-tier cost, and past-run signals, lock an optimization plan with the user, then batch-apply it atomically with a mandatory post-apply audit
argument-hint: [pipeline-name]
---

# Optimize Pipeline — Command Reference

> Runs the on-demand optimization workflow against an existing named pipeline: a read-only `pipeline-optimizer` survey across four axes, a 4D → brainstorm → grill discovery session that locks an `optimization_plan`, and an atomic batch-apply gated by `pipeline-auditor`.

<args>
- **$ARGUMENTS**: Optional pipeline name. When provided, it pre-selects the pipeline for Phase 0 (still confirmed before any mutation). When empty, the workflow lists pipelines across all scope roots for selection.
</args>

<protocol>
- Invoke the `optimizing-a-pipeline` skill, which owns the full workflow (Phases 0–5): selection, no-active-run soft gate, optimizer survey, discovery session, single plan gate, atomic batch-apply, and mandatory post-apply proof.
- Pass any `$ARGUMENTS` pipeline name through as the Phase 0 pre-selection.
</protocol>

<invariants>
- The survey is read-only; nothing is mutated before the Phase 3 plan gate.
- Batch-apply is all-or-nothing, snapshotted, and gated by SEV-0/1 == 0 on both the DELTA and full audits.
</invariants>
