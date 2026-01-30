'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { handleAddPatient } from '../actions'
import { useAuth } from '../../contexts/AuthContext'
import { ProtectedRoute } from '../../components/ProtectedRoute'
import { PATIENT_STATUSES } from '../../../lib/constants'
import { useConstants } from '../../hooks/useConstants'
import { Header } from '../../components/Header'

// Функция для форматирования телефона с маской
function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '')
  let formatted = numbers.startsWith('8') ? '7' + numbers.slice(1) : numbers
  if (formatted.startsWith('7')) {
    formatted = formatted.slice(1)
  }

  const limited = formatted.slice(0, 10)

  if (limited.length === 0) return '+7 ('
  if (limited.length <= 3) return `+7 (${limited}`
  if (limited.length <= 6) return `+7 (${limited.slice(0, 3)}) ${limited.slice(3)}`
  if (limited.length <= 8) return `+7 (${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
  return `+7 (${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6, 8)}-${limited.slice(8, 10)}`
}

// Функция для форматирования даты рождения DD.MM.YYYY
function formatBirthDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  const day = digits.slice(0, 2)
  const month = digits.slice(2, 4)
  const year = digits.slice(4, 8)

  if (digits.length <= 2) return day
  if (digits.length <= 4) return `${day}.${month}`
  return `${day}.${month}.${year}`
}

// Функция для конвертации из DD.MM.YYYY в YYYY-MM-DD
function convertToISODate(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return ''
  const [day, month, year] = dateStr.split('.')
  return `${year}-${month}-${day}`
}

// Функция для конвертации из YYYY-MM-DD в DD.MM.YYYY
function convertISOToDisplay(isoStr: string): string {
  if (!isoStr || !isoStr.includes('-')) return isoStr || ''
  const [year, month, day] = isoStr.split('-')
  return `${day}.${month}.${year}`
}

interface NewPatientViewClientProps {
  initialDate?: string
}

export function NewPatientViewClient({ initialDate }: NewPatientViewClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { doctors, nurses } = useConstants()
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phoneValue, setPhoneValue] = useState('+7 (')
  const [birthDateDisplay, setBirthDateDisplay] = useState('')
  const [appointmentDateDisplay, setAppointmentDateDisplay] = useState(initialDate ? convertISOToDisplay(initialDate) : convertISOToDisplay(new Date().toISOString().split('T')[0]))

  // Используем дату из пропса или сегодняшнюю
  const initialDateValue = initialDate || new Date().toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: initialDateValue,
    time: '',
    doctor: '',
    status: 'Ожидает',
    comments: '',
    birthDate: '',
    teeth: '',
    nurse: '',
  })

  useEffect(() => {
    if (nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 100)
    }
  }, [])

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target.value
    const formatted = formatPhone(input)
    setPhoneValue(formatted)
    // Сохраняем только цифры в formData
    const digits = formatted.replace(/\D/g, '')
    setFormData({ ...formData, phone: digits.startsWith('7') ? `+${digits}` : `+7${digits.slice(1)}` })
  }

  function handleBirthDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target.value
    const formatted = formatBirthDate(input)
    setBirthDateDisplay(formatted)

    if (formatted.length === 10) {
      setFormData({ ...formData, birthDate: convertToISODate(formatted) })
    } else {
      setFormData({ ...formData, birthDate: '' })
    }
  }

  function handleAppointmentDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target.value
    const formatted = formatBirthDate(input)
    setAppointmentDateDisplay(formatted)

    if (formatted.length === 10) {
      setFormData({ ...formData, date: convertToISODate(formatted) })
    } else {
      setFormData({ ...formData, date: '' })
    }
  }

  function handlePhoneKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Разрешаем удаление, но не позволяем удалить базовую часть
    if (e.key === 'Backspace' && phoneValue.length <= 4) {
      e.preventDefault()
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    e.stopPropagation()

    setIsSubmitting(true)
    setError(null)

    // Валидация обязательных полей
    if (!formData.name?.trim()) {
      setError('Поле "ФИО" обязательно для заполнения')
      setIsSubmitting(false)
      return
    }

    if (!formData.doctor?.trim()) {
      setError('Поле "Доктор" обязательно для заполнения')
      setIsSubmitting(false)
      return
    }

    const formDataObj = new FormData()
    formDataObj.append('name', formData.name)
    formDataObj.append('phone', formData.phone)
    formDataObj.append('date', formData.date)
    formDataObj.append('time', formData.time)
    formDataObj.append('doctor', formData.doctor)
    formDataObj.append('status', formData.status)
    formDataObj.append('comments', formData.comments)
    formDataObj.append('birthDate', formData.birthDate)
    formDataObj.append('teeth', formData.teeth)
    formDataObj.append('nurse', formData.nurse)
    formDataObj.append('created_by_email', user?.username || '')

    try {
      const result = await handleAddPatient(formDataObj)

      if (result.success) {
        router.push('/patients')
        router.refresh()
      } else {
        setError(result.error || 'Произошла ошибка при добавлении пациента')
      }
    } catch (err) {
      setError('Произошла ошибка при отправке формы')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f2f2f7] pb-24" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        <div className="max-w-md mx-auto px-4 py-6">
          <Header
            title="Новая запись"
            onBack={() => router.back()}
          />

          {/* Form */}
          <form
            id="patient-form"
            onSubmit={handleSubmit}
            className="bg-white rounded-[20px] p-6 shadow-sm transition-all"
            style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
          >
            <div className="space-y-6" style={{ width: '100%', maxWidth: '100%' }}>
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  ФИО *
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full max-w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border cursor-text"
                  style={{ width: '100%' }}
                  placeholder="Введите ФИО пациента"
                />
              </div>

              <div className="w-full" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Дата рождения пациента
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="birthDateDisplay"
                  value={birthDateDisplay}
                  onChange={handleBirthDateChange}
                  className="w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border"
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box'
                  }}
                  placeholder="ДД.ММ.ГГГГ"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Телефон
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={phoneValue}
                  onChange={handlePhoneChange}
                  onKeyDown={handlePhoneKeyDown}
                  className="w-full max-w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border cursor-text"
                  style={{ width: '100%' }}
                  placeholder="+7 (999) 123-45-67"
                  maxLength={18}
                />
              </div>

              <div className="w-full" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Дата приема
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="dateDisplay"
                  value={appointmentDateDisplay}
                  onChange={handleAppointmentDateChange}
                  className="w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border"
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box'
                  }}
                  placeholder="ДД.ММ.ГГГГ"
                  maxLength={10}
                />
              </div>

              <div className="w-full" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Время
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border"
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Статус
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full max-w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border"
                  style={{ width: '100%' }}
                >
                  {PATIENT_STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Доктор *
                </label>
                <select
                  name="doctor"
                  value={formData.doctor}
                  onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                  required
                  className="w-full max-w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border"
                  style={{ width: '100%' }}
                >
                  <option value="">Выберите врача</option>
                  {doctors.map(doctor => (
                    <option key={doctor} value={doctor}>{doctor}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Медсестра
                </label>
                <select
                  name="nurse"
                  value={formData.nurse}
                  onChange={(e) => setFormData({ ...formData, nurse: e.target.value })}
                  className="w-full max-w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border"
                  style={{ width: '100%' }}
                >
                  <option value="">Выберите медсестру</option>
                  {nurses.map(nurse => (
                    <option key={nurse} value={nurse}>{nurse}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Зубы
                </label>
                <input
                  type="text"
                  name="teeth"
                  value={formData.teeth}
                  onChange={(e) => setFormData({ ...formData, teeth: e.target.value })}
                  className="w-full max-w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border"
                  style={{ width: '100%' }}
                  placeholder="Например: 11, 12, 13 или все"
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Комментарии
                </label>
                <textarea
                  name="comments"
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  rows={3}
                  className="w-full max-w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none box-border"
                  style={{ width: '100%' }}
                  placeholder="Дополнительная информация..."
                />
              </div>


              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-base">
                  {error}
                </div>
              )}
            </div>
          </form>

          {/* Action Button */}
          <div className="mt-6">
            <button
              type="submit"
              form="patient-form"
              disabled={isSubmitting}
              className="w-full px-6 py-4 bg-blue-600 text-white text-lg rounded-[14px] font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Создание...' : 'Создать запись'}
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
