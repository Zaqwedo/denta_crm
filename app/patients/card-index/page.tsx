import { getPatients, PatientData } from '@/lib/supabase-db'
import { ProtectedRoute } from '../../components/ProtectedRoute'
import { TabBar } from '../TabBar'
import { CardIndexClient } from './CardIndexClient'

export const revalidate = 0 // Должно быть актуальным

export default async function CardIndexPage() {
    let patients: PatientData[] = []
    let error: string | null = null

    try {
        patients = await getPatients()
    } catch (err) {
        error = err instanceof Error ? err.message : 'Ошибка загрузки картотеки'
    }

    // Группировка пациентов по ФИО + Дата рождения
    const groupedPatients: Record<string, {
        name: string
        birthDate: string | null
        phones: string[]
        emoji: string | null
        notes: string | null
        ignoredIds: string[]
        records: PatientData[]
    }> = {}

    patients.forEach(p => {
        const name = p.ФИО || 'Без имени'
        const dob = p['Дата рождения пациента'] || 'нет-др'
        const key = `${name.trim()}_${dob}`

        if (!groupedPatients[key]) {
            groupedPatients[key] = {
                name: name.trim(),
                birthDate: p['Дата рождения пациента'] || null,
                phones: [],
                emoji: p.emoji || null,
                notes: p.notes || null,
                ignoredIds: [],
                records: []
            }
        }

        // Если есть эмодзи или заметки в любой из записей
        if (p.emoji && !groupedPatients[key].emoji) {
            groupedPatients[key].emoji = p.emoji
        }
        if (p.notes && !groupedPatients[key].notes) {
            groupedPatients[key].notes = p.notes
        }

        // Накапливаем все ID игнорируемых дублей
        if (p.ignored_duplicate_id) {
            const ids = p.ignored_duplicate_id.split(',')
            ids.forEach(id => {
                if (!groupedPatients[key].ignoredIds.includes(id)) {
                    groupedPatients[key].ignoredIds.push(id)
                }
            })
        }

        if (p.Телефон && !groupedPatients[key].phones.includes(p.Телефон)) {
            groupedPatients[key].phones.push(p.Телефон)
        }

        groupedPatients[key].records.push(p)
    })

    // Превращаем в массив и сортируем по алфавиту
    const cardIndex = Object.values(groupedPatients).sort((a, b) => a.name.localeCompare(b.name))

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#f2f2f7]" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
                <div className="max-w-md mx-auto px-4 py-8">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            Картотека
                        </h1>
                        <p className="text-lg text-gray-600">
                            Список всех пациентов и их история
                        </p>
                    </div>

                    {error && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm text-red-500 mb-6">
                            {error}
                        </div>
                    )}

                    <CardIndexClient initialData={cardIndex} />
                </div>
                <TabBar />
            </div>
        </ProtectedRoute>
    )
}
