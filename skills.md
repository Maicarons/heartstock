# Skills - AI 使用指南

本文档指导 AI 如何使用和开发本项目。

## 项目概述

基于 ESP32 + 华为手环的心率监测系统，结合 K 线图、MACD 技术指标和心率炒股模拟器。

**核心特性：**
- 股价 = 心率（1:1 对应）
- 初始资金 10,000 元
- 支持手动交易和条件单
- 1 秒刷新频率

## 快速启动

### 启动 Web 服务

```bash
# Linux/macOS
./scripts/start.sh

# Windows
scripts\start.bat
```

### 上传 ESP32 固件

```bash
# Linux/macOS
./scripts/upload_firmware.sh

# Windows
scripts\upload_firmware.bat
```

## 项目结构

```
heartstock/
├── app.py                  # Flask 主应用
├── requirements.txt        # Python 依赖
├── skills.md              # 本文件
├── backend/               # 后端模块
│   ├── __init__.py
│   ├── config.py          # 配置
│   ├── serial_reader.py   # 串口读取
│   ├── trading.py         # 交易模拟
│   └── macd.py            # MACD 计算
├── firmware/              # ESP32 固件
│   ├── main.cpp
│   └── platformio.ini
├── static/                # 前端静态文件
│   ├── css/styles.css
│   ├── js/main.js
│   └── lib/               # 第三方库
├── templates/             # HTML 模板
│   └── index.html
├── scripts/               # 启动脚本
├── data/                  # 数据存储
└── docs/                  # 文档
```

## API 接口

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
| `/api/trading/conditional-orders/<index>` | DELETE | 删除条件单 |
| `/api/trading/reset` | POST | 重置交易 |

## 交易规则

### 股价计算
```
股价 = 心率
```

### 交易方式
1. **手动交易**：直接买入/卖出
2. **条件单**：满足条件自动触发

### 条件单示例
- `heart_rate < 75` - 心率低于 75 时买入
- `heart_rate > 95` - 心率高于 95 时卖出

## 开发指南

### 添加新的后端模块

1. 在 `backend/` 目录创建新文件
2. 在 `backend/__init__.py` 中导出
3. 在 `app.py` 中导入使用

### 添加新的前端功能

1. 在 `static/js/main.js` 中添加函数
2. 在 `templates/index.html` 中添加 UI
3. 在 `static/css/styles.css` 中添加样式

### 修改交易策略

编辑 `backend/trading.py` 中的 `TradingSimulator` 类：

```python
def buy(self, shares=None, amount=None):
    # 修改买入逻辑
    pass

def sell(self, shares=None, amount=None):
    # 修改卖出逻辑
    pass
```

### 修改股价计算

编辑 `backend/trading.py` 中的 `update_price` 方法：

```python
def update_price(self, heart_rate):
    # 修改股价计算公式
    self.current_price = heart_rate  # 当前：股价 = 心率
```

## 常见任务

### 修改串口

编辑 `backend/config.py`：

```python
SERIAL_PORT = "COM5"  # Windows
# SERIAL_PORT = "/dev/ttyUSB0"  # Linux
```

### 修改初始资金

编辑 `backend/config.py`：

```python
TRADING_CONFIG = {
    'initial_capital': 10000,  # 修改初始资金
}
```

### 添加新的技术指标

1. 在 `backend/` 目录创建新文件（如 `rsi.py`）
2. 实现计算函数
3. 在 `app.py` 中添加 API 接口
4. 在 `static/js/main.js` 中添加显示逻辑

## 调试技巧

### 查看串口数据

```bash
# 使用 PlatformIO Monitor
cd firmware
pio device monitor
```

### 测试 API

```bash
# 获取当前心率
curl http://localhost:5000/api/heart-rate

# 获取 K 线数据
curl http://localhost:5000/api/heart-rate/kline/1

# 获取交易状态
curl http://localhost:5000/api/trading

# 买入
curl -X POST http://localhost:5000/api/trading/buy -H "Content-Type: application/json" -d '{}'

# 卖出
curl -X POST http://localhost:5000/api/trading/sell -H "Content-Type: application/json" -d '{}'
```

### 查看日志

Flask 应用默认输出到终端，可查看实时日志。

## 注意事项

1. **串口占用**：确保没有其他程序占用串口
2. **BLE 连接**：华为手环需开启心率广播
3. **数据存储**：心率数据保存在 `data/heart_rate_data.csv`
4. **交易模拟**：仅用于娱乐，不构成投资建议
5. **刷新频率**：所有数据 1 秒刷新一次

## GitHub

项目地址：[github.com/maicarons/heartstock](https://github.com/maicarons/heartstock)
