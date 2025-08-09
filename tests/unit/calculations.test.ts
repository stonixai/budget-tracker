import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyBudgetSummary,
  calculateTransactionSummary,
  isTransactionInMonth,
  calculateBudgetProgress,
  validateAmount,
  roundToCents,
} from '../../app/utils/calculations';

describe('Financial Calculations', () => {
  describe('calculateMonthlyBudgetSummary', () => {
    it('should calculate summary for valid budgets', () => {
      const budgets = [
        { amount: 50000, spent: 25000 }, // $500 budget, $250 spent
        { amount: 30000, spent: 35000 }, // $300 budget, $350 spent (over)
      ];

      const result = calculateMonthlyBudgetSummary(budgets);

      expect(result).toEqual({
        totalBudget: 80000,
        totalSpent: 60000,
        remaining: 20000,
        percentageUsed: 75,
        isOverBudget: false,
      });
    });

    it('should identify over-budget scenarios', () => {
      const budgets = [
        { amount: 10000, spent: 12000 },
      ];

      const result = calculateMonthlyBudgetSummary(budgets);

      expect(result.isOverBudget).toBe(true);
      expect(result.remaining).toBe(-2000);
      expect(result.percentageUsed).toBe(120);
    });

    it('should handle empty budget array', () => {
      const result = calculateMonthlyBudgetSummary([]);

      expect(result).toEqual({
        totalBudget: 0,
        totalSpent: 0,
        remaining: 0,
        percentageUsed: 0,
        isOverBudget: false,
      });
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculateMonthlyBudgetSummary('not array' as any)).toThrow('Invalid input: budgets must be an array');
      expect(() => calculateMonthlyBudgetSummary([{ amount: 'invalid', spent: 100 }] as any)).toThrow('Invalid budget amount: must be a finite number');
      expect(() => calculateMonthlyBudgetSummary([{ amount: -100, spent: 50 }])).toThrow('Budget amount cannot be negative');
      expect(() => calculateMonthlyBudgetSummary([{ amount: 100, spent: -50 }])).toThrow('Spent amount cannot be negative');
    });

    it('should handle zero budget amounts', () => {
      const budgets = [{ amount: 0, spent: 0 }];
      const result = calculateMonthlyBudgetSummary(budgets);
      expect(result.percentageUsed).toBe(0);
    });

    it('should handle large numbers', () => {
      const budgets = [
        { amount: 999999999, spent: 500000000 }
      ];
      const result = calculateMonthlyBudgetSummary(budgets);
      expect(result.percentageUsed).toBe(50);
    });
  });

  describe('calculateTransactionSummary', () => {
    it('should calculate summary for mixed transactions', () => {
      const transactions = [
        { amount: 500000, type: 'income' as const },
        { amount: 25000, type: 'expense' as const },
        { amount: 15000, type: 'expense' as const },
        { amount: 100000, type: 'income' as const },
      ];

      const result = calculateTransactionSummary(transactions);

      expect(result).toEqual({
        totalIncome: 600000,
        totalExpenses: 40000,
        netIncome: 560000,
        averageTransaction: 160000,
        transactionCount: 4,
      });
    });

    it('should handle only income transactions', () => {
      const transactions = [
        { amount: 500000, type: 'income' as const },
        { amount: 200000, type: 'income' as const },
      ];

      const result = calculateTransactionSummary(transactions);

      expect(result.totalIncome).toBe(700000);
      expect(result.totalExpenses).toBe(0);
      expect(result.netIncome).toBe(700000);
    });

    it('should handle only expense transactions', () => {
      const transactions = [
        { amount: 25000, type: 'expense' as const },
        { amount: 15000, type: 'expense' as const },
      ];

      const result = calculateTransactionSummary(transactions);

      expect(result.totalIncome).toBe(0);
      expect(result.totalExpenses).toBe(40000);
      expect(result.netIncome).toBe(-40000);
    });

    it('should handle empty transaction array', () => {
      const result = calculateTransactionSummary([]);

      expect(result).toEqual({
        totalIncome: 0,
        totalExpenses: 0,
        netIncome: 0,
        averageTransaction: 0,
        transactionCount: 0,
      });
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculateTransactionSummary('not array' as any)).toThrow('Invalid input: transactions must be an array');
      
      expect(() => calculateTransactionSummary([
        { amount: 'invalid', type: 'income' }
      ] as any)).toThrow('Invalid transaction amount at index 0: must be a finite number');

      expect(() => calculateTransactionSummary([
        { amount: -100, type: 'income' }
      ])).toThrow('Transaction amount at index 0 cannot be negative');

      expect(() => calculateTransactionSummary([
        { amount: 100, type: 'invalid' }
      ] as any)).toThrow('Invalid transaction type at index 0: must be \'income\' or \'expense\'');
    });

    it('should handle very large transactions', () => {
      const transactions = [
        { amount: 999999999, type: 'income' as const },
        { amount: 500000000, type: 'expense' as const },
      ];

      const result = calculateTransactionSummary(transactions);
      expect(result.totalIncome).toBe(999999999);
      expect(result.totalExpenses).toBe(500000000);
      expect(result.netIncome).toBe(499999999);
    });
  });

  describe('isTransactionInMonth', () => {
    it('should correctly identify transactions in target month', () => {
      expect(isTransactionInMonth('2024-01-15', '2024-01')).toBe(true);
      expect(isTransactionInMonth('2024-01-01', '2024-01')).toBe(true);
      expect(isTransactionInMonth('2024-01-31', '2024-01')).toBe(true);
    });

    it('should correctly identify transactions NOT in target month', () => {
      expect(isTransactionInMonth('2024-02-01', '2024-01')).toBe(false);
      expect(isTransactionInMonth('2023-12-31', '2024-01')).toBe(false);
      expect(isTransactionInMonth('2024-12-01', '2024-01')).toBe(false);
    });

    it('should throw error for invalid date formats', () => {
      expect(() => isTransactionInMonth('2024/01/15', '2024-01')).toThrow('Invalid transaction date format: expected YYYY-MM-DD');
      expect(() => isTransactionInMonth('2024-01-15', '2024/01')).toThrow('Invalid target month format: expected YYYY-MM');
      expect(() => isTransactionInMonth('15-01-2024', '2024-01')).toThrow('Invalid transaction date format: expected YYYY-MM-DD');
      expect(() => isTransactionInMonth('2024-1-15', '2024-01')).toThrow('Invalid transaction date format: expected YYYY-MM-DD');
    });

    it('should throw error for non-string inputs', () => {
      expect(() => isTransactionInMonth(20240115 as any, '2024-01')).toThrow('Invalid input: both dates must be strings');
      expect(() => isTransactionInMonth('2024-01-15', 202401 as any)).toThrow('Invalid input: both dates must be strings');
    });

    it('should handle edge cases', () => {
      expect(isTransactionInMonth('2024-02-29', '2024-02')).toBe(true); // Leap year
      expect(isTransactionInMonth('2024-12-31', '2024-12')).toBe(true); // End of year
      expect(isTransactionInMonth('2024-01-01', '2024-01')).toBe(true); // Start of year
    });
  });

  describe('calculateBudgetProgress', () => {
    it('should calculate progress correctly', () => {
      expect(calculateBudgetProgress(25000, 100000)).toEqual({
        percentage: 25,
        remaining: 75000,
        status: 'under',
      });

      expect(calculateBudgetProgress(80000, 100000)).toEqual({
        percentage: 80,
        remaining: 20000,
        status: 'near',
      });

      expect(calculateBudgetProgress(120000, 100000)).toEqual({
        percentage: 120,
        remaining: -20000,
        status: 'over',
      });
    });

    it('should handle edge cases', () => {
      expect(calculateBudgetProgress(0, 100000)).toEqual({
        percentage: 0,
        remaining: 100000,
        status: 'under',
      });

      expect(calculateBudgetProgress(75000, 100000)).toEqual({
        percentage: 75,
        remaining: 25000,
        status: 'under',
      });

      expect(calculateBudgetProgress(76000, 100000)).toEqual({
        percentage: 76,
        remaining: 24000,
        status: 'near',
      });
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculateBudgetProgress('50000' as any, 100000)).toThrow('Invalid input: both spent and budget must be numbers');
      expect(() => calculateBudgetProgress(50000, 0)).toThrow('Budget must be greater than zero');
      expect(() => calculateBudgetProgress(-10000, 100000)).toThrow('Spent amount cannot be negative');
      expect(() => calculateBudgetProgress(NaN, 100000)).toThrow('Invalid input: values must be finite numbers');
    });
  });

  describe('validateAmount', () => {
    it('should validate correct amounts', () => {
      expect(validateAmount(0)).toBe(true);
      expect(validateAmount(100)).toBe(true);
      expect(validateAmount(999999999)).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(validateAmount(-1)).toBe(false);
      expect(validateAmount(NaN)).toBe(false);
      expect(validateAmount(Infinity)).toBe(false);
      expect(validateAmount(1000000000)).toBe(false); // Exceeds default max
    });

    it('should respect custom max amount', () => {
      expect(validateAmount(500, 1000)).toBe(true);
      expect(validateAmount(1500, 1000)).toBe(false);
    });

    it('should handle non-number inputs', () => {
      expect(validateAmount('100' as any)).toBe(false);
      expect(validateAmount(null as any)).toBe(false);
      expect(validateAmount(undefined as any)).toBe(false);
    });
  });

  describe('roundToCents', () => {
    it('should round correctly', () => {
      expect(roundToCents(100.4)).toBe(100);
      expect(roundToCents(100.5)).toBe(101);
      expect(roundToCents(100.6)).toBe(101);
      expect(roundToCents(-100.5)).toBe(-100);
    });

    it('should handle whole numbers', () => {
      expect(roundToCents(100)).toBe(100);
      expect(roundToCents(0)).toBe(0);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => roundToCents(NaN)).toThrow('Invalid input: amount must be a finite number');
      expect(() => roundToCents(Infinity)).toThrow('Invalid input: amount must be a finite number');
      expect(() => roundToCents('100' as any)).toThrow('Invalid input: amount must be a finite number');
    });

    it('should handle very large numbers', () => {
      expect(roundToCents(999999999.9)).toBe(1000000000);
      expect(roundToCents(999999999.1)).toBe(999999999);
    });
  });

  // Security tests
  describe('Security Tests', () => {
    it('should not be vulnerable to prototype pollution in transaction data', () => {
      const maliciousTransaction = {
        amount: 100,
        type: 'income' as const,
        '__proto__': { isAdmin: true }
      };

      expect(() => calculateTransactionSummary([maliciousTransaction])).not.toThrow();
      expect((Object.prototype as any).isAdmin).toBeUndefined();
    });

    it('should handle extremely large arrays without memory issues', () => {
      const largeArray = Array(1000).fill({ amount: 100, spent: 50 });
      expect(() => calculateMonthlyBudgetSummary(largeArray)).not.toThrow();
    });
  });

  // Performance tests
  describe('Performance Tests', () => {
    it('should handle large transaction arrays efficiently', () => {
      const transactions = Array(10000).fill(null).map(() => ({
        amount: Math.floor(Math.random() * 10000),
        type: Math.random() > 0.5 ? 'income' as const : 'expense' as const,
      }));

      const start = Date.now();
      calculateTransactionSummary(transactions);
      const end = Date.now();

      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle large budget arrays efficiently', () => {
      const budgets = Array(10000).fill(null).map(() => ({
        amount: Math.floor(Math.random() * 10000),
        spent: Math.floor(Math.random() * 5000),
      }));

      const start = Date.now();
      calculateMonthlyBudgetSummary(budgets);
      const end = Date.now();

      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});