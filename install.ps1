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
