# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-06-25

### Added
- ESP32 BLE 心率读取功能
- Flask Web 后端服务
- 实时心率曲线图 (Lightweight Charts)
- K 线图支持 (1/5/10/30/60 分钟)
- MACD 技术指标
- 心率炒股模拟器
  - 手动交易（买入/卖出）
  - 条件单功能
  - 交易历史记录
- 响应式 Web 界面
- 1 秒刷新频率
- 历史数据持久化 (CSV)
- 多平台启动脚本 (Windows/Linux/macOS)
- 模块化代码结构

### Technical Details
- 后端: Python Flask + pyserial
- 前端: HTML5 + CSS3 + JavaScript
- 图表: Lightweight Charts v4.1.0
- 通信: BLE (ESP32) + Serial + HTTP Polling
- 数据: CSV 文件存储
