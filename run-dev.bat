@echo off
title FBOSS - Development Environment
echo Starting FBOSS Backend and Frontend in Development Mode...

:: Start Spring Boot Backend in a separate window
start "FBOSS Backend" cmd /c "cd backend && mvn spring-boot:run"

:: Start Electron + React Frontend
echo Starting Frontend dev server and Electron window...
cd frontend && npm run dev
