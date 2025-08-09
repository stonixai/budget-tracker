import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  parseCurrencyInput,
  formatCurrencyCompact,
  calculatePercentage,
  calculatePercentageRaw,
} from '../../app/utils/currency';

describe('Currency Utils', () => {
  describe('formatCurrency', () => {
    it('should format basic amounts correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(1)).toBe('$0.01');
      expect(formatCurrency(100)).toBe('$1.00');
      expect(formatCurrency(12345)).toBe('$123.45');
      expect(formatCurrency(999999)).toBe('$9,999.99');
    });

    it('should format negative amounts correctly', () => {
      expect(formatCurrency(-5000)).toBe('-$50.00');
      expect(formatCurrency(-1)).toBe('-$0.01');
    });

    it('should support different currencies', () => {
      expect(formatCurrency(10000, 'EUR', 'en-EU')).toMatch(/€100\.00/);
      expect(formatCurrency(10000, 'GBP', 'en-GB')).toMatch(/£100\.00/);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => formatCurrency(NaN)).toThrow('Invalid input: cents must be a finite number');
      expect(() => formatCurrency(Infinity)).toThrow('Invalid input: cents must be a finite number');
      expect(() => formatCurrency('123' as any)).toThrow('Invalid input: cents must be a finite number');
    });

    it('should handle large amounts', () => {
      expect(formatCurrency(100000000)).toBe('$1,000,000.00');
      expect(formatCurrency(999999999)).toBe('$9,999,999.99');
    });

    it('should throw error for invalid currency codes', () => {
      expect(() => formatCurrency(100, 'INVALID')).toThrow('Currency formatting failed');
    });
  });

  describe('parseCurrencyInput', () => {
    it('should parse basic currency inputs', () => {
      expect(parseCurrencyInput('0')).toBe(0);
      expect(parseCurrencyInput('1.00')).toBe(100);
      expect(parseCurrencyInput('123.45')).toBe(12345);
      expect(parseCurrencyInput('9999.99')).toBe(999999);
    });

    it('should handle currency symbols and formatting', () => {
      expect(parseCurrencyInput('$123.45')).toBe(12345);
      expect(parseCurrencyInput('£123.45')).toBe(12345);
      expect(parseCurrencyInput('€123.45')).toBe(12345);
      expect(parseCurrencyInput('¥123.45')).toBe(12345);
      expect(parseCurrencyInput('1,234.56')).toBe(123456);
      expect(parseCurrencyInput('$ 1,234.56')).toBe(123456);
    });

    it('should handle edge cases', () => {
      expect(parseCurrencyInput('')).toBe(0);
      expect(parseCurrencyInput('0.01')).toBe(1);
      expect(parseCurrencyInput('0.001')).toBe(0); // Rounds to nearest cent
    });

    it('should throw error for invalid inputs', () => {
      expect(() => parseCurrencyInput(123 as any)).toThrow('Invalid input: input must be a string');
      expect(() => parseCurrencyInput('abc')).toThrow('Invalid currency format');
      expect(() => parseCurrencyInput('$abc')).toThrow('Invalid currency format');
      expect(() => parseCurrencyInput('-123.45')).toThrow('Negative amounts not allowed');
      expect(() => parseCurrencyInput('9999999999')).toThrow('Amount exceeds maximum allowed value');
    });

    it('should handle floating point precision', () => {
      expect(parseCurrencyInput('0.1')).toBe(10);
      expect(parseCurrencyInput('0.12')).toBe(12);
      expect(parseCurrencyInput('0.123')).toBe(12); // Rounds down
      expect(parseCurrencyInput('0.126')).toBe(13); // Rounds up
    });
  });

  describe('formatCurrencyCompact', () => {
    it('should format small amounts normally', () => {
      expect(formatCurrencyCompact(12345)).toBe('$123.45');
      expect(formatCurrencyCompact(99999)).toBe('$999.99');
    });

    it('should format thousands with K suffix', () => {
      expect(formatCurrencyCompact(100000)).toBe('$1.0K');
      expect(formatCurrencyCompact(150000)).toBe('$1.5K');
      expect(formatCurrencyCompact(999900)).toBe('$10.0K');
    });

    it('should format millions with M suffix', () => {
      expect(formatCurrencyCompact(100000000)).toBe('$1.0M');
      expect(formatCurrencyCompact(250000000)).toBe('$2.5M');
    });

    it('should handle negative amounts', () => {
      expect(formatCurrencyCompact(-100000)).toBe('-$1.0K');
      expect(formatCurrencyCompact(-100000000)).toBe('-$1.0M');
    });

    it('should throw error for invalid inputs', () => {
      expect(() => formatCurrencyCompact(NaN)).toThrow('Invalid input: cents must be a finite number');
      expect(() => formatCurrencyCompact(Infinity)).toThrow('Invalid input: cents must be a finite number');
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate basic percentages', () => {
      expect(calculatePercentage(0, 100)).toBe(0);
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(100, 100)).toBe(100);
    });

    it('should cap percentage at 100%', () => {
      expect(calculatePercentage(150, 100)).toBe(100);
      expect(calculatePercentage(200, 100)).toBe(100);
    });

    it('should handle decimal results by rounding', () => {
      expect(calculatePercentage(33, 100)).toBe(33);
      expect(calculatePercentage(33.4, 100)).toBe(33);
      expect(calculatePercentage(33.6, 100)).toBe(34);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculatePercentage('50' as any, 100)).toThrow('Invalid input: both spent and budget must be numbers');
      expect(() => calculatePercentage(50, '100' as any)).toThrow('Invalid input: both spent and budget must be numbers');
      expect(() => calculatePercentage(NaN, 100)).toThrow('Invalid input: values must be finite numbers');
      expect(() => calculatePercentage(50, Infinity)).toThrow('Invalid input: values must be finite numbers');
      expect(() => calculatePercentage(50, 0)).toThrow('Budget must be greater than zero');
      expect(() => calculatePercentage(50, -100)).toThrow('Budget must be greater than zero');
    });

    it('should handle very large numbers', () => {
      expect(calculatePercentage(999999999, 1000000000)).toBe(100);
      expect(calculatePercentage(500000000, 1000000000)).toBe(50);
    });
  });

  describe('calculatePercentageRaw', () => {
    it('should calculate raw percentages without capping', () => {
      expect(calculatePercentageRaw(150, 100)).toBe(150);
      expect(calculatePercentageRaw(200, 100)).toBe(200);
      expect(calculatePercentageRaw(50, 100)).toBe(50);
    });

    it('should round decimal results', () => {
      expect(calculatePercentageRaw(33.4, 100)).toBe(33);
      expect(calculatePercentageRaw(33.6, 100)).toBe(34);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculatePercentageRaw('50' as any, 100)).toThrow('Invalid input: both spent and budget must be numbers');
      expect(() => calculatePercentageRaw(50, 0)).toThrow('Budget must be greater than zero');
    });

    it('should handle very high percentages', () => {
      expect(calculatePercentageRaw(300, 100)).toBe(300);
      expect(calculatePercentageRaw(1000, 100)).toBe(1000);
    });
  });

  // Security tests
  describe('Security Tests', () => {
    it('should not be vulnerable to prototype pollution', () => {
      const maliciousInput = '{"__proto__": {"isAdmin": true}}';
      expect(() => parseCurrencyInput(maliciousInput)).toThrow('Invalid currency format');
    });

    it('should handle extremely large numbers safely', () => {
      expect(() => parseCurrencyInput('999999999999999999999')).toThrow('Amount exceeds maximum allowed value');
    });

    it('should not execute code in input strings', () => {
      expect(() => parseCurrencyInput('alert("XSS")')).toThrow('Invalid currency format');
      expect(() => parseCurrencyInput('javascript:alert(1)')).toThrow('Invalid currency format');
    });
  });

  // Performance tests
  describe('Performance Tests', () => {
    it('should handle large arrays efficiently', () => {
      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        formatCurrency(i);
      }
      const end = Date.now();
      expect(end - start).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});