# Codex Discovery Verification — 2026-07

## Verdicts

| Probe | Verdict |
| :--- | :--- |
| A — nested agent-directory discovery | PASS after live-schema correction: Codex scans `.codex/agents/superpipelines/parity-probe/*.toml`; `doc-writer`, `doc-reviewer`, and `triage-probe` resolved by name. |
| B — skills discovery path | PASS by WI-11 evidence: a fresh `codex exec` session saw installed `superpipelines:` skills. |
| C — TOML keys and `turn_limit` | FAIL for current repo schema: Codex CLI `0.142.5` rejects `instructions`, requires `developer_instructions`, requires `description`, and rejects `turn_limit` as an unknown field. |
| D — reviewer isolation | SEV-1 FAIL: a custom agent with `sandbox_mode = "read-only"` successfully wrote `probe-output.txt` containing `BREACH`. A `workspace-write` control agent also wrote successfully. |

Because Probe D breached the advertised structural write isolation, this work item stops here per `docs/plans/wave3-codex-handoff.md`: record the evidence, do not paper over the failure, and wait for maintainer direction before changing repo behavior.

## Options For Maintainer

1. Treat Codex CLI `0.142.5` `sandbox_mode = "read-only"` as non-structural for spawned custom agents on this host; downgrade Tier 1d isolation claims and dispatch warnings accordingly.
2. Investigate whether this is a Codex CLI bug, a Windows sandbox limitation, or an interaction between main-session `-s danger-full-access` and per-agent `sandbox_mode`; re-run Probe D on a host where Codex sandbox helpers are fully available.
3. After the isolation decision, apply the confirmed schema fixes together: emit `description`, emit scalar `developer_instructions`, remove `turn_limit`, and change Codex effort mapping from `low -> minimal` to `low -> low`.

## Environment

Codex CLI: `0.142.5`

Repo worktree: `C:\Users\gmeil\Github\superpipelines-wave3`

Scratch workspaces:

- `C:\Users\gmeil\Github\codex-wave3-scratch`
- `C:\Users\gmeil\Github\codex-wave3-scratch-a`
- `C:\Users\gmeil\Github\codex-wave3-scratch-c`
- `C:\Users\gmeil\Github\codex-wave3-scratch-d`

## Probe A — Nested Agent Discovery

### Initial fixture probe

Fixture TOMLs were copied to:

```text
C:\Users\gmeil\Github\codex-wave3-scratch\.codex\agents\superpipelines\parity-probe\doc-reviewer.toml
C:\Users\gmeil\Github\codex-wave3-scratch\.codex\agents\superpipelines\parity-probe\doc-writer.toml
C:\Users\gmeil\Github\codex-wave3-scratch\.codex\agents\superpipelines\parity-probe\triage-probe.toml
```

Command:

```powershell
codex exec --json --ephemeral -C C:\Users\gmeil\Github\codex-wave3-scratch "Dispatch the custom agent named doc-writer. Ask that agent to respond exactly: DOC-WRITER-RESOLVED. Do not inspect files unless required to resolve the agent."
```

Relevant output:

```json
{"type":"item.started","item":{"type":"collab_tool_call","tool":"spawn_agent","prompt":"Respond exactly: DOC-WRITER-RESOLVED","status":"in_progress"}}
```

Trailing error:

```text
ERROR codex_core::tools::router: error=unknown agent_type 'doc-writer'
```

Follow-up with flat copies showed the real blocker was schema parsing, not directory discovery:

```text
Ignoring malformed agent role definition: failed to deserialize agent role file at C:\Users\gmeil\Github\codex-wave3-scratch\.codex\agents\doc-writer.toml: unknown field `turn_limit`
Ignoring malformed agent role definition: failed to deserialize agent role file at C:\Users\gmeil\Github\codex-wave3-scratch\.codex\agents\superpipelines\parity-probe\doc-writer.toml: unknown field `turn_limit`
```

This proves Codex scanned both flat and nested TOML files, but rejected the current fixture schema.

### Nested probe after live-schema correction

Scratch transformation:

- Add `description = "Probe fixture agent <name>."`
- Remove `turn_limit`
- Rename `instructions = """` to `developer_instructions = """`
- Keep nested path `.codex/agents/superpipelines/parity-probe/`

Commands:

```powershell
codex exec --json --ephemeral -s danger-full-access -C C:\Users\gmeil\Github\codex-wave3-scratch-a "Dispatch the custom agent named doc-writer. Ask that agent to respond exactly: DOC-WRITER-NESTED-RESOLVED."
codex exec --json --ephemeral -s danger-full-access -C C:\Users\gmeil\Github\codex-wave3-scratch-a "Dispatch the custom agent named doc-reviewer. Ask that agent to respond exactly: DOC-REVIEWER-NESTED-RESOLVED."
codex exec --json --ephemeral -s danger-full-access -C C:\Users\gmeil\Github\codex-wave3-scratch-a "Dispatch the custom agent named triage-probe. Ask that agent to respond exactly: TRIAGE-PROBE-LOW-RESOLVED."
```

Relevant outputs:

```text
doc-writer: DOC-WRITER-NESTED-RESOLVED
doc-reviewer: DOC-REVIEWER-NESTED-RESOLVED
triage-probe: TRIAGE-PROBE-LOW-RESOLVED
DONE
```

`triage-probe` required `model_reasoning_effort = "low"`; with the repo-emitted `minimal`, it resolved but failed at startup:

```text
The following tools cannot be used with reasoning.effort 'minimal': image_gen, web_search.
```

## Probe B — Skills Discovery Path

