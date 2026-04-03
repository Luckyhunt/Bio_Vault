import { NextResponse, NextRequest } from 'next/server';
// ⚠️ DO NOT import @/config/env here. Middleware runs on Edge Runtime.
// Use process.env directly for security and performance.

/**
 * 🔒 BioVault Security Middleware (Elite Phase 2 - User Implementation)
 */

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // ✅ Safe CSP Build (Direct Env Access for Edge Runtime)
  const PIMLICO_URL = process.env.NEXT_PUBLIC_PIMLICO_URL || 'https://api.pimlico.io';
  const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || '';
  const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || '';
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  const connectSrc = [
    "'self'",
    SUPABASE_URL,
    PIMLICO_URL,
    RPC_URL,
    EXPLORER_URL,
  ].filter(Boolean).join(' ');

  const SECURITY_HEADERS = {
    'Content-Security-Policy': `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval';
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: https:;
      connect-src ${connectSrc};
    `.replace(/\s{2,}/g, ' '), // Clean up whitespace

    'Strict-Transport-Security':
      'max-age=31536000; includeSubDomains; preload',

    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=()',
  };

  // Apply headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // ✅ Safe IP detection with fallback
  // This satisfies TS and provides robust detection in Vercel/Node runtimes
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    (request as any).ip ||
    'unknown';

  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/api/auth');

  // Simple Rate-Limiting Headers (Foundation for Upstash/Redis)
  if (isAuthRoute) {
    response.headers.set('X-RateLimit-Limit', '10');
    response.headers.set('X-RateLimit-Remaining', '9');
    response.headers.set('X-Client-IP', ip);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
};
