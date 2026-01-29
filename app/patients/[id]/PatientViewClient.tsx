'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { handleUpdatePatient, handleDeletePatient } from '../actions'
import { useAuth } from '../../contexts/AuthContext'
import { TabBar } from '../TabBar'
import { ProtectedRoute } from '../../components/ProtectedRoute'
import { PATIENT_STATUSES } from '../../../lib/constants'
import { useConstants } from '../../hooks/useConstants'
import { formatTime } from '@/lib/utils'
import { ConfirmChangesModal } from '../ConfirmChangesModal'

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

interface PatientViewClientProps {
  patient: Record<string, any> | null
  error: string | null
}

export function PatientViewClient({ patient: initialPatient, error: initialError }: PatientViewClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { doctors, nurses } = useConstants()
  const patientId = initialPatient?.id ? String(initialPatient.id) : ''

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)
  const [birthDateDisplay, setBirthDateDisplay] = useState(initialPatient?.birthDate ? convertISOToDisplay(initialPatient.birthDate) : '')
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Отладочное логирование (только в development)
  if (process.env.NODE_ENV === 'development' && initialPatient) {
    console.log('🔍 PatientViewClient: Получены данные пациента:', {
      id: initialPatient.id,
      name: initialPatient.name,
      date: initialPatient.date,
      doctor: initialPatient.doctor,
      'doctor type': typeof initialPatient.doctor,
      'doctor length': initialPatient.doctor?.length,
      'doctor truthy': !!initialPatient.doctor,
      nurse: initialPatient.nurse,
      time: initialPatient.time,
      phone: initialPatient.phone,
      'Все поля initialPatient': initialPatient,
    })
  }

  // Форматируем дату для input type="date"
  const formattedDate = initialPatient?.date ? (() => {
    try {
      const dateStr = initialPatient.date
      // Если дата в формате DD.MM.YYYY, преобразуем в YYYY-MM-DD
      if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
        const [day, month, year] = dateStr.split('.')
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
      // Если дата уже в формате YYYY-MM-DD, возвращаем как есть
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr
      }
      // Пробуем стандартное преобразование
      const dateObj = new Date(dateStr)
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0]
      }
    } catch (e) { }
    return initialPatient.date
  })() : ''

  // Исходные данные для сравнения (будет обновляться в useEffect)
  const [initialData, setInitialData] = useState({
    name: initialPatient?.name || '',
    phone: initialPatient?.phone || '',
    date: formattedDate,
    time: formatTime(initialPatient?.time) || '',
    doctor: initialPatient?.doctor || '',
    status: initialPatient?.status || '',
    comments: initialPatient?.comments || '',
    birthDate: initialPatient?.birthDate || '',
    teeth: initialPatient?.teeth || '',
    nurse: initialPatient?.nurse || '',
  })

  const [formData, setFormData] = useState(initialData)

  useEffect(() => {
    if (nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 100)
    }
  }, [])

  // Обновляем formData при изменении initialPatient (например, после обновления данных)
  useEffect(() => {
    if (initialPatient) {
      const newFormattedDate = initialPatient?.date ? (() => {
        try {
          const dateStr = initialPatient.date
          // Если дата в формате DD.MM.YYYY, преобразуем в YYYY-MM-DD
          if (dateStr.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
            const [day, month, year] = dateStr.split('.')
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          }
          // Если дата уже в формате YYYY-MM-DD, возвращаем как есть
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr
          }
          // Пробуем стандартное преобразование
          const dateObj = new Date(dateStr)
          if (!isNaN(dateObj.getTime())) {
            return dateObj.toISOString().split('T')[0]
          }
        } catch (e) { }
        return initialPatient.date
      })() : ''

      const newInitialData = {
        name: initialPatient.name || '',
        phone: initialPatient.phone || '',
        date: newFormattedDate,
        time: formatTime(initialPatient.time) || '',
        doctor: initialPatient.doctor || '',
        status: initialPatient.status || '',
        comments: initialPatient.comments || '',
        birthDate: initialPatient.birthDate || '',
        teeth: initialPatient.teeth || '',
        nurse: initialPatient.nurse || '',
      }

      setInitialData(newInitialData)
      setFormData(newInitialData)
      setBirthDateDisplay(initialPatient.birthDate ? convertISOToDisplay(initialPatient.birthDate) : '')
      setShowConfirmModal(false)
      setPendingNavigation(null)
    }
  }, [initialPatient])

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

  // Функция для проверки наличия изменений
  const hasChanges = () => {
    return (
      formData.name !== initialData.name ||
      formData.phone !== initialData.phone ||
      formData.date !== initialData.date ||
      formData.time !== initialData.time ||
      formData.doctor !== initialData.doctor ||
      formData.status !== initialData.status ||
      formData.comments !== initialData.comments ||
      formData.birthDate !== initialData.birthDate ||
      formData.teeth !== initialData.teeth ||
      formData.nurse !== initialData.nurse
    )
  }

  // Функция для получения списка изменений
  const getChanges = () => {
    const changes: Array<{ field: string; oldValue: string; newValue: string }> = []
    const fieldNames: Record<string, string> = {
      name: 'ФИО',
      phone: 'Телефон',
      date: 'Дата приема',
      time: 'Время',
      doctor: 'Доктор',
      status: 'Статус',
      comments: 'Комментарии',
      birthDate: 'Дата рождения',
      teeth: 'Зубы',
      nurse: 'Медсестра',
    }

    Object.keys(initialData).forEach((key) => {
      const typedKey = key as keyof typeof initialData
      if (formData[typedKey] !== initialData[typedKey]) {
        changes.push({
          field: fieldNames[typedKey] || key,
          oldValue: String(initialData[typedKey] || '(пусто)'),
          newValue: String(formData[typedKey] || '(пусто)'),
        })
      }
    })

    return changes
  }

  // Обработчик навигации с проверкой изменений
  const handleNavigation = (navigationFn: () => void) => {
    if (hasChanges()) {
      setPendingNavigation(() => navigationFn)
      setShowConfirmModal(true)
    } else {
      navigationFn()
    }
  }

  // Подтверждение применения изменений
  const handleConfirmChanges = async () => {
    setShowConfirmModal(false)
    await handleSave()
    if (pendingNavigation) {
      pendingNavigation()
      setPendingNavigation(null)
    }
  }

  // Отмена изменений
  const handleCancelChanges = () => {
    setShowConfirmModal(false)
    if (pendingNavigation) {
      pendingNavigation()
      setPendingNavigation(null)
    }
  }

  async function handleSave() {
    setIsSubmitting(true)
    setError(null)

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

    try {
      const result = await handleUpdatePatient(patientId, formDataObj, user?.username || undefined)

      if (result.success) {
        router.refresh()
      } else {
        setError(result.error || 'Произошла ошибка при обновлении')
      }
    } catch (err) {
      setError('Произошла ошибка при отправке формы')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    e.stopPropagation()
    await handleSave()
  }

  async function handleDelete() {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const result = await handleDeletePatient(patientId, user?.username || 'unknown')

      if (result.success) {
        router.push('/patients')
      } else {
        setError(result.error || 'Произошла ошибка при удалении')
      }
    } catch (err) {
      setError('Произошла ошибка при удалении')
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!initialPatient) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#f2f2f7] flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Пациент не найден'}</p>
            <button
              onClick={() => router.push('/patients')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold"
            >
              Вернуться к списку
            </button>
          </div>
        </div>
        <TabBar />
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f2f2f7] pb-24" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        <div className="max-w-md mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => handleNavigation(() => router.back())}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Редактирование пациента
            </h1>
            <div className="w-10"></div> {/* Spacer для центрирования */}
          </div>

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
                  ФИО
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
                  placeholder="ДД.ММ.ГГГГ"
                  maxLength={10}
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
                  Телефон
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="w-full max-w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border cursor-text"
                  style={{ width: '100%' }}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>

              <div className="w-full" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Дата приема
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border"
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box'
                  }}
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
                  required
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
                  Доктор
                </label>
                <select
                  name="doctor"
                  value={formData.doctor}
                  onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                  className="w-full max-w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border"
                  style={{ width: '100%' }}
                >
                  <option value="">Выберите врача</option>
                  {doctors.map(doctor => (
                    <option key={doctor} value={doctor}>{doctor}</option>
                  ))}
                  {/* Если значение врача не в списке, добавляем его как опцию */}
                  {formData.doctor && !doctors.includes(formData.doctor) && (
                    <option value={formData.doctor}>{formData.doctor}</option>
                  )}
                </select>
                {/* Показываем предупреждение, если значение не в списке */}
                {formData.doctor && !doctors.includes(formData.doctor) && (
                  <p className="mt-2 text-sm text-yellow-600">
                    ⚠️ Врач "{formData.doctor}" не найден в списке доступных врачей
                  </p>
                )}
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

          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            <button
              type="submit"
              form="patient-form"
              disabled={isSubmitting}
              className="w-full px-6 py-4 bg-blue-600 text-white text-lg rounded-[14px] font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full px-6 py-4 bg-red-600 text-white text-lg rounded-[14px] font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Удаление...' : 'Удалить запись'}
            </button>
          </div>
        </div>
      </div>
      <TabBar />
      <ConfirmChangesModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmChanges}
        onCancel={handleCancelChanges}
        changes={getChanges()}
      />
    </ProtectedRoute>
  )
}
