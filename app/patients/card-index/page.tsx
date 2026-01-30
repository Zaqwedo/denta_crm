import { getPatients, PatientData } from '@/lib/supabase-db'
import { groupPatientsForCardIndex } from '@/lib/patient-utils'
import { ProtectedRoute } from '../../components/ProtectedRoute'
import { TabBar } from '../TabBar'
import { CardIndexClient } from './CardIndexClient'
import { DB_COLUMNS } from '@/lib/constants'

export const revalidate = 0 // Должно быть актуальным

export default async function CardIndexPage() {
    let patients: PatientData[] = []
    let error: string | null = null

    try {
        patients = await getPatients()
    } catch (err) {
        error = err instanceof Error ? err.message : 'Ошибка загрузки картотеки'
    }

    const cardIndex = groupPatientsForCardIndex(patients)

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
