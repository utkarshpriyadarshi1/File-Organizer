@echo off
:: package-app-signed.bat
:: Production build script for File Organizer with self-signed certificate signing

cd /d "%~dp0.."

title File Organizer - Signed Production Build
echo ==========================================================
echo Starting File Organizer Signed Production Build Process
echo ==========================================================
echo.

:: 0. Auto-increment version and register
echo [Step 1/4] Auto-incrementing version & registering in DB...
python builder\increment_version.py
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Version increment failed!
    pause
    exit /b %ERRORLEVEL%
)
echo.

:: 1. Build Spring Boot Java Backend
echo [Step 2/4] Packaging Spring Boot backend JAR...
where mvn >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\JetBrains\IntelliJ IDEA 2026.1.2\plugins\maven\lib\maven3\bin" (
        echo Adding IntelliJ bundled Maven to PATH...
        set "PATH=C:\Program Files\JetBrains\IntelliJ IDEA 2026.1.2\plugins\maven\lib\maven3\bin;%PATH%"
    )
)
cd backend
cmd /c "mvn clean package -DskipTests"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Maven backend compilation failed!
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
cd ..
echo.

:: 2. Build React Production Assets
echo [Step 3/4] Building React frontend production assets...
cd frontend
cmd /c "npm run build"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] React build compilation failed!
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
cd ..
echo.

:: 3. Sign the deliverables
echo [Step 4/4] Signing built deliverables with self-signed certificate...

:: If there are any packaged Electron installers (like in frontend\dist), sign them as well
if exist "frontend\dist" (
    echo Scanning frontend\dist for executables/installers...
    for /r "frontend\dist" %%f in (*.exe) do (
        if exist "%%f" (
            call "%~dp0sign-app.bat" "%%f"
        )
    )
) else (
    echo [INFO] No packaged executables found to sign in frontend\dist\
    echo Please bundle the Electron application using electron-builder to generate installers.
)

echo.
echo ==========================================================
echo Signed Build Process Complete!
echo ==========================================================
echo - Backend executable: backend\target\file-organizer-*.jar
echo - Frontend build folder: frontend\build\
echo - Packaged installers: frontend\dist\*.exe (Signed, if present)
echo ==========================================================
echo.
pause
