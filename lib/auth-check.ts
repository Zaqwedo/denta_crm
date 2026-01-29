import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function checkAuthAppRouter(): Promise<boolean> {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('denta_auth')
  return authCookie?.value === 'valid'
}

export async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  const adminCookie = cookieStore.get('admin_auth')
  return adminCookie?.value === 'valid'
}

export function checkAuthPagesRouter(req: any): boolean {
  const authCookie = req.cookies?.denta_auth
  return authCookie === 'valid'
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}
