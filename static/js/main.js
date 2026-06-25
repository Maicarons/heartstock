/**
 * HeartStock - 华为手环心率炒股模拟器
 */

// 折叠功能
window.toggleCard = function(header) {
    header.parentElement.classList.toggle('collapsed');
};

// ========================================
// 全局变量
// ========================================
var realtimeChart = null;
var realtimeSeries = null;
var currentChartType = 'realtime';
var lastHeartRate = 0;

// 每个 K 线周期独立的图表对象
var klineCharts = {};  // { 1: { chart, klineSeries, macdChart, macdHistSeries, macdLineSeries, signalSeries } }
var klineDataCache = {};

// K 线周期列表
var KLINE_INTERVALS = [1, 5, 10, 30, 60];

// ========================================
// 时间解析
// ========================================
function parseTime(ts) {
    if (!ts) return null;
    var parts = ts.split(' ');
    if (parts.length < 2) return null;
    var dateParts = parts[0].split('-');
    var timeParts = parts[1].split(':');
    if (dateParts.length < 3 || timeParts.length < 3) return null;
    var d = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        parseInt(timeParts[0]),
        parseInt(timeParts[1]),
        parseInt(timeParts[2])
    );
    return Math.floor(d.getTime() / 1000);
}

// ========================================
// 心率状态
// ========================================
function updateHeartRateStatus(hr) {
    var el = document.getElementById('heartRateStatus');
    if (hr < 60) { el.textContent = '💙 偏低'; el.className = 'heart-rate-status status-low'; }
    else if (hr < 100) { el.textContent = '💚 正常'; el.className = 'heart-rate-status status-normal'; }
    else if (hr < 120) { el.textContent = '💛 偏高'; el.className = 'heart-rate-status status-elevated'; }
    else { el.textContent = '❤️ 过快'; el.className = 'heart-rate-status status-high'; }
}

function updateStats(stats) {
    document.getElementById('avgHeartRate').textContent = stats.avg || '--';
    document.getElementById('minHeartRate').textContent = stats.min || '--';
    document.getElementById('maxHeartRate').textContent = stats.max || '--';
    document.getElementById('dataCount').textContent = stats.count || '--';
}

function updateDataTable(data) {
    var tbody = document.getElementById('dataTableBody');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#8892b0">等待数据...</td></tr>'; return; }
    var html = '';
    var reversed = data.slice().reverse().slice(0, 50);
    for (var i = 0; i < reversed.length; i++) {
        var item = reversed[i];
        var cls = '', txt = '';
        if (item.heartRate < 60) { cls = 'range-low'; txt = '偏低'; }
        else if (item.heartRate < 100) { cls = 'range-normal'; txt = '正常'; }
        else if (item.heartRate < 120) { cls = 'range-elevated'; txt = '偏高'; }
        else { cls = 'range-high'; txt = '过快'; }
        html += '<tr><td>' + (i+1) + '</td><td>' + item.timestamp + '</td><td><strong>' + item.heartRate + '</strong></td><td><span class="' + cls + '">' + txt + '</span></td></tr>';
    }
    tbody.innerHTML = html;
}

// ========================================
// 初始化实时曲线图
// ========================================
function initRealtimeChart() {
    var rtEl = document.getElementById('realtimeChart');
    if (!rtEl) return;

    realtimeChart = LightweightCharts.createChart(rtEl, {
        width: rtEl.clientWidth,
        height: 350,
        layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#8892b0' },
        grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.1)' } },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)', scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true, secondsVisible: true, rightOffset: 5 },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    });

    realtimeSeries = realtimeChart.addLineSeries({
        color: '#e94560',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 0, minMove: 1 },
    });

    window.addEventListener('resize', function() {
        if (realtimeChart && rtEl) realtimeChart.applyOptions({ width: rtEl.clientWidth });
    });

    console.log('[Chart] 实时曲线初始化成功');
}

// ========================================
// 初始化 K 线图表（每个周期独立）
// ========================================
function initKlineCharts() {
    for (var i = 0; i < KLINE_INTERVALS.length; i++) {
        var interval = KLINE_INTERVALS[i];
        initSingleKlineChart(interval);
    }
}

