---
name: run-doc-legacy
description: Run the doc-legacy pipeline.
user-invocable: true
version: "1.5"
---

# Run doc-legacy (LEGACY entry skill — direct Task dispatch, pre-v2)

This is the pre-v2 registered entry skill. It dispatches steps with raw `Task(subagent_type=...)`,
which bypasses `state.metadata.resolved_models[step_id]` and is forbidden post-v2. Migration
replaces this with a data `entry.md` routing through `sk-platform-dispatch` DISPATCH.

```
# Step 1 — doc-writer
r1 = Task(subagent_type="doc-writer", description="Write doc", prompt="Input: <input>")
if r1.status != "DONE": stop

# Step 2 — doc-reviewer
r2 = Task(subagent_type="doc-reviewer", description="Review doc", prompt="doc: doc.md")
if r2.status != "DONE": stop
```
