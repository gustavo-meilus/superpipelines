# Multi-Platform Sub-Plan 4 — Universal Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Node.js unified installer (`bin/install.js`) plus shell/PowerShell wrappers (`install.sh`, `install.ps1`) that auto-detects supported platforms (Claude Code, Codex, Cursor, Windsurf, Cline, OpenCode redirect, Antigravity) and runs the appropriate per-platform install command for Superpipelines.

**Architecture:** One Node.js entrypoint with a detection matrix and per-platform install handlers. No dependencies outside Node's standard library (`fs`, `path`, `child_process`, `os`). Shell wrappers fetch the script via curl/irm and exec with detected node binary. Mirrors caveman's `install.sh` + `bin/install.js` topology.

**Tech Stack:** Node.js ≥18 (zero external deps), Bash (POSIX), PowerShell 5.1+.

---

## File Structure

**Create:**
- `bin/install.js` — Main detection + install logic.
- `install.sh` — POSIX shell wrapper (macOS/Linux/WSL).
- `install.ps1` — PowerShell wrapper (Windows).

**Modify:**
- `package.json` — Add `bin` field exposing `superpipelines-install` and `engines.node`.

**Unchanged:** Manifests from sub-plan 3 (the installer reads them but does not modify them).

---

## Task 1: Add bin field to package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Read current package.json**

Run: `cat package.json`
Expected (verified at plan-write time — `package.json` is exactly 5 lines):

```json
{
  "name": "superpipelines",
  "version": "1.0.6",
  "type": "module"
}
```

If the file differs (e.g., `bin` or `engines` already present from a prior partial run), STOP and reconcile manually before editing — do not duplicate fields.

- [ ] **Step 2: Add `bin` and `engines` fields**

Use Edit with `old_string`:

```
  "type": "module"
}
```

`new_string`:

```
  "type": "module",
  "bin": {
    "superpipelines-install": "./bin/install.js"
  },
  "engines": {
    "node": ">=18"
  }
}
```

- [ ] **Step 3: Validate JSON**

Run: `python3 -c "import json; p=json.load(open('package.json')); assert p['bin']['superpipelines-install'] == './bin/install.js'; assert p['engines']['node'].startswith('>='); print('OK')"`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat(installer): expose superpipelines-install bin and require node>=18"
```

---

## Task 2: Create bin/install.js (detection matrix + dispatch)

**Files:**
- Create: `bin/install.js`

- [ ] **Step 1: Confirm bin/ does not exist**

Run: `ls bin/ 2>&1 || echo MISSING`
Expected: `MISSING`.

- [ ] **Step 2: Write the installer**

Create `bin/install.js` with this exact content:

```javascript
#!/usr/bin/env node
// Superpipelines universal installer.
// Auto-detects supported platforms and runs the appropriate per-platform install command.
// Zero external dependencies — pure node:fs / node:child_process / node:os.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync, spawnSync } = require('node:child_process');

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
    tier: 1,
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
    tier: 2,
    detect: () => dirExists('.cursor'),
    install: ({ dryRun }) => runAll([`npx -y skills add superpipelines -a cursor`], dryRun),
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    tier: 2,
    detect: () => dirExists('.windsurf'),
    install: ({ dryRun }) => runAll([`npx -y skills add superpipelines -a windsurf`], dryRun),
  },
  {
    id: 'cline',
    name: 'Cline',
    tier: 2,
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
```

- [ ] **Step 3: Make executable**

Run: `chmod +x bin/install.js`
Expected: no output, exit 0.

- [ ] **Step 4: Smoke-test `--help`**

Run: `node bin/install.js --help`
Expected: prints the Usage block.

- [ ] **Step 5: Smoke-test `--list`**

Run: `node bin/install.js --list`
Expected: prints a table with columns `Platform`, `Tier`, `Detected` and one row per platform id (`claude-code`, `codex`, `cursor`, `windsurf`, `cline`, `opencode`, `antigravity`).

- [ ] **Step 6: Smoke-test `--dry-run --all`**

Run: `node bin/install.js --dry-run --all`
Expected: prints `[dry-run] ...` lines for every detected platform OR `No supported platforms detected.` if none are installed in the test environment. Exit 0.

- [ ] **Step 7: Smoke-test unknown flag rejection**

Run: `node bin/install.js --bogus; echo "exit=$?"`
Expected: error `Unknown flag: --bogus`, then Usage printed, then `exit=2`.

- [ ] **Step 8: Commit**

```bash
git add bin/install.js
git commit -m "feat(installer): add bin/install.js universal Node.js installer"
```

---

## Task 3: Create install.sh POSIX wrapper

**Files:**
- Create: `install.sh`

- [ ] **Step 1: Write the wrapper**

Create `install.sh` with this exact content:

```bash
#!/usr/bin/env bash
# Superpipelines installer — POSIX wrapper.
# Fetches bin/install.js from the repo and execs it under the local node.
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/gustavo-meilus/superpipelines/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/gustavo-meilus/superpipelines/main/install.sh | bash -s -- --dry-run --all

set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/gustavo-meilus/superpipelines/main"
SCRIPT_URL="${REPO_RAW}/bin/install.js"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node (>=18) is required on PATH." >&2
  echo "Install from https://nodejs.org/ then re-run." >&2
  exit 1
fi

NODE_MAJOR=$(node -e 'console.log(process.versions.node.split(".")[0])')
if [ "${NODE_MAJOR}" -lt 18 ]; then
  echo "Error: node >= 18 required (found $(node -v))." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t 'superpipelines-install')"
