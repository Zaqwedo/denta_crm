'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getPatients } from '@/lib/supabase-db'
import { formatTime } from '@/lib/utils'
import { SegmentedControl } from './SegmentedControl'
import { DayView } from './DayView'
import { MonthView } from './MonthView'

// Компонент недельного вида календаря
function WeekView({ patients, selectedDate, onDateChange }: { patients: Patient[], selectedDate: Date, onDateChange: (date: Date) => void }) {
  const router = useRouter()

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

  // Функция для форматирования даты в YYYY-MM-DD в локальном времени
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getPatientsForDay = (date: Date) => {
    const dateStr = formatDateLocal(date)
    return patients
      .filter(patient => patient.date === dateStr)
      .sort((a, b) => {
        const timeA = a.time || '00:00'
        const timeB = b.time || '00:00'
        return timeA.localeCompare(timeB)
      })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7))
    onDateChange(newDate)
  }

  const goToToday = () => {
    onDateChange(new Date())
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

  const getStatusColorLine = (status: string) => {
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

  const weekDays = getWeekDays(selectedDate)

  const formatTimeRange = (time: string) => {
    if (!time) return ''
    // Используем formatTime для получения времени в формате HH:MM
    const timeStr = formatTime(time)
    const [hours, minutes] = timeStr.split(':')
    const startHour = parseInt(hours) || 0
    const startMin = parseInt(minutes) || 0
    const endHour = startHour
    const endMin = startMin + 30 // Предполагаем 30 минут длительность
    
    const formatTimeLocal = (h: number, m: number) => {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
    }
    
    return `${formatTimeLocal(startHour, startMin)} - ${formatTimeLocal(endHour, endMin >= 60 ? endMin - 60 : endMin)}`
  }

  const getDayName = (date: Date) => {
    const days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
    return days[date.getDay()]
  }

  const weekRange = `${weekDays[0].getDate()} - ${weekDays[6].getDate()} ${weekDays[0].toLocaleDateString('ru-RU', { month: 'long' })}`
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const isCurrentWeek = weekDays[0].getTime() <= todayDate.getTime() && weekDays[6].getTime() >= todayDate.getTime()

  return (
    <>
      <div className="bg-white min-h-screen">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigateWeek('prev')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors font-medium text-gray-700"
            >
              <ChevronLeftIcon size={20} />
              <span className="hidden sm:inline">Предыдущая</span>
            </button>
            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900">
              {weekDays[0].toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </h1>
              <p className="text-xs text-gray-500 mt-0.5">{weekRange}</p>
            </div>
            <button
              onClick={() => navigateWeek('next')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors font-medium text-gray-700"
            >
              <span className="hidden sm:inline">Следующая</span>
              <ChevronRightIcon size={20} />
            </button>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-center mb-3">
            <button
              onClick={goToToday}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isCurrentWeek
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Сегодня
            </button>
          </div>

          {/* Days of week selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {weekDays.map((day, index) => {
              const dayDate = new Date(day)
              dayDate.setHours(0, 0, 0, 0)
              const todayCheck = new Date()
              todayCheck.setHours(0, 0, 0, 0)
              const isToday = dayDate.getTime() === todayCheck.getTime()
              const isSelected = dayDate.getTime() === selectedDate.getTime()
              
              return (
                <button
                  key={index}
                  onClick={() => onDateChange(day)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[50px] py-2 px-3 rounded-lg transition-colors ${
                    isToday 
                      ? 'bg-gray-900 text-white' 
                      : isSelected
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-transparent text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-xs font-medium mb-1">
                    {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'][index]}
                  </div>
                  <div className={`text-lg font-bold ${
                    isToday ? 'text-white' : 'text-gray-900'
                }`}>
                    {day.getDate()}
                </div>
                </button>
              )
            })}
              </div>
          </div>
        </div>

        {/* Week Schedule List */}
        <div className="px-4 py-4">
          <div className="max-w-4xl mx-auto">
          {weekDays.map((day, dayIndex) => {
            const dayPatients = getPatientsForDay(day)
            const dayDate = new Date(day)
            dayDate.setHours(0, 0, 0, 0)
            const todayCheck = new Date()
            todayCheck.setHours(0, 0, 0, 0)
            const isToday = dayDate.getTime() === todayCheck.getTime()
            
            if (dayPatients.length === 0) {
              return null // Не показываем дни без записей
            }

            return (
              <div key={dayIndex} className="mb-6">
                {/* Day Header */}
                <div className="mb-3">
                  <h2 className="text-base font-semibold text-gray-900">
                    {day.getDate()} {day.toLocaleDateString('ru-RU', { month: 'long' })}, {getDayName(day)}
                  </h2>
                  {isToday && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                      Сегодня
                    </span>
                  )}
                  </div>

                {/* Patients List for this day */}
                <div className="space-y-3">
                  {dayPatients.map((patient) => {
                    const timeRange = formatTimeRange(patient.time)
                    return (
                            <div
                              key={patient.id}
                        onClick={() => router.push(`/patients/${patient.id}`)}
                        className="flex items-start gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors active:scale-[0.98]"
                      >
                        {/* Color line */}
                        <div className={`w-1 h-full min-h-[60px] rounded-full ${getStatusColorLine(patient.status)}`}></div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-600 mb-1">
                            {timeRange}
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {patient.name}
                          </div>
                          {patient.doctor && (
                            <div className="text-sm text-gray-600 mt-1">
                              {patient.doctor}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          
          {/* Empty state if no appointments in week */}
          {weekDays.every(day => getPatientsForDay(day).length === 0) && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет записей</h3>
              <p className="text-gray-600">На эту неделю нет запланированных приемов</p>
            </div>
          )}
          </div>
        </div>
      </div>
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
  const [viewMode, setViewMode] = useState(2) // 0: День, 1: Неделя, 2: Месяц (по умолчанию Месяц)
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    try {
      const data = await getPatients()

      const formattedPatients = data.map((patient, index) => {
        const rawDate = patient['Дата записи'] || ''
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

        // Используем отдельные поля Телефон и Комментарии
        const phone = patient.Телефон || '';
        const comments = patient.Комментарии || '';

        return {
          id: patient.id || String(index + 2),
          name: patient.ФИО || 'Без имени',
          phone: phone || patient.Телефон || '',
          comments: comments,
          date: formattedDate,
          time: patient['Время записи'] || '',
          doctor: patient.Доктор || '',
          status: patient.Статус || ''
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка календаря...</p>
        </div>
      </div>
    )
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