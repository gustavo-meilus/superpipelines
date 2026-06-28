#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function fail(file, message) {
  failures.push(`${file}: ${message}`);
}

function assertIncludes(file, text, message) {
  if (!read(file).includes(text)) {
    fail(file, message);
  }
}

function assertMatches(file, pattern, message) {
  if (!pattern.test(read(file))) {
    fail(file, message);
  }
}

const architect = 'skills/pipeline-architect-protocol/SKILL.md';
const deleteStep = 'skills/deleting-a-pipeline-step/SKILL.md';

for (const status of ['edited', 'copied-unchanged', 'deleted']) {
  assertIncludes(
    architect,
    status,
    `STEP-DELETE completion manifest must mention status ${JSON.stringify(status)}`,
  );
}
assertMatches(
  architect,
  /STEP-DELETE[\s\S]{0,1200}completion manifest/i,
  'STEP-DELETE protocol must require a completion manifest',
);
assertMatches(
  architect,
  /completion manifest[\s\S]{0,1000}every file/i,
  'completion manifest must cover every expected touched file',
);

assertIncludes(
  deleteStep,
  'copied-unchanged',
  'Phase 2 must block on copied-unchanged markdown entries from the manifest',
);
assertMatches(
  deleteStep,
  /Phase 2[\s\S]{0,1800}byte-identical/i,
  'Phase 2 must compare staged markdown files against production originals',
);
assertMatches(
  deleteStep,
  /Phase 2[\s\S]{0,1800}\.md/i,
  'Phase 2 modification guard must explicitly cover markdown files',
);
assertMatches(
  deleteStep,
  /Phase 3[\s\S]{0,400}DELTA AUDIT[\s\S]{0,800}SEV-0 or SEV-1 findings block deletion/i,
  'Phase 3 delta auditor hard gate must remain intact',
);

const grepMentions = [...read(deleteStep).matchAll(/^.*grep.*$/gim)].map((match) => match[0]);
for (const line of grepMentions) {
  if (!/--include=.*\*\.md|trusting the delta auditor|authoritative/.test(line)) {
    fail(deleteStep, `grep guidance must include markdown coverage or defer to auditor: ${line.trim()}`);
  }
}

if (failures.length > 0) {
  console.error('delete-step guard check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('delete-step guard ok: STEP-DELETE manifest and Phase 2 markdown guards present');
