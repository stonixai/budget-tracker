import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { recurringTransactions, transactions } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { createAuthenticatedHandler } from '@/lib/middleware';

// POST /api/recurring-transactions/execute - Execute a recurring transaction
export const POST = createAuthenticatedHandler(async function handlePOST(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const { id, force = false } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Recurring transaction ID is required' },
        { status: 400 }
      );
    }

    // Fetch the recurring transaction
    const [recurringTx] = await db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.id, id),
          eq(recurringTransactions.userId, userId),
          eq(recurringTransactions.isActive, true)
        )
      )
      .limit(1);

    if (!recurringTx) {
      return NextResponse.json(
        { error: 'Recurring transaction not found or inactive' },
        { status: 404 }
      );
    }

    // Check if it's time to execute (or if forced)
    const nextDueDate = new Date(recurringTx.nextDueDate);
    const now = new Date();
    
    if (!force && nextDueDate > now) {
      return NextResponse.json(
        { error: 'Transaction is not due yet' },
        { status: 400 }
      );
    }

    // Create the actual transaction - ensure categoryId is not null
    if (!recurringTx.categoryId) {
      return NextResponse.json(
        { error: 'Cannot execute transaction without a category' },
        { status: 400 }
      );
    }

    const [newTransaction] = await db
      .insert(transactions)
      .values({
        userId: userId,
        description: recurringTx.description,
        amount: recurringTx.amount,
        type: recurringTx.type,
        categoryId: recurringTx.categoryId,
        date: new Date().toISOString().split('T')[0], // Today's date
      })
      .returning();

    // Calculate next due date based on frequency
    let nextDue = new Date(recurringTx.nextDueDate);
    
    switch (recurringTx.frequency) {
      case 'daily':
        nextDue = addDays(nextDue, 1);
        break;
      case 'weekly':
        nextDue = addWeeks(nextDue, 1);
        break;
      case 'biweekly':
        nextDue = addWeeks(nextDue, 2);
        break;
      case 'monthly':
        nextDue = addMonths(nextDue, 1);
        break;
      case 'quarterly':
        nextDue = addMonths(nextDue, 3);
        break;
      case 'yearly':
        nextDue = addYears(nextDue, 1);
        break;
    }

    // Check if this execution would exceed the end date
    const shouldDeactivate = recurringTx.endDate && nextDue > new Date(recurringTx.endDate);

    // Update the recurring transaction
    const updateData: any = {
      lastProcessedDate: new Date().toISOString(),
      isActive: !shouldDeactivate,
      updatedAt: new Date().toISOString(),
    };

    if (!shouldDeactivate) {
      updateData.nextDueDate = nextDue.toISOString();
    }

    await db
      .update(recurringTransactions)
      .set(updateData)
      .where(eq(recurringTransactions.id, id));

    return NextResponse.json({
      success: true,
      transaction: newTransaction,
      recurringTransaction: {
        ...recurringTx,
        lastProcessedDate: new Date().toISOString(),
        nextDueDate: shouldDeactivate ? null : nextDue.toISOString(),
        isActive: !shouldDeactivate,
      },
      message: shouldDeactivate 
        ? 'Transaction executed and recurring transaction deactivated (end date reached)'
        : 'Transaction executed successfully',
    });
  } catch (error) {
    console.error('Error executing recurring transaction:', error);
    return NextResponse.json(
      { error: 'Failed to execute recurring transaction' },
      { status: 500 }
    );
  }
});