# Fixture CAD-contradictions — VIOLATIONS: one failing canonical def per CAD rule

Each section is a canonical agent-def that violates exactly one CAD criterion and must produce
the cited finding. Collectively they exercise CAD-01..CAD-05. Pair with
`cad-00-valid-canonical-def.md` (the passing baseline).

---

## CAD-01 — `tool_hints.allow` exceeds `capabilities`

**Expected finding:** SEV-1 — `tool_hints.allow` grants `Write`, a tool the `write_files: false`
intent denies. The advisory allow-list silently widens the security boundary at materialization.

```yaml
---
schema_version: "1.0"
name: spec-reviewer
role: reviewer
review_stage: 1
model_tier: medium
turn_budget: 15
capabilities: { write_files: false, run_shell: false, network: false, edit_tracked_source: false }
tool_hints: { allow: [Read, Glob, Write] }   # ← Write denied by write_files:false
isolation_required: false
io_contract: { inputs: [], outputs: [{ key: verdict, path: review/verdict.md, kind: file }] }
status_protocol: standard
plugin_version: "2.2.3"
---
```

**Detection:** denied class from `write_files: false` ⇒ {Write, Edit}. `tool_hints.allow`
contains `Write` ∈ denied class ⇒ FAIL. **Remediation:** drop `Write` from `tool_hints.allow`.

---

## CAD-02 — `isolation_required` without `edit_tracked_source`

**Expected finding:** SEV-1 — `isolation_required: true` on a def whose
`edit_tracked_source: false`. Writer isolation requested for a non-writer (a reviewer here);
unnecessary worktree overhead plus auto-teardown data-loss risk.

```yaml
---
schema_version: "1.0"
name: quality-reviewer
role: reviewer
review_stage: 2
model_tier: deep
turn_budget: 15
capabilities: { write_files: false, run_shell: false, network: false, edit_tracked_source: false }
isolation_required: true   # ← incoherent: no edit_tracked_source
io_contract: { inputs: [], outputs: [{ key: report, path: review/stage2-report.md, kind: file }] }
status_protocol: standard
plugin_version: "2.2.3"
---
```

**Detection:** `isolation_required: true` AND `edit_tracked_source: false` ⇒ FAIL.
**Remediation:** set `isolation_required: false` (or `edit_tracked_source: true` if it truly writes code).

---

## CAD-03 — non-relative `io_contract` path

**Expected finding:** SEV-1 — an `io_contract.outputs[].path` is scope-root-prefixed
(`.claude/…`), breaking copy-paste portability.

```yaml
---
schema_version: "1.0"
name: analyzer
role: analyzer
review_stage: null
model_tier: fast
turn_budget: 20
capabilities: { write_files: true, run_shell: false, network: false, edit_tracked_source: false }
isolation_required: false
io_contract:
  inputs: []
  outputs:
    - { key: findings, path: .claude/superpipelines/findings.json, kind: file }   # ← scope-root prefix
status_protocol: standard
plugin_version: "2.2.3"
---
```

**Detection:** `path` begins with a known scope-root name (`.claude/`) ⇒ FAIL. Also trips on a
leading `/`, a drive letter, or a `..` segment. **Remediation:** rewrite relative to the run
dir, e.g. `findings.json`; the orchestrator resolves it via `sk-pipeline-paths`.

---

## CAD-04 — missing version stamps

**Expected finding:** SEV-2 — the def declares neither `schema_version` nor `plugin_version`;
it cannot be schema- or retro-compatibility-checked.

```yaml
---
name: reporter
role: worker
review_stage: null
model_tier: fast
turn_budget: 20
capabilities: { write_files: true, run_shell: false, network: false, edit_tracked_source: false }
isolation_required: false
io_contract: { inputs: [], outputs: [{ key: report, path: report.md, kind: file }] }
status_protocol: standard
---
# ↑ no schema_version, no plugin_version
```

**Detection:** `grep -L "^schema_version:"` and `grep -L "^plugin_version:"` both match this
file ⇒ FAIL. **Remediation:** add `schema_version: "1.0"` and `plugin_version: "2.2.3"`.

---

## CAD-05 — writing reviewer

**Expected finding:** SEV-2 — `role: reviewer` with `capabilities.write_files: true`. A reviewer
that can edit the artifact it reviews breaks the write/review isolation boundary.

```yaml
---
schema_version: "1.0"
name: spec-reviewer
role: reviewer
review_stage: 1
model_tier: medium
turn_budget: 15
capabilities: { write_files: true, run_shell: false, network: false, edit_tracked_source: true }
isolation_required: true
io_contract: { inputs: [], outputs: [{ key: verdict, path: review/verdict.md, kind: file }] }
status_protocol: standard
plugin_version: "2.2.3"
---
```

**Detection:** `role: reviewer` AND `capabilities.write_files: true` ⇒ FAIL. **Remediation:** set
`write_files: false` (and `edit_tracked_source: false`, `isolation_required: false`), OR change
`role` to a writer role such as `fixer` if writing is intended.
