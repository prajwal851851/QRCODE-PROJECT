import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('adminAccessToken')?.value || '';
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/admin/login') ||
    request.nextUrl.pathname.startsWith('/admin/signup') ||
    request.nextUrl.pathname.startsWith('/admin/forgot-password');

  if (isAdminRoute && !isAuthRoute && !accessToken) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
}; 