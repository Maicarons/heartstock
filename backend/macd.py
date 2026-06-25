"""
MACD 技术指标计算模块
"""

from datetime import datetime


def calculate_ema(prices, period):
    """计算指数移动平均线 (EMA)"""
    if len(prices) < period:
        return []

    ema = []
    multiplier = 2 / (period + 1)

    # 第一个 EMA 使用 SMA
    first_ema = sum(prices[:period]) / period
    ema.append(first_ema)

    # 后续 EMA
    for i in range(period, len(prices)):
        current_ema = (prices[i] - ema[-1]) * multiplier + ema[-1]
        ema.append(current_ema)

    return ema


def calculate_macd(kline_data):
    """
    计算 MACD 指标

    MACD = EMA12 - EMA26
    Signal = EMA(MACD, 9)
    Histogram = MACD - Signal
    """
    if len(kline_data) < 34:  # 至少需要 34 个数据点
        return []

    close_prices = [item['close'] for item in kline_data]

    # 计算 EMA12 和 EMA26
    ema12 = calculate_ema(close_prices, 12)
    ema26 = calculate_ema(close_prices, 26)

    # EMA12 从第 12 个数据开始，EMA26 从第 26 个数据开始
    # 对齐：EMA26 的第 0 个对应原始数据的第 25 个（索引 25）
    # EMA12 的第 14 个对应原始数据的第 25 个（12 + 14 - 1 = 25）
    ema12_aligned = ema12[14:]  # 从第 14 个开始（对应原始数据第 25 个）

    # MACD 线
    macd_line = []
    for i in range(len(ema26)):
        macd_line.append(ema12_aligned[i] - ema26[i])

    # 信号线（MACD 的 9 日 EMA）
    signal_line = calculate_ema(macd_line, 9)

    # 组装结果
    # MACD 线从原始数据第 25 个开始（索引 25）
    # 信号线从 MACD 线第 9 个开始，对应原始数据第 33 个（索引 33）
    macd_data = []
    for i in range(len(signal_line)):
        macd_idx = 8 + i  # MACD 线的索引（从第 9 个开始）
        kline_idx = 33 + i  # 原始 K 线的索引（从第 34 个开始）

        if macd_idx < len(macd_line) and kline_idx < len(kline_data):
            macd_value = macd_line[macd_idx]
            signal_value = signal_line[i]
            histogram_value = macd_value - signal_value

            macd_data.append({
                'time': kline_data[kline_idx]['time'],
                'macd': round(macd_value, 2),
                'signal': round(signal_value, 2),
                'histogram': round(histogram_value, 2)
            })

    return macd_data


def group_kline_data(heart_rate_data, interval):
    """将心率数据按时间分组为 K 线数据"""
    kline_data = []
    current_group = []
    group_start_time = None

    for item in heart_rate_data:
        try:
            item_time = datetime.strptime(item['timestamp'], "%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue

        minutes = item_time.minute
        group_minute = (minutes // interval) * interval
        group_time = item_time.replace(minute=group_minute, second=0, microsecond=0)

        if group_start_time is None or group_time != group_start_time:
            if current_group and group_start_time:
                rates = [d['heartRate'] for d in current_group]
                kline_data.append({
                    'time': group_start_time.strftime("%Y-%m-%d %H:%M:%S"),
                    'open': rates[0],
                    'high': max(rates),
                    'low': min(rates),
                    'close': rates[-1],
                    'count': len(rates)
                })
            current_group = [item]
            group_start_time = group_time
        else:
            current_group.append(item)

    if current_group and group_start_time:
        rates = [d['heartRate'] for d in current_group]
        kline_data.append({
            'time': group_start_time.strftime("%Y-%m-%d %H:%M:%S"),
            'open': rates[0],
            'high': max(rates),
            'low': min(rates),
            'close': rates[-1],
            'count': len(rates)
        })

    return kline_data
