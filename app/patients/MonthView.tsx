'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DailyPreviewModal } from './DailyPreviewModal'
import { formatTime } from '@/lib/utils'

interface Patient {
  id: string
  name: string
  phone: string
  date: string
  time: string
  doctor: string
  status: string
}

interface MonthViewProps {
  patients: Patient[]
  events: any[]
  selectedDate: Date
  onDateChange: (date: Date) => void
}

const ChevronLeftIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
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
    <polyline points="15,18 9,12 15,6"></polyline>
  </svg>
)

const ChevronRightIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
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
    <polyline points="9,18 15,12 9,6"></polyline>
  </svg>
)

export function MonthView({ patients, events, selectedDate, onDateChange }: MonthViewProps) {
  const router = useRouter()
  const [selectedDayForPreview, setSelectedDayForPreview] = useState<Date | null>(null)

  const handlePatientSelect = (patient: Patient) => {
    router.push(`/patients/card-index?patientId=${patient.id}`)
    setSelectedDayForPreview(null) // Закрываем preview модал
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1))
    onDateChange(newDate)
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    // Найти первый день недели для месяца (0 = воскресенье, 1 = понедельник, ...)
    const firstDayOfWeek = firstDay.getDay()
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // Сделать понедельник первым днем

    const days = []

    // Добавить дни предыдущего месяца для заполнения первой недели
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
        dayNumber: prevMonthLastDay - i
      })
    }

    // Добавить дни текущего месяца
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true,
        dayNumber: day
      })
    }

    // Добавить дни следующего месяца для заполнения последней недели
    const remainingCells = 42 - days.length // 6 недель * 7 дней = 42
    for (let day = 1; day <= remainingCells; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
        dayNumber: day
      })
    }

    return days
  }

  // Функция для форматирования даты в YYYY-MM-DD в локальном времени
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getPatientsForDay = (date: Date) => {
    const dateStr = formatDateLocal(date)
    return patients.filter(patient => patient.date === dateStr)
  }

  const getEventsForDay = (date: Date) => {
    const dateStr = formatDateLocal(date)
    return events.filter(event => event.date === dateStr)
  }

  const getAppointmentColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'подтвержден':
        return 'bg-green-500'
      case 'ожидает':
        return 'bg-yellow-500'
      case 'отменен':
        return 'bg-red-500'
      case 'завершен':
        return 'bg-gray-500'
      default:
        return 'bg-blue-500'
    }
  }

  const days = getDaysInMonth(selectedDate)
  const today = new Date()

  return (
    <>
      <div className="bg-[#f2f2f7] min-h-screen">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 px-4 py-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronLeftIcon size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </h1>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronRightIcon size={24} />
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, index) => (
              <div
                key={day}
                className={`text-center py-2 text-sm font-medium ${index >= 5 ? 'text-gray-500' : 'text-gray-700'
                  }`}
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 gap-1 p-4">
              {days.map((dayInfo, index) => {
                const dayPatients = getPatientsForDay(dayInfo.date)
                const dayEvents = getEventsForDay(dayInfo.date)
                const isToday = dayInfo.date.toDateString() === today.toDateString()
                const isWeekend = dayInfo.date.getDay() === 0 || dayInfo.date.getDay() === 6

                return (
                  <div
                    key={index}
                    onClick={() => {
                      console.log('📅 MONTH VIEW: Клик по дню:', dayInfo.date.toISOString(), 'пациентов в дне:', getPatientsForDay(dayInfo.date).length)
                      setSelectedDayForPreview(dayInfo.date)
                    }}
                    className={`min-h-[80px] p-2 border border-gray-100 rounded-lg cursor-pointer ${!dayInfo.isCurrentMonth ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white hover:bg-gray-50'
                      } ${isToday ? 'ring-2 ring-blue-500' : ''} transition-colors`}
                  >
                    <div className={`text-sm font-medium mb-1 ${!dayInfo.isCurrentMonth ? 'text-gray-400' :
                      isToday ? 'text-blue-600' :
                        isWeekend ? 'text-gray-500' : 'text-gray-900'
                      }`}>
                      {dayInfo.dayNumber}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_5px_rgba(37,99,235,0.5)]"
                          title={`СОБЫТИЕ: ${event.title}`}
                        ></div>
                      ))}
                      {dayPatients.slice(0, 5 - Math.min(dayEvents.length, 5)).map((patient) => (
                        <div
                          key={patient.id}
                          className={`w-2 h-2 rounded-full ${getAppointmentColor(patient.status)}`}
                          title={`${patient.name} - ${formatTime(patient.time) || 'Время не указано'}`}
                        ></div>
                      ))}
                      {dayPatients.length + dayEvents.length > 5 && (
                        <div className="text-[8px] text-gray-400 font-black leading-none mt-0.5">
                          +{dayPatients.length + dayEvents.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 bg-white rounded-[20px] p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Легенда</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Подтвержден</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Ожидает</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Отменен</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Завершен</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full shadow-[0_0_5px_rgba(37,99,235,0.5)]"></div>
                <span className="text-sm font-bold text-gray-900">Событие (личная запись)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Preview Modal */}
      <DailyPreviewModal
        key={selectedDayForPreview?.toISOString()} // Гарантирует перемонтирование при каждом новом открытии
        isOpen={!!selectedDayForPreview}
        onClose={() => setSelectedDayForPreview(null)}
        selectedDate={selectedDayForPreview}
        patients={patients}
        events={events}
        onPatientSelect={handlePatientSelect}
      />
    </>
  )
}
