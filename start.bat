@echo off
chcp 65001 >nul
title Video Web Editor

echo ========================================
echo     Video Web Editor 一键启动脚本
echo ========================================
echo.

:: 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [信息] Node.js 版本:
node -v
echo.

:: 检查是否需要安装依赖
if not exist "node_modules" (
    echo [信息] 首次运行，正在安装依赖...
    echo [信息] 这可能需要几分钟，请耐心等待...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo.
    echo [成功] 依赖安装完成！
    echo.
)

echo [信息] 正在启动 Video Web Editor...
echo [信息] 启动后会自动打开浏览器
echo [信息] 如果没有自动打开，请手动访问显示的地址
echo.
echo ========================================
echo     按 Ctrl+C 可停止服务器
echo ========================================
echo.

:: 启动开发服务器并打开浏览器
start "" cmd /c "timeout /t 3 >nul && start http://localhost:3000"
call npm run dev
