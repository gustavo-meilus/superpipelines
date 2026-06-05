# Read-First Dispatch Load Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `/run-pipeline` from emitting the fatal `disable-model-invocation` error by replacing the guaranteed-fail `Skill(sk-platform-dispatch)` load in Phase 0.25 with a deterministic Read-first load.

**Architecture:** Edit only `skills/running-a-pipeline/SKILL.md` Phase 0.25 (Steps 1–2 and its probe table). Remove the doomed `Skill()`/`activate_skill()` load attempt and the `catch DisableModelInvocation` branch; read the dispatch skill body directly and run `DETECT()` inline. Keep the Task-tool probe, `INLINE-DETECT()` plugin-absent fallback, and `sk-platform-dispatch`'s `disable-model-invocation: true` flag unchanged.

**Tech Stack:** Markdown skill authoring. No build/test framework — verification is `grep`/`Read` over the edited file. `plugin_version` stamping convention applies to artifacts, not skill bodies.

**Spec:** `docs/superpowers/specs/2026-06-05-dispatch-load-read-first-design.md`

---

### Task 1: Rewrite the Phase 0.25 probe table (Step 1)

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md:51-58`

- [ ] **Step 1: Read the current section to confirm anchors**

Run: `Read skills/running-a-pipeline/SKILL.md offset 49 limit 36`
Expected: see Step 1 table (rows for `Skill` tool, `activate_skill`, lookup-fail, neither) and Step 2 try/catch block.

- [ ] **Step 2: Replace the probe table**

The current table routes to `Skill(...)` / `activate_skill(...)` loads. Replace rows 53-58 so detection is driven by file-read availability, not skill-tool load. New text:

```markdown
**Step 1 — Locate the dispatch skill.** The dispatch profile is obtained by reading the
`sk-platform-dispatch` skill body directly, never by invoking it through the skill-load tool —
`sk-platform-dispatch` declares `disable-model-invocation: true`, so a `Skill()` /
`activate_skill()` load is guaranteed to be rejected. The probe distinguishes three observable
conditions:

| Condition | Action |
|---|---|
| File-read tool present and `skills/sk-platform-dispatch/SKILL.md` readable | `Read` the file → execute `DETECT()` from its body (includes the Task-tool probe). |
| File-read tool present, dispatch skill file NOT readable (plugin not installed in this env) | Emit "plugin not registered in this env" advisory; fall through to `INLINE-DETECT()`. |
| No file-read tool available | Emit advisory; run `INLINE-DETECT()`. |
```

- [ ] **Step 3: Verify no skill-load load-call remains in the table**

Run: `grep -nE "Skill\(superpipelines:sk-platform-dispatch\)|activate_skill\(sk-platform-dispatch\)" skills/running-a-pipeline/SKILL.md`
Expected: zero matches in the Step 1 table region (lines ~51-60). (A match may still exist in the Step 2 block until Task 2 — that is fine for now.)

- [ ] **Step 4: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "$(cat <<'EOF'
fix(running-a-pipeline): Phase 0.25 probe table → Read-first dispatch locate

Drop skill-load routing for sk-platform-dispatch (guaranteed-fail on
disable-model-invocation); drive detection by file-read availability.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Replace the Step 2 try/catch load with Read-first

**Files:**
- Modify: `skills/running-a-pipeline/SKILL.md:60-80`

- [ ] **Step 1: Replace the Step 2 "Skill tool available" block**

Replace the `try/catch` pseudocode block (current lines 62-80, the bullet beginning "**Skill tool available**" through "On success (any path): cache...") with:

```markdown
- **File-read tool available**: Read the dispatch skill body and execute `DETECT()` inline.
  No `Skill()` / `activate_skill()` load is attempted — the flag makes it a guaranteed failure.

  ```
  try:
    Read(skills/sk-platform-dispatch/SKILL.md)
    profile = execute_DETECT_from_skill_body()  // Task tool present → tier_1; etc.
  catch FileNotFound | unreadable:
    // Plugin not registered in this environment — the skill file is not on disk.
    emit advisory: "⚠️ Dispatch skill file not found — superpipelines plugin may not be
    registered in this environment. Falling back to INLINE-DETECT()."
    profile = INLINE-DETECT()
  ```

  Executing `DETECT()` from the body preserves the **Task-tool probe**, which correctly
  identifies `tier_1` regardless of whether the `CLAUDE_CODE` env var is set. NEVER skip the
  Read and go straight to `INLINE-DETECT()` when the file IS readable — `INLINE-DETECT()` lacks
  the Task-tool probe and will misidentify `tier_1` as `tier_1c` on any machine where `agy` is
  installed and `CLAUDE_CODE` is absent.

  On success (any path): cache `platform_profile` in session context. Proceed normally.
