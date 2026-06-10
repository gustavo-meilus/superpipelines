#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const packageRoot = path.join(repoRoot, 'plugins', 'superpipelines');
const sourceSkills = path.join(repoRoot, 'skills');
const packageSkills = path.join(packageRoot, 'skills');
const manifestPath = path.join(packageRoot, '.codex-plugin', 'plugin.json');

const mode = process.argv.includes('--check') ? 'check' : 'sync';

function fail(message) {
  console.error(`codex package check failed: ${message}`);
  process.exit(1);
}

function ensureInside(root, candidate, label) {
  const relative = path.relative(root, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    fail(`${label} escapes ${root}`);
  }
}

function readManifest() {
  if (!fs.existsSync(manifestPath)) {
    fail(`missing manifest: ${path.relative(repoRoot, manifestPath)}`);
  }
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    fail(`manifest is not valid JSON: ${error.message}`);
  }
}

function copyDirectory(source, target) {
  ensureInside(packageRoot, target, path.relative(repoRoot, target));
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(from, to);
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
    }
  }
}

function copyFileIfPresent(name) {
  const from = path.join(repoRoot, name);
  const to = path.join(packageRoot, name);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, to);
  }
}

function findSkillFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findSkillFiles(full));
    } else if (entry.isFile() && entry.name === 'SKILL.md') {
      out.push(full);
    }
  }
  return out;
}

function toRelativePath(root, file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function findFiles(root, dir = root) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findFiles(root, full));
    } else if (entry.isFile()) {
      out.push(toRelativePath(root, full));
    }
  }
  return out.sort();
}

function validateMirrorsSourceSkills() {
  if (!fs.existsSync(sourceSkills) || !fs.statSync(sourceSkills).isDirectory()) {
    fail('missing source skills directory');
  }

  const sourceFiles = findFiles(sourceSkills);
  const packagedFiles = findFiles(packageSkills);
  const sourceSet = new Set(sourceFiles);
  const packagedSet = new Set(packagedFiles);
  const remediation = 'run `node scripts/package-codex-plugin.js` to regenerate the package';

  const missing = sourceFiles.find((file) => !packagedSet.has(file));
  if (missing) {
    fail(`packaged skills are missing ${missing}; ${remediation}`);
  }

  const extra = packagedFiles.find((file) => !sourceSet.has(file));
  if (extra) {
    fail(`packaged skills contain extra file ${extra}; ${remediation}`);
  }

  const differing = sourceFiles.find((file) => {
    const source = fs.readFileSync(path.join(sourceSkills, file));
    const packaged = fs.readFileSync(path.join(packageSkills, file));
    return !source.equals(packaged);
  });
  if (differing) {
    fail(`packaged skills differ from source at ${differing}; ${remediation}`);
  }
}

function validateManifest(manifest) {
  if (manifest.skills !== './skills/') {
    fail(`manifest skills must be "./skills/", got ${JSON.stringify(manifest.skills)}`);
  }
  if (Object.prototype.hasOwnProperty.call(manifest, 'agents')) {
    fail('manifest must not declare unsupported "agents" field');
  }
  if (Object.prototype.hasOwnProperty.call(manifest, 'commands')) {
    fail('manifest must not declare unsupported "commands" field');
  }
  for (const key of ['skills', 'mcpServers', 'tools', 'hooks', 'assets']) {
    if (typeof manifest[key] === 'string') {
      if (!manifest[key].startsWith('./')) {
        fail(`manifest field ${key} must start with ./`);
      }
      ensureInside(packageRoot, path.resolve(packageRoot, manifest[key]), key);
    }
  }
}

function validatePackage() {
  const manifest = readManifest();
  validateManifest(manifest);
  if (!fs.existsSync(packageSkills) || !fs.statSync(packageSkills).isDirectory()) {
    fail(
      `missing packaged skills directory: ${path.relative(repoRoot, packageSkills)}; run \`node scripts/package-codex-plugin.js\` to generate the package before checking`,
    );
  }
  validateMirrorsSourceSkills();
  const skillFiles = findSkillFiles(packageSkills);
  if (skillFiles.length === 0) {
    fail('packaged skills directory contains no SKILL.md files');
  }
  console.log(`codex package ok: ${skillFiles.length} skill files`);
}

if (mode === 'sync') {
  if (!fs.existsSync(sourceSkills) || !fs.statSync(sourceSkills).isDirectory()) {
    fail('missing source skills directory');
  }
  copyDirectory(sourceSkills, packageSkills);
  copyFileIfPresent('README.md');
  copyFileIfPresent('LICENSE');
}

validatePackage();
