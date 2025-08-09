import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Rate limiting storage (in production, use Redis or similar)
const rateLimit = new Map<string, { count: number; resetTime: number }>()

// Helper function for rate limiting
export function checkRateLimit(
  identifier: string, 
  requests: number = 5, 
  window: number = 60000
): boolean {
  const now = Date.now()
  const entry = rateLimit.get(identifier)
  
  if (!entry || now > entry.resetTime) {
    rateLimit.set(identifier, { count: 1, resetTime: now + window })
    return true
  }
  
  if (entry.count >= requests) {
    return false
  }
  
  entry.count++
  return true
}

// Middleware to protect API routes
export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
) {
  try {
    // Get token from request
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token || !token.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Call the handler with authenticated user ID
    return await handler(req, token.id as string)
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }
}

// Rate limiting middleware
export async function withRateLimit(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: { requests?: number; window?: number } = {}
) {
  const { requests = 5, window = 60000 } = options
  
  // Use IP address as identifier (in production, consider using user ID for authenticated requests)
  const identifier = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown'

  if (!checkRateLimit(identifier, requests, window)) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${window / 1000} seconds.`
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(window / 1000)),
        }
      }
    )
  }

  return handler(req)
}

// Combined authentication and rate limiting middleware
export async function withAuthAndRateLimit(
  req: NextRequest,
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>,
  rateLimitOptions: { requests?: number; window?: number } = {}
) {
  // First apply rate limiting
  const rateLimitResult = await withRateLimit(
    req, 
    async () => NextResponse.json({}), // Dummy handler for rate limit check
    rateLimitOptions
  )

  if (rateLimitResult.status === 429) {
    return rateLimitResult
  }

  // Then apply authentication
  return withAuth(req, handler)
}

// Security headers middleware
export function withSecurityHeaders(response: NextResponse): NextResponse {
  // CSRF protection
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';"
  )
  
  return response
}

// Helper to create authenticated API handler
export function createAuthenticatedHandler(
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const response = await withAuth(req, handler)
    return withSecurityHeaders(response)
  }
}

// Helper to create rate-limited API handler  
export function createRateLimitedHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: { requests?: number; window?: number } = {}
) {
  return async (req: NextRequest) => {
    const response = await withRateLimit(req, handler, options)
    return withSecurityHeaders(response)
  }
}