@echo off
title Video Web Editor

echo ========================================
echo     Video Web Editor - Quick Start
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node.js version:
node -v
echo.

:: Check if dependencies need to be installed
if not exist "node_modules" (
    echo [INFO] First run - Installing dependencies...
    echo [INFO] This may take a few minutes, please wait...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed successfully!
    echo.
)

echo [INFO] Starting Video Web Editor...
echo [INFO] Browser will open automatically
echo [INFO] If not, please visit the URL shown below
echo.
echo ========================================
echo     Press Ctrl+C to stop the server
echo ========================================
echo.

:: Start dev server and open browser
start "" cmd /c "timeout /t 3 >nul && start http://localhost:3000"
call npm run dev
