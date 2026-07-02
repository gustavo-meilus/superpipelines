#!/usr/bin/env node
// Reports the preloaded-skill context cost per repo agent (fix-plan WI-08 / spec GAP-09).
// Claude Code injects the FULL content of every skill in an agent's `skills:` list at
// subagent startup, so the sum of those SKILL.md line counts is a per-dispatch context
// tax. Soft budget: 1200 lines for `model_tier: fast` agents (warn, non-fatal);
// missing preloaded skills are fatal (broken reference).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FAST_BUDGET_LINES = 1200;

let fatal = false;
const rows = [];
for (const file of fs.readdirSync(path.join(repoRoot, 'agents')).filter((f) => f.endsWith('.md'))) {
  const content = fs.readFileSync(path.join(repoRoot, 'agents', file), 'utf8');
  const fm = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const tier = fm.match(/^model_tier:\s*(\S+)/m)?.[1] ?? '?';
  const skills = [...fm.matchAll(/^\s+-\s+(\S+)\s*$/gm)].map((m) => m[1]);
  let total = 0;
  const detail = [];
  for (const skill of skills) {
    const skillPath = path.join(repoRoot, 'skills', skill, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      console.error(`FATAL: ${file} preloads missing skill "${skill}"`);
      fatal = true;
      continue;
    }
    const lines = fs.readFileSync(skillPath, 'utf8').split('\n').length;
    total += lines;
    detail.push(`${skill}(${lines})`);
  }
  rows.push({ agent: file.replace(/\.md$/, ''), tier, count: skills.length, total, detail });
}

rows.sort((a, b) => b.total - a.total);
console.log('Preload budget report (skills: full content injected at subagent startup):');
console.log(`${'agent'.padEnd(28)} ${'tier'.padEnd(7)} ${'skills'.padEnd(6)} lines`);
let warned = 0;
for (const r of rows) {
  const over = r.tier === 'fast' && r.total > FAST_BUDGET_LINES;
  if (over) warned++;
  console.log(`${r.agent.padEnd(28)} ${r.tier.padEnd(7)} ${String(r.count).padEnd(6)} ${r.total}${over ? `  ⚠️ over fast budget (${FAST_BUDGET_LINES})` : ''}`);
  console.log(`  ${r.detail.join(', ')}`);
}
if (warned) console.log(`\n${warned} fast-tier agent(s) over the ${FAST_BUDGET_LINES}-line soft budget — consider demoting preloads to Skill-tool invocation.`);
if (fatal) process.exit(1);
