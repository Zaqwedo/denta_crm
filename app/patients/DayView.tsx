'use client'

import { useRouter } from 'next/navigation'
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

interface DayViewProps {
  patients: Patient[]
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

export function DayView({ patients, selectedDate, onDateChange }: DayViewProps) {
  const router = useRouter()

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1))
    onDateChange(newDate)
  }

  // Функция для форматирования даты в YYYY-MM-DD в локальном времени
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const selectedDateStr = formatDateLocal(selectedDate)
  const dayPatients = patients.filter(patient => {
    if (!patient.date) return false
    return patient.date === selectedDateStr
  }).sort((a, b) => {
    const timeA = a.time || '00:00'
    const timeB = b.time || '00:00'
    return timeA.localeCompare(timeB)
  })

  const hours = Array.from({ length: 14 }, (_, i) => i + 8) // 8:00 - 21:00

  const getAppointmentColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'подтвержден':
        return 'bg-green-100 border-green-300 text-green-800'
      case 'ожидает':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'отменен':
        return 'bg-red-100 border-red-300 text-red-800'
      case 'завершен':
        return 'bg-gray-100 border-gray-300 text-gray-600'
      default:
        return 'bg-blue-100 border-blue-300 text-blue-800'
    }
  }

  return (
    <>
      <div className="bg-[#f2f2f7] min-h-screen">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 px-4 py-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronLeftIcon size={24} />
            </button>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedDate.toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {dayPatients.length} записей
              </p>
            </div>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronRightIcon size={24} />
            </button>
          </div>
        </div>

        {/* Day Schedule */}
        <div className="p-4">
          {dayPatients.length === 0 ? (
            <div className="bg-white rounded-[20px] p-8 text-center shadow-sm">
              <div className="text-gray-400 text-4xl mb-4">📅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет записей</h3>
              <p className="text-gray-600">На этот день нет запланированных приемов</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => router.push(`/patients/${patient.id}`)}
                  className="bg-white rounded-[16px] p-4 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getAppointmentColor(patient.status).includes('green') ? 'bg-green-500' : getAppointmentColor(patient.status).includes('yellow') ? 'bg-yellow-500' : getAppointmentColor(patient.status).includes('red') ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                      <span className="text-lg font-semibold text-gray-900">
                        {formatTime(patient.time) || 'Время не указано'}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAppointmentColor(patient.status)}`}>
                      {patient.status || 'Не указан'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-gray-900">{patient.name}</h3>
                    <p className="text-gray-600">{patient.doctor}</p>
                    {patient.phone && (
                      <p className="text-blue-600 text-sm">
                        📞 {patient.phone.replace(/(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/, '+$1 ($2) $3-$4-$5')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}