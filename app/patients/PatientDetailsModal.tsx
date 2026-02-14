'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { handleUpdatePatient, handleDeletePatient } from './actions'
import { ToastManager } from './Toast'
import { useAuth } from '../contexts/AuthContext'
import { PATIENT_STATUSES } from '../../lib/constants'
import { useConstants } from '../hooks/useConstants'
import { formatTime } from '@/lib/utils'
import { ConfirmChangesModal } from './ConfirmChangesModal'
import { formatPhone, formatBirthDate, convertToISODate, convertISOToDisplay } from '@/lib/formatters'

// Удалено так как теперь в @/lib/formatters

interface PatientDetailsModalProps {
  patient: Record<string, any> // Теперь patient содержит "чистые" строковые данные
  isOpen: boolean
  onClose: () => void
  rowIndex?: number // Принимаем rowIndex
}

export function PatientDetailsModal({ patient, isOpen, onClose, rowIndex }: PatientDetailsModalProps) {
  const { user } = useAuth()
  const { doctors, nurses } = useConstants()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingClose, setPendingClose] = useState(false)
  const [birthDateDisplay, setBirthDateDisplay] = useState('')
  const [appointmentDateDisplay, setAppointmentDateDisplay] = useState('')
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
    } catch { }
    return date
  })() : ''

  // Исходные данные для сравнения (будет обновляться в useEffect)
  const [initialData, setInitialData] = useState({
    name,
    phone: formatPhone(phone),
    date: formattedDate,
    time: formatTime(time),
    doctor: doctor || '',
    status: status || '',
    comments: comments || '',
    birthDate: birthDate || '',
    teeth: teeth || '',
    nurse: nurse || '',
  })

  const [formData, setFormData] = useState(initialData)

  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  useEffect(() => {
    // Обновляем formData при изменении patient или открытии модального окна
    const newInitialData = {
      name,
      phone,
      date: formattedDate,
      time: formatTime(time),
      doctor: doctor || '',
      status: status || '',
      comments: comments || '',
      birthDate: birthDate || '',
      teeth: teeth || '',
      nurse: nurse || '',
    }
    setInitialData(newInitialData)
    setFormData({ ...newInitialData, phone: formatPhone(newInitialData.phone) })
    setBirthDateDisplay(birthDate ? convertISOToDisplay(birthDate) : '')
    setAppointmentDateDisplay(date ? convertISOToDisplay(date) : '')
    setError(null)
    setShowConfirmModal(false)
    setPendingClose(false)
  }, [patient, isOpen, name, phone, formattedDate, time, doctor, status, comments, birthDate, teeth, nurse, date])

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
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (value.length < 4) {
      setFormData({ ...formData, phone: '+7 (' })
      return
    }
    const formatted = formatPhone(value)
    setFormData({ ...formData, phone: formatted })
  }

  function handlePhoneKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Разрешаем удаление, но не позволяем удалить базовую часть
    if (e.key === 'Backspace' && formData.phone.length <= 4) {
      e.preventDefault()
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

  // Обработчик закрытия с проверкой изменений
  const handleClose = () => {
    if (hasChanges()) {
      setPendingClose(true)
      setShowConfirmModal(true)
    } else {
      onClose()
    }
  }

  // Подтверждение применения изменений
  const handleConfirmChanges = async () => {
    setShowConfirmModal(false)
    setPendingClose(false)
    await handleSave()
  }

  // Отмена изменений
  const handleCancelChanges = () => {
    setShowConfirmModal(false)
    if (pendingClose) {
      setPendingClose(false)
      onClose()
    }
  }

  if (!isOpen) return null

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

    // Форматируем телефон перед отправкой
    const phoneInput = formData.phone
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

      const result = await handleUpdatePatient(idToUpdate, formDataObj)

      if (result.success) {
        // Показываем уведомление об успехе
        ToastManager.success('Применено')
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await handleSave()
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
              Редактирование пациента
            </h2>
            <button
              onClick={handleClose}
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
                    maxLength={60}
                    className="w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
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
                    className="w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    onChange={handlePhoneChange}
                    onKeyDown={handlePhoneKeyDown}
                    required
                    className="w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+7 (999) 123-45-67"
                    maxLength={18}
                  />
                </div>

                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-3">
                    Дата приема
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    name="dateDisplay"
                    value={appointmentDateDisplay}
                    onChange={handleAppointmentDateChange}
                    required
                    className="w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ДД.ММ.ГГГГ"
                    maxLength={10}
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
                    className="w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-5 py-4 text-lg border border-gray-300 bg-white rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
          </div>

          {/* Sticky bottom buttons */}
          <div
            className="flex-shrink-0 bg-white border-t border-gray-200 px-6 flex flex-col gap-3"
            style={{
              paddingBottom: 'max(1rem, calc(1rem + env(safe-area-inset-bottom)))',
              paddingTop: '1rem'
            }}
          >
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

      {/* Модальное окно подтверждения изменений */}
      <ConfirmChangesModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmChanges}
        onCancel={handleCancelChanges}
        changes={getChanges()}
      />
    </>
  )
}