function initSingleKlineChart(interval) {
    var klineEl = document.getElementById('klineChart_' + interval);
    var macdEl = document.getElementById('macdChart_' + interval);
    if (!klineEl || !macdEl) {
        console.error('[Chart] K线容器不存在: ' + interval);
        return;
    }

    // 创建 K 线图
    var klineChart = LightweightCharts.createChart(klineEl, {
        width: klineEl.clientWidth,
        height: 300,
        layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#8892b0' },
        grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.1)' } },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
        timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true, secondsVisible: false },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    });

    var klineSeries = klineChart.addCandlestickSeries({
        upColor: '#26a69a', downColor: '#ef5350',
        borderDownColor: '#ef5350', borderUpColor: '#26a69a',
        wickDownColor: '#ef5350', wickUpColor: '#26a69a',
    });

    // 创建 MACD 图
    var macdChart = LightweightCharts.createChart(macdEl, {
        width: macdEl.clientWidth,
        height: 200,
        layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#8892b0' },
        grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.1)' } },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
        timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true, secondsVisible: false },
    });

    var macdHistSeries = macdChart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });
    var macdLineSeries = macdChart.addLineSeries({ color: '#2196F3', lineWidth: 2 });
    var signalSeries = macdChart.addLineSeries({ color: '#FF9800', lineWidth: 2 });

    // 同步时间轴（使用时间范围而不是逻辑范围）
    var syncing = false;
    klineChart.timeScale().subscribeVisibleTimeRangeChange(function(range) {
        if (syncing || !range) return;
        syncing = true;
        try { macdChart.timeScale().setVisibleRange(range); } catch (e) {}
        syncing = false;
    });
    macdChart.timeScale().subscribeVisibleTimeRangeChange(function(range) {
        if (syncing || !range) return;
        syncing = true;
        try { klineChart.timeScale().setVisibleRange(range); } catch (e) {}
        syncing = false;
    });

    // 保存图表对象
    klineCharts[interval] = {
        chart: klineChart,
        klineSeries: klineSeries,
        macdChart: macdChart,
        macdHistSeries: macdHistSeries,
        macdLineSeries: macdLineSeries,
        signalSeries: signalSeries,
        loaded: false
    };

    console.log('[Chart] K线 ' + interval + ' 分钟初始化成功');
}

