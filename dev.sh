#!/usr/bin/env bash
# dev.sh - Runs Spring Boot and React/Electron concurrently

# Copy config file
if [ -f "app.config.json" ]; then
    cp -f "app.config.json" "frontend/src/app.config.json"
    cp -f "app.config.json" "backend/src/main/resources/app.config.json"
fi

# Run Spring Boot backend in the background
echo "Starting Spring Boot backend..."
(cd backend && ./mvnw spring-boot:run) &
BACKEND_PID=$!

# Export browser setting for React
export BROWSER=none

# Run React + Electron
echo "Starting frontend dev server and Electron..."
cd frontend && npm run dev

# Cleanup backend process on exit
kill $BACKEND_PID
