import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateSampleData, clearUserData } from '@/lib/sample-data';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'generate') {
      const result = await generateSampleData(session.user.id);
      return NextResponse.json(result);
    } else if (action === 'clear') {
      const result = await clearUserData(session.user.id);
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