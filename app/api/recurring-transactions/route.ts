import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { recurringTransactions, categories } from '@/app/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { z } from 'zod';
import { createAuthenticatedHandler } from '@/lib/middleware';

// Validation schema for recurring transaction
const createRecurringTransactionSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  nextDueDate: z.string(),
  categoryId: z.number().optional(),
  endDate: z.string().optional(),
});

// GET /api/recurring-transactions - List all recurring transactions for the user
export const GET = createAuthenticatedHandler(async function handleGET(request: NextRequest, userId: string) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('active');
    const type = searchParams.get('type');

    // Build query conditions
    const conditions = [eq(recurringTransactions.userId, userId)];
    
    if (isActive !== null) {
      conditions.push(eq(recurringTransactions.isActive, isActive === 'true'));
    }
    
    if (type && (type === 'income' || type === 'expense')) {
      conditions.push(eq(recurringTransactions.type, type));
    }

    // Fetch recurring transactions with category information
    const recurring = await db
      .select({
        id: recurringTransactions.id,
        description: recurringTransactions.description,
        amount: recurringTransactions.amount,
        type: recurringTransactions.type,
        frequency: recurringTransactions.frequency,
        nextDueDate: recurringTransactions.nextDueDate,
        lastProcessedDate: recurringTransactions.lastProcessedDate,
        categoryId: recurringTransactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
        isActive: recurringTransactions.isActive,
        endDate: recurringTransactions.endDate,
        createdAt: recurringTransactions.createdAt,
        updatedAt: recurringTransactions.updatedAt,
      })
      .from(recurringTransactions)
      .leftJoin(categories, eq(recurringTransactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(asc(recurringTransactions.nextDueDate));

    return NextResponse.json(recurring);
  } catch (error) {
    console.error('Error fetching recurring transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recurring transactions' },
      { status: 500 }
    );
  }
});

// POST /api/recurring-transactions - Create a new recurring transaction
export const POST = createAuthenticatedHandler(async function handlePOST(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = createRecurringTransactionSchema.parse(body);
    
    // Convert amount to cents for storage
    const amountInCents = Math.round(validatedData.amount * 100);

    // Create the recurring transaction
    const [newRecurring] = await db
      .insert(recurringTransactions)
      .values({
        userId: userId,
        description: validatedData.description,
        amount: amountInCents,
        type: validatedData.type,
        frequency: validatedData.frequency,
        nextDueDate: validatedData.nextDueDate,
        categoryId: validatedData.categoryId,
        endDate: validatedData.endDate,
        isActive: true,
      })
      .returning();

    return NextResponse.json(newRecurring, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating recurring transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create recurring transaction' },
      { status: 500 }
    );
  }
});

// PUT /api/recurring-transactions - Update a recurring transaction
export const PUT = createAuthenticatedHandler(async function handlePUT(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.id, id),
          eq(recurringTransactions.userId, userId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Recurring transaction not found' },
        { status: 404 }
      );
    }

    // Convert amount to cents if provided
    if (updateData.amount) {
      updateData.amount = Math.round(updateData.amount * 100);
    }

    // Update the recurring transaction
    const [updated] = await db
      .update(recurringTransactions)
      .set({
        ...updateData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(recurringTransactions.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating recurring transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update recurring transaction' },
      { status: 500 }
    );
  }
});

// DELETE /api/recurring-transactions - Delete a recurring transaction
export const DELETE = createAuthenticatedHandler(async function handleDELETE(request: NextRequest, userId: string) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.id, parseInt(id)),
          eq(recurringTransactions.userId, userId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Recurring transaction not found' },
        { status: 404 }
      );
    }

    // Delete the recurring transaction
    await db
      .delete(recurringTransactions)
      .where(eq(recurringTransactions.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recurring transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete recurring transaction' },
      { status: 500 }
    );
  }
});