import { PatientData } from './supabase-db'
import { DB_COLUMNS } from './constants'
import { ClientInfo } from '@/app/patients/card-index/types'

/**
 * Группирует плоский список пациентов из БД в структуру для Картотеки.
 * Группировка идет по ФИО + Дате рождения.
 */
export function groupPatientsForCardIndex(patients: PatientData[]): ClientInfo[] {
    const groupedPatients: Map<string, ClientInfo> = new Map()

    patients.forEach(p => {
        const name = (p[DB_COLUMNS.NAME] || 'Без имени').trim()
        const rawDob = p[DB_COLUMNS.BIRTH_DATE]
        const dobKey = (!rawDob || rawDob === '') ? 'нет-др' : rawDob
        const key = `${name.toLowerCase()}_${dobKey}`

        let client = groupedPatients.get(key)
        if (!client) {
            client = {
                name,
                birthDate: (!rawDob || rawDob === '') ? null : rawDob,
                phones: [],
                emoji: p[DB_COLUMNS.EMOJI] || null,
                notes: p[DB_COLUMNS.NOTES] || null,
                ignoredIds: [],
                records: []
            }
            groupedPatients.set(key, client)
        }

        // Если есть эмодзи или заметки в любой из записей
        if (p[DB_COLUMNS.EMOJI] && !client.emoji) {
            client.emoji = p[DB_COLUMNS.EMOJI] || null
        }
        if (p[DB_COLUMNS.NOTES] && !client.notes) {
            client.notes = p[DB_COLUMNS.NOTES] || null
        }

        // Накапливаем все ID игнорируемых дублей
        if (p[DB_COLUMNS.IGNORED_ID]) {
            const ids = p[DB_COLUMNS.IGNORED_ID]!.split(',').map(id => id.trim()).filter(Boolean)
            ids.forEach(id => {
                if (!client!.ignoredIds.includes(id)) {
                    client!.ignoredIds.push(id)
                }
            })
        }

        const phone = p[DB_COLUMNS.PHONE]
        if (phone && !client.phones.includes(phone)) {
            client.phones.push(phone)
        }

        client.records.push(p)
    })

    return Array.from(groupedPatients.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Ищет потенциальных "дубликатов" среди сгруппированных клиентов.
 * Оптимизировано: O(N) по телефонам.
 */
export function findPotentialDuplicates(data: ClientInfo[]): Array<{ label: string, clients: ClientInfo[] }> {
    const phoneToClients = new Map<string, ClientInfo[]>()

    // 1. Индексируем по телефонам O(N * M), где M - количество телефонов у клиента (обычно 1-2)
    data.forEach(client => {
        client.phones.forEach(phone => {
            const cleaned = phone.replace(/\D/g, '')
            if (cleaned.length >= 10) {
                if (!phoneToClients.has(cleaned)) phoneToClients.set(cleaned, [])
                phoneToClients.get(cleaned)!.push(client)
            }
        })
    })

    const groups: Array<{ label: string, clients: ClientInfo[] }> = []

    // 2. Собираем пересечения O(P), где P - количество уникальных телефонов
    phoneToClients.forEach((groupClients, phone) => {
        // Убираем дубликаты ссылок на одного и того же клиента (если у него в записях один телефон)
        const unique = Array.from(new Set(groupClients))

        if (unique.length > 1) {
            // Проверяем, не игнорировали ли мы уже эту пару
            const filtered = unique.filter((c, idx) => {
                const others = unique.filter((_, i) => i !== idx)
                return !others.some(other => {
                    const pairId = getDuplicatePairId(c, other)
                    return c.ignoredIds.includes(pairId) || other.ignoredIds.includes(pairId)
                })
            })

            if (filtered.length > 1) {
                groups.push({ label: `Телефон: ${phone}`, clients: filtered })
            }
        }
    })

    return groups
}

/**
 * Генерирует уникальный ID для пары потенциальных дублей для отслеживания игнорирования.
 */
export function getDuplicatePairId(c1: ClientInfo, c2: ClientInfo): string {
    const id1 = `${c1.name}|${c1.birthDate || ''}`
    const id2 = `${c2.name}|${c2.birthDate || ''}`
    return [id1, id2].sort().join(':::')
}

