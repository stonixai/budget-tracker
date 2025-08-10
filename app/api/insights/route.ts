import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiInsights } from '@/lib/ai-insights';
import { cache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Try to get insights from cache first
    const cachedInsights = await cache.get('insights', userId);
    if (cachedInsights) {
      return NextResponse.json(cachedInsights);
    }

    // Generate fresh insights
    const insights = await aiInsights.generateInsights(userId);

    // Cache the insights for 10 minutes
    await cache.set('insights', userId, insights, 600);

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate insights',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Force refresh insights
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Clear cached insights
    await cache.del('insights', userId);

    // Generate fresh insights
    const insights = await aiInsights.generateInsights(userId);

    // Cache the fresh insights
    await cache.set('insights', userId, insights, 600);

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Insights refresh API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to refresh insights',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}