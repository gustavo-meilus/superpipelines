---
description: Delete a step from an existing pipeline — select pipeline, select step, perform gap analysis, optionally rewire, audit the delta, then gate on human approval before any deletion
argument-hint: [optional: step name]
---

# /superpipelines:delete-step

Invoke the `deleting-a-pipeline-step` skill.

Step hint: $ARGUMENTS (if provided, skips the step-selection prompt when unambiguous)

The skill will:

1. Read all registries; present pipeline list. `AskUserQuestion` — which pipeline?
2. Parse `topology.json`; display current steps. Ask which step to delete (skipped if `$ARGUMENTS` identifies it).
3. **Gap analysis** — identify all predecessors and successors of the target step. Classify the gap: none / through-gap (rewire needed) / blocking-gap (no valid rewire exists). Surface analysis to user.
4. If gap exists: present rewire options (`Rewire edges | Cancel deletion`). On rewire: collect the wiring plan from the user.
5. Dispatch `pipeline-architect` in STEP-DELETE mode to stage the deletion and any rewiring to `temp/{P}/edit-{ts}/`.
6. **Mandatory delta audit** — `pipeline-auditor` DELTA mode on affected neighbors + updated entry skill. SEV-0/1 must clear before promotion.
7. **Human gate** — show exactly what will be deleted and what (if anything) will be rewired. Wait for `APPROVE | CANCEL`.
8. **Atomic promotion** — execute deletion and rewire from staging; update `topology.json`, `tasks.md`, entry skill, and `registry.json`.

<HARD-GATE>
Never delete a step that creates an unresolvable gap without explicit user confirmation and a rewire plan. Never skip the delta audit. On CANCEL at the human gate: discard all staged changes.
</HARD-GATE>
