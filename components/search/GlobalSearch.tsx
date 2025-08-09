'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

interface SearchResult {
  id: string;
  type: 'transaction' | 'budget' | 'category';
  title: string;
  description: string;
  amount?: number;
  date?: string;
  categoryName?: string;
  categoryIcon?: string;
  url: string;
  relevance: number;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export default function GlobalSearch({ isOpen, onClose, className = '' }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { signOut } = useAuth();

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.length >= 2) {
      const debounceTimer = setTimeout(() => {
        performSearch(query);
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setResults([]);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const [transactionsRes, budgetsRes, categoriesRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/budgets'),
        fetch('/api/categories')
      ]);

      if (transactionsRes.status === 401 || budgetsRes.status === 401 || categoriesRes.status === 401) {
        signOut();
        return;
      }

      const [transactions, budgets, categories] = await Promise.all([
        transactionsRes.json(),
        budgetsRes.json(),
        categoriesRes.json()
      ]);

      const searchResults: SearchResult[] = [];
      const queryLower = searchQuery.toLowerCase();

      // Search transactions
      transactions.forEach((transaction: any) => {
        const descriptionMatch = transaction.description.toLowerCase().includes(queryLower);
        const categoryMatch = transaction.categoryName.toLowerCase().includes(queryLower);
        const amountMatch = (transaction.amount / 100).toString().includes(queryLower);
        const dateMatch = transaction.date.includes(queryLower);

        if (descriptionMatch || categoryMatch || amountMatch || dateMatch) {
          let relevance = 0;
          if (descriptionMatch) relevance += 3;
          if (categoryMatch) relevance += 2;
          if (amountMatch) relevance += 1;
          if (dateMatch) relevance += 1;

          searchResults.push({
            id: `transaction-${transaction.id}`,
            type: 'transaction',
            title: transaction.description,
            description: `${transaction.categoryIcon} ${transaction.categoryName} • ${formatRelativeTime(transaction.date)}`,
            amount: transaction.amount,
            date: transaction.date,
            categoryName: transaction.categoryName,
            categoryIcon: transaction.categoryIcon,
            url: '/transactions',
            relevance
          });
        }
      });

      // Search budgets
      budgets.forEach((budget: any) => {
        const nameMatch = budget.name.toLowerCase().includes(queryLower);
        const categoryMatch = budget.categoryName?.toLowerCase().includes(queryLower);
        const monthMatch = budget.month.includes(queryLower);

        if (nameMatch || categoryMatch || monthMatch) {
          let relevance = 0;
          if (nameMatch) relevance += 3;
          if (categoryMatch) relevance += 2;
          if (monthMatch) relevance += 1;

          searchResults.push({
            id: `budget-${budget.id}`,
            type: 'budget',
            title: budget.name,
            description: `Budget for ${budget.month} • ${budget.categoryName || 'All Categories'}`,
            amount: budget.amount,
            url: '/budgets',
            relevance
          });
        }
      });

      // Search categories
      categories.forEach((category: any) => {
        const nameMatch = category.name.toLowerCase().includes(queryLower);
        const typeMatch = category.type.toLowerCase().includes(queryLower);

        if (nameMatch || typeMatch) {
          let relevance = 0;
          if (nameMatch) relevance += 3;
          if (typeMatch) relevance += 1;

          searchResults.push({
            id: `category-${category.id}`,
            type: 'category',
            title: `${category.icon} ${category.name}`,
            description: `${category.type} category`,
            url: '/transactions',
            relevance
          });
        }
      });

      // Sort by relevance and limit results
      searchResults.sort((a, b) => b.relevance - a.relevance);
      setResults(searchResults.slice(0, 10));
      setSelectedIndex(0);

    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const updated = [
      searchQuery,
      ...recentSearches.filter(s => s !== searchQuery)
    ].slice(0, 5);
    
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query);
    onClose();
    // Navigate to the URL (this would typically use next/router)
    window.location.href = result.url;
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 ${className}`}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mt-20">
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <SearchIcon className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search transactions, budgets, categories..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-lg border-none outline-none bg-transparent placeholder-gray-400"
            />
            {loading && (
              <div className="w-5 h-5">
                <LoadingSpinner />
              </div>
            )}
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-600"
            >
              <CloseIcon />
            </Button>
          </div>
        </div>

        {/* Search Results */}
        <div ref={resultsRef} className="max-h-96 overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-6">
              {recentSearches.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-700">Recent Searches</h3>
                    <Button
                      onClick={clearRecentSearches}
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(search)}
                        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-100 text-left"
                      >
                        <ClockIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{search}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Search Everything</h3>
                  <p className="text-gray-500">
                    Find transactions, budgets, and categories quickly
                  </p>
                </div>
              )}
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${
                    index === selectedIndex ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    result.type === 'transaction' ? 'bg-blue-100' :
                    result.type === 'budget' ? 'bg-green-100' :
                    'bg-purple-100'
                  }`}>
                    {result.type === 'transaction' && <TransactionIcon className="w-4 h-4 text-blue-600" />}
                    {result.type === 'budget' && <BudgetIcon className="w-4 h-4 text-green-600" />}
                    {result.type === 'category' && <CategoryIcon className="w-4 h-4 text-purple-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 truncate">{result.title}</h4>
                      {result.amount && (
                        <span className="text-sm font-medium text-gray-700 ml-2">
                          {formatCurrency(result.amount)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{result.description}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    result.type === 'transaction' ? 'bg-blue-100 text-blue-800' :
                    result.type === 'budget' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {result.type}
                  </div>
                </div>
              ))}
            </div>
          ) : query.length >= 2 && !loading ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SearchIcon className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-500">
                Try searching for transactions, budget names, or categories
              </p>
            </div>
          ) : null}
        </div>

        {/* Search Tips */}
        {results.length > 0 && (
          <div className="p-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            Use ↑↓ arrows to navigate • Press Enter to open • ESC to close
          </div>
        )}
      </div>
    </div>
  );
}

// Icon Components
const SearchIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ClockIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TransactionIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const BudgetIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
  </svg>
);

const CategoryIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const LoadingSpinner = () => (
  <svg className="animate-spin w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);