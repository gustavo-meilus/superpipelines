# Fixture — Data-agent worktree artifact loss (#23/#24 → Fix 11)

Discriminating fixture for the worktree-artifact-loss criteria and the Phase 0.7
tripwire. Mirrors the real `lectio-divina` v2.0.0 defect. The load-bearing
discriminator is the topology `outputs` path + host-anchor — NOT `tools`.

## PRE-baseline (must FAIL #23 SEV-0 and #24 SEV-1; Phase 0.7 MUST trip)

Agent file `agents/superpipelines/demo/researcher.md` frontmatter:
```yaml
---
name: researcher
plugin_version: "2.0.0"
permissionMode: acceptEdits
isolation: worktree
tools: Read, WebFetch, WebSearch, Write
skills:
  - researcher-protocol
---
```
Topology step:
```json
{ "id": "researcher", "agent": "researcher", "depends_on": [],
  "inputs": [], "outputs": ["superpipelines/temp/{P}/{runId}/00-readings.md"] }
```
Why it trips: `isolation: worktree` AND every output resolves under
`superpipelines/temp/` AND no host-anchor note → criterion #24 / #23 FAIL; Phase
0.7 (armed because 2.0.0 < installed) appends this agent to `tripped`. Note the
agent DOES include `Write` in `tools` — proving the `tools` check is not the
discriminator; the topology-outputs path is.

## POST-baseline (must PASS; Phase 0.7 MUST NOT trip)

Same agent after Fix 11:
```yaml
---
name: researcher
plugin_version: "2.1.2"
permissionMode: acceptEdits
tools: Read, WebFetch, WebSearch, Write
skills:
  - researcher-protocol
---
```
Pipeline-level `plugin_version` in topology.json and registry bumped to `2.1.2`.
Why it passes: `isolation: worktree` removed → #23/#24 PASS; pipeline version no
longer < installed → Phase 0.7 arming condition false → skipped silently.

## Negative control (legitimate code-writer — MUST NOT trip)

Agent `task-executor.md` with `isolation: worktree` AND `tools: Read, Write, Edit`
whose topology outputs include tracked source paths (NOT all under
`superpipelines/temp/`). The detection MUST NOT flag this agent — at least one
output is a tracked path, so worktree isolation is correct. (A second valid
non-trip shape: all-temp outputs BUT a host-anchor note present.)
