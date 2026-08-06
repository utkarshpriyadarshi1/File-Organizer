@echo off
setlocal enabledelayedexpansion

cd "%~dp0.."

echo ===================================================
echo   File Organizer Developer Onboarding Setup
echo ===================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please download and install Node.js from https://nodejs.org/
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node -v') do set node_ver=%%i
    echo [INFO] Found Node.js version: !node_ver!
)

:: 2. Check NPM
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed or not in PATH.
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm -v') do set npm_ver=%%i
    echo [INFO] Found npm version: !npm_ver!
)

:: 3. Check Java (backend requirement)
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] java command not found. Please ensure JDK 21+ is installed.
) else (
    for /f "tokens=*" %%i in ('java -version 2^>^&1 ^| findstr "version"') do set java_ver=%%i
    echo [INFO] Found Java version: !java_ver!
)

echo.
echo Installing dependencies in the ui directory...
cd ui
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install npm dependencies.
    exit /b 1
)
cd ..
echo [SUCCESS] Dependencies installed successfully.
echo.

:: 4. Generate local Windows development certificate
echo Configuring local code signing certificate...
powershell -ExecutionPolicy Bypass -File "scripts\setup-cert.ps1"
if %errorlevel% neq 0 (
    echo [WARNING] Development certificate setup failed or was cancelled (requires admin privileges to install).
    echo You can run the app locally, but packaging might fail unless you run setup.bat as Administrator.
) else (
    echo [SUCCESS] Code signing certificate is configured and trusted.
)

echo.
echo ===================================================
echo   Setup completed successfully!
echo ===================================================
echo To run the application in development mode:
echo   - Run 'manager.bat dev' or run 'npm run dev' in the frontend directory.
echo.
echo To build and package the desktop app:
echo   - Run 'manager.bat build'
echo ===================================================
pause
