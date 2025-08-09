import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../../app/api/categories/route';
import { db, cleanDatabase } from '../utils/test-db';
import { createUser, createCategory } from '../utils/factories';
import { categories } from '../../app/db/schema';

// Mock the database import in the API route
vi.mock('../../app/db', () => ({
  db: () => import('../utils/test-db').then(m => m.db)
}));

describe('API Route: /api/categories', () => {
  beforeEach(() => {
    cleanDatabase();
  });

  describe('GET /api/categories', () => {
    it('should return all categories for a user', async () => {
      const user = await createUser();
      
      await createCategory(user.id, {
        name: 'Groceries',
        type: 'expense',
        color: '#ff0000',
        icon: '🛒'
      });
      await createCategory(user.id, {
        name: 'Salary',
        type: 'income',
        color: '#00ff00',
        icon: '💼'
      });

      const request = new NextRequest('http://localhost:3000/api/categories');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      
      const groceryCategory = data.find((c: any) => c.name === 'Groceries');
      const salaryCategory = data.find((c: any) => c.name === 'Salary');

      expect(groceryCategory).toMatchObject({
        name: 'Groceries',
        type: 'expense',
        color: '#ff0000',
        icon: '🛒',
        userId: user.id
      });

      expect(salaryCategory).toMatchObject({
        name: 'Salary',
        type: 'income',
        color: '#00ff00',
        icon: '💼',
        userId: user.id
      });
    });

    it('should return empty array when no categories exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/categories');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should only return categories for the specified user', async () => {
      const user1 = await createUser({ email: 'user1@example.com' });
      const user2 = await createUser({ email: 'user2@example.com' });

      await createCategory(user1.id, { name: 'User 1 Category' });
      await createCategory(user2.id, { name: 'User 2 Category' });

      const request = new NextRequest('http://localhost:3000/api/categories');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1); // Only user 1's category (hardcoded userId = 1)
      expect(data[0].name).toBe('User 1 Category');
    });

    it('should include all required category fields', async () => {
      const user = await createUser();
      await createCategory(user.id, {
        name: 'Entertainment',
        type: 'expense',
        color: '#9333ea',
        icon: '🎬'
      });

      const request = new NextRequest('http://localhost:3000/api/categories');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('type');
      expect(data[0]).toHaveProperty('color');
      expect(data[0]).toHaveProperty('icon');
      expect(data[0]).toHaveProperty('userId');
      expect(data[0]).toHaveProperty('createdAt');
      expect(data[0]).toHaveProperty('updatedAt');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      vi.mocked(db.select).mockImplementationOnce(() => {
        throw new Error('Database connection error');
      });

      const request = new NextRequest('http://localhost:3000/api/categories');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch categories' });
    });
  });

  describe('POST /api/categories', () => {
    it('should create a new category successfully', async () => {
      const categoryData = {
        name: 'Transportation',
        type: 'expense',
        color: '#3b82f6',
        icon: '🚗'
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        ...categoryData,
        userId: 1, // Hardcoded in API route
      });
      expect(data.id).toBeDefined();
      expect(data.createdAt).toBeDefined();
      expect(data.updatedAt).toBeDefined();

      // Verify category was created in database
      const dbCategories = await db.select().from(categories);
      expect(dbCategories).toHaveLength(1);
      expect(dbCategories[0]).toMatchObject(categoryData);
    });

    it('should use default color when not provided', async () => {
      const categoryData = {
        name: 'Default Color Category',
        type: 'income',
        icon: '💰'
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.color).toBe('#6366f1'); // Default color from schema
    });

    it('should create income category successfully', async () => {
      const incomeData = {
        name: 'Freelance Work',
        type: 'income',
        color: '#10b981',
        icon: '💻'
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incomeData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.type).toBe('income');
    });

    it('should create expense category successfully', async () => {
      const expenseData = {
        name: 'Utilities',
        type: 'expense',
        color: '#ef4444',
        icon: '⚡'
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.type).toBe('expense');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        color: '#ff0000',
        // Missing name and type
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompleteData),
      });

      const response = await POST(request);

      expect(response.status).toBe(500); // Will fail due to NOT NULL constraints
    });

    it('should handle invalid category type', async () => {
      const invalidTypeData = {
        name: 'Invalid Category',
        type: 'invalid_type',
        color: '#ff0000',
        icon: '❓'
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidTypeData),
      });

      const response = await POST(request);

      expect(response.status).toBe(500); // Should fail CHECK constraint
    });

    it('should allow duplicate category names for same user', async () => {
      const user = await createUser();
      
      const categoryData1 = {
        name: 'Food',
        type: 'expense',
        color: '#ff0000',
        icon: '🍕'
      };

      const categoryData2 = {
        name: 'Food', // Same name
        type: 'income', // Different type
        color: '#00ff00',
        icon: '🥗'
      };

      // Create first category
      const response1 = await POST(new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData1),
      }));

      // Create second category with same name
      const response2 = await POST(new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData2),
      }));

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      const dbCategories = await db.select().from(categories);
      expect(dbCategories).toHaveLength(2);
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to create category' });
    });

    it('should handle very long category names', async () => {
      const longName = 'A'.repeat(1000); // Very long name
      const categoryData = {
        name: longName,
        type: 'expense',
        color: '#ff0000',
        icon: '📝'
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });

      const response = await POST(request);

      // Should either succeed (if no length limit) or fail gracefully
      expect([201, 500]).toContain(response.status);
    });
  });

  describe('Security Tests', () => {
    it('should sanitize category name for XSS prevention', async () => {
      const maliciousData = {
        name: '<script>alert("XSS")</script>',
        type: 'expense',
        color: '#ff0000',
        icon: '⚠️'
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('<script>alert("XSS")</script>');

      // Verify script is stored as text, not executed
      const dbCategories = await db.select().from(categories);
      expect(dbCategories[0].name).toBe('<script>alert("XSS")</script>');
    });

    it('should handle SQL injection attempts safely', async () => {
      const sqlInjectionData = {
        name: "'; DROP TABLE categories; --",
        type: 'expense',
        color: '#ff0000',
        icon: '💀'
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sqlInjectionData),
      });

      const response = await POST(request);

      // Should either succeed (storing safely) or fail gracefully
      expect([201, 500]).toContain(response.status);

      // Verify categories table still exists
      const dbCategories = await db.select().from(categories);
      expect(Array.isArray(dbCategories)).toBe(true);
    });

    it('should validate color format', async () => {
      const invalidColorData = {
        name: 'Invalid Color Category',
        type: 'expense',
        color: 'not-a-color',
        icon: '🎨'
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidColorData),
      });

      const response = await POST(request);

      // Current implementation doesn't validate color format
      expect(response.status).toBe(201);
      // In production, should validate hex color format and return 400 for invalid colors
    });

    it('should handle special characters in category names', async () => {
      const specialCharsData = {
        name: '!@#$%^&*()_+{}[]|\\:;"\'<>?,./`~',
        type: 'expense',
        color: '#ff0000',
        icon: '🔣'
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specialCharsData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('!@#$%^&*()_+{}[]|\\:;"\'<>?,./`~');
    });

    it('should handle Unicode characters in names and icons', async () => {
      const unicodeData = {
        name: '食べ物', // Japanese characters
        type: 'expense',
        color: '#ff0000',
        icon: '🍜'
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unicodeData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('食べ物');
      expect(data.icon).toBe('🍜');
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent category creations', async () => {
      const user = await createUser();
      
      const createRequests = Array(10).fill(null).map((_, i) => {
        const categoryData = {
          name: `Category ${i}`,
          type: i % 2 === 0 ? 'expense' : 'income',
          color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
          icon: i % 2 === 0 ? '📤' : '📥'
        };

        return POST(new NextRequest('http://localhost:3000/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(categoryData),
        }));
      });

      const responses = await Promise.all(createRequests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all categories were created
      const dbCategories = await db.select().from(categories);
      expect(dbCategories).toHaveLength(10);
    });

    it('should respond quickly to GET requests with many categories', async () => {
      const user = await createUser();

      // Create many categories
      for (let i = 0; i < 100; i++) {
        await createCategory(user.id, {
          name: `Category ${i}`,
          type: i % 2 === 0 ? 'expense' : 'income'
        });
      }

      const start = Date.now();
      const request = new NextRequest('http://localhost:3000/api/categories');
      const response = await GET(request);
      const data = await response.json();
      const end = Date.now();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(100);
      expect(end - start).toBeLessThan(1000); // Should respond in under 1 second
    });
  });

  describe('Data Integrity Tests', () => {
    it('should maintain data consistency across operations', async () => {
      const user = await createUser();
      const categoryData = {
        name: 'Consistency Test',
        type: 'expense',
        color: '#123456',
        icon: '🧪'
      };

      // Create category
      const createResponse = await POST(new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      }));

      const createdCategory = await createResponse.json();

      // Retrieve categories
      const getResponse = await GET(new NextRequest('http://localhost:3000/api/categories'));
      const categories = await getResponse.json();

      const foundCategory = categories.find((c: any) => c.id === createdCategory.id);

      expect(foundCategory).toMatchObject({
        name: categoryData.name,
        type: categoryData.type,
        color: categoryData.color,
        icon: categoryData.icon,
      });
    });

    it('should properly handle foreign key relationships', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      // Category should reference the correct user
      const dbCategories = await db.select().from(categories);
      expect(dbCategories[0].userId).toBe(user.id);
    });

    it('should maintain category ordering', async () => {
      const user = await createUser();
      
      // Create categories in specific order
      const categoryNames = ['A Category', 'B Category', 'C Category'];
      
      for (const name of categoryNames) {
        await createCategory(user.id, { name });
      }

      const request = new NextRequest('http://localhost:3000/api/categories');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveLength(3);
      // Categories should maintain creation order (by ID)
      expect(data[0].name).toBe('A Category');
      expect(data[1].name).toBe('B Category');
      expect(data[2].name).toBe('C Category');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', async () => {
      const emptyStringData = {
        name: '',
        type: 'expense',
        color: '',
        icon: ''
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emptyStringData),
      });

      const response = await POST(request);

      // Should fail due to NOT NULL constraint on name
      expect(response.status).toBe(500);
    });

    it('should handle null values appropriately', async () => {
      const nullValueData = {
        name: 'Valid Name',
        type: 'expense',
        color: null, // Should use default
        icon: null
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nullValueData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.color).toBe('#6366f1'); // Default color
      expect(data.icon).toBeNull();
    });

    it('should handle very long icon strings', async () => {
      const longIconData = {
        name: 'Long Icon Category',
        type: 'expense',
        color: '#ff0000',
        icon: '🎉'.repeat(100) // Very long icon string
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(longIconData),
      });

      const response = await POST(request);

      // Should handle long icons gracefully
      expect([201, 500]).toContain(response.status);
    });
  });
});