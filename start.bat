@echo off
REM Start batch file - launches backend and frontend in separate windows

echo ========================================
echo Starting EverythingAI Backend & Frontend
echo ========================================
echo.
echo Backend API: http://localhost:4100
echo Official EverythingAI UI: http://localhost:5151
echo.

REM Start Backend in a new window
echo [1/2] Starting Backend API Server...
start "EverythingAI Backend" cmd /k "cd services\api && npm start"

REM Wait a moment for backend to start
timeout /t 3 /nobreak

REM Start Frontend in a new window
echo [2/2] Starting Official EverythingAI UI...
start "EverythingAI Frontend" cmd /k "cd apps\everything-ai-ui && npm run dev"

echo.
echo ========================================
echo EverythingAI MVP startup initiated

echo User UI: http://localhost:5151

echo API: http://localhost:4100

echo ========================================
echo Press Ctrl+C in each window to stop

echo ========================================
