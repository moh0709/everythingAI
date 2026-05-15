@echo off
setlocal

REM EverythingAI UI debug startup script
REM This script pulls latest main, typechecks the UI, builds it, and starts the user UI dev server.

set "PROJECT_ROOT=E:\01PROJEKTER\EverythingAI"
set "UI_DIR=%PROJECT_ROOT%\apps\everything-ai-ui"

echo.
echo ========================================
echo EverythingAI Debug Startup
echo ========================================
echo.

if not exist "%PROJECT_ROOT%\.git" (
  echo ERROR: Project root not found or not a Git repository:
  echo %PROJECT_ROOT%
  exit /b 1
)

cd /d "%PROJECT_ROOT%"
if errorlevel 1 (
  echo ERROR: Could not enter project root:
  echo %PROJECT_ROOT%
  exit /b 1
)

echo [1/4] Pulling latest main...
git pull origin main
if errorlevel 1 (
  echo.
  echo ERROR: git pull failed.
  echo If you see a dubious ownership error, run:
  echo git config --global --add safe.directory %PROJECT_ROOT%
  exit /b 1
)

if not exist "%UI_DIR%\package.json" (
  echo ERROR: UI package.json not found:
  echo %UI_DIR%\package.json
  exit /b 1
)

cd /d "%UI_DIR%"
if errorlevel 1 (
  echo ERROR: Could not enter UI directory:
  echo %UI_DIR%
  exit /b 1
)

echo.
echo [2/4] Running TypeScript typecheck...
call npm run typecheck
if errorlevel 1 (
  echo.
  echo ERROR: Typecheck failed. Fix the errors above before continuing.
  exit /b 1
)

echo.
echo [3/4] Running production build...
call npm run build
if errorlevel 1 (
  echo.
  echo ERROR: Build failed. Fix the errors above before continuing.
  exit /b 1
)

echo.
echo [4/4] Starting user UI dev server...
echo URL: http://localhost:5151
echo.
call npm run dev

endlocal
