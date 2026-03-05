import { auth } from '@/lib/auth';
import { NextResponse, type NextRequest } from 'next/server';

const publicRoutes = ['/login', '/signup', '/', '/api/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is public
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get session
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?callbackUrl=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }

  // Add user info to headers for use in route handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', session.user?.id || '');
  requestHeaders.set('x-user-email', session.user?.email || '');

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - public folder
    '/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
