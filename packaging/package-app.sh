#!/bin/bash

# Ensure working directory is set to the project root directory
cd "$(dirname "$0")/.."

echo "Building and Packaging e-abhilekh Application (Cross-Platform)..."

# 0. Auto-increment version
echo "[0/3] Auto-incrementing version..."
if command -v python3 >/dev/null 2>&1; then
    python3 packaging/increment_version.py
elif command -v python >/dev/null 2>&1; then
    python packaging/increment_version.py
else
    echo "[WARNING] Python is not installed or not in PATH. Version incrementing skipped."
fi

# 1. Build Spring Boot Java Backend
echo "[1/3] Packaging Java backend using Maven..."
if command -v mvn >/dev/null 2>&1; then
    (cd backend && mvn clean package)
    if [ $? -ne 0 ]; then
        echo "[ERROR] Maven packaging failed!"
        exit 1
    fi
else
    echo "[ERROR] Maven (mvn) is not installed or not in PATH. Cannot package backend."
    exit 1
fi

# 2. Build React Production Assets
echo "[2/3] Building React frontend production assets..."
if command -v npm >/dev/null 2>&1; then
    (cd frontend && npm install && npm run build)
    if [ $? -ne 0 ]; then
        echo "[ERROR] React build failed!"
        exit 1
    fi
else
    echo "[ERROR] npm is not installed or not in PATH. Cannot package frontend."
    exit 1
fi

# 3. Packaging Electron Application Info
echo "[3/3] Packaging steps complete!"
echo ""
echo "- Backend executable: backend/target/e-abhilekh-*.jar"
echo "- Frontend build folder: frontend/build/"
echo ""
echo "You can test this compiled release by running Electron pointing to local production files."
