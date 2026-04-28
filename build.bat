@echo off
REM Build batch file - installs dependencies for backend and frontend
REM This prepares the project for running

echo ========================================
echo Building EverythingAI Project
echo ========================================

REM Build Backend
echo.
echo [1/3] Installing backend dependencies...
cd services\api
call npm install
if errorlevel 1 (
    echo Error installing backend dependencies!
    exit /b 1
)

REM Build Frontend  
echo.
echo [2/3] Installing frontend dependencies...
cd ..\..\apps\everything-ai-ui
call npm install
if errorlevel 1 (
    echo Error installing frontend dependencies!
    exit /b 1
)

REM Optional: Build frontend for production
echo.
echo [3/3] Building frontend for production...
call npm run build
if errorlevel 1 (
    echo Warning: Frontend build failed, but dev mode may still work
)

echo.
echo ========================================
echo Build Complete! 
echo Ready to run: start.bat
echo ========================================

cd ..\..\
