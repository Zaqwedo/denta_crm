import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from './auth-token'

export async function checkAuthAppRouter(): Promise<boolean> {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('denta_auth')
  const payload = await verifyToken(authCookie?.value)
  return payload === 'user' || payload === 'admin'
}

export async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  const adminCookie = cookieStore.get('admin_auth')
  const payload = await verifyToken(adminCookie?.value)
  return payload === 'admin'
}

export async function checkAuthPagesRouter(req: any): Promise<boolean> {
  const authCookie = req.cookies?.denta_auth
  const payload = await verifyToken(authCookie)
  return payload === 'user' || payload === 'admin'
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}
