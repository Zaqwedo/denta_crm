'use client'

import { useState, useMemo, useEffect, useRef } from 'react'

type Patient = {
  id: string
  name: string
  phone: string | null
  date: string | null
  time: string | null
  doctor: string | null
  status: string | null
  nurse?: string | null
}

interface SearchAndFiltersProps {
  patients: Patient[]
  onFilteredPatientsChange: (filtered: Patient[]) => void
}

export function SearchAndFilters({ patients, onFilteredPatientsChange }: SearchAndFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  const [selectedNurse, setSelectedNurse] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // Получаем уникальные значения для фильтров
  const doctors = useMemo(() => {
    const unique = new Set<string>()
    patients.forEach(p => {
      if (p.doctor) unique.add(p.doctor)
    })
    return Array.from(unique).sort()
  }, [patients])

  const nurses = useMemo(() => {
    const unique = new Set<string>()
    patients.forEach(p => {
      if (p.nurse) unique.add(p.nurse)
    })
    return Array.from(unique).sort()
  }, [patients])

  const statuses = useMemo(() => {
    const unique = new Set<string>()
    patients.forEach(p => {
      if (p.status) unique.add(p.status)
    })
    return Array.from(unique).sort()
  }, [patients])

  // Функция для парсинга даты из разных форматов
  const parseDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null
    
    // Пробуем разные форматы
    // Формат DD.MM.YYYY
    const ddmmyyyy = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }
    
    // Формат YYYY-MM-DD
    const yyyymmdd = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }
    
    // Пробуем стандартный парсинг
    const parsed = new Date(dateStr)
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
    
    return null
  }

  // Фильтрация и сортировка пациентов
  const filteredPatients = useMemo(() => {
    const filtered = patients.filter(patient => {
      // Поиск по имени/фамилии
      const matchesSearch = !searchQuery || 
        patient.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phone?.includes(searchQuery)

      // Фильтр по врачу
      const matchesDoctor = !selectedDoctor || patient.doctor === selectedDoctor

      // Фильтр по медсестре
      const matchesNurse = !selectedNurse || patient.nurse === selectedNurse

      // Фильтр по статусу
      const matchesStatus = !selectedStatus || patient.status === selectedStatus

      return matchesSearch && matchesDoctor && matchesNurse && matchesStatus
    })

    // Сортировка по дате и времени приёма (desc - от новых к старым)
    // Записи без даты помещаются в конец
    return filtered.sort((a, b) => {
      const dateA = parseDate(a.date)
      const dateB = parseDate(b.date)
      
      // Если у обоих есть даты, сравниваем их
      if (dateA && dateB) {
        // Сначала сравниваем даты
        const dateDiff = dateB.getTime() - dateA.getTime()
        
        // Если даты одинаковые, сравниваем время
        if (dateDiff === 0 && a.time && b.time) {
          // Парсим время в формате HH:MM или HH:MM:SS
          const parseTime = (timeStr: string): number => {
            const parts = timeStr.split(':')
            if (parts.length >= 2) {
              const hours = parseInt(parts[0]) || 0
              const minutes = parseInt(parts[1]) || 0
              return hours * 60 + minutes // Конвертируем в минуты для сравнения
            }
            return 0
          }
          
          const timeA = parseTime(a.time)
          const timeB = parseTime(b.time)
          return timeB - timeA // Более позднее время идет первым
        }
        
        return dateDiff // Обратный порядок (от новых к старым)
      }
      // Если только у одного есть дата, он идет первым
      if (dateA && !dateB) return -1
      if (!dateA && dateB) return 1
      // Если у обоих нет даты, сохраняем исходный порядок
      return 0
    })
  }, [patients, searchQuery, selectedDoctor, selectedNurse, selectedStatus])

  // Используем ref для отслеживания предыдущего значения, чтобы избежать лишних обновлений
  const prevFilteredRef = useRef<string>('')
  
  // Уведомляем родительский компонент об изменении отфильтрованного списка
  useEffect(() => {
    // Создаем строку для сравнения (простой способ сравнить массивы)
    const currentKey = JSON.stringify(filteredPatients.map(p => p.id).sort())
    
    // Обновляем только если список действительно изменился
    if (prevFilteredRef.current !== currentKey) {
      prevFilteredRef.current = currentKey
      onFilteredPatientsChange(filteredPatients)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPatients]) // Убираем onFilteredPatientsChange из зависимостей, чтобы избежать бесконечного цикла

  const hasActiveFilters = selectedDoctor || selectedNurse || selectedStatus

  return (
    <div className="mb-6 space-y-4">
      {/* Поиск */}
      <div className="relative">
        <input
          type="text"
          placeholder="Поиск по имени, фамилии или телефону..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-5 py-4 pl-12 text-lg border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
        <svg
          className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Кнопка показа/скрытия фильтров */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`w-full px-5 py-3 rounded-2xl font-medium transition-colors flex items-center justify-between ${
          showFilters || hasActiveFilters
            ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
            : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
        }`}
      >
        <span className="flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Фильтры
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              {[selectedDoctor, selectedNurse, selectedStatus].filter(Boolean).length}
            </span>
          )}
        </span>
        <svg
          className={`h-5 w-5 transition-transform ${showFilters ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Панель фильтров */}
      {showFilters && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 space-y-4">
          {/* Фильтр по врачу */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Врач
            </label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Все врачи</option>
              {doctors.map(doctor => (
                <option key={doctor} value={doctor}>{doctor}</option>
              ))}
            </select>
          </div>

          {/* Фильтр по медсестре */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Медсестра
            </label>
            <select
              value={selectedNurse}
              onChange={(e) => setSelectedNurse(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Все медсестры</option>
              {nurses.map(nurse => (
                <option key={nurse} value={nurse}>{nurse}</option>
              ))}
            </select>
          </div>

          {/* Фильтр по статусу */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Статус
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Все статусы</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Кнопка сброса фильтров */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSelectedDoctor('')
                setSelectedNurse('')
                setSelectedStatus('')
              }}
              className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      )}

      {/* Индикатор результатов */}
      {filteredPatients.length !== patients.length && (
        <div className="text-sm text-gray-600 text-center">
          Найдено: {filteredPatients.length} из {patients.length}
        </div>
      )}
    </div>
  )
}
