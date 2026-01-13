// app/patients/PatientCard.tsx
'use client'

import { useState } from 'react'
import { PatientDetailsModal } from './PatientDetailsModal' // Убедитесь, что этот импорт правильный

interface PatientCardProps {
  patient: Record<string, any> // Теперь patient содержит "чистые" строковые данные
  rowIndex?: number // Оставляем только то, что используется
}

export function PatientCard({ patient, rowIndex }: PatientCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Доступ к полям напрямую из объекта patient
  const { id, name, phone, date, time, doctor, status } = patient

  const formattedTime = time?.substring(0, 5) // "HH:MM"
  const formattedPhone = phone ? `+${phone.replace(/\D/g, '').replace(/(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 ($2) $3-$4-$5')}` : 'Не указан'

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="bg-white rounded-[20px] p-5 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.98]"
      >
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-xl font-semibold text-gray-900 leading-tight">
            {name}
          </h2>
          {time && date && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap">
              {date} {formattedTime}
            </span>
          )}
        </div>

        <div className="text-gray-600 text-sm mb-2">
          {doctor && <p className="font-medium">Врач: {doctor}</p>}
        </div>

        <div className="flex items-center text-gray-500 text-sm">
          {phone && (
            <a href={`tel:${phone.replace(/\D/g, '')}`} className="flex items-center text-blue-600 hover:underline">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              {formattedPhone}
            </a>
          )}
          {status && (
            <span className="ml-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {status}
            </span>
          )}
        </div>
      </div>

      {isModalOpen && (
        <PatientDetailsModal
          patient={patient}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          rowIndex={rowIndex}
        />
      )}
    </>
  )
}
