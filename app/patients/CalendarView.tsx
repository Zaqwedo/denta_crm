'use client'

import { useState, useEffect } from 'react'
import { getPatients } from '@/lib/supabase-db'
import { SegmentedControl } from './SegmentedControl'
import { DayView } from './DayView'
import { MonthView } from './MonthView'
import { PatientDetailsModal } from './PatientDetailsModal'

// Компонент недельного вида календаря
function WeekView({ patients, selectedDate, onDateChange }: { patients: Patient[], selectedDate: Date, onDateChange: (date: Date) => void }) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay() + 1) // Понедельник

    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getPatientsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return patients.filter(patient => patient.date === dateStr)
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7))
    onDateChange(newDate)
  }

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

  const weekDays = getWeekDays(selectedDate)
  const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8:00 - 19:00

  return (
    <>
      <div className="bg-[#f2f2f7] min-h-screen">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 px-4 py-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronLeftIcon size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {weekDays[0].toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </h1>
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronRightIcon size={24} />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, index) => (
              <div key={day} className="text-center py-2">
                <div className="text-sm font-medium text-gray-600">{day}</div>
                <div className={`text-lg font-bold mt-1 ${
                  weekDays[index].toDateString() === new Date().toDateString()
                    ? 'text-blue-600'
                    : 'text-gray-900'
                }`}>
                  {weekDays[index].getDate()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          <div className="bg-white rounded-[20px] shadow-sm overflow-hidden">
            <div className="grid grid-cols-8 gap-1 p-4">
              {/* Time column */}
              <div className="space-y-2">
                <div className="h-8"></div> {/* Header space */}
                {hours.map(hour => (
                  <div key={hour} className="h-16 flex items-center justify-end pr-2">
                    <span className="text-sm text-gray-600">{hour}:00</span>
                  </div>
                ))}
              </div>

              {/* Days columns */}
              {weekDays.map((day, dayIndex) => (
                <div key={dayIndex} className="space-y-2">
                  <div className="h-8 border-b border-gray-200 flex items-center justify-center">
                    <span className="text-xs text-gray-500">
                      {day.toLocaleDateString('ru-RU', { day: 'numeric' })}
                    </span>
                  </div>

                  <div className="relative">
                    {hours.map(hour => (
                      <div key={hour} className="h-16 border-b border-gray-100 relative">
                        {/* Appointments for this hour */}
                        {getPatientsForDay(day)
                          .filter(patient => {
                            const patientHour = parseInt(patient.time?.split(':')[0] || '0')
                            return patientHour === hour
                          })
                          .map((patient, index) => (
                            <div
                              key={patient.id}
                              onClick={() => setSelectedPatient(patient)}
                              className={`absolute left-1 right-1 p-2 rounded-lg border text-xs font-medium cursor-pointer ${getAppointmentColor(patient.status)}`}
                              style={{
                                top: `${index * 25 + 2}px`,
                                zIndex: 10
                              }}
                            >
                              <div className="truncate font-semibold">{patient.name}</div>
                              <div className="text-xs opacity-75">{patient.doctor}</div>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 bg-white rounded-[20px] p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Легенда</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span className="text-sm text-gray-700">Подтвержден</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span className="text-sm text-gray-700">Ожидает</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                <span className="text-sm text-gray-700">Отменен</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                <span className="text-sm text-gray-700">Завершен</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <PatientDetailsModal
          patient={selectedPatient}
          isOpen={!!selectedPatient}
          onClose={() => setSelectedPatient(null)}
          rowIndex={parseInt(selectedPatient.id) || undefined}
        />
      )}
    </>
  )
}

interface Patient {
  id: string
  name: string
  phone: string
  date: string
  time: string
  doctor: string
  status: string
}

export function CalendarView() {

  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState(1) // 0: День, 1: Неделя, 2: Месяц
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    try {
      const data = await getPatients()

      const formattedPatients = data.map((patient, index) => {
        const rawDate = patient['Дата записи'] || patient.Дата || patient.Date || ''
        console.log(`📊 CALENDAR: Пациент ${index + 1} (${patient.ФИО}): сырая дата = "${rawDate}" (тип: ${typeof rawDate})`)

        // Сохраняем дату в формате YYYY-MM-DD
        let formattedDate = ''
        if (rawDate) {
          try {
            // Если дата уже в формате DD.MM.YYYY, преобразуем в YYYY-MM-DD
            if (rawDate.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
              const [day, month, year] = rawDate.split('.')
              formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            } else {
              // Иначе пробуем стандартное преобразование
              const dateObj = new Date(rawDate)
              if (!isNaN(dateObj.getTime())) {
                formattedDate = dateObj.toISOString().split('T')[0]
              }
            }
          } catch (error) {
            // Оставляем пустой, если не удалось преобразовать
          }
        }

        // Разделяем объединенное поле "Телефон Комментарии" на телефон и комментарии
        const phoneCommentsField = patient['Телефон Комментарии'] || '';
        const phoneParts = phoneCommentsField.trim().split(/\s+/);
        const phone = phoneParts.length > 0 ? phoneParts[0] : '';
        const comments = phoneParts.length > 1 ? phoneParts.slice(1).join(' ') : '';

        return {
          id: patient.ID || patient.id || String(index + 2),
          name: patient.ФИО || patient.Имя || patient.Name || 'Без имени',
          phone: phone || patient.Телефон || patient.Phone || '',
          comments: comments,
          date: formattedDate,
          time: patient['Время записи'] || patient.Время || patient.Time || '',
          doctor: patient.Доктор || patient.Врач || patient.Doctor || '',
          status: patient.Статус || patient.Status || ''
        }
      })

      setPatients(formattedPatients)
    } catch (error) {
      console.error('Ошибка загрузки пациентов:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderCalendarView = () => {
    switch (viewMode) {
      case 0:
        return <DayView patients={patients} selectedDate={selectedDate} onDateChange={setSelectedDate} />
      case 1:
        return <WeekView patients={patients} selectedDate={selectedDate} onDateChange={setSelectedDate} />
      case 2:
        return <MonthView patients={patients} selectedDate={selectedDate} onDateChange={setSelectedDate} />
      default:
        return <WeekView patients={patients} selectedDate={selectedDate} onDateChange={setSelectedDate} />
    }
  }

  return (
    <div className="pb-20">
      {/* Header with Segmented Control */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 px-4 py-4 shadow-sm">
        <div className="flex justify-center mb-4">
          <SegmentedControl
            options={['День', 'Неделя', 'Месяц']}
            selectedIndex={viewMode}
            onChange={setViewMode}
          />
        </div>
      </div>

      {/* Calendar View */}
      {renderCalendarView()}
    </div>
  )
}

// Встроенные SVG иконки вместо lucide-react
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