import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { transactions, categories } from '@/app/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { createAuthenticatedHandler } from '@/lib/middleware';

async function handleGET(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let query = db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        description: transactions.description,
        type: transactions.type,
        date: transactions.date,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
    
    if (startDate && endDate) {
      query = db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          description: transactions.description,
          type: transactions.type,
          date: transactions.date,
          categoryId: transactions.categoryId,
          categoryName: categories.name,
          categoryColor: categories.color,
          categoryIcon: categories.icon,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.userId, userId),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate)
          )
        )
        .orderBy(desc(transactions.date));
    }
    
    const allTransactions = await query;
    return NextResponse.json(allTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.amount || !body.description || !body.type || !body.date || !body.categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, description, type, date, categoryId' },
        { status: 400 }
      );
    }
    
    // Verify the category belongs to the user
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
    
    const newTransaction = await db.insert(transactions).values({
      ...body,
      userId,
    }).returning();
    
    return NextResponse.json(newTransaction[0], { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}

async function handleDELETE(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }
    
    // Verify the transaction belongs to the user before deleting
    const result = await db
      .delete(transactions)
      .where(and(eq(transactions.id, parseInt(id)), eq(transactions.userId, userId)))
      .returning({ id: transactions.id });
    
    if (!result.length) {
      return NextResponse.json(
        { error: 'Transaction not found or access denied' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}

export const GET = createAuthenticatedHandler(handleGET);
export const POST = createAuthenticatedHandler(handlePOST);
export const DELETE = createAuthenticatedHandler(handleDELETE);