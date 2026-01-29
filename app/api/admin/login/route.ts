import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable must be set. Please configure it in your .env.local file or Vercel environment variables.')
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Устанавливаем cookie для админа
    const cookieStore = await cookies()
    const maxAge = 30 * 24 * 60 * 60 // 30 дней

    cookieStore.set('admin_auth', 'valid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    })

    // Также устанавливаем denta_auth для доступа к основным страницам
    cookieStore.set('denta_auth', 'valid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    })

    // КРИТИЧНО: Инвалидируем кеш страницы пациентов при входе админа
    // Это гарантирует, что данные будут перезагружены с правами админа
    revalidatePath('/patients')
    revalidatePath('/calendar')
    revalidatePath('/patients/changes')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('admin_auth')

    // КРИТИЧНО: Инвалидируем кеш при выходе из админки
    // Это гарантирует, что данные будут перезагружены с правильными правами доступа
    revalidatePath('/patients')
    revalidatePath('/calendar')
    revalidatePath('/patients/changes')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
