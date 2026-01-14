import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Проверяет авторизацию для App Router (app/api/)
 */
export async function checkAuthAppRouter(): Promise<boolean> {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('denta_auth')
  return authCookie?.value === 'valid'
}

/**
 * Проверяет авторизацию для Pages Router (pages/api/)
 */
export function checkAuthPagesRouter(req: any): boolean {
  const authCookie = req.cookies?.denta_auth
  return authCookie === 'valid'
}

/**
 * Возвращает 401 ответ для App Router
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}