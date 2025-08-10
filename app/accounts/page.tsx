'use client';

import { useState } from 'react';
import { AccountsList } from '@/components/accounts/AccountsList';
import { AccountForm } from '@/components/accounts/AccountForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface UserAccount {
  id: number;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'loan' | 'cash';
  balance: number;
  currency: string;
  accountNumber?: string | null;
  institution?: string | null;
  color: string;
  icon?: string | null;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AccountsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAccountCreated = () => {
    setRefreshKey(prev => prev + 1);
    setIsFormOpen(false);
    setEditingAccount(null);
  };

  const handleEdit = (account: UserAccount) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/accounts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting account:', error);
      alert(`Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingAccount(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Account Management</h1>
              <p className="text-gray-600 mt-2">
                Manage your bank accounts, credit cards, investments, and loans
              </p>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              Add Account
            </Button>
          </div>

          {/* Quick Info */}
          <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <div className="flex items-center gap-4">
              <div className="text-4xl">💰</div>
              <div>
                <p className="text-lg font-medium text-gray-800">
                  Track All Your Financial Accounts
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Get a complete overview of your net worth across all accounts and institutions.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Accounts Overview */}
        <Card className="p-6">
          <AccountsList
            key={refreshKey}
            onEditAccount={handleEdit}
            onDeleteAccount={handleDelete}
          />
        </Card>

        {/* Account Form Modal */}
        <AccountForm
          isOpen={isFormOpen}
          onClose={handleFormClose}
          onSuccess={handleAccountCreated}
          account={editingAccount ? {
            ...editingAccount,
            accountNumber: editingAccount.accountNumber || undefined,
            institution: editingAccount.institution || undefined,
            icon: editingAccount.icon || undefined,
          } : undefined}
        />
      </div>
    </div>
  );
}