/**
 * ESP32 华为手环心率监测系统
 */

// 折叠功能
window.toggleCard = function(header) {
    header.parentElement.classList.toggle('collapsed');
};

// 全局变量
var realtimeChart = null;
var realtimeSeries = null;
var klineChart = null;
var klineSeries = null;
var macdChart = null;
var macdHistSeries = null;
var macdLineSeries = null;
var signalSeries = null;
var currentChartType = 'realtime';

// 解析时间字符串为 Unix 时间戳（秒）
function parseTime(ts) {
    // ts 格式: "2026-06-25 12:51:00"
    var parts = ts.split(' ');
    var dateParts = parts[0].split('-');
    var timeParts = parts[1].split(':');
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
// 初始化所有图表
// ========================================
function initCharts() {
    // 1) 实时曲线
    var rtEl = document.getElementById('realtimeChart');
    if (rtEl) {
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
        console.log('[Chart] 实时曲线初始化成功');
    }

    // 2) K 线图
    var kEl = document.getElementById('klineChart');
    if (kEl) {
        klineChart = LightweightCharts.createChart(kEl, {
            width: kEl.clientWidth,
            height: 300,
            layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#8892b0' },
            grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.1)' } },
            rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
            timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true, secondsVisible: false },
            crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        });
        klineSeries = klineChart.addCandlestickSeries({
            upColor: '#26a69a', downColor: '#ef5350',
            borderDownColor: '#ef5350', borderUpColor: '#26a69a',
            wickDownColor: '#ef5350', wickUpColor: '#26a69a',
        });
        console.log('[Chart] K线初始化成功');
    }

    // 3) MACD - 增加高度到 200px
    var mEl = document.getElementById('macdChart');
    if (mEl) {
        macdChart = LightweightCharts.createChart(mEl, {
            width: mEl.clientWidth,
            height: 200,
            layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#8892b0' },
            grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.1)' } },
            rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
            timeScale: { borderColor: 'rgba(255,255,255,0.1)', visible: true, timeVisible: true, secondsVisible: false },
        });
        macdHistSeries = macdChart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        });
        macdLineSeries = macdChart.addLineSeries({ color: '#2196F3', lineWidth: 2 });
        signalSeries = macdChart.addLineSeries({ color: '#FF9800', lineWidth: 2 });
        console.log('[Chart] MACD初始化成功');
    }

    // 同步 K 线和 MACD 时间轴
    if (klineChart && macdChart) {
        klineChart.timeScale().subscribeVisibleLogicalRangeChange(function(range) {
            if (range) macdChart.timeScale().setVisibleLogicalRange(range);
        });
        macdChart.timeScale().subscribeVisibleLogicalRangeChange(function(range) {
            if (range) klineChart.timeScale().setVisibleLogicalRange(range);
        });
    }

    // 窗口大小变化
    window.addEventListener('resize', function() {
        var rtEl2 = document.getElementById('realtimeChart');
        var kEl2 = document.getElementById('klineChart');
        var mEl2 = document.getElementById('macdChart');
        if (realtimeChart && rtEl2) realtimeChart.applyOptions({ width: rtEl2.clientWidth });
        if (klineChart && kEl2) klineChart.applyOptions({ width: kEl2.clientWidth });
        if (macdChart && mEl2) macdChart.applyOptions({ width: mEl2.clientWidth });
    });
}

// ========================================
// 实时更新（轮询方式）
// ========================================
var lastHeartRate = 0;

function pollHeartRate() {
    fetch('/api/heart-rate').then(function(r) { return r.json(); }).then(function(d) {
        var hr = d.current;
        var ts = d.timestamp;

        // 更新连接状态
        var dot = document.getElementById('statusDot');
        var txt = document.getElementById('connectionStatus');
        if (d.connected) { dot.className = 'status-dot connected'; txt.textContent = '已连接'; }
        else { dot.className = 'status-dot disconnected'; txt.textContent = '未连接'; }

        // 只有心率变化时才更新图表
        if (hr && hr !== lastHeartRate) {
            lastHeartRate = hr;

            // 更新心率显示
            document.getElementById('currentHeartRate').textContent = hr;
            updateHeartRateStatus(hr);
            document.getElementById('lastUpdate').textContent = '最后更新: ' + ts.split(' ')[1];

            // 更新实时曲线
            if (currentChartType === 'realtime' && realtimeSeries) {
                var time = parseTime(ts);
                realtimeSeries.update({ time: time, value: hr });
                console.log('[实时] 心率更新: ' + hr);
            }
        }
    }).catch(function() {});
}

// ========================================
// API 调用
// ========================================

function fetchHistoryData() {
    fetch('/api/heart-rate/history').then(function(r) { return r.json(); }).then(function(d) {
        updateStats(d.stats);
        updateDataTable(d.data);
    }).catch(function() {});
}

// K 线数据缓存
var klineCache = {};
var macdCache = {};

