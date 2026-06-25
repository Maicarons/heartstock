"""
交易模拟模块 - 手动交易 + 条件单
"""

from datetime import datetime
from backend.config import TRADING_CONFIG


class ConditionalOrder:
    """条件单"""

    def __init__(self, order_type, condition, price, shares=None, amount=None):
        """
        创建条件单

        参数:
            order_type: 'buy' 或 'sell'
            condition: 条件表达式，如 'heart_rate < 75'
            price: 触发时的股价（心率）
            shares: 股数（可选）
            amount: 金额（可选）
        """
        self.order_type = order_type
        self.condition = condition
        self.price = price
        self.shares = shares
        self.amount = amount
        self.created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.triggered = False

    def check(self, heart_rate):
        """检查条件是否满足"""
        if self.triggered:
            return False

        try:
            # 安全地评估条件
            result = eval(self.condition, {"heart_rate": heart_rate})
            return result
        except:
            return False

    def to_dict(self):
        """转换为字典"""
        return {
            'order_type': self.order_type,
            'condition': self.condition,
            'price': self.price,
            'shares': self.shares,
            'amount': self.amount,
            'created_at': self.created_at,
            'triggered': self.triggered
        }


class TradingSimulator:
    """交易模拟器 - 手动交易"""

    def __init__(self):
        self.initial_capital = TRADING_CONFIG['initial_capital']
        self.capital = self.initial_capital
        self.shares = 0
        self.avg_cost = 0
        self.trades = []
        self.portfolio_value = self.initial_capital
        self.current_price = 100  # 初始股价 = 初始心率
        self.position = 0
        self.conditional_orders = []  # 条件单列表
        self.reset()  # 每次启动时重置

    def reset(self):
        """重置交易数据（每次启动时调用）"""
        self.capital = self.initial_capital
        self.shares = 0
        self.avg_cost = 0
        self.trades = []
        self.portfolio_value = self.initial_capital
        self.current_price = 100
        self.position = 0
        self.conditional_orders = []
        print(f"[Trading] 已重置: 初始资金 {self.initial_capital} 元")

    def update_price(self, heart_rate):
        """更新股价（股价 = 心率）"""
        self.current_price = heart_rate

        # 更新总资产
        self.portfolio_value = self.capital + self.shares * heart_rate

        # 计算仓位
        if self.portfolio_value > 0:
            position_value = self.shares * heart_rate
            self.position = round((position_value / self.portfolio_value) * 100, 1)

        # 检查条件单
        self._check_conditional_orders(heart_rate)

    def buy(self, shares=None, amount=None):
        """
        手动买入

        参数:
            shares: 买入股数（可选）
            amount: 买入金额（可选）
        """
        if self.current_price <= 0:
            return {'success': False, 'message': '股价无效'}

        # 计算可买股数
        if shares:
            buy_shares = int(shares)
        elif amount:
            buy_shares = int(amount / self.current_price)
        else:
            # 默认全仓买入
            buy_shares = int(self.capital / self.current_price)

        if buy_shares <= 0:
            return {'success': False, 'message': '资金不足'}

        cost = buy_shares * self.current_price
        if cost > self.capital:
            return {'success': False, 'message': '资金不足'}

        # 执行买入
        self.capital -= cost
        self.shares += buy_shares

        # 计算平均成本
        if self.shares > 0:
            total_cost = self.avg_cost * (self.shares - buy_shares) + cost
            self.avg_cost = round(total_cost / self.shares, 2)

        # 记录交易
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        trade = {
            'time': timestamp,
            'type': 'BUY',
            'price': self.current_price,
            'shares': buy_shares,
            'cost': cost,
            'heart_rate': self.current_price,
            'reason': '手动买入'
        }
        self.trades.append(trade)

        return {
            'success': True,
            'message': f'买入 {buy_shares} 股，成本 ¥{cost:.2f}',
            'trade': trade
        }

    def sell(self, shares=None, amount=None):
        """
        手动卖出

        参数:
            shares: 卖出股数（可选）
            amount: 卖出金额（可选）
        """
        if self.shares <= 0:
            return {'success': False, 'message': '没有持仓'}

        # 计算卖出股数
        if shares:
            sell_shares = int(shares)
        elif amount:
            sell_shares = int(amount / self.current_price)
        else:
            # 默认全仓卖出
            sell_shares = self.shares

        # 确保不超过持仓
        sell_shares = min(sell_shares, self.shares)

        if sell_shares <= 0:
            return {'success': False, 'message': '卖出股数无效'}

        # 执行卖出
        revenue = sell_shares * self.current_price
        self.capital += revenue
        self.shares -= sell_shares

        # 计算盈亏
        profit = revenue - (sell_shares * self.avg_cost)
        profit_rate = (profit / (sell_shares * self.avg_cost)) * 100 if self.avg_cost > 0 else 0

        # 记录交易
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        trade = {
            'time': timestamp,
            'type': 'SELL',
            'price': self.current_price,
            'shares': sell_shares,
            'revenue': revenue,
            'profit': round(profit, 2),
            'profit_rate': round(profit_rate, 2),
            'heart_rate': self.current_price,
            'reason': '手动卖出'
        }
        self.trades.append(trade)

        # 如果清仓，重置平均成本
        if self.shares == 0:
            self.avg_cost = 0

        return {
            'success': True,
            'message': f'卖出 {sell_shares} 股，收入 ¥{revenue:.2f}，盈亏 ¥{profit:.2f}',
            'trade': trade
        }

    def add_conditional_order(self, order_type, condition, shares=None, amount=None):
        """
        添加条件单

        参数:
            order_type: 'buy' 或 'sell'
            condition: 条件表达式，如 'heart_rate < 75'
            shares: 股数（可选）
            amount: 金额（可选）
        """
        order = ConditionalOrder(
            order_type=order_type,
            condition=condition,
            price=self.current_price,
            shares=shares,
            amount=amount
        )
        self.conditional_orders.append(order)
        return {'success': True, 'message': f'条件单已添加: {condition}'}

    def remove_conditional_order(self, index):
        """删除条件单"""
        if 0 <= index < len(self.conditional_orders):
            del self.conditional_orders[index]
            return {'success': True, 'message': '条件单已删除'}
        return {'success': False, 'message': '条件单不存在'}

    def _check_conditional_orders(self, heart_rate):
        """检查所有条件单"""
        for order in self.conditional_orders:
            if order.check(heart_rate):
                order.triggered = True
                if order.order_type == 'buy':
                    self.buy(shares=order.shares, amount=order.amount)
                elif order.order_type == 'sell':
                    self.sell(shares=order.shares, amount=order.amount)

    def get_status(self):
        """获取交易状态"""
        # 更新总资产
        self.portfolio_value = self.capital + self.shares * self.current_price

        # 计算收益率
        profit = self.portfolio_value - self.initial_capital
        profit_rate = (profit / self.initial_capital) * 100

        return {
            'initial_capital': self.initial_capital,
            'capital': round(self.capital, 2),
            'shares': self.shares,
            'avg_cost': self.avg_cost,
            'current_price': self.current_price,
            'portfolio_value': round(self.portfolio_value, 2),
            'profit': round(profit, 2),
            'profit_rate': round(profit_rate, 2),
            'position': self.position,
            'trade_count': len(self.trades),
            'conditional_orders_count': len(self.conditional_orders)
        }

    def get_history(self, limit=50):
        """获取交易历史"""
        recent_trades = self.trades[-limit:] if self.trades else []
        recent_trades.reverse()

        return {
            'trades': recent_trades,
            'total_trades': len(self.trades)
        }

    def get_conditional_orders(self):
        """获取所有条件单"""
        return {
            'orders': [order.to_dict() for order in self.conditional_orders],
            'total': len(self.conditional_orders)
        }


# 全局交易模拟器实例
trading_simulator = TradingSimulator()
