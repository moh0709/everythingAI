@echo off
setlocal

REM EverythingAI full local MVP debug startup script
REM This script pulls latest main, validates/builds the UI, then starts:
REM - Backend API on http://127.0.0.1:4100
REM - User UI on http://localhost:5151
REM - Admin UI on http://localhost:5152/admin.html

set "PROJECT_ROOT=E:\01PROJEKTER\EverythingAI"
set "API_DIR=%PROJECT_ROOT%\services\api"
set "UI_DIR=%PROJECT_ROOT%\apps\everything-ai-ui"

echo.
echo ========================================
echo EverythingAI Full Debug Startup
echo ========================================
echo.

if not exist "%PROJECT_ROOT%\.git" (
  echo ERROR: Project root not found or not a Git repository:
  echo %PROJECT_ROOT%
  exit /b 1
)

if not exist "%API_DIR%\package.json" (
  echo ERROR: API package.json not found:
  echo %API_DIR%\package.json
  exit /b 1
)

if not exist "%UI_DIR%\package.json" (
  echo ERROR: UI package.json not found:
  echo %UI_DIR%\package.json
  exit /b 1
)

cd /d "%PROJECT_ROOT%"
if errorlevel 1 (
  echo ERROR: Could not enter project root:
  echo %PROJECT_ROOT%
  exit /b 1
)

echo [1/5] Pulling latest main...
git pull origin main
if errorlevel 1 (
  echo.
  echo ERROR: git pull failed.
  echo If you see a dubious ownership error, run:
  echo git config --global --add safe.directory %PROJECT_ROOT%
  exit /b 1
)

echo.
echo [2/5] Installing backend dependencies if needed...
cd /d "%API_DIR%"
call npm install
if errorlevel 1 (
  echo.
  echo ERROR: Backend npm install failed.
  exit /b 1
)

echo.
echo [3/5] Installing UI dependencies if needed...
cd /d "%UI_DIR%"
call npm install
if errorlevel 1 (
  echo.
  echo ERROR: UI npm install failed.
  exit /b 1
)

echo.
echo [4/5] Validating UI typecheck and production build...
call npm run typecheck
if errorlevel 1 (
  echo.
  echo ERROR: UI typecheck failed. Fix the errors above before continuing.
  exit /b 1
)

call npm run build
if errorlevel 1 (
  echo.
  echo ERROR: UI build failed. Fix the errors above before continuing.
  exit /b 1
)

echo.
echo [5/5] Starting local debug services in separate windows...
echo.
echo Backend API: http://127.0.0.1:4100
echo User UI:     http://localhost:5151
echo Admin UI:    http://localhost:5152/admin.html
echo.

start "EverythingAI API :4100" cmd /k "cd /d "%API_DIR%" && npm run dev"
start "EverythingAI User UI :5151" cmd /k "cd /d "%UI_DIR%" && npm run dev"
start "EverythingAI Admin UI :5152" cmd /k "cd /d "%UI_DIR%" && npm run dev:admin"

echo All debug windows were started.
echo Keep this window open for reference or close it when done.
echo.
pause

endlocal
