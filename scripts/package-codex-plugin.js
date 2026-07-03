#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const packageRoot = path.join(repoRoot, 'plugins', 'superpipelines');
const sourceSkills = path.join(repoRoot, 'skills');
const packageSkills = path.join(packageRoot, 'skills');
const sourceAssets = path.join(repoRoot, 'assets');
const packageAssets = path.join(packageRoot, 'assets');
const manifestPath = path.join(packageRoot, '.codex-plugin', 'plugin.json');
const liveCodexAgents = path.join(repoRoot, '.codex', 'agents');

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

function validateCodexAgentTomls() {
  if (!fs.existsSync(liveCodexAgents) || !fs.statSync(liveCodexAgents).isDirectory()) {
    fail(`missing live Codex agents directory: ${path.relative(repoRoot, liveCodexAgents)}`);
  }

  const tomlFiles = findFiles(liveCodexAgents).filter((file) => file.endsWith('.toml'));
  const scalarDeveloperInstructions = /(?:^|\n)developer_instructions\s*=\s*"""/;

  if (tomlFiles.length === 0) {
    fail(`live Codex agents directory contains no TOML files: ${path.relative(repoRoot, liveCodexAgents)}`);
  }

  for (const file of tomlFiles) {
    const content = fs.readFileSync(path.join(liveCodexAgents, file), 'utf8');
    if (content.includes('[[developer_instructions]]')) {
      fail(`Codex agent TOML must use scalar developer_instructions, not [[developer_instructions]]: .codex/agents/${file}`);
    }
    if (!scalarDeveloperInstructions.test(content)) {
      fail(`Codex agent TOML is missing scalar developer_instructions = """...""": .codex/agents/${file}`);
    }
    // Live parser requirements verified 2026-07 (docs/agents/verification/codex-discovery-2026-07.md Probe C):
    if (!/(?:^|\n)description\s*=\s*"/.test(content)) {
      fail(`Codex agent TOML must define description (required by the live parser): .codex/agents/${file}`);
    }
    if (/(?:^|\n)turn_limit\s*=/.test(content)) {
      fail(`Codex agent TOML must not define turn_limit (rejected as unknown field by the live parser): .codex/agents/${file}`);
    }
  }
}

// Every URL a manifest publishes must resolve: blob/main/<path> URLs to a file in
// this repo, and relative paths to a file or directory next to the manifest.
// Catches dead marketplace links like a missing PRIVACY.md (fix-plan WI-04).
function validateManifestUrls() {
  const manifests = [
    path.join(repoRoot, '.claude-plugin', 'plugin.json'),
    path.join(repoRoot, '.claude-plugin', 'marketplace.json'),
    path.join(repoRoot, '.codex-plugin', 'plugin.json'),
    path.join(repoRoot, '.cursor-plugin', 'plugin.json'),
    manifestPath,
  ];
  const blobUrl = /^https:\/\/github\.com\/gustavo-meilus\/superpipelines\/blob\/main\/(.+)$/;
  const walk = (node, visit) => {
    if (typeof node === 'string') visit(node);
    else if (Array.isArray(node)) node.forEach((v) => walk(v, visit));
    else if (node && typeof node === 'object') Object.values(node).forEach((v) => walk(v, visit));
  };
  for (const file of manifests) {
    if (!fs.existsSync(file)) continue;
    let json;
    try {
      json = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      fail(`manifest is not valid JSON: ${path.relative(repoRoot, file)}: ${error.message}`);
    }
    const rel = path.relative(repoRoot, file);
    walk(json, (value) => {
      const blob = value.match(blobUrl);
      if (blob && !fs.existsSync(path.join(repoRoot, blob[1]))) {
        fail(`${rel} references missing repo file: ${blob[1]}`);
      }
      if (value.startsWith('./') || value.startsWith('../')) {
        // Platforms disagree on the base: Codex resolves from the manifest dir
        // (.codex-plugin/plugin.json → ../.agents/skills/), Cursor from the plugin
        // root (.cursor-plugin/plugin.json → ./skills/). Accept either base.
        const fromManifestDir = path.resolve(path.dirname(file), value);
        const fromPluginRoot = path.resolve(path.dirname(path.dirname(file)), value);
        if (!fs.existsSync(fromManifestDir) && !fs.existsSync(fromPluginRoot)) {
          fail(`${rel} references missing relative path: ${value}`);
        }
      }
    });
  }
}

function validatePackage() {
  validateManifestUrls();
  const hygiene = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'check-cad-hygiene.js')], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (hygiene.status !== 0) {
    fail('CAD hygiene validation failed');
  }

  const worktreeGating = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'check-worktree-gating.js')], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (worktreeGating.status !== 0) {
    fail('worktree gating validation failed');
  }

  const deleteStepGuards = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'check-delete-step-guards.js')], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (deleteStepGuards.status !== 0) {
    fail('delete-step guard validation failed');
  }

  const manifest = readManifest();
  validateManifest(manifest);
  validateCodexAgentTomls();
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
  if (fs.existsSync(sourceAssets) && fs.statSync(sourceAssets).isDirectory()) {
    copyDirectory(sourceAssets, packageAssets);
  }
  copyFileIfPresent('README.md');
  copyFileIfPresent('LICENSE');
}

validatePackage();
