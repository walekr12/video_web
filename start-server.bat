@echo off
title Video Web Editor Server

echo ========================================
echo     Video Web Editor - Server Mode
echo ========================================
echo.
echo This is for running the built version.
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Starting local server...
echo [INFO] Browser will open at http://localhost:3000
echo.
echo ========================================
echo     Press Ctrl+C to stop the server
echo ========================================
echo.

:: Open browser after 2 seconds
start "" cmd /c "timeout /t 2 >nul && start http://localhost:3000"

:: Use npx serve to run static files
npx serve -s . -l 3000
