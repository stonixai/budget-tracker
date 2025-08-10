'use client';

import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface AccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account?: {
    id: number;
    name: string;
    type: string;
    balance: number;
    currency: string;
    accountNumber?: string;
    institution?: string;
    color: string;
    icon?: string;
    isPrimary: boolean;
  } | null;
}

export function AccountForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  account 
}: AccountFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    balance: '',
    currency: 'USD',
    accountNumber: '',
    institution: '',
    color: '#6366f1',
    icon: '',
    isPrimary: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        type: account.type,
        balance: (account.balance / 100).toString(),
        currency: account.currency,
        accountNumber: account.accountNumber || '',
        institution: account.institution || '',
        color: account.color,
        icon: account.icon || '',
        isPrimary: account.isPrimary,
      });
    } else {
      // Reset form for new account
      setFormData({
        name: '',
        type: 'checking',
        balance: '0',
        currency: 'USD',
        accountNumber: '',
        institution: '',
        color: '#6366f1',
        icon: '',
        isPrimary: false,
      });
    }
  }, [account, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Account name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submitData = {
        ...formData,
        balance: parseFloat(formData.balance) || 0,
        accountNumber: formData.accountNumber.trim() || null,
        institution: formData.institution.trim() || null,
        icon: formData.icon.trim() || null,
      };

      const url = '/api/accounts';
      const method = account ? 'PUT' : 'POST';
      
      const body = account 
        ? { id: account.id, ...submitData }
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
        throw new Error(errorData.error || 'Failed to save account');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving account:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const accountTypes = [
    { value: 'checking', label: 'Checking Account', icon: '🏦', description: 'For daily transactions' },
    { value: 'savings', label: 'Savings Account', icon: '💰', description: 'For saving money' },
    { value: 'credit', label: 'Credit Card', icon: '💳', description: 'Credit line account' },
    { value: 'investment', label: 'Investment Account', icon: '📈', description: 'Stocks, bonds, etc.' },
    { value: 'loan', label: 'Loan Account', icon: '🏠', description: 'Mortgage, car loan, etc.' },
    { value: 'cash', label: 'Cash', icon: '💵', description: 'Physical cash on hand' },
  ];

  const colorOptions = [
    '#6366f1', '#ef4444', '#10b981', '#f59e0b', '#3b82f6', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'
  ];

  const currencies = [
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' },
    { value: 'CAD', label: 'Canadian Dollar (CA$)' },
    { value: 'AUD', label: 'Australian Dollar (AU$)' },
    { value: 'JPY', label: 'Japanese Yen (¥)' },
  ];

  const selectedAccountType = accountTypes.find(type => type.value === formData.type);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={account ? 'Edit Account' : 'Add New Account'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Account Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Account Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accountTypes.map((type) => (
              <label
                key={type.value}
                className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                  formData.type === type.value 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  value={type.value}
                  checked={formData.type === type.value}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    type: e.target.value,
                    icon: accountTypes.find(t => t.value === e.target.value)?.icon || ''
                  }))}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <span className="text-xl">{type.icon}</span>
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-sm text-gray-600">{type.description}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Account Name */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Account Name <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Chase Checking, Wells Fargo Savings"
            required
          />
        </div>

        {/* Institution */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Financial Institution
          </label>
          <Input
            type="text"
            value={formData.institution}
            onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
            placeholder="e.g., Chase Bank, Wells Fargo"
          />
        </div>

        {/* Balance and Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Current Balance
            </label>
            <Input
              type="number"
              step="0.01"
              value={formData.balance}
              onChange={(e) => setFormData(prev => ({ ...prev, balance: e.target.value }))}
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.type === 'credit' || formData.type === 'loan' 
                ? 'Enter negative values for debt' 
                : 'Enter the current account balance'
              }
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {currencies.map(currency => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Account Number (Last 4 digits) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Account Number (Last 4 digits)
          </label>
          <Input
            type="text"
            maxLength={4}
            value={formData.accountNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value.replace(/\D/g, '') }))}
            placeholder="1234"
          />
          <p className="text-xs text-gray-500 mt-1">
            Only the last 4 digits for security purposes
          </p>
        </div>

        {/* Custom Icon */}
        <div>
          <label className="block text-sm font-medium mb-2">Custom Icon</label>
          <Input
            type="text"
            value={formData.icon}
            onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
            placeholder={`Default: ${selectedAccountType?.icon || '🏦'}`}
            maxLength={2}
          />
          <p className="text-xs text-gray-500 mt-1">
            Use an emoji to customize your account icon
          </p>
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium mb-2">Account Color</label>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                className={`w-8 h-8 rounded-full border-2 ${
                  formData.color === color ? 'border-gray-400' : 'border-gray-200'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Primary Account */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isPrimary"
            checked={formData.isPrimary}
            onChange={(e) => setFormData(prev => ({ ...prev, isPrimary: e.target.checked }))}
            className="rounded border-gray-300"
          />
          <label htmlFor="isPrimary" className="text-sm font-medium">
            Set as primary account
          </label>
        </div>
        <p className="text-xs text-gray-500 -mt-3 ml-6">
          Your primary account will be selected by default for new transactions
        </p>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium mb-2">Preview</label>
          <Card className="p-4 border-l-4" style={{ borderLeftColor: formData.color }}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{formData.icon || selectedAccountType?.icon}</span>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: formData.color }} />
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  {formData.name || 'Account Name'}
                  {formData.isPrimary && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      Primary
                    </span>
                  )}
                </h4>
                <div className="text-sm text-gray-600">
                  {selectedAccountType?.label}
                  {formData.institution && <span> • {formData.institution}</span>}
                  {formData.accountNumber && <span> • ***{formData.accountNumber}</span>}
                </div>
              </div>
            </div>
          </Card>
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
            {loading ? 'Saving...' : (account ? 'Update' : 'Add')} Account
          </Button>
        </div>
      </form>
    </Modal>
  );
}