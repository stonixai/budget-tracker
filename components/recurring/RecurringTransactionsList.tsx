'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/LoadingSkeleton';
import { format, parseISO, differenceInDays } from 'date-fns';

interface RecurringTransaction {
  id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  nextDueDate: string | null;
  lastProcessedDate: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  categoryIcon?: string | null;
  isActive: boolean;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RecurringTransactionsListProps {
  onEdit?: (transaction: RecurringTransaction) => void;
  onDelete?: (id: number) => void;
  onExecute?: (id: number) => void;
}

export function RecurringTransactionsList({ 
  onEdit, 
  onDelete, 
  onExecute 
}: RecurringTransactionsListProps) {
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [executingId, setExecutingId] = useState<number | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (activeFilter !== 'all') {
        params.set('active', activeFilter === 'active' ? 'true' : 'false');
      }
      
      if (typeFilter !== 'all') {
        params.set('type', typeFilter);
      }

      const response = await fetch(`/api/recurring-transactions?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recurring transactions');
      }
      
      const data = await response.json();
      setTransactions(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
      setError('Failed to load recurring transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [activeFilter, typeFilter]);

  const handleExecuteTransaction = async (id: number) => {
    if (executingId) return;
    
    setExecutingId(id);
    
    try {
      const response = await fetch('/api/recurring-transactions/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute transaction');
      }
      
      const result = await response.json();
      
      // Refresh the list to show updated next due date
      await fetchTransactions();
      
      if (onExecute) {
        onExecute(id);
      }
      
      // Show success message (you can replace with a proper toast/notification)
      alert(`Transaction executed successfully! ${result.message || ''}`);
    } catch (error) {
      console.error('Error executing transaction:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`);
    } finally {
      setExecutingId(null);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const getStatusBadge = (transaction: RecurringTransaction) => {
    if (!transaction.isActive) {
      return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Inactive</span>;
    }
    
    if (!transaction.nextDueDate) {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Ended</span>;
    }
    
    const daysUntilDue = differenceInDays(parseISO(transaction.nextDueDate), new Date());
    
    if (daysUntilDue < 0) {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Overdue</span>;
    } else if (daysUntilDue <= 3) {
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Due Soon</span>;
    } else {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Active</span>;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchTransactions} variant="outline">
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">No recurring transactions found</p>
          <Button onClick={() => {/* Handle create new */}}>
            Create Your First Recurring Transaction
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <Card key={transaction.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {transaction.categoryColor && (
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: transaction.categoryColor }}
                      />
                    )}
                    <h3 className="font-medium">{transaction.description}</h3>
                    {getStatusBadge(transaction)}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-4">
                      <span className={`font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}
                      </span>
                      
                      <span>{getFrequencyLabel(transaction.frequency)}</span>
                      
                      {transaction.categoryName && (
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {transaction.categoryName}
                        </span>
                      )}
                    </div>
                    
                    {transaction.nextDueDate && (
                      <div>
                        Next due: {format(parseISO(transaction.nextDueDate), 'MMM d, yyyy')}
                      </div>
                    )}
                    
                    {transaction.lastProcessedDate && (
                      <div>
                        Last executed: {format(parseISO(transaction.lastProcessedDate), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {transaction.isActive && transaction.nextDueDate && (
                    <Button
                      size="sm"
                      onClick={() => handleExecuteTransaction(transaction.id)}
                      disabled={executingId === transaction.id}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {executingId === transaction.id ? 'Executing...' : 'Execute'}
                    </Button>
                  )}
                  
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(transaction)}
                    >
                      Edit
                    </Button>
                  )}
                  
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(transaction.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}