function fetchKlineData(interval) {
    fetch('/api/heart-rate/kline/' + interval).then(function(r) { return r.json(); }).then(function(d) {
        if (!d.data || d.data.length === 0) return;

        var prevKline = klineCache[interval] || [];
        var prevMacd = macdCache[interval] || [];

        // K 线数据
        if (klineSeries) {
            if (prevKline.length === d.data.length && d.data.length > 0) {
                var last = d.data[d.data.length - 1];
                klineSeries.update({
                    time: parseTime(last.time),
                    open: last.open,
                    high: last.high,
                    low: last.low,
                    close: last.close
                });
            } else {
                var klineFormatted = [];
                for (var i = 0; i < d.data.length; i++) {
                    var item = d.data[i];
                    klineFormatted.push({
                        time: parseTime(item.time),
                        open: item.open,
                        high: item.high,
                        low: item.low,
                        close: item.close
                    });
                }
                klineSeries.setData(klineFormatted);
            }
            klineCache[interval] = d.data;
        }

        // MACD 数据
        var macdInfo = document.getElementById('macdInfo');
        if (d.macd && d.macd.length > 0 && macdHistSeries) {
            if (prevMacd.length === d.macd.length && d.macd.length > 0) {
                var lastM = d.macd[d.macd.length - 1];
                var t = parseTime(lastM.time);
                macdHistSeries.update({ time: t, value: lastM.histogram, color: lastM.histogram >= 0 ? '#26a69a' : '#ef5350' });
                macdLineSeries.update({ time: t, value: lastM.macd });
                signalSeries.update({ time: t, value: lastM.signal });
            } else {
                var histData = [], lineData = [], sigData = [];
                for (var j = 0; j < d.macd.length; j++) {
                    var m = d.macd[j];
                    var tt = parseTime(m.time);
                    // 确保所有值都是有效数字
                    if (tt && typeof m.histogram === 'number' && !isNaN(m.histogram) &&
                        typeof m.macd === 'number' && !isNaN(m.macd) &&
                        typeof m.signal === 'number' && !isNaN(m.signal)) {
                        histData.push({ time: tt, value: m.histogram, color: m.histogram >= 0 ? '#26a69a' : '#ef5350' });
                        lineData.push({ time: tt, value: m.macd });
                        sigData.push({ time: tt, value: m.signal });
                    }
                }
                if (histData.length > 0) {
                    macdHistSeries.setData(histData);
                    macdLineSeries.setData(lineData);
                    signalSeries.setData(sigData);
                }
            }
            macdCache[interval] = d.macd;

            var lastMacd = d.macd[d.macd.length - 1];
            macdInfo.textContent = 'MACD: ' + lastMacd.macd + ' | 信号: ' + lastMacd.signal + ' | 柱状: ' + lastMacd.histogram;
            macdInfo.style.color = lastMacd.histogram >= 0 ? '#26a69a' : '#ef5350';
        } else {
            if (macdInfo) {
                macdInfo.textContent = 'MACD 需要至少 34 个数据点';
                macdInfo.style.color = '#8892b0';
            }
        }

        // 同步时间轴
        if (klineChart && macdChart) {
            try {
                klineChart.timeScale().fitContent();
                macdChart.timeScale().fitContent();
            } catch (e) {}
        }

        document.getElementById('klineInfo').textContent = '周期: ' + interval + '分钟 | 数据点: ' + d.total_groups;
    }).catch(function(e) { console.error('[K线] 错误:', e); });
}

// ========================================
// 交易功能
// ========================================
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
    var tabs = document.querySelectorAll('.chart-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', tabs[i].dataset.chart === chartType);
    }
    var rtc = document.getElementById('realtimeChartContainer');
    var klc = document.getElementById('klineChartContainer');
    if (chartType === 'realtime') {
        rtc.style.display = 'block';
        klc.style.display = 'none';
        // 实时曲线需要重新调整宽度
        if (realtimeChart) {
            var rtEl = document.getElementById('realtimeChart');
            realtimeChart.applyOptions({ width: rtEl.clientWidth });
        }
    } else {
        rtc.style.display = 'none';
        klc.style.display = 'block';
        // K 线和 MACD 需要重新调整宽度（因为之前是隐藏的）
        var kEl = document.getElementById('klineChart');
        var mEl = document.getElementById('macdChart');
        if (klineChart && kEl) klineChart.applyOptions({ width: kEl.clientWidth });
        if (macdChart && mEl) macdChart.applyOptions({ width: mEl.clientWidth });
        var interval = parseInt(chartType.split('-')[1]);
        fetchKlineData(interval);
    }
}

// ========================================
// 初始化
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Init] 开始初始化');

    // 初始化图表
    initCharts();

    // 加载初始数据
    fetchHistoryData();
    fetchTradingData();
    fetchTradingHistory();
    fetchConditionalOrders();
    pollHeartRate();

    // 预加载所有 K 线数据（这样切换时不需要等待）
    var intervals = [1, 5, 10, 30, 60];
    for (var k = 0; k < intervals.length; k++) {
        fetchKlineData(intervals[k]);
    }

    // 加载实时曲线历史数据
    fetch('/api/heart-rate/history').then(function(r) { return r.json(); }).then(function(d) {
        if (d.data && d.data.length > 0 && realtimeSeries) {
            var points = [];
            var start = Math.max(0, d.data.length - 60);
            for (var i = start; i < d.data.length; i++) {
                points.push({ time: parseTime(d.data[i].timestamp), value: d.data[i].heartRate });
            }
            realtimeSeries.setData(points);
            realtimeChart.timeScale().fitContent();
            console.log('[Init] 加载了 ' + points.length + ' 个历史点到实时曲线');
        }
    });

    // 全部 1 秒刷新
    setInterval(pollHeartRate, 1000);
    setInterval(fetchHistoryData, 1000);
    setInterval(fetchTradingData, 1000);
    setInterval(fetchTradingHistory, 1000);
    setInterval(fetchConditionalOrders, 1000);
    setInterval(function() {
        if (currentChartType !== 'realtime') {
            fetchKlineData(parseInt(currentChartType.split('-')[1]));
        }
    }, 1000);

    // 图表切换
    var tabs = document.querySelectorAll('.chart-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function() { switchChartType(this.dataset.chart); });
    }

    console.log('[Init] 初始化完成');
});
