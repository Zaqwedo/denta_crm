import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth-check'

/**
 * API endpoint для проверки админских прав
 * Используется на клиенте для проверки доступа к админ-панели
 */
export async function GET() {
  try {
    const isAdmin = await checkAdminAuth()
    
    if (!isAdmin) {
      return NextResponse.json(
        { isAdmin: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({ isAdmin: true })
  } catch (error) {
    console.error('Admin auth check error:', error)
    return NextResponse.json(
      { isAdmin: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
