import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedHandler } from '@/lib/middleware';
import { aiInsights } from '@/lib/ai-insights';
import { cache } from '@/lib/cache';

async function handleGET(request: NextRequest, userId: string) {
  try {
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

async function handlePOST(request: NextRequest, userId: string) {
  try {
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

export const GET = createAuthenticatedHandler(handleGET);
export const POST = createAuthenticatedHandler(handlePOST);