import { FilterState } from '@/components/filters/AdvancedFilters';

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

export function applyFilters(transactions: Transaction[], filters: FilterState): Transaction[] {
  let filtered = [...transactions];

  // Search filter
  if (filters.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(t => 
      t.description.toLowerCase().includes(searchLower) ||
      t.categoryName.toLowerCase().includes(searchLower)
    );
  }

  // Type filter
  if (filters.selectedTypes.length > 0) {
    filtered = filtered.filter(t => filters.selectedTypes.includes(t.type));
  }

  // Category include filter
  if (filters.selectedCategories.length > 0) {
    filtered = filtered.filter(t => filters.selectedCategories.includes(t.categoryId));
  }

  // Category exclude filter
  if (filters.excludeCategories.length > 0) {
    filtered = filtered.filter(t => !filters.excludeCategories.includes(t.categoryId));
  }

  // Date range filter
  if (filters.dateRange.from) {
    filtered = filtered.filter(t => new Date(t.date) >= new Date(filters.dateRange.from));
  }
  if (filters.dateRange.to) {
    filtered = filtered.filter(t => new Date(t.date) <= new Date(filters.dateRange.to));
  }

  // Amount range filter
  if (filters.amountRange.min) {
    const minAmount = parseFloat(filters.amountRange.min) * 100; // Convert to cents
    filtered = filtered.filter(t => t.amount >= minAmount);
  }
  if (filters.amountRange.max) {
    const maxAmount = parseFloat(filters.amountRange.max) * 100; // Convert to cents
    filtered = filtered.filter(t => t.amount <= maxAmount);
  }

  // Sort
  filtered.sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (filters.sortBy) {
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
      case 'category':
        aValue = a.categoryName.toLowerCase();
        bValue = b.categoryName.toLowerCase();
        break;
      default:
        aValue = a.id;
        bValue = b.id;
    }
    
    if (filters.sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  return filtered;
}

export function getFilterSummary(filters: FilterState): string {
  const parts: string[] = [];
  
  if (filters.searchTerm) {
    parts.push(`containing "${filters.searchTerm}"`);
  }
  
  if (filters.selectedTypes.length > 0 && filters.selectedTypes.length < 2) {
    parts.push(`${filters.selectedTypes[0]} transactions`);
  }
  
  if (filters.selectedCategories.length > 0) {
    parts.push(`from ${filters.selectedCategories.length} categories`);
  }
  
  if (filters.excludeCategories.length > 0) {
    parts.push(`excluding ${filters.excludeCategories.length} categories`);
  }
  
  if (filters.dateRange.from || filters.dateRange.to) {
    if (filters.dateRange.from && filters.dateRange.to) {
      parts.push(`from ${filters.dateRange.from} to ${filters.dateRange.to}`);
    } else if (filters.dateRange.from) {
      parts.push(`from ${filters.dateRange.from}`);
    } else {
      parts.push(`until ${filters.dateRange.to}`);
    }
  }
  
  if (filters.amountRange.min || filters.amountRange.max) {
    if (filters.amountRange.min && filters.amountRange.max) {
      parts.push(`between $${filters.amountRange.min} and $${filters.amountRange.max}`);
    } else if (filters.amountRange.min) {
      parts.push(`over $${filters.amountRange.min}`);
    } else {
      parts.push(`under $${filters.amountRange.max}`);
    }
  }
  
  if (parts.length === 0) {
    return 'All transactions';
  }
  
  return `Showing transactions ${parts.join(', ')}`;
}