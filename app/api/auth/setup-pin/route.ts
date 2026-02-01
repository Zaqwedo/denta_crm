import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth-token'
import { hashPin } from '@/lib/password'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
    try {
        const supabaseAdmin = getSupabaseAdmin()
        const cookieStore = await cookies()
        const authCookie = cookieStore.get('denta_auth')
        const userEmailCookie = cookieStore.get('denta_user_email')

        // 1. Проверяем авторизацию
        const payload = await verifyToken(authCookie?.value)
        console.log('Setup PIN payload check:', { payload, hasCookie: !!authCookie })
        if (!payload || (payload !== 'user' && payload !== 'admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Получаем email пользователя
        const email = userEmailCookie?.value
        console.log('Setup PIN email check:', { email, cookieValue: userEmailCookie?.value })
        if (!email && payload !== 'admin') {
            return NextResponse.json({ error: 'User email not found' }, { status: 400 })
        }

        // 3. Получаем PIN из тела запроса
        const { pin } = await req.json()
        console.log('Setup PIN request data:', { hasPin: !!pin, pinLength: pin?.length })
        if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d+$/.test(pin)) {
            return NextResponse.json({ error: 'PIN must be 4 digits' }, { status: 400 })
        }

        // 4. Хешируем PIN
        const hashedPin = await hashPin(pin)

        // 5. Сохраняем/Обновляем в БД
        const targetEmail = email || 'admin@denta-crm.local'
        console.log('Saving PIN to DB for:', targetEmail)

        const { error } = await supabaseAdmin
            .from('users')
            .upsert({
                email: targetEmail,
                pin_code_hash: hashedPin,
                updated_at: new Date().toISOString()
            }, { onConflict: 'email' })

        if (error) {
            console.error('CRITICAL: Supabase Error saving PIN:', error)
            return NextResponse.json({
                error: 'Database error',
                details: error.message,
                code: error.code
            }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'PIN-код успешно установлен' })

    } catch (error) {
        console.error('Setup PIN error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
