@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM EverythingAI local validation helper for Windows.
REM This script frees common local dev ports, pulls latest main, runs typecheck,
REM builds the UI, and runs the local smoke runner.

cd /d "%~dp0.."

echo.
echo ============================================================
echo EverythingAI - clean ports and run local smoke validation
echo Working folder: %CD%
echo ============================================================
echo.

set "PORTS=4100 5151 5152 5153 5154 5155"

for %%P in (%PORTS%) do (
  echo Checking port %%P...
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    set "PID=%%A"
    if not "!PID!"=="" (
      echo Stopping process on port %%P with PID !PID!
      taskkill /PID !PID! /F >nul 2>nul
      if errorlevel 1 (
        echo WARNING: Could not stop PID !PID!. Try running this file as Administrator.
      ) else (
        echo Stopped PID !PID!.
      )
    )
  )
)

echo.
echo Verifying frontend port 5151...
netstat -ano | findstr /R /C:":5151 .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo ERROR: Port 5151 is still occupied.
  echo Close old UI/API terminals or run this file as Administrator, then try again.
  exit /b 1
)

echo Port 5151 is free.
echo.

echo Pulling latest main...
git pull
if errorlevel 1 (
  echo ERROR: git pull failed.
  exit /b 1
)

echo.
echo Running typecheck...
call npm run typecheck
if errorlevel 1 (
  echo ERROR: typecheck failed.
  exit /b 1
)

echo.
echo Running production build...
call npm run build
if errorlevel 1 (
  echo ERROR: build failed.
  exit /b 1
)

echo.
echo Running local smoke runner...
node scripts/run-smoke-with-servers.mjs
if errorlevel 1 (
  echo ERROR: smoke runner failed.
  exit /b 1
)

echo.
echo ============================================================
echo EverythingAI local validation completed successfully.
echo Expected final smoke result: 4 passed.
echo ============================================================
echo.

endlocal
