'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';

interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
}

interface AdvancedFiltersProps {
  categories: Category[];
  onFiltersChange: (filters: FilterState) => void;
  initialFilters?: FilterState;
}

export interface FilterState {
  searchTerm: string;
  selectedCategories: number[];
  selectedTypes: ('income' | 'expense')[];
  dateRange: {
    from: string;
    to: string;
  };
  amountRange: {
    min: string;
    max: string;
  };
  sortBy: 'date' | 'amount' | 'description' | 'category';
  sortOrder: 'asc' | 'desc';
  tags: string[];
  excludeCategories: number[];
  quickDateFilter: 'all' | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'last_year';
}

const defaultFilters: FilterState = {
  searchTerm: '',
  selectedCategories: [],
  selectedTypes: [],
  dateRange: { from: '', to: '' },
  amountRange: { min: '', max: '' },
  sortBy: 'date',
  sortOrder: 'desc',
  tags: [],
  excludeCategories: [],
  quickDateFilter: 'all'
};

export default function AdvancedFilters({ categories, onFiltersChange, initialFilters = defaultFilters }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isExpanded, setIsExpanded] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState<Array<{ name: string; filters: FilterState }>>([]);

  useEffect(() => {
    // Load saved presets from localStorage
    const saved = localStorage.getItem('filterPresets');
    if (saved) {
      setSavedPresets(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilters = (updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  };

  const handleQuickDateFilter = (period: FilterState['quickDateFilter']) => {
    const now = new Date();
    let from = '';
    let to = '';

    switch (period) {
      case 'today':
        from = to = now.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        from = to = yesterday.toISOString().split('T')[0];
        break;
      case 'this_week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        from = startOfWeek.toISOString().split('T')[0];
        to = now.toISOString().split('T')[0];
        break;
      case 'last_week':
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setDate(now.getDate() - now.getDay() - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        from = lastWeekStart.toISOString().split('T')[0];
        to = lastWeekEnd.toISOString().split('T')[0];
        break;
      case 'this_month':
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        to = now.toISOString().split('T')[0];
        break;
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        from = lastMonth.toISOString().split('T')[0];
        to = lastMonthEnd.toISOString().split('T')[0];
        break;
      case 'this_year':
        from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        to = now.toISOString().split('T')[0];
        break;
      case 'last_year':
        from = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
        to = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
        break;
      default:
        from = '';
        to = '';
    }

    updateFilters({
      quickDateFilter: period,
      dateRange: { from, to }
    });
  };

  const clearAllFilters = () => {
    setFilters(defaultFilters);
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    
    const newPreset = { name: presetName, filters };
    const updated = [...savedPresets.filter(p => p.name !== presetName), newPreset];
    setSavedPresets(updated);
    localStorage.setItem('filterPresets', JSON.stringify(updated));
    setPresetName('');
  };

  const loadPreset = (preset: { name: string; filters: FilterState }) => {
    setFilters(preset.filters);
  };

  const deletePreset = (presetName: string) => {
    const updated = savedPresets.filter(p => p.name !== presetName);
    setSavedPresets(updated);
    localStorage.setItem('filterPresets', JSON.stringify(updated));
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.selectedCategories.length > 0) count++;
    if (filters.selectedTypes.length > 0 && filters.selectedTypes.length < 2) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.amountRange.min || filters.amountRange.max) count++;
    if (filters.excludeCategories.length > 0) count++;
    if (filters.quickDateFilter !== 'all') count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card variant="elevated" className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
            {activeFilterCount > 0 && (
              <span className="bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-xs font-medium">
                {activeFilterCount} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button
                onClick={clearAllFilters}
                variant="ghost"
                size="sm"
                leftIcon={<FilterXIcon />}
              >
                Clear All
              </Button>
            )}
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="outline"
              size="sm"
              rightIcon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            >
              {isExpanded ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardBody className="pt-0">
          <div className="space-y-6">
            {/* Quick Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <Input
                placeholder="Search transactions, descriptions, categories..."
                value={filters.searchTerm}
                onChange={(e) => updateFilters({ searchTerm: e.target.value })}
                leftIcon={<SearchIcon />}
              />
            </div>

            {/* Quick Date Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Date Filters</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All Time' },
                  { key: 'today', label: 'Today' },
                  { key: 'yesterday', label: 'Yesterday' },
                  { key: 'this_week', label: 'This Week' },
                  { key: 'last_week', label: 'Last Week' },
                  { key: 'this_month', label: 'This Month' },
                  { key: 'last_month', label: 'Last Month' },
                  { key: 'this_year', label: 'This Year' },
                  { key: 'last_year', label: 'Last Year' }
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    onClick={() => handleQuickDateFilter(key as FilterState['quickDateFilter'])}
                    variant={filters.quickDateFilter === key ? 'primary' : 'outline'}
                    size="sm"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={filters.dateRange.from}
                  onChange={(e) => updateFilters({ 
                    dateRange: { ...filters.dateRange, from: e.target.value },
                    quickDateFilter: 'all'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={filters.dateRange.to}
                  onChange={(e) => updateFilters({ 
                    dateRange: { ...filters.dateRange, to: e.target.value },
                    quickDateFilter: 'all'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Amount Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={filters.amountRange.min}
                  onChange={(e) => updateFilters({ 
                    amountRange: { ...filters.amountRange, min: e.target.value }
                  })}
                  leftIcon={<DollarIcon />}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
                <Input
                  type="number"
                  placeholder="1000.00"
                  value={filters.amountRange.max}
                  onChange={(e) => updateFilters({ 
                    amountRange: { ...filters.amountRange, max: e.target.value }
                  })}
                  leftIcon={<DollarIcon />}
                />
              </div>
            </div>

            {/* Transaction Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Types</label>
              <div className="flex gap-2">
                {[
                  { key: 'income', label: '💰 Income' },
                  { key: 'expense', label: '💸 Expense' }
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    onClick={() => {
                      const currentTypes = filters.selectedTypes;
                      const newTypes = currentTypes.includes(key as 'income' | 'expense')
                        ? currentTypes.filter(t => t !== key)
                        : [...currentTypes, key as 'income' | 'expense'];
                      updateFilters({ selectedTypes: newTypes });
                    }}
                    variant={filters.selectedTypes.includes(key as 'income' | 'expense') ? 'primary' : 'outline'}
                    size="sm"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Include Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Include Categories</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    onClick={() => {
                      const current = filters.selectedCategories;
                      const newCategories = current.includes(category.id)
                        ? current.filter(id => id !== category.id)
                        : [...current, category.id];
                      updateFilters({ selectedCategories: newCategories });
                    }}
                    variant={filters.selectedCategories.includes(category.id) ? 'primary' : 'outline'}
                    size="sm"
                    leftIcon={<span>{category.icon}</span>}
                    className="justify-start"
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Exclude Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exclude Categories</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    onClick={() => {
                      const current = filters.excludeCategories;
                      const newCategories = current.includes(category.id)
                        ? current.filter(id => id !== category.id)
                        : [...current, category.id];
                      updateFilters({ excludeCategories: newCategories });
                    }}
                    variant={filters.excludeCategories.includes(category.id) ? 'error' : 'outline'}
                    size="sm"
                    leftIcon={<span>{category.icon}</span>}
                    className="justify-start"
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilters({ sortBy: e.target.value as FilterState['sortBy'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="description">Description</option>
                  <option value="category">Category</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort Order</label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => updateFilters({ sortOrder: e.target.value as 'asc' | 'desc' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            {/* Filter Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter Presets</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {savedPresets.map((preset) => (
                  <div key={preset.name} className="flex items-center gap-1">
                    <Button
                      onClick={() => loadPreset(preset)}
                      variant="outline"
                      size="sm"
                      leftIcon={<BookmarkIcon />}
                    >
                      {preset.name}
                    </Button>
                    <Button
                      onClick={() => deletePreset(preset.name)}
                      variant="ghost"
                      size="sm"
                      leftIcon={<TrashIcon />}
                      className="text-error-600 hover:text-error-700"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Preset name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={savePreset}
                  variant="primary"
                  size="sm"
                  disabled={!presetName.trim()}
                  leftIcon={<SaveIcon />}
                >
                  Save Preset
                </Button>
              </div>
            </div>
          </div>
        </CardBody>
      )}
    </Card>
  );
}

// Icon Components
const FilterXIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const DollarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

const BookmarkIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);