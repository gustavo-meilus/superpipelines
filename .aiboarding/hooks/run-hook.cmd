: << 'CMDBLOCK'
@echo off
REM Cross-platform polyglot wrapper for aiboarding hook scripts.
REM Windows: cmd runs this batch block, finds Git Bash, calls the named script.
REM Unix: bash treats this block as a heredoc no-op and runs the tail below.
REM Usage: run-hook.cmd <script-name> [args...]
REM NOTE: extra args are forwarded as %2-%9 (max 8) and are NOT space-safe on
REM Windows. Current callers pass only the script name, so this is not exercised.
if "%~1"=="" (
    echo run-hook.cmd: missing script name >&2
    exit /b 1
)
set "HOOK_DIR=%~dp0"
if exist "C:\Program Files\Git\bin\bash.exe" (
    "C:\Program Files\Git\bin\bash.exe" "%HOOK_DIR%%~1" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %ERRORLEVEL%
)
if exist "C:\Program Files (x86)\Git\bin\bash.exe" (
    "C:\Program Files (x86)\Git\bin\bash.exe" "%HOOK_DIR%%~1" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %ERRORLEVEL%
)
where bash >nul 2>nul
if %ERRORLEVEL% equ 0 (
    bash "%HOOK_DIR%%~1" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %ERRORLEVEL%
)
REM No bash found - exit silently so the project still works without injection.
exit /b 0
CMDBLOCK

# Unix: run the named script directly.
if [ -z "${1:-}" ]; then
  echo "run-hook.cmd: missing script name" >&2
  exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_NAME="$1"
shift
exec bash "${SCRIPT_DIR}/${SCRIPT_NAME}" "$@"
