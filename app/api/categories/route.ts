import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { categories } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { createAuthenticatedHandler } from '@/lib/middleware';

async function handleGET(request: NextRequest, userId: string) {
  try {
    const allCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId));
    
    return NextResponse.json(allCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

async function handlePOST(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type' },
        { status: 400 }
      );
    }
    
    // Validate type enum
    if (!['income', 'expense'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "income" or "expense"' },
        { status: 400 }
      );
    }
    
    const newCategory = await db.insert(categories).values({
      ...body,
      userId,
    }).returning();
    
    return NextResponse.json(newCategory[0], { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export const GET = createAuthenticatedHandler(handleGET);
export const POST = createAuthenticatedHandler(handlePOST);