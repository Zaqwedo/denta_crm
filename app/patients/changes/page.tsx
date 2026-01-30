// app/patients/changes/page.tsx
import { getChangedPatients } from '@/lib/supabase-db'
import { TabBar } from '../TabBar'
import { ProtectedRoute } from '../../components/ProtectedRoute'
import { GoogleAuthHandler } from '../GoogleAuthHandler'
import { logger } from '@/lib/logger'
import { PatientChangesList } from './PatientChangesList'

export const revalidate = 60

export default async function ChangesPage() {
  let changedPatients: Array<Record<string, any>> = []
  let error: string | null = null

  try {
    changedPatients = await getChangedPatients()
  } catch (err) {
    error = err instanceof Error ? err.message : 'Произошла ошибка при загрузке данных'
    logger.error('Ошибка загрузки измененных записей:', err)
  }

  return (
    <ProtectedRoute>
      <GoogleAuthHandler />
      <ChangesPageContent changedPatients={changedPatients} error={error} />
    </ProtectedRoute>
  )
}

function ChangesPageContent({
  changedPatients,
  error
}: {
  changedPatients: Array<Record<string, any>>,
  error: string | null
}) {
  // Функция для форматирования даты изменения
  const formatChangeDate = (updatedAt: string | null, createdAt: string | null) => {
    if (!updatedAt) return null

    try {
      const updated = new Date(updatedAt)
      const created = createdAt ? new Date(createdAt) : null

      // Если updated_at и created_at одинаковые (с точностью до секунды), значит запись не изменялась
      if (created) {
        const diff = Math.abs(updated.getTime() - created.getTime())
        if (diff < 1000) {
          return null
        }
      }

      const now = new Date()
      const diffMs = now.getTime() - updated.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Только что'
      if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'минуту' : diffMins < 5 ? 'минуты' : 'минут'} назад`
      if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'} назад`
      if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'} назад`

      return updated.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return null
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7]" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Изменения
          </h1>
          <p className="text-lg text-gray-600">
            Записи, которые были изменены
          </p>
        </div>

        {error ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="text-red-500 text-center">
              <p className="text-lg font-medium mb-2">Ошибка загрузки</p>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              {error.includes('updated_at') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4 text-left">
                  <p className="text-sm text-gray-700 mb-2 font-medium">Требуется настройка:</p>
                  <p className="text-xs text-gray-600 mb-2">
                    Выполните SQL запрос из файла <code className="bg-yellow-100 px-1 rounded">supabase-setup-updated-at.sql</code> в Supabase SQL Editor
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : changedPatients.length === 0 ? (
          <div className="bg-white rounded-[20px] p-12 text-center shadow-sm">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Нет изменений</h3>
            <p className="text-gray-500 text-base mb-4">Пока нет записей, которые были изменены</p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left mt-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Примечание:</strong> Если вы видите это сообщение, но знаете, что записи изменялись, возможно, нужно настроить поле <code className="bg-blue-100 px-1 rounded">updated_at</code> в Supabase.
              </p>
              <p className="text-xs text-gray-600">
                См. файл <code className="bg-blue-100 px-1 rounded">supabase-setup-updated-at.sql</code> для инструкций
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {changedPatients.map((patient) => {
              const cleanPatient = {
                id: patient.id || 'без id',
                name: patient.ФИО || 'Без имени',
                phone: patient.Телефон || null,
                date: patient['Дата записи'] || null,
                time: patient['Время записи'] || null,
                doctor: patient.Доктор || null,
                status: patient.Статус || null,
                nurse: patient.Медсестра || null,
                emoji: patient.emoji || null,
                is_deleted: patient.is_deleted || false,
              }

              const changeDate = formatChangeDate(patient.updated_at, patient.created_at)

              return (
                <PatientChangesList
                  key={`changed-patient-${cleanPatient.id}`}
                  patient={cleanPatient}
                  changeDate={changeDate}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <TabBar />
    </div>
  )
}
