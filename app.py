#!/usr/bin/env python3
"""
ESP32 华为手环心率数据 Web 展示系统
"""

import csv
import os
import time
from datetime import datetime
from flask import Flask, render_template, jsonify, request, Response
import json

from backend.serial_reader import serial_reader
from backend.trading import trading_simulator
from backend.macd import calculate_macd, group_kline_data

app = Flask(__name__)

CSV_FILE = os.path.join("data", "heart_rate_data.csv")


def save_to_csv(timestamp, heart_rate):
    """保存数据到 CSV 文件"""
    os.makedirs("data", exist_ok=True)
    if not os.path.exists(CSV_FILE):
        with open(CSV_FILE, 'w', newline='', encoding='utf-8') as f:
            csv.writer(f).writerow(["时间戳", "心率(bpm)"])
    with open(CSV_FILE, 'a', newline='', encoding='utf-8') as f:
        csv.writer(f).writerow([timestamp, heart_rate])


def load_historical_data():
    """加载历史数据"""
    if os.path.exists(CSV_FILE):
        with open(CSV_FILE, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                serial_reader.heart_rate_data.append({
                    'timestamp': row['时间戳'],
                    'heartRate': int(row['心率(bpm)']),
                    'millis': 0
                })


def on_heart_rate_received(heart_rate, timestamp):
    """心率数据回调"""
    save_to_csv(timestamp, heart_rate)
    trading_simulator.update_price(heart_rate)


# ========================================
# 页面路由
# ========================================

@app.route('/')
def index():
    return render_template('index.html')


# ========================================
# 心率 API
# ========================================

@app.route('/api/heart-rate')
def get_heart_rate():
    return jsonify({
        'current': serial_reader.get_current(),
        'connected': serial_reader.get_status(),
        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })


@app.route('/api/heart-rate/history')
def get_heart_rate_history():
    data = serial_reader.get_history()
    if data:
        rates = [d['heartRate'] for d in data]
        stats = {
            'avg': round(sum(rates) / len(rates), 1),
            'min': min(rates),
            'max': max(rates),
            'count': len(rates)
        }
    else:
        stats = {'avg': 0, 'min': 0, 'max': 0, 'count': 0}
    return jsonify({'data': data[-100:], 'stats': stats})


@app.route('/api/heart-rate/kline/<int:interval>')
def get_kline_data(interval):
    if interval not in [1, 5, 10, 30, 60]:
        return jsonify({'error': 'Invalid interval'}), 400

    # 从 CSV 读取数据（限制最近 2000 条避免超时）
    data = []
    if os.path.exists(CSV_FILE):
        with open(CSV_FILE, 'r', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                data.append({
                    'timestamp': row['时间戳'],
                    'heartRate': int(row['心率(bpm)'])
                })

    # 只取最近 2000 条
    if len(data) > 2000:
        data = data[-2000:]

    if not data:
        return jsonify({'data': [], 'interval': interval})

    kline_data = group_kline_data(data, interval)
    macd_data = calculate_macd(kline_data)
    return jsonify({
        'data': kline_data,
        'macd': macd_data,
        'interval': interval,
        'total_groups': len(kline_data)
    })


@app.route('/api/stream')
def stream():
    def event_stream():
        last_count = 0
        while True:
            current_count = len(serial_reader.heart_rate_data)
            if current_count > last_count:
                new_data = list(serial_reader.heart_rate_data)[last_count:]
                last_count = current_count
                for d in new_data:
                    yield f"data: {json.dumps(d)}\n\n"
            time.sleep(1)  # 每秒检查一次
    return Response(event_stream(), mimetype='text/event-stream')


# ========================================
# 交易 API
# ========================================

@app.route('/api/trading')
def get_trading_data():
    return jsonify(trading_simulator.get_status())


@app.route('/api/trading/history')
def get_trading_history():
    return jsonify(trading_simulator.get_history())


@app.route('/api/trading/buy', methods=['POST'])
def trading_buy():
    data = request.get_json(force=True, silent=True) or {}
    result = trading_simulator.buy(
        shares=data.get('shares'),
        amount=data.get('amount')
    )
    return jsonify(result)


@app.route('/api/trading/sell', methods=['POST'])
def trading_sell():
    data = request.get_json(force=True, silent=True) or {}
    result = trading_simulator.sell(
        shares=data.get('shares'),
        amount=data.get('amount')
    )
    return jsonify(result)


@app.route('/api/trading/conditional-orders')
def get_conditional_orders():
    return jsonify(trading_simulator.get_conditional_orders())


@app.route('/api/trading/conditional-orders', methods=['POST'])
def add_conditional_order():
    data = request.get_json(force=True, silent=True)
    result = trading_simulator.add_conditional_order(
        order_type=data.get('order_type'),
        condition=data.get('condition'),
        shares=data.get('shares'),
        amount=data.get('amount')
    )
    return jsonify(result)


@app.route('/api/trading/conditional-orders/<int:index>', methods=['DELETE'])
def remove_conditional_order(index):
    return jsonify(trading_simulator.remove_conditional_order(index))


@app.route('/api/trading/reset', methods=['POST'])
def reset_trading():
    trading_simulator.reset()
    return jsonify({'status': 'ok'})


# ========================================
# 主程序入口
# ========================================

if __name__ == '__main__':
    load_historical_data()
    serial_reader.on_heart_rate(on_heart_rate_received)
    serial_reader.start()
    trading_simulator.reset()

    print("=" * 50)
    print("ESP32 Huawei Band Heart Rate Web System")
    print("=" * 50)
    print(f"Web Interface: http://localhost:5000")
    print("=" * 50)

    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
