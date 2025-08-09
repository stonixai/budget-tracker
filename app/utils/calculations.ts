/**
 * Financial calculation utilities
 * Critical financial functions - require 100% test coverage
 */

export interface MonthlyBudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  isOverBudget: boolean;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  averageTransaction: number;
  transactionCount: number;
}

export function calculateMonthlyBudgetSummary(
  budgets: Array<{ amount: number; spent: number }>
): MonthlyBudgetSummary {
  if (!Array.isArray(budgets)) {
    throw new Error('Invalid input: budgets must be an array');
  }

  if (budgets.length === 0) {
    return {
      totalBudget: 0,
      totalSpent: 0,
      remaining: 0,
      percentageUsed: 0,
      isOverBudget: false,
    };
  }

  const totalBudget = budgets.reduce((sum, budget) => {
    if (typeof budget.amount !== 'number' || !isFinite(budget.amount)) {
      throw new Error('Invalid budget amount: must be a finite number');
    }
    if (budget.amount < 0) {
      throw new Error('Budget amount cannot be negative');
    }
    return sum + budget.amount;
  }, 0);

  const totalSpent = budgets.reduce((sum, budget) => {
    if (typeof budget.spent !== 'number' || !isFinite(budget.spent)) {
      throw new Error('Invalid spent amount: must be a finite number');
    }
    if (budget.spent < 0) {
      throw new Error('Spent amount cannot be negative');
    }
    return sum + budget.spent;
  }, 0);

  const remaining = totalBudget - totalSpent;
  const percentageUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const isOverBudget = totalSpent > totalBudget;

  return {
    totalBudget,
    totalSpent,
    remaining,
    percentageUsed,
    isOverBudget,
  };
}

export function calculateTransactionSummary(
  transactions: Array<{ amount: number; type: 'income' | 'expense' }>
): TransactionSummary {
  if (!Array.isArray(transactions)) {
    throw new Error('Invalid input: transactions must be an array');
  }

  if (transactions.length === 0) {
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      averageTransaction: 0,
      transactionCount: 0,
    };
  }

  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach((transaction, index) => {
    if (typeof transaction.amount !== 'number' || !isFinite(transaction.amount)) {
      throw new Error(`Invalid transaction amount at index ${index}: must be a finite number`);
    }
    
    if (transaction.amount < 0) {
      throw new Error(`Transaction amount at index ${index} cannot be negative`);
    }

    if (!['income', 'expense'].includes(transaction.type)) {
      throw new Error(`Invalid transaction type at index ${index}: must be 'income' or 'expense'`);
    }

    if (transaction.type === 'income') {
      totalIncome += transaction.amount;
    } else {
      totalExpenses += transaction.amount;
    }
  });

  const netIncome = totalIncome - totalExpenses;
  const averageTransaction = Math.round((totalIncome + totalExpenses) / transactions.length);

  return {
    totalIncome,
    totalExpenses,
    netIncome,
    averageTransaction,
    transactionCount: transactions.length,
  };
}

export function isTransactionInMonth(transactionDate: string, targetMonth: string): boolean {
  if (typeof transactionDate !== 'string' || typeof targetMonth !== 'string') {
    throw new Error('Invalid input: both dates must be strings');
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(transactionDate)) {
    throw new Error('Invalid transaction date format: expected YYYY-MM-DD');
  }

  // Validate month format (YYYY-MM)
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(targetMonth)) {
    throw new Error('Invalid target month format: expected YYYY-MM');
  }

  const transactionMonth = transactionDate.slice(0, 7);
  return transactionMonth === targetMonth;
}

export function calculateBudgetProgress(spent: number, budget: number): {
  percentage: number;
  remaining: number;
  status: 'under' | 'near' | 'over';
} {
  if (typeof spent !== 'number' || typeof budget !== 'number') {
    throw new Error('Invalid input: both spent and budget must be numbers');
  }

  if (!isFinite(spent) || !isFinite(budget)) {
    throw new Error('Invalid input: values must be finite numbers');
  }

  if (budget <= 0) {
    throw new Error('Budget must be greater than zero');
  }

  if (spent < 0) {
    throw new Error('Spent amount cannot be negative');
  }

  const percentage = Math.round((spent / budget) * 100);
  const remaining = budget - spent;

  let status: 'under' | 'near' | 'over';
  if (percentage > 100) {
    status = 'over';
  } else if (percentage > 75) {
    status = 'near';
  } else {
    status = 'under';
  }

  return {
    percentage,
    remaining,
    status,
  };
}

export function validateAmount(amount: number, maxAmount: number = 999999999): boolean {
  if (typeof amount !== 'number' || !isFinite(amount)) {
    return false;
  }

  if (amount < 0 || amount > maxAmount) {
    return false;
  }

  return true;
}

export function roundToCents(amount: number): number {
  if (typeof amount !== 'number' || !isFinite(amount)) {
    throw new Error('Invalid input: amount must be a finite number');
  }

  return Math.round(amount);
}