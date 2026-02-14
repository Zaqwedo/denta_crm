import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyPin } from '@/lib/password'
import { createToken } from '@/lib/auth-token'
import { rateLimiter, getClientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
    try {
        const clientIp = getClientIp(req)
        const isDevelopment = process.env.NODE_ENV === 'development'

        // Лимит для PIN более строгий - 5 попыток / 15 мин
        if (!isDevelopment) {
            const isAllowed = rateLimiter.check(`pin_login_${clientIp}`, 5, 15 * 60 * 1000)
            if (!isAllowed) {
                const resetTime = Math.ceil(rateLimiter.getResetTime(`pin_login_${clientIp}`) / 1000 / 60)
                return NextResponse.json(
                    { error: `Слишком много попыток. Попробуйте через ${resetTime} минут.` },
                    { status: 429 }
                )
            }
        }

        const { email, pin } = await req.json()

        if (!email || !pin) {
            return NextResponse.json({ error: 'Email и PIN обязательны' }, { status: 400 })
        }

        const normalizedEmail = email.toLowerCase().trim()
        console.log('PIN login attempt for:', normalizedEmail)

        const supabaseAdmin = getSupabaseAdmin()

        // 1. Ищем пользователя в БД
        const { data: user, error: dbError } = await supabaseAdmin
            .from('users')
            .select('pin_code_hash, id, first_name, last_name, email')
            .eq('email', normalizedEmail)
            .maybeSingle()

        if (dbError) {
            console.error('CRITICAL: Database error during PIN login:', dbError)
            return NextResponse.json({ error: 'ошибка базы данных', details: dbError.message }, { status: 500 })
        }

        console.log('User found for PIN login:', {
            found: !!user,
            hasHash: !!user?.pin_code_hash,
            userId: user?.id
        })

        if (!user || !user.pin_code_hash) {
            return NextResponse.json({ error: 'PIN-код не установлен для этого пользователя' }, { status: 401 })
        }

        // 2. Проверяем PIN
        console.log('Verifying PIN...')
        const isValid = await verifyPin(pin, user.pin_code_hash)
        console.log('PIN verification result:', isValid)

        if (!isValid) {
            return NextResponse.json({ error: 'Неверный PIN-код' }, { status: 401 })
        }

        // 3. Успешный вход - устанавливаем сессию
        console.log('PIN login successful, setting cookies...')
        const maxAge = 30 * 24 * 60 * 60

        try {
            console.log('Step 1: Get cookies()')
            const cookieStore = await cookies()

            console.log('Step 2: Create token')
            const token = await createToken('user')

            console.log('Step 3: Set denta_auth cookie')
            cookieStore.set('denta_auth', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge,
                path: '/',
            })

            console.log('Step 4: Set denta_user_email cookie')
            cookieStore.set('denta_user_email', normalizedEmail, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge,
                path: '/',
            })

            console.log('Cookies set successfully')
        } catch (cookieError: unknown) {
            const cookieErrorObj = (typeof cookieError === 'object' && cookieError !== null)
                ? (cookieError as Record<string, unknown>)
                : {}

            console.error('FAILED at cookie operations:', {
                name: cookieErrorObj.name,
                message: cookieErrorObj.message,
                stack: cookieErrorObj.stack
            })
            return NextResponse.json({
                error: 'Ошибка при создании сессии',
                details: cookieErrorObj.message,
                step: 'cookie_setup'
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                first_name: user.first_name || normalizedEmail.split('@')[0],
                last_name: user.last_name || '',
                email: user.email,
            }
        })

    } catch (error: unknown) {
        const errorObj = (typeof error === 'object' && error !== null)
            ? (error as Record<string, unknown>)
            : {}

        console.error('PIN login top-level CRASH:', {
            name: errorObj.name,
            message: errorObj.message,
            stack: errorObj.stack
        })
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            details: errorObj.message,
            type: errorObj.name
        }, { status: 500 })
    }
}
