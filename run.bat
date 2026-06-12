@echo off
title DevGenAI Platform Control
cls
echo ===================================================
echo   DevGenAI - AI-Powered DevOps Platform Startup
echo ===================================================
echo.

:: 1. Check Node.js
echo [1/5] Checking Node.js installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Node.js is not installed or not in your PATH.
    echo Please download and install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo Node.js is installed.
echo.

:: 2. Check Docker Desktop
echo [2/5] Checking Docker status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Docker Desktop is not running or not started.
    echo Docker container monitoring features will be inactive.
    echo Please start Docker Desktop to enable full container features.
    echo.
) else (
    echo Docker Daemon is running.
)
echo.

:: 3. Install Backend Dependencies
echo [3/5] Checking Backend Dependencies...
cd backend
if not exist node_modules (
    echo Installing backend dependencies (this may take a minute)...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Backend installation failed.
        pause
        exit /b 1
    )
) else (
    echo Backend dependencies already installed.
)
cd ..
echo.

:: 4. Install Frontend Dependencies & Build Assets
echo [4/5] Checking Frontend Dependencies & Building...
cd frontend
if not exist node_modules (
    echo Installing frontend dependencies (this may take a minute)...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Frontend installation failed.
        pause
        exit /b 1
    )
) else (
    echo Frontend dependencies already installed.
)
echo Building React frontend for Electron packaging...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed.
    pause
    exit /b 1
)
cd ..
echo.

:: 5. Launch Services
echo [5/5] Launching backend server and Electron desktop app...
echo.
echo Starting backend server in a new window...
start "DevGenAI Backend Logs" cmd /c "cd backend && npm start"

echo Launching Electron Application...
cd frontend
call npm run electron
cd ..

echo.
echo DevGenAI application closed.
echo If the backend console is still open, you can close it manually.
echo ===================================================
