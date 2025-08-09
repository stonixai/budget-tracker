'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';

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

interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
}

interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTransactions: Transaction[];
  categories: Category[];
  onBulkUpdate: (updates: BulkUpdateData) => Promise<void>;
}

export interface BulkUpdateData {
  operation: 'update_category' | 'update_type' | 'update_date' | 'add_amount' | 'multiply_amount';
  value: string | number;
  categoryId?: number;
  type?: 'income' | 'expense';
  date?: string;
  amount?: number;
  multiplier?: number;
}

type BulkOperation = 'update_category' | 'update_type' | 'update_date' | 'add_amount' | 'multiply_amount';

export default function BulkOperationsModal({
  isOpen,
  onClose,
  selectedTransactions,
  categories,
  onBulkUpdate
}: BulkOperationsModalProps) {
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation>('update_category');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form values for different operations
  const [categoryId, setCategoryId] = useState('');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [newDate, setNewDate] = useState('');
  const [amountToAdd, setAmountToAdd] = useState('');
  const [multiplier, setMultiplier] = useState('');

  const bulkOperations = [
    {
      id: 'update_category' as BulkOperation,
      title: 'Change Category',
      description: 'Update the category for all selected transactions',
      icon: '🏷️'
    },
    {
      id: 'update_type' as BulkOperation,
      title: 'Change Type',
      description: 'Convert between income and expense transactions',
      icon: '🔄'
    },
    {
      id: 'update_date' as BulkOperation,
      title: 'Update Date',
      description: 'Set a new date for all selected transactions',
      icon: '📅'
    },
    {
      id: 'add_amount' as BulkOperation,
      title: 'Adjust Amount',
      description: 'Add or subtract a fixed amount from all selected transactions',
      icon: '➕'
    },
    {
      id: 'multiply_amount' as BulkOperation,
      title: 'Scale Amount',
      description: 'Multiply all amounts by a factor (e.g., currency conversion)',
      icon: '✖️'
    }
  ];

  const currentOperation = bulkOperations.find(op => op.id === selectedOperation)!;

  const handleBulkUpdate = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      let updateData: BulkUpdateData;

      switch (selectedOperation) {
        case 'update_category':
          if (!categoryId) {
            throw new Error('Please select a category');
          }
          updateData = {
            operation: 'update_category',
            categoryId: parseInt(categoryId),
            value: categoryId
          };
          break;

        case 'update_type':
          updateData = {
            operation: 'update_type',
            type: transactionType,
            value: transactionType
          };
          break;

        case 'update_date':
          if (!newDate) {
            throw new Error('Please select a date');
          }
          updateData = {
            operation: 'update_date',
            date: newDate,
            value: newDate
          };
          break;

        case 'add_amount':
          const addAmount = parseFloat(amountToAdd);
          if (isNaN(addAmount)) {
            throw new Error('Please enter a valid amount');
          }
          updateData = {
            operation: 'add_amount',
            amount: Math.round(addAmount * 100), // Convert to cents
            value: addAmount
          };
          break;

        case 'multiply_amount':
          const mult = parseFloat(multiplier);
          if (isNaN(mult) || mult <= 0) {
            throw new Error('Please enter a valid multiplier greater than 0');
          }
          updateData = {
            operation: 'multiply_amount',
            multiplier: mult,
            value: mult
          };
          break;

        default:
          throw new Error('Invalid operation selected');
      }

      await onBulkUpdate(updateData);
      setSuccess(`Successfully updated ${selectedTransactions.length} transactions`);
      
      // Reset form
      resetForm();
      
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to update transactions');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setCategoryId('');
    setTransactionType('expense');
    setNewDate('');
    setAmountToAdd('');
    setMultiplier('');
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getPreviewText = () => {
    const count = selectedTransactions.length;
    switch (selectedOperation) {
      case 'update_category':
        const selectedCategory = categories.find(c => c.id === parseInt(categoryId));
        return selectedCategory 
          ? `${count} transactions will be moved to "${selectedCategory.name}" category`
          : `Select a category to preview changes`;
      
      case 'update_type':
        return `${count} transactions will be converted to ${transactionType} type`;
      
      case 'update_date':
        return newDate 
          ? `${count} transactions will be dated ${newDate}`
          : `Select a date to preview changes`;
      
      case 'add_amount':
        const addAmount = parseFloat(amountToAdd);
        return !isNaN(addAmount)
          ? `${addAmount >= 0 ? '+' : ''}${addAmount.toFixed(2)} will be ${addAmount >= 0 ? 'added to' : 'subtracted from'} ${count} transaction amounts`
          : `Enter an amount to preview changes`;
      
      case 'multiply_amount':
        const mult = parseFloat(multiplier);
        return !isNaN(mult)
          ? `${count} transaction amounts will be multiplied by ${mult}`
          : `Enter a multiplier to preview changes`;
      
      default:
        return '';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Edit Transactions"
      description={`Apply changes to ${selectedTransactions.length} selected transactions`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Operation Selection */}
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Select Operation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bulkOperations.map((operation) => (
              <Card
                key={operation.id}
                className={`cursor-pointer transition-all ${
                  selectedOperation === operation.id
                    ? 'ring-2 ring-primary-500 bg-primary-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedOperation(operation.id)}
              >
                <CardBody className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{operation.icon}</span>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{operation.title}</h5>
                      <p className="text-sm text-gray-600 mt-1">{operation.description}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedOperation === operation.id
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedOperation === operation.id && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        {/* Operation-specific form fields */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">{currentOperation.title} Options</h4>
          
          {selectedOperation === 'update_category' && (
            <div>
              <label className="block text-sm text-gray-600 mb-2">Select New Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Choose a category...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name} ({category.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedOperation === 'update_type' && (
            <div>
              <label className="block text-sm text-gray-600 mb-2">Select New Type</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="income"
                    checked={transactionType === 'income'}
                    onChange={(e) => setTransactionType(e.target.value as 'income' | 'expense')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">💰 Income</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="expense"
                    checked={transactionType === 'expense'}
                    onChange={(e) => setTransactionType(e.target.value as 'income' | 'expense')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">💸 Expense</span>
                </label>
              </div>
            </div>
          )}

          {selectedOperation === 'update_date' && (
            <div>
              <label className="block text-sm text-gray-600 mb-2">Select New Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          {selectedOperation === 'add_amount' && (
            <div>
              <Input
                label="Amount to Add/Subtract"
                type="number"
                step="0.01"
                value={amountToAdd}
                onChange={(e) => setAmountToAdd(e.target.value)}
                placeholder="0.00"
                helperText="Use negative numbers to subtract (e.g., -10.50)"
                leftIcon={<DollarIcon />}
              />
            </div>
          )}

          {selectedOperation === 'multiply_amount' && (
            <div>
              <Input
                label="Multiplier"
                type="number"
                step="0.01"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
                placeholder="1.00"
                helperText="Example: 1.2 for 20% increase, 0.8 for 20% decrease"
                leftIcon={<CalculatorIcon />}
              />
            </div>
          )}
        </div>

        {/* Preview */}
        <Card className="bg-blue-50 border-blue-200">
          <CardBody className="p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Preview Changes</h4>
            <p className="text-sm text-blue-800">{getPreviewText()}</p>
          </CardBody>
        </Card>

        {/* Selected Transactions Summary */}
        <Card className="bg-gray-50">
          <CardBody className="p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Transactions</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{transaction.categoryIcon}</span>
                    <span className="font-medium">{transaction.description}</span>
                  </div>
                  <div className="text-right">
                    <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                      ${(transaction.amount / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              {selectedTransactions.length > 5 && (
                <p className="text-xs text-gray-500 text-center pt-2">
                  ...and {selectedTransactions.length - 5} more transactions
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Alerts */}
        {error && (
          <Alert
            variant="error"
            title="Update Failed"
            description={error}
            dismissible
            onDismiss={() => setError(null)}
          />
        )}

        {success && (
          <Alert
            variant="success"
            title="Update Successful"
            description={success}
            dismissible
            onDismiss={() => setSuccess(null)}
          />
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleClose}
            variant="secondary"
            size="md"
            fullWidth
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBulkUpdate}
            variant="primary"
            size="md"
            fullWidth
            isLoading={isProcessing}
            disabled={isProcessing}
            leftIcon={!isProcessing && <EditIcon />}
          >
            {isProcessing ? 'Updating...' : `Update ${selectedTransactions.length} Transactions`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Icon Components
const DollarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

const CalculatorIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);