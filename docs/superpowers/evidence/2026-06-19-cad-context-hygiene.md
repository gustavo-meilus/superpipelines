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
| `using-superpipelines` | "Which Superpipelines command handles adding a step?" | yes | Router table maps add/insert step requests to `adding-a-pipeline-step` |
| `creating-a-pipeline` | "/superpipelines:new-pipeline" | yes | Router table maps `/superpipelines:new-pipeline` to `creating-a-pipeline` |
| `running-a-pipeline` | "run the release-review pipeline" | yes | Router table maps run/execute/resume requests to `running-a-pipeline` |

## False Positive Checks

| Prompt | Should not auto-route to | Result after implementation |
|---|---|---|
| "Explain what a pipeline is" | `creating-a-pipeline` | Router table keeps read-only Q&A as direct file/search answers |
| "Review this single file" | `creating-a-pipeline` | Router table only routes audit/review when the target is a pipeline |
| "Change the app model class" | `change-models` | `change-models` description and router route are pipeline model-tier specific |

## Baseline Summary

- Baseline package check: `node scripts/package-codex-plugin.js --check` passed with `codex package ok: 38 skill files`.
- Longest workflow descriptions before cleanup included `migrating-a-pipeline` (514 chars), `change-models` (506 chars), `optimizing-a-pipeline` (410 chars), `using-superpipelines` (298 chars), and `creating-a-pipeline` (280 chars).
- Loader-facing protocol descriptions before cleanup included workflow/process summaries in `pipeline-spec-reviewer-protocol`, `pipeline-quality-reviewer-protocol`, `pipeline-auditor-protocol`, `skill-architect-protocol`, and related protocol skills.
- Stale active-path hits before cleanup appeared in architect/auditor references such as `agent-frontmatter-schema.md`, `anti-patterns.md`, `fix-templates.md`, and `topology-rules.md`, plus packaged mirrors.
- Known intentional legacy hit categories: migration fixtures, old-root audit applicability, dispatcher materialization cache paths, previous superpowers specs/plans, and historical docs.

## After Measurements

### After Summary

- Description cleanup completed for workflow and loader-facing skills. Long workflow descriptions were reduced, for example `change-models` from 506 to 104 chars, `migrating-a-pipeline` from 514 to 98 chars, `optimizing-a-pipeline` from 410 to 122 chars, `using-superpipelines` from 298 to 123 chars, and `creating-a-pipeline` from 280 to 131 chars.
- Final package sync: `node scripts/package-codex-plugin.js` passed with `cad hygiene ok: 7 CAD files checked; 66 authoring/fixture files scanned` and `codex package ok: 38 skill files`.
- Package mirror check: `node scripts/package-codex-plugin.js --check` passed with the same hygiene result and `codex package ok: 38 skill files`.
- Final stale active-path scan command: `rg -n "Every agent file is zero-body|Move all content to the companion|Place the companion skill|new data-only.*companion|generated.*skills/superpipelines|generated.*agents/superpipelines" skills plugins/superpipelines/skills`.
- Broad stale scan still reports intentional prohibitions, legacy-only schema references, and materialization-cache paths; executable hygiene validation is the pass/fail gate for unlabelled active misuse.
- Final invocation metadata scan confirmed workflow descriptions are concise and loader-facing protocol skills retain `disable-model-invocation: true` and `user-invocable: false`.

## Executable Hygiene Validation

Exact command:

```powershell
node scripts/check-cad-hygiene.js
```

Result: PASS - `cad hygiene ok: 7 CAD files checked; 66 authoring/fixture files scanned`.

Integrated package command:

```powershell
node scripts/package-codex-plugin.js --check
```

Result: PASS - the command runs CAD hygiene validation first, then package manifest/live-agent/mirror checks. It does not scan user-created runtime pipelines under `.superpipelines/`, `.codex/`, `.agents/`, `.claude/`, or home stores.
