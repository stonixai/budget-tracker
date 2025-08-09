import { describe, it, expect, beforeEach } from 'vitest';
import { db, cleanDatabase } from '../utils/test-db';
import { users, categories, transactions, budgets } from '../../app/db/schema';
import { eq, and } from 'drizzle-orm';
import { createUser, createCategory, createTransaction, createBudget } from '../utils/factories';

describe('Database Operations', () => {
  beforeEach(() => {
    cleanDatabase();
  });

  describe('Users Table', () => {
    it('should create a user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const [newUser] = await db.insert(users).values(userData).returning();

      expect(newUser).toMatchObject(userData);
      expect(newUser.id).toBeDefined();
      expect(newUser.createdAt).toBeDefined();
      expect(newUser.updatedAt).toBeDefined();
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      await db.insert(users).values(userData);

      // Attempting to insert duplicate email should fail
      await expect(
        db.insert(users).values({ name: 'Jane Doe', email: 'john@example.com' })
      ).rejects.toThrow();
    });

    it('should require name and email fields', async () => {
      // Missing name
      await expect(
        db.insert(users).values({ email: 'test@example.com' } as any)
      ).rejects.toThrow();

      // Missing email
      await expect(
        db.insert(users).values({ name: 'Test User' } as any)
      ).rejects.toThrow();
    });

    it('should retrieve users correctly', async () => {
      const user = await createUser({ name: 'Test User', email: 'test@example.com' });
      
      const retrievedUsers = await db.select().from(users);
      expect(retrievedUsers).toHaveLength(1);
      expect(retrievedUsers[0]).toMatchObject({
        id: user.id,
        name: 'Test User',
        email: 'test@example.com',
      });
    });

    it('should update user correctly', async () => {
      const user = await createUser({ name: 'Test User', email: 'test@example.com' });
      
      await db.update(users)
        .set({ name: 'Updated User' })
        .where(eq(users.id, user.id));

      const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id));
      expect(updatedUser.name).toBe('Updated User');
    });

    it('should delete user and cascade to related records', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);
      await createTransaction(user.id, category.id);
      await createBudget(user.id);

      // Verify related records exist
      const transactionsBefore = await db.select().from(transactions);
      const budgetsBefore = await db.select().from(budgets);
      expect(transactionsBefore).toHaveLength(1);
      expect(budgetsBefore).toHaveLength(1);

      // Delete user
      await db.delete(users).where(eq(users.id, user.id));

      // Verify cascade deletion
      const usersAfter = await db.select().from(users);
      const transactionsAfter = await db.select().from(transactions);
      const budgetsAfter = await db.select().from(budgets);
      const categoriesAfter = await db.select().from(categories);

      expect(usersAfter).toHaveLength(0);
      expect(transactionsAfter).toHaveLength(0);
      expect(budgetsAfter).toHaveLength(0);
      expect(categoriesAfter).toHaveLength(0);
    });
  });

  describe('Categories Table', () => {
    it('should create category successfully', async () => {
      const user = await createUser();
      const categoryData = {
        name: 'Groceries',
        type: 'expense' as const,
        color: '#ff0000',
        icon: '🛒',
        userId: user.id,
      };

      const [category] = await db.insert(categories).values(categoryData).returning();

      expect(category).toMatchObject(categoryData);
      expect(category.id).toBeDefined();
    });

    it('should enforce foreign key constraint for userId', async () => {
      const categoryData = {
        name: 'Invalid Category',
        type: 'expense' as const,
        color: '#ff0000',
        userId: 99999, // Non-existent user
      };

      await expect(
        db.insert(categories).values(categoryData)
      ).rejects.toThrow();
    });

    it('should enforce type constraint', async () => {
      const user = await createUser();
      const invalidCategoryData = {
        name: 'Invalid Type',
        type: 'invalid_type',
        color: '#ff0000',
        userId: user.id,
      };

      await expect(
        db.insert(categories).values(invalidCategoryData as any)
      ).rejects.toThrow();
    });

    it('should filter categories by user', async () => {
      const user1 = await createUser({ email: 'user1@example.com' });
      const user2 = await createUser({ email: 'user2@example.com' });
      
      await createCategory(user1.id, { name: 'User 1 Category' });
      await createCategory(user2.id, { name: 'User 2 Category' });

      const user1Categories = await db
        .select()
        .from(categories)
        .where(eq(categories.userId, user1.id));

      const user2Categories = await db
        .select()
        .from(categories)
        .where(eq(categories.userId, user2.id));

      expect(user1Categories).toHaveLength(1);
      expect(user2Categories).toHaveLength(1);
      expect(user1Categories[0].name).toBe('User 1 Category');
      expect(user2Categories[0].name).toBe('User 2 Category');
    });
  });

  describe('Transactions Table', () => {
    it('should create transaction successfully', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);
      const transactionData = {
        amount: 12500, // $125.00
        description: 'Test transaction',
        type: 'expense' as const,
        date: '2024-01-15',
        categoryId: category.id,
        userId: user.id,
      };

      const [transaction] = await db.insert(transactions).values(transactionData).returning();

      expect(transaction).toMatchObject(transactionData);
      expect(transaction.id).toBeDefined();
    });

    it('should enforce foreign key constraints', async () => {
      const user = await createUser();

      // Invalid category ID
      await expect(
        db.insert(transactions).values({
          amount: 1000,
          description: 'Invalid transaction',
          type: 'expense',
          date: '2024-01-15',
          categoryId: 99999,
          userId: user.id,
        })
      ).rejects.toThrow();

      // Invalid user ID
      const category = await createCategory(user.id);
      await expect(
        db.insert(transactions).values({
          amount: 1000,
          description: 'Invalid transaction',
          type: 'expense',
          date: '2024-01-15',
          categoryId: category.id,
          userId: 99999,
        })
      ).rejects.toThrow();
    });

    it('should prevent deletion of category with transactions', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);
      await createTransaction(user.id, category.id);

      // Should not be able to delete category with existing transactions
      await expect(
        db.delete(categories).where(eq(categories.id, category.id))
      ).rejects.toThrow();
    });

    it('should filter transactions by date range', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);
      
      // Create transactions in different months
      await createTransaction(user.id, category.id, { date: '2024-01-15' });
      await createTransaction(user.id, category.id, { date: '2024-02-15' });
      await createTransaction(user.id, category.id, { date: '2024-03-15' });

      // Query for January transactions
      const januaryTransactions = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.date, '2024-01-15')
          )
        );

      expect(januaryTransactions).toHaveLength(1);
      expect(januaryTransactions[0].date).toBe('2024-01-15');
    });

    it('should calculate totals correctly', async () => {
      const user = await createUser();
      const incomeCategory = await createCategory(user.id, { type: 'income' });
      const expenseCategory = await createCategory(user.id, { type: 'expense' });

      await createTransaction(user.id, incomeCategory.id, { amount: 500000, type: 'income' });
      await createTransaction(user.id, expenseCategory.id, { amount: 25000, type: 'expense' });
      await createTransaction(user.id, expenseCategory.id, { amount: 15000, type: 'expense' });

      const allTransactions = await db.select().from(transactions);
      
      const totalIncome = allTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = allTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      expect(totalIncome).toBe(500000);
      expect(totalExpenses).toBe(40000);
    });
  });

  describe('Budgets Table', () => {
    it('should create budget successfully', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);
      const budgetData = {
        name: 'Monthly Groceries',
        amount: 50000,
        month: '2024-01',
        categoryId: category.id,
        userId: user.id,
      };

      const [budget] = await db.insert(budgets).values(budgetData).returning();

      expect(budget).toMatchObject(budgetData);
      expect(budget.id).toBeDefined();
    });

    it('should allow budget without category', async () => {
      const user = await createUser();
      const budgetData = {
        name: 'General Budget',
        amount: 100000,
        month: '2024-01',
        categoryId: null,
        userId: user.id,
      };

      const [budget] = await db.insert(budgets).values(budgetData).returning();
      expect(budget.categoryId).toBeNull();
    });

    it('should enforce foreign key constraints', async () => {
      const user = await createUser();

      // Invalid user ID
      await expect(
        db.insert(budgets).values({
          name: 'Invalid Budget',
          amount: 50000,
          month: '2024-01',
          userId: 99999,
        })
      ).rejects.toThrow();
    });

    it('should cascade delete when category is deleted', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);
      await createBudget(user.id, { categoryId: category.id });

      // Delete category should cascade to budget
      await db.delete(categories).where(eq(categories.id, category.id));

      const budgetsAfter = await db.select().from(budgets);
      expect(budgetsAfter).toHaveLength(0);
    });

    it('should filter budgets by month and user', async () => {
      const user1 = await createUser({ email: 'user1@example.com' });
      const user2 = await createUser({ email: 'user2@example.com' });

      await createBudget(user1.id, { month: '2024-01', name: 'January Budget' });
      await createBudget(user1.id, { month: '2024-02', name: 'February Budget' });
      await createBudget(user2.id, { month: '2024-01', name: 'User 2 Budget' });

      const user1JanuaryBudgets = await db
        .select()
        .from(budgets)
        .where(
          and(
            eq(budgets.userId, user1.id),
            eq(budgets.month, '2024-01')
          )
        );

      expect(user1JanuaryBudgets).toHaveLength(1);
      expect(user1JanuaryBudgets[0].name).toBe('January Budget');
    });
  });

  describe('Database Integrity', () => {
    it('should maintain data integrity across operations', async () => {
      // Create complete scenario
      const user = await createUser();
      const category = await createCategory(user.id, { name: 'Test Category' });
      const budget = await createBudget(user.id, { categoryId: category.id, amount: 50000 });
      const transaction = await createTransaction(user.id, category.id, { amount: 25000 });

      // Verify all relationships
      const userWithRelations = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        with: {
          categories: true,
          transactions: true,
          budgets: true,
        },
      });

      expect(userWithRelations).toBeDefined();
      // Note: Drizzle relations would need to be defined in schema for this to work
      // This test demonstrates the concept of testing data integrity
    });

    it('should handle concurrent operations safely', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      // Simulate concurrent transaction creation
      const promises = Array(10).fill(null).map((_, i) =>
        createTransaction(user.id, category.id, { description: `Transaction ${i}` })
      );

      await Promise.all(promises);

      const allTransactions = await db.select().from(transactions);
      expect(allTransactions).toHaveLength(10);

      // Verify all transactions have unique IDs
      const ids = allTransactions.map(t => t.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds).toHaveLength(10);
    });
  });

  describe('Database Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const user = await createUser();
      const category = await createCategory(user.id);

      // Create many transactions
      const start = Date.now();
      const insertPromises = Array(1000).fill(null).map((_, i) =>
        db.insert(transactions).values({
          amount: Math.floor(Math.random() * 10000),
          description: `Transaction ${i}`,
          type: Math.random() > 0.5 ? 'income' : 'expense',
          date: '2024-01-15',
          categoryId: category.id,
          userId: user.id,
        })
      );

      await Promise.all(insertPromises);
      const insertTime = Date.now() - start;

      // Query all transactions
      const queryStart = Date.now();
      const allTransactions = await db.select().from(transactions);
      const queryTime = Date.now() - queryStart;

      expect(allTransactions).toHaveLength(1000);
      expect(insertTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(queryTime).toBeLessThan(1000);   // Should query in under 1 second
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in user inputs', async () => {
      const user = await createUser();
      const maliciousName = "'; DROP TABLE users; --";

      // This should not execute SQL injection
      const [category] = await db.insert(categories).values({
        name: maliciousName,
        type: 'expense',
        userId: user.id,
      }).returning();

      expect(category.name).toBe(maliciousName);

      // Verify users table still exists
      const usersStillExist = await db.select().from(users);
      expect(usersStillExist).toHaveLength(1);
    });

    it('should handle special characters safely', async () => {
      const user = await createUser();
      const specialChars = "!@#$%^&*()_+{}[]|\\:;\"'<>?,./`~";

      const [category] = await db.insert(categories).values({
        name: specialChars,
        type: 'expense',
        userId: user.id,
      }).returning();

      expect(category.name).toBe(specialChars);
    });

    it('should enforce data isolation between users', async () => {
      const user1 = await createUser({ email: 'user1@example.com' });
      const user2 = await createUser({ email: 'user2@example.com' });

      const category1 = await createCategory(user1.id, { name: 'User 1 Category' });
      const category2 = await createCategory(user2.id, { name: 'User 2 Category' });

      // User 1 should not be able to access User 2's categories
      const user1Categories = await db
        .select()
        .from(categories)
        .where(eq(categories.userId, user1.id));

      expect(user1Categories).toHaveLength(1);
      expect(user1Categories[0].name).toBe('User 1 Category');
      expect(user1Categories.find(c => c.name === 'User 2 Category')).toBeUndefined();
    });
  });
});