#!/usr/bin/env node
// Executable spec for the CAD → native-agent translators (fix-plan WI-09 / spec GAP-08
// job 5). Implements TRANSLATE_CAD_TO_CC / _OC / _CODEX from sk-platform-dispatch as
// pure textual transforms and diffs their output against the golden fixtures:
//   fixtures/cc-materialize/expected-cc/     (Tier 1,  YAML frontmatter + body)
//   fixtures/oc-materialize/expected-oc/     (Tier 1b, mode: subagent YAML + body)
//   fixtures/codex-materialize/expected-codex/ (Tier 1d, TOML with inline instructions)
// Where this script and the SKILL.md pseudocode disagree, the fixture decides and both
// are corrected together. Zero dependencies: parses only the CAD YAML subset the
// canonical-agent-def schema defines.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturesRoot = path.join(repoRoot, 'skills', 'sk-platform-dispatch', 'fixtures');
const profilesDir = path.join(repoRoot, 'skills', 'sk-platform-dispatch', 'profiles');

// --- CAD parsing (YAML subset used by canonical-agent-def schema v1.0) -------------

function parseCad(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
  if (!m) throw new Error('CAD missing frontmatter');
  const [_, fm, body] = m;
  const cad = { body };
  const scalar = (key) => fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim();
  const clean = (v) => (v === undefined || v === 'null' ? null : v.replace(/^["']|["']$/g, ''));
  cad.name = clean(scalar('name'));
  // description may be a folded block (>) or inline scalar:
  const desc = fm.match(/^description:\s*(?:>-?\n((?:[ \t]+.*\n?)+)|(.+)$)/m);
  cad.description = (desc?.[2] ?? desc?.[1]?.split('\n').map((l) => l.trim()).filter(Boolean).join(' '))?.trim();
  cad.model_tier = clean(scalar('model_tier'));
  cad.turn_budget = scalar('turn_budget') === 'null' ? null : Number(scalar('turn_budget'));
  cad.isolation_required = scalar('isolation_required') === 'true';
  cad.capabilities = {};
  const capBlock = fm.match(/^capabilities:\n((?:[ \t]+.+\n?)+)/m)?.[1] ?? '';
  for (const [, k, v] of capBlock.matchAll(/^[ \t]+(\w+):\s*(\S+)/gm)) cad.capabilities[k] = v === 'true';
  const hints = fm.match(/^tool_hints:\n[ \t]+allow:\s*\[([^\]]*)\]/m)?.[1];
  cad.tool_hints = hints ? hints.split(',').map((s) => s.trim()) : [];
  return cad;
}

// --- Translators (normative source: sk-platform-dispatch/SKILL.md §Option A) -------

function translateToCC(cad, resolved) {
  const lines = ['---', `name: ${cad.name}`, `description: ${cad.description}`, `model_tier: ${cad.model_tier}`];
  if (resolved.effort != null) lines.push(`effort: ${resolved.effort}`); // tier_1 effort_field_name = "effort"
  lines.push(`maxTurns: ${cad.turn_budget}`);
  const readClass = cad.tool_hints.filter((t) => ['Read', 'Glob', 'Grep'].includes(t));
  if (!cad.capabilities.write_files) {
    lines.push(`tools: ${(readClass.length ? readClass : ['Read', 'Glob', 'Grep']).join(', ')}`);
    lines.push('disallowedTools: Write, Edit, Bash');
    lines.push('permissionMode: plan');
  } else {
    const tools = ['Read', 'Write', 'Edit'];
    if (cad.capabilities.run_shell) tools.push('Bash');
    for (const t of cad.tool_hints) if (!tools.includes(t)) tools.push(t);
    lines.push(`tools: ${tools.join(', ')}`);
    lines.push('permissionMode: acceptEdits');
    if (cad.isolation_required) lines.push('isolation: worktree');
  }
  lines.push('---');
  return lines.join('\n') + '\n\n' + cad.body;
}

function translateToOC(cad, resolved, profile) {
  const lines = ['---', 'mode: subagent', `name: ${cad.name}`, `description: ${cad.description}`, `model: ${resolved.model}`];
  const provider = resolved.model.split('/')[0];
  const providers = profile.capabilities.effort_field_applies_to_providers;
  if (resolved.effort != null && (providers == null || providers.includes(provider))) {
    lines.push(`${profile.capabilities.effort_field_name}: ${resolved.effort}`);
  }
  lines.push(`maxTurns: ${cad.turn_budget}`);
  const denies = [];
  if (!cad.capabilities.write_files) denies.push('  edit: deny');
  if (!cad.capabilities.run_shell) denies.push('  bash: deny');
  if (!cad.capabilities.network) denies.push('  webfetch: deny');
  if (denies.length) lines.push('permission:', ...denies);
  if (cad.tool_hints.length) lines.push(`tools: [${cad.tool_hints.map((t) => t.toLowerCase()).join(', ')}]`);
  lines.push('---');
  return lines.join('\n') + '\n\n' + cad.body;
}

function translateToCodex(cad, resolved, profile) {
  const lines = [`name = "${cad.name}"`, `description = "${cad.description}"`, `model = "${resolved.model}"`];
  const providers = profile.capabilities.effort_field_applies_to_providers;
  const provider = resolved.model.split('/')[0];
  if (resolved.effort != null && (providers == null || providers.includes(provider))) {
    lines.push(`${profile.capabilities.effort_field_name} = "${resolved.effort}"`);
  }
  lines.push(`sandbox_mode = "${cad.capabilities.write_files ? 'workspace-write' : 'read-only'}"`);
  // turn_budget has no Codex primitive — the live parser rejects `turn_limit` (verified 2026-07).
  lines.push('developer_instructions = """', cad.body.replace(/\n$/, ''), '"""');
  if (cad.capabilities.write_files && !cad.capabilities.network) {
    lines.push('', '[sandbox_workspace_write]', 'network_access = false');
  }
  return lines.join('\n') + '\n';
}

// --- Fixture runner -----------------------------------------------------------------

const suites = [
  { dir: 'cc-materialize', expected: 'expected-cc', ext: '.md', profile: 'tier_1.json', translate: translateToCC },
  { dir: 'oc-materialize', expected: 'expected-oc', ext: '.md', profile: 'tier_1b.json', translate: translateToOC },
  { dir: 'codex-materialize', expected: 'expected-codex', ext: '.toml', profile: 'tier_1d.json', translate: translateToCodex },
];

const normalize = (s) => s.replace(/[ \t]+$/gm, '').replace(/\n+$/, '\n');
let failures = 0;
let checked = 0;
for (const suite of suites) {
  const base = path.join(fixturesRoot, suite.dir);
  if (!fs.existsSync(base)) {
    console.error(`parity FAILED: missing fixture suite ${suite.dir}`);
    failures++;
    continue;
  }
  const profile = JSON.parse(fs.readFileSync(path.join(profilesDir, suite.profile), 'utf8'));
  const resolvedModels = JSON.parse(fs.readFileSync(path.join(base, 'input', 'resolved-models.json'), 'utf8'));
  for (const cadFile of fs.readdirSync(path.join(base, 'input')).filter((f) => f.endsWith('.cad.md'))) {
    const name = cadFile.replace(/\.cad\.md$/, '');
    const cad = parseCad(fs.readFileSync(path.join(base, 'input', cadFile), 'utf8'));
    const goldenPath = path.join(base, suite.expected, name + suite.ext);
    if (!fs.existsSync(goldenPath)) {
      console.error(`parity FAILED: ${suite.dir}: no golden for ${name}`);
      failures++;
      continue;
    }
    const actual = normalize(suite.translate(cad, resolvedModels[name], profile));
    const golden = normalize(fs.readFileSync(goldenPath, 'utf8'));
    checked++;
    if (actual !== golden) {
      failures++;
      const aLines = actual.split('\n');
      const gLines = golden.split('\n');
      const firstDiff = aLines.findIndex((l, i) => l !== gLines[i]);
      console.error(`parity FAILED: ${suite.dir}/${name}${suite.ext} diverges at line ${firstDiff + 1}:`);
      console.error(`  golden: ${JSON.stringify(gLines[firstDiff])}`);
      console.error(`  actual: ${JSON.stringify(aLines[firstDiff])}`);
    }
  }
}

if (failures) {
  console.error(`materialization parity failed: ${failures} divergence(s)`);
  process.exit(1);
}
console.log(`materialization parity ok: ${checked} golden files reproduced across ${suites.length} tiers`);
