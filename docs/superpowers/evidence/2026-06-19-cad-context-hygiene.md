# CAD Context Hygiene Evidence

## Compatibility Matrix

| Surface | Skill path source | `disable-model-invocation` | `user-invocable` | Implementation decision |
|---|---|---|---|---|
| Claude Code | `skills/*/SKILL.md`, `.claude-plugin` conventions | Recognized by existing bundle docs and skills | Recognized by existing bundle docs and skills | Safe to use on bundle skills; do not apply to CADs |
| Codex plugin | `plugins/superpipelines/skills/*/SKILL.md` mirrored from `skills/` | Present in installed skill metadata; prior spec notes show it can block Skill-tool loading | Present in current skill metadata but treated as metadata by packaging | Safe for loader/internal skills already using it; use conservatively for command skills |
| Cursor / Windsurf / Cline fallback | `.superpipelines` data-only runtime plus skill markdown | Not guaranteed as an enforcement primitive | Not guaranteed as an enforcement primitive | Treat as advisory metadata; description cleanup is the portable behavior |
| OpenCode | `.agents/skills` / plugin mirrored skills | Not verified as strict enforcement in this repo | Not verified as strict enforcement in this repo | Treat as advisory unless existing skill already depends on it |
| Universal data-only CAD | `DATA_ROOT/pipelines/{P}/agents/*.md` | Not part of CAD schema | Not part of CAD schema | Never add skill invocation fields to CAD frontmatter |

## Baseline Description Lengths

Command to refresh:

```powershell
Get-ChildItem skills -Recurse -Filter SKILL.md | ForEach-Object {
  $content = Get-Content -Raw $_.FullName
  if ($content -match '(?ms)^---\s*(.*?)\s*---') {
    $frontmatter = $Matches[1]
    $description = ($frontmatter -split "`n" | Where-Object { $_ -match '^description:' }) -join "`n"
    [pscustomobject]@{ Path = (Resolve-Path -Relative $_.FullName); DescriptionChars = $description.Length; Description = $description }
  }
} | Sort-Object Path | Format-Table -AutoSize
```

## Baseline Stale Phrase Hits

Command to refresh:

```powershell
rg -n "zero-body|companion protocol|-protocol skill|agents/superpipelines|skills/superpipelines" skills docs plugins/superpipelines/skills
```

## Expected Invocation Checks

| Skill | Expected prompt | Should route? | Result after implementation |
|---|---|---:|---|
| `using-superpipelines` | "Which Superpipelines command handles adding a step?" | yes | Record the observed route after Task 2 |
| `creating-a-pipeline` | "/superpipelines:new-pipeline" | yes | Record the observed route after Task 2 |
| `running-a-pipeline` | "run the release-review pipeline" | yes | Record the observed route after Task 2 |

## False Positive Checks

| Prompt | Should not auto-route to | Result after implementation |
|---|---|---|
| "Explain what a pipeline is" | `creating-a-pipeline` | Record whether the router keeps this as direct Q&A after Task 2 |
| "Review this single file" | `creating-a-pipeline` | Record whether the router avoids pipeline creation after Task 2 |
| "Change the app model class" | `change-models` | Record whether model-change routing remains pipeline-specific after Task 2 |

## Baseline Summary

- Baseline package check: `node scripts/package-codex-plugin.js --check` passed with `codex package ok: 38 skill files`.
- Longest workflow descriptions before cleanup included `migrating-a-pipeline` (514 chars), `change-models` (506 chars), `optimizing-a-pipeline` (410 chars), `using-superpipelines` (298 chars), and `creating-a-pipeline` (280 chars).
- Loader-facing protocol descriptions before cleanup included workflow/process summaries in `pipeline-spec-reviewer-protocol`, `pipeline-quality-reviewer-protocol`, `pipeline-auditor-protocol`, `skill-architect-protocol`, and related protocol skills.
- Stale active-path hits before cleanup appeared in architect/auditor references such as `agent-frontmatter-schema.md`, `anti-patterns.md`, `fix-templates.md`, and `topology-rules.md`, plus packaged mirrors.
- Known intentional legacy hit categories: migration fixtures, old-root audit applicability, dispatcher materialization cache paths, previous superpowers specs/plans, and historical docs.

## After Measurements

Fill this section after implementation with the same commands above.

## Executable Hygiene Validation

Record the exact command and concise pass/fail result after the validator is added. The validator scans repo-owned sources, fixtures, and packaged plugin copies only; it does not scan user-created runtime pipelines.
