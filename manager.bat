@echo off
setlocal

if "%1"=="" (
    echo Usage: manager.bat [command]
    echo Commands:
    echo   dev     - Run development server
    echo   build   - Build the application
    echo   clean   - Clean build artifacts
    echo   setup   - Run setup
    exit /b 1
)

set CMD=%1

if "%CMD%"=="dev" (
    call "%~dp0scripts\dev.bat"
) else if "%CMD%"=="build" (
    call "%~dp0scripts\build.bat"
) else if "%CMD%"=="clean" (
    call "%~dp0scripts\clean.bat"
) else if "%CMD%"=="setup" (
    call "%~dp0scripts\setup.bat"
) else (
    echo Unknown command: %CMD%
    exit /b 1
)
