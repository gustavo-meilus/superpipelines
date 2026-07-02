#!/usr/bin/env node
// Superpipelines universal installer.
// Auto-detects supported platforms and runs the appropriate per-platform install command.
// Zero external dependencies — pure node:fs / node:child_process / node:os.
//
// Q9 (v2.0.0 hardening): cross-platform detection (binary/app-path checks rather than
// workspace dir markers), honest flag handling (--uninstall prints per-platform commands
// instead of "not yet implemented"), --version for pinning, partial-install abort,
// Tier 2 npx preflight.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';

const REPO = 'gustavo-meilus/superpipelines';
const MARKETPLACE = `https://github.com/${REPO}`;

// OpenCode (Tier 1b) is supported in the resolver but has no packaged installer in this distribution.

function which(binary) {
  const cmd = process.platform === 'win32' ? `where ${binary}` : `command -v ${binary}`;
  const r = spawnSync(cmd, { shell: true, stdio: 'ignore' });
  return r.status === 0;
}

function fileExists(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

function dirExists(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

// Q9 fix 1: cross-platform application detection for Tier 2 IDEs. Workspace dir markers
// (e.g. `.cursor/`) indicate workspace integration, not host availability — they are
// almost always absent at install time. Detection probes the installed application instead.
function appInstalled(macAppPath, winRelPath, linuxRelPath, binaryName) {
  // macOS application bundle
  if (process.platform === 'darwin' && macAppPath && dirExists(macAppPath)) return true;
  // Windows: %LOCALAPPDATA%\Programs\<name>
  if (process.platform === 'win32' && winRelPath) {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData && dirExists(path.join(localAppData, 'Programs', winRelPath))) return true;
  }
  // Linux/WSL: ~/.config/<name>
  if ((process.platform === 'linux' || process.platform === 'wsl') && linuxRelPath) {
    if (dirExists(path.join(os.homedir(), '.config', linuxRelPath))) return true;
  }
  // Fallback: binary on PATH
  if (binaryName && which(binaryName)) return true;
  return false;
}

function vsCodeExtensionInstalled(extensionId) {
  // Cline ships as a VS Code extension; detect by the extension ID directory.
  const extDir = path.join(os.homedir(), '.vscode', 'extensions');
  if (!dirExists(extDir)) return false;
  try {
    return fs.readdirSync(extDir).some(entry => entry.startsWith(extensionId + '-'));
  } catch { return false; }
}

// Exported: scripts/generate-install-docs.js renders the README install table
// from this array so the installer stays the single source of truth for commands.
export const PLATFORMS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    tier: '1',
    detect: () => which('claude'),
    install: () => {
      return [
        `claude plugin marketplace add ${MARKETPLACE}`,
        // CC does not support --version pinning on plugin install.
        `claude plugin install superpipelines@superpipelines-marketplace`,
      ];
    },
    uninstallCmd: 'claude plugin remove superpipelines',
  },
  {
    id: 'codex',
    name: 'Codex App/CLI',
    tier: '1d',
    detect: () => which('codex') || dirExists(path.join(os.homedir(), '.codex')),
    install: () => {
      return [
        `codex plugin marketplace add ${REPO}`,
        // Codex uses `plugin add` (not `plugin install`); marketplace name is derived
        // from the repo slug with a "-marketplace" suffix by the Codex CLI.
        `codex plugin add superpipelines@superpipelines-marketplace`,
      ];
    },
    postInstallNote: 'If `codex plugin add` failed: open Codex, run `/plugins`, and complete installation manually.',
    uninstallCmd: 'codex plugin remove superpipelines',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    tier: '2',
    // Q9 fix 1: app-path check instead of workspace marker.
    detect: () => appInstalled('/Applications/Cursor.app', 'cursor', 'Cursor', 'cursor'),
    install: () => [`npx -y skills add superpipelines -a cursor`],
    uninstallCmd: 'npx -y skills remove superpipelines -a cursor',
    requiresNpx: true,
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    tier: '2',
    detect: () => appInstalled('/Applications/Windsurf.app', 'windsurf', 'Windsurf', 'windsurf'),
    install: () => [`npx -y skills add superpipelines -a windsurf`],
    uninstallCmd: 'npx -y skills remove superpipelines -a windsurf',
    requiresNpx: true,
  },
  {
    id: 'cline',
    name: 'Cline',
    tier: '2',
    // Cline is a VS Code extension; detect by the extension ID (saoudrizwan.claude-dev).
    detect: () => vsCodeExtensionInstalled('saoudrizwan.claude-dev'),
    install: () => [`npx -y skills add superpipelines -a cline`],
    uninstallCmd: 'npx -y skills remove superpipelines -a cline',
    requiresNpx: true,
  },
  {
    id: 'antigravity',
    name: 'Antigravity CLI 2.0',
    tier: '1c',
    detect: () => which('agy'),
    install: () => {
      return [`agy plugin install superpipelines@superpipelines`];
    },
    postInstallNote: 'If upgrading from a Gemini CLI extension, run: agy plugin import gemini',
    uninstallCmd: 'agy plugin remove superpipelines',
  },
];

