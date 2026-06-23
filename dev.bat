@echo off
setlocal enabledelayedexpansion

title File Organizer - Development Mode
echo Starting backend and frontend services in development mode...

:: Add Maven to PATH if not already present
where mvn >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\JetBrains\IntelliJ IDEA 2026.1.2\plugins\maven\lib\maven3\bin" (
        echo Adding IntelliJ bundled Maven to PATH...
        set "PATH=C:\Program Files\JetBrains\IntelliJ IDEA 2026.1.2\plugins\maven\lib\maven3\bin;%PATH%"
    )
)

:: Sync config file
echo Copying app.config.json to frontend/src/ and backend resources...
if exist "app.config.json" (
    copy /y "app.config.json" "frontend\src\app.config.json" >nul
    copy /y "app.config.json" "backend\src\main\resources\app.config.json" >nul
)

:: Start Spring Boot Backend in a separate window
start "File Organizer Backend" cmd /c "set PATH=%PATH% && cd backend && mvn spring-boot:run"

:: Prevent React dev server from opening standard browser window
set BROWSER=none

:: Start Electron + React Frontend
echo Starting Frontend dev server and Electron window...
cd frontend && npm run dev
