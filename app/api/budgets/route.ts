import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { budgets, categories, transactions } from '@/app/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { createAuthenticatedHandler } from '@/lib/middleware';

async function handleGET(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    
    // Get budgets with category info and spent amounts
    const budgetsWithSpent = await db
      .select({
        id: budgets.id,
        name: budgets.name,
        amount: budgets.amount,
        month: budgets.month,
        categoryId: budgets.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
        spent: sql<number>`
          COALESCE(
            (SELECT SUM(${transactions.amount})
             FROM ${transactions}
             WHERE ${transactions.categoryId} = ${budgets.categoryId}
               AND ${transactions.userId} = ${userId}
               AND ${transactions.type} = 'expense'
               AND strftime('%Y-%m', ${transactions.date}) = ${month}
            ), 0)
        `.as('spent'),
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.month, month)
        )
      );
    
    return NextResponse.json(budgetsWithSpent);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.amount || !body.month) {
      return NextResponse.json(
        { error: 'Missing required fields: name, amount, month' },
        { status: 400 }
      );
    }
    
    // Verify the category belongs to the user (if categoryId is provided)
    if (body.categoryId) {
      const category = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, body.categoryId), eq(categories.userId, userId)))
        .limit(1);
      
      if (!category.length) {
        return NextResponse.json(
          { error: 'Category not found or access denied' },
          { status: 404 }
        );
      }
    }
    
    const newBudget = await db.insert(budgets).values({
      ...body,
      userId,
    }).returning();
    
    return NextResponse.json(newBudget[0], { status: 201 });
  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 });
  }
}

async function handleDELETE(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Budget ID required' }, { status: 400 });
    }
    
    // Verify the budget belongs to the user before deleting
    const result = await db
      .delete(budgets)
      .where(and(eq(budgets.id, parseInt(id)), eq(budgets.userId, userId)))
      .returning({ id: budgets.id });
    
    if (!result.length) {
      return NextResponse.json(
        { error: 'Budget not found or access denied' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget:', error);
    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 });
  }
}

export const GET = createAuthenticatedHandler(handleGET);
export const POST = createAuthenticatedHandler(handlePOST);
export const DELETE = createAuthenticatedHandler(handleDELETE);