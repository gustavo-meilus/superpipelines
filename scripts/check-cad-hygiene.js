#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');

const failures = [];

function rel(file) {
  return path.relative(repoRoot, file).split(path.sep).join('/');
}

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, predicate));
    } else if (entry.isFile() && predicate(full)) {
      out.push(full);
    }
  }
  return out.sort();
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function fail(file, message) {
  failures.push(`${rel(file)}: ${message}`);
}

function bodyAfterFrontmatter(content) {
  const matches = [...content.matchAll(/^---\s*$/gm)];
  if (matches.length < 2) return content;
  return content.slice(matches[1].index + matches[1][0].length);
}

function checkCadFiles() {
  const fixtureRoot = path.join(repoRoot, 'skills', 'sk-platform-dispatch', 'fixtures');
  const cadFiles = walk(fixtureRoot, (file) => file.endsWith('.cad.md'));

  for (const file of cadFiles) {
    const content = read(file);
    const body = bodyAfterFrontmatter(content);

    for (const field of ['disable-model-invocation', 'user-invocable']) {
      if (content.includes(field)) {
        fail(file, `CAD frontmatter/body must not contain skill invocation field \`${field}\``);
      }
    }

    for (const required of ['## Required Sources', '## Protocol', '## Completion Criterion', '<invariants>']) {
      if (!body.includes(required)) {
        fail(file, `CAD body missing required section ${JSON.stringify(required)}`);
      }
    }
  }

  return cadFiles.length;
}

function filesForStalePhraseScan() {
  const direct = [
    'skills/creating-a-pipeline/SKILL.md',
    'skills/pipeline-architect-protocol/SKILL.md',
    'skills/pipeline-auditor-protocol/SKILL.md',
    'skills/sk-pipeline-patterns/references/ai-pipelines-trimmed.md',
  ].map((file) => path.join(repoRoot, file));

  const recursiveRoots = [
    'skills/pipeline-architect-references/references',
    'skills/pipeline-auditor-references/references',
    'skills/migrating-a-pipeline/fixtures',
    'skills/sk-platform-dispatch/fixtures',
  ].map((dir) => path.join(repoRoot, dir));

  const recursive = recursiveRoots.flatMap((root) =>
    walk(root, (file) => /\.(md|toml|json)$/.test(file)),
  );

  return [...new Set([...direct, ...recursive])].filter((file) => fs.existsSync(file)).sort();
}

function contextAllowsStalePhrase(line, currentHeading, filePreamble) {
  const context = `${filePreamble}\n${currentHeading}\n${line}`.toLowerCase();
  const labeled =
    /\blegacy\b|\blegacy-only\b|\bmigration\b|\bold-root\b|fixture-discrimination|discriminating fixture|materialization fixture|materialized|materialization cache|not new-pipeline authoring guidance|not examples for new pipeline scaffolding|pipeline state files/.test(
      context,
    );
  const prohibition =
    /\bdo not\b|\bmust not\b|\bnever\b|\bforbidden\b|\bno separate\b|\bno generated\b|\bnot generate\b|\bavoid\b|\bnot instruct\b|nothing is written|nothing generated/.test(
      line.toLowerCase(),
    );
  return labeled || prohibition;
}

function checkStalePhrases() {
  const stale = /zero-body|companion protocol|-protocol skill|agents\/superpipelines|skills\/superpipelines/i;
  const files = filesForStalePhraseScan();

  for (const file of files) {
    const lines = read(file).split(/\r?\n/);
    const filePreamble = lines.slice(0, 20).join('\n');
    let currentHeading = '';

    lines.forEach((line, index) => {
      if (/^#{1,6}\s+/.test(line)) {
        currentHeading = line;
      }
      if (stale.test(line) && !contextAllowsStalePhrase(line, currentHeading, filePreamble)) {
        fail(file, `line ${index + 1} has unlabelled stale generation phrase: ${line.trim()}`);
      }
    });
  }

  return files.length;
}

function checkActiveContractContradictions() {
  const checks = [
    {
      file: path.join(repoRoot, 'skills', 'pipeline-architect-protocol', 'SKILL.md'),
      pattern: /Design all step agents per `references\/agent-frontmatter-schema\.md`/,
      message: 'new pipeline design must not use the legacy agent-frontmatter schema as its active schema',
    },
    {
      file: path.join(repoRoot, 'skills', 'pipeline-auditor-protocol', 'SKILL.md'),
      pattern: /CAD-01\.\.CAD-05 govern there instead/,
      message: 'data-only auditor guidance must apply CAD-01..CAD-10',
    },
    {
      file: path.join(repoRoot, 'skills', 'pipeline-auditor-references', 'references', 'compliance-matrix.md'),
      pattern: /CAD-01\.\.CAD-05 govern instead|\| CAD-01\.\.CAD-05 \|/,
      message: 'compliance matrix applicability must apply CAD-01..CAD-10',
    },
    {
      file: path.join(repoRoot, 'skills', 'pipeline-auditor-references', 'references', 'compliance-matrix.md'),
      pattern: /step protocols are `pipelines\/\{P\}\/skills\/\{step\}\/SKILL\.md`/,
      message: 'data-only layout must not advertise separate step protocol files',
    },
    {
      file: path.join(repoRoot, 'skills', 'sk-pipeline-paths', 'SKILL.md'),
      pattern: /Step Protocol \(data\)|pipelines\/\{P\}\/skills\/\{step\}\/SKILL\.md/,
      message: 'data-only path templates must not advertise separate step protocol files',
    },
  ];

  for (const check of checks) {
    if (fs.existsSync(check.file) && check.pattern.test(read(check.file))) {
      fail(check.file, check.message);
    }
  }
}

const cadCount = checkCadFiles();
const scannedCount = checkStalePhrases();
checkActiveContractContradictions();

if (failures.length > 0) {
  console.error('cad hygiene check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`cad hygiene ok: ${cadCount} CAD files checked; ${scannedCount} authoring/fixture files scanned`);
