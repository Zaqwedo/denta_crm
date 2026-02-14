// app/patients/page.tsx
import { getPatients } from '@/lib/supabase-db'
import { PatientsList } from './PatientsList'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { GoogleAuthHandler } from './GoogleAuthHandler'
import { Header } from '../components/Header'
import { logger } from '@/lib/logger'
import Link from 'next/link'

export const revalidate = 60

export default async function PatientsPage() {
  let patients: Array<Record<string, any>> = []
  let error: string | null = null

  try {
    patients = await getPatients()
  } catch (err) {
    error = err instanceof Error ? err.message : 'Произошла ошибка при загрузке данных'
    logger.error('Ошибка загрузки пациентов:', err)
  }

  return (
    <ProtectedRoute>
      <GoogleAuthHandler />
      <PatientsPageContent patients={patients} error={error} />
    </ProtectedRoute>
  )
}

function PatientsPageContent({ patients, error }: { patients: Array<Record<string, any>>, error: string | null }) {
  return (
    <div className="min-h-screen bg-[#f2f2f7]" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      <div className="max-w-md mx-auto px-4 py-8">
        <Header title="Записи пациентов" subtitle="Управляйте записями и расписанием" />

        {/* Кнопка добавления пациента */}
        <div className="mb-8">
          <Link
            href="/patients/new"
            className="block w-full px-6 py-4 bg-blue-600 text-white text-lg rounded-[14px] font-semibold hover:bg-blue-700 transition-colors text-center shadow-sm"
          >
            + Записать пациента
          </Link>
        </div>

        {error ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="text-red-500 text-center">
              <p className="text-lg font-medium mb-2">Ошибка загрузки</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          </div>
        ) : patients.length === 0 ? (
          <div className="bg-white rounded-[20px] p-12 text-center shadow-sm">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Нет записей</h3>
            <p className="text-gray-500 text-base mb-6">У вас пока нет записанных пациентов</p>
            <Link
              href="/patients/new"
              className="inline-block px-6 py-4 bg-blue-600 text-white text-lg rounded-[14px] font-semibold hover:bg-blue-700 transition-colors"
            >
              + Записать пациента
            </Link>
          </div>
        ) : (
          <PatientsList
            patients={patients.map(patient => ({
              id: patient.id || 'без id',
              name: patient.ФИО || 'Без имени',
              phone: patient.Телефон || null,
              date: patient['Дата записи'] || null,
              time: patient['Время записи'] || null,
              doctor: patient.Доктор || null,
              status: patient.Статус || null,
              nurse: patient.Медсестра || null,
              birthDate: patient['Дата рождения пациента'] || null,
              emoji: patient.emoji || null,
              comments: patient.Комментарии || null,
            }))}
          />
        )}
      </div>
    </div>
  )
}
