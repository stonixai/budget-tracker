'use client';

import { useState } from 'react';
import { RecurringTransactionsList } from '@/components/recurring/RecurringTransactionsList';
import { RecurringTransactionForm } from '@/components/recurring/RecurringTransactionForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface RecurringTransaction {
  id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  frequency: string;
  nextDueDate: string;
  categoryId?: number;
  endDate?: string;
}

export default function RecurringTransactionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setIsFormOpen(false);
  };

  const handleEdit = (transaction: any) => {
    setEditingTransaction({
      id: transaction.id,
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      frequency: transaction.frequency,
      nextDueDate: transaction.nextDueDate,
      categoryId: transaction.categoryId,
      endDate: transaction.endDate,
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this recurring transaction?')) {
      return;
    }

    try {
      const response = await fetch('/api/recurring-transactions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Recurring Transactions</h1>
              <p className="text-gray-600 mt-2">
                Manage your regular income and expenses that occur automatically
              </p>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              Add Recurring Transaction
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Transactions</h3>
              <p className="text-3xl font-bold text-blue-600">-</p>
              <p className="text-sm text-gray-500">Currently active</p>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Monthly Impact</h3>
              <p className="text-3xl font-bold text-green-600">-</p>
              <p className="text-sm text-gray-500">Estimated monthly total</p>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Due This Week</h3>
              <p className="text-3xl font-bold text-orange-600">-</p>
              <p className="text-sm text-gray-500">Transactions due soon</p>
            </Card>
          </div>
        </div>

        {/* Transactions List */}
        <Card className="p-6">
          <RecurringTransactionsList
            key={refreshKey}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onExecute={() => setRefreshKey(prev => prev + 1)}
          />
        </Card>

        {/* Form Modal */}
        <RecurringTransactionForm
          isOpen={isFormOpen}
          onClose={handleFormClose}
          onSuccess={handleCreateSuccess}
          transaction={editingTransaction}
        />
      </div>
    </div>
  );
}