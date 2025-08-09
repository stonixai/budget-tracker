import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { transactions } from '@/app/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { createAuthenticatedHandler } from '@/lib/middleware';

async function handleGET(request: NextRequest, userId: string) {
  try {
    // Get current month start
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    
    // Get total income and expenses for current month
    const currentMonthStats = await db
      .select({
        totalIncome: sql<number>`
          COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)
        `.as('totalIncome'),
        totalExpenses: sql<number>`
          COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)
        `.as('totalExpenses'),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, currentMonthStart)
        )
      );
    
    // Get last month stats for comparison
    const lastMonthStats = await db
      .select({
        totalIncome: sql<number>`
          COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)
        `.as('totalIncome'),
        totalExpenses: sql<number>`
          COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)
        `.as('totalExpenses'),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, lastMonthStart),
          sql`${transactions.date} < ${currentMonthStart}`
        )
      );
    
    // Get recent transactions
    const recentTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(sql`${transactions.date} DESC`)
      .limit(5);
    
    return NextResponse.json({
      currentMonth: currentMonthStats[0] || { totalIncome: 0, totalExpenses: 0 },
      lastMonth: lastMonthStats[0] || { totalIncome: 0, totalExpenses: 0 },
      recentTransactions,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}

export const GET = createAuthenticatedHandler(handleGET);