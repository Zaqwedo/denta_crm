import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth-token'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies()
        const authCookie = cookieStore.get('denta_auth')
        const userEmail = cookieStore.get('denta_user_email')?.value
        const savedChallenge = cookieStore.get('denta_biometric_challenge')?.value

        // 1. Проверяем авторизацию
        const payload = await verifyToken(authCookie?.value)
        if (!payload || !userEmail) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Получаем данные из запроса
        const { credentialId, publicKey, challenge } = await req.json()

        // 3. Проверяем challenge
        if (!savedChallenge || challenge !== savedChallenge) {
            return NextResponse.json({ error: 'Invalid challenge' }, { status: 400 })
        }

        // 4. Сохраняем в новую таблицу биометрии
        const supabaseAdmin = getSupabaseAdmin()
        const { error } = await supabaseAdmin
            .from('user_biometrics')
            .upsert({
                user_email: userEmail,
                credential_id: credentialId,
                public_key: publicKey,
                device_name: req.headers.get('user-agent')?.slice(0, 100) || 'Unknown Device'
            }, { onConflict: 'credential_id' })

        if (error) {
            console.error('Supabase error saving biometrics:', error)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // Очищаем challenge
        const response = NextResponse.json({ success: true, message: 'Биометрия успешно подключена' })
        response.cookies.delete('denta_biometric_challenge')

        return response

    } catch (error) {
        console.error('Biometric verify error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
