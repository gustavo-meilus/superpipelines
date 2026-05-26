---
name: sk-pipeline-state
description: Use when reading or writing pipeline-state.json, resuming an interrupted pipeline, or detecting a crashed run — defines the schema, recovery rules, and atomic-write pattern. Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# Pipeline State — Persistence & Recovery

> Defines the schema, storage layout, and recovery protocols for pipeline execution state. Trigger when reading or writing `pipeline-state.json`, resuming an interrupted run, or diagnosing a crashed orchestrator.

<overview>
Superpipelines utilize a structured JSON state to manage the lifecycle of multi-agent workflows. This state is isolated from model behavior, ensuring that runs are inspectable, resumable, and resilient to environment restarts. All state transitions must follow an atomic write pattern to prevent corruption.
</overview>

<glossary>
  <term name="Pipeline State">A structured JSON file (`pipeline-state.json`) representing the source of truth for a specific run.</term>
  <term name="Atomic Write">The process of writing to a temporary file and renaming it to ensure file integrity.</term>
  <term name="Run ID">A UUID v4 uniquely identifying a single execution instance of a pipeline.</term>
  <term name="source_tier">The execution tier where the pipeline was scaffolded. Set once at run init; never updated.</term>
  <term name="runtime_tier">The execution tier of the current or most-recent run. Re-detected on every resume; updated on cross-tier resume.</term>
  <term name="tier_changes">Append-only audit log of every cross-tier resume event. Never overwritten.</term>
</glossary>

## State Location

<invariant>
State must be persisted to `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`. Never store state within `${CLAUDE_PLUGIN_ROOT}`, as it is not persistent across updates.
</invariant>

## Schema Definition

<schema>
```json
{
  "pipeline_id": "<uuid>",
  "pipeline_name": "<P>",
  "plugin_version": "<semver — copied at run start from platform_profile.extensions.version_manifest_path (per-tier; see Q12)>",
  "scope_root_dir": "<directory NAME from platform_profile.scope_root.workspace, e.g. '.claude' or '.superpipelines' — NOT an absolute path (Q12 portability fix)>",
  "run_id": "<uuid>",
  "started_at": "<iso8601>",
  "pattern": "1 | 2 | 2b | 3 | 4 | 5",
  "status": "running | completed | escalated | failed",
  "current_phase": <index>,
  "phases": [
    {
      "index": 0,
      "name": "<phase name>",
      "status": "pending | running | done | failed",
      "agent": "<agent name>",
      "outputs": ["<path>"],
      "error": null
    }
  ],
  "metadata": {
    "source_tier": "<tier_id — tier where pipeline was scaffolded; immutable after init>",
    "runtime_tier": "<tier_id — tier where current execution runs; re-detected on every resume>",
    "platform_profile": "<full profile object snapshot — updated when runtime_tier changes>",
    "tier_changes": [
      { "from": "<tier_id>", "to": "<tier_id>", "at": "<iso8601>" }
    ],
    "source_scope_root": "<original workspace scope root directory name, e.g. .claude>",
    "isolation_warning": "<joined degradation_warnings from active profile; null if none>",
    "resolved_models": {
      "<step_id>": "<resolved object from sk-model-resolver — model, effort, source, warnings>"
    },
    "preference_files_consulted": {
      "user_path":       "<absolute or ~-prefixed path to user-global prefs>",
      "user_hash":       "<sha256:hex digest of user prefs file content at Phase 0.4; null if file absent>",
      "workspace_path":  "<absolute path to workspace prefs>",
      "workspace_hash":  "<sha256:hex digest of workspace prefs file content at Phase 0.4; null if file absent>"
    },
    "model_tiers_version_at_run": "<profile.model_tiers_version at Phase 0.4; ISO date>"
  }
}
```
</schema>

## Atomic Write Protocol

<protocol>
To prevent JSON corruption during concurrent operations or crashes, always use the following atomic write pattern:
1. Write the new state content to `pipeline-state.json.tmp`.
2. Move (rename) the temporary file to `pipeline-state.json`.

### Encoding invariant (Q12)

State file MUST be **UTF-8 without BOM**. The byte at offset 0 MUST be `0x7B` (the `{` character that opens a JSON object), NOT `0xEF` (the first byte of the UTF-8 BOM sequence `EF BB BF`). Every implementation below guarantees this. A state file beginning with a BOM is unparseable by `JSON.parse` in Claude Code and produces a `Parse Error` → `Corruption detected. Escalate to human` recovery action. The protocol is shell-specific because naïve ports introduce BOMs silently.

