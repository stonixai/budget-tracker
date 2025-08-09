/**
 * Formats currency values with proper validation and error handling
 * Critical financial function - requires 100% test coverage
 */

export function formatCurrency(cents: number, currency: string = 'USD', locale: string = 'en-US'): string {
  if (typeof cents !== 'number' || !isFinite(cents)) {
    throw new Error('Invalid input: cents must be a finite number');
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  } catch (error) {
    throw new Error(`Currency formatting failed: ${error}`);
  }
}

export function parseCurrencyInput(input: string): number {
  if (typeof input !== 'string') {
    throw new Error('Invalid input: input must be a string');
  }

  // Remove currency symbols, spaces, and commas
  const cleanInput = input.replace(/[$£€¥,\s]/g, '');
  
  if (cleanInput === '') {
    return 0;
  }

  const parsed = parseFloat(cleanInput);
  
  if (!isFinite(parsed) || isNaN(parsed)) {
    throw new Error('Invalid currency format');
  }

  if (parsed < 0) {
    throw new Error('Negative amounts not allowed');
  }

  if (parsed > 999999999) {
    throw new Error('Amount exceeds maximum allowed value');
  }

  // Convert to cents and round to avoid floating point issues
  return Math.round(parsed * 100);
}

export function formatCurrencyCompact(cents: number, currency: string = 'USD', locale: string = 'en-US'): string {
  if (typeof cents !== 'number' || !isFinite(cents)) {
    throw new Error('Invalid input: cents must be a finite number');
  }

  const amount = Math.abs(cents / 100);
  const sign = cents < 0 ? '-' : '';
  
  if (amount >= 1000000) {
    return `${sign}$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${sign}$${(amount / 1000).toFixed(1)}K`;
  } else {
    return formatCurrency(cents, currency, locale);
  }
}

export function calculatePercentage(spent: number, budget: number): number {
  if (typeof spent !== 'number' || typeof budget !== 'number') {
    throw new Error('Invalid input: both spent and budget must be numbers');
  }

  if (!isFinite(spent) || !isFinite(budget)) {
    throw new Error('Invalid input: values must be finite numbers');
  }

  if (budget <= 0) {
    throw new Error('Budget must be greater than zero');
  }

  const percentage = (spent / budget) * 100;
  
  // Cap at 100% for display purposes, but allow over-budget calculations
  return Math.min(Math.round(percentage), 100);
}

export function calculatePercentageRaw(spent: number, budget: number): number {
  if (typeof spent !== 'number' || typeof budget !== 'number') {
    throw new Error('Invalid input: both spent and budget must be numbers');
  }

  if (!isFinite(spent) || !isFinite(budget)) {
    throw new Error('Invalid input: values must be finite numbers');
  }

  if (budget <= 0) {
    throw new Error('Budget must be greater than zero');
  }

  return Math.round((spent / budget) * 100);
}