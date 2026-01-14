'use client'

import { useState } from 'react'
import { PatientForm } from './PatientForm'

// Встроенная SVG иконка X
const XIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
)

interface Patient {
  id: string
  name: string
  phone: string
  date: string
  time: string
  doctor: string
  status: string
}

interface DailyPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  patients: Patient[]
  onPatientSelect: (patient: Patient) => void
}

export function DailyPreviewModal({ isOpen, onClose, selectedDate, patients, onPatientSelect }: DailyPreviewModalProps) {
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)

  if (!isOpen || !selectedDate) return null

  const handleOpenAddForm = () => {
    setIsAddFormOpen(true)
  }

  const handleCloseAddForm = () => {
    setIsAddFormOpen(false)
    onClose() // Закрываем DailyPreviewModal после закрытия PatientForm
  }

  // Функция для форматирования даты в YYYY-MM-DD в локальном времени
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Получаем пациентов на выбранную дату
  console.log('🔍 DAILY PREVIEW: Поиск пациентов для даты:', selectedDate?.toISOString())
  console.log('🔍 DAILY PREVIEW: Всего пациентов:', patients.length)

  // Используем локальное время для сравнения дат
  const selectedDateStr = formatDateLocal(selectedDate)

  const dayPatients = patients.filter(patient => {
    console.log('🔍 DAILY PREVIEW: Проверяем пациента:', patient.name, 'дата из БД:', patient.date, 'тип:', typeof patient.date)

    if (!patient.date || patient.date === '') {
      console.log('🔍 DAILY PREVIEW: Пациент', patient.name, 'не имеет даты')
      return false
    }

    // Сравниваем даты в формате YYYY-MM-DD
    const match = patient.date === selectedDateStr
    console.log('🔍 DAILY PREVIEW: Сравниваем даты:')
    console.log('  - Выбранная дата:', selectedDateStr)
    console.log('  - Дата пациента:', patient.date)
    console.log('  - Равны?', match)

    return match
  }).sort((a, b) => {
    const timeA = a.time || '00:00'
    const timeB = b.time || '00:00'
    return timeA.localeCompare(timeB)
  })

  console.log('✅ DAILY PREVIEW: Найдено пациентов на эту дату:', dayPatients.length)

  const handlePatientClick = (patient: Patient) => {
    onPatientSelect(patient)
    onClose() // Закрываем preview модал
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'подтвержден':
        return 'bg-green-100 text-green-800'
      case 'ожидает':
        return 'bg-yellow-100 text-yellow-800'
      case 'отменен':
        return 'bg-red-100 text-red-800'
      case 'завершен':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-[24px] shadow-xl max-w-md w-full max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              {formatDate(selectedDate)}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <XIcon size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {dayPatients.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📅</div>
                <p className="text-gray-600 text-lg">Записей пока нет</p>
                <p className="text-gray-500 text-sm mt-2">
                  На этот день нет запланированных приемов
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-4">
                  {dayPatients.length} записей на этот день
                </div>

                {dayPatients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => handlePatientClick(patient)}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-semibold text-gray-900 min-w-[70px] flex-shrink-0">
                        {patient.time || 'Время не указано'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{patient.name}</div>
                        <div className="text-sm text-gray-600">{patient.doctor}</div>
                      </div>
                    </div>

                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                      {patient.status || 'Не указан'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Кнопка добавления новой записи */}
          <div className="p-6 border-t border-gray-200">
            <button
              onClick={handleOpenAddForm}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white text-base font-semibold rounded-[12px] hover:bg-blue-700 transition-colors"
            >
              + Добавить запись
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно для формы добавления пациента */}
      <PatientForm
        isOpen={isAddFormOpen}
        onClose={handleCloseAddForm}
        initialDate={selectedDateStr} // Передаем выбранную дату
      />
    </>
  )
}