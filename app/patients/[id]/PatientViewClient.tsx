'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { handleUpdatePatient, handleDeletePatient } from '../actions'
import { useAuth } from '../../contexts/AuthContext'
import { TabBar } from '../TabBar'
import { ProtectedRoute } from '../../components/ProtectedRoute'
import { DOCTORS, NURSES, PATIENT_STATUSES } from '../../../lib/constants'

interface PatientViewClientProps {
  patient: Record<string, any> | null
  error: string | null
}

export function PatientViewClient({ patient: initialPatient, error: initialError }: PatientViewClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const patientId = initialPatient?.id ? String(initialPatient.id) : ''

  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Форматируем дату для input type="date"
  const formattedDate = initialPatient?.date ? (() => {
    try {
      const dateObj = new Date(initialPatient.date)
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0]
      }
    } catch (e) {}
    return initialPatient.date
  })() : ''

  const [formData, setFormData] = useState({
    name: initialPatient?.name || '',
    phone: initialPatient?.phone || '',
    date: formattedDate,
    time: initialPatient?.time || '',
    doctor: initialPatient?.doctor || '',
    status: initialPatient?.status || '',
    comments: initialPatient?.comments || '',
    birthDate: initialPatient?.birthDate || '',
    teeth: initialPatient?.teeth || '',
    nurse: initialPatient?.nurse || '',
  })

  useEffect(() => {
    if (isEditMode && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 100)
    }
  }, [isEditMode])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    e.stopPropagation()
    
    // Проверяем, что мы в режиме редактирования
    if (!isEditMode) {
      console.log('❌ Попытка сохранить форму, но режим редактирования выключен. isEditMode:', isEditMode)
      return
    }
    
    console.log('✅ Сохранение формы, режим редактирования включен')
    setIsSubmitting(true)
    setError(null)

    const formDataObj = new FormData(e.currentTarget)
    
    try {
      const result = await handleUpdatePatient(patientId, formDataObj, user?.username || undefined)

      if (result.success) {
        setIsEditMode(false)
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
              onClick={() => router.back()}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Редактирование' : 'Просмотр пациента'}
            </h1>
            {/* Debug: показываем состояние режима редактирования */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-400">Режим редактирования: {isEditMode ? 'ВКЛ' : 'ВЫКЛ'}</div>
            )}
            <div className="w-10"></div> {/* Spacer для центрирования */}
          </div>

          {/* Form */}
          <form 
            id="patient-form" 
            onSubmit={handleSubmit}
            onKeyDown={(e) => {
              // Предотвращаем submit при нажатии Enter, если не в режиме редактирования
              if (e.key === 'Enter' && !isEditMode) {
                e.preventDefault()
              }
            }}
            className={`bg-white rounded-[20px] p-6 shadow-sm transition-all ${
              isEditMode ? 'ring-2 ring-blue-500' : ''
            }`}
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
                  readOnly={!isEditMode}
                  className={`w-full max-w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border ${
                    isEditMode
                      ? 'border-gray-300 bg-white cursor-text'
                      : 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed'
                  }`}
                  style={{ width: '100%' }}
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
                  readOnly={!isEditMode}
                  className={`w-full max-w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border ${
                    isEditMode
                      ? 'border-gray-300 bg-white cursor-text'
                      : 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed'
                  }`}
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
                  disabled={!isEditMode}
                  className={`w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border`}
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    borderColor: isEditMode ? '#d1d5db' : '#e5e7eb',
                    backgroundColor: isEditMode ? '#ffffff' : '#f9fafb',
                    color: isEditMode ? '#111827' : '#374151',
                    cursor: isEditMode ? 'text' : 'not-allowed'
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
                  disabled={!isEditMode}
                  className={`w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border`}
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    borderColor: isEditMode ? '#d1d5db' : '#e5e7eb',
                    backgroundColor: isEditMode ? '#ffffff' : '#f9fafb',
                    color: isEditMode ? '#111827' : '#374151',
                    cursor: isEditMode ? 'text' : 'not-allowed'
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
                  disabled={!isEditMode}
                  className={`w-full max-w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border ${
                    isEditMode
                      ? 'border-gray-300 bg-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700'
                  }`}
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
                  disabled={!isEditMode}
                  className={`w-full max-w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border ${
                    isEditMode
                      ? 'border-gray-300 bg-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700'
                  }`}
                  style={{ width: '100%' }}
                >
                  <option value="">Выберите врача</option>
                  {DOCTORS.map(doctor => (
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
                  disabled={!isEditMode}
                  className={`w-full max-w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border ${
                    isEditMode
                      ? 'border-gray-300 bg-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700'
                  }`}
                  style={{ width: '100%' }}
                >
                  <option value="">Выберите медсестру</option>
                  {NURSES.map(nurse => (
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
                  readOnly={!isEditMode}
                  className={`w-full max-w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border ${
                    isEditMode
                      ? 'border-gray-300 bg-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed'
                  }`}
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
                  readOnly={!isEditMode}
                  rows={3}
                  className={`w-full max-w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none box-border ${
                    isEditMode
                      ? 'border-gray-300 bg-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700 cursor-not-allowed'
                  }`}
                  style={{ width: '100%' }}
                  placeholder="Дополнительная информация..."
                />
              </div>

              <div className="w-full" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  Дата рождения пациента
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  disabled={!isEditMode}
                  className={`w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border`}
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    borderColor: isEditMode ? '#d1d5db' : '#e5e7eb',
                    backgroundColor: isEditMode ? '#ffffff' : '#f9fafb',
                    color: isEditMode ? '#111827' : '#374151',
                    cursor: isEditMode ? 'text' : 'not-allowed'
                  }}
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
            {isEditMode ? (
              <>
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
                  onClick={() => {
                    setIsEditMode(false)
                    router.refresh() // Перезагружаем страницу для получения свежих данных
                  }}
                  disabled={isSubmitting}
                  className="w-full px-6 py-4 bg-gray-600 text-white text-lg rounded-[14px] font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Отмена
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('🔄 Кнопка "Изменить" нажата, текущий isEditMode:', isEditMode, 'будет установлен:', true)
                    setIsEditMode(true)
                    console.log('🔄 После setIsEditMode, состояние должно обновиться')
                  }}
                  onMouseDown={(e) => {
                    // Предотвращаем любые события мыши, которые могут триггерить submit
                    e.preventDefault()
                  }}
                  className="w-full px-6 py-4 bg-blue-600 text-white text-lg rounded-[14px] font-semibold hover:bg-blue-700 transition-colors"
                >
                  Изменить
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full px-6 py-4 bg-red-600 text-white text-lg rounded-[14px] font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Удаление...' : 'Удалить запись'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <TabBar />
    </ProtectedRoute>
  )
}
