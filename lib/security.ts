import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// CSRF Token Management
export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_HEADER = 'x-csrf-token';
  private static readonly TOKEN_COOKIE = 'csrf-token';

  static generateToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  static validateToken(request: NextRequest): boolean {
    // Skip CSRF validation for GET and HEAD requests
    if (['GET', 'HEAD'].includes(request.method)) {
      return true;
    }

    const headerToken = request.headers.get(this.TOKEN_HEADER);
    const cookieToken = request.cookies.get(this.TOKEN_COOKIE)?.value;

    if (!headerToken || !cookieToken) {
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(headerToken),
      Buffer.from(cookieToken)
    );
  }

  static setTokenCookie(response: NextResponse): void {
    const token = this.generateToken();
    response.cookies.set(this.TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }
}

// Security Headers
export function setSecurityHeaders(response: NextResponse): void {
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
    "upgrade-insecure-requests",
  ];

  // Apply security headers
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
}

// Input Sanitization
export class InputSanitizer {
  // Remove dangerous HTML and script tags
  static sanitizeHTML(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  }

  // Validate and sanitize email
  static sanitizeEmail(email: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!emailRegex.test(trimmedEmail)) {
      return null;
    }
    
    return trimmedEmail;
  }

  // Validate and sanitize numeric input
  static sanitizeNumber(value: any, min?: number, max?: number): number | null {
    const num = Number(value);
    
    if (isNaN(num)) {
      return null;
    }
    
    if (min !== undefined && num < min) {
      return null;
    }
    
    if (max !== undefined && num > max) {
      return null;
    }
    
    return num;
  }

  // Sanitize SQL-like input to prevent SQL injection
  static sanitizeSQL(input: string): string {
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }

  // Validate UUID format
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

// Audit Logging
export interface AuditLog {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  static async log(entry: AuditLog): Promise<void> {
    // In production, this would write to a dedicated audit log service
    // For now, we'll use console.log with a structured format
    const logEntry = {
      ...entry,
      timestamp: entry.timestamp.toISOString(),
      environment: process.env.NODE_ENV,
    };

    if (process.env.NODE_ENV === 'production') {
      // Send to logging service (e.g., CloudWatch, Datadog, etc.)
      console.log('[AUDIT]', JSON.stringify(logEntry));
    } else {
      console.log('[AUDIT]', logEntry);
    }
  }

  static async logRequest(
    request: NextRequest,
    userId?: string,
    action?: string
  ): Promise<void> {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwarded?.split(',')[0] || realIp || 'unknown';

    await this.log({
      userId,
      action: action || `${request.method} ${request.nextUrl.pathname}`,
      resource: request.nextUrl.pathname,
      ipAddress,
      userAgent: request.headers.get('user-agent') || undefined,
      timestamp: new Date(),
      success: true,
      metadata: {
        method: request.method,
        query: Object.fromEntries(request.nextUrl.searchParams),
      },
    });
  }
}

// Password Security
export class PasswordValidator {
  static readonly MIN_LENGTH = 8;
  static readonly REQUIRE_UPPERCASE = true;
  static readonly REQUIRE_LOWERCASE = true;
  static readonly REQUIRE_NUMBER = true;
  static readonly REQUIRE_SPECIAL = true;

  static validate(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    }

    if (this.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.REQUIRE_NUMBER && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.REQUIRE_SPECIAL && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common, please choose a stronger password');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static generateStrongPassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = uppercase + lowercase + numbers + special;

    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    for (let i = 4; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

// Session Security
export class SessionManager {
  static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  static readonly ABSOLUTE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  static validateSession(session: any): boolean {
    if (!session || !session.createdAt || !session.lastActivity) {
      return false;
    }

    const now = Date.now();
    const createdAt = new Date(session.createdAt).getTime();
    const lastActivity = new Date(session.lastActivity).getTime();

    // Check absolute timeout
    if (now - createdAt > this.ABSOLUTE_TIMEOUT) {
      return false;
    }

    // Check idle timeout
    if (now - lastActivity > this.SESSION_TIMEOUT) {
      return false;
    }

    return true;
  }

  static refreshSession(session: any): any {
    return {
      ...session,
      lastActivity: new Date().toISOString(),
    };
  }
}

// Export middleware function for easy integration
export async function applySecurityMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  // Validate CSRF token for state-changing requests
  if (!['GET', 'HEAD'].includes(request.method)) {
    if (!CSRFProtection.validateToken(request)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
  }

  // Execute the handler
  const response = await handler();

  // Apply security headers
  setSecurityHeaders(response);

  // Set CSRF token for new sessions
  if (!request.cookies.get(CSRFProtection['TOKEN_COOKIE'])) {
    CSRFProtection.setTokenCookie(response);
  }

  return response;
}