'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface Category {
  id: number;
  name: string;
  color: string;
  type: 'income' | 'expense';
}

interface RecurringTransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction?: {
    id: number;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    frequency: string;
    nextDueDate: string;
    categoryId?: number;
    endDate?: string;
  } | null;
}

export function RecurringTransactionForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  transaction 
}: RecurringTransactionFormProps) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    frequency: 'monthly',
    nextDueDate: '',
    categoryId: '',
    endDate: '',
  });
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description,
        amount: (transaction.amount / 100).toString(),
        type: transaction.type,
        frequency: transaction.frequency,
        nextDueDate: transaction.nextDueDate.split('T')[0], // Convert to date format
        categoryId: transaction.categoryId?.toString() || '',
        endDate: transaction.endDate ? transaction.endDate.split('T')[0] : '',
      });
    } else {
      // Reset form for new transaction
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        frequency: 'monthly',
        nextDueDate: tomorrow.toISOString().split('T')[0],
        categoryId: '',
        endDate: '',
      });
    }
  }, [transaction, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim() || !formData.amount || !formData.nextDueDate) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
        endDate: formData.endDate || null,
      };

      const url = transaction 
        ? '/api/recurring-transactions' 
        : '/api/recurring-transactions';
        
      const method = transaction ? 'PUT' : 'POST';
      
      const body = transaction 
        ? { id: transaction.id, ...submitData }
        : submitData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save recurring transaction');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving recurring transaction:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === formData.type);

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={
      transaction ? 'Edit Recurring Transaction' : 'Create Recurring Transaction'
    }>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="e.g., Monthly Rent, Weekly Groceries"
            required
          />
        </div>

        {/* Type and Amount */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                type: e.target.value as 'income' | 'expense',
                categoryId: '' // Reset category when type changes
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Amount <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Frequency <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.frequency}
            onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {frequencyOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Next Due Date */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Next Due Date <span className="text-red-500">*</span>
          </label>
          <Input
            type="date"
            value={formData.nextDueDate}
            onChange={(e) => setFormData(prev => ({ ...prev, nextDueDate: e.target.value }))}
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a category</option>
            {filteredCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* End Date (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            End Date (Optional)
          </label>
          <Input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
            placeholder="Leave empty for no end date"
          />
          <p className="text-xs text-gray-500 mt-1">
            The recurring transaction will stop after this date
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : (transaction ? 'Update' : 'Create')} Recurring Transaction
          </Button>
        </div>
      </form>
    </Modal>
  );
}