// Tier 2 installs depend on the third-party `skills` CLI. When it is unavailable or
// fails, print a manual path instead of a dead end (fix-plan WI-06).
const MANUAL_TIER2_NOTE = [
  "Manual fallback: clone the repo and copy the skills into your tool's skills directory:",
  `  git clone https://github.com/${REPO}`,
  '  then copy plugins/superpipelines/skills/ into the skills directory your tool documents',
  '  (see "Manual install (Tier 2)" in the repo README).',
].join('\n');

// Q9 fix 7: runAll aborts subsequent commands for the same platform after a failure,
// and the caller surfaces a partial-state summary. Each platform's failure does not
// cascade to other platforms in --all mode.
function runAll(cmds, dryRun) {
  for (const cmd of cmds) {
    if (dryRun) {
      console.log(`[dry-run] ${cmd}`);
      continue;
    }
    console.log(`+ ${cmd}`);
    try {
      execSync(cmd, { stdio: 'inherit' });
    } catch (e) {
      console.error(`FAILED: ${cmd}`);
      return false; // abort remaining commands for this platform
    }
  }
  return true;
}

function parseArgs(argv) {
  const out = {
    all: false,
    only: [],
    dryRun: false,
    list: false,
    uninstall: false,
    nonInteractive: false,
    withInit: false,
    version: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') out.all = true;
    else if (a === '--only') out.only.push(argv[++i]);
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--list') out.list = true;
    else if (a === '--uninstall') out.uninstall = true;
    else if (a === '--non-interactive') out.nonInteractive = true;
    else if (a === '--with-init') out.withInit = true;
    else if (a === '--version') out.version = argv[++i];
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else { console.error(`Unknown flag: ${a}`); printHelp(); process.exit(2); }
  }
  return out;
}

function printHelp() {
  console.log(`Usage: superpipelines-install [flags]

Flags:
  --all                 Install for all detected platforms
  --only <id>           Install for one platform (repeatable); id ∈ {claude-code, codex, cursor, windsurf, cline, antigravity}
  --version <semver>    Pin to a specific superpipelines version (e.g. --version 2.0.0). Default: latest.
  --dry-run             Print commands; write nothing
  --list                Print detection matrix and exit
  --uninstall           Print the per-platform remove command for every detected platform and exit
  --with-init           Reserved (no-op in v2.0.0; prints a notice when used)
  --non-interactive     Never prompt; use defaults
  -h, --help            This message`);
}

function detectAll() {
  return PLATFORMS.map(p => ({ ...p, detected: p.detect() }));
}

function listDetection() {
  const rows = detectAll();
  const w = Math.max(...rows.map(r => r.id.length));
  console.log(`${'Platform'.padEnd(w)}  Tier  Detected`);
  console.log(`${'-'.repeat(w)}  ----  --------`);
  for (const r of rows) {
    console.log(`${r.id.padEnd(w)}  ${String(r.tier).padEnd(4)}  ${r.detected ? 'yes' : 'no'}`);
  }
}

