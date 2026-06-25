@echo off
:: sign-app.bat
:: Delegate signing logic to sign-app.ps1 to bypass cmd parser parentheses limitations

set TARGET_FILE=%~1

if "%TARGET_FILE%"=="" (
    echo [ERROR] No target file specified to sign.
    echo Usage: sign-app.bat [path_to_executable_or_jar]
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sign-app.ps1" -targetFile "%TARGET_FILE%"
exit /b %ERRORLEVEL%
