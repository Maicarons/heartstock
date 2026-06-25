# HeartStock - 华为手环心率炒股模拟器

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.3+-green.svg)](https://flask.palletsprojects.com/)
[![ESP32](https://img.shields.io/badge/ESP32-S3-orange.svg)](https://www.espressif.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

基于 ESP32 和华为手环的实时心率监测系统，结合 K 线图、MACD 技术指标和心率炒股模拟器。

> 💡 **股价 = 心率**：心率每变化 1 bpm，股价变化 1 元

## ✨ 功能特性

- 💓 **实时心率监测** - BLE 蓝牙连接华为手环，每秒更新
- 📈 **K 线图分析** - 支持 1/5/10/30/60 分钟周期
- 📊 **MACD 指标** - 专业技术分析，柱状图 + 双线
- 🎮 **炒股模拟器** - 手动交易 + 条件单功能
- 📱 **响应式设计** - 支持 PC 和移动端访问
- 🔄 **1 秒刷新** - 所有数据每秒自动更新

## 🚀 快速开始

### 前置条件

- Python 3.8+
- ESP32-S3 开发板
- 华为手环（支持心率广播）

### 安装

```bash
# 克隆项目
git clone https://github.com/maicarons/heartstock.git
cd heartstock

# 安装依赖
pip install -r requirements.txt
```

### 启动

**Windows:**
```bash
scripts\start.bat
```

**Linux/macOS:**
```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

**手动启动:**
```bash
python app.py
```

访问 http://localhost:5000

### 上传 ESP32 固件

```bash
# Windows
scripts\upload_firmware.bat

# Linux/macOS
chmod +s scripts/upload_firmware.sh
./scripts/upload_firmware.sh
```

## 📁 项目结构

```
heartstock/
├── app.py                      # Flask 主应用
├── requirements.txt            # Python 依赖
├── skills.md                   # AI 使用指南
├── README.md                   # 本文件
├── CHANGELOG.md                # 更新日志
├── LICENSE                     # MIT 许可证
│
├── backend/                    # 后端模块
│   ├── __init__.py
│   ├── config.py               # 配置文件
│   ├── serial_reader.py        # 串口读取
│   ├── trading.py              # 交易模拟
│   └── macd.py                 # MACD 计算
│
├── firmware/                   # ESP32 固件
│   ├── main.cpp                # 主程序
│   └── platformio.ini          # PlatformIO 配置
│
├── static/                     # 前端静态文件
│   ├── css/
│   │   └── styles.css          # 样式表
│   ├── js/
│   │   └── main.js             # 主脚本
│   └── lib/                    # 第三方库
│       ├── chart.umd.min.js
│       └── lightweight-charts.standalone.production.js
│
├── templates/                  # HTML 模板
│   └── index.html
│
├── scripts/                    # 启动脚本
│   ├── start.sh                # Linux/macOS
│   ├── start.bat               # Windows
│   ├── upload_firmware.sh      # 固件上传
│   └── upload_firmware.bat
│
├── data/                       # 数据存储
│   └── heart_rate_data.csv
│
└── docs/                       # 文档
    └── prompt.md
```

## 🎮 交易规则

### 基本规则

| 项目 | 说明 |
|------|------|
| 股价 | = 心率（1:1 对应） |
| 初始资金 | 10,000 元 |
| 最小交易 | 1 股 |
| 交易方式 | 手动交易 + 条件单 |

### 手动交易

- **全仓买入**：点击"买入"按钮
- **全仓卖出**：点击"卖出"按钮
- **指定金额**：输入金额后点击买入/卖出

### 条件单

支持自定义条件表达式，例如：
- `heart_rate < 75` - 心率低于 75 时触发
- `heart_rate > 95` - 心率高于 95 时触发
- `heart_rate < 80 and heart_rate > 70` - 复合条件

### 股价计算

```
股价 = 心率
```

简单直接：心率 80 bpm = 股价 ¥80

## 📊 技术指标

### K 线图

- **Open（开盘）**：该时间段的第一条心率数据
- **High（最高）**：该时间段内的最高心率
- **Low（最低）**：该时间段内的最低心率
- **Close（收盘）**：该时间段的最后一条心率数据

### MACD

- **MACD 线**：EMA12 - EMA26
- **信号线**：MACD 的 9 日 EMA
- **柱状图**：MACD - 信号线

## 🔧 配置说明

### 串口配置

编辑 `backend/config.py`：

```python
SERIAL_PORT = "COM5"  # Windows
# SERIAL_PORT = "/dev/ttyUSB0"  # Linux
BAUD_RATE = 115200
```

### 交易配置

```python
TRADING_CONFIG = {
    'initial_capital': 10000,  # 初始资金
}
```

## 📊 API 接口

### 心率数据

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/heart-rate` | GET | 获取当前心率 |
| `/api/heart-rate/history` | GET | 获取历史数据 |
| `/api/heart-rate/kline/<interval>` | GET | K 线数据 (1/5/10/30/60) |

### 交易模拟

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/trading` | GET | 交易状态 |
| `/api/trading/history` | GET | 交易历史 |
| `/api/trading/buy` | POST | 买入 |
| `/api/trading/sell` | POST | 卖出 |
| `/api/trading/conditional-orders` | GET/POST | 条件单管理 |
| `/api/trading/reset` | POST | 重置交易 |

## 🛠️ 开发指南

### 添加新技术指标

1. 在 `backend/` 创建计算模块
2. 在 `app.py` 添加 API 接口
3. 在 `static/js/main.js` 添加显示逻辑

### 自定义交易策略

编辑 `backend/trading.py` 中的 `TradingSimulator` 类。

## 📝 更新日志

### v1.0.0 (2026-06-25)
- 初始版本
- 实时心率监测
- K 线图 + MACD
- 心率炒股模拟器
- 条件单功能

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

## 🙏 致谢

- [Lightweight Charts](https://tradingview.github.io/lightweight-charts/) - K 线图库
- [Flask](https://flask.palletsprojects.com/) - Web 框架
- [ESP32 BLE Arduino](https://github.com/espressif/arduino-esp32) - ESP32 BLE 库

## ⚠️ 免责声明

本项目仅供学习和娱乐用途，心率炒股模拟器不构成任何投资建议。

---

**GitHub**: [github.com/maicarons/heartstock](https://github.com/maicarons/heartstock)
