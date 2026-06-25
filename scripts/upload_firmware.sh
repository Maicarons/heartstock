#!/bin/bash
# ESP32 固件上传脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FIRMWARE_DIR="$PROJECT_DIR/firmware"

echo "========================================"
echo "ESP32 固件上传"
echo "========================================"
echo ""

# 检查 PlatformIO
if ! command -v pio &> /dev/null; then
    echo "安装 PlatformIO..."
    pip3 install -q platformio || pip install -q platformio
fi

# 编译并上传
echo "编译并上传固件..."
cd "$FIRMWARE_DIR"
pio run -t upload

echo ""
echo "========================================"
echo "固件上传完成!"
echo "========================================"
