// app/patients/PatientCard.tsx
'use client'

import { useRouter } from 'next/navigation'
import { formatTime } from '@/lib/utils'

interface PatientCardProps {
  patient: Record<string, any> // Теперь patient содержит "чистые" строковые данные
  rowIndex?: number // Оставляем только то, что используется
}

export function PatientCard({ patient, rowIndex }: PatientCardProps) {
  const router = useRouter()

  // Доступ к полям напрямую из объекта patient
  const { id, name, phone, date, time, doctor, status, birthDate, nurse, emoji, comments } = patient

  const formattedTime = formatTime(time) // "HH:MM"
  const formattedPhone = phone ? `+${phone.replace(/\D/g, '').replace(/(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 ($2) $3-$4-$5')}` : 'Не указан'

  const handleClick = () => {
    router.push(`/patients/${id}`)
  }

  // Функция для получения иконки статуса
  const getStatusIcon = (status: string) => {
    const statusLower = status?.toLowerCase() || ''

    if (statusLower.includes('завершен')) {
      // Завершен - галочка в круге (зеленый)
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    } else if (statusLower.includes('подтвержден')) {
      // Подтверждён - галочка в круге (зеленый)
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    } else if (statusLower.includes('отменен')) {
      // Отменен - крестик в круге (красный)
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-red-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )
    } else if (statusLower.includes('ожидает')) {
      // Ожидает - часы (желтый/оранжевый)
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      )
    } else {
      // По умолчанию - галочка (серый)
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    }
  }

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-[20px] p-5 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.98]"
    >
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-xl font-semibold text-gray-900 leading-tight flex items-center gap-2">
          {emoji && <span>{emoji}</span>}
          {name}
        </h2>
        {time && date && (
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap">
            {date} {formattedTime}
          </span>
        )}
      </div>

      <div className="flex flex-col text-gray-600 text-sm mb-3">
        {doctor && <p className="font-medium">Врач: {doctor}</p>}
        {nurse && <p className="font-medium mt-1">Медсестра: {nurse}</p>}
      </div>

      <div className="flex items-center text-gray-500 text-sm">
        {phone && (
          <a
            href={`tel:${phone.replace(/\D/g, '')}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center text-blue-600 hover:underline"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            {formattedPhone}
          </a>
        )}
        {status && (
          <span className="ml-4 flex items-center">
            {getStatusIcon(status)}
            {status}
          </span>
        )}
      </div>

      {comments && (
        <div className="mt-4 pt-3 border-t border-gray-50">
          <p className="text-sm text-gray-500 italic leading-snug">
            "{comments}"
          </p>
        </div>
      )}
    </div>
  )
}