### Per-shell implementations

**Bash / zsh:**
```bash
TEMP_DIR="${SCOPE_ROOT}/superpipelines/temp/${PIPELINE_NAME}/${RUN_ID}"
mkdir -p "$TEMP_DIR"
# printf (not echo) — echo's newline behavior varies by shell and locale.
printf '%s' "$NEW_STATE_JSON" > "${TEMP_DIR}/pipeline-state.json.tmp"
mv "${TEMP_DIR}/pipeline-state.json.tmp" "${TEMP_DIR}/pipeline-state.json"
```

**PowerShell (Windows):**
```powershell
$TempDir = "$ScopeRoot/superpipelines/temp/$PipelineName/$RunId"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
# The $false constructor argument disables BOM. Never use `Set-Content -Encoding UTF8` —
# in Windows PowerShell 5.1 that variant emits a BOM that breaks JSON.parse downstream.
[System.IO.File]::WriteAllText("$TempDir/pipeline-state.json.tmp", $NewStateJson, [System.Text.UTF8Encoding]::new($false))
Move-Item -Force "$TempDir/pipeline-state.json.tmp" "$TempDir/pipeline-state.json"
```

**Node.js:**
```js
const fs = require('node:fs');
const path = require('node:path');
const tempDir = path.join(scopeRoot, 'superpipelines', 'temp', pipelineName, runId);
fs.mkdirSync(tempDir, { recursive: true });
// Node's 'utf8' encoding has no BOM by default.
fs.writeFileSync(path.join(tempDir, 'pipeline-state.json.tmp'), newStateJson, { encoding: 'utf8' });
fs.renameSync(path.join(tempDir, 'pipeline-state.json.tmp'), path.join(tempDir, 'pipeline-state.json'));
```

### Byte-0 verification

A correct implementation can be verified by checking the first byte of the written file:

```bash
# Expect: 0x7B (the '{' character). Any other byte (especially 0xEF) is a defect.
od -An -tx1 -N1 pipeline-state.json
```
</protocol>

## Recovery & Resumption Rules

<recovery_rules>
| State Found | Required Action |
| :--- | :--- |
| **`status: running`** (<1h old) | Active run detected; refuse to start a new instance. |
| **`status: running`** (>1h old) | Treat as crashed. Prompt user to resume, restart, or abort. |
| **`status: completed`** | Terminal state reached. Skip or archive. |
| **`status: escalated/failed`** | Stop execution. Surface to human for manual intervention. |
| **Parse Error** | Corruption detected. Escalate to human; do NOT auto-resume. |
</recovery_rules>

<invariants>
- **No Model Coupling**: Never use the model's native memory tool for pipeline state management; use structured JSON.
- **Atomic Renaming**: Direct writes to `pipeline-state.json` are forbidden.
- **Explicit Resumption**: NEVER auto-resume from an `escalated` or `failed` state without explicit user confirmation.
- **Backward Compatibility**: Pre-v2.0.0 state files carry `metadata.tier` (single field). On resume of an old state file: treat `metadata.tier` as `source_tier` when `metadata.source_tier` is absent; set `runtime_tier` to the re-detected current tier. New state writes MUST use `source_tier` and `runtime_tier`; never write `metadata.tier` in new state.
- **Version Stamping (Q12)**: `plugin_version` MUST be set at state initialization by reading the `version` field from the per-tier manifest at `platform_profile.extensions.version_manifest_path`. The Tier 1 manifest is `.claude-plugin/plugin.json`; other tiers point to their own manifest (Codex `.codex-plugin/plugin.json`, Cursor `.cursor-plugin/plugin.json`, OpenCode `opencode-plugin.json`, Antigravity `gemini-extension.json` until retirement). It is read-only after init and used by `running-a-pipeline` for compatibility advisory.
- **Portable scope_root (Q12)**: State files store `scope_root_dir` (the directory NAME like `.claude`) instead of the previous absolute path. On resume, the active scope_root absolute path is recomputed from the state file's own location: `scope_root = dirname^4(state_file_path)`. This survives workspace moves between machines, between WSL and native Windows, and between drives. The stored `scope_root_dir` is a sanity check — if `basename(dirname^4(state_file_path)) != scope_root_dir`, the state file has been moved out of a recognized scope and resume MUST surface the inconsistency.
</invariants>

## Reference Files

- `sk-pipeline-paths/SKILL.md` — Scope root resolution.
- `sk-pipeline-patterns/SKILL.md` — Execution pattern definitions.
- `running-a-pipeline/SKILL.md` — Primary orchestrator workflow.
