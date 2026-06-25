#!/bin/bash
# ESP32 华为手环心率监测系统 - Linux/macOS 启动脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "========================================"
echo "ESP32 华为手环心率监测系统"
echo "========================================"
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 未安装"
    exit 1
fi

# 检查依赖
echo "检查依赖..."
pip3 install -q flask pyserial 2>/dev/null || pip install -q flask pyserial

# 启动应用
echo "启动 Web 服务..."
echo "访问地址: http://localhost:5000"
echo "========================================"
cd "$PROJECT_DIR"
python3 app.py
