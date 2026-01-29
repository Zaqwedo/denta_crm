import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rateLimiter, getClientIp } from '@/lib/rate-limit'
import crypto from 'crypto'

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':')
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return hash === verifyHash
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req)
    const isAllowed = rateLimiter.check(clientIp, 5, 15 * 60 * 1000)

    if (!isAllowed) {
      const resetTime = Math.ceil(rateLimiter.getResetTime(clientIp) / 1000 / 60)
      return NextResponse.json(
        { error: `Слишком много попыток. Попробуйте через ${resetTime} минут.` },
        { status: 429 }
      )
    }

    const { email, currentPassword, newPassword, confirmPassword } = await req.json()

    if (!email || !currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Новые пароли не совпадают' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Новый пароль должен содержать минимум 6 символов' },
        { status: 400 }
      )
    }

    // Проверяем текущий пароль
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Пользователь с таким email не найден' },
        { status: 404 }
      )
    }

    const isValidPassword = verifyPassword(currentPassword, user.password_hash)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Неверный текущий пароль' },
        { status: 401 }
      )
    }

    // Обновляем пароль
    const newPasswordHash = hashPassword(newPassword)
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('email', email.toLowerCase().trim())

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { error: 'Ошибка при обновлении пароля' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Пароль успешно изменен',
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
