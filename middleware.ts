import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth-token'

export async function middleware(request: NextRequest) {
  // Проверяем, является ли запрос к админским маршрутам
  const adminPaths = ['/admin/dashboard']
  const isAdminPath = adminPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isAdminPath) {
    // Для админских маршрутов проверяем наличие admin_auth cookie с ролью admin
    const adminCookie = request.cookies.get('admin_auth')
    const payload = await verifyToken(adminCookie?.value)

    if (payload !== 'admin') {
      // Если админской куки нет или она невалидна, перенаправляем на страницу входа в админку
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // Проверяем, является ли запрос к защищенным маршрутам
  const protectedPaths = ['/', '/patients', '/calendar', '/new', '/patients/card-index', '/patients/changes']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/'))

  if (isProtectedPath) {
    // Пропускаем проверку для OAuth callback redirects
    // Cookies будут установлены после редиректа, GoogleAuthHandler обработает авторизацию
    const isOAuthCallback = request.nextUrl.searchParams.has('google_auth') ||
      request.nextUrl.searchParams.has('yandex_auth')

    if (isOAuthCallback) {
      console.log('🔓 Skipping middleware auth check for OAuth callback redirect')
      return NextResponse.next()
    }

    // Проверяем наличие валидной куки аутентификации
    const authCookie = request.cookies.get('denta_auth')
    const payload = await verifyToken(authCookie?.value)

    if (!payload || (payload !== 'user' && payload !== 'admin')) {
      // Если куки нет или она невалидна, перенаправляем на страницу входа
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page - excluded to prevent loops)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}