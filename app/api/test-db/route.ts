import { NextResponse } from 'next/server';
import { db, users, posts } from '@/app/db';

export async function GET() {
  try {
    const allUsers = await db.select().from(users).all();
    const allPosts = await db.select().from(posts).all();
    
    return NextResponse.json({
      success: true,
      data: {
        users: allUsers,
        posts: allPosts,
        counts: {
          users: allUsers.length,
          posts: allPosts.length
        }
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const newUser = await db.insert(users).values({
      name: body.name,
      email: body.email,
    }).returning();
    
    return NextResponse.json({
      success: true,
      data: newUser[0]
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}