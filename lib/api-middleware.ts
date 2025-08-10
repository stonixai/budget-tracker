import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters } from './rate-limit';
import { AuditLogger } from './security';

// Apply rate limiting to API routes (use in API route handlers, not edge middleware)
export async function withRateLimit(
  req: NextRequest,
  handler: () => Promise<NextResponse>,
  rateLimiter = rateLimiters.api
): Promise<NextResponse> {
  const rateLimitCheck = await rateLimiter.check(req);
  
  if (!rateLimitCheck.allowed) {
    // Log rate limit violation
    await AuditLogger.logRequest(req, undefined, 'RATE_LIMIT_EXCEEDED');
    
    return NextResponse.json(
      { error: 'Too many requests, please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimiter['config'].maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitCheck.resetAt.toISOString(),
          'Retry-After': Math.ceil((rateLimitCheck.resetAt.getTime() - Date.now()) / 1000).toString(),
        },
      }
    );
  }
  
  // Execute the handler
  const response = await handler();
  
  // Add rate limit headers to successful responses
  response.headers.set('X-RateLimit-Limit', rateLimiter['config'].maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimitCheck.remaining.toString());
  response.headers.set('X-RateLimit-Reset', rateLimitCheck.resetAt.toISOString());
  
  return response;
}

// Apply authentication and rate limiting
export async function withAuth(
  req: NextRequest,
  handler: (userId: string) => Promise<NextResponse>,
  options?: {
    rateLimiter?: typeof rateLimiters.api;
    auditAction?: string;
  }
): Promise<NextResponse> {
  // Check authentication (you'll need to implement this based on your auth setup)
  const userId = req.headers.get('x-user-id'); // This is simplified, use your actual auth
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Apply rate limiting if specified
  if (options?.rateLimiter) {
    const rateLimitCheck = await options.rateLimiter.check(req);
    
    if (!rateLimitCheck.allowed) {
      await AuditLogger.logRequest(req, userId, 'RATE_LIMIT_EXCEEDED');
      
      return NextResponse.json(
        { error: 'Too many requests, please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': options.rateLimiter['config'].maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitCheck.resetAt.toISOString(),
            'Retry-After': Math.ceil((rateLimitCheck.resetAt.getTime() - Date.now()) / 1000).toString(),
          },
        }
      );
    }
  }
  
  // Log the request if audit action is specified
  if (options?.auditAction) {
    await AuditLogger.logRequest(req, userId, options.auditAction);
  }
  
  // Execute the handler
  return handler(userId);
}