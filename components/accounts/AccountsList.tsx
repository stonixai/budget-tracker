'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/LoadingSkeleton';

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

interface AccountSummary {
  totalAccounts: number;
  activeAccounts: number;
  balanceByType: Array<{
    type: string;
    totalBalance: number;
  }>;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

interface AccountsListProps {
  onEditAccount?: (account: UserAccount) => void;
  onDeleteAccount?: (id: number) => void;
  onCreateAccount?: () => void;
}

export function AccountsList({ 
  onEditAccount, 
  onDeleteAccount, 
  onCreateAccount 
}: AccountsListProps) {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'checking' | 'savings' | 'credit' | 'investment'>('all');

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filter === 'active') {
        params.set('active', 'true');
      } else if (filter !== 'all') {
        params.set('type', filter);
      }

      const response = await fetch(`/api/accounts?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      
      const data = await response.json();
      setAccounts(data.accounts);
      setSummary(data.summary);
      setError(null);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [filter]);

  const handleDeleteAccount = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this account?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/accounts?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete account');
      }
      
      // Refresh accounts list
      await fetchAccounts();
      
      if (onDeleteAccount) {
        onDeleteAccount(id);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account');
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const getAccountTypeIcon = (type: string) => {
    const icons = {
      checking: '🏦',
      savings: '💰',
      credit: '💳',
      investment: '📈',
      loan: '🏠',
      cash: '💵',
    };
    return icons[type as keyof typeof icons] || '🏦';
  };

  const getAccountTypeLabel = (type: string) => {
    const labels = {
      checking: 'Checking',
      savings: 'Savings',
      credit: 'Credit Card',
      investment: 'Investment',
      loan: 'Loan',
      cash: 'Cash',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getBalanceColor = (type: string, balance: number) => {
    if (type === 'credit' || type === 'loan') {
      return balance < 0 ? 'text-red-600' : 'text-green-600';
    }
    return balance >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchAccounts} variant="outline">
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatAmount(summary.totalAssets)}
              </div>
              <div className="text-sm text-gray-600">Total Assets</div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatAmount(summary.totalLiabilities)}
              </div>
              <div className="text-sm text-gray-600">Total Liabilities</div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${summary.netWorth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatAmount(summary.netWorth)}
              </div>
              <div className="text-sm text-gray-600">Net Worth</div>
            </div>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Filter</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Accounts</option>
              <option value="active">Active Only</option>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit">Credit Cards</option>
              <option value="investment">Investments</option>
            </select>
          </div>
        </div>
        
        {onCreateAccount && (
          <Button onClick={onCreateAccount} className="bg-blue-600 hover:bg-blue-700">
            Add Account
          </Button>
        )}
      </div>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              🏦
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Accounts Found</h3>
            <p className="text-gray-500 mb-4">
              {filter === 'all' 
                ? "Get started by adding your first financial account!"
                : `No accounts found matching the "${filter}" filter.`
              }
            </p>
          </div>
          {onCreateAccount && filter === 'all' && (
            <Button onClick={onCreateAccount} className="bg-blue-600 hover:bg-blue-700">
              Add Your First Account
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id} className={`p-4 hover:shadow-md transition-shadow border-l-4 ${
              account.isPrimary ? 'bg-blue-50 border-l-blue-500' : 'border-l-gray-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {account.icon || getAccountTypeIcon(account.type)}
                      </span>
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: account.color }}
                      />
                    </div>
                    
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {account.name}
                        {account.isPrimary && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            Primary
                          </span>
                        )}
                        {!account.isActive && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                            Inactive
                          </span>
                        )}
                      </h3>
                      <div className="text-sm text-gray-600">
                        {getAccountTypeLabel(account.type)}
                        {account.institution && (
                          <span> • {account.institution}</span>
                        )}
                        {account.accountNumber && (
                          <span> • ***{account.accountNumber}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`text-xl font-bold ${getBalanceColor(account.type, account.balance)}`}>
                    {formatAmount(account.balance)}
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      {account.currency}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {onEditAccount && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEditAccount(account)}
                    >
                      Edit
                    </Button>
                  )}
                  
                  {onDeleteAccount && account.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteAccount(account.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Balance Summary by Type */}
      {summary && summary.balanceByType.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Balance by Account Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.balanceByType.map((item) => (
              <div key={item.type} className="text-center p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-600 mb-1">
                  {getAccountTypeLabel(item.type)}
                </div>
                <div className="font-semibold">
                  {formatAmount(Number(item.totalBalance))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}