"""
串口读取模块
"""

import serial
import json
import time
import threading
from datetime import datetime
from collections import deque
from backend.config import SERIAL_PORT, BAUD_RATE


class SerialReader:
    """串口数据读取器"""

    def __init__(self):
        self.heart_rate_data = []  # 使用普通列表，保留所有历史数据
        self.current_heart_rate = 0
        self.is_connected = False
        self._callbacks = []
        self._thread = None
        self._running = False

    def on_heart_rate(self, callback):
        """注册心率数据回调函数"""
        self._callbacks.append(callback)

    def _notify_callbacks(self, heart_rate, timestamp):
        """通知所有回调函数"""
        for callback in self._callbacks:
            try:
                callback(heart_rate, timestamp)
            except Exception as e:
                print(f"[ERROR] Callback error: {e}")

    def start(self):
        """启动串口读取线程"""
        if self._running:
            return

        self._running = True
        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start()

    def stop(self):
        """停止串口读取"""
        self._running = False

    def _read_loop(self):
        """串口读取主循环"""
        while self._running:
            try:
                ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
                self.is_connected = True
                print(f"[OK] Connected to {SERIAL_PORT}")

                while self._running:
                    if ser.in_waiting > 0:
                        line = ser.readline().decode('utf-8', errors='ignore')

                        # 跳过非 JSON 行
                        if not line.startswith('{'):
                            continue

                        try:
                            data = json.loads(line.strip())
                            if 'heartRate' in data:
                                heart_rate = data['heartRate']
                                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                                # 更新当前心率
                                self.current_heart_rate = heart_rate

                                # 添加到数据队列
                                self.heart_rate_data.append({
                                    'timestamp': timestamp,
                                    'heartRate': heart_rate,
                                    'millis': data.get('timestamp', 0)
                                })

                                # 通知回调
                                self._notify_callbacks(heart_rate, timestamp)

                        except json.JSONDecodeError:
                            continue

                    time.sleep(0.1)

            except serial.SerialException as e:
                print(f"[ERROR] Serial error: {e}")
                print(f"  Please ensure ESP32 is connected and {SERIAL_PORT} is not in use")
                self.is_connected = False
                time.sleep(5)

            except Exception as e:
                print(f"[ERROR] Unknown error: {e}")
                self.is_connected = False
                time.sleep(5)

    def get_history(self):
        """获取历史数据"""
        return list(self.heart_rate_data)

    def get_current(self):
        """获取当前心率"""
        return self.current_heart_rate

    def get_status(self):
        """获取连接状态"""
        return self.is_connected


# 全局串口读取器实例
serial_reader = SerialReader()
