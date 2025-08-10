'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/LoadingSkeleton';
import { GoalProgressCard } from './GoalProgressCard';

interface FinancialGoal {
  id: number;
  name: string;
  description?: string | null;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  categoryIcon?: string | null;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  color: string;
  icon?: string | null;
  progressPercentage: number;
  remaining: number;
  isOverdue: boolean;
  daysRemaining: number | null;
  createdAt: string;
  updatedAt: string;
}

interface GoalsOverviewProps {
  onCreateGoal?: () => void;
  onEditGoal?: (goal: FinancialGoal) => void;
  onDeleteGoal?: (id: number) => void;
  onAddFunds?: (goal: FinancialGoal) => void;
  compact?: boolean;
}

export function GoalsOverview({ 
  onCreateGoal, 
  onEditGoal, 
  onDeleteGoal, 
  onAddFunds,
  compact = false 
}: GoalsOverviewProps) {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'progress' | 'target_date'>('priority');

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filter === 'active' || filter === 'completed') {
        params.set('status', filter);
      }

      const response = await fetch(`/api/goals?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch financial goals');
      }
      
      const data = await response.json();
      
      // Apply client-side filters
      let filteredGoals = data;
      
      if (filter === 'overdue') {
        filteredGoals = data.filter((goal: FinancialGoal) => goal.isOverdue);
      }
      
      // Apply sorting
      filteredGoals.sort((a: FinancialGoal, b: FinancialGoal) => {
        switch (sortBy) {
          case 'priority':
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          case 'progress':
            return b.progressPercentage - a.progressPercentage;
          case 'target_date':
            if (!a.targetDate && !b.targetDate) return 0;
            if (!a.targetDate) return 1;
            if (!b.targetDate) return -1;
            return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
          default:
            return 0;
        }
      });
      
      setGoals(filteredGoals);
      setError(null);
    } catch (error) {
      console.error('Error fetching goals:', error);
      setError('Failed to load financial goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [filter, sortBy]);

  const handleDeleteGoal = async (id: number) => {
    if (!confirm('Are you sure you want to delete this goal?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/goals?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }
      
      // Refresh goals list
      await fetchGoals();
      
      if (onDeleteGoal) {
        onDeleteGoal(id);
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Failed to delete goal');
    }
  };

  // Calculate summary stats
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const overdueGoals = goals.filter(g => g.isOverdue);
  const totalTargetAmount = activeGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalCurrentAmount = activeGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {!compact && <Skeleton className="h-24" />}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchGoals} variant="outline">
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats (only show if not compact) */}
      {!compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{activeGoals.length}</div>
            <div className="text-sm text-gray-600">Active Goals</div>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{completedGoals.length}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{overdueGoals.length}</div>
            <div className="text-sm text-gray-600">Overdue</div>
          </Card>
          
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{overallProgress.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Overall Progress</div>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Filter</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="all">All Goals</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="priority">Priority</option>
                <option value="progress">Progress</option>
                <option value="target_date">Target Date</option>
              </select>
            </div>
          </div>
          
          {onCreateGoal && (
            <Button onClick={onCreateGoal} className="bg-blue-600 hover:bg-blue-700">
              Create New Goal
            </Button>
          )}
        </div>
      )}

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              🎯
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Financial Goals</h3>
            <p className="text-gray-500 mb-4">
              {filter === 'all' 
                ? "Start building your financial future by creating your first goal!"
                : `No goals found matching the "${filter}" filter.`
              }
            </p>
          </div>
          {onCreateGoal && filter === 'all' && (
            <Button onClick={onCreateGoal} className="bg-blue-600 hover:bg-blue-700">
              Create Your First Goal
            </Button>
          )}
        </Card>
      ) : (
        <div className={`grid gap-4 ${
          compact 
            ? 'grid-cols-1' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {goals.map((goal) => (
            <GoalProgressCard
              key={goal.id}
              goal={goal}
              onEdit={onEditGoal}
              onDelete={handleDeleteGoal}
              onAddFunds={onAddFunds}
              compact={compact}
            />
          ))}
        </div>
      )}

      {/* Quick Stats Summary for Compact Mode */}
      {compact && goals.length > 0 && (
        <Card className="p-4">
          <div className="flex justify-between items-center text-sm">
            <div>
              <span className="text-gray-600">Total Progress:</span>
              <span className="ml-2 font-medium">{formatAmount(totalCurrentAmount)} / {formatAmount(totalTargetAmount)}</span>
            </div>
            <div className="text-blue-600 font-medium">
              {overallProgress.toFixed(1)}%
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}