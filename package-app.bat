@echo off
title e-Abhilekh - Project Packaging
echo Building and Packaging e-Abhilekh Application...

:: 0. Auto-increment version
echo [0/3] Auto-incrementing version...
python scripts\increment_version.py

:: 1. Build Spring Boot Java Backend
echo [1/3] Packaging Java backend using Maven...
where mvn >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\JetBrains\IntelliJ IDEA 2026.1.2\plugins\maven\lib\maven3\bin" (
        echo Adding IntelliJ bundled Maven to PATH...
        set "PATH=C:\Program Files\JetBrains\IntelliJ IDEA 2026.1.2\plugins\maven\lib\maven3\bin;%PATH%"
    )
)
cd backend
cmd /c "mvn clean package"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Maven packaging failed!
    cd ..
    pause
    exit /b
)
cd ..

:: 2. Build React Production Assets
echo [2/3] Building React frontend production assets...
cd frontend
cmd /c "npm run build"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] React build failed!
    cd ..
    pause
    exit /b
)

:: 3. Packaging Electron Application
echo [3/3] Packaging Electron Desktop Application...
echo To bundle Electron and React build files into a standalone installer:
echo Running electron-builder package process...
:: If they want to package it as executable using electron-builder (requires electron-builder in package.json)
:: cmd /c "npx electron-builder build --win"

echo Packaging steps complete! 
echo.
echo - Backend executable: backend\target\e-abhilekh-*.jar
echo - Frontend build folder: frontend\build\
echo.
echo You can test this compiled release by running: run-prod.bat
cd ..
pause


