'use client'

import { useState, useEffect } from 'react'
import { PatientCard } from '../PatientCard'

interface PatientChangesListProps {
  patient: {
    id: string
    name: string
    phone: string | null
    date: string | null
    time: string | null
    doctor: string | null
    status: string | null
    nurse?: string | null
    emoji?: string | null
  }
  changeDate: string | null
}

export function PatientChangesList({ patient, changeDate }: PatientChangesListProps) {
  const [changes, setChanges] = useState<Array<{
    field_name: string
    old_value: string | null
    new_value: string | null
    changed_at: string
    changed_by_email: string | null
  }>>([])
  const [loading, setLoading] = useState(true)
  const [showChanges, setShowChanges] = useState(false)

  useEffect(() => {
    async function loadChanges() {
      try {
        const response = await fetch(`/api/patients/${patient.id}/changes`)
        const data = await response.json()

        if (data.success && data.changes) {
          // Группируем изменения по дате (последние изменения для каждого поля)
          const latestChanges = new Map<string, typeof data.changes[0]>()

          data.changes.forEach((change: typeof data.changes[0]) => {
            const existing = latestChanges.get(change.field_name)
            if (!existing || new Date(change.changed_at) > new Date(existing.changed_at)) {
              latestChanges.set(change.field_name, change)
            }
          })

          setChanges(Array.from(latestChanges.values()))
        }
      } catch (error) {
        console.error('Ошибка загрузки изменений:', error)
      } finally {
        setLoading(false)
      }
    }

    if (showChanges) {
      loadChanges()
    }
  }, [patient.id, showChanges])

  return (
    <div className="space-y-2">
      <PatientCard
        patient={patient}
        rowIndex={0}
      />

      {changeDate && (
        <div className="ml-5 space-y-2">
          <button
            onClick={() => setShowChanges(!showChanges)}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Изменено: {changeDate}</span>
            <svg
              className={`h-4 w-4 transition-transform ${showChanges ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showChanges && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-2">
              {loading ? (
                <div className="text-sm text-gray-600">Загрузка изменений...</div>
              ) : changes.length === 0 ? (
                <div className="text-sm text-gray-600">
                  Нет записей об изменениях для этого пациента. Изменения будут отслеживаться автоматически при редактировании записи.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-gray-900 mb-2">
                    Измененные поля:
                  </div>
                  {changes.map((change, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="font-medium text-gray-900 text-sm mb-1">
                        {change.field_name}
                      </div>
                      <div className="text-xs space-y-1">
                        {change.old_value && (
                          <div className="text-red-600">
                            <span className="font-medium">Было:</span> {change.old_value}
                          </div>
                        )}
                        {change.new_value && (
                          <div className="text-green-600">
                            <span className="font-medium">Стало:</span> {change.new_value}
                          </div>
                        )}
                        {!change.old_value && change.new_value && (
                          <div className="text-blue-600">
                            <span className="font-medium">Добавлено:</span> {change.new_value}
                          </div>
                        )}
                        {change.old_value && !change.new_value && (
                          <div className="text-gray-600">
                            <span className="font-medium">Удалено:</span> {change.old_value}
                          </div>
                        )}
                      </div>
                      {change.changed_by_email && (
                        <div className="text-xs text-gray-500 mt-1">
                          Изменил: {change.changed_by_email}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
