import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { rateLimiter, getClientIp } from '@/lib/rate-limit'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { getWhitelistEmails } from '@/lib/admin-db'
import { revalidatePath } from 'next/cache'
import { createToken } from '@/lib/auth-token'

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

        // Устанавливаем обе cookies для админа (с подписью)
        cookieStore.set('denta_auth', await createToken('admin'), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge,
          path: '/',
        })

        // Устанавливаем admin_auth для проверки прав админа (с подписью)
        cookieStore.set('admin_auth', await createToken('admin'), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge,
          path: '/',
        })

        // Инвалидируем кеш при входе админа
        revalidatePath('/patients')
        revalidatePath('/calendar')
        revalidatePath('/patients/changes')

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
    const normalizedEmail = email.toLowerCase().trim()
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single()

    if (error || !user) {
      console.error('Login user not found:', {
        email: normalizedEmail,
        error: error?.message,
        errorCode: error?.code
      })
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    // Проверяем, установлен ли пароль
    // Пустая строка также считается как "пароль не установлен" (временное решение до выполнения SQL скрипта)
    if (!user.password_hash || user.password_hash.trim() === '') {
      return NextResponse.json(
        { error: 'Пароль не установлен. Обратитесь к администратору или зарегистрируйтесь заново.' },
        { status: 401 }
      )
    }

    console.log('Login attempt:', {
      email: normalizedEmail,
      hasPasswordHash: !!user.password_hash,
      passwordHashLength: user.password_hash?.length
    })

    const isValidPassword = verifyPassword(password, user.password_hash)

    console.log('Password verification:', {
      isValid: isValidPassword,
      email: normalizedEmail
    })

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      )
    }

    // Проверяем whitelist для email авторизации
    try {
      // Проверяем все providers, так как email может быть в любом из них
      const allWhitelistEmails = await getWhitelistEmails(undefined) // Получаем все email без фильтра по provider
      const emailWhitelist = await getWhitelistEmails('email') // Только для email provider

      const allNormalized = allWhitelistEmails.map(e => ({
        email: (e.email || '').toLowerCase().trim(),
        provider: e.provider
      })).filter(e => e.email)

      const emailNormalized = emailWhitelist.map(e => (e.email || '').toLowerCase().trim()).filter(e => e)

      console.log('Email login whitelist check (detailed):', {
        userEmail: normalizedEmail,
        allWhitelistEmails: allNormalized,
        emailProviderWhitelist: emailNormalized,
        isInAllList: allNormalized.some(e => e.email === normalizedEmail),
        isInEmailList: emailNormalized.includes(normalizedEmail),
        allCount: allNormalized.length,
        emailCount: emailNormalized.length
      })

      // Проверяем в общем списке (любой provider) или в списке для email
      const isInWhitelist = allNormalized.some(e => e.email === normalizedEmail) || emailNormalized.includes(normalizedEmail)

      // Если есть хотя бы один email в whitelist и текущий email не в списке - запрещаем
      const totalWhitelistCount = allNormalized.length
      if (totalWhitelistCount > 0 && !isInWhitelist) {
        console.log('Email not in whitelist, access denied:', {
          userEmail: normalizedEmail,
          availableEmails: allNormalized.map(e => `${e.email} (${e.provider})`)
        })
        return NextResponse.json(
          { error: 'Доступ запрещен. Ваш email не в списке разрешенных.' },
          { status: 403 }
        )
      }
    } catch (whitelistError) {
      console.error('Error checking whitelist:', whitelistError)
      // Если ошибка при проверке whitelist, разрешаем вход (fallback)
      // Но логируем ошибку для отладки
    }

    const cookieStore = await cookies()
    const maxAge = 30 * 24 * 60 * 60
    const userEmail = email.toLowerCase().trim()

    // Устанавливаем подписанную куку
    cookieStore.set('denta_auth', await createToken('user'), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    })

    // Удаляем admin_auth cookie при обычном входе (если была установлена ранее)
    cookieStore.delete('admin_auth')

    // Сохраняем email в cookie для фильтрации пациентов
    cookieStore.set('denta_user_email', userEmail, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    })

    // КРИТИЧНО: Инвалидируем кеш страницы пациентов при перелогинивании
    // Это гарантирует, что данные будут перезагружены с правильными правами доступа
    revalidatePath('/patients')
    revalidatePath('/calendar')
    revalidatePath('/patients/changes')

    return NextResponse.json({
      success: true,
      isAdmin: false,
      needsPinSetup: !user.pin_code_hash,
      user: {
        id: user.id,
        first_name: user.first_name || email.split('@')[0],
        last_name: user.last_name || '',
        username: user.email,
        email: user.email,
      }
    })
  } catch (error: any) {
    console.error('Email login error:', {
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
