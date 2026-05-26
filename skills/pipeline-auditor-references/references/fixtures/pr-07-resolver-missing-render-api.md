# Fixture PR-07 — VIOLATION: resolver SKILL.md missing RENDER_RESOLUTION_TABLE in public API

**Expected finding:** SEV-2 — `sk-model-resolver/SKILL.md` does not declare
`RENDER_RESOLUTION_TABLE(resolved[]) → string` as a public API operation.

---

## Simulated bad sk-model-resolver/SKILL.md public API section

```markdown
## Public API

- `RESOLVE(agent_frontmatter, profile, prefs) → resolved`
- `LOAD_PREFS(workspace_root) → { user, workspace }`
- `EMIT(resolved, target_format) → string`
- `REVERSE_MAP(concrete_model, profile) → tier | null`
- `DETECT_CATALOG_DRIFT(prefs, profile) → { drifted, message }`
```

**Violation**: `RENDER_RESOLUTION_TABLE` is absent. Phase 0.4 calls it; if it is not
declared here, the resolver's interface contract is incomplete. Callers cannot know
the operation exists or what it returns without reading the implementation. This
violates deep-module principles: the interface should be the complete contract.

---

## Compliant public API section

```markdown
## Public API

- `RESOLVE(agent_frontmatter, profile, prefs) → resolved`
- `LOAD_PREFS(workspace_root) → { user, workspace }`
- `EMIT(resolved, target_format) → string`
- `RENDER_RESOLUTION_TABLE(resolved[]) → string`
- `REVERSE_MAP(concrete_model, profile) → tier | null`
- `DETECT_CATALOG_DRIFT(prefs, profile) → { drifted, message }`
```

---

## Detection

```bash
grep -n "RENDER_RESOLUTION_TABLE" skills/sk-model-resolver/SKILL.md
```

Empty result = PR-07 violation. The match must appear in the Public API section,
not only in a comment or a downstream skill.
