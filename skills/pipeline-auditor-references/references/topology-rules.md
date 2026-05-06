# Topology Rules — Auditor Reference

Graph-level checks applied by `pipeline-auditor` on `topology.json` and the surrounding file bundle.
These are distinct from the 20-criterion compliance matrix and are run in addition to it.

## Table of contents

1. Schema check
2. Agent coverage
3. Edge consistency
4. Cycle rules
5. Entry-skill contract
6. Registry consistency

---

## 1. Schema check

`topology.json` must be valid, parseable JSON containing all required fields:

```json
{
  "pipeline": "<name>",
  "version": "1.0",
  "pattern": "<1|2|2b|3|4|5>",
  "steps": [
    {
      "id": "<step-id>",
      "name": "<human-readable name>",
      "agent": "<agent-name or null>",
      "skill": "<skill-relative-path or null>",
      "inputs": ["<step-id-ref or literal-description>"],
      "outputs": ["<step-id-ref or literal-description>"],
      "parallel_group": "<group-id or null>",
      "depends_on": ["<step-id>"]
    }
  ],
  "entry_skill": "run-{P}"
}
```

**FAIL criteria:** JSON parse error; missing required top-level key (`pipeline`, `version`, `pattern`, `steps`, `entry_skill`); invalid `pattern` value; any step missing `id`, `depends_on`, `inputs`, or `outputs`.

---

## 2. Agent coverage

For every step where `step.agent` is non-null:

- A file must exist at `agents/superpipelines/{P}/{step.agent}.md`.
- The agent file's `name` frontmatter field must match `step.agent` exactly.

**FAIL:** Agent file missing, or `name` frontmatter does not match the `agent` field value.

---

## 3. Edge consistency

For every step S:

- Every entry in `S.depends_on` must reference a valid `id` in the same `steps` array.
- Every step must be reachable via `depends_on` chains from at least one entry point (no orphan steps).
- When input/output schemas are declared as structured objects (not bare strings), the producer's declared output type must match the consumer's declared input type.

**FAIL:** Dangling `depends_on` reference; orphan step (no path from any predecessor leads to it); input-output type mismatch on typed edges.

---

## 4. Cycle rules

- **Non-iterative patterns (1, 2, 2b, 4, 5):** The dependency graph must be acyclic (valid DAG). Any cycle is SEV-0.
  - Check via topological sort. If topo-sort fails → SEV-0.
- **Iterative pattern (3):** Exactly ONE back-edge is expected (the loop-back from the fixer to the tester/entry). More than one back-edge is SEV-1 (unintended additional cycle).

---

## 5. Entry-skill contract

- `topology.json["entry_skill"]` must equal `run-{P}` (where `{P}` is the pipeline name).
- The corresponding SKILL.md must exist at `skills/superpipelines/{P}/run-{P}/SKILL.md`.
- That SKILL.md frontmatter must contain:
  - `disable-model-invocation: true`
  - `user-invocable: true`
- **All other** skills under `skills/superpipelines/{P}/` must have `user-invocable: false`.

**FAIL:** Entry skill path mismatch; missing `disable-model-invocation` or `user-invocable` on entry skill; internal step skill missing `user-invocable: false`.

---

## 6. Registry consistency

- `registry.json` (in the appropriate scope root) must contain an entry for this pipeline.
- `registry.json[].agents` must list exactly the agent files present on disk under `agents/superpipelines/{P}/`.
- `registry.json[].skills` must list exactly the skill directories present on disk under `skills/superpipelines/{P}/`.
- `registry.json[].topology_path` must resolve to a readable `topology.json`.

**FAIL:** Registry missing entry; agent or skill list out of sync with disk; `topology_path` not resolvable.

---

## Severity mapping

| Rule violated | Severity |
|---------------|----------|
| Invalid or unparseable `topology.json` schema | SEV-0 |
| Agent file missing for a step | SEV-0 |
| Orphan step (unreachable) | SEV-0 |
| Cycle in non-iterative pattern | SEV-0 |
| Dangling `depends_on` id | SEV-0 |
| Entry skill file missing | SEV-0 |
| Entry skill missing `disable-model-invocation: true` | SEV-0 |
| Input-output type mismatch on typed edge | SEV-1 |
| Extra back-edge in pattern-3 topology | SEV-1 |
| Registry agent/skill list stale (out of sync with disk) | SEV-1 |
| Internal step skill missing `user-invocable: false` | SEV-2 |
| Entry skill missing `user-invocable: true` | SEV-2 |
| Registry `last_audit` null or >7 days old | SEV-3 |