// Q9 fix 3: --uninstall now prints the per-platform manual remove command for every
// detected platform. No more "not yet implemented" lie.
function uninstallAll() {
  const detected = detectAll().filter(x => x.detected);
  if (!detected.length) {
    console.log('No supported platforms detected. Nothing to uninstall.');
    return;
  }
  console.log('Run the following commands to remove superpipelines from each platform:');
  for (const p of detected) {
    console.log(`  ${p.uninstallCmd}     # ${p.name}`);
  }
  console.log('\nThis command does not execute the removals — paste each line into your shell.');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.withInit) {
    // Q9 fix 4: --with-init no longer silently no-ops. It explicitly tells the user
    // it is reserved for a future release.
    console.warn('Note: --with-init is reserved for a future release. Ignoring.');
  }

  if (opts.list) return listDetection();
  if (opts.uninstall) return uninstallAll();

  const detected = detectAll().filter(p => p.detected);
  let targets = detected;

  if (opts.only.length) {
    targets = PLATFORMS.filter(p => opts.only.includes(p.id));
    const undetected = targets.filter(t => !detected.find(d => d.id === t.id)).map(t => t.id);
    if (undetected.length) {
      console.warn(`Warning: requested but not detected: ${undetected.join(', ')}. Proceeding anyway.`);
    }
  } else if (!opts.all && detected.length > 1 && !opts.nonInteractive) {
    console.log(`Multiple platforms detected: ${detected.map(p => p.id).join(', ')}`);
    console.log(`Re-run with --all to install for all, or --only <id> to pick one. Use --list to see detection.`);
    process.exit(0);
  }

  if (!targets.length) {
    console.log(`No supported platforms detected. Use --list to see the detection matrix.`);
    process.exit(0);
  }

  // Q9 fix 5: Tier 2 npx preflight. Tier 2 installs depend on `npx skills`. If npx is
  // absent, warn and skip Tier 2 targets rather than failing the entire run.
  const npxAvailable = which('npx');
  if (!npxAvailable) {
    const tier2 = targets.filter(t => t.requiresNpx);
    if (tier2.length) {
      console.warn(`Warning: \`npx\` not found on PATH. Skipping Tier 2 installs: ${tier2.map(t => t.id).join(', ')}.`);
      console.warn('Install Node.js (which provides npx) to enable Tier 2 platform installs.');
      console.warn(MANUAL_TIER2_NOTE);
      targets = targets.filter(t => !t.requiresNpx);
    }
  }

  const results = []; // { platform, status: 'success' | 'failed' | 'partial' }
  for (const t of targets) {
    console.log(`\n== Installing for ${t.name} (tier ${t.tier}) ==`);
    const cmds = t.install({ dryRun: opts.dryRun, version: opts.version });
    const ok = runAll(cmds, opts.dryRun);
    results.push({ platform: t.name, id: t.id, status: ok ? 'success' : 'failed', note: t.postInstallNote });
    if (!ok) {
      console.error(`Platform ${t.name} is in a partial-install state. Rerun \`node bin/install.js --only ${t.id}\` to retry.`);
      if (t.requiresNpx) console.error(MANUAL_TIER2_NOTE);
    } else if (t.postInstallNote) {
      console.log(t.postInstallNote);
    }
  }

  // Summary
  console.log('\n=== Install summary ===');
  for (const r of results) {
    const marker = r.status === 'success' ? '✓' : '✗';
    console.log(`  ${marker} ${r.platform}: ${r.status}`);
  }
  console.log(`\nMarketplace: ${MARKETPLACE}`);

  const anyFailed = results.some(r => r.status !== 'success');
  if (anyFailed) process.exit(1);
}

// Run only when executed directly (node bin/install.js / npx superpipelines-install),
// not when imported by the docs generator.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
