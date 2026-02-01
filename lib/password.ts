/**
 * Утилиты для работы с хешированием PIN-кодов и паролей.
 * Использует Web Crypto API (совместимо с Edge Runtime).
 */

const SALT_SIZE = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 64; // SHA-512

/**
 * Генерирует хеш для 4-значного PIN-кода
 * Формат: iterations.salt_hex.hash_hex
 */
export async function hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const pinData = encoder.encode(pin);
    const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));

    const baseKey = await crypto.subtle.importKey(
        'raw',
        pinData,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    const derivedKey = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt as any,
            iterations: ITERATIONS,
            hash: 'SHA-512'
        } as any,
        baseKey,
        KEY_LENGTH * 8
    );

    const saltHex = bufToHex(salt);
    const hashHex = bufToHex(derivedKey);

    return `${ITERATIONS}.${saltHex}.${hashHex}`;
}

/**
 * Проверяет PIN-код на соответствие хешу
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
    try {
        const [iterationsStr, saltHex, hashHex] = storedHash.split('.');
        const iterations = parseInt(iterationsStr, 10);
        const salt = hexToBuf(saltHex);
        const expectedHash = hashHex;

        const encoder = new TextEncoder();
        const pinData = encoder.encode(pin);

        const baseKey = await crypto.subtle.importKey(
            'raw',
            pinData,
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );

        const derivedKey = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt as any,
                iterations: iterations,
                hash: 'SHA-512'
            } as any,
            baseKey,
            KEY_LENGTH * 8
        );

        const actualHash = bufToHex(derivedKey);
        return actualHash === expectedHash;
    } catch (e) {
        console.error('Error verifying PIN:', e);
        return false;
    }
}

// Вспомогательные функции
function bufToHex(buffer: ArrayBuffer | Uint8Array): string {
    const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    return Array.from(uint8)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function hexToBuf(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
}
