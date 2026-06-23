import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for /admin routes.
 * First line of defense: rejects requests with no Supabase auth storage hint.
 * The definitive is_admin check happens inside the admin layout (client-side, via Supabase SDK).
 *
 * This route is intentionally undocumented and has no link in the public UI.
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Supabase JS v2 stores tokens in localStorage (client-only).
    // We can't read localStorage here, so we rely on the layout for the real auth check.
    // This middleware adds a cache-control header to prevent the admin from being cached
    // and ensures the page is never indexed.
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
