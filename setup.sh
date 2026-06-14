#!/usr/bin/env bash
# setup.sh - Onboarding setup script for Unix-like environments

echo "==================================================="
echo "  e-abhilekh Developer Onboarding Setup"
echo "==================================================="
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
else
    echo "[INFO] Found Node.js: $(node -v)"
fi

# 2. Check NPM
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm is not installed."
    exit 1
else
    echo "[INFO] Found npm: $(npm -v)"
fi

# 3. Check Java
if ! command -v java &> /dev/null; then
    echo "[WARNING] java not found. Please install JDK 21+ for backend operations."
else
    echo "[INFO] Found Java: $(java -version 2>&1 | head -n 1)"
fi

# Install dependencies
echo ""
echo "Installing dependencies in the frontend directory..."
cd frontend && npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install npm dependencies."
    exit 1
fi
cd ..
echo "[SUCCESS] Dependencies installed successfully."
echo ""

echo "==================================================="
echo "  Setup completed successfully!"
echo "==================================================="
echo "To run the application in development mode:"
echo "  - Run 'bash dev.sh'"
echo ""
echo "To build and package the desktop app:"
echo "  - Run 'bash build.sh'"
echo "==================================================="