```

(Leave the subsequent "**No skill tool available**" bullet and `INLINE-DETECT() heuristics` section unchanged — relabel the bullet to "**No file-read tool available**" for consistency.)

- [ ] **Step 2: Relabel the no-tool bullet**

In the bullet at (former) line 81, change `**No skill tool available**` to `**No file-read tool available**`. Leave its advisory text and the INLINE-DETECT heuristics intact.

- [ ] **Step 3: Verify the catch and load call are gone**

Run: `grep -nE "catch DisableModelInvocation|Skill\(superpipelines:sk-platform-dispatch\)\.DETECT|activate_skill\(\.\.\.\)" skills/running-a-pipeline/SKILL.md`
Expected: zero matches.

- [ ] **Step 4: Verify Read-first and Task-probe preservation survive**

Run: `grep -nE "Read\(skills/sk-platform-dispatch/SKILL.md\)|Task-tool probe|INLINE-DETECT" skills/running-a-pipeline/SKILL.md`
Expected: `Read(...)` present, `Task-tool probe` present, `INLINE-DETECT` still present (fallback intact).

- [ ] **Step 5: Commit**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "$(cat <<'EOF'
fix(running-a-pipeline): Read-first dispatch load, drop catch-on-guaranteed-fail

Replace the Skill()-then-catch-DisableModelInvocation dance with a
deterministic Read of the sk-platform-dispatch body + inline DETECT().
Preserves Task-tool probe and INLINE-DETECT plugin-absent fallback;
sk-platform-dispatch flag unchanged.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Full-file consistency sweep + audit

**Files:**
- Read: `skills/running-a-pipeline/SKILL.md`

- [ ] **Step 1: Confirm no dangling references to the removed mechanism**

Run: `grep -nE "DisableModelInvocation|Skill tool available|SkillNotFound" skills/running-a-pipeline/SKILL.md`
Expected: zero matches for `DisableModelInvocation` and `Skill tool available`. (`SkillNotFound` should also be gone — it was part of the deleted catch ladder; if it remains in another genuine context, leave it.)

- [ ] **Step 2: Confirm sk-platform-dispatch frontmatter untouched**

Run: `Read skills/sk-platform-dispatch/SKILL.md limit 6`
Expected: `disable-model-invocation: true` and `user-invocable: false` still present (this change must NOT touch them).

- [ ] **Step 3: Run the pipeline auditor on running-a-pipeline**

Invoke: `Skill superpipelines:audit-steps` (or `/superpipelines:audit-steps`) targeting the framework skill change.
Expected: no new SEV-0/SEV-1 introduced by this edit. Record the report.

- [ ] **Step 4: Manual smoke check**

Re-read the edited Phase 0.25 end-to-end (Read offset ~48 limit ~40). Confirm the flow reads coherently: locate → Read-first DETECT → FileNotFound fallback → no-tool fallback. No orphaned "try"/"catch" without a body.

- [ ] **Step 5: Commit any sweep fixes (if needed)**

```bash
git add skills/running-a-pipeline/SKILL.md
git commit -m "$(cat <<'EOF'
chore(running-a-pipeline): consistency sweep after Read-first dispatch load

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

(If Step 1/4 found nothing to fix, skip this commit.)

---

## Self-Review

**Spec coverage:**
- Remove `Skill()`/`activate_skill()` attempt → Task 1 (table) + Task 2 (Step 2 block). ✔
- Remove `catch DisableModelInvocation` → Task 2 Step 1/3. ✔
- Rewrite probe-table rows → Task 1. ✔
- Preserve Task-tool probe → Task 2 Step 1/4. ✔
- Preserve `INLINE-DETECT()` plugin-absent fallback → Task 2 Step 2/4. ✔
- `sk-platform-dispatch` frontmatter unchanged → Task 3 Step 2. ✔
- Verification (no leftover refs; tier resolves via probe) → Task 3 Step 1–4. ✔
- Out-of-scope siblings left alone → no task touches them. ✔

**Placeholder scan:** No TBD/TODO; every edit step shows the literal replacement markdown. ✔

**Type/name consistency:** `DETECT()`, `execute_DETECT_from_skill_body()`, `INLINE-DETECT()`, `platform_profile`, `tier_1`/`tier_1c` used identically to the existing skill body. ✔
