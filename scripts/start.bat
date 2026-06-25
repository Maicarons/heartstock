@echo off
chcp 65001 >nul
REM ESP32 华为手环心率监测系统 - Windows 启动脚本

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..

echo ========================================
echo ESP32 华为手环心率监测系统
echo ========================================
echo.

REM 检查 Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python 未安装
    pause
    exit /b 1
)

REM 检查依赖
echo 检查依赖...
pip install -q flask pyserial 2>nul

REM 启动应用
echo 启动 Web 服务...
echo 访问地址: http://localhost:5000
echo ========================================
cd /d "%PROJECT_DIR%"
python app.py

pause