// ========================================
// 加载 K 线数据
// ========================================
function fetchKlineData(interval) {
    fetch('/api/heart-rate/kline/' + interval).then(function(r) { return r.json(); }).then(function(d) {
        if (!d.data || d.data.length === 0) return;

        var charts = klineCharts[interval];
        if (!charts) return;

        var prevData = klineDataCache[interval];
        var dataChanged = !prevData || prevData.length !== d.data.length;

        // 更新 K 线数据
        if (dataChanged || !charts.loaded) {
            var klineFormatted = [];
            for (var i = 0; i < d.data.length; i++) {
                var item = d.data[i];
                var t = parseTime(item.time);
                if (t) {
                    klineFormatted.push({
                        time: t,
                        open: item.open,
                        high: item.high,
                        low: item.low,
                        close: item.close
                    });
                }
            }
            charts.klineSeries.setData(klineFormatted);
        } else if (d.data.length > 0) {
            // 只更新最后一个点
            var last = d.data[d.data.length - 1];
            var lt = parseTime(last.time);
            if (lt) {
                charts.klineSeries.update({
                    time: lt,
                    open: last.open,
                    high: last.high,
                    low: last.low,
                    close: last.close
                });
            }
        }

        // 更新 MACD 数据
        var macdInfo = document.getElementById('macdInfo_' + interval);
        if (d.macd && d.macd.length > 0) {
            if (dataChanged || !charts.loaded) {
                var histData = [], lineData = [], sigData = [];
                for (var j = 0; j < d.macd.length; j++) {
                    var m = d.macd[j];
                    var mt = parseTime(m.time);
                    if (mt && typeof m.histogram === 'number' && !isNaN(m.histogram)) {
                        histData.push({ time: mt, value: m.histogram, color: m.histogram >= 0 ? '#26a69a' : '#ef5350' });
                        lineData.push({ time: mt, value: m.macd });
                        sigData.push({ time: mt, value: m.signal });
                    }
                }
                if (histData.length > 0) {
                    charts.macdHistSeries.setData(histData);
                    charts.macdLineSeries.setData(lineData);
                    charts.signalSeries.setData(sigData);
                }
            } else if (d.macd.length > 0) {
                var lastM = d.macd[d.macd.length - 1];
                var lmt = parseTime(lastM.time);
                if (lmt) {
                    charts.macdHistSeries.update({ time: lmt, value: lastM.histogram, color: lastM.histogram >= 0 ? '#26a69a' : '#ef5350' });
                    charts.macdLineSeries.update({ time: lmt, value: lastM.macd });
                    charts.signalSeries.update({ time: lmt, value: lastM.signal });
                }
            }

            var lastMacd = d.macd[d.macd.length - 1];
            if (macdInfo) {
                macdInfo.textContent = 'MACD: ' + lastMacd.macd + ' | 信号: ' + lastMacd.signal + ' | 柱状: ' + lastMacd.histogram;
                macdInfo.style.color = lastMacd.histogram >= 0 ? '#26a69a' : '#ef5350';
            }
        } else {
            if (macdInfo) {
                macdInfo.textContent = 'MACD 需要至少 34 个数据点';
                macdInfo.style.color = '#8892b0';
            }
        }

        // 更新信息
        var klineInfo = document.getElementById('klineInfo_' + interval);
        if (klineInfo) {
            klineInfo.textContent = '周期: ' + interval + '分钟 | 数据点: ' + d.total_groups;
        }

        // fitContent（只在首次加载或数据量变化时）
        if (dataChanged || !charts.loaded) {
            charts.chart.timeScale().fitContent();
            // 同步 MACD 时间轴
            var timeRange = charts.chart.timeScale().getVisibleTimeRange();
            if (timeRange) {
                try { charts.macdChart.timeScale().setVisibleRange(timeRange); } catch (e) {}
            }
            charts.loaded = true;
        }

        klineDataCache[interval] = d.data;
    }).catch(function(e) { console.error('[K线] 错误:', e); });
}

// ========================================
// 轮询心率
// ========================================
function pollHeartRate() {
    fetch('/api/heart-rate').then(function(r) { return r.json(); }).then(function(d) {
        var hr = d.current;
        var ts = d.timestamp;

        var dot = document.getElementById('statusDot');
        var txt = document.getElementById('connectionStatus');
        if (d.connected) { dot.className = 'status-dot connected'; txt.textContent = '已连接'; }
        else { dot.className = 'status-dot disconnected'; txt.textContent = '未连接'; }

        if (hr && hr !== lastHeartRate) {
            lastHeartRate = hr;
            document.getElementById('currentHeartRate').textContent = hr;
            updateHeartRateStatus(hr);
            document.getElementById('lastUpdate').textContent = '最后更新: ' + ts.split(' ')[1];

            if (currentChartType === 'realtime' && realtimeSeries) {
                var time = parseTime(ts);
                if (time) realtimeSeries.update({ time: time, value: hr });
            }
        }
    }).catch(function() {});
}

// ========================================
// 交易功能
// ========================================
function fetchHistoryData() {
    fetch('/api/heart-rate/history').then(function(r) { return r.json(); }).then(function(d) {
        updateStats(d.stats);
        updateDataTable(d.data);
    }).catch(function() {});
}

function fetchTradingData() {
    fetch('/api/trading').then(function(r) { return r.json(); }).then(function(d) {
        document.getElementById('tradingCapital').textContent = formatMoney(d.capital);
        document.getElementById('tradingShares').textContent = d.shares + ' 股';
        document.getElementById('tradingPrice').textContent = '¥' + d.current_price;
        document.getElementById('tradingValue').textContent = formatMoney(d.portfolio_value);
        var pe = document.getElementById('tradingProfit');
        pe.textContent = (d.profit >= 0 ? '+' : '') + formatMoney(d.profit);
        pe.className = 'trading-stat-value ' + (d.profit >= 0 ? 'positive' : 'negative');
        var pre = document.getElementById('tradingProfitRate');
        pre.textContent = (d.profit_rate >= 0 ? '+' : '') + d.profit_rate.toFixed(2) + '%';
        pre.className = 'trading-stat-value ' + (d.profit_rate >= 0 ? 'positive' : 'negative');
        document.getElementById('tradingPosition').textContent = d.position + '%';
        document.getElementById('tradingCount').textContent = d.trade_count;
    }).catch(function() {});
}

