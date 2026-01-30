'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { PatientCard } from './PatientCard'
import { SearchAndFilters } from './SearchAndFilters'
import { Header } from '../components/Header'

interface Patient {
  id: string
  name: string
  phone: string | null
  date: string | null
  time: string | null
  doctor: string | null
  status: string | null
  nurse?: string | null
  birthDate?: string | null
  emoji?: string | null
  comments?: string | null
}

interface PatientsListProps {
  patients: Patient[]
}

export function PatientsList({ patients }: PatientsListProps) {
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>(patients)

  // Функция для парсинга даты из разных форматов
  const parseDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null

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

  // Преобразуем пациентов в нужный формат и сортируем по дате (desc)
  const formattedPatients = useMemo(() => {
    const formatted = patients.map(patient => ({
      id: patient.id || 'без id',
      name: patient.name || 'Без имени',
      phone: patient.phone || null,
      date: patient.date || null,
      time: patient.time || null,
      doctor: patient.doctor || null,
      status: patient.status || null,
      nurse: patient.nurse || null,
      birthDate: patient.birthDate || null,
      emoji: patient.emoji || null,
      comments: patient.comments || null,
    }))

    // Сортировка по дате и времени приёма (desc - от новых к старым)
    return formatted.sort((a, b) => {
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
  }, [patients])

  // Стабилизируем функцию обратного вызова с useCallback
  const handleFilteredPatientsChange = useCallback((filtered: Patient[]) => {
    setFilteredPatients(filtered)
  }, [])

  // Обновляем filteredPatients при изменении patients
  useEffect(() => {
    setFilteredPatients(formattedPatients)
  }, [formattedPatients])

  return (
    <>
      <SearchAndFilters
        patients={formattedPatients}
        onFilteredPatientsChange={handleFilteredPatientsChange}
      />

      {filteredPatients.length === 0 ? (
        <div className="bg-white rounded-[20px] p-12 text-center shadow-sm">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Ничего не найдено</h3>
          <p className="text-gray-500 text-base">Попробуйте изменить параметры поиска или фильтры</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPatients.map((patient) => (
            <PatientCard
              key={`patient-${patient.id}`}
              patient={patient}
              rowIndex={0}
            />
          ))}
        </div>
      )}
    </>
  )
}
