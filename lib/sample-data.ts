import { faker } from '@faker-js/faker';
import { addDays, addMonths, subDays, subMonths, format } from 'date-fns';
import { eq } from 'drizzle-orm';
import { db } from '@/app/db';
import { categories, transactions, budgets, recurringTransactions, financialGoals, userAccounts } from '@/app/db/schema';
import type { NewCategory, NewTransaction, NewBudget, NewRecurringTransaction, NewFinancialGoal, NewUserAccount } from '@/app/db/schema';

export async function generateSampleData(userId: string) {
  try {
    // Sample Categories
    const sampleCategories: NewCategory[] = [
      // Income categories
      { name: 'Salary', type: 'income', color: '#10b981', icon: '💰', userId },
      { name: 'Freelance', type: 'income', color: '#8b5cf6', icon: '💻', userId },
      { name: 'Investments', type: 'income', color: '#06b6d4', icon: '📈', userId },
      
      // Expense categories
      { name: 'Groceries', type: 'expense', color: '#f59e0b', icon: '🛒', userId },
      { name: 'Transportation', type: 'expense', color: '#ef4444', icon: '🚗', userId },
      { name: 'Utilities', type: 'expense', color: '#6366f1', icon: '⚡', userId },
      { name: 'Entertainment', type: 'expense', color: '#ec4899', icon: '🎬', userId },
      { name: 'Healthcare', type: 'expense', color: '#14b8a6', icon: '🏥', userId },
      { name: 'Dining Out', type: 'expense', color: '#f97316', icon: '🍽️', userId },
      { name: 'Shopping', type: 'expense', color: '#a855f7', icon: '🛍️', userId },
      { name: 'Rent', type: 'expense', color: '#0ea5e9', icon: '🏠', userId },
      { name: 'Subscriptions', type: 'expense', color: '#84cc16', icon: '📱', userId },
    ];

    const insertedCategories = await db.insert(categories).values(sampleCategories).returning();
    
    // Create category map for easy lookup
    const categoryMap = insertedCategories.reduce((acc, cat) => {
      acc[cat.name] = cat;
      return acc;
    }, {} as Record<string, typeof insertedCategories[0]>);

    // Sample User Accounts
    const sampleAccounts: NewUserAccount[] = [
      {
        userId,
        name: 'Main Checking',
        type: 'checking',
        balance: 325000, // $3,250.00
        currency: 'USD',
        accountNumber: '1234',
        institution: 'Chase Bank',
        color: '#6366f1',
        icon: '🏦',
        isPrimary: true,
      },
      {
        userId,
        name: 'Emergency Savings',
        type: 'savings',
        balance: 1500000, // $15,000.00
        currency: 'USD',
        accountNumber: '5678',
        institution: 'Chase Bank',
        color: '#10b981',
        icon: '💰',
      },
      {
        userId,
        name: 'Travel Credit Card',
        type: 'credit',
        balance: -75000, // -$750.00 (credit card debt)
        currency: 'USD',
        accountNumber: '9012',
        institution: 'American Express',
        color: '#ef4444',
        icon: '💳',
      },
    ];

    await db.insert(userAccounts).values(sampleAccounts);

    // Generate sample transactions for the last 6 months
    const sampleTransactions: NewTransaction[] = [];
    const today = new Date();
    
    // Generate regular salary
    for (let i = 0; i < 6; i++) {
      const salaryDate = subMonths(today, i);
      sampleTransactions.push({
        userId,
        amount: 450000, // $4,500.00
        description: 'Monthly Salary',
        type: 'income',
        date: format(salaryDate, 'yyyy-MM-dd'),
        categoryId: categoryMap['Salary'].id,
      });
    }

    // Generate random expenses
    const expenseCategories = insertedCategories.filter(cat => cat.type === 'expense');
    
    for (let i = 0; i < 150; i++) {
      const transactionDate = faker.date.between({ 
        from: subMonths(today, 6), 
        to: today 
      });
      
      const category = faker.helpers.arrayElement(expenseCategories);
      let amount: number;
      let description: string;

      // Generate realistic amounts based on category
      switch (category.name) {
        case 'Rent':
          amount = 180000; // $1,800.00
          description = 'Monthly Rent';
          break;
        case 'Groceries':
          amount = faker.number.int({ min: 2000, max: 12000 }); // $20-120
          description = faker.helpers.arrayElement(['Whole Foods', 'Safeway', 'Trader Joes', 'Local Market']);
          break;
        case 'Transportation':
          amount = faker.number.int({ min: 500, max: 8000 }); // $5-80
          description = faker.helpers.arrayElement(['Gas Station', 'Uber Ride', 'Bus Fare', 'Parking']);
          break;
        case 'Dining Out':
          amount = faker.number.int({ min: 800, max: 6000 }); // $8-60
          description = faker.helpers.arrayElement(['Restaurant Dinner', 'Coffee Shop', 'Fast Food', 'Food Delivery']);
          break;
        case 'Utilities':
          amount = faker.number.int({ min: 8000, max: 15000 }); // $80-150
          description = faker.helpers.arrayElement(['Electric Bill', 'Water Bill', 'Internet', 'Phone Bill']);
          break;
        case 'Entertainment':
          amount = faker.number.int({ min: 1000, max: 5000 }); // $10-50
          description = faker.helpers.arrayElement(['Movie Theater', 'Concert Ticket', 'Streaming Service', 'Gaming']);
          break;
        case 'Healthcare':
          amount = faker.number.int({ min: 2000, max: 20000 }); // $20-200
          description = faker.helpers.arrayElement(['Doctor Visit', 'Pharmacy', 'Dental Cleaning', 'Insurance']);
          break;
        case 'Shopping':
          amount = faker.number.int({ min: 1500, max: 25000 }); // $15-250
          description = faker.helpers.arrayElement(['Amazon Purchase', 'Target', 'Online Shopping', 'Department Store']);
          break;
        case 'Subscriptions':
          amount = faker.number.int({ min: 500, max: 2000 }); // $5-20
          description = faker.helpers.arrayElement(['Netflix', 'Spotify', 'Adobe Creative', 'Cloud Storage']);
          break;
        default:
          amount = faker.number.int({ min: 1000, max: 10000 }); // $10-100
          description = faker.company.name();
      }

      sampleTransactions.push({
        userId,
        amount,
        description,
        type: 'expense',
        date: format(transactionDate, 'yyyy-MM-dd'),
        categoryId: category.id,
      });
    }

    await db.insert(transactions).values(sampleTransactions);

    // Sample Budgets for current month
    const currentMonth = format(today, 'yyyy-MM');
    const sampleBudgets: NewBudget[] = [
      { userId, name: 'Groceries Budget', amount: 40000, categoryId: categoryMap['Groceries'].id, month: currentMonth }, // $400
      { userId, name: 'Transportation Budget', amount: 20000, categoryId: categoryMap['Transportation'].id, month: currentMonth }, // $200
      { userId, name: 'Dining Out Budget', amount: 25000, categoryId: categoryMap['Dining Out'].id, month: currentMonth }, // $250
      { userId, name: 'Entertainment Budget', amount: 15000, categoryId: categoryMap['Entertainment'].id, month: currentMonth }, // $150
      { userId, name: 'Shopping Budget', amount: 30000, categoryId: categoryMap['Shopping'].id, month: currentMonth }, // $300
    ];

    await db.insert(budgets).values(sampleBudgets);

    // Sample Recurring Transactions
    const sampleRecurring: NewRecurringTransaction[] = [
      {
        userId,
        description: 'Monthly Salary',
        amount: 450000, // $4,500
        type: 'income',
        frequency: 'monthly',
        nextDueDate: format(addMonths(today, 1), 'yyyy-MM-dd'),
        categoryId: categoryMap['Salary'].id,
      },
      {
        userId,
        description: 'Rent Payment',
        amount: 180000, // $1,800
        type: 'expense',
        frequency: 'monthly',
        nextDueDate: format(addDays(today, 5), 'yyyy-MM-dd'),
        categoryId: categoryMap['Rent'].id,
      },
      {
        userId,
        description: 'Netflix Subscription',
        amount: 1599, // $15.99
        type: 'expense',
        frequency: 'monthly',
        nextDueDate: format(addDays(today, 12), 'yyyy-MM-dd'),
        categoryId: categoryMap['Subscriptions'].id,
      },
      {
        userId,
        description: 'Spotify Premium',
        amount: 999, // $9.99
        type: 'expense',
        frequency: 'monthly',
        nextDueDate: format(addDays(today, 8), 'yyyy-MM-dd'),
        categoryId: categoryMap['Subscriptions'].id,
      },
      {
        userId,
        description: 'Weekly Groceries',
        amount: 12000, // $120
        type: 'expense',
        frequency: 'weekly',
        nextDueDate: format(addDays(today, 3), 'yyyy-MM-dd'),
        categoryId: categoryMap['Groceries'].id,
      },
    ];

    await db.insert(recurringTransactions).values(sampleRecurring);

    // Sample Financial Goals
    const sampleGoals: NewFinancialGoal[] = [
      {
        userId,
        name: 'Emergency Fund',
        description: 'Build emergency fund covering 6 months of expenses',
        targetAmount: 2700000, // $27,000
        currentAmount: 1500000, // $15,000 (already saved in savings account)
        targetDate: format(addMonths(today, 12), 'yyyy-MM-dd'),
        status: 'active',
        priority: 'high',
        color: '#ef4444',
        icon: '🚨',
      },
      {
        userId,
        name: 'Vacation to Japan',
        description: 'Save for 2-week trip to Japan including flights and accommodation',
        targetAmount: 500000, // $5,000
        currentAmount: 150000, // $1,500
        targetDate: format(addMonths(today, 8), 'yyyy-MM-dd'),
        status: 'active',
        priority: 'medium',
        color: '#f59e0b',
        icon: '✈️',
      },
      {
        userId,
        name: 'New Laptop',
        description: 'MacBook Pro for work and personal projects',
        targetAmount: 250000, // $2,500
        currentAmount: 75000, // $750
        targetDate: format(addMonths(today, 4), 'yyyy-MM-dd'),
        status: 'active',
        priority: 'medium',
        color: '#6366f1',
        icon: '💻',
      },
      {
        userId,
        name: 'Car Down Payment',
        description: 'Save for down payment on reliable used car',
        targetAmount: 800000, // $8,000
        currentAmount: 200000, // $2,000
        targetDate: format(addMonths(today, 10), 'yyyy-MM-dd'),
        status: 'active',
        priority: 'high',
        color: '#10b981',
        icon: '🚗',
      },
    ];

    await db.insert(financialGoals).values(sampleGoals);

    return {
      success: true,
      message: 'Sample data generated successfully',
      data: {
        categories: insertedCategories.length,
        transactions: sampleTransactions.length,
        budgets: sampleBudgets.length,
        recurringTransactions: sampleRecurring.length,
        goals: sampleGoals.length,
        accounts: sampleAccounts.length,
      }
    };
  } catch (error) {
    console.error('Error generating sample data:', error);
    return {
      success: false,
      message: 'Failed to generate sample data',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function clearUserData(userId: string) {
  try {
    // Delete in reverse dependency order to avoid foreign key constraints
    await db.delete(transactions).where(eq(transactions.userId, userId));
    await db.delete(budgets).where(eq(budgets.userId, userId));
    await db.delete(recurringTransactions).where(eq(recurringTransactions.userId, userId));
    await db.delete(financialGoals).where(eq(financialGoals.userId, userId));
    await db.delete(userAccounts).where(eq(userAccounts.userId, userId));
    await db.delete(categories).where(eq(categories.userId, userId));

    return {
      success: true,
      message: 'User data cleared successfully',
    };
  } catch (error) {
    console.error('Error clearing user data:', error);
    return {
      success: false,
      message: 'Failed to clear user data',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}