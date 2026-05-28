@echo off
title FBOSS - Development Environment
echo Starting FBOSS Backend and Frontend in Development Mode...

:: Add Maven to PATH if not already present
where mvn >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\JetBrains\IntelliJ IDEA 2026.1.2\plugins\maven\lib\maven3\bin" (
        echo Adding IntelliJ bundled Maven to PATH...
        set "PATH=C:\Program Files\JetBrains\IntelliJ IDEA 2026.1.2\plugins\maven\lib\maven3\bin;%PATH%"
    )
)

:: Start Spring Boot Backend in a separate window
start "FBOSS Backend" cmd /c "set PATH=%PATH% && cd backend && mvn spring-boot:run"

:: Prevent React dev server from opening standard browser window
set BROWSER=none

:: Start Electron + React Frontend
echo Starting Frontend dev server and Electron window...
cd frontend && npm run dev
