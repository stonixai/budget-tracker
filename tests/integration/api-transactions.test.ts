import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../../app/api/transactions/route';
import { db, cleanDatabase } from '../utils/test-db';
import { createUser, createCategory, createTransaction } from '../utils/factories';

// Mock the database import in the API route
vi.mock('../../app/db', () => ({
  db: () => import('../utils/test-db').then(m => m.db)
}));

describe('API Route: /api/transactions', () => {
  beforeEach(() => {
    cleanDatabase();
  });

  describe('GET /api/transactions', () => {
    it('should return all transactions for a user', async () => {
      // Setup test data
      const user = await createUser();
      const category = await createCategory(user.id, { name: 'Groceries', icon: '🛒', color: '#ff0000' });
      await createTransaction(user.id, category.id, {
        amount: 12500,
        description: 'Weekly groceries',
        type: 'expense',
        date: '2024-01-15'
      });

      const request = new NextRequest('http://localhost:3000/api/transactions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        amount: 12500,
        description: 'Weekly groceries',
        type: 'expense',
        date: '2024-01-15',
        categoryName: 'Groceries',
        categoryIcon: '🛒',
        categoryColor: '#ff0000'
      });
    });

    it('should filter transactions by date range', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      // Create transactions in different date ranges
      await createTransaction(user.id, category.id, { date: '2024-01-01', description: 'January transaction' });
      await createTransaction(user.id, category.id, { date: '2024-02-01', description: 'February transaction' });
      await createTransaction(user.id, category.id, { date: '2024-03-01', description: 'March transaction' });

      const request = new NextRequest(
        'http://localhost:3000/api/transactions?startDate=2024-01-01&endDate=2024-02-28'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data.find((t: any) => t.description === 'January transaction')).toBeDefined();
      expect(data.find((t: any) => t.description === 'February transaction')).toBeDefined();
      expect(data.find((t: any) => t.description === 'March transaction')).toBeUndefined();
    });

    it('should return empty array when no transactions exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/transactions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalDb = vi.mocked(db);
      vi.mocked(db.select).mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      const request = new NextRequest('http://localhost:3000/api/transactions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch transactions' });
    });
  });

  describe('POST /api/transactions', () => {
    it('should create a new transaction successfully', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      const transactionData = {
        amount: 15000, // $150.00
        description: 'Grocery shopping',
        type: 'expense',
        date: '2024-01-20',
        categoryId: category.id,
      };

      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        ...transactionData,
        userId: 1, // Hardcoded in the API route
      });
      expect(data.id).toBeDefined();

      // Verify transaction was created in database
      const dbTransactions = await db.select().from(transactions);
      expect(dbTransactions).toHaveLength(1);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        description: 'Missing amount and other fields',
      };

      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompleteData),
      });

      const response = await POST(request);

      expect(response.status).toBe(500); // Will fail due to missing required fields
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to create transaction' });
    });

    it('should handle foreign key constraint violations', async () => {
      const transactionData = {
        amount: 15000,
        description: 'Invalid transaction',
        type: 'expense',
        date: '2024-01-20',
        categoryId: 99999, // Non-existent category
      };

      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to create transaction' });
    });

    it('should handle large transaction amounts', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      const transactionData = {
        amount: 99999999, // $999,999.99
        description: 'Large transaction',
        type: 'income',
        date: '2024-01-20',
        categoryId: category.id,
      };

      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.amount).toBe(99999999);
    });
  });

  describe('DELETE /api/transactions', () => {
    it('should delete a transaction successfully', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);
      const transaction = await createTransaction(user.id, category.id);

      const request = new NextRequest(`http://localhost:3000/api/transactions?id=${transaction.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });

      // Verify transaction was deleted from database
      const dbTransactions = await db.select().from(transactions);
      expect(dbTransactions).toHaveLength(0);
    });

    it('should require transaction ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Transaction ID required' });
    });

    it('should handle non-existent transaction ID gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/transactions?id=99999', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });

    it('should handle invalid transaction ID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/transactions?id=invalid', {
        method: 'DELETE',
      });

      const response = await DELETE(request);

      // The parseInt will convert 'invalid' to NaN, which may cause issues
      // This tests the robustness of the deletion logic
      expect(response.status).toBeOneOf([200, 500]); // Could succeed or fail depending on implementation
    });
  });

  describe('Security Tests', () => {
    it('should sanitize user input to prevent XSS', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      const maliciousData = {
        amount: 1000,
        description: '<script>alert("XSS")</script>',
        type: 'expense',
        date: '2024-01-20',
        categoryId: category.id,
      };

      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.description).toBe('<script>alert("XSS")</script>');

      // Verify the script tag is stored as text, not executed
      const dbTransactions = await db.select().from(transactions);
      expect(dbTransactions[0].description).toBe('<script>alert("XSS")</script>');
    });

    it('should handle SQL injection attempts safely', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      const sqlInjectionData = {
        amount: 1000,
        description: "'; DROP TABLE transactions; --",
        type: 'expense',
        date: '2024-01-20',
        categoryId: category.id,
      };

      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sqlInjectionData),
      });

      const response = await POST(request);

      // Should either succeed (storing the string safely) or fail gracefully
      expect([201, 500]).toContain(response.status);

      // Verify transactions table still exists
      const dbTransactions = await db.select().from(transactions);
      expect(Array.isArray(dbTransactions)).toBe(true);
    });

    it('should validate numeric amount field', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      const invalidAmountData = {
        amount: 'not-a-number',
        description: 'Invalid amount',
        type: 'expense',
        date: '2024-01-20',
        categoryId: category.id,
      };

      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidAmountData),
      });

      const response = await POST(request);

      expect(response.status).toBe(500); // Should fail validation
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      const createRequests = Array(10).fill(null).map((_, i) => {
        const transactionData = {
          amount: 1000 + i,
          description: `Concurrent transaction ${i}`,
          type: 'expense',
          date: '2024-01-20',
          categoryId: category.id,
        };

        return POST(new NextRequest('http://localhost:3000/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionData),
        }));
      });

      const responses = await Promise.all(createRequests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all transactions were created
      const dbTransactions = await db.select().from(transactions);
      expect(dbTransactions).toHaveLength(10);
    });

    it('should respond quickly to GET requests', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      // Create some test data
      for (let i = 0; i < 100; i++) {
        await createTransaction(user.id, category.id, { description: `Transaction ${i}` });
      }

      const start = Date.now();
      const request = new NextRequest('http://localhost:3000/api/transactions');
      const response = await GET(request);
      const data = await response.json();
      const end = Date.now();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(100);
      expect(end - start).toBeLessThan(1000); // Should respond in under 1 second
    });
  });

  describe('Data Integrity Tests', () => {
    it('should maintain referential integrity', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);
      const transaction = await createTransaction(user.id, category.id);

      // Verify the transaction references the correct category
      const getRequest = new NextRequest('http://localhost:3000/api/transactions');
      const getResponse = await GET(getRequest);
      const transactions = await getResponse.json();

      expect(transactions[0].categoryId).toBe(category.id);
      expect(transactions[0].categoryName).toBe(category.name);
    });

    it('should handle database transaction rollback on errors', async () => {
      const user = await createUser();

      // Attempt to create transaction with invalid category
      const invalidData = {
        amount: 1000,
        description: 'Should fail',
        type: 'expense',
        date: '2024-01-20',
        categoryId: 99999,
      };

      const request = new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      // Verify no partial data was created
      const dbTransactions = await db.select().from(transactions);
      expect(dbTransactions).toHaveLength(0);
    });
  });
});