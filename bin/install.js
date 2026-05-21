#!/usr/bin/env node
// Superpipelines universal installer.
// Auto-detects supported platforms and runs the appropriate per-platform install command.
// Zero external dependencies — pure node:fs / node:child_process / node:os.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync, spawnSync } from 'node:child_process';

const REPO = 'gustavo-meilus/superpipelines';
const MARKETPLACE = `https://github.com/${REPO}`;
const OPENCODE_REPO = 'https://github.com/gustavo-meilus/superpipelines-opencode';

function which(binary) {
  const cmd = process.platform === 'win32' ? `where ${binary}` : `command -v ${binary}`;
  const r = spawnSync(cmd, { shell: true, stdio: 'ignore' });
  return r.status === 0;
}

function dirExists(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

const PLATFORMS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    tier: '1',
    detect: () => which('claude'),
    install: ({ dryRun }) => {
      const cmds = [
        `claude plugin marketplace add ${MARKETPLACE}`,
        `claude plugin install superpipelines@superpipelines`,
      ];
      runAll(cmds, dryRun);
    },
  },
  {
    id: 'codex',
    name: 'Codex App/CLI',
    tier: '1d',
    detect: () => which('codex') || dirExists(path.join(os.homedir(), '.codex')),
    install: ({ dryRun }) => {
      // NOTE: Codex plugin-install command syntax is not publicly stabilized at v2.0.0 release.
      // The form below is best-guess from spec §9; verify against `codex plugin --help` before tagging.
      // If the verified command differs, patch this handler in v2.0.1.
      const cmds = [
        `codex plugin add ${MARKETPLACE}`,
      ];
      runAll(cmds, dryRun);
    },
  },
  {
    id: 'cursor',
    name: 'Cursor',
    tier: '2',
    detect: () => dirExists('.cursor'),
    install: ({ dryRun }) => runAll([`npx -y skills add superpipelines -a cursor`], dryRun),
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    tier: '2',
    detect: () => dirExists('.windsurf'),
    install: ({ dryRun }) => runAll([`npx -y skills add superpipelines -a windsurf`], dryRun),
  },
  {
    id: 'cline',
    name: 'Cline',
    tier: '2',
    detect: () => dirExists('.clinerules') || dirExists('.cline'),
    install: ({ dryRun }) => runAll([`npx -y skills add superpipelines -a cline`], dryRun),
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    tier: '1b',
    detect: () => which('opencode') || dirExists('.opencode'),
    install: () => {
      console.log(`OpenCode detected. Install Superpipelines for OpenCode from the sibling repo:`);
      console.log(`  ${OPENCODE_REPO}`);
      console.log(`(OpenCode requires a separate plugin bundle; this repo targets CC/Codex/Cursor/Antigravity.)`);
    },
  },
  {
    id: 'antigravity',
    name: 'Antigravity CLI 2.0',
    tier: '1c',
    detect: () => which('agy'),
    install: ({ dryRun }) => {
      const cmds = [
        `agy plugin install superpipelines@superpipelines`,
      ];
      runAll(cmds, dryRun);
      console.log(`If upgrading from a Gemini CLI extension, run:  agy plugin import gemini`);
    },
  },
];

function runAll(cmds, dryRun) {
  for (const cmd of cmds) {
    if (dryRun) {
      console.log(`[dry-run] ${cmd}`);
    } else {
      console.log(`+ ${cmd}`);
      try { execSync(cmd, { stdio: 'inherit' }); }
      catch (e) { console.error(`FAILED: ${cmd}`); process.exitCode = 1; }
    }
  }
}

function parseArgs(argv) {
  const out = { all: false, only: [], dryRun: false, list: false, uninstall: false, nonInteractive: false, withInit: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') out.all = true;
    else if (a === '--only') out.only.push(argv[++i]);
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--list') out.list = true;
    else if (a === '--uninstall') out.uninstall = true;
    else if (a === '--non-interactive') out.nonInteractive = true;
    else if (a === '--with-init') out.withInit = true;
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else { console.error(`Unknown flag: ${a}`); printHelp(); process.exit(2); }
  }
  return out;
}

function printHelp() {
  console.log(`Usage: superpipelines-install [flags]

Flags:
  --all                 Install for all detected platforms
  --only <id>           Install for one platform (repeatable); id ∈ {claude-code, codex, cursor, windsurf, cline, opencode, antigravity}
  --dry-run             Print commands; write nothing
  --list                Print detection matrix and exit
  --uninstall           Remove the plugin from every detected platform
  --with-init           Also drop rule files into the current repo (.cursor/rules/, etc.) — reserved; no-op in v2.0.0
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

function uninstallAll(opts) {
  for (const p of detectAll().filter(x => x.detected)) {
    console.log(`Uninstall for ${p.name}: not yet implemented — remove via the platform's own plugin manager.`);
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.list) return listDetection();
  if (opts.uninstall) return uninstallAll(opts);

  const detected = detectAll().filter(p => p.detected);
  let targets = detected;

  if (opts.only.length) {
    targets = PLATFORMS.filter(p => opts.only.includes(p.id));
    const undetected = targets.filter(t => !detected.includes(t)).map(t => t.id);
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

  for (const t of targets) {
    console.log(`\n== Installing for ${t.name} (tier ${t.tier}) ==`);
    t.install({ dryRun: opts.dryRun });
  }

  console.log(`\nDone. See ${MARKETPLACE} for usage.`);
}

main();
