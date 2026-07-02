#!/usr/bin/env node
// Validates every sk-platform-dispatch platform profile against profile.schema.json,
// and asserts the schema fixtures behave: fixtures/valid/* pass, fixtures/invalid/* fail.
// Zero-dependency subset validator covering exactly the keywords the schema uses:
// type, required, properties, additionalProperties, pattern, enum, items, oneOf, $ref/$defs.
// (fix-plan WI-07 / spec GAP-08 job 2)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profilesDir = path.join(repoRoot, 'skills', 'sk-platform-dispatch', 'profiles');
const schema = JSON.parse(fs.readFileSync(path.join(profilesDir, 'profile.schema.json'), 'utf8'));

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v; // object | string | number | boolean
}

function resolveRef(ref) {
  if (!ref.startsWith('#/')) throw new Error(`unsupported $ref: ${ref}`);
  return ref.slice(2).split('/').reduce((node, key) => node[key], schema);
}

function validate(node, sch, where, errors) {
  if (sch.$ref) sch = { ...resolveRef(sch.$ref), ...sch, $ref: undefined };
  if (sch.oneOf) {
    const passing = sch.oneOf.filter((sub) => {
      const e = [];
      validate(node, sub, where, e);
      return e.length === 0;
    });
    if (passing.length !== 1) errors.push(`${where}: matches ${passing.length} of oneOf, expected exactly 1`);
    return;
  }
  if (sch.enum && !sch.enum.some((v) => JSON.stringify(v) === JSON.stringify(node))) {
    errors.push(`${where}: value ${JSON.stringify(node)} not in enum ${JSON.stringify(sch.enum)}`);
    return;
  }
  if (sch.type) {
    const types = Array.isArray(sch.type) ? sch.type : [sch.type];
    const actual = typeOf(node);
    const ok = types.some((t) => t === actual || (t === 'number' && actual === 'integer'));
    if (!ok) {
      errors.push(`${where}: expected type ${types.join('|')}, got ${actual}`);
      return;
    }
  }
  if (sch.pattern && typeof node === 'string' && !new RegExp(sch.pattern).test(node)) {
    errors.push(`${where}: "${node}" does not match pattern ${sch.pattern}`);
  }
  if (typeOf(node) === 'object') {
    for (const req of sch.required ?? []) {
      if (!(req in node)) errors.push(`${where}: missing required field "${req}"`);
    }
    for (const [key, value] of Object.entries(node)) {
      const propSchema = sch.properties?.[key];
      if (propSchema) validate(value, propSchema, `${where}.${key}`, errors);
      else if (sch.additionalProperties === false) errors.push(`${where}: unexpected field "${key}"`);
      else if (typeof sch.additionalProperties === 'object') validate(value, sch.additionalProperties, `${where}.${key}`, errors);
    }
  }
  if (typeOf(node) === 'array' && sch.items) {
    node.forEach((item, i) => validate(item, sch.items, `${where}[${i}]`, errors));
  }
}

function check(file) {
  const errors = [];
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [`not valid JSON: ${e.message}`];
  }
  validate(json, schema, path.basename(file), errors);
  return errors;
}

let failed = false;
const profileFiles = fs.readdirSync(profilesDir).filter((f) => /^tier_[a-z0-9]+\.json$/.test(f));
if (profileFiles.length === 0) {
  console.error('profile check failed: no tier_*.json profiles found');
  process.exit(1);
}
for (const f of profileFiles) {
  const errors = check(path.join(profilesDir, f));
  if (errors.length) {
    failed = true;
    console.error(`profile INVALID: ${f}\n  ${errors.join('\n  ')}`);
  }
}

const validDir = path.join(profilesDir, 'fixtures', 'valid');
const invalidDir = path.join(profilesDir, 'fixtures', 'invalid');
for (const f of fs.existsSync(validDir) ? fs.readdirSync(validDir) : []) {
  const errors = check(path.join(validDir, f));
  if (errors.length) {
    failed = true;
    console.error(`fixture EXPECTED VALID but failed: fixtures/valid/${f}\n  ${errors.join('\n  ')}`);
  }
}
for (const f of fs.existsSync(invalidDir) ? fs.readdirSync(invalidDir) : []) {
  const errors = check(path.join(invalidDir, f));
  if (errors.length === 0) {
    failed = true;
    console.error(`fixture EXPECTED INVALID but passed: fixtures/invalid/${f}`);
  }
}

if (failed) process.exit(1);
console.log(`profiles ok: ${profileFiles.length} profiles valid; fixtures behave (valid pass, invalid fail)`);
