'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
// import { Alert } from '@/components/ui/Alert';
import { SkeletonDashboard } from '@/components/ui/LoadingSkeleton';
import { SessionIndicator } from '@/components/ui/SecurityBadge';
import { formatCurrency, formatRelativeTime, calculatePercentage } from '@/lib/utils';
import ExportModal from '@/components/export/ExportModal';
import SearchTrigger from '@/components/search/SearchTrigger';
import { NextThemeToggle } from '@/components/ui/NextThemeToggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
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

interface DashboardData {
  currentMonth: {
    totalIncome: number;
    totalExpenses: number;
  };
  lastMonth: {
    totalIncome: number;
    totalExpenses: number;
  };
  recentTransactions: Transaction[];
}

interface Budget {
  id: number;
  name: string;
  amount: number;
  spent: number;
  month: string;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
}

function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    fetchDashboardData();
    fetchBudgets();
    fetchTransactions();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.status === 401) {
        signOut();
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    }
  };

  const fetchBudgets = async () => {
    try {
      const response = await fetch('/api/budgets');
      if (response.status === 401) {
        signOut();
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch budgets');
      }
      const data = await response.json();
      setBudgets(data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      setError('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
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
    }
  };

  const getBalanceStatus = (balance: number) => {
    if (balance > 0) return { color: 'text-success-600', icon: '↗', trend: 'positive' }
    if (balance < 0) return { color: 'text-error-600', icon: '↘', trend: 'negative' }
    return { color: 'text-gray-600', icon: '→', trend: 'neutral' }
  }

  const getSpendingTrend = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, trend: 'neutral' }
    const change = ((current - previous) / previous) * 100
    if (change > 0) return { percentage: Math.round(change), trend: 'increase' }
    if (change < 0) return { percentage: Math.round(Math.abs(change)), trend: 'decrease' }
    return { percentage: 0, trend: 'neutral' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card variant="elevated" className="w-full max-w-md">
          <CardBody className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 bg-error-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Unable to Load Dashboard</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
            <Button 
              onClick={() => window.location.reload()}
              variant="primary"
              size="md"
              leftIcon={<RefreshIcon />}
            >
              Try Again
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const balance = dashboardData ? dashboardData.currentMonth.totalIncome - dashboardData.currentMonth.totalExpenses : 0;
  const balanceStatus = getBalanceStatus(balance);
  const expenseTrend = dashboardData ? getSpendingTrend(
    dashboardData.currentMonth.totalExpenses, 
    dashboardData.lastMonth.totalExpenses
  ) : { percentage: 0, trend: 'neutral' };
  const incomeTrend = dashboardData ? getSpendingTrend(
    dashboardData.currentMonth.totalIncome, 
    dashboardData.lastMonth.totalIncome
  ) : { percentage: 0, trend: 'neutral' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Security Indicators */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                Budget Tracker
                <div className="text-lg">
                  <SessionIndicator 
                    isAuthenticated={!!user}
                    className="text-sm"
                  />
                </div>
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-2">
                <span>Welcome back, {user?.name || 'User'}!</span>
                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <SearchTrigger className="hidden sm:flex" />
              <NotificationBell onNotificationClick={() => window.location.href = '/notifications'} />
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                <span>Live Data</span>
              </div>
              <NextThemeToggle variant="dropdown" />
              <Button
                onClick={signOut}
                variant="ghost"
                size="sm"
                leftIcon={<SignOutIcon />}
              >
                Sign Out
              </Button>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Link href="/transactions">
              <Button variant="outline" size="sm" leftIcon={<PlusIcon />}>
                Add Transaction
              </Button>
            </Link>
            <Link href="/budgets">
              <Button variant="outline" size="sm" leftIcon={<ChartBarIcon />}>
                Manage Budgets
              </Button>
            </Link>
            <Link href="/recurring">
              <Button variant="outline" size="sm" leftIcon={<RefreshIcon />}>
                Recurring
              </Button>
            </Link>
            <Link href="/goals">
              <Button variant="outline" size="sm" leftIcon={<TargetIcon />}>
                Goals
              </Button>
            </Link>
            <Link href="/accounts">
              <Button variant="outline" size="sm" leftIcon={<WalletIcon />}>
                Accounts
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="outline" size="sm" leftIcon={<AnalyticsIcon />}>
                Analytics
              </Button>
            </Link>
            <Button 
              onClick={() => setShowExportModal(true)}
              variant="ghost" 
              size="sm" 
              leftIcon={<DownloadIcon />}
            >
              Export Data
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Cards with Trends */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Income Card */}
          <Card variant="elevated" className="bg-gradient-to-br from-success-50 to-success-100 border-success-200">
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success-100 rounded-lg">
                    <TrendingUpIcon className="w-5 h-5 text-success-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-success-800">Monthly Income</h3>
                    <p className="text-xs text-success-600">Total earnings</p>
                  </div>
                </div>
                <div className="text-right">
                  {incomeTrend.trend !== 'neutral' && (
                    <div className={`flex items-center gap-1 text-xs ${
                      incomeTrend.trend === 'increase' ? 'text-success-600' : 'text-error-600'
                    }`}>
                      <span>{incomeTrend.trend === 'increase' ? '↗' : '↘'}</span>
                      <span>{incomeTrend.percentage}%</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-2xl font-bold text-success-700 mb-1">
                {formatCurrency(dashboardData?.currentMonth.totalIncome || 0)}
              </p>
              <p className="text-xs text-success-600">
                vs {formatCurrency(dashboardData?.lastMonth.totalIncome || 0)} last month
              </p>
            </CardBody>
          </Card>

          {/* Expenses Card */}
          <Card variant="elevated" className="bg-gradient-to-br from-error-50 to-error-100 border-error-200">
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-error-100 rounded-lg">
                    <TrendingDownIcon className="w-5 h-5 text-error-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-error-800">Monthly Expenses</h3>
                    <p className="text-xs text-error-600">Total spending</p>
                  </div>
                </div>
                <div className="text-right">
                  {expenseTrend.trend !== 'neutral' && (
                    <div className={`flex items-center gap-1 text-xs ${
                      expenseTrend.trend === 'increase' ? 'text-error-600' : 'text-success-600'
                    }`}>
                      <span>{expenseTrend.trend === 'increase' ? '↗' : '↘'}</span>
                      <span>{expenseTrend.percentage}%</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-2xl font-bold text-error-700 mb-1">
                {formatCurrency(dashboardData?.currentMonth.totalExpenses || 0)}
              </p>
              <p className="text-xs text-error-600">
                vs {formatCurrency(dashboardData?.lastMonth.totalExpenses || 0)} last month
              </p>
            </CardBody>
          </Card>

          {/* Balance Card */}
          <Card variant="elevated" className={`bg-gradient-to-br ${
            balance >= 0 
              ? 'from-primary-50 to-primary-100 border-primary-200' 
              : 'from-warning-50 to-warning-100 border-warning-200'
          }`}>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    balance >= 0 ? 'bg-primary-100' : 'bg-warning-100'
                  }`}>
                    <WalletIcon className={`w-5 h-5 ${
                      balance >= 0 ? 'text-primary-600' : 'text-warning-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-medium ${
                      balance >= 0 ? 'text-primary-800' : 'text-warning-800'
                    }`}>Net Balance</h3>
                    <p className={`text-xs ${
                      balance >= 0 ? 'text-primary-600' : 'text-warning-600'
                    }`}>{balance >= 0 ? 'Surplus' : 'Deficit'}</p>
                  </div>
                </div>
                <div className="text-2xl">
                  {balanceStatus.icon}
                </div>
              </div>
              <p className={`text-2xl font-bold mb-1 ${balanceStatus.color}`}>
                {formatCurrency(balance)}
              </p>
              <p className={`text-xs ${
                balance >= 0 ? 'text-primary-600' : 'text-warning-600'
              }`}>
                {balance >= 0 ? 'Keep up the great work!' : 'Consider reducing expenses'}
              </p>
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Enhanced Budgets Section */}
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <ChartPieIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Budget Overview</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Track your spending limits</p>
                  </div>
                </div>
                <Link href="/budgets">
                  <Button variant="outline" size="sm" rightIcon={<ArrowRightIcon />}>
                    Manage
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              {budgets.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <ChartPieIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4">No budgets set for this month</p>
                  <Link href="/budgets">
                    <Button variant="primary" size="sm">
                      Create Your First Budget
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {budgets.slice(0, 3).map((budget) => {
                    const percentage = calculatePercentage(budget.spent, budget.amount);
                    const isOverBudget = budget.spent > budget.amount;
                    const isNearLimit = percentage > 75 && !isOverBudget;
                    
                    return (
                      <div key={budget.id} className="group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <span className="text-2xl">{budget.categoryIcon}</span>
                              {isOverBudget && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">!</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-gray-100">{budget.name}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {formatCurrency(budget.amount - budget.spent)} remaining
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrency(budget.spent)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              of {formatCurrency(budget.amount)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className={`font-medium ${
                              isOverBudget ? 'text-error-600' : 
                              isNearLimit ? 'text-warning-600' : 'text-gray-600'
                            }`}>
                              {percentage}% used
                            </span>
                            {isOverBudget && (
                              <span className="text-error-600 font-medium">
                                {formatCurrency(budget.spent - budget.amount)} over budget
                              </span>
                            )}
                          </div>
                          
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                isOverBudget ? 'bg-gradient-to-r from-error-500 to-error-600' : 
                                isNearLimit ? 'bg-gradient-to-r from-warning-400 to-warning-500' : 
                                'bg-gradient-to-r from-success-400 to-success-500'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                            {isOverBudget && (
                              <div
                                className="h-2 bg-error-600 opacity-50"
                                style={{ width: `${percentage - 100}%` }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {budgets.length > 3 && (
                    <div className="pt-4 border-t border-gray-100">
                      <Link href="/budgets">
                        <Button variant="ghost" size="sm" fullWidth rightIcon={<ArrowRightIcon />}>
                          View All {budgets.length} Budgets
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Recent Transactions */}
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <CreditCardIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Latest transactions</p>
                  </div>
                </div>
                <Link href="/transactions">
                  <Button variant="outline" size="sm" rightIcon={<ArrowRightIcon />}>
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              {!dashboardData?.recentTransactions || dashboardData.recentTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <CreditCardIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4">No transactions yet</p>
                  <Link href="/transactions">
                    <Button variant="primary" size="sm">
                      Add Your First Transaction
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.recentTransactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          transaction.type === 'income' 
                            ? 'bg-success-100 text-success-600' 
                            : 'bg-error-100 text-error-600'
                        }`}>
                          {transaction.type === 'income' ? <ArrowUpIcon /> : <ArrowDownIcon />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 transition-colors">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(transaction.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.type === 'income' ? 'text-success-600' : 'text-error-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {dashboardData.recentTransactions.length > 5 && (
                    <div className="pt-4 border-t border-gray-100">
                      <Link href="/transactions">
                        <Button variant="ghost" size="sm" fullWidth rightIcon={<ArrowRightIcon />}>
                          View All Transactions
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
        
        {/* Financial Insights */}
        {dashboardData && (
          <Card variant="elevated" className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-200 rounded-lg">
                  <LightBulbIcon className="w-5 h-5 text-primary-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-primary-900">Financial Insights</h2>
                  <p className="text-sm text-primary-700">Personalized tips for better money management</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/50 rounded-lg p-4">
                  <h3 className="font-medium text-primary-900 mb-2">Spending Pattern</h3>
                  <p className="text-sm text-primary-800">
                    {expenseTrend.trend === 'increase' 
                      ? `Your expenses increased by ${expenseTrend.percentage}% this month. Consider reviewing your spending categories.`
                      : expenseTrend.trend === 'decrease'
                      ? `Great job! Your expenses decreased by ${expenseTrend.percentage}% this month.`
                      : 'Your spending pattern is stable compared to last month.'}
                  </p>
                </div>
                <div className="bg-white/50 rounded-lg p-4">
                  <h3 className="font-medium text-primary-900 mb-2">Budget Health</h3>
                  <p className="text-sm text-primary-800">
                    {budgets.length === 0
                      ? 'Set up budgets to better track your spending and reach your financial goals.'
                      : budgets.some(b => b.spent > b.amount)
                      ? 'Some budgets are over limit. Review your spending in those categories.'
                      : 'Your budgets are on track! Keep up the good financial discipline.'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Export Modal */}
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          transactions={transactions}
          budgets={budgets}
        />
      </div>
    </div>
  );
}

// Icon Components
const ExclamationTriangleIcon = () => (
  <svg className="w-6 h-6 text-error-600" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
)

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const SignOutIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
)

const ChartBarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const TrendingUpIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const TrendingDownIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
)

const WalletIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
)

const ChartPieIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
  </svg>
)

const CreditCardIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const ArrowUpIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
  </svg>
)

const ArrowDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5-5-5m5 5V6" />
  </svg>
)

const LightBulbIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const AnalyticsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const TargetIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

export default function HomePage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
