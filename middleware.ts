import { NextResponse, NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(req: NextRequest) {
  const { nextUrl } = req
  const path = nextUrl.pathname;
  
  // Get token to check authentication
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isLoggedIn = !!token

  // Protected routes that require authentication
  const isProtectedRoute = [
    "/budgets",
    "/transactions", 
    "/dashboard"
  ].some(route => nextUrl.pathname.startsWith(route))

  // Public routes that should redirect to dashboard if already authenticated
  const isAuthRoute = [
    "/auth/signin",
    "/auth/signup"
  ].some(route => nextUrl.pathname.startsWith(route))

  // Skip middleware for NextAuth.js API routes
  if (nextUrl.pathname.startsWith("/api/auth/")) {
    return NextResponse.next()
  }

  // Redirect authenticated users away from auth pages
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/", nextUrl))
  }

  // Redirect unauthenticated users to signin page
  if (!isLoggedIn && isProtectedRoute) {
    const callbackUrl = nextUrl.pathname + nextUrl.search
    const signinUrl = new URL("/auth/signin", nextUrl)
    signinUrl.searchParams.set("callbackUrl", callbackUrl)
    return NextResponse.redirect(signinUrl)
  }

  // Apply security headers to all responses
  const response = NextResponse.next()

  // Apply comprehensive security headers
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS (HTTP Strict Transport Security) for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}