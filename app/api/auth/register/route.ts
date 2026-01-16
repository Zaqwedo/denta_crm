import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rateLimiter, getClientIp } from '@/lib/rate-limit'
import crypto from 'crypto'

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req)
    const isAllowed = rateLimiter.check(clientIp, 5, 15 * 60 * 1000)

    if (!isAllowed) {
      const resetTime = Math.ceil(rateLimiter.getResetTime(clientIp) / 1000 / 60)
      return NextResponse.json(
        { error: `Слишком много попыток регистрации. Попробуйте через ${resetTime} минут.` },
        { status: 429 }
      )
    }

    const { email, password, confirmPassword } = await req.json()

    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Неверный формат email' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Пароли не совпадают' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      )
    }

    const passwordHash = hashPassword(password)

    const { data, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        first_name: email.split('@')[0],
      })
      .select()
      .single()

    if (error) {
      console.error('Registration Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Пользователь с таким email уже зарегистрирован' },
          { status: 409 }
        )
      }
      
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Таблица users не найдена. Выполните SQL скрипт supabase-setup-users.sql в Supabase.' },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: `Ошибка при регистрации: ${error.message || 'Неизвестная ошибка'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Регистрация успешна! Теперь вы можете войти.',
    })
  } catch (error: any) {
    console.error('Registration catch error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { error: `Внутренняя ошибка сервера: ${error?.message || 'Неизвестная ошибка'}` },
      { status: 500 }
    )
  }
}
