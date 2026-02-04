/**
 * Утилиты для работы с WebAuthn (Face ID / Touch ID)
 */

export const isBiometricsAvailable = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    // Проверяем наличие API
    if (!window.PublicKeyCredential) return false;

    try {
        // Проверяем наличие биометрического датчика на платформе
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
        return false;
    }
};

/**
 * Вспомогательная функция для конвертации Buffer в base64url
 */
export const bufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

/**
 * Вспомогательная функция для конвертации base64url в ArrayBuffer
 */
export const base64ToBuffer = (base64: string): ArrayBuffer => {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const base64Standard = (base64 + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const binary = window.atob(base64Standard);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};
