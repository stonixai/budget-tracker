'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { SkeletonTable } from '@/components/ui/LoadingSkeleton';
import { SessionIndicator } from '@/components/ui/SecurityBadge';
import { formatCurrency } from '@/lib/utils';
import AnalyticsCharts from '@/components/analytics/AnalyticsCharts';
import Link from 'next/link';

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

interface AnalyticsSummary {
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  avgDailySpending: number;
  topCategory: {
    name: string;
    amount: number;
    icon: string;
  } | null;
  spendingTrend: 'up' | 'down' | 'stable';
}

function AnalyticsPageContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | '3months' | '6months' | 'year'>('month');
  const { user, signOut } = useAuth();

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      calculateSummary();
    }
  }, [transactions, timeRange]);

  const fetchTransactions = async () => {
    try {
      setError(null);
      const response = await fetch('/api/transactions');
      if (response.status === 401) {
        signOut();
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Unable to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = () => {
    const now = new Date();
    let startDate = new Date();
    
    // Set date range
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

    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate average daily spending
    const days = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const avgDailySpending = days > 0 ? totalExpenses / days : 0;

    // Find top spending category
    const categoryTotals = new Map<string, { amount: number; icon: string }>();
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const key = t.categoryName;
        if (!categoryTotals.has(key)) {
          categoryTotals.set(key, { amount: 0, icon: t.categoryIcon });
        }
        categoryTotals.get(key)!.amount += t.amount;
      });

    const topCategory = categoryTotals.size > 0 
      ? Array.from(categoryTotals.entries()).reduce((max, [name, data]) => 
          data.amount > (max?.amount || 0) ? { name, amount: data.amount, icon: data.icon } : max
        , null as { name: string; amount: number; icon: string } | null)
      : null;

    // Determine spending trend (compare with previous period)
    let previousStartDate = new Date(startDate);
    const periodLength = now.getTime() - startDate.getTime();
    previousStartDate = new Date(startDate.getTime() - periodLength);

    const previousExpenses = transactions
      .filter(t => {
        const date = new Date(t.date);
        return t.type === 'expense' && date >= previousStartDate && date < startDate;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    let spendingTrend: 'up' | 'down' | 'stable' = 'stable';
    if (previousExpenses > 0) {
      const changePercent = ((totalExpenses - previousExpenses) / previousExpenses) * 100;
      if (changePercent > 5) spendingTrend = 'up';
      else if (changePercent < -5) spendingTrend = 'down';
    }

    setSummary({
      totalTransactions: filteredTransactions.length,
      totalIncome,
      totalExpenses,
      avgDailySpending,
      topCategory,
      spendingTrend
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <SkeletonTable rows={8} columns={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                📊 Analytics Dashboard
                <SessionIndicator isAuthenticated={!!user} className="text-sm" />
              </h1>
              <p className="text-gray-600 mt-1">Visual insights into your spending patterns and financial trends</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm" leftIcon={<ArrowLeftIcon />}>
                  Dashboard
                </Button>
              </Link>
              <Link href="/transactions">
                <Button variant="outline" size="sm" leftIcon={<PlusIcon />}>
                  Add Transaction
                </Button>
              </Link>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <Alert 
              variant="error" 
              title="Error"
              description={error}
              dismissible
              onDismiss={() => setError(null)}
              className="mb-4"
            />
          )}
        </div>

        {transactions.length === 0 ? (
          <Card variant="elevated">
            <CardBody className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <ChartIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-500 mb-6">
                You need transactions to view analytics. Add some income and expenses to see your financial insights.
              </p>
              <Link href="/transactions">
                <Button variant="primary" leftIcon={<PlusIcon />}>
                  Add Your First Transaction
                </Button>
              </Link>
            </CardBody>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
                  <CardBody className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-200 rounded-lg">
                        <HashtagIcon className="w-5 h-5 text-primary-700" />
                      </div>
                      <div>
                        <p className="text-sm text-primary-600">Total Transactions</p>
                        <p className="text-2xl font-bold text-primary-900">{summary.totalTransactions}</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card className="bg-gradient-to-r from-success-50 to-success-100 border-success-200">
                  <CardBody className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-success-200 rounded-lg">
                        <TrendingUpIcon className="w-5 h-5 text-success-700" />
                      </div>
                      <div>
                        <p className="text-sm text-success-600">Total Income</p>
                        <p className="text-2xl font-bold text-success-900">{formatCurrency(summary.totalIncome)}</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card className="bg-gradient-to-r from-error-50 to-error-100 border-error-200">
                  <CardBody className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-error-200 rounded-lg">
                        <TrendingDownIcon className="w-5 h-5 text-error-700" />
                      </div>
                      <div>
                        <p className="text-sm text-error-600">Total Expenses</p>
                        <p className="text-2xl font-bold text-error-900">{formatCurrency(summary.totalExpenses)}</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card className="bg-gradient-to-r from-warning-50 to-warning-100 border-warning-200">
                  <CardBody className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-warning-200 rounded-lg">
                        <CalendarIcon className="w-5 h-5 text-warning-700" />
                      </div>
                      <div>
                        <p className="text-sm text-warning-600">Avg. Daily Spending</p>
                        <p className="text-2xl font-bold text-warning-900">{formatCurrency(summary.avgDailySpending)}</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}

            {/* Additional Insights */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200">
                  <CardBody className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">🏆</span>
                      <div>
                        <h3 className="font-semibold text-indigo-900">Top Spending Category</h3>
                        <p className="text-sm text-indigo-700">Your biggest expense category</p>
                      </div>
                    </div>
                    {summary.topCategory ? (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{summary.topCategory.icon}</span>
                        <div>
                          <p className="font-medium text-indigo-900">{summary.topCategory.name}</p>
                          <p className="text-lg font-bold text-indigo-800">{formatCurrency(summary.topCategory.amount)}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-indigo-700">No expense categories yet</p>
                    )}
                  </CardBody>
                </Card>

                <Card className={`bg-gradient-to-r ${
                  summary.spendingTrend === 'up' 
                    ? 'from-red-50 to-red-100 border-red-200' 
                    : summary.spendingTrend === 'down'
                    ? 'from-green-50 to-green-100 border-green-200'
                    : 'from-gray-50 to-gray-100 border-gray-200'
                }`}>
                  <CardBody className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">
                        {summary.spendingTrend === 'up' ? '📈' : summary.spendingTrend === 'down' ? '📉' : '➡️'}
                      </span>
                      <div>
                        <h3 className={`font-semibold ${
                          summary.spendingTrend === 'up' ? 'text-red-900' :
                          summary.spendingTrend === 'down' ? 'text-green-900' : 'text-gray-900'
                        }`}>Spending Trend</h3>
                        <p className={`text-sm ${
                          summary.spendingTrend === 'up' ? 'text-red-700' :
                          summary.spendingTrend === 'down' ? 'text-green-700' : 'text-gray-700'
                        }`}>Compared to previous period</p>
                      </div>
                    </div>
                    <p className={`text-lg font-medium ${
                      summary.spendingTrend === 'up' ? 'text-red-800' :
                      summary.spendingTrend === 'down' ? 'text-green-800' : 'text-gray-800'
                    }`}>
                      {summary.spendingTrend === 'up' && 'Spending has increased'}
                      {summary.spendingTrend === 'down' && 'Spending has decreased'}
                      {summary.spendingTrend === 'stable' && 'Spending is stable'}
                    </p>
                  </CardBody>
                </Card>
              </div>
            )}

            {/* Charts */}
            <AnalyticsCharts 
              transactions={transactions}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </>
        )}
      </div>
    </div>
  );
}

// Icon Components
const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const ChartIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const HashtagIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
  </svg>
);

const TrendingUpIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendingDownIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const CalendarIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsPageContent />
    </ProtectedRoute>
  );
}