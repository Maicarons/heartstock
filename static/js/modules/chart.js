/**
 * 图表模块
 *
 * 负责实时曲线图和 K 线图的初始化和更新
 */

// Chart.js 相关变量
let heartRateChart = null;
let heartRateHistory = [];
let timeLabels = [];

// Lightweight Charts 相关变量
let klineChart = null;
let klineSeries = null;
let macdChart = null;
let macdHistogramSeries = null;
let macdLineSeries = null;
let signalLineSeries = null;

/**
 * 初始化实时曲线图（Chart.js）
 */
export function initRealtimeChart() {
    const ctx = document.getElementById('heartRateChart').getContext('2d');

    // 创建渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, 'rgba(233, 69, 96, 0.5)');
    gradient.addColorStop(1, 'rgba(233, 69, 96, 0)');

    heartRateChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: '心率 (BPM)',
                data: heartRateHistory,
                borderColor: '#e94560',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#e94560',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#e94560',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: (context) => `心率: ${context.parsed.y} BPM`
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#8892b0', maxTicksLimit: 10 }
                },
                y: {
                    display: true,
                    min: 40,
                    max: 150,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: {
                        color: '#8892b0',
                        callback: (value) => value + ' BPM'
                    }
                }
            },
            interaction: { intersect: false, mode: 'index' },
            animation: { duration: 300 }
        }
    });

    return heartRateChart;
}

/**
 * 初始化 K 线图（Lightweight Charts）
 */
export function initKlineChart() {
    const container = document.getElementById('klineChart');

    klineChart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 280,
        layout: {
            background: { color: 'transparent' },
            textColor: '#8892b0',
        },
        grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
            vertLine: {
                color: '#e94560',
                width: 1,
                style: LightweightCharts.LineStyle.Dashed,
            },
            horzLine: {
                color: '#e94560',
                width: 1,
                style: LightweightCharts.LineStyle.Dashed,
            },
        },
        rightPriceScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            timeVisible: true,
            secondsVisible: false,
        },
    });

    klineSeries = klineChart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderDownColor: '#ef5350',
        borderUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        wickUpColor: '#26a69a',
    });

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
        if (klineChart) {
            klineChart.applyOptions({ width: container.clientWidth });
        }
    });

    // 初始化 MACD 图表
    initMacdChart();

    return klineChart;
}

/**
 * 初始化 MACD 图表
 */
function initMacdChart() {
    const container = document.getElementById('macdChart');

    macdChart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 120,
        layout: {
            background: { color: 'transparent' },
            textColor: '#8892b0',
        },
        grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
            vertLine: {
                color: '#e94560',
                width: 1,
                style: LightweightCharts.LineStyle.Dashed,
            },
            horzLine: {
                color: '#e94560',
                width: 1,
                style: LightweightCharts.LineStyle.Dashed,
            },
        },
        rightPriceScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            scaleMargins: { top: 0.2, bottom: 0.2 },
        },
        timeScale: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
            timeVisible: true,
            secondsVisible: false,
            visible: false,
        },
    });

    macdHistogramSeries = macdChart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        scaleMargins: { top: 0.1, bottom: 0.1 },
    });

    macdLineSeries = macdChart.addLineSeries({
        color: '#2196F3',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    signalLineSeries = macdChart.addLineSeries({
        color: '#FF9800',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
        if (macdChart) {
            macdChart.applyOptions({ width: container.clientWidth });
        }
    });

    // 同步时间轴
    if (klineChart) {
        klineChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range && macdChart) {
                macdChart.timeScale().setVisibleLogicalRange(range);
            }
        });

        macdChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            if (range && klineChart) {
                klineChart.timeScale().setVisibleLogicalRange(range);
            }
        });
    }
}

/**
 * 更新实时曲线图
 */
export function updateRealtimeChart(heartRate) {
    if (!heartRateChart) return;

    heartRateHistory.push(heartRate);
    timeLabels.push(new Date().toLocaleTimeString('zh-CN', { hour12: false }));

    // 保持最近 100 个数据点
    if (heartRateHistory.length > 100) {
        heartRateHistory.shift();
        timeLabels.shift();
    }

    heartRateChart.data.labels = timeLabels;
    heartRateChart.data.datasets[0].data = heartRateHistory;
    heartRateChart.update('none');
}

/**
 * 更新 K 线图数据
 */
export function updateKlineData(klineData) {
    if (!klineSeries || !klineData || klineData.length === 0) return;

    const formattedData = klineData.map(item => ({
        time: Math.floor(new Date(item.time).getTime() / 1000),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
    }));

    klineSeries.setData(formattedData);
    klineChart.timeScale().fitContent();
}

/**
 * 更新 MACD 图表数据
 */
export function updateMacdData(macdData) {
    if (!macdChart) return;

    const macdInfo = document.getElementById('macdInfo');

    if (!macdData || macdData.length === 0) {
        macdHistogramSeries.setData([]);
        macdLineSeries.setData([]);
        signalLineSeries.setData([]);

        if (macdInfo) {
            macdInfo.textContent = 'MACD 需要至少 34 个数据点';
            macdInfo.style.color = '#8892b0';
        }
        return;
    }

    const histogramData = macdData.map(item => ({
        time: Math.floor(new Date(item.time).getTime() / 1000),
        value: item.histogram,
        color: item.histogram >= 0 ? '#26a69a' : '#ef5350',
    }));

    const macdLineData = macdData.map(item => ({
        time: Math.floor(new Date(item.time).getTime() / 1000),
        value: item.macd,
    }));

    const signalLineData = macdData.map(item => ({
        time: Math.floor(new Date(item.time).getTime() / 1000),
        value: item.signal,
    }));

    macdHistogramSeries.setData(histogramData);
    macdLineSeries.setData(macdLineData);
    signalLineSeries.setData(signalLineData);

    // 更新信息显示
    if (macdInfo) {
        const lastMacd = macdData[macdData.length - 1];
        const macdDirection = lastMacd.histogram >= 0 ? '多头' : '空头';
        macdInfo.textContent = `MACD: ${lastMacd.macd} | 信号: ${lastMacd.signal} | 柱状: ${lastMacd.histogram} (${macdDirection})`;
        macdInfo.style.color = lastMacd.histogram >= 0 ? '#26a69a' : '#ef5350';
    }

    macdChart.timeScale().fitContent();
}

/**
 * 获取图表历史数据
 */
export function getChartHistory() {
    return { heartRateHistory, timeLabels };
}

/**
 * 重置图表数据
 */
export function resetChartData() {
    heartRateHistory = [];
    timeLabels = [];
    if (heartRateChart) {
        heartRateChart.data.labels = [];
        heartRateChart.data.datasets[0].data = [];
        heartRateChart.update('none');
    }
}