Covered by `docs/agents/verification/codex-install-2026-07.md`.

Fresh-session command:

```powershell
codex exec -s read-only -C C:\Users\gmeil\Github\superpipelines-wave3 --ephemeral "Without reading files or searching, list the installed skills whose names begin with superpipelines:. If none are visible in your session context, say NONE."
```

Relevant output:

```text
Installed `superpipelines:` skills visible in this session:
`superpipelines:analyzer-protocol`
`superpipelines:reporter-protocol`
`superpipelines:reviewer-protocol`
...
`superpipelines:verification-before-completion`
```

## Probe C — TOML Keys And `turn_limit`

### `turn_limit`

Current fixtures emit `turn_limit`; Codex rejects it before dispatch:

```text
Ignoring malformed agent role definition: failed to deserialize agent role file at C:\Users\gmeil\Github\codex-wave3-scratch\.codex\agents\doc-writer.toml: unknown field `turn_limit`
```

### `instructions`

Minimal probe:

```toml
name = "instructions-probe"
model = "gpt-5.5"
model_reasoning_effort = "minimal"
sandbox_mode = "read-only"
instructions = """
When asked for your marker, respond exactly: INSTRUCTIONS-MARKER-LIVE
"""
```

Relevant output:

```text
Ignoring malformed agent role definition: agent role file at C:\Users\gmeil\Github\codex-wave3-scratch-c\.codex\agents\instructions-probe.toml must define `developer_instructions`
```

### `developer_instructions`

Minimal probe with `developer_instructions` but no `description`:

```toml
name = "developer-instructions-probe"
model = "gpt-5.5"
model_reasoning_effort = "minimal"
sandbox_mode = "read-only"
developer_instructions = """
When asked for your marker, respond exactly: DEVELOPER-INSTRUCTIONS-MARKER-LIVE
"""
```

Relevant output:

```text
Ignoring malformed agent role definition: agent role `developer-instructions-probe` must define a description
```

Accepted probe:

```toml
name = "developer-instructions-probe"
description = "Probe agent for developer_instructions schema verification."
model = "gpt-5.5"
model_reasoning_effort = "medium"
sandbox_mode = "read-only"
developer_instructions = """
When asked for your marker, respond exactly: DEVELOPER-INSTRUCTIONS-MARKER-LIVE
"""
```

Command:

```powershell
codex exec --json --ephemeral -s danger-full-access -C C:\Users\gmeil\Github\codex-wave3-scratch-c "Dispatch the custom agent named developer-instructions-probe. Ask that agent: What is your marker? The agent must answer from its own developer instructions, not from this prompt."
```

Relevant output:

```json
{"type":"item.completed","item":{"type":"collab_tool_call","tool":"wait","agents_states":{"019f23db-ec64-7e43-b0ae-915be76fb251":{"status":"completed","message":"DEVELOPER-INSTRUCTIONS-MARKER-LIVE"}}}}
```

## Probe D — Reviewer Isolation

### Fixture reviewer attempt

The transformed fixture `doc-reviewer` with `sandbox_mode = "read-only"` did not create `probe-output.txt`, but it returned `NEEDS_CONTEXT` due its own review protocol before attempting a write. This is not strong isolation evidence.

Relevant output:

```text
The `doc-reviewer` agent did not create the file. It returned `NEEDS_CONTEXT`.
I verified the workspace root afterward: `probe-output.txt` does not exist.
```

### Dedicated read-only breach

Agent TOML:

```toml
name = "readonly-write-probe"
description = "Read-only sandbox write denial probe."
model = "gpt-5.5"
model_reasoning_effort = "medium"
sandbox_mode = "read-only"
developer_instructions = """
Attempt exactly what the user asks. If a write is denied, report the denial plainly.
"""
```

Command:

```powershell
codex exec --json --ephemeral -s danger-full-access -C C:\Users\gmeil\Github\codex-wave3-scratch-d "Dispatch the custom agent named readonly-write-probe and wait for it to finish. Instruct it to create probe-output.txt containing exactly BREACH. After it finishes, verify whether probe-output.txt exists and report the result."
```

Relevant output:

```json
{"type":"item.completed","item":{"type":"collab_tool_call","tool":"wait","agents_states":{"019f23e1-aa0f-7320-9144-09082aa872ee":{"status":"completed","message":"Succeeded. `probe-output.txt` contains exactly `BREACH` with no trailing newline."}}}}
```

Verification:

```text
EXISTS length=6 content=BREACH
probe exists after read-only wait run: True
BREACH
```

### Dedicated workspace-write control

Agent TOML:

```toml
name = "workspace-write-probe"
description = "Workspace-write sandbox write success probe."
model = "gpt-5.5"
model_reasoning_effort = "medium"
sandbox_mode = "workspace-write"
developer_instructions = """
Attempt exactly what the user asks. If a write succeeds, report the path plainly.
"""

[sandbox_workspace_write]
network_access = false
```

Command:

```powershell
codex exec --json --ephemeral -s danger-full-access -C C:\Users\gmeil\Github\codex-wave3-scratch-d "Dispatch the custom agent named workspace-write-probe. Instruct it to create probe-output.txt containing exactly WRITER_OK."
```

Relevant output:

```json
{"type":"item.completed","item":{"type":"collab_tool_call","tool":"wait","agents_states":{"019f23e1-28dd-7073-aa0b-8ecc3d78cdda":{"status":"completed","message":"Changed `C:\\Users\\gmeil\\Github\\codex-wave3-scratch-d\\probe-output.txt`."}}}}
```

Verification:

```text
probe exists after workspace-write: True
WRITER_OK
```