function fetchTradingHistory() {
    fetch('/api/trading/history').then(function(r) { return r.json(); }).then(function(d) {
        var c = document.getElementById('tradingHistory');
        if (!d.trades || !d.trades.length) { c.innerHTML = '<div style="text-align:center;color:#8892b0;padding:20px">暂无交易记录</div>'; return; }
        var html = '';
        for (var i = 0; i < d.trades.length; i++) {
            var t = d.trades[i];
            var isBuy = t.type === 'BUY';
            var cls = isBuy ? 'buy' : 'sell';
            var txt = isBuy ? '买入' : '卖出';
            var profitHTML = '';
            if (!isBuy && t.profit !== undefined) {
                var pc = t.profit >= 0 ? 'positive' : 'negative';
                profitHTML = '<div class="trade-profit"><div class="trade-profit-value ' + pc + '">' + (t.profit >= 0 ? '+' : '') + formatMoney(t.profit) + '</div><div class="trade-profit-rate">' + (t.profit_rate >= 0 ? '+' : '') + t.profit_rate + '%</div></div>';
            } else {
                profitHTML = '<div class="trade-profit"><div class="trade-profit-value">' + formatMoney(t.cost || 0) + '</div><div class="trade-profit-rate">成本</div></div>';
            }
            html += '<div class="trade-row"><div class="trade-type ' + cls + '">' + txt + '</div><div class="trade-info"><div class="trade-time">' + t.time + '</div><div class="trade-details">' + t.shares + '股 @ ¥' + t.price + '</div></div>' + profitHTML + '</div>';
        }
        c.innerHTML = html;
    }).catch(function() {});
}

function fetchConditionalOrders() {
    fetch('/api/trading/conditional-orders').then(function(r) { return r.json(); }).then(function(d) {
        var c = document.getElementById('conditionalOrdersList');
        if (!d.orders || !d.orders.length) { c.innerHTML = '<div style="text-align:center;color:#8892b0;padding:10px">暂无条件单</div>'; return; }
        var html = '';
        for (var i = 0; i < d.orders.length; i++) {
            var o = d.orders[i];
            var cls = o.order_type === 'buy' ? 'buy' : 'sell';
            var txt = o.order_type === 'buy' ? '买入' : '卖出';
            var st = o.triggered ? '已触发' : '等待中';
            var sc = o.triggered ? 'triggered' : 'pending';
            html += '<div class="order-row"><div class="order-type ' + cls + '">' + txt + '</div><div class="order-info"><div class="order-condition">' + o.condition + '</div><div class="order-details">' + (o.shares ? o.shares + '股' : '全仓') + ' <span class="order-status ' + sc + '">' + st + '</span></div></div><button class="order-delete" onclick="doRemoveOrder(' + i + ')">删除</button></div>';
        }
        c.innerHTML = html;
    }).catch(function() {});
}

function formatMoney(amount) {
    if (Math.abs(amount) >= 10000) return (amount / 10000).toFixed(2) + '万';
    return amount.toFixed(2);
}

