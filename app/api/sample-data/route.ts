import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedHandler } from '@/lib/middleware';
import { generateSampleData, clearUserData } from '@/lib/sample-data';

async function handlePOST(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'generate') {
      const result = await generateSampleData(userId);
      return NextResponse.json(result);
    } else if (action === 'clear') {
      const result = await clearUserData(userId);
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "generate" or "clear"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Sample data API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const POST = createAuthenticatedHandler(handlePOST);