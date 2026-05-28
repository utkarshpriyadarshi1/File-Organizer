@echo off
title FBOSS - Production Environment (Local Run)
echo Starting FBOSS Backend and Frontend in Production Mode...

:: Verify Backend JAR exists
if not exist "backend\target\fmo-0.0.1-SNAPSHOT.jar" (
    echo [ERROR] Backend JAR not found! Please run package-app.bat first to build the executable.
    pause
    exit /b
)

:: Verify Frontend Build folder exists
if not exist "frontend\build\index.html" (
    echo [ERROR] Frontend build assets not found! Please run package-app.bat first to build the React package.
    pause
    exit /b
)

:: Start Spring Boot Backend in a separate window
start "FBOSS Backend (Prod)" cmd /c "java -jar backend\target\fmo-0.0.1-SNAPSHOT.jar"

:: Start Electron pointing to local production files
echo Starting Electron with compiled React production assets...
cd frontend && npx electron . --prod
