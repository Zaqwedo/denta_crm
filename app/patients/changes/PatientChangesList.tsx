'use client'

import { useState, useEffect } from 'react'
import { PatientCard } from '../PatientCard'
import { handleRevertChanges, handleRestorePatient } from '../actions'
import { useAuth } from '../../contexts/AuthContext'

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
    is_deleted?: boolean
  }
  changeDate: string | null
}

export function PatientChangesList({ patient, changeDate }: PatientChangesListProps) {
  const { user } = useAuth()
  const [changes, setChanges] = useState<Array<{
    field_name: string
    old_value: string | null
    new_value: string | null
    changed_at: string
    changed_by_email: string | null
  }>>([])
  const [loading, setLoading] = useState(true)
  const [showChanges, setShowChanges] = useState(false)
  const [isReverting, setIsReverting] = useState(false)

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

  const handleRevert = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const isDeleted = patient.is_deleted

    const message = isDeleted
      ? 'Восстановить эту запись из архива?'
      : 'Отменить последние изменения для этого пациента? Будут восстановлены значения до последнего редактирования.';

    if (!confirm(message)) return

    setIsReverting(true)
    try {
      let result;
      if (isDeleted) {
        result = await handleRestorePatient(patient.id)
      } else {
        result = await handleRevertChanges(patient.id, user?.email || 'unknown')
      }

      if (result.success) {
        setShowChanges(false)
        if (isDeleted) {
          // Можно обновить страницу или просто алерт
        }
      } else {
        alert('Ошибка: ' + result.error)
      }
    } catch (err) {
      alert('Ошибка при выполнении операции')
      console.error(err)
    } finally {
      setIsReverting(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className={`relative group ${patient.is_deleted ? 'opacity-85 grayscale' : ''}`}>
        <PatientCard
          patient={patient}
        />
        <button
          onClick={handleRevert}
          disabled={isReverting}
          className={`absolute right-4 top-1/2 -translate-y-1/2 bg-white shadow-md border border-gray-100 hover:bg-opacity-100 p-2.5 rounded-full transition-all z-30 ${patient.is_deleted ? 'text-green-600 hover:bg-green-50 animate-pulse' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
          title={patient.is_deleted ? "Восстановить запись" : "Отменить последние изменения"}
        >
          {isReverting ? (
            <svg className="animate-spin h-6 w-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          )}
        </button>
      </div>

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
