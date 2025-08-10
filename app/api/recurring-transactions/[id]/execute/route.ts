import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { recurringTransactions, transactions, categories } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';
import { createAuthenticatedHandler } from '@/lib/middleware';

// POST /api/recurring-transactions/[id]/execute - Execute a recurring transaction
export const POST = createAuthenticatedHandler(async function handlePOST(
  request: NextRequest, 
  userId: string
) {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const idString = pathSegments[pathSegments.length - 2]; // Get id from URL path
    const id = parseInt(idString);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    // Get the recurring transaction
    const [recurring] = await db
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

    if (!recurring) {
      return NextResponse.json(
        { error: 'Recurring transaction not found or inactive' },
        { status: 404 }
      );
    }

    // Check if it's time to execute (optional - can be forced)
    const now = new Date();
    const nextDue = new Date(recurring.nextDueDate);
    const body = await request.json();
    const force = body?.force === true;

    if (!force && now < nextDue) {
      return NextResponse.json(
        { error: 'Recurring transaction is not yet due', nextDueDate: recurring.nextDueDate },
        { status: 400 }
      );
    }

    // Create the transaction from the recurring template
    const [newTransaction] = await db
      .insert(transactions)
      .values({
        userId: userId,
        description: recurring.description,
        amount: recurring.amount,
        type: recurring.type,
        date: now.toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
        categoryId: recurring.categoryId || 1, // Default category if none specified
      })
      .returning();

    // Calculate next due date based on frequency
    const calculateNextDueDate = (currentDate: Date, frequency: string): string => {
      const next = new Date(currentDate);
      
      switch (frequency) {
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;
        case 'weekly':
          next.setDate(next.getDate() + 7);
          break;
        case 'biweekly':
          next.setDate(next.getDate() + 14);
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
        case 'quarterly':
          next.setMonth(next.getMonth() + 3);
          break;
        case 'yearly':
          next.setFullYear(next.getFullYear() + 1);
          break;
        default:
          next.setMonth(next.getMonth() + 1); // Default to monthly
      }
      
      return next.toISOString().split('T')[0];
    };

    const nextDueDateStr = calculateNextDueDate(now, recurring.frequency);

    // Update the recurring transaction
    const [updatedRecurring] = await db
      .update(recurringTransactions)
      .set({
        lastProcessedDate: now.toISOString().split('T')[0],
        nextDueDate: nextDueDateStr,
        updatedAt: now.toISOString(),
      })
      .where(eq(recurringTransactions.id, id))
      .returning();

    // Return the created transaction and updated recurring info
    return NextResponse.json({
      success: true,
      transaction: newTransaction,
      recurringTransaction: updatedRecurring,
      nextDueDate: nextDueDateStr,
    }, { status: 201 });

  } catch (error) {
    console.error('Error executing recurring transaction:', error);
    return NextResponse.json(
      { error: 'Failed to execute recurring transaction' },
      { status: 500 }
    );
  }
});

// GET /api/recurring-transactions/[id]/execute - Check if execution is due
export const GET = createAuthenticatedHandler(async function handleGET(
  request: NextRequest, 
  userId: string
) {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const idString = pathSegments[pathSegments.length - 2]; // Get id from URL path
    const id = parseInt(idString);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    // Get the recurring transaction with category info
    const [recurring] = await db
      .select({
        id: recurringTransactions.id,
        description: recurringTransactions.description,
        amount: recurringTransactions.amount,
        type: recurringTransactions.type,
        frequency: recurringTransactions.frequency,
        nextDueDate: recurringTransactions.nextDueDate,
        lastProcessedDate: recurringTransactions.lastProcessedDate,
        isActive: recurringTransactions.isActive,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(recurringTransactions)
      .leftJoin(categories, eq(recurringTransactions.categoryId, categories.id))
      .where(
        and(
          eq(recurringTransactions.id, id),
          eq(recurringTransactions.userId, userId)
        )
      )
      .limit(1);

    if (!recurring) {
      return NextResponse.json(
        { error: 'Recurring transaction not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const nextDue = new Date(recurring.nextDueDate);
    const isDue = now >= nextDue;
    const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      recurringTransaction: recurring,
      isDue,
      daysUntilDue: isDue ? 0 : daysUntilDue,
      canExecute: recurring.isActive && (isDue || daysUntilDue <= 1), // Allow execution 1 day early
    });

  } catch (error) {
    console.error('Error checking recurring transaction execution status:', error);
    return NextResponse.json(
      { error: 'Failed to check execution status' },
      { status: 500 }
    );
  }
});