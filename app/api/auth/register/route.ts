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
    
    // Временно отключаем rate limiting в режиме разработки
    const isDevelopment = process.env.NODE_ENV === 'development'
    if (!isDevelopment) {
      const isAllowed = rateLimiter.check(clientIp, 5, 15 * 60 * 1000)

      if (!isAllowed) {
        const resetTime = Math.ceil(rateLimiter.getResetTime(clientIp) / 1000 / 60)
        return NextResponse.json(
          { error: `Слишком много попыток регистрации. Попробуйте через ${resetTime} минут.` },
          { status: 429 }
        )
      }
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
    const normalizedEmail = email.toLowerCase().trim()

    // Сначала проверяем, существует ли пользователь
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('email', normalizedEmail)
      .maybeSingle() // Используем maybeSingle вместо single - не выбрасывает ошибку если не найдено

    // maybeSingle возвращает null если не найдено, но может быть ошибка при других проблемах
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found (это нормально)
      console.error('Registration: error checking user', {
        email: normalizedEmail,
        error: checkError
      })
      return NextResponse.json(
        { error: `Ошибка при проверке пользователя: ${checkError.message || 'Неизвестная ошибка'}` },
        { status: 500 }
      )
    }

    console.log('Registration: checking existing user', {
      email: normalizedEmail,
      exists: !!existingUser,
      hasPassword: !!existingUser?.password_hash,
      userId: existingUser?.id
    })

    // Если пользователь существует (даже с NULL password_hash), обновляем пароль
    if (existingUser) {
      console.log('Registration: user exists, updating password', {
        email: normalizedEmail,
        userId: existingUser.id,
        hasPassword: !!existingUser.password_hash
      })

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('email', normalizedEmail)
        .select()

      if (updateError) {
        console.error('Registration update error:', {
          error: updateError,
          email: normalizedEmail,
          userId: existingUser.id
        })
        return NextResponse.json(
          { error: `Ошибка при регистрации: ${updateError.message || 'Неизвестная ошибка'}` },
          { status: 500 }
        )
      }

      if (!updatedUser || updatedUser.length === 0) {
        console.error('Registration: no rows updated', {
          email: normalizedEmail,
          existingUserId: existingUser.id,
          updateError: updateError
        })
        // Пробуем еще раз с более точным условием
        const { data: retryUpdate, error: retryError } = await supabase
          .from('users')
          .update({ password_hash: passwordHash })
          .eq('id', existingUser.id)
          .select()

        if (retryError || !retryUpdate || retryUpdate.length === 0) {
          return NextResponse.json(
            { error: 'Ошибка при обновлении пароля. Попробуйте еще раз.' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Пароль успешно установлен. Теперь вы можете войти.',
        })
      }

      console.log('Registration: updated existing user password', {
        email: normalizedEmail,
        updated: updatedUser.length > 0
      })

      return NextResponse.json({
        success: true,
        message: 'Пароль успешно установлен. Теперь вы можете войти.',
      })
    }

    // Если пользователя нет, создаем нового
    console.log('Registration: creating new user', {
      email: normalizedEmail
    })

    const { data, error } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        password_hash: passwordHash,
        first_name: normalizedEmail.split('@')[0],
      })
      .select()
      .single()

    if (error) {
      console.error('Registration Supabase error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        email: normalizedEmail
      })
      
      if (error.code === '23505') {
        // Если все еще есть конфликт (пользователь существует), пробуем обновить пароль
        // Это может произойти если пользователь был создан между проверкой и вставкой
        console.log('Registration: unique violation, trying to update existing user')
        
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ password_hash: passwordHash })
          .eq('email', normalizedEmail)
          .select()

        if (updateError) {
          console.error('Registration update after conflict error:', updateError)
          return NextResponse.json(
            { error: 'Пользователь с таким email уже зарегистрирован. Используйте "Сброс пароля" если забыли пароль.' },
            { status: 409 }
          )
        }

        if (!updatedUser || updatedUser.length === 0) {
          console.error('Registration: no rows updated after conflict', {
            email: normalizedEmail
          })
          return NextResponse.json(
            { error: 'Ошибка при обновлении пароля. Попробуйте еще раз.' },
            { status: 500 }
          )
        }

        console.log('Registration: updated user after conflict', {
          email: normalizedEmail,
          updated: updatedUser.length > 0
        })

        return NextResponse.json({
          success: true,
          message: 'Пароль успешно установлен. Теперь вы можете войти.',
        })
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
