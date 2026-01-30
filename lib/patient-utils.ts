import { PatientData } from './supabase-db'
import { DB_COLUMNS } from './constants'
import { ClientInfo } from '@/app/patients/card-index/types'

/**
 * Группирует плоский список пациентов из БД в структуру для Картотеки.
 * Группировка идет по ФИО + Дате рождения.
 */
export function groupPatientsForCardIndex(patients: PatientData[]): ClientInfo[] {
    const groupedPatients: Record<string, ClientInfo> = {}

    patients.forEach(p => {
        const name = p[DB_COLUMNS.NAME] || 'Без имени'
        // Нормализуем дату рождения для ключа (null, "" и undefined -> "нет-др")
        const rawDob = p[DB_COLUMNS.BIRTH_DATE]
        const dobKey = (!rawDob || rawDob === '') ? 'нет-др' : rawDob
        const key = `${name.trim().toLowerCase()}_${dobKey}`

        if (!groupedPatients[key]) {
            groupedPatients[key] = {
                name: name.trim(),
                birthDate: (!rawDob || rawDob === '') ? null : rawDob,
                phones: [],
                emoji: p[DB_COLUMNS.EMOJI] || null,
                notes: p[DB_COLUMNS.NOTES] || null,
                ignoredIds: [],
                records: []
            }
        }

        // Если есть эмодзи или заметки в любой из записей
        if (p[DB_COLUMNS.EMOJI] && !groupedPatients[key].emoji) {
            groupedPatients[key].emoji = p[DB_COLUMNS.EMOJI] || null
        }
        if (p[DB_COLUMNS.NOTES] && !groupedPatients[key].notes) {
            groupedPatients[key].notes = p[DB_COLUMNS.NOTES] || null
        }

        // Накапливаем все ID игнорируемых дублей
        if (p[DB_COLUMNS.IGNORED_ID]) {
            const ids = p[DB_COLUMNS.IGNORED_ID]!.split(',')
            ids.forEach(id => {
                if (!groupedPatients[key].ignoredIds.includes(id)) {
                    groupedPatients[key].ignoredIds.push(id)
                }
            })
        }

        if (p[DB_COLUMNS.PHONE] && !groupedPatients[key].phones.includes(p[DB_COLUMNS.PHONE]!)) {
            groupedPatients[key].phones.push(p[DB_COLUMNS.PHONE]!)
        }

        groupedPatients[key].records.push(p)
    })

    // Превращаем в массив и сортируем по алфавиту
    return Object.values(groupedPatients).sort((a, b) => a.name.localeCompare(b.name))
}
