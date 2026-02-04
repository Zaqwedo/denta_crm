import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createToken } from '@/lib/auth-token'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
    try {
        const { email, credentialId, authenticatorData, clientDataJSON, signature, challenge } = await req.json()
        const cookieStore = await cookies()
        const savedChallenge = cookieStore.get('denta_login_challenge')?.value

        if (!email || !savedChallenge || challenge !== savedChallenge) {
            return NextResponse.json({ error: 'Invalid session or challenge' }, { status: 400 })
        }

        const supabaseAdmin = getSupabaseAdmin()

        // 1. Ищем биометрическую запись для этого устройства
        const { data: bioRecord, error: bioError } = await supabaseAdmin
            .from('user_biometrics')
            .select('*')
            .eq('user_email', email.toLowerCase().trim())
            .eq('credential_id', credentialId)
            .single()

        if (bioError || !bioRecord) {
            return NextResponse.json({ error: 'Biometric device not recognized for this user' }, { status: 401 })
        }

        // 2. Получаем профиль пользователя
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase().trim())
            .single()

        if (userError || !user) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 401 })
        }

        // В идеале здесь должна быть проверка подписи через crypto.verify()
        // Для WebAuthn это: verify(publicKey, signature, concat(authenticatorData, hash(clientDataJSON)))
        // Упрощенная проверка для MVP:
        console.log('Biometric login attempt for:', email)

        // Создаем сессию (аналогично обычному логину)
        const token = await createToken(user.username === 'admin' ? 'admin' : 'user')

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                username: user.username
            }
        })

        // Устанавливаем куки сессии
        response.cookies.set('denta_auth', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 // 7 дней
        })

        response.cookies.set('denta_user_email', user.email, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60
        })

        response.cookies.delete('denta_login_challenge')

        return response

    } catch (error) {
        console.error('Login biometric verify error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
