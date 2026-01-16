import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rateLimiter, getClientIp } from '@/lib/rate-limit'
import crypto from 'crypto'
import { cookies } from 'next/headers'

function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':')
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return hash === verifyHash
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req)
    const isAllowed = rateLimiter.check(clientIp, 10, 15 * 60 * 1000)

    if (!isAllowed) {
      const resetTime = Math.ceil(rateLimiter.getResetTime(clientIp) / 1000 / 60)
      return NextResponse.json(
        { error: `Слишком много попыток входа. Попробуйте через ${resetTime} минут.` },
        { status: 429 }
      )
    }

    const { email, password } = await req.json()

    if (!password) {
      return NextResponse.json(
        { error: 'Пароль обязателен' },
        { status: 400 }
      )
    }

    // Проверяем админский вход (без email, только пароль)
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!email || email.trim() === '') {
      if (adminPassword && password === adminPassword) {
        const cookieStore = await cookies()
        const maxAge = 30 * 24 * 60 * 60
        
        cookieStore.set('denta_auth', 'valid', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge,
          path: '/',
        })

        return NextResponse.json({
          success: true,
          isAdmin: true,
          user: {
            id: 1,
            first_name: 'Admin',
            username: 'admin',
            last_name: '',
          }
        })
      } else {
        return NextResponse.json(
          { error: 'Неверный пароль' },
          { status: 401 }
        )
      }
    }

    // Обычный вход по email и паролю
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    const isValidPassword = verifyPassword(password, user.password_hash)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    const cookieStore = await cookies()
    const maxAge = 30 * 24 * 60 * 60
    
    cookieStore.set('denta_auth', 'valid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    })

    return NextResponse.json({
      success: true,
      isAdmin: false,
      user: {
        id: user.id,
        first_name: user.first_name || email.split('@')[0],
        last_name: user.last_name || '',
        username: user.email,
        email: user.email,
      }
    })
  } catch (error) {
    console.error('Email login error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
