#!/usr/bin/env node
// Renders the README platform-install table from bin/install.js PLATFORMS so the
// installer stays the single source of truth for install commands (fix-plan WI-01).
//
// Usage:
//   node scripts/generate-install-docs.js           # rewrite README.md in place
//   node scripts/generate-install-docs.js --check   # exit 1 if README diverges

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLATFORMS } from '../bin/install.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const README = path.join(ROOT, 'README.md');
const BEGIN = '<!-- <install_matrix> -->';
const END = '<!-- </install_matrix> -->';

function renderTable() {
  const rows = PLATFORMS.map((p) => {
    const cmds = p
      .install({ dryRun: true, version: null })
      .map((c) => `\`${c}\``)
      .join('<br>');
    return `| ${p.name} (Tier ${p.tier}) | ${cmds} |`;
  });
  return [
    BEGIN,
    '| Platform | Install |',
    '| :--- | :--- |',
    ...rows,
    END,
  ].join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  const readme = fs.readFileSync(README, 'utf8');
  const begin = readme.indexOf(BEGIN);
  const end = readme.indexOf(END);
  if (begin === -1 || end === -1 || end < begin) {
    console.error(`Markers ${BEGIN} … ${END} not found in README.md`);
    process.exit(2);
  }
  const current = readme.slice(begin, end + END.length);
  const generated = renderTable();
  if (current === generated) {
    console.log('README install table is in sync with bin/install.js.');
    return;
  }
  if (check) {
    console.error('README install table diverges from bin/install.js PLATFORMS.');
    console.error('Run `node scripts/generate-install-docs.js` to regenerate.');
    process.exit(1);
  }
  fs.writeFileSync(README, readme.slice(0, begin) + generated + readme.slice(end + END.length));
  console.log('README install table regenerated from bin/install.js.');
}

main();
