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
set "STOPPED_PORTS="
set "GIT_RESULT=NOT RUN"
set "TYPECHECK_RESULT=NOT RUN"
set "BUILD_RESULT=NOT RUN"
set "SMOKE_RESULT=NOT RUN"

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
        set "STOPPED_PORTS=!STOPPED_PORTS! %%P"
      )
    )
  )
)

if "%STOPPED_PORTS%"=="" (
  set "STOPPED_PORTS=none"
)

echo.
echo Verifying frontend port 5151...
netstat -ano | findstr /R /C:":5151 .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo ERROR: Port 5151 is still occupied.
  echo Close old UI/API terminals or run this file as Administrator, then try again.
  echo.
  echo === EVERYTHINGAI VALIDATION SUMMARY ===
  echo Port cleanup: FAILED - port 5151 still occupied
  echo Stopped ports: %STOPPED_PORTS%
  echo Git pull: %GIT_RESULT%
  echo Typecheck: %TYPECHECK_RESULT%
  echo Build: %BUILD_RESULT%
  echo Smoke: %SMOKE_RESULT%
  echo Final result: FAILED
  echo Copy this summary back to ChatGPT.
  echo =======================================
  exit /b 1
)

echo Port 5151 is free.
echo.

echo Pulling latest main...
git pull
if errorlevel 1 (
  set "GIT_RESULT=FAILED"
  echo ERROR: git pull failed.
  echo.
  echo === EVERYTHINGAI VALIDATION SUMMARY ===
  echo Port cleanup: PASS
  echo Stopped ports: %STOPPED_PORTS%
  echo Git pull: %GIT_RESULT%
  echo Typecheck: %TYPECHECK_RESULT%
  echo Build: %BUILD_RESULT%
  echo Smoke: %SMOKE_RESULT%
  echo Final result: FAILED
  echo Copy this summary back to ChatGPT.
  echo =======================================
  exit /b 1
)
set "GIT_RESULT=PASS"

echo.
echo Running typecheck...
call npm run typecheck
if errorlevel 1 (
  set "TYPECHECK_RESULT=FAILED"
  echo ERROR: typecheck failed.
  echo.
  echo === EVERYTHINGAI VALIDATION SUMMARY ===
  echo Port cleanup: PASS
  echo Stopped ports: %STOPPED_PORTS%
  echo Git pull: %GIT_RESULT%
  echo Typecheck: %TYPECHECK_RESULT%
  echo Build: %BUILD_RESULT%
  echo Smoke: %SMOKE_RESULT%
  echo Final result: FAILED
  echo Copy this summary back to ChatGPT.
  echo =======================================
  exit /b 1
)
set "TYPECHECK_RESULT=PASS"

echo.
echo Running production build...
call npm run build
if errorlevel 1 (
  set "BUILD_RESULT=FAILED"
  echo ERROR: build failed.
  echo.
  echo === EVERYTHINGAI VALIDATION SUMMARY ===
  echo Port cleanup: PASS
  echo Stopped ports: %STOPPED_PORTS%
  echo Git pull: %GIT_RESULT%
  echo Typecheck: %TYPECHECK_RESULT%
  echo Build: %BUILD_RESULT%
  echo Smoke: %SMOKE_RESULT%
  echo Final result: FAILED
  echo Copy this summary back to ChatGPT.
  echo =======================================
  exit /b 1
)
set "BUILD_RESULT=PASS"

echo.
echo Running local smoke runner...
node scripts/run-smoke-with-servers.mjs
if errorlevel 1 (
  set "SMOKE_RESULT=FAILED"
  echo ERROR: smoke runner failed.
  echo.
  echo === EVERYTHINGAI VALIDATION SUMMARY ===
  echo Port cleanup: PASS
  echo Stopped ports: %STOPPED_PORTS%
  echo Git pull: %GIT_RESULT%
  echo Typecheck: %TYPECHECK_RESULT%
  echo Build: %BUILD_RESULT%
  echo Smoke: %SMOKE_RESULT%
  echo Final result: FAILED
  echo Copy this summary back to ChatGPT.
  echo =======================================
  exit /b 1
)
set "SMOKE_RESULT=PASS - Playwright smoke completed successfully"

echo.
echo ============================================================
echo EverythingAI local validation completed successfully.
echo ============================================================
echo.
echo === EVERYTHINGAI VALIDATION SUMMARY ===
echo Port cleanup: PASS
echo Stopped ports: %STOPPED_PORTS%
echo Git pull: %GIT_RESULT%
echo Typecheck: %TYPECHECK_RESULT%
echo Build: %BUILD_RESULT%
echo Smoke: %SMOKE_RESULT%
echo Final result: GREEN
echo Report this to ChatGPT: GREEN - git pull PASS, typecheck PASS, build PASS, smoke PASS.
echo =======================================
echo.

endlocal
