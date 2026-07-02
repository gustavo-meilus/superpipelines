#!/usr/bin/env node
// Asserts the release version targets agree (cutting-a-release: the 5 targets,
// plus .codex-plugin/plugin.json which also carries a version).
// (fix-plan WI-07 / spec GAP-08 job 1)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(repoRoot, p), 'utf8');
const json = (p) => JSON.parse(read(p));

const targets = {
  'package.json': json('package.json').version,
  '.claude-plugin/plugin.json': json('.claude-plugin/plugin.json').version,
  '.claude-plugin/marketplace.json (plugins.0.version)': json('.claude-plugin/marketplace.json').plugins[0].version,
  '.cursor-plugin/plugin.json': json('.cursor-plugin/plugin.json').version,
  '.codex-plugin/plugin.json': json('.codex-plugin/plugin.json').version,
  'CLAUDE.md (Project Version)': (read('CLAUDE.md').match(/\*\*Project Version\*\*: v(\d+\.\d+\.\d+)/) ?? [])[1],
};

const values = Object.values(targets);
const reference = values[0];
const disagreements = Object.entries(targets).filter(([, v]) => v !== reference);
if (!reference || disagreements.length) {
  console.error('version agreement failed:');
  for (const [name, v] of Object.entries(targets)) console.error(`  ${name}: ${v ?? 'NOT FOUND'}`);
  process.exit(1);
}
console.log(`version agreement ok: ${Object.keys(targets).length} targets at ${reference}`);
