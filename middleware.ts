import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Проверяем, является ли запрос к админским маршрутам
  const adminPaths = ['/admin/dashboard']
  const isAdminPath = adminPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isAdminPath) {
    // Для админских маршрутов проверяем наличие admin_auth cookie
    const adminCookie = request.cookies.get('admin_auth')

    if (!adminCookie || adminCookie.value !== 'valid') {
      // Если админской куки нет или она невалидна, перенаправляем на страницу входа в админку
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // Проверяем, является ли запрос к защищенным маршрутам
  const protectedPaths = ['/patients', '/calendar', '/new']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtectedPath) {
    // Проверяем наличие валидной куки аутентификации
    const authCookie = request.cookies.get('denta_auth')

    if (!authCookie || authCookie.value !== 'valid') {
      // Если куки нет или она невалидна, перенаправляем на страницу входа
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Проверяем, если пользователь уже авторизован и пытается зайти на страницу входа
  if (request.nextUrl.pathname === '/login') {
    const authCookie = request.cookies.get('denta_auth')

    if (authCookie && authCookie.value === 'valid') {
      // Если кука валидна, перенаправляем в CRM
      return NextResponse.redirect(new URL('/patients', request.url))
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
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
}