TMP="${TMP_DIR}/install.js"
trap 'rm -rf "${TMP_DIR}"' EXIT

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "${SCRIPT_URL}" -o "${TMP}"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "${TMP}" "${SCRIPT_URL}"
else
  echo "Error: curl or wget required." >&2
  exit 1
fi

exec node "${TMP}" "$@"
```

- [ ] **Step 2: Make executable**

Run: `chmod +x install.sh`

- [ ] **Step 3: Syntax check**

Run: `bash -n install.sh && echo OK`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add install.sh
git commit -m "feat(installer): add install.sh POSIX wrapper (curl | bash)"
```

---

## Task 4: Create install.ps1 PowerShell wrapper

**Files:**
- Create: `install.ps1`

- [ ] **Step 1: Write the wrapper**

Create `install.ps1` with this exact content:

```powershell
# Superpipelines installer — PowerShell wrapper.
# Fetches bin/install.js from the repo and runs it under the local node.
# Usage:
#   irm https://raw.githubusercontent.com/gustavo-meilus/superpipelines/main/install.ps1 | iex
#   iex "& { $(irm https://raw.githubusercontent.com/gustavo-meilus/superpipelines/main/install.ps1) } --dry-run --all"

$ErrorActionPreference = 'Stop'

$ScriptUrl = 'https://raw.githubusercontent.com/gustavo-meilus/superpipelines/main/bin/install.js'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error 'node (>=18) is required on PATH. Install from https://nodejs.org/ and re-run.'
    exit 1
}

$NodeVer = (& node -e 'console.log(process.versions.node.split(".")[0])')
if ([int]$NodeVer -lt 18) {
    Write-Error "node >= 18 required (found $(& node -v))."
    exit 1
}

$Tmp = New-TemporaryFile
try {
    Invoke-WebRequest -Uri $ScriptUrl -OutFile $Tmp.FullName -UseBasicParsing
    & node $Tmp.FullName @args
    exit $LASTEXITCODE
} finally {
    Remove-Item $Tmp.FullName -ErrorAction SilentlyContinue
}
```

- [ ] **Step 2: PowerShell syntax sanity (skip if pwsh unavailable)**

Run: `command -v pwsh >/dev/null && pwsh -NoProfile -Command "[scriptblock]::Create((Get-Content -Raw install.ps1)) | Out-Null; 'OK'" || echo "pwsh not available; skipping"`
Expected: `OK` if pwsh is installed; `pwsh not available; skipping` otherwise.

- [ ] **Step 3: Commit**

```bash
git add install.ps1
git commit -m "feat(installer): add install.ps1 PowerShell wrapper (irm | iex)"
```

---

## Task 5: End-of-batch verification

**Files:** none

- [ ] **Step 1: Run combined verification**

```bash
echo "--- Files exist ---" && \
test -x bin/install.js && \
test -x install.sh && \
test -f install.ps1 && \
echo "FILES PRESENT" && \
echo "--- bin/install.js --help works ---" && \
node bin/install.js --help | grep -q 'Usage: superpipelines-install' && \
echo "HELP OK" && \
echo "--- bin/install.js --list works ---" && \
node bin/install.js --list | grep -q '^claude-code' && \
echo "LIST OK" && \
echo "--- package.json bin field ---" && \
python3 -c "import json; assert json.load(open('package.json'))['bin']['superpipelines-install'] == './bin/install.js'" && \
echo "PACKAGE.JSON OK" && \
echo "--- install.sh syntax ---" && \
bash -n install.sh && \
echo "INSTALL.SH OK" && \
echo "ALL INSTALLER COMPONENTS PRESENT"
```

Expected: final line `ALL INSTALLER COMPONENTS PRESENT`.

---

## Out of scope

- Per-platform install command verification against real CC/Codex/Antigravity binaries — handled in QA / smoke-test before tagging v2.0.0.
- `--with-init` rule-file dropping logic — reserved flag; no-op in v2.0.0.
- Real uninstall logic — stubbed message in v2.0.0; full implementation deferred to v2.1.

---

## Self-Review Checklist

1. **Spec coverage:** Spec §9 (Installer Design) — detection matrix and all listed flags (`--all`, `--only`, `--dry-run`, `--list`, `--uninstall`, `--non-interactive`, `--with-init`) are present in `bin/install.js` Task 2. ✅
2. **Placeholder scan:** No `TBD`/`TODO` in shipped code. `--with-init` and `--uninstall` are intentionally stubbed with explicit "reserved" / "not yet implemented" messages — not hidden placeholders. ✅
3. **Type/name consistency:** Platform IDs (`claude-code`, `codex`, `cursor`, `windsurf`, `cline`, `opencode`, `antigravity`) match spec §9 detection-matrix table exactly. Bin name `superpipelines-install` consistent between Task 1 (package.json), Task 2 (install.js help text), and Task 5 (verification). ✅
