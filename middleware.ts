import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes chỉ admin mới vào được
const ADMIN_ROUTES = ['/admin'];

// Routes chỉ user chưa đăng nhập mới vào (login, register)
const AUTH_ROUTES = ['/login'];

// Routes cần đăng nhập
const PROTECTED_ROUTES = ['/trade', '/withdraw', '/profile', '/history', '/portfolio', '/onboarding'];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;
  const userRole = request.cookies.get('role')?.value;

  // Nếu vào trang auth mà đã có token → redirect về home
  if (AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    if (token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Nếu vào route cần đăng nhập hoặc bắt đầu bằng route cần đăng nhập mà chưa có token → về login
  if (PROTECTED_ROUTES.some(r => pathname.startsWith(r))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Nếu vào admin mà không phải admin → về home
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/trade/:path*', '/withdraw/:path*', '/profile/:path*', '/history/:path*', '/portfolio/:path*', '/onboarding/:path*'],
};
