import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth-token'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies()
        const authCookie = cookieStore.get('denta_auth')
        const userEmail = cookieStore.get('denta_user_email')?.value

        // Проверяем авторизацию
        const payload = await verifyToken(authCookie?.value)
        if (!payload || !userEmail) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Генерируем случайный challenge
        const challenge = crypto.randomBytes(32).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '')

        // Сохраняем challenge в куки на короткое время (5 минут)
        const response = NextResponse.json({
            challenge,
            user: {
                id: Buffer.from(userEmail).toString('base64'),
                name: userEmail,
                displayName: userEmail
            }
        })

        response.cookies.set('denta_biometric_challenge', challenge, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 300 // 5 минут
        })

        return response

    } catch (error) {
        console.error('Biometric challenge error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
