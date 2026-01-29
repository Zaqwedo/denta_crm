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
        { error: `Слишком много попыток. Попробуйте через ${resetTime} минут.` },
        { status: 429 }
      )
    }

    const { email, newPassword, confirmPassword } = await req.json()

    if (!email || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Пароли не совпадают' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    
    // Проверяем, существует ли пользователь
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .single()

    const passwordHash = hashPassword(newPassword)
    
    console.log('Reset password attempt:', {
      email: normalizedEmail,
      userExists: !!user,
      userError: userError?.message,
      passwordHashLength: passwordHash.length
    })

    if (userError || !user) {
      // Если пользователя нет, создаем нового (регистрация после сброса пароля)
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          email: normalizedEmail,
          password_hash: passwordHash,
          first_name: normalizedEmail.split('@')[0],
        })
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          // Если все еще есть конфликт, пробуем обновить существующего
          const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('email', normalizedEmail)

          if (updateError) {
            console.error('Password reset update error:', updateError)
            return NextResponse.json(
              { error: 'Ошибка при сбросе пароля' },
              { status: 500 }
            )
          }

          console.log('Password reset: updated existing user after conflict')
          return NextResponse.json({
            success: true,
            message: 'Пароль успешно сброшен',
          })
        }

        console.error('Password reset insert error:', insertError)
        return NextResponse.json(
          { error: 'Ошибка при сбросе пароля' },
          { status: 500 }
        )
      }

      console.log('Password reset: created new user')
      return NextResponse.json({
        success: true,
        message: 'Пароль успешно установлен. Теперь вы можете войти.',
      })
    } else {
      // Если пользователь существует, обновляем пароль
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('email', normalizedEmail)
        .select()

      if (updateError) {
        console.error('Password reset update error:', updateError)
        return NextResponse.json(
          { error: 'Ошибка при сбросе пароля' },
          { status: 500 }
        )
      }

      // Проверяем, что обновление прошло успешно
      if (!updatedUser || updatedUser.length === 0) {
        console.error('Password reset: no rows updated')
        return NextResponse.json(
          { error: 'Пользователь не найден для обновления' },
          { status: 404 }
        )
      }

      console.log('Password reset: updated existing user', {
        email: normalizedEmail,
        updated: updatedUser.length > 0
      })
      
      return NextResponse.json({
        success: true,
        message: 'Пароль успешно сброшен',
      })
    }
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
