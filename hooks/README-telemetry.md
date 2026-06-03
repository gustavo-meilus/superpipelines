# Run Telemetry — Opt-In SubagentStop Capture

The `subagent-telemetry` hook captures per-step cost/latency signals so
`optimizing-a-pipeline` can ground its **past-run signals** axis (token/latency/
context hotspots) instead of analyzing topology statically.

## Why it is opt-in (and a hook, not the model)

The orchestrator model **cannot see** per-subagent token counts — they are not
exposed to it at runtime (Anthropic `claude-code` issues
[#21837](https://github.com/anthropics/claude-code/issues/21837),
[#22625](https://github.com/anthropics/claude-code/issues/22625)). The only
reliable capture path is a `SubagentStop` hook reading
`~/.claude/agent-metrics.jsonl` out-of-band.

It ships **disabled**: it is NOT registered in `hooks/hooks.json`. The plugin
never auto-edits user settings. `optimizing-a-pipeline` degrades gracefully when
the log is absent:

- **no run dirs** → topology + model-tier axes only ("analysis is static").
- **state files, no telemetry** → adds escalation / failure / loop-cap signals.
- **full telemetry** → adds token / latency / context-size hotspots.

## What it captures

One JSON line per subagent completion, appended to
`<run-dir>/run-telemetry.jsonl` (BOM-free):

```json
{ "ts": "...", "step_id": "...", "agent": "...", "model": "...",
  "input_tok": 0, "output_tok": 0, "cache_read": 0, "cache_creation": 0,
  "ctx_size": 0, "duration_ms": 0, "status": "DONE" }
```

`ctx_size` ≈ cumulative transcript tokens at the step boundary. Fields that
cannot be derived are written as `null` — the hook **never fabricates** metrics
and **never fails the run** (any error → writes nothing, exits 0).

## How to enable

1. Turn on enhanced telemetry so `~/.claude/agent-metrics.jsonl` is populated:

   ```
   CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1
   ```

2. Register the `SubagentStop` hook in your settings (`~/.claude/settings.json`
   or a project `.claude/settings.json`):

   ```json
   {
     "hooks": {
       "SubagentStop": [
         {
           "hooks": [
             {
               "type": "command",
               "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" subagent-telemetry",
               "async": false
             }
           ]
         }
       ]
     }
   }
   ```

The hook locates the active run via the `SUPERPIPELINES_RUN_DIR` environment
variable (set by the running pipeline). Outside a pipeline run it is a silent
no-op.
