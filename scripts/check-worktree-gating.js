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

function fail(message) {
  failures.push(message);
}

function assertIncludes(file, text, message) {
  if (!read(file).includes(text)) {
    fail(`${file}: ${message}`);
  }
}

function assertNotIncludes(file, text, message) {
  if (read(file).includes(text)) {
    fail(`${file}: ${message}`);
  }
}

function parseFrontmatter(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!match) return {};
  const out = {};
  let parent = null;
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, '');
    const nested = /^  ([a-z_]+):\s*(true|false|"[^"]*"|[^#\s]+)\s*$/.exec(line);
    if (nested && parent) {
      out[parent] ??= {};
      out[parent][nested[1]] = parseScalar(nested[2]);
      continue;
    }
    const top = /^([a-z_]+):(?:\s*(true|false|"[^"]*"|[^#\s]+))?\s*$/.exec(line);
    if (top) {
      parent = top[2] === undefined ? top[1] : null;
      if (top[2] !== undefined) out[top[1]] = parseScalar(top[2]);
    }
  }
  return out;
}

function parseScalar(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value.replace(/^"|"$/g, '');
}

function fixtureRequiresWorktree(fixtureName) {
  const root = path.join(repoRoot, 'skills', 'running-a-pipeline', 'fixtures', 'worktree-gating', fixtureName);
  const topology = JSON.parse(fs.readFileSync(path.join(root, 'topology.json'), 'utf8'));
  return topology.steps.some((step) => {
    const cad = parseFrontmatter(fs.readFileSync(path.join(root, step.agent_def), 'utf8'));
    return cad.isolation_required === true || cad.capabilities?.edit_tracked_source === true;
  });
}

assertNotIncludes(
  'skills/running-a-pipeline/SKILL.md',
  "topology.pattern` is in `{2, 3, 5}` AND `platform_profile.capabilities.worktrees == false`",
  'Phase 0.6 must not hard-abort from topology pattern alone',
);
assertIncludes(
  'skills/running-a-pipeline/SKILL.md',
  'requires_tracked_source_isolation',
  'Phase 0.6 must compute whether tracked-source writer isolation is required',
);
assertIncludes(
  'skills/running-a-pipeline/SKILL.md',
  'edit_tracked_source',
  'Phase 0.6 must reference CAD tracked-source intent',
);
assertNotIncludes(
  'skills/creating-a-pipeline/SKILL.md',
  'ELIF !platform_profile.capabilities.worktrees: patterns = [1, 4]',
  'Pattern selection must not exclude Patterns 2/3/5 solely because worktrees are unavailable',
);
assertIncludes(
  'skills/creating-a-pipeline/SKILL.md',
  'workflow_requires_tracked_source_isolation',
  'Pattern selection must gate on tracked-source isolation need',
);

if (fixtureRequiresWorktree('artifact-only-pattern-3')) {
  fail('artifact-only Pattern 3 fixture must not require worktree isolation');
}
if (!fixtureRequiresWorktree('tracked-code-pattern-3')) {
  fail('tracked-code Pattern 3 fixture must require worktree isolation');
}

if (failures.length > 0) {
  console.error('worktree gating check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('worktree gating ok: artifact-only and tracked-code fixtures classified correctly');
