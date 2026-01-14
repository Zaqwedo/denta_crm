'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { handleUpdatePatient, handleDeletePatient } from './actions'
import { ToastManager } from './Toast'
import { useAuth } from '../contexts/AuthContext'
import { DOCTORS, NURSES, PATIENT_STATUSES } from '../lib/constants'

interface PatientDetailsModalProps {
  patient: Record<string, any> // Теперь patient содержит "чистые" строковые данные
  isOpen: boolean
  onClose: () => void
  rowIndex?: number // Принимаем rowIndex
}

export function PatientDetailsModal({ patient, isOpen, onClose, rowIndex }: PatientDetailsModalProps) {
  const { user } = useAuth()
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Доступ к полям напрямую из объекта patient
  const patientId = patient.id // ID теперь напрямую из cleanPatient
  const name = patient.name

  // Разделяем объединенное поле "Телефон Комментарии" на телефон и комментарии
  const phoneCommentsField = patient['Телефон Комментарии'] || patient.phone || '';
  const phoneParts = phoneCommentsField.trim().split(/\s+/);
  const phone = phoneParts.length > 0 ? phoneParts[0] : '';
  const comments = phoneParts.length > 1 ? phoneParts.slice(1).join(' ') : (patient.comments || '');

  const date = patient.date
  const time = patient.time
  const doctor = patient.doctor
  const status = patient.status
  const birthDate = patient.birthDate || ''
  const teeth = patient.teeth || ''
  const nurse = patient.nurse || ''

  // Форматируем дату для input type="date"
  const formattedDate = date ? (() => {
    try {
      const dateObj = new Date(date)
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0]
      }
    } catch (e) {}
    return date
  })() : ''

  // Функция для форматирования телефона с маской для отображения
  const formatPhoneForDisplay = (phoneStr: string): string => {
    const digits = String(phoneStr).replace(/\D/g, '')
    if (digits.length === 11 && digits.startsWith('7')) {
      return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
    }
    return phoneStr
  }

  const [formData, setFormData] = useState({
    name,
    phone, // Показываем сырые данные из базы в режиме просмотра
    date: formattedDate,
    time,
    doctor,
    status,
    comments,
    birthDate,
    teeth,
    nurse,
  })

  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  useEffect(() => {
    // Обновляем formData при изменении patient или открытии модального окна
    setFormData({
      name,
      phone, // Всегда начинаем с сырых данных из базы
      date: formattedDate,
      time,
      doctor,
      status,
      comments,
      birthDate,
      teeth,
      nurse,
    })
    // Сбрасываем режим редактирования при открытии модального окна
    setIsEditMode(false)
    setError(null)
  }, [patient, isOpen, name, phone, formattedDate, time, doctor, status, comments, birthDate, teeth, nurse])

  // Отдельный useEffect для переключения форматирования телефона при изменении режима
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      phone: isEditMode ? formatPhoneForDisplay(phone) : phone
    }))
  }, [isEditMode, phone])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formDataObj = new FormData(e.currentTarget)

    // Форматируем телефон перед отправкой
    const phoneInput = formDataObj.get('phone') as string
    const phoneDigits = phoneInput.replace(/\D/g, '')
    const finalFormattedPhone = phoneDigits.startsWith('8')
      ? `+7${phoneDigits.slice(1)}`
      : phoneDigits.startsWith('7')
        ? `+${phoneDigits}`
        : `+7${phoneDigits}`
    formDataObj.set('phone', finalFormattedPhone)

    try {
      // Используем rowIndex как ID, если id из данных не определен
      const idToUpdate = patientId || rowIndex;
      if (!idToUpdate) {
        throw new Error('Не удалось определить ID пациента для обновления.');
      }

      console.log('📤 MODAL SUBMIT: Отправляем данные на сервер');
      console.log('📤 MODAL SUBMIT: ID для обновления:', idToUpdate);
      console.log('📤 MODAL SUBMIT: FormData содержимое:');
      for (const [key, value] of formDataObj.entries()) {
        console.log(`📤 MODAL SUBMIT: ${key}: "${value}"`);
      }

      const result = await handleUpdatePatient(idToUpdate, formDataObj)

      if (result.success) {
        // Показываем уведомление об успехе
        ToastManager.show('Применено')
        // Закрываем модальное окно только после успешного ответа от сервера
        onClose()
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
      // Используем rowIndex как ID, если id из данных не определен
      const idToDelete = patientId || rowIndex;
      if (!idToDelete) {
        throw new Error('Не удалось определить ID пациента для удаления.');
      }
      const result = await handleDeletePatient(idToDelete, user?.username || 'unknown')

      if (result.success) {
        // Закрываем модальное окно только после успешного ответа от сервера
        onClose()
        router.refresh()
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

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 p-0 sm:p-4">
        <div 
          className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full max-w-md shadow-xl flex flex-col"
          style={{ 
            maxHeight: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
            height: 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))'
          }}
        >
          {/* Фиксированный заголовок */}
          <div 
            className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-[20px]" 
            style={{ paddingTop: 'max(1rem, calc(1rem + env(safe-area-inset-top)))' }}
          >
            <h2 className="text-xl font-bold text-gray-900">
              {isEditMode ? 'Редактирование пациента' : 'Просмотр пациента'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Скроллируемый контент */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <form id="patient-form" onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
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
                className={`w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isEditMode
                    ? 'border-gray-300 bg-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
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
                className={`w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isEditMode
                    ? 'border-gray-300 bg-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
                Дата приема
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                readOnly={!isEditMode}
                className={`w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isEditMode
                    ? 'border-gray-300 bg-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
                Время
              </label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
                readOnly={!isEditMode}
                className={`w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isEditMode
                    ? 'border-gray-300 bg-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
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
                className={`w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isEditMode
                    ? 'border-gray-300 bg-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
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
                className={`w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isEditMode
                    ? 'border-gray-300 bg-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
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
                className={`w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isEditMode
                    ? 'border-gray-300 bg-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
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
                className={`w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isEditMode
                    ? 'border-gray-300 bg-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
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
                readOnly={!isEditMode}
                className={`w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  isEditMode
                    ? 'border-gray-300 bg-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
                placeholder="Дополнительная информация..."
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
                Дата рождения пациента
              </label>
              <input
                type="date"
                name="birthDate"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                readOnly={!isEditMode}
                className={`w-full px-5 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isEditMode
                    ? 'border-gray-300 bg-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-base">
                {error}
              </div>
            )}
              </div>
            </form>
          </div>

          {/* Sticky bottom buttons */}
          <div 
            className="flex-shrink-0 bg-white border-t border-gray-200 px-6 flex flex-col gap-3"
            style={{ 
              paddingBottom: 'max(1rem, calc(1rem + env(safe-area-inset-bottom)))',
              paddingTop: '1rem'
            }}
          >
          {isEditMode ? (
            // Режим редактирования: Сохранить и Отмена
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
                onClick={() => setIsEditMode(false)}
                disabled={isSubmitting}
                className="w-full px-6 py-4 bg-gray-600 text-white text-lg rounded-[14px] font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отмена
              </button>
            </>
          ) : (
            // Режим просмотра: Изменить и Удалить
            <>
              <button
                type="button"
                onClick={() => setIsEditMode(true)}
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
    </>
  )
}