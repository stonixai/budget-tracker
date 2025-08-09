import { http, HttpResponse } from 'msw';
import { createTestScenario } from '../utils/factories';

// Mock API handlers for MSW
export const handlers = [
  // Users
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Test User', email: 'test@example.com' }
    ]);
  }),

  // Categories
  http.get('/api/categories', () => {
    return HttpResponse.json([
      { id: 1, name: 'Groceries', type: 'expense', color: '#ef4444', icon: '🛒', userId: 1 },
      { id: 2, name: 'Salary', type: 'income', color: '#10b981', icon: '💼', userId: 1 },
    ]);
  }),

  http.post('/api/categories', async ({ request }) => {
    const newCategory = await request.json() as any;
    return HttpResponse.json({
      id: Date.now(),
      userId: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...newCategory,
    }, { status: 201 });
  }),

  // Transactions
  http.get('/api/transactions', ({ request }) => {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    const mockTransactions = [
      {
        id: 1,
        amount: 12500,
        description: 'Weekly groceries',
        type: 'expense',
        date: '2024-01-15',
        categoryId: 1,
        categoryName: 'Groceries',
        categoryColor: '#ef4444',
        categoryIcon: '🛒',
        userId: 1,
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        id: 2,
        amount: 500000,
        description: 'Monthly salary',
        type: 'income',
        date: '2024-01-01',
        categoryId: 2,
        categoryName: 'Salary',
        categoryColor: '#10b981',
        categoryIcon: '💼',
        userId: 1,
        createdAt: '2024-01-01T09:00:00Z',
      },
    ];

    // Filter by date if provided
    if (startDate && endDate) {
      return HttpResponse.json(
        mockTransactions.filter(t => t.date >= startDate && t.date <= endDate)
      );
    }

    return HttpResponse.json(mockTransactions);
  }),

  http.post('/api/transactions', async ({ request }) => {
    const newTransaction = await request.json() as any;
    return HttpResponse.json({
      id: Date.now(),
      userId: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categoryName: 'Groceries',
      categoryColor: '#ef4444',
      categoryIcon: '🛒',
      ...newTransaction,
    }, { status: 201 });
  }),

  http.delete('/api/transactions', ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return HttpResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }
    
    return HttpResponse.json({ success: true });
  }),

  // Budgets
  http.get('/api/budgets', ({ request }) => {
    const url = new URL(request.url);
    const month = url.searchParams.get('month') || '2024-01';
    
    return HttpResponse.json([
      {
        id: 1,
        name: 'Monthly Groceries',
        amount: 50000,
        month,
        categoryId: 1,
        categoryName: 'Groceries',
        categoryColor: '#ef4444',
        categoryIcon: '🛒',
        spent: 12500,
        userId: 1,
      },
    ]);
  }),

  http.post('/api/budgets', async ({ request }) => {
    const newBudget = await request.json() as any;
    return HttpResponse.json({
      id: Date.now(),
      userId: 1,
      spent: 0,
      categoryName: 'Groceries',
      categoryColor: '#ef4444',
      categoryIcon: '🛒',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...newBudget,
    }, { status: 201 });
  }),

  http.delete('/api/budgets', ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return HttpResponse.json(
        { error: 'Budget ID required' },
        { status: 400 }
      );
    }
    
    return HttpResponse.json({ success: true });
  }),

  // Dashboard
  http.get('/api/dashboard', () => {
    return HttpResponse.json({
      totalIncome: 500000,
      totalExpenses: 25000,
      balance: 475000,
      recentTransactions: [
        {
          id: 1,
          amount: 12500,
          description: 'Weekly groceries',
          type: 'expense',
          date: '2024-01-15',
          categoryName: 'Groceries',
          categoryIcon: '🛒',
        },
      ],
      budgetOverview: [
        {
          id: 1,
          name: 'Monthly Groceries',
          amount: 50000,
          spent: 12500,
          categoryName: 'Groceries',
          categoryIcon: '🛒',
        },
      ],
    });
  }),

  // Error handlers for testing error states
  http.get('/api/error-test', () => {
    return HttpResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }),

  http.post('/api/error-test', () => {
    return HttpResponse.json(
      { error: 'Validation failed' },
      { status: 400 }
    );
  }),
];

// Error handlers for network failures
export const errorHandlers = [
  http.get('/api/transactions', () => {
    return HttpResponse.error();
  }),
  
  http.post('/api/transactions', () => {
    return HttpResponse.error();
  }),
  
  http.get('/api/budgets', () => {
    return HttpResponse.error();
  }),
  
  http.get('/api/categories', () => {
    return HttpResponse.error();
  }),
];