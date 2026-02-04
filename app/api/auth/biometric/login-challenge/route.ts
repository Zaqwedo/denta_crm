import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json()
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        const supabaseAdmin = getSupabaseAdmin()

        // Получаем ВСЕ credential_id для пользователя
        const { data: biometrics, error } = await supabaseAdmin
            .from('user_biometrics')
            .select('credential_id')
            .eq('user_email', email.toLowerCase().trim())

        if (error || !biometrics || biometrics.length === 0) {
            return NextResponse.json({ error: 'Biometrics not enabled for this user' }, { status: 404 })
        }

        // Генерируем challenge
        const challenge = crypto.randomBytes(32).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '')

        const response = NextResponse.json({
            challenge,
            allowCredentials: biometrics.map(b => ({
                id: b.credential_id,
                type: 'public-key',
                transports: ['internal']
            }))
        })

        // Сохраняем challenge в куки
        response.cookies.set('denta_login_challenge', challenge, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 300
        })

        return response

    } catch (error) {
        console.error('Login challenge error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
