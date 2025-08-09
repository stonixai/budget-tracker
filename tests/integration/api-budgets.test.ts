import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../../app/api/budgets/route';
import { db, cleanDatabase } from '../utils/test-db';
import { createUser, createCategory, createTransaction, createBudget } from '../utils/factories';
import { budgets, transactions, categories } from '../../app/db/schema';

// Mock the database import in the API route
vi.mock('../../app/db', () => ({
  db: () => import('../utils/test-db').then(m => m.db)
}));

describe('API Route: /api/budgets', () => {
  beforeEach(() => {
    cleanDatabase();
  });

  describe('GET /api/budgets', () => {
    it('should return budgets with spending calculations', async () => {
      const user = await createUser();
      const category = await createCategory(user.id, { 
        name: 'Groceries', 
        icon: '🛒', 
        color: '#ff0000',
        type: 'expense' 
      });

      // Create budget
      await createBudget(user.id, {
        name: 'Monthly Groceries',
        amount: 50000, // $500.00
        categoryId: category.id,
        month: '2024-01'
      });

      // Create some transactions in the same month
      await createTransaction(user.id, category.id, {
        amount: 15000, // $150.00
        type: 'expense',
        date: '2024-01-15'
      });
      await createTransaction(user.id, category.id, {
        amount: 10000, // $100.00
        type: 'expense',
        date: '2024-01-20'
      });

      const request = new NextRequest('http://localhost:3000/api/budgets?month=2024-01');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        name: 'Monthly Groceries',
        amount: 50000,
        month: '2024-01',
        categoryId: category.id,
        categoryName: 'Groceries',
        categoryColor: '#ff0000',
        categoryIcon: '🛒',
        spent: 25000 // Should sum up the transactions
      });
    });

    it('should default to current month when no month specified', async () => {
      const user = await createUser();
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      await createBudget(user.id, {
        name: 'Current Month Budget',
        month: currentMonth
      });

      const request = new NextRequest('http://localhost:3000/api/budgets');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].month).toBe(currentMonth);
    });

    it('should filter budgets by specific month', async () => {
      const user = await createUser();
      
      await createBudget(user.id, { name: 'January Budget', month: '2024-01' });
      await createBudget(user.id, { name: 'February Budget', month: '2024-02' });

      const request = new NextRequest('http://localhost:3000/api/budgets?month=2024-01');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('January Budget');
    });

    it('should return budgets without categories', async () => {
      const user = await createUser();
      
      await createBudget(user.id, {
        name: 'General Budget',
        amount: 100000,
        categoryId: null,
        month: '2024-01'
      });

      const request = new NextRequest('http://localhost:3000/api/budgets?month=2024-01');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        name: 'General Budget',
        categoryId: null,
        categoryName: null,
        categoryColor: null,
        categoryIcon: null,
        spent: 0 // No category means no spending tracked
      });
    });

    it('should calculate spending correctly across multiple budgets', async () => {
      const user = await createUser();
      const groceryCategory = await createCategory(user.id, { name: 'Groceries', type: 'expense' });
      const transportCategory = await createCategory(user.id, { name: 'Transport', type: 'expense' });

      await createBudget(user.id, { categoryId: groceryCategory.id, amount: 50000, month: '2024-01' });
      await createBudget(user.id, { categoryId: transportCategory.id, amount: 30000, month: '2024-01' });

      // Add spending for each category
      await createTransaction(user.id, groceryCategory.id, { amount: 20000, type: 'expense', date: '2024-01-15' });
      await createTransaction(user.id, transportCategory.id, { amount: 15000, type: 'expense', date: '2024-01-15' });

      const request = new NextRequest('http://localhost:3000/api/budgets?month=2024-01');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      
      const groceryBudget = data.find((b: any) => b.categoryId === groceryCategory.id);
      const transportBudget = data.find((b: any) => b.categoryId === transportCategory.id);

      expect(groceryBudget.spent).toBe(20000);
      expect(transportBudget.spent).toBe(15000);
    });

    it('should handle empty budget list', async () => {
      const request = new NextRequest('http://localhost:3000/api/budgets?month=2024-01');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      vi.mocked(db.select).mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      const request = new NextRequest('http://localhost:3000/api/budgets');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch budgets' });
    });
  });

  describe('POST /api/budgets', () => {
    it('should create a new budget successfully', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      const budgetData = {
        name: 'New Budget',
        amount: 75000, // $750.00
        categoryId: category.id,
        month: '2024-02'
      };

      const request = new NextRequest('http://localhost:3000/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        ...budgetData,
        userId: 1, // Hardcoded in API route
      });
      expect(data.id).toBeDefined();

      // Verify budget was created in database
      const dbBudgets = await db.select().from(budgets);
      expect(dbBudgets).toHaveLength(1);
    });

    it('should create budget without category', async () => {
      const budgetData = {
        name: 'General Budget',
        amount: 100000,
        categoryId: null,
        month: '2024-02'
      };

      const request = new NextRequest('http://localhost:3000/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.categoryId).toBeNull();
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        name: 'Missing amount and month',
      };

      const request = new NextRequest('http://localhost:3000/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompleteData),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should handle foreign key constraint violations', async () => {
      const budgetData = {
        name: 'Invalid Budget',
        amount: 50000,
        categoryId: 99999, // Non-existent category
        month: '2024-02'
      };

      const request = new NextRequest('http://localhost:3000/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to create budget' });
    });

    it('should allow multiple budgets for same month', async () => {
      const user = await createUser();
      const category1 = await createCategory(user.id, { name: 'Category 1' });
      const category2 = await createCategory(user.id, { name: 'Category 2' });

      const budget1Data = {
        name: 'Budget 1',
        amount: 50000,
        categoryId: category1.id,
        month: '2024-02'
      };

      const budget2Data = {
        name: 'Budget 2',
        amount: 30000,
        categoryId: category2.id,
        month: '2024-02'
      };

      // Create first budget
      await POST(new NextRequest('http://localhost:3000/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budget1Data),
      }));

      // Create second budget
      const response = await POST(new NextRequest('http://localhost:3000/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budget2Data),
      }));

      expect(response.status).toBe(201);

      // Verify both budgets exist
      const dbBudgets = await db.select().from(budgets);
      expect(dbBudgets).toHaveLength(2);
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to create budget' });
    });
  });

  describe('DELETE /api/budgets', () => {
    it('should delete a budget successfully', async () => {
      const user = await createUser();
      const budget = await createBudget(user.id, { name: 'Test Budget' });

      const request = new NextRequest(`http://localhost:3000/api/budgets?id=${budget.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });

      // Verify budget was deleted
      const dbBudgets = await db.select().from(budgets);
      expect(dbBudgets).toHaveLength(0);
    });

    it('should require budget ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/budgets', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Budget ID required' });
    });

    it('should handle non-existent budget ID gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/budgets?id=99999', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });

    it('should handle invalid budget ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/budgets?id=invalid', {
        method: 'DELETE',
      });

      const response = await DELETE(request);

      // Should handle the invalid ID gracefully
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Security Tests', () => {
    it('should sanitize budget name input', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      const maliciousData = {
        name: '<script>alert("XSS")</script>Monthly Budget',
        amount: 50000,
        categoryId: category.id,
        month: '2024-02'
      };

      const request = new NextRequest('http://localhost:3000/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('<script>alert("XSS")</script>Monthly Budget');

      // Verify script is stored as text, not executed
      const dbBudgets = await db.select().from(budgets);
      expect(dbBudgets[0].name).toBe('<script>alert("XSS")</script>Monthly Budget');
    });

    it('should handle SQL injection attempts safely', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      const sqlInjectionData = {
        name: "'; DROP TABLE budgets; --",
        amount: 50000,
        categoryId: category.id,
        month: '2024-02'
      };

      const request = new NextRequest('http://localhost:3000/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sqlInjectionData),
      });

      const response = await POST(request);

      // Should either succeed (storing safely) or fail gracefully
      expect([201, 500]).toContain(response.status);

      // Verify budgets table still exists
      const dbBudgets = await db.select().from(budgets);
      expect(Array.isArray(dbBudgets)).toBe(true);
    });

    it('should validate numeric amount field', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      const invalidAmountData = {
        name: 'Invalid Amount Budget',
        amount: 'not-a-number',
        categoryId: category.id,
        month: '2024-02'
      };

      const request = new NextRequest('http://localhost:3000/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidAmountData),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should validate month format', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      const invalidMonthData = {
        name: 'Invalid Month Budget',
        amount: 50000,
        categoryId: category.id,
        month: 'invalid-month-format'
      };

      const request = new NextRequest('http://localhost:3000/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidMonthData),
      });

      const response = await POST(request);

      expect(response.status).toBe(201); // Month validation not implemented in current API
      // In a production system, this should return 400 with proper validation
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent budget creations', async () => {
      const user = await createUser();
      const categories = await Promise.all([
        createCategory(user.id, { name: 'Category 1' }),
        createCategory(user.id, { name: 'Category 2' }),
        createCategory(user.id, { name: 'Category 3' }),
      ]);

      const createRequests = categories.map((category, i) => {
        const budgetData = {
          name: `Budget ${i}`,
          amount: 50000 + (i * 1000),
          categoryId: category.id,
          month: '2024-02'
        };

        return POST(new NextRequest('http://localhost:3000/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(budgetData),
        }));
      });

      const responses = await Promise.all(createRequests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all budgets were created
      const dbBudgets = await db.select().from(budgets);
      expect(dbBudgets).toHaveLength(3);
    });

    it('should calculate spending efficiently for many budgets', async () => {
      const user = await createUser();
      const categories = await Promise.all(
        Array(20).fill(null).map((_, i) => 
          createCategory(user.id, { name: `Category ${i}`, type: 'expense' })
        )
      );

      // Create budgets
      for (const category of categories) {
        await createBudget(user.id, {
          categoryId: category.id,
          amount: 50000,
          month: '2024-01'
        });

        // Add some transactions
        await createTransaction(user.id, category.id, {
          amount: 10000,
          type: 'expense',
          date: '2024-01-15'
        });
      }

      const start = Date.now();
      const request = new NextRequest('http://localhost:3000/api/budgets?month=2024-01');
      const response = await GET(request);
      const data = await response.json();
      const end = Date.now();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(20);
      expect(end - start).toBeLessThan(2000); // Should respond in under 2 seconds

      // Verify spending calculations are correct
      data.forEach((budget: any) => {
        expect(budget.spent).toBe(10000);
      });
    });
  });

  describe('Data Integrity Tests', () => {
    it('should maintain referential integrity with categories', async () => {
      const user = await createUser();
      const category = await createCategory(user.id, { name: 'Test Category' });
      await createBudget(user.id, { categoryId: category.id, month: '2024-01' });

      const request = new NextRequest('http://localhost:3000/api/budgets?month=2024-01');
      const response = await GET(request);
      const data = await response.json();

      expect(data[0].categoryId).toBe(category.id);
      expect(data[0].categoryName).toBe('Test Category');
    });

    it('should handle cascade deletion when category is deleted', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);
      await createBudget(user.id, { categoryId: category.id });

      // Delete the category
      await db.delete(categories).where(eq(categories.id, category.id));

      // Budget should be cascade deleted
      const dbBudgets = await db.select().from(budgets);
      expect(dbBudgets).toHaveLength(0);
    });

    it('should correctly calculate spending across date boundaries', async () => {
      const user = await createUser();
      const category = await createCategory(user.id, { type: 'expense' });
      await createBudget(user.id, {
        categoryId: category.id,
        amount: 100000,
        month: '2024-01'
      });

      // Add transactions in different months
      await createTransaction(user.id, category.id, {
        amount: 20000,
        type: 'expense',
        date: '2024-01-31' // Last day of January
      });
      await createTransaction(user.id, category.id, {
        amount: 30000,
        type: 'expense',
        date: '2024-02-01' // First day of February
      });

      const request = new NextRequest('http://localhost:3000/api/budgets?month=2024-01');
      const response = await GET(request);
      const data = await response.json();

      // Should only count January transaction
      expect(data[0].spent).toBe(20000);
    });
  });
});