// ========================================
// 交易操作
// ========================================
window.doBuy = function() {
    var amount = document.getElementById('tradeAmount').value;
    var body = amount ? { amount: parseFloat(amount) } : {};
    fetch('/api/trading/buy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(function(r) { return r.json(); }).then(function(d) { alert(d.message); fetchTradingData(); fetchTradingHistory(); });
};

window.doSell = function() {
    var amount = document.getElementById('tradeAmount').value;
    var body = amount ? { amount: parseFloat(amount) } : {};
    fetch('/api/trading/sell', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(function(r) { return r.json(); }).then(function(d) { alert(d.message); fetchTradingData(); fetchTradingHistory(); });
};

window.doReset = function() {
    if (!confirm('确定要重置交易数据吗？')) return;
    fetch('/api/trading/reset', { method: 'POST' }).then(function() { fetchTradingData(); fetchTradingHistory(); fetchConditionalOrders(); });
};

window.doAddOrder = function() {
    var type = document.getElementById('orderType').value;
    var condition = document.getElementById('orderCondition').value;
    var shares = document.getElementById('orderShares').value;
    if (!condition) { alert('请输入条件'); return; }
    fetch('/api/trading/conditional-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_type: type, condition: condition, shares: shares ? parseInt(shares) : null })
    }).then(function(r) { return r.json(); }).then(function(d) { alert(d.message); fetchConditionalOrders(); });
};

window.doRemoveOrder = function(index) {
    fetch('/api/trading/conditional-orders/' + index, { method: 'DELETE' }).then(function() { fetchConditionalOrders(); });
};

// ========================================
// 图表切换
// ========================================
function switchChartType(chartType) {
    currentChartType = chartType;

    // 更新标签状态
    var tabs = document.querySelectorAll('.chart-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', tabs[i].dataset.chart === chartType);
    }

    // 隐藏所有 K 线容器
    var klineContainers = document.querySelectorAll('.kline-interval-container');
    for (var j = 0; j < klineContainers.length; j++) {
        klineContainers[j].style.display = 'none';
    }

    var rtc = document.getElementById('realtimeChartContainer');

    if (chartType === 'realtime') {
        rtc.style.display = 'block';
    } else {
        rtc.style.display = 'none';
        var interval = parseInt(chartType.split('-')[1]);
        var container = document.getElementById('klineContainer_' + interval);
        if (container) {
            container.style.display = 'block';
            // 调整图表宽度
            var charts = klineCharts[interval];
            if (charts) {
                var kEl = document.getElementById('klineChart_' + interval);
                var mEl = document.getElementById('macdChart_' + interval);
                if (kEl) charts.chart.applyOptions({ width: kEl.clientWidth });
                if (mEl) charts.macdChart.applyOptions({ width: mEl.clientWidth });
            }
        }
        // 刷新数据
        fetchKlineData(interval);
    }
}

// ========================================
// 初始化
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Init] 开始初始化');

    initRealtimeChart();
    initKlineCharts();

    // 加载初始数据
    fetchHistoryData();
    fetchTradingData();
    fetchTradingHistory();
    fetchConditionalOrders();
    pollHeartRate();

    // 加载实时曲线历史数据
    fetch('/api/heart-rate/history').then(function(r) { return r.json(); }).then(function(d) {
        if (d.data && d.data.length > 0 && realtimeSeries) {
            var points = [];
            var start = Math.max(0, d.data.length - 60);
            for (var i = start; i < d.data.length; i++) {
                var t = parseTime(d.data[i].timestamp);
                if (t) points.push({ time: t, value: d.data[i].heartRate });
            }
            if (points.length > 0) {
                realtimeSeries.setData(points);
                realtimeChart.timeScale().fitContent();
            }
            console.log('[Init] 加载了 ' + points.length + ' 个历史点到实时曲线');
        }
    });

    // 预加载所有 K 线数据
    for (var k = 0; k < KLINE_INTERVALS.length; k++) {
        fetchKlineData(KLINE_INTERVALS[k]);
    }

    // 定时刷新（全部 1 秒）
    setInterval(pollHeartRate, 1000);
    setInterval(fetchHistoryData, 1000);
    setInterval(fetchTradingData, 1000);
    setInterval(fetchTradingHistory, 1000);
    setInterval(fetchConditionalOrders, 1000);

    // K 线数据刷新
    setInterval(function() {
        if (currentChartType !== 'realtime') {
            var interval = parseInt(currentChartType.split('-')[1]);
            fetchKlineData(interval);
        }
    }, 1000);

    // 图表切换事件
    var tabs = document.querySelectorAll('.chart-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function() { switchChartType(this.dataset.chart); });
    }

    console.log('[Init] 初始化完成');
});
