import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { financialGoals, categories } from '@/app/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createAuthenticatedHandler } from '@/lib/middleware';

// Validation schema for financial goal
const createGoalSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.string().optional(),
  categoryId: z.number().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

// GET /api/goals - List all financial goals for the user
export const GET = createAuthenticatedHandler(async function handleGET(request: NextRequest, userId: string) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    // Build query conditions
    const conditions = [eq(financialGoals.userId, userId)];
    
    if (status && ['active', 'completed', 'paused', 'cancelled'].includes(status)) {
      conditions.push(eq(financialGoals.status, status as 'active' | 'completed' | 'paused' | 'cancelled'));
    }
    
    if (priority && ['low', 'medium', 'high'].includes(priority)) {
      conditions.push(eq(financialGoals.priority, priority as 'low' | 'medium' | 'high'));
    }

    // Fetch goals with category information
    const goals = await db
      .select({
        id: financialGoals.id,
        name: financialGoals.name,
        description: financialGoals.description,
        targetAmount: financialGoals.targetAmount,
        currentAmount: financialGoals.currentAmount,
        targetDate: financialGoals.targetDate,
        categoryId: financialGoals.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
        status: financialGoals.status,
        priority: financialGoals.priority,
        color: financialGoals.color,
        icon: financialGoals.icon,
        createdAt: financialGoals.createdAt,
        updatedAt: financialGoals.updatedAt,
        progressPercentage: sql<number>`
          CASE 
            WHEN ${financialGoals.targetAmount} > 0 
            THEN CAST(${financialGoals.currentAmount} AS REAL) / ${financialGoals.targetAmount} * 100
            ELSE 0
          END
        `.as('progressPercentage'),
      })
      .from(financialGoals)
      .leftJoin(categories, eq(financialGoals.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(financialGoals.priority), desc(financialGoals.createdAt));

    // Calculate additional metrics
    const goalsWithMetrics = goals.map(goal => {
      const remaining = goal.targetAmount - goal.currentAmount;
      const isOverdue = goal.targetDate && new Date(goal.targetDate) < new Date() && goal.status === 'active';
      const daysRemaining = goal.targetDate 
        ? Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        ...goal,
        remaining,
        isOverdue,
        daysRemaining,
      };
    });

    return NextResponse.json(goalsWithMetrics);
  } catch (error) {
    console.error('Error fetching financial goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial goals' },
      { status: 500 }
    );
  }
});

// POST /api/goals - Create a new financial goal
export const POST = createAuthenticatedHandler(async function handlePOST(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = createGoalSchema.parse(body);
    
    // Convert amounts to cents for storage
    const targetAmountInCents = Math.round(validatedData.targetAmount * 100);
    const currentAmountInCents = validatedData.currentAmount 
      ? Math.round(validatedData.currentAmount * 100) 
      : 0;

    // Create the financial goal
    const [newGoal] = await db
      .insert(financialGoals)
      .values({
        userId: userId,
        name: validatedData.name,
        description: validatedData.description,
        targetAmount: targetAmountInCents,
        currentAmount: currentAmountInCents,
        targetDate: validatedData.targetDate,
        categoryId: validatedData.categoryId,
        priority: validatedData.priority || 'medium',
        color: validatedData.color || '#6366f1',
        icon: validatedData.icon,
        status: 'active',
      })
      .returning();

    return NextResponse.json(newGoal, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating financial goal:', error);
    return NextResponse.json(
      { error: 'Failed to create financial goal' },
      { status: 500 }
    );
  }
});

// PUT /api/goals - Update a financial goal
export const PUT = createAuthenticatedHandler(async function handlePUT(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(financialGoals)
      .where(
        and(
          eq(financialGoals.id, id),
          eq(financialGoals.userId, userId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Financial goal not found' },
        { status: 404 }
      );
    }

    // Convert amounts to cents if provided
    if (updateData.targetAmount) {
      updateData.targetAmount = Math.round(updateData.targetAmount * 100);
    }
    if (updateData.currentAmount !== undefined) {
      updateData.currentAmount = Math.round(updateData.currentAmount * 100);
    }

    // Check if goal is completed
    if (updateData.currentAmount && updateData.targetAmount) {
      if (updateData.currentAmount >= updateData.targetAmount) {
        updateData.status = 'completed';
      }
    } else if (updateData.currentAmount && existing.targetAmount) {
      if (updateData.currentAmount >= existing.targetAmount) {
        updateData.status = 'completed';
      }
    }

    // Update the financial goal
    const [updated] = await db
      .update(financialGoals)
      .set({
        ...updateData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(financialGoals.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating financial goal:', error);
    return NextResponse.json(
      { error: 'Failed to update financial goal' },
      { status: 500 }
    );
  }
});

// DELETE /api/goals - Delete a financial goal
export const DELETE = createAuthenticatedHandler(async function handleDELETE(request: NextRequest, userId: string) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await db
      .select()
      .from(financialGoals)
      .where(
        and(
          eq(financialGoals.id, parseInt(id)),
          eq(financialGoals.userId, userId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Financial goal not found' },
        { status: 404 }
      );
    }

    // Delete the financial goal
    await db
      .delete(financialGoals)
      .where(eq(financialGoals.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting financial goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete financial goal' },
      { status: 500 }
    );
  }
});