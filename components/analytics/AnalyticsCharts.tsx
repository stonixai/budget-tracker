'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

interface Transaction {
  id: number;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  date: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
}

interface AnalyticsData {
  monthlyTrend: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  categoryBreakdown: Array<{
    name: string;
    value: number;
    color: string;
    icon: string;
    percentage: number;
  }>;
  dailySpending: Array<{
    date: string;
    amount: number;
    transactions: number;
  }>;
  topCategories: Array<{
    name: string;
    amount: number;
    color: string;
    icon: string;
    transactions: number;
  }>;
}

interface AnalyticsChartsProps {
  transactions: Transaction[];
  timeRange: 'week' | 'month' | '3months' | '6months' | 'year';
  onTimeRangeChange: (range: 'week' | 'month' | '3months' | '6months' | 'year') => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <span>{data.icon}</span>
          <p className="text-sm font-medium text-gray-900">{data.name}</p>
        </div>
        <p className="text-sm text-gray-600">
          {formatCurrency(data.value)} ({data.percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsCharts({ transactions, timeRange, onTimeRangeChange }: AnalyticsChartsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [activeChart, setActiveChart] = useState<'trend' | 'category' | 'daily' | 'top'>('trend');

  useEffect(() => {
    processAnalyticsData();
  }, [transactions, timeRange]);

  const processAnalyticsData = () => {
    if (!transactions.length) {
      setAnalyticsData(null);
      return;
    }

    const now = new Date();
    let startDate = new Date();
    
    // Set date range based on selection
    switch (timeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const filteredTransactions = transactions.filter(t => 
      new Date(t.date) >= startDate && new Date(t.date) <= now
    );

    // Monthly trend data
    const monthlyData = new Map<string, { income: number; expenses: number }>();
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { income: 0, expenses: 0 });
      }
      
      const data = monthlyData.get(monthKey)!;
      if (transaction.type === 'income') {
        data.income += transaction.amount;
      } else {
        data.expenses += transaction.amount;
      }
    });

    const monthlyTrend = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      income: data.income / 100,
      expenses: data.expenses / 100,
      net: (data.income - data.expenses) / 100
    }));

    // Category breakdown (expenses only)
    const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
    const categoryData = new Map<string, { amount: number; color: string; icon: string; count: number }>();
    
    expenseTransactions.forEach(transaction => {
      const key = transaction.categoryName;
      if (!categoryData.has(key)) {
        categoryData.set(key, { 
          amount: 0, 
          color: transaction.categoryColor, 
          icon: transaction.categoryIcon,
          count: 0
        });
      }
      
      const data = categoryData.get(key)!;
      data.amount += transaction.amount;
      data.count += 1;
    });

    const totalExpenses = Array.from(categoryData.values()).reduce((sum, cat) => sum + cat.amount, 0);
    
    const categoryBreakdown = Array.from(categoryData.entries()).map(([name, data]) => ({
      name,
      value: data.amount / 100,
      color: data.color,
      icon: data.icon,
      percentage: totalExpenses > 0 ? Math.round((data.amount / totalExpenses) * 100) : 0
    })).sort((a, b) => b.value - a.value);

    // Daily spending pattern
    const dailyData = new Map<string, { amount: number; transactions: number }>();
    
    expenseTransactions.forEach(transaction => {
      const dateKey = transaction.date;
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { amount: 0, transactions: 0 });
      }
      
      const data = dailyData.get(dateKey)!;
      data.amount += transaction.amount;
      data.transactions += 1;
    });

    const dailySpending = Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: data.amount / 100,
        transactions: data.transactions
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14); // Last 14 days

    // Top categories
    const topCategories = Array.from(categoryData.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount / 100,
        color: data.color,
        icon: data.icon,
        transactions: data.count
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    setAnalyticsData({
      monthlyTrend,
      categoryBreakdown,
      dailySpending,
      topCategories
    });
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f', '#ffbb28', '#ff8042'];

  if (!analyticsData || !transactions.length) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <ChartIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Available</h3>
          <p className="text-gray-500">Add some transactions to see visual insights about your spending patterns.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-wrap gap-2">
            {(['week', 'month', '3months', '6months', 'year'] as const).map((range) => (
              <Button
                key={range}
                onClick={() => onTimeRangeChange(range)}
                variant={timeRange === range ? 'primary' : 'outline'}
                size="sm"
              >
                {range === 'week' && 'Last 7 Days'}
                {range === 'month' && 'Last Month'}
                {range === '3months' && 'Last 3 Months'}
                {range === '6months' && 'Last 6 Months'}
                {range === 'year' && 'Last Year'}
              </Button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Chart Type Selector */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'trend', label: 'Income vs Expenses', icon: '📈' },
              { key: 'category', label: 'Category Breakdown', icon: '🥧' },
              { key: 'daily', label: 'Daily Spending', icon: '📊' },
              { key: 'top', label: 'Top Categories', icon: '🏆' }
            ].map((chart) => (
              <Button
                key={chart.key}
                onClick={() => setActiveChart(chart.key as any)}
                variant={activeChart === chart.key ? 'primary' : 'outline'}
                size="sm"
                leftIcon={<span>{chart.icon}</span>}
              >
                {chart.label}
              </Button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Charts */}
      {activeChart === 'trend' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Income vs Expenses Trend</h3>
            <p className="text-sm text-gray-500">Track your financial flow over time</p>
          </CardHeader>
          <CardBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                  <Line type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={2} name="Net" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      )}

      {activeChart === 'category' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Expense Categories</h3>
            <p className="text-sm text-gray-500">See where your money goes</p>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      dataKey="value"
                    >
                      {analyticsData.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Category Details</h4>
                {analyticsData.categoryBreakdown.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-lg">{category.icon}</span>
                      <div>
                        <p className="font-medium text-gray-900">{category.name}</p>
                        <p className="text-sm text-gray-500">{category.percentage}% of total</p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(category.value * 100)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {activeChart === 'daily' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Daily Spending Pattern</h3>
            <p className="text-sm text-gray-500">Your spending habits over the last 14 days</p>
          </CardHeader>
          <CardBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.dailySpending}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                    name="Daily Spending"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      )}

      {activeChart === 'top' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Top Spending Categories</h3>
            <p className="text-sm text-gray-500">Your biggest expense categories</p>
          </CardHeader>
          <CardBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.topCategories} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" name="Amount Spent">
                    {analyticsData.topCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

const ChartIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);