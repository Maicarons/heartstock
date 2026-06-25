"""
后端模块包
"""

from backend.config import SERIAL_PORT, BAUD_RATE, TRADING_CONFIG
from backend.serial_reader import serial_reader
from backend.trading import trading_simulator
from backend.macd import calculate_ema, calculate_macd, group_kline_data

__all__ = [
    'SERIAL_PORT',
    'BAUD_RATE',
    'TRADING_CONFIG',
    'serial_reader',
    'trading_simulator',
    'calculate_ema',
    'calculate_macd',
    'group_kline_data',
]
