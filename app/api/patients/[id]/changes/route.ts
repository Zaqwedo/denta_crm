// app/api/patients/[id]/changes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPatientChanges } from '@/lib/supabase-db'
import { checkAuthAppRouter, unauthorizedResponse } from '@/lib/auth-check'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Проверка авторизации
  const isAuthenticated = await checkAuthAppRouter()
  
  if (!isAuthenticated) {
    return unauthorizedResponse()
  }

  try {
    const { id } = await params
    const changes = await getPatientChanges(id)
    return NextResponse.json({ success: true, changes })
  } catch (error) {
    console.error('Ошибка получения изменений:', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении изменений' },
      { status: 500 }
    )
  }
}
