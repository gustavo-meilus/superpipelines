#!/usr/bin/env node
// Mechanical enforcement of the CLAUDE.md authoring rules and auditor criterion MT-01
// (fix-plan WI-08 / spec GAP-08 job 4):
//   1. SKILL.md bodies ≤500 lines (lines after the closing frontmatter fence).
//   2. description (+ when_to_use) ≤1536 characters.
//   3. agents/*.md are frontmatter-only (zero-body Lean Agent pattern).
//   4. Reference files >100 lines include a Table of Contents.
//   5. Stale-model-ID check: any concrete model ID in a skill body (outside
//      profiles/ and fixtures/) must exist in a platform profile's model_tiers
//      or in the legacy model catalog — catches catalog drift like opus-4-7
//      lingering after the profile moved to opus-4-8.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function findFiles(dir, predicate, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findFiles(full, predicate, acc);
    else if (entry.isFile() && predicate(full)) acc.push(full);
  }
  return acc;
}

const rel = (p) => path.relative(repoRoot, p);

function splitFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  return m ? { frontmatter: m[1], body: m[2] } : null;
}

// Rules 1 + 2 — skill bodies and descriptions.
const skillFiles = findFiles(path.join(repoRoot, 'skills'), (f) => f.endsWith(path.sep + 'SKILL.md'));
for (const file of skillFiles) {
  const parts = splitFrontmatter(fs.readFileSync(file, 'utf8'));
  if (!parts) {
    errors.push(`${rel(file)}: missing YAML frontmatter`);
    continue;
  }
  const bodyLines = parts.body.split('\n').length;
  if (bodyLines > 500) errors.push(`${rel(file)}: body is ${bodyLines} lines (limit 500)`);
  const grab = (key) => {
    const m = parts.frontmatter.match(new RegExp(`^${key}:\\s*([>|][+-]?\\n)?([\\s\\S]*?)(?=\\n[a-zA-Z_-]+:|$)`, 'm'));
    return m ? m[2] : '';
  };
  const descLen = (grab('description') + grab('when_to_use')).replace(/\s+/g, ' ').trim().length;
  if (descLen > 1536) errors.push(`${rel(file)}: description(+when_to_use) is ${descLen} chars (limit 1536)`);
}

// Rule 3 — zero-body agents.
for (const file of findFiles(path.join(repoRoot, 'agents'), (f) => f.endsWith('.md'))) {
  const parts = splitFrontmatter(fs.readFileSync(file, 'utf8'));
  if (!parts) errors.push(`${rel(file)}: missing YAML frontmatter`);
  else if (parts.body.trim() !== '') errors.push(`${rel(file)}: agent has a body (${parts.body.trim().split('\n').length} lines) — Lean Agent pattern requires frontmatter only`);
}

// Rule 4 — references >100 lines need a ToC.
const referenceFiles = findFiles(path.join(repoRoot, 'skills'), (f) => f.endsWith('.md') && f.includes(`${path.sep}references${path.sep}`) && !f.includes(`${path.sep}fixtures${path.sep}`));
for (const file of referenceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.split('\n').length > 100 && !/table of contents/i.test(content)) {
    errors.push(`${rel(file)}: reference exceeds 100 lines without a Table of Contents`);
  }
}

// Rule 5 — stale model IDs (auditor MT-01, drift variant).
const allowedIds = new Set(['inherit']);
const profilesDir = path.join(repoRoot, 'skills', 'sk-platform-dispatch', 'profiles');
for (const f of fs.readdirSync(profilesDir).filter((f) => /^tier_[a-z0-9]+\.json$/.test(f))) {
  const profile = JSON.parse(fs.readFileSync(path.join(profilesDir, f), 'utf8'));
  for (const t of Object.values(profile.model_tiers)) allowedIds.add(t.model);
}
const catalog = fs.readFileSync(path.join(repoRoot, 'skills', 'change-models', 'references', 'model-catalog.md'), 'utf8');
for (const m of catalog.matchAll(/`([a-z][\w./[\]-]+)`/g)) allowedIds.add(m[1]);

// Documented exceptions — each entry needs a justification here:
// - opencode-go/glm-5.1: resolution-algorithm worked example of an explicit
//   `model:` override naming a host-discovered provider model that is
//   deliberately absent from every profile.
const allowlistedIds = new Set(['opencode-go/glm-5.1']);
// Negative lookbehind excludes path strings like `.opencode/agent` / `~/.opencode/auth.json`.
const modelIdPattern = /(?<![.\w/-])(claude-[a-z]+-\d[\w-]*|gpt-\d[\w.-]*|gemini-\d[\w.-]*|opencode(?:-go)?\/[\w.-]+)\b/g;
const skillDocs = findFiles(path.join(repoRoot, 'skills'), (f) => f.endsWith('.md') && !f.includes(`${path.sep}profiles${path.sep}`) && !f.includes(`${path.sep}fixtures${path.sep}`));
for (const file of skillDocs) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (/grep|matches \//.test(line)) return; // detection/regex-pattern text, not model references
    for (const m of line.matchAll(modelIdPattern)) {
      const id = m[1].replace(/[.,;)]+$/, '');
      if (allowlistedIds.has(id)) continue;
      if (!allowedIds.has(id) && !allowedIds.has(id.replace(/\[1m\]$/, ''))) {
        errors.push(`${rel(file)}:${i + 1}: model ID "${id}" not in any profile model_tiers or the legacy catalog (stale? MT-01)`);
      }
    }
  });
}

if (errors.length) {
  console.error(`authoring rules failed (${errors.length}):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`authoring rules ok: ${skillFiles.length} skills, ${referenceFiles.length} references, agents zero-body, model IDs current`);
