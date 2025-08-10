'use client';

import { useState } from 'react';
import { GoalsOverview } from '@/components/goals/GoalsOverview';
import { GoalCreationWizard } from '@/components/goals/GoalCreationWizard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

interface FinancialGoal {
  id: number;
  name: string;
  description?: string | null;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | null;
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

export default function GoalsPage() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isFundsModalOpen, setIsFundsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  const [fundsAmount, setFundsAmount] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleGoalCreated = () => {
    setRefreshKey(prev => prev + 1);
    setIsWizardOpen(false);
  };

  const handleAddFunds = (goal: FinancialGoal) => {
    setSelectedGoal(goal);
    setFundsAmount('');
    setIsFundsModalOpen(true);
  };

  const handleFundsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGoal || !fundsAmount) return;

    try {
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedGoal.id,
          currentAmount: selectedGoal.currentAmount + (parseFloat(fundsAmount) * 100), // Convert to cents
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update goal');
      }

      setRefreshKey(prev => prev + 1);
      setIsFundsModalOpen(false);
      setSelectedGoal(null);
      setFundsAmount('');
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Failed to add funds to goal');
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Financial Goals</h1>
              <p className="text-gray-600 mt-2">
                Track and achieve your financial milestones
              </p>
            </div>
          </div>

          {/* Motivational Quote */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎯</div>
              <div>
                <p className="text-lg font-medium text-gray-800">
                  "A goal without a plan is just a wish."
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Set clear financial targets and track your progress towards financial freedom.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Goals Overview */}
        <GoalsOverview
          key={refreshKey}
          onCreateGoal={() => setIsWizardOpen(true)}
          onAddFunds={handleAddFunds}
          onDeleteGoal={() => setRefreshKey(prev => prev + 1)}
        />

        {/* Goal Creation Wizard */}
        <GoalCreationWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onSuccess={handleGoalCreated}
        />

        {/* Add Funds Modal */}
        <Modal
          isOpen={isFundsModalOpen}
          onClose={() => setIsFundsModalOpen(false)}
          title="Add Funds to Goal"
        >
          <form onSubmit={handleFundsSubmit} className="space-y-4">
            {selectedGoal && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900">{selectedGoal.name}</h3>
                <div className="text-sm text-gray-600 mt-1">
                  Current: {formatAmount(selectedGoal.currentAmount)} / {formatAmount(selectedGoal.targetAmount)}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${selectedGoal.progressPercentage}%` }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Amount to Add <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={fundsAmount}
                onChange={(e) => setFundsAmount(e.target.value)}
                placeholder="0.00"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the amount you want to add to this goal
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFundsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Add {fundsAmount ? `$${parseFloat(fundsAmount).toFixed(2)}` : 'Funds'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}