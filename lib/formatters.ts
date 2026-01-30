/**
 * Форматирует строку в формат телефона РФ: +7 (XXX) XXX-XX-XX
 */
export function formatPhone(value: string): string {
    const numbers = value.replace(/\D/g, '')

    // Если пусто или только 7/8, возвращаем базу
    if (numbers.length === 0) return '+7 ('

    let formatted = numbers.startsWith('8') ? '7' + numbers.slice(1) : numbers
    if (formatted.startsWith('7')) {
        formatted = formatted.slice(1)
    }

    const limited = formatted.slice(0, 10)

    if (limited.length === 0) return '+7 ('
    if (limited.length <= 3) return `+7 (${limited}`
    if (limited.length <= 6) return `+7 (${limited.slice(0, 3)}) ${limited.slice(3)}`
    if (limited.length <= 8) return `+7 (${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
    return `+7 (${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6, 8)}-${limited.slice(8, 10)}`
}

/**
 * Получает чистые цифры телефона для сохранения в БД (начинается с 7)
 */
export function getPhoneDigits(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('8')) return '7' + digits.slice(1)
    if (digits.startsWith('7')) return digits
    return '7' + digits
}

/**
 * Форматирует дату в формат DD.MM.YYYY во время ввода
 */
export function formatBirthDate(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    const day = digits.slice(0, 2)
    const month = digits.slice(2, 4)
    const year = digits.slice(4, 8)

    if (digits.length <= 2) return day
    if (digits.length <= 4) return `${day}.${month}`
    return `${day}.${month}.${year}`
}

/**
 * Конвертирует из DD.MM.YYYY в YYYY-MM-DD для БД
 */
export function convertToISODate(dateStr: string): string {
    if (!dateStr || dateStr.length < 10) return ''
    const parts = dateStr.split('.')
    if (parts.length !== 3) return ''
    const [day, month, year] = parts
    return `${year}-${month}-${day}`
}

/**
 * Конвертирует из YYYY-MM-DD в DD.MM.YYYY для отображения
 */
export function convertISOToDisplay(isoStr: string): string {
    if (!isoStr || !isoStr.includes('-')) return isoStr || ''
    const parts = isoStr.split('-')
    if (parts.length !== 3) return isoStr
    const [year, month, day] = parts
    return `${day}.${month}.${year}`
}
