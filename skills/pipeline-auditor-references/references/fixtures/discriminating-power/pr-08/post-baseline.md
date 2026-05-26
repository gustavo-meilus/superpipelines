# Resolution Algorithm — Post-Q14 Snapshot (PR-08 compliant baseline)

> Snapshot of `skills/sk-model-resolver/references/resolution-algorithm.md` Step 4 after the Q14 fix. Used by `pipeline-auditor` to confirm PR-08's regex does NOT trip on the compliant form.

## RESOLVE — Step 4 (post-Q14)

```
4. IF profile.capabilities.dynamic_subagents == true:
     return {
       model: null,
       effort: null,
       effort_field_name: null,
       model_field_format: profile.capabilities.model_field_format,
       source: "host_inherit",
       warnings: ["Dynamic-subagent platform — host orchestrator picks model"]
     }
   // Rationale: no topology node is ever the orchestrator on a dynamic-subagent
   // platform — the orchestrator is the entry skill (caller), not a callee agent.
   // The agent frontmatter schema declares no `role` field; any reference to
   // `agent.role` here would be a phantom-field check (see pipeline-auditor PR-08).
```

## Compliance

Step 4 is unconditional on `dynamic_subagents`. No reference to `agent.role`. The algorithm consults only fields declared in `agent-frontmatter-schema.md`. PR-08 returns 0 violations.
