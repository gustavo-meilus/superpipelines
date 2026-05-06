---
description: Add a new step to an existing pipeline — select pipeline, choose insertion point, design component, audit the delta, then gate on human approval
argument-hint: [description of the new step]
---

# /superpipelines:new-step

Invoke the `adding-a-pipeline-step` skill.

Brief: $ARGUMENTS

The skill will:

1. Read all registries (all scopes); present pipeline list. `AskUserQuestion` — which pipeline?
2. Parse `topology.json` for the chosen pipeline; display the current step graph.
3. Ask insertion point: `before {step} | after {step} | parallel-to {step} | append-end`.
4. Run the 4D Method on the brief; determine component type: skill-only, skill + new agent, or reuse existing agent.
5. Dispatch `pipeline-architect` in STEP-ADD mode to design the component(s). All new files are staged to `temp/{P}/edit-{ts}/`.
6. **Topology mutation validation** — verify the staged `topology.json`: new step wired to predecessors and successors, no dangling edges.
7. **Mandatory delta audit** — `pipeline-auditor` DELTA mode on new component + neighbors + entry skill. SEV-0/1 must clear before promotion.
8. **Human gate** — brief `APPROVE | REVISE` summary including updated topology.
9. **Atomic promotion** — move staged files to final paths; update `registry.json`.

Do NOT skip the delta audit or the human gate. Do NOT write directly to final paths — always use staging.
