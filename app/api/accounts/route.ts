import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { userAccounts, transactions } from '@/app/db/schema';
import { eq, and, desc, sql, sum, ne } from 'drizzle-orm';
import { z } from 'zod';
import { createAuthenticatedHandler } from '@/lib/middleware';

// Validation schema for user account
const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['checking', 'savings', 'credit', 'investment', 'loan', 'cash']),
  balance: z.number().optional(),
  currency: z.string().optional(),
  accountNumber: z.string().max(4).optional(), // Last 4 digits only
  institution: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

// GET /api/accounts - List all user accounts
export const GET = createAuthenticatedHandler(async function handleGET(request: NextRequest, userId: string) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('active');
    const type = searchParams.get('type');

    // Build query conditions
    const conditions = [eq(userAccounts.userId, userId)];
    
    if (isActive !== null) {
      conditions.push(eq(userAccounts.isActive, isActive === 'true'));
    }
    
    if (type && ['checking', 'savings', 'credit', 'investment', 'loan', 'cash'].includes(type)) {
      conditions.push(eq(userAccounts.type, type as 'checking' | 'savings' | 'credit' | 'investment' | 'loan' | 'cash'));
    }

    // Fetch user accounts
    const accounts = await db
      .select()
      .from(userAccounts)
      .where(and(...conditions))
      .orderBy(desc(userAccounts.isPrimary), desc(userAccounts.createdAt));

    // Calculate total balance by account type
    const balanceByType = await db
      .select({
        type: userAccounts.type,
        totalBalance: sum(userAccounts.balance),
      })
      .from(userAccounts)
      .where(
        and(
          eq(userAccounts.userId, userId),
          eq(userAccounts.isActive, true)
        )
      )
      .groupBy(userAccounts.type);

    // Calculate net worth (assets - liabilities)
    const assets = ['checking', 'savings', 'investment', 'cash'];
    const liabilities = ['credit', 'loan'];
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    
    balanceByType.forEach(item => {
      const balance = Number(item.totalBalance) || 0;
      if (assets.includes(item.type)) {
        totalAssets += balance;
      } else if (liabilities.includes(item.type)) {
        totalLiabilities += Math.abs(balance);
      }
    });

    const netWorth = totalAssets - totalLiabilities;

    return NextResponse.json({
      accounts,
      summary: {
        totalAccounts: accounts.length,
        activeAccounts: accounts.filter(a => a.isActive).length,
        balanceByType,
        totalAssets,
        totalLiabilities,
        netWorth,
      },
    });
  } catch (error) {
    console.error('Error fetching user accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user accounts' },
      { status: 500 }
    );
  }
});

// POST /api/accounts - Create a new user account
export const POST = createAuthenticatedHandler(async function handlePOST(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = createAccountSchema.parse(body);
    
    // Convert balance to cents for storage
    const balanceInCents = validatedData.balance 
      ? Math.round(validatedData.balance * 100) 
      : 0;

    // If this is set as primary, unset other primary accounts
    if (validatedData.isPrimary) {
      await db
        .update(userAccounts)
        .set({ isPrimary: false })
        .where(eq(userAccounts.userId, userId));
    }

    // Create the user account
    const [newAccount] = await db
      .insert(userAccounts)
      .values({
        userId: userId,
        name: validatedData.name,
        type: validatedData.type,
        balance: balanceInCents,
        currency: validatedData.currency || 'USD',
        accountNumber: validatedData.accountNumber,
        institution: validatedData.institution,
        color: validatedData.color || '#6366f1',
        icon: validatedData.icon,
        isPrimary: validatedData.isPrimary || false,
        isActive: true,
      })
      .returning();

    return NextResponse.json(newAccount, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating user account:', error);
    return NextResponse.json(
      { error: 'Failed to create user account' },
      { status: 500 }
    );
  }
});

// PUT /api/accounts - Update a user account
export const PUT = createAuthenticatedHandler(async function handlePUT(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(userAccounts)
      .where(
        and(
          eq(userAccounts.id, id),
          eq(userAccounts.userId, userId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }

    // Convert balance to cents if provided
    if (updateData.balance !== undefined) {
      updateData.balance = Math.round(updateData.balance * 100);
    }

    // If setting as primary, unset other primary accounts
    if (updateData.isPrimary === true) {
      await db
        .update(userAccounts)
        .set({ isPrimary: false })
        .where(
          and(
            eq(userAccounts.userId, userId),
            ne(userAccounts.id, id)
          )
        );
    }

    // Update the user account
    const [updated] = await db
      .update(userAccounts)
      .set({
        ...updateData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userAccounts.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating user account:', error);
    return NextResponse.json(
      { error: 'Failed to update user account' },
      { status: 500 }
    );
  }
});

// DELETE /api/accounts - Deactivate a user account (soft delete)
export const DELETE = createAuthenticatedHandler(async function handleDELETE(request: NextRequest, userId: string) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(userAccounts)
      .where(
        and(
          eq(userAccounts.id, parseInt(id)),
          eq(userAccounts.userId, userId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }

    if (permanent) {
      // Check if there are transactions linked to this account
      const linkedTransactions = await db
        .select({ count: sql<number>`count(*)` })
        .from(transactions)
        .where(eq(transactions.userId, userId));

      if (linkedTransactions[0].count > 0) {
        return NextResponse.json(
          { error: 'Cannot permanently delete account with linked transactions' },
          { status: 400 }
        );
      }

      // Permanently delete the account
      await db
        .delete(userAccounts)
        .where(eq(userAccounts.id, parseInt(id)));

      return NextResponse.json({ success: true, message: 'Account permanently deleted' });
    } else {
      // Soft delete - just deactivate the account
      const [deactivated] = await db
        .update(userAccounts)
        .set({ 
          isActive: false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userAccounts.id, parseInt(id)))
        .returning();

      return NextResponse.json({ success: true, account: deactivated });
    }
  } catch (error) {
    console.error('Error deleting user account:', error);
    return NextResponse.json(
      { error: 'Failed to delete user account' },
      { status: 500 }
    );
  }
});