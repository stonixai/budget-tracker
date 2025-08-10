import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from './cache';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  identifier?: (req: NextRequest) => string; // Function to identify the client
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyPrefix?: string; // Prefix for Redis keys
  message?: string; // Custom error message
}

export class RateLimiter {
  private config: Required<RateLimitConfig>;
  private redis: ReturnType<typeof getRedisClient>;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      identifier: config.identifier || this.defaultIdentifier,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
      keyPrefix: config.keyPrefix || 'rate-limit',
      message: config.message || 'Too many requests, please try again later.',
    };
    this.redis = getRedisClient();
  }

  private defaultIdentifier(req: NextRequest): string {
    // Try to get IP from various headers
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    
    // Include user ID if authenticated
    const userId = req.headers.get('x-user-id');
    
    return userId ? `user:${userId}` : `ip:${ip}`;
  }

  private getKey(identifier: string): string {
    return `${this.config.keyPrefix}:${identifier}`;
  }

  async check(req: NextRequest): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const identifier = this.config.identifier(req);
    const key = this.getKey(identifier);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    if (!this.redis) {
      // If Redis is not available, allow the request
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetAt: new Date(now + this.config.windowMs),
      };
    }

    try {
      // Use Redis sorted set to track requests with timestamps
      const zsetKey = `${key}:requests`;
      
      // Remove old entries outside the current window
      await this.redis.zremrangebyscore(zsetKey, '-inf', windowStart);
      
      // Count requests in current window
      const requestCount = await this.redis.zcard(zsetKey);
      
      if (requestCount >= this.config.maxRequests) {
        // Get the oldest request timestamp to calculate reset time
        const oldestRequest = await this.redis.zrange(zsetKey, 0, 0, 'WITHSCORES');
        const resetAt = oldestRequest.length > 1 
          ? new Date(parseInt(oldestRequest[1]) + this.config.windowMs)
          : new Date(now + this.config.windowMs);
        
        return {
          allowed: false,
          remaining: 0,
          resetAt,
        };
      }
      
      // Add current request to the set
      await this.redis.zadd(zsetKey, now, `${now}:${Math.random()}`);
      
      // Set expiry on the key
      await this.redis.expire(zsetKey, Math.ceil(this.config.windowMs / 1000));
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - requestCount - 1,
        resetAt: new Date(now + this.config.windowMs),
      };
    } catch (error) {
      console.error('Rate limiting error:', error);
      // On error, allow the request
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetAt: new Date(now + this.config.windowMs),
      };
    }
  }

  async middleware(req: NextRequest): Promise<NextResponse | null> {
    const { allowed, remaining, resetAt } = await this.check(req);
    
    if (!allowed) {
      return NextResponse.json(
        { error: this.config.message },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': this.config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetAt.toISOString(),
            'Retry-After': Math.ceil((resetAt.getTime() - Date.now()) / 1000).toString(),
          },
        }
      );
    }
    
    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', this.config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', resetAt.toISOString());
    
    return null; // Continue to the next middleware
  }

  // Reset rate limit for a specific identifier
  async reset(identifier: string): Promise<void> {
    if (!this.redis) return;
    
    const key = this.getKey(identifier);
    const zsetKey = `${key}:requests`;
    
    try {
      await this.redis.del(zsetKey);
    } catch (error) {
      console.error('Rate limit reset error:', error);
    }
  }
}

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  // General API rate limit: 100 requests per minute
  api: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'api',
  }),
  
  // Auth endpoints: 5 requests per minute (stricter for security)
  auth: new RateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyPrefix: 'auth',
    message: 'Too many authentication attempts, please try again later.',
  }),
  
  // Data export: 10 requests per hour
  export: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'export',
    message: 'Export rate limit exceeded, please try again later.',
  }),
  
  // AI insights: 20 requests per hour (resource-intensive)
  insights: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
    keyPrefix: 'insights',
    message: 'AI insights rate limit exceeded, please try again later.',
  }),
};

// Helper function to apply rate limiting to API routes
export async function withRateLimit(
  req: NextRequest,
  handler: () => Promise<NextResponse>,
  limiter: RateLimiter = rateLimiters.api
): Promise<NextResponse> {
  const rateLimitResponse = await limiter.middleware(req);
  
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  
  return handler();
}