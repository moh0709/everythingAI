@echo off
REM Start batch file - launches backend and frontend in separate windows

echo ========================================
echo Starting EverythingAI Backend & Frontend
echo ========================================
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.

REM Start Backend in a new window
echo [1/2] Starting Backend API Server...
start "EverythingAI Backend" cmd /k "cd services\api && npm start"

REM Wait a moment for backend to start
timeout /t 3 /nobreak

REM Start Frontend in a new window
echo [2/2] Starting Frontend Dev Server...
start "EverythingAI Frontend" cmd /k "cd apps\everything-ai-ui && npm run dev"

echo.
echo ========================================
echo Both servers starting...
echo Press Ctrl+C in each window to stop
echo ========================================
