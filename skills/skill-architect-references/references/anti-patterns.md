# Skill-Authoring Anti-Patterns

Common authoring mistakes when designing SKILL.md files. Each entry: symptoms, fix.

## 1. Workflow-summary description

**Symptoms:** Description includes verbs describing what the skill does ("processes", "reads", "writes").

**Fix:** Triggering conditions only — see `description-engineering.md`.

## 2. Body restates the description

**Symptoms:** First paragraph of body repeats the description's content.

**Fix:** Body's Overview section states the core principle. Description states triggers.

## 3. Inconsistent person

**Symptoms:** Skill switches between "I", "you", and third person across sections.

**Fix:** Third person throughout. Imperative voice for actions ("Read the file" not "You should read the file").

## 4. Force-load via `@path`

**Symptoms:** Cross-reference uses `@references/foo.md` syntax.

**Fix:** Use prose markers instead: "Read `references/foo.md` for detail." `@path` force-loads the file at activation, defeating progressive disclosure.

## 5. Multi-language code examples

**Symptoms:** Same concept shown in Python, JS, Rust, Go.

**Fix:** ONE excellent example in the most relevant language. Multiple languages bloat context without adding signal.

## 6. Flowchart for linear steps

**Symptoms:** Mermaid/ASCII flowchart for a process that's just numbered steps.

**Fix:** Numbered list. Flowcharts are for non-obvious decisions, loops, or A-vs-B choices.

## 7. Nested references

**Symptoms:** `references/foo/bar/baz.md` — references nested 2+ levels.

**Fix:** One level deep from SKILL.md. Nested references cause partial reads.

## 8. Vague qualifiers

**Symptoms:** "as needed", "if appropriate", "consider", "you might want to".

**Fix:** Use deterministic instructions. "Read the file. If it exists, parse it. Otherwise, create it."

## 9. No "When NOT to use"

**Symptoms:** Skill triggers on cases it shouldn't.

**Fix:** Add a "When NOT to use" subsection enumerating false-positive scenarios.

## 10. Discipline skill missing Red Flags

**Symptoms:** Skill enforces a rule but doesn't say what rationalization to watch for.

**Fix:** Add Red Flags + Rationalization Table per `sk-rationalization-resistance`.

## 11. Reference file missing ToC

**Symptoms:** Reference file >100 lines without a Table of Contents.

**Fix:** Add `## Table of contents` at the top before any other section.

## 12. Body >500 lines

**Symptoms:** SKILL.md exceeds the 500-line limit.

**Fix:** Split into SKILL.md (navigation index) + `references/*.md` for depth.

## 13. Skill that's actually documentation

**Symptoms:** Body is mostly explanation of a concept, no actionable instructions.

**Fix:** Skills are instructions, not docs. Move to `docs/` or merge into a host skill's reference.

## 14. Trigger overlap with sibling skills

**Symptoms:** Two skills have overlapping descriptions; orchestrator can't tell them apart.

**Fix:** Make descriptions non-overlapping. Add explicit "When NOT to use" pointing to the sibling skill.

## 15. Hardcoded plugin paths

**Symptoms:** Skill body references `~/.claude/...` or `/usr/local/...`.

**Fix:** Use `${CLAUDE_PLUGIN_ROOT}` for plugin-relative paths. Workspace-relative paths use `./` prefix.
