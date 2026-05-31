@echo off
title FBOSS - Production Environment (Local Run)
echo Starting FBOSS Backend and Frontend in Production Mode...

:: Verify Backend JAR exists
set "JAR_PATH="
for %%f in (backend\target\fboss-*.jar) do (
    set "JAR_PATH=%%f"
)
if not defined JAR_PATH (
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
start "FBOSS Backend (Prod)" cmd /c "java -jar %JAR_PATH%"

:: Start Electron pointing to local production files
echo Starting Electron with compiled React production assets...
cd frontend && npx electron . --prod

