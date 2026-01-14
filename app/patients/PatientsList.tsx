'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { PatientCard } from './PatientCard'
import { SearchAndFilters } from './SearchAndFilters'

interface Patient {
  id: string
  name: string
  phone: string | null
  date: string | null
  time: string | null
  doctor: string | null
  status: string | null
  nurse?: string | null
}

interface PatientsListProps {
  patients: Patient[]
}

export function PatientsList({ patients }: PatientsListProps) {
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>(patients)

  // Преобразуем пациентов в нужный формат (мемоизируем, чтобы не пересоздавать при каждом рендере)
  const formattedPatients = useMemo(() => patients.map(patient => ({
    id: patient.id || 'без id',
    name: patient.name || 'Без имени',
    phone: patient.phone || null,
    date: patient.date || null,
    time: patient.time || null,
    doctor: patient.doctor || null,
    status: patient.status || null,
    nurse: patient.nurse || null,
  })), [patients])

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
