'use client';

import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { format, parseISO, differenceInDays } from 'date-fns';

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

interface GoalProgressCardProps {
  goal: FinancialGoal;
  onEdit?: (goal: FinancialGoal) => void;
  onDelete?: (id: number) => void;
  onAddFunds?: (goal: FinancialGoal) => void;
  compact?: boolean;
}

export function GoalProgressCard({ 
  goal, 
  onEdit, 
  onDelete, 
  onAddFunds, 
  compact = false 
}: GoalProgressCardProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      paused: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'border-l-red-500',
      medium: 'border-l-yellow-500',
      low: 'border-l-green-500',
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const progressPercentage = Math.min(100, Math.max(0, goal.progressPercentage));
  const isCompleted = goal.status === 'completed' || progressPercentage >= 100;

  return (
    <Card className={`p-4 hover:shadow-md transition-all border-l-4 ${getPriorityColor(goal.priority)}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {goal.categoryColor && (
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: goal.categoryColor }}
                />
              )}
              <h3 className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`}>
                {goal.name}
              </h3>
              <span className={`px-2 py-1 text-xs rounded ${getStatusColor(goal.status)}`}>
                {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
              </span>
            </div>
            
            {goal.description && !compact && (
              <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
            )}
            
            {goal.categoryName && (
              <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded mb-2">
                {goal.categoryName}
              </span>
            )}
          </div>
          
          {!compact && (
            <div className="flex items-center gap-1 ml-4">
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(goal)}
                  className="text-xs"
                >
                  Edit
                </Button>
              )}
              {onDelete && goal.status !== 'completed' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(goal.id)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              {formatAmount(goal.currentAmount)} of {formatAmount(goal.targetAmount)}
            </span>
            <span className="font-medium">
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isCompleted 
                  ? 'bg-green-500' 
                  : progressPercentage > 75 
                    ? 'bg-blue-500' 
                    : progressPercentage > 50 
                      ? 'bg-yellow-500' 
                      : 'bg-red-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Remaining:</span>
            <p className="font-medium">
              {formatAmount(Math.max(0, goal.remaining))}
            </p>
          </div>
          
          {goal.targetDate && (
            <div>
              <span className="text-gray-600">Target Date:</span>
              <p className={`font-medium ${goal.isOverdue ? 'text-red-600' : ''}`}>
                {format(parseISO(goal.targetDate), 'MMM d, yyyy')}
                {goal.daysRemaining !== null && (
                  <span className="text-xs block">
                    {goal.daysRemaining > 0 
                      ? `${goal.daysRemaining} days left`
                      : goal.daysRemaining === 0
                        ? 'Due today'
                        : `${Math.abs(goal.daysRemaining)} days overdue`
                    }
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        {!compact && !isCompleted && goal.status === 'active' && onAddFunds && (
          <Button
            onClick={() => onAddFunds(goal)}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            Add Funds
          </Button>
        )}

        {/* Achievement Banner */}
        {isCompleted && (
          <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
            <p className="text-green-800 font-medium text-sm">
              🎉 Goal Achieved! Congratulations!
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}