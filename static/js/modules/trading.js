/**
 * 交易模拟模块 - 手动交易 + 条件单
 */

let tradingData = null;

/**
 * 获取交易数据
 */
export async function fetchTradingData() {
    try {
        const response = await fetch('/api/trading');
        const data = await response.json();
        tradingData = data;
        updateTradingUI(data);
        return data;
    } catch (error) {
        console.error('获取交易数据失败:', error);
        return null;
    }
}

/**
 * 获取交易历史
 */
export async function fetchTradingHistory() {
    try {
        const response = await fetch('/api/trading/history');
        const data = await response.json();
        updateTradingHistory(data.trades);
        return data;
    } catch (error) {
        console.error('获取交易历史失败:', error);
        return null;
    }
}

/**
 * 更新交易界面
 */
function updateTradingUI(data) {
    // 更新统计数据
    document.getElementById('tradingCapital').textContent = formatMoney(data.capital);
    document.getElementById('tradingShares').textContent = data.shares + ' 股';
    document.getElementById('tradingPrice').textContent = '¥' + data.current_price.toFixed(2);
    document.getElementById('tradingValue').textContent = formatMoney(data.portfolio_value);

    // 更新盈亏显示
    const profitElement = document.getElementById('tradingProfit');
    const profitRateElement = document.getElementById('tradingProfitRate');

    profitElement.textContent = (data.profit >= 0 ? '+' : '') + formatMoney(data.profit);
    profitElement.className = 'trading-stat-value ' + (data.profit >= 0 ? 'positive' : 'negative');

    profitRateElement.textContent = (data.profit_rate >= 0 ? '+' : '') + data.profit_rate.toFixed(2) + '%';
    profitRateElement.className = 'trading-stat-value ' + (data.profit_rate >= 0 ? 'positive' : 'negative');

    // 更新仓位显示
    document.getElementById('tradingPosition').textContent = data.position + '%';

    // 更新交易次数
    document.getElementById('tradingCount').textContent = data.trade_count;
}

/**
 * 更新交易历史
 */
function updateTradingHistory(trades) {
    const container = document.getElementById('tradingHistory');

    if (!trades || trades.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #8892b0; padding: 20px;">暂无交易记录</div>';
        return;
    }

    container.innerHTML = trades.map(trade => {
        const isBuy = trade.type === 'BUY';
        const typeClass = isBuy ? 'buy' : 'sell';
        const typeText = isBuy ? '买入' : '卖出';

        let profitHTML = '';
        if (!isBuy && trade.profit !== undefined) {
            const profitClass = trade.profit >= 0 ? 'positive' : 'negative';
            profitHTML = `
                <div class="trade-profit">
                    <div class="trade-profit-value ${profitClass}">
                        ${trade.profit >= 0 ? '+' : ''}${formatMoney(trade.profit)}
                    </div>
                    <div class="trade-profit-rate">
                        ${trade.profit_rate >= 0 ? '+' : ''}${trade.profit_rate}%
                    </div>
                </div>
            `;
        } else {
            profitHTML = `
                <div class="trade-profit">
                    <div class="trade-profit-value">
                        ${formatMoney(trade.cost || 0)}
                    </div>
                    <div class="trade-profit-rate">成本</div>
                </div>
            `;
        }

        return `
            <div class="trade-row">
                <div class="trade-type ${typeClass}">${typeText}</div>
                <div class="trade-info">
                    <div class="trade-time">${trade.time}</div>
                    <div class="trade-details">
                        ${trade.shares}股 @ ¥${trade.price.toFixed(2)}
                        <span style="color: #8892b0; margin-left: 10px;">心率: ${trade.heart_rate}</span>
                    </div>
                </div>
                ${profitHTML}
            </div>
        `;
    }).join('');
}

/**
 * 格式化金额
 */
function formatMoney(amount) {
    if (Math.abs(amount) >= 10000) {
        return (amount / 10000).toFixed(2) + '万';
    }
    return amount.toFixed(2);
}

/**
 * 手动买入
 */
export async function buyStock(shares = null, amount = null) {
    try {
        const body = {};
        if (shares) body.shares = parseInt(shares);
        if (amount) body.amount = parseFloat(amount);

        const response = await fetch('/api/trading/buy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message);
            fetchTradingData();
            fetchTradingHistory();
        } else {
            alert('买入失败: ' + result.message);
        }

        return result;
    } catch (error) {
        console.error('买入失败:', error);
        alert('买入失败: ' + error.message);
        return { success: false, message: error.message };
    }
}

/**
 * 手动卖出
 */
export async function sellStock(shares = null, amount = null) {
    try {
        const body = {};
        if (shares) body.shares = parseInt(shares);
        if (amount) body.amount = parseFloat(amount);

        const response = await fetch('/api/trading/sell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message);
            fetchTradingData();
            fetchTradingHistory();
        } else {
            alert('卖出失败: ' + result.message);
        }

        return result;
    } catch (error) {
        console.error('卖出失败:', error);
        alert('卖出失败: ' + error.message);
        return { success: false, message: error.message };
    }
}

/**
 * 添加条件单
 */
export async function addConditionalOrder(orderType, condition, shares = null, amount = null) {
    try {
        const response = await fetch('/api/trading/conditional-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_type: orderType,
                condition: condition,
                shares: shares ? parseInt(shares) : null,
                amount: amount ? parseFloat(amount) : null
            })
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message);
            fetchConditionalOrders();
        } else {
            alert('添加条件单失败: ' + result.message);
        }

        return result;
    } catch (error) {
        console.error('添加条件单失败:', error);
        alert('添加条件单失败: ' + error.message);
        return { success: false, message: error.message };
    }
}

/**
 * 删除条件单
 */
export async function removeConditionalOrder(index) {
    try {
        const response = await fetch(`/api/trading/conditional-orders/${index}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            fetchConditionalOrders();
        } else {
            alert('删除条件单失败: ' + result.message);
        }

        return result;
    } catch (error) {
        console.error('删除条件单失败:', error);
        return { success: false, message: error.message };
    }
}

/**
 * 获取条件单列表
 */
export async function fetchConditionalOrders() {
    try {
        const response = await fetch('/api/trading/conditional-orders');
        const data = await response.json();
        updateConditionalOrdersUI(data.orders);
        return data;
    } catch (error) {
        console.error('获取条件单失败:', error);
        return null;
    }
}

/**
 * 更新条件单界面
 */
function updateConditionalOrdersUI(orders) {
    const container = document.getElementById('conditionalOrdersList');

    if (!orders || orders.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #8892b0; padding: 10px;">暂无条件单</div>';
        return;
    }

    container.innerHTML = orders.map((order, index) => {
        const typeClass = order.order_type === 'buy' ? 'buy' : 'sell';
        const typeText = order.order_type === 'buy' ? '买入' : '卖出';
        const statusText = order.triggered ? '已触发' : '等待中';
        const statusClass = order.triggered ? 'triggered' : 'pending';

        return `
            <div class="order-row">
                <div class="order-type ${typeClass}">${typeText}</div>
                <div class="order-info">
                    <div class="order-condition">${order.condition}</div>
                    <div class="order-details">
                        ${order.shares ? order.shares + '股' : ''}
                        ${order.amount ? formatMoney(order.amount) : ''}
                        <span class="order-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <button class="order-delete" onclick="window.removeOrder(${index})">删除</button>
            </div>
        `;
    }).join('');
}

/**
 * 重置交易
 */
export async function resetTrading() {
    if (!confirm('确定要重置交易数据吗？所有交易记录将被清除。')) {
        return;
    }

    try {
        await fetch('/api/trading/reset', { method: 'POST' });
        fetchTradingData();
        fetchTradingHistory();
        fetchConditionalOrders();
    } catch (error) {
        console.error('重置交易失败:', error);
    }
}

/**
 * 启动交易数据自动刷新
 */
export function startTradingAutoRefresh() {
    setInterval(fetchTradingData, 2000);
    setInterval(fetchTradingHistory, 5000);
    setInterval(fetchConditionalOrders, 5000);
}

/**
 * 获取当前交易数据
 */
export function getTradingData() {
    return tradingData;
}
