'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { SkeletonTable } from '@/components/ui/LoadingSkeleton';
import { SessionIndicator } from '@/components/ui/SecurityBadge';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

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

function TransactionsPageContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  const { user, signOut } = useAuth();
  
  // Search and filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // View state
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: '#6366f1',
    icon: '📁',
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, []);
  
  // Filter and search effect
  useEffect(() => {
    let filtered = [...transactions];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(t => t.categoryId.toString() === selectedCategory);
    }
    
    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(t => t.type === selectedType);
    }
    
    // Date range filter
    if (dateRange.from) {
      filtered = filtered.filter(t => new Date(t.date) >= new Date(dateRange.from));
    }
    if (dateRange.to) {
      filtered = filtered.filter(t => new Date(t.date) <= new Date(dateRange.to));
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredTransactions(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [transactions, searchTerm, selectedCategory, selectedType, dateRange, sortBy, sortOrder]);

  const fetchTransactions = async () => {
    try {
      setError(null);
      const response = await fetch('/api/transactions');
      if (response.status === 401) {
        signOut();
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Unable to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.status === 401) {
        signOut();
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.length > 100) {
      errors.description = 'Description must be less than 100 characters';
    }
    
    if (!formData.amount) {
      errors.amount = 'Amount is required';
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Amount must be a positive number';
    } else if (parseFloat(formData.amount) > 1000000) {
      errors.amount = 'Amount must be less than $1,000,000';
    }
    
    if (!formData.categoryId) {
      errors.categoryId = 'Category is required';
    }
    
    if (!formData.date) {
      errors.date = 'Date is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          description: formData.description.trim(),
          amount: Math.round(parseFloat(formData.amount) * 100),
          categoryId: parseInt(formData.categoryId),
        }),
      });
      
      if (response.ok) {
        setSuccess('Transaction added successfully!');
        setShowModal(false);
        resetForm();
        fetchTransactions();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create transaction');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      type: 'expense',
      categoryId: '',
      date: new Date().toISOString().split('T')[0],
    });
    setFormErrors({});
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryFormData),
      });
      
      if (response.ok) {
        setShowCategoryModal(false);
        setCategoryFormData({
          name: '',
          type: 'expense',
          color: '#6366f1',
          icon: '📁',
        });
        fetchCategories();
      }
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      try {
        setError(null);
        const response = await fetch(`/api/transactions?id=${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setSuccess('Transaction deleted successfully!');
          fetchTransactions();
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to delete transaction');
        }
      } catch (error) {
        console.error('Error deleting transaction:', error);
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };
  
  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedTransactions.length} transaction(s)? This action cannot be undone.`)) {
      try {
        setError(null);
        const deletePromises = selectedTransactions.map(id => 
          fetch(`/api/transactions?id=${id}`, { method: 'DELETE' })
        );
        
        await Promise.all(deletePromises);
        setSuccess(`${selectedTransactions.length} transaction(s) deleted successfully!`);
        setSelectedTransactions([]);
        setShowBulkActions(false);
        fetchTransactions();
      } catch (error) {
        console.error('Error deleting transactions:', error);
        setError('An unexpected error occurred during bulk deletion.');
      }
    }
  };
  
  const handleSelectTransaction = (id: number) => {
    setSelectedTransactions(prev => 
      prev.includes(id) 
        ? prev.filter(t => t !== id)
        : [...prev, id]
    );
  };
  
  const handleSelectAll = () => {
    const pageTransactions = getPaginatedTransactions();
    const allSelected = pageTransactions.every(t => selectedTransactions.includes(t.id));
    
    if (allSelected) {
      setSelectedTransactions(prev => prev.filter(id => !pageTransactions.find(t => t.id === id)));
    } else {
      const newSelections = pageTransactions.map(t => t.id).filter(id => !selectedTransactions.includes(id));
      setSelectedTransactions(prev => [...prev, ...newSelections]);
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === formData.type);
  
  // Pagination functions
  const getPaginatedTransactions = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTransactions.slice(startIndex, endIndex);
  };
  
  const getTotalPages = () => Math.ceil(filteredTransactions.length / itemsPerPage);
  
  // Statistics
  const getTransactionStats = () => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      transactionCount: filteredTransactions.length
    };
  };
  
  const stats = getTransactionStats();
  
  // Clear filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedType('all');
    setDateRange({ from: '', to: '' });
    setSortBy('date');
    setSortOrder('desc');
  };
  
  // Handle input changes with error clearing
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <SkeletonTable rows={8} columns={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Session Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                Transactions
                <SessionIndicator isAuthenticated={!!user} className="text-sm" />
              </h1>
              <p className="text-gray-600 mt-1">Manage your income and expenses with advanced filtering</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm" leftIcon={<ArrowLeftIcon />}>
                  Dashboard
                </Button>
              </Link>
              <Button
                onClick={() => setShowCategoryModal(true)}
                variant="outline"
                size="sm"
                leftIcon={<TagIcon />}
              >
                New Category
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                variant="primary"
                size="sm"
                leftIcon={<PlusIcon />}
              >
                Add Transaction
              </Button>
            </div>
          </div>
          
          {/* Alerts */}
          {error && (
            <Alert 
              variant="error" 
              title="Error"
              description={error}
              dismissible
              onDismiss={() => setError(null)}
              className="mb-4"
            />
          )}
          {success && (
            <Alert 
              variant="success" 
              title="Success"
              description={success}
              dismissible
              onDismiss={() => setSuccess(null)}
              className="mb-4"
            />
          )}
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-200 rounded-lg">
                    <HashtagIcon className="w-4 h-4 text-primary-700" />
                  </div>
                  <div>
                    <p className="text-sm text-primary-600">Total Transactions</p>
                    <p className="text-lg font-bold text-primary-900">{stats.transactionCount}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            
            <Card className="bg-gradient-to-r from-success-50 to-success-100 border-success-200">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success-200 rounded-lg">
                    <ArrowUpIcon className="w-4 h-4 text-success-700" />
                  </div>
                  <div>
                    <p className="text-sm text-success-600">Total Income</p>
                    <p className="text-lg font-bold text-success-900">{formatCurrency(stats.totalIncome)}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            
            <Card className="bg-gradient-to-r from-error-50 to-error-100 border-error-200">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-error-200 rounded-lg">
                    <ArrowDownIcon className="w-4 h-4 text-error-700" />
                  </div>
                  <div>
                    <p className="text-sm text-error-600">Total Expenses</p>
                    <p className="text-lg font-bold text-error-900">{formatCurrency(stats.totalExpenses)}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
            
            <Card className={`bg-gradient-to-r ${stats.netAmount >= 0 ? 'from-primary-50 to-primary-100 border-primary-200' : 'from-warning-50 to-warning-100 border-warning-200'}`}>
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stats.netAmount >= 0 ? 'bg-primary-200' : 'bg-warning-200'}`}>
                    <CalculatorIcon className={`w-4 h-4 ${stats.netAmount >= 0 ? 'text-primary-700' : 'text-warning-700'}`} />
                  </div>
                  <div>
                    <p className={`text-sm ${stats.netAmount >= 0 ? 'text-primary-600' : 'text-warning-600'}`}>Net Amount</p>
                    <p className={`text-lg font-bold ${stats.netAmount >= 0 ? 'text-primary-900' : 'text-warning-900'}`}>
                      {formatCurrency(stats.netAmount)}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Search and Filter Section */}
        <Card variant="elevated" className="mb-6">
          <CardBody className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<SearchIcon />}
                />
              </div>
              
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-input"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
              
              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'all' | 'income' | 'expense')}
                className="form-input"
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-end">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="form-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="form-input"
                />
              </div>
              
              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'description')}
                className="form-input"
              >
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="description">Sort by Description</option>
              </select>
              
              {/* Sort Order */}
              <Button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                variant="outline"
                size="md"
                leftIcon={sortOrder === 'asc' ? <SortAscIcon /> : <SortDescIcon />}
              >
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
              
              {/* Clear Filters */}
              <Button
                onClick={clearAllFilters}
                variant="ghost"
                size="md"
                leftIcon={<FilterXIcon />}
              >
                Clear Filters
              </Button>
              
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded ${viewMode === 'table' ? 'bg-white shadow' : ''} transition-all`}
                >
                  <TableIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-2 rounded ${viewMode === 'card' ? 'bg-white shadow' : ''} transition-all`}
                >
                  <GridIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
        
        {/* Bulk Actions Bar */}
        {selectedTransactions.length > 0 && (
          <Card className="mb-4 bg-primary-50 border-primary-200">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-primary-900">
                    {selectedTransactions.length} transaction(s) selected
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setSelectedTransactions([])}
                    variant="ghost"
                    size="sm"
                  >
                    Clear Selection
                  </Button>
                  <Button
                    onClick={handleBulkDelete}
                    variant="error"
                    size="sm"
                    leftIcon={<TrashIcon />}
                  >
                    Delete Selected
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
        
        {/* Transactions Display */}
        <Card variant="elevated">
          {filteredTransactions.length === 0 ? (
            <CardBody className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <CreditCardIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {transactions.length === 0 ? 'No transactions yet' : 'No matching transactions'}
              </h3>
              <p className="text-gray-500 mb-6">
                {transactions.length === 0 
                  ? 'Add your first transaction to get started with tracking your finances.'
                  : 'Try adjusting your search criteria or filters to find what you\'re looking for.'}
              </p>
              {transactions.length === 0 ? (
                <Button
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                  variant="primary"
                  leftIcon={<PlusIcon />}
                >
                  Add Your First Transaction
                </Button>
              ) : (
                <Button
                  onClick={clearAllFilters}
                  variant="outline"
                  leftIcon={<FilterXIcon />}
                >
                  Clear All Filters
                </Button>
              )}
            </CardBody>
          ) : (
            <>
              {viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-4 text-left">
                          <input
                            type="checkbox"
                            onChange={handleSelectAll}
                            checked={getPaginatedTransactions().length > 0 && getPaginatedTransactions().every(t => selectedTransactions.includes(t.id))}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Transaction</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Category</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Date</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Amount</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getPaginatedTransactions().map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedTransactions.includes(transaction.id)}
                              onChange={() => handleSelectTransaction(transaction.id)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${
                                transaction.type === 'income' 
                                  ? 'bg-success-100 text-success-600' 
                                  : 'bg-error-100 text-error-600'
                              }`}>
                                {transaction.type === 'income' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{transaction.description}</p>
                                <p className="text-sm text-gray-500">{transaction.type}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                              style={{ 
                                backgroundColor: `${transaction.categoryColor}20`,
                                color: transaction.categoryColor 
                              }}
                            >
                              <span>{transaction.categoryIcon}</span>
                              {transaction.categoryName}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {formatRelativeTime(transaction.date)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-semibold ${
                              transaction.type === 'income' ? 'text-success-600' : 'text-error-600'
                            }`}>
                              {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Button
                              onClick={() => handleDelete(transaction.id)}
                              variant="ghost"
                              size="sm"
                              leftIcon={<TrashIcon />}
                              className="text-error-600 hover:text-error-700 hover:bg-error-50"
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {getPaginatedTransactions().map((transaction) => (
                    <Card key={transaction.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardBody className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedTransactions.includes(transaction.id)}
                              onChange={() => handleSelectTransaction(transaction.id)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <div className={`p-2 rounded-full ${
                              transaction.type === 'income' 
                                ? 'bg-success-100 text-success-600' 
                                : 'bg-error-100 text-error-600'
                            }`}>
                              {transaction.type === 'income' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleDelete(transaction.id)}
                            variant="ghost"
                            size="sm"
                            leftIcon={<TrashIcon />}
                            className="text-error-600 hover:text-error-700 hover:bg-error-50"
                          >
                            Delete
                          </Button>
                        </div>
                        
                        <h3 className="font-medium text-gray-900 mb-2">{transaction.description}</h3>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: `${transaction.categoryColor}20`,
                              color: transaction.categoryColor 
                            }}
                          >
                            <span>{transaction.categoryIcon}</span>
                            {transaction.categoryName}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatRelativeTime(transaction.date)}
                          </span>
                        </div>
                        
                        <p className={`text-lg font-bold ${
                          transaction.type === 'income' ? 'text-success-600' : 'text-error-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount)}
                        </p>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
              
              {/* Pagination */}
              {getTotalPages() > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-700">
                      Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredTransactions.length)} to{' '}
                      {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} results
                    </p>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="form-input py-1 text-sm"
                    >
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                      leftIcon={<ChevronLeftIcon />}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(getTotalPages() - 4, currentPage - 2)) + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 rounded text-sm ${
                              pageNum === currentPage 
                                ? 'bg-primary-600 text-white' 
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages()))}
                      disabled={currentPage === getTotalPages()}
                      variant="outline"
                      size="sm"
                      rightIcon={<ChevronRightIcon />}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Enhanced Add Transaction Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Add New Transaction"
        description="Add a new income or expense transaction to track your finances"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label required">Transaction Type</label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="form-input"
                disabled={submitting}
              >
                <option value="expense">💸 Expense</option>
                <option value="income">💰 Income</option>
              </select>
            </div>
            
            <div>
              <Input
                label="Amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                error={formErrors.amount}
                placeholder="0.00"
                leftIcon={<DollarIcon />}
                required
                disabled={submitting}
                helperText="Enter amount in dollars (e.g., 25.50)"
              />
            </div>
          </div>
          
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            error={formErrors.description}
            placeholder="What was this transaction for?"
            leftIcon={<DocumentTextIcon />}
            required
            disabled={submitting}
            helperText="Be specific to help categorize your spending"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label required">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => handleInputChange('categoryId', e.target.value)}
                className={`form-input ${formErrors.categoryId ? 'error' : ''}`}
                disabled={submitting}
              >
                <option value="">Select a category</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
              {formErrors.categoryId && (
                <p className="form-error">{formErrors.categoryId}</p>
              )}
              {filteredCategories.length === 0 && (
                <p className="form-help text-warning-600">
                  No categories available for {formData.type}. Create one first.
                </p>
              )}
            </div>
            
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              error={formErrors.date}
              leftIcon={<CalendarIcon />}
              required
              disabled={submitting}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              variant="secondary"
              size="md"
              fullWidth
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={submitting}
              disabled={submitting || filteredCategories.length === 0}
              leftIcon={!submitting && <PlusIcon />}
            >
              {submitting ? 'Adding...' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Enhanced Add Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Create New Category"
        description="Organize your transactions with custom categories"
        size="md"
      >
        <form onSubmit={handleCategorySubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Category Name"
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              placeholder="e.g., Groceries, Salary"
              leftIcon={<TagIcon />}
              required
              helperText="Choose a descriptive name"
            />
            
            <div>
              <label className="form-label required">Category Type</label>
              <select
                value={categoryFormData.type}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, type: e.target.value as 'income' | 'expense' })}
                className="form-input"
              >
                <option value="expense">💸 Expense Category</option>
                <option value="income">💰 Income Category</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label required">Category Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={categoryFormData.color}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                  className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: categoryFormData.color }}>
                    {categoryFormData.color.toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500">This color will be used to identify your category</p>
                </div>
              </div>
            </div>
            
            <Input
              label="Category Icon"
              value={categoryFormData.icon}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, icon: e.target.value })}
              placeholder="📱"
              maxLength={2}
              required
              helperText="Choose an emoji to represent this category"
            />
          </div>
          
          {/* Preview */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
            <span 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
              style={{ 
                backgroundColor: `${categoryFormData.color}20`,
                color: categoryFormData.color 
              }}
            >
              <span>{categoryFormData.icon || '📁'}</span>
              {categoryFormData.name || 'Category Name'}
            </span>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={() => setShowCategoryModal(false)}
              variant="secondary"
              size="md"
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              leftIcon={<PlusIcon />}
            >
              Create Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Icon Components
const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
)

const TagIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
)

const HashtagIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
  </svg>
)

const ArrowUpIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
  </svg>
)

const ArrowDownIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5-5-5m5 5V6" />
  </svg>
)

const CalculatorIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
)

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const SortAscIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
  </svg>
)

const SortDescIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
  </svg>
)

const FilterXIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const TableIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1z" />
  </svg>
)

const GridIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const CreditCardIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
)

const ChevronLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const DollarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
)

const DocumentTextIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

export default function TransactionsPage() {
  return (
    <ProtectedRoute>
      <TransactionsPageContent />
    </ProtectedRoute>
  );
}