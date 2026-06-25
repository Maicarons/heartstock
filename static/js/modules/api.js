/**
 * API 模块
 *
 * 负责与后端 API 的通信
 */

/**
 * 获取当前心率
 */
export async function fetchCurrentHeartRate() {
    try {
        const response = await fetch('/api/heart-rate');
        return await response.json();
    } catch (error) {
        console.error('获取心率数据失败:', error);
        return null;
    }
}

/**
 * 获取历史数据
 */
export async function fetchHistoryData() {
    try {
        const response = await fetch('/api/heart-rate/history');
        return await response.json();
    } catch (error) {
        console.error('获取历史数据失败:', error);
        return null;
    }
}

/**
 * 获取 K 线数据
 */
export async function fetchKlineData(interval) {
    try {
        const response = await fetch(`/api/heart-rate/kline/${interval}`);
        return await response.json();
    } catch (error) {
        console.error('获取 K 线数据失败:', error);
        return null;
    }
}

/**
 * 连接 SSE 实时数据流
 */
export function connectSSE(onMessage, onError) {
    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (onMessage) onMessage(data);
        } catch (error) {
            console.error('解析 SSE 数据失败:', error);
        }
    };

    eventSource.onerror = (error) => {
        console.error('SSE 连接错误:', error);
        if (onError) onError(error);

        // 重新连接
        setTimeout(() => connectSSE(onMessage, onError), 3000);
    };

    return eventSource;
}
