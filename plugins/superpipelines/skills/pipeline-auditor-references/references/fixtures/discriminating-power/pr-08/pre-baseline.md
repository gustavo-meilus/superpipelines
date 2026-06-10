# Resolution Algorithm — Pre-Q14 Snapshot (PR-08 violation baseline)

> Immutable snapshot of `skills/sk-model-resolver/references/resolution-algorithm.md` Step 4 prior to the Q14 fix. Used by `pipeline-auditor` to confirm PR-08's regex catches the historical phantom-field violation.

## RESOLVE — Step 4 (pre-Q14)

```
4. IF profile.capabilities.dynamic_subagents == true AND agent.role != "orchestrator":
     return {
       model: null,
       effort: null,
       effort_field_name: null,
       model_field_format: profile.capabilities.model_field_format,
       source: "host_inherit",
       warnings: ["Dynamic-subagent platform — host orchestrator picks model"]
     }
```

## Violation

`agent.role` is referenced. The canonical agent frontmatter schema (`skills/pipeline-architect-references/references/agent-frontmatter-schema.md`) declares no `role:` field. Every topology agent has `agent.role == undefined`; the gate fires by accident on a phantom field. PR-08 MUST flag this clause.
