import { db } from './index';
import { users, categories, transactions, budgets } from './schema';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create a sample user
  const [user] = await db.insert(users).values({
    name: 'John Doe',
    email: 'john@example.com',
  }).returning();

  console.log('✅ Created user:', user.email);

  // Create categories
  const categoryData = [
    { name: 'Salary', type: 'income' as const, color: '#10b981', icon: '💰', userId: user.id },
    { name: 'Freelance', type: 'income' as const, color: '#3b82f6', icon: '💻', userId: user.id },
    { name: 'Groceries', type: 'expense' as const, color: '#ef4444', icon: '🛒', userId: user.id },
    { name: 'Transportation', type: 'expense' as const, color: '#f59e0b', icon: '🚗', userId: user.id },
    { name: 'Entertainment', type: 'expense' as const, color: '#8b5cf6', icon: '🎮', userId: user.id },
    { name: 'Utilities', type: 'expense' as const, color: '#06b6d4', icon: '💡', userId: user.id },
    { name: 'Rent', type: 'expense' as const, color: '#ec4899', icon: '🏠', userId: user.id },
    { name: 'Healthcare', type: 'expense' as const, color: '#84cc16', icon: '🏥', userId: user.id },
    { name: 'Dining Out', type: 'expense' as const, color: '#f97316', icon: '🍔', userId: user.id },
  ];

  const insertedCategories = await db.insert(categories).values(categoryData).returning();
  console.log(`✅ Created ${insertedCategories.length} categories`);

  // Get category IDs for transactions
  const salaryCategory = insertedCategories.find(c => c.name === 'Salary')!;
  const freelanceCategory = insertedCategories.find(c => c.name === 'Freelance')!;
  const groceriesCategory = insertedCategories.find(c => c.name === 'Groceries')!;
  const transportCategory = insertedCategories.find(c => c.name === 'Transportation')!;
  const entertainmentCategory = insertedCategories.find(c => c.name === 'Entertainment')!;
  const utilitiesCategory = insertedCategories.find(c => c.name === 'Utilities')!;
  const rentCategory = insertedCategories.find(c => c.name === 'Rent')!;
  const diningCategory = insertedCategories.find(c => c.name === 'Dining Out')!;

  // Create transactions for the last 3 months
  const now = new Date();
  const transactionData = [
    // Current month transactions
    { amount: 500000, description: 'Monthly Salary', type: 'income' as const, date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], categoryId: salaryCategory.id, userId: user.id },
    { amount: 75000, description: 'Website Project', type: 'income' as const, date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString().split('T')[0], categoryId: freelanceCategory.id, userId: user.id },
    { amount: 150000, description: 'Monthly Rent', type: 'expense' as const, date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], categoryId: rentCategory.id, userId: user.id },
    { amount: 12500, description: 'Weekly Groceries', type: 'expense' as const, date: new Date(now.getFullYear(), now.getMonth(), 3).toISOString().split('T')[0], categoryId: groceriesCategory.id, userId: user.id },
    { amount: 8500, description: 'Gas', type: 'expense' as const, date: new Date(now.getFullYear(), now.getMonth(), 4).toISOString().split('T')[0], categoryId: transportCategory.id, userId: user.id },
    { amount: 15000, description: 'Electric Bill', type: 'expense' as const, date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString().split('T')[0], categoryId: utilitiesCategory.id, userId: user.id },
    { amount: 6000, description: 'Netflix Subscription', type: 'expense' as const, date: new Date(now.getFullYear(), now.getMonth(), 6).toISOString().split('T')[0], categoryId: entertainmentCategory.id, userId: user.id },
    { amount: 4500, description: 'Restaurant Lunch', type: 'expense' as const, date: new Date(now.getFullYear(), now.getMonth(), 7).toISOString().split('T')[0], categoryId: diningCategory.id, userId: user.id },
    
    // Previous month transactions
    { amount: 500000, description: 'Monthly Salary', type: 'income' as const, date: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0], categoryId: salaryCategory.id, userId: user.id },
    { amount: 50000, description: 'Logo Design', type: 'income' as const, date: new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString().split('T')[0], categoryId: freelanceCategory.id, userId: user.id },
    { amount: 150000, description: 'Monthly Rent', type: 'expense' as const, date: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0], categoryId: rentCategory.id, userId: user.id },
    { amount: 14000, description: 'Weekly Groceries', type: 'expense' as const, date: new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString().split('T')[0], categoryId: groceriesCategory.id, userId: user.id },
    { amount: 9000, description: 'Gas', type: 'expense' as const, date: new Date(now.getFullYear(), now.getMonth() - 1, 8).toISOString().split('T')[0], categoryId: transportCategory.id, userId: user.id },
    { amount: 14500, description: 'Electric Bill', type: 'expense' as const, date: new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString().split('T')[0], categoryId: utilitiesCategory.id, userId: user.id },
    { amount: 7500, description: 'Video Game', type: 'expense' as const, date: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString().split('T')[0], categoryId: entertainmentCategory.id, userId: user.id },
    
    // Two months ago transactions
    { amount: 500000, description: 'Monthly Salary', type: 'income' as const, date: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0], categoryId: salaryCategory.id, userId: user.id },
    { amount: 150000, description: 'Monthly Rent', type: 'expense' as const, date: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0], categoryId: rentCategory.id, userId: user.id },
    { amount: 13000, description: 'Weekly Groceries', type: 'expense' as const, date: new Date(now.getFullYear(), now.getMonth() - 2, 7).toISOString().split('T')[0], categoryId: groceriesCategory.id, userId: user.id },
    { amount: 10000, description: 'Gas', type: 'expense' as const, date: new Date(now.getFullYear(), now.getMonth() - 2, 12).toISOString().split('T')[0], categoryId: transportCategory.id, userId: user.id },
    { amount: 13500, description: 'Electric Bill', type: 'expense' as const, date: new Date(now.getFullYear(), now.getMonth() - 2, 15).toISOString().split('T')[0], categoryId: utilitiesCategory.id, userId: user.id },
  ];

  const insertedTransactions = await db.insert(transactions).values(transactionData).returning();
  console.log(`✅ Created ${insertedTransactions.length} transactions`);

  // Create budgets for current month
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const budgetData = [
    { name: 'Groceries Budget', amount: 60000, categoryId: groceriesCategory.id, month: currentMonth, userId: user.id },
    { name: 'Transportation Budget', amount: 40000, categoryId: transportCategory.id, month: currentMonth, userId: user.id },
    { name: 'Entertainment Budget', amount: 20000, categoryId: entertainmentCategory.id, month: currentMonth, userId: user.id },
    { name: 'Utilities Budget', amount: 20000, categoryId: utilitiesCategory.id, month: currentMonth, userId: user.id },
    { name: 'Dining Out Budget', amount: 15000, categoryId: diningCategory.id, month: currentMonth, userId: user.id },
  ];

  const insertedBudgets = await db.insert(budgets).values(budgetData).returning();
  console.log(`✅ Created ${insertedBudgets.length} budgets`);

  console.log('🎉 Database seeded successfully!');
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});