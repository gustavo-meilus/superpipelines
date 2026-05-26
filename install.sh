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
