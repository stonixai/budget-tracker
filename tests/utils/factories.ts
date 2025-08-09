import { faker } from '@faker-js/faker';
import { db } from './test-db';
import { users, categories, transactions, budgets } from '../../app/db/schema';
import type { NewUser, NewCategory, NewTransaction, NewBudget, User, Category } from '../../app/db/schema';

// User factory
export function createUserData(overrides: Partial<NewUser> = {}): NewUser {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    ...overrides,
  };
}

export async function createUser(data: Partial<NewUser> = {}): Promise<User> {
  const userData = createUserData(data);
  const [user] = await db.insert(users).values(userData).returning();
  return user;
}

// Category factory
export function createCategoryData(overrides: Partial<NewCategory> = {}): Omit<NewCategory, 'userId'> {
  const type = overrides.type || faker.helpers.arrayElement(['income', 'expense'] as const);
  return {
    name: faker.commerce.department(),
    type,
    color: faker.internet.color(),
    icon: faker.helpers.arrayElement(['🏠', '🍔', '⛽', '🎬', '💊', '🛒', '💼', '🎓']),
    ...overrides,
  };
}

export async function createCategory(userId: number, data: Partial<Omit<NewCategory, 'userId'>> = {}): Promise<Category> {
  const categoryData = { ...createCategoryData(data), userId };
  const [category] = await db.insert(categories).values(categoryData).returning();
  return category;
}

// Transaction factory
export function createTransactionData(overrides: Partial<NewTransaction> = {}): Omit<NewTransaction, 'userId' | 'categoryId'> {
  const type = overrides.type || faker.helpers.arrayElement(['income', 'expense'] as const);
  return {
    amount: faker.number.int({ min: 100, max: 50000 }), // Amount in cents
    description: faker.commerce.productName(),
    type,
    date: faker.date.recent({ days: 30 }).toISOString().split('T')[0],
    ...overrides,
  };
}

export async function createTransaction(
  userId: number,
  categoryId: number,
  data: Partial<Omit<NewTransaction, 'userId' | 'categoryId'>> = {}
) {
  const transactionData = { ...createTransactionData(data), userId, categoryId };
  const [transaction] = await db.insert(transactions).values(transactionData).returning();
  return transaction;
}

// Budget factory
export function createBudgetData(overrides: Partial<NewBudget> = {}): Omit<NewBudget, 'userId'> {
  return {
    name: faker.commerce.department() + ' Budget',
    amount: faker.number.int({ min: 10000, max: 100000 }), // Amount in cents
    month: faker.date.recent().toISOString().slice(0, 7), // YYYY-MM format
    categoryId: null, // Optional category
    ...overrides,
  };
}

export async function createBudget(userId: number, data: Partial<Omit<NewBudget, 'userId'>> = {}) {
  const budgetData = { ...createBudgetData(data), userId };
  const [budget] = await db.insert(budgets).values(budgetData).returning();
  return budget;
}

// Utility to create a complete test scenario
export async function createTestScenario() {
  const user = await createUser();
  
  // Create categories
  const expenseCategory = await createCategory(user.id, { type: 'expense', name: 'Groceries', icon: '🛒' });
  const incomeCategory = await createCategory(user.id, { type: 'income', name: 'Salary', icon: '💼' });
  
  // Create budget for the expense category
  const currentMonth = new Date().toISOString().slice(0, 7);
  const budget = await createBudget(user.id, {
    categoryId: expenseCategory.id,
    month: currentMonth,
    amount: 50000, // $500.00
    name: 'Monthly Groceries'
  });
  
  // Create some transactions
  const expense1 = await createTransaction(user.id, expenseCategory.id, {
    type: 'expense',
    amount: 12500, // $125.00
    description: 'Weekly groceries',
    date: new Date().toISOString().split('T')[0]
  });
  
  const expense2 = await createTransaction(user.id, expenseCategory.id, {
    type: 'expense',
    amount: 7500, // $75.00
    description: 'Grocery shopping',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0] // Yesterday
  });
  
  const income = await createTransaction(user.id, incomeCategory.id, {
    type: 'income',
    amount: 500000, // $5000.00
    description: 'Monthly salary',
    date: new Date().toISOString().split('T')[0]
  });
  
  return {
    user,
    categories: { expense: expenseCategory, income: incomeCategory },
    budget,
    transactions: { expense1, expense2, income }
  };
}

// Financial calculation test data
export const financialTestCases = {
  currency: [
    { cents: 0, expected: '$0.00' },
    { cents: 1, expected: '$0.01' },
    { cents: 100, expected: '$1.00' },
    { cents: 12345, expected: '$123.45' },
    { cents: 999999, expected: '$9,999.99' },
    { cents: -5000, expected: '-$50.00' },
  ],
  percentages: [
    { spent: 0, budget: 100, expected: 0 },
    { spent: 50, budget: 100, expected: 50 },
    { spent: 100, budget: 100, expected: 100 },
    { spent: 150, budget: 100, expected: 100 }, // Should cap at 100%
  ],
  dates: [
    { date: '2023-12-01', month: '2023-12', expected: true },
    { date: '2023-11-30', month: '2023-12', expected: false },
    { date: '2024-01-01', month: '2023-12', expected: false },
  ]
};