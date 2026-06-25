@echo off
chcp 65001 >nul
REM ESP32 固件上传脚本 - Windows

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..
set FIRMWARE_DIR=%PROJECT_DIR%\firmware

echo ========================================
echo ESP32 固件上传
echo ========================================
echo.

REM 检查 PlatformIO
where pio >nul 2>nul
if %errorlevel% neq 0 (
    echo 安装 PlatformIO...
    pip install -q platformio
)

REM 编译并上传
echo 编译并上传固件...
cd /d "%FIRMWARE_DIR%"
pio run -t upload

echo.
echo ========================================
echo 固件上传完成!
echo ========================================

pause
