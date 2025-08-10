'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

export function SampleDataGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const generateSampleData = async () => {
    setIsGenerating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/sample-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'generate' }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Sample data generated successfully! Created ${result.data.categories} categories, ${result.data.transactions} transactions, ${result.data.budgets} budgets, ${result.data.recurringTransactions} recurring transactions, ${result.data.goals} goals, and ${result.data.accounts} accounts.`,
        });
        // Refresh the page to show new data
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to generate sample data',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to generate sample data. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const clearData = async () => {
    setIsClearing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/sample-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'clear' }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'All data cleared successfully!',
        });
        // Refresh the page to show cleared data
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to clear data',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to clear data. Please try again.',
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-4">
        <div className="text-2xl mr-3">🎯</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sample Data Generator
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Get started quickly with realistic sample financial data
          </p>
        </div>
      </div>

      {message && (
        <Alert 
          variant={message.type} 
          className="mb-4"
          dismissible
          onDismiss={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            What's included in sample data:
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• 13 expense and income categories with icons</li>
            <li>• 150+ realistic transactions from the last 6 months</li>
            <li>• Monthly salary and various expense patterns</li>
            <li>• 5 monthly budgets for different categories</li>
            <li>• 5 recurring transactions (salary, rent, subscriptions)</li>
            <li>• 4 financial goals with progress tracking</li>
            <li>• 3 user accounts (checking, savings, credit)</li>
          </ul>
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={generateSampleData}
            disabled={isGenerating || isClearing}
            className="flex-1"
          >
            {isGenerating ? 'Generating...' : 'Generate Sample Data'}
          </Button>
          <Button
            onClick={clearData}
            disabled={isGenerating || isClearing}
            variant="ghost"
            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
          >
            {isClearing ? 'Clearing...' : 'Clear All Data'}
          </Button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          ⚠️ Sample data will replace any existing data. Use with caution.
        </div>
      </div>
    </div>
  );
}