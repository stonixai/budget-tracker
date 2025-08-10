'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SkeletonDashboard } from '../ui/LoadingSkeleton';
import { Alert } from '../ui/Alert';
import type { AIInsights } from '@/lib/ai-insights';

interface AIInsightsDashboardProps {
  className?: string;
}

export function AIInsightsDashboard({ className = '' }: AIInsightsDashboardProps) {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch('/api/insights', {
        method: forceRefresh ? 'POST' : 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data = await response.json();
      setInsights(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading && !insights) {
    return <SkeletonDashboard />;
  }

  if (error && !insights) {
    return (
      <div className={className}>
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Financial Insights 🤖
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Personalized insights and recommendations based on your spending patterns
          </p>
        </div>
        <Button
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          variant="ghost"
          className="text-sm"
        >
          {refreshing ? 'Refreshing...' : '🔄 Refresh'}
        </Button>
      </div>

      {/* Alerts */}
      {insights.alerts.length > 0 && (
        <div className="space-y-2">
          {insights.alerts.map((alert, index) => (
            <Alert
              key={index}
              variant={alert.type}
              className={`border-l-4 ${
                alert.priority === 'high'
                  ? 'border-l-red-500'
                  : alert.priority === 'medium'
                  ? 'border-l-yellow-500'
                  : 'border-l-blue-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{alert.message}</span>
                <span className="text-xs opacity-75 capitalize">{alert.priority}</span>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Financial Summary */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            📊 Monthly Financial Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${(insights.financialSummary.monthlyIncome / 100).toFixed(0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Income</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                ${(insights.financialSummary.monthlyExpenses / 100).toFixed(0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Expenses</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                insights.financialSummary.savingsRate > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {insights.financialSummary.savingsRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Savings Rate</div>
            </div>
          </div>
          
          {/* Top Spending Categories */}
          <div>
            <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Top Spending Categories</h4>
            <div className="space-y-2">
              {insights.financialSummary.topSpendingCategories.map((category, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">{category.category}</span>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-white">
                      ${(category.amount / 100).toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {category.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Budget Insights */}
      {insights.budgetInsights.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              🎯 Budget Performance
            </h3>
            <div className="space-y-4">
              {insights.budgetInsights.map((budget, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{budget.category}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      budget.status === 'on_track'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : budget.status === 'warning'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {budget.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <span>${(budget.spentAmount / 100).toFixed(0)} spent</span>
                      <span>${(budget.budgetAmount / 100).toFixed(0)} budget</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div
                        className={`h-2 rounded-full ${
                          budget.utilizationPercentage <= 75
                            ? 'bg-green-500'
                            : budget.utilizationPercentage <= 100
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(budget.utilizationPercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{budget.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Spending Patterns */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            📈 Spending Patterns
          </h3>
          <div className="space-y-4">
            {insights.spendingPatterns.slice(0, 5).map((pattern, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{pattern.category}</h4>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-white">
                      ${(pattern.averageMonthly / 100).toFixed(0)}/mo
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pattern.trend === 'increasing'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : pattern.trend === 'decreasing'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {pattern.trend} {pattern.trendPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                {pattern.insights.length > 0 && (
                  <div className="space-y-1">
                    {pattern.insights.map((insight, i) => (
                      <p key={i} className="text-sm text-gray-600 dark:text-gray-400">
                        {insight}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Recommendations */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            💡 Recommendations
          </h3>
          <div className="space-y-3">
            {insights.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-blue-600 dark:text-blue-400 mt-0.5">💡</div>
                <p className="text-gray-700 dark:text-gray-300">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Unusual Transactions */}
      {insights.financialSummary.unusualTransactions.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              🔍 Unusual Transactions
            </h3>
            <div className="space-y-3">
              {insights.financialSummary.unusualTransactions.map((transaction, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {transaction.description}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{transaction.date}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-red-600">
                        ${(transaction.amount / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{transaction.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}