#!/bin/bash

# Clear screen
clear

echo "==================================================="
echo "  DevGenAI - AI-Powered DevOps Platform Startup"
echo "==================================================="
echo ""

# 1. Check Node.js
echo "[1/5] Checking Node.js installation..."
if ! command -v node &> /dev/null
then
    echo ""
    echo "ERROR: Node.js is not installed."
    echo "Please download and install Node.js from https://nodejs.org/"
    echo ""
    exit 1
fi
echo "Node.js is installed: $(node -v)"
echo ""

# 2. Check Docker
echo "[2/5] Checking Docker status..."
if ! docker info &> /dev/null
then
    echo ""
    echo "WARNING: Docker Daemon/Desktop is not running or not started."
    echo "Docker container monitoring features will be inactive."
    echo "Please start Docker Desktop to enable full container features."
    echo ""
else
    echo "Docker Daemon is running."
fi
echo ""

# 3. Backend Dependencies
echo "[3/5] Checking Backend Dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies (this may take a minute)..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Backend installation failed."
        exit 1
    fi
else
    echo "Backend dependencies already installed."
fi
cd ..
echo ""

# 4. Frontend Dependencies & Build
echo "[4/5] Checking Frontend Dependencies & Building..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies (this may take a minute)..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Frontend installation failed."
        exit 1
    fi
else
    echo "Frontend dependencies already installed."
fi
echo "Building React frontend for Electron packaging..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Frontend build failed."
    exit 1
fi
cd ..
echo ""

# 5. Launch Services
echo "[5/5] Launching backend server and Electron desktop app..."
echo ""

# Start backend in background and save PID
echo "Starting backend server..."
cd backend
npm start > backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Cleanup function to kill backend when frontend exits
cleanup() {
    echo ""
    echo "Stopping backend server (PID $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null
    exit 0
}

# Trap exit signals to ensure cleanup runs
trap cleanup EXIT INT TERM

echo "Launching Electron Application..."
cd frontend
npm run electron
cd ..

echo "DevGenAI application closed."
