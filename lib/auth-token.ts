const AUTH_SECRET = process.env.AUTH_SECRET || 'default-secret-do-not-use-in-production'

/**
 * Вспомогательная функция для конвертации строки в ArrayBuffer
 */
function str2ab(str: string): ArrayBuffer {
    const encoder = new TextEncoder()
    const uint8Array = encoder.encode(str)
    return uint8Array.buffer
}

/**
 * Вспомогательная функция для конвертации ArrayBuffer в hex-строку
 */
function buf2hex(buffer: ArrayBuffer): string {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('')
}

/**
 * Создает подписанный токен (асинхронно для совместимости с Edge Runtime)
 */
export async function createToken(payload: string): Promise<string> {
    const keyData = str2ab(AUTH_SECRET)
    const data = str2ab(payload)

    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', key, data)
    return `${payload}.${buf2hex(signature)}`
}

/**
 * Проверяет подпись токена (асинхронно для совместимости с Edge Runtime)
 */
export async function verifyToken(token: string | undefined): Promise<string | null> {
    if (!token) return null

    const [payload, signature] = token.split('.')
    if (!payload || !signature) return null

    const keyData = str2ab(AUTH_SECRET)
    const data = str2ab(payload)

    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
    )

    // Конвертируем hex-подпись обратно в Uint8Array
    const sigBytes = new Uint8Array(signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes.buffer, data)

    if (isValid) {
        return payload
    }

    return null
}
