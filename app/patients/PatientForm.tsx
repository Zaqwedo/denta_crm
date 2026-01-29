'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { handleAddPatient } from './actions'
import { useAuth } from '../contexts/AuthContext'
import { PATIENT_STATUSES } from '../../lib/constants'
import { useConstants } from '../hooks/useConstants'

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

// Функция для форматирования телефона с маской
function formatPhone(value: string): string {
  // Удаляем все нецифровые символы
  const numbers = value.replace(/\D/g, '')

  // Если начинается с 8, заменяем на 7
  let formatted = numbers.startsWith('8') ? '7' + numbers.slice(1) : numbers
  if (formatted.startsWith('7')) {
    formatted = formatted.slice(1)
  }

  // Ограничиваем до 10 цифр
  const limited = formatted.slice(0, 10)

  // Форматируем: +7 (999) 999-99-99
  if (limited.length === 0) return '+7 ('
  if (limited.length <= 3) return `+7 (${limited}`
  if (limited.length <= 6) return `+7 (${limited.slice(0, 3)}) ${limited.slice(3)}`
  if (limited.length <= 8) return `+7 (${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
  return `+7 (${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6, 8)}-${limited.slice(8, 10)}`
}

// Функция для получения только цифр из телефона
function getPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^8/, '7').replace(/^7/, '7')
}

export function PatientForm({ isOpen: isOpenProp, onClose: onCloseProp, initialDate, isModal = true }: {
  isOpen?: boolean
  onClose?: () => void
  initialDate?: string
  isModal?: boolean
}) {
  const { user } = useAuth()
  const { doctors, nurses } = useConstants()
  const [isOpenInternal, setIsOpenInternal] = useState(false)
  const isOpen = isModal ? isOpenProp : isOpenInternal
  const onClose = isModal ? onCloseProp : () => setIsOpenInternal(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phoneValue, setPhoneValue] = useState('+7 (')
  const [birthDateDisplay, setBirthDateDisplay] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Автофокус на поле ФИО при открытии формы
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      // Небольшая задержка для корректной работы с модальным окном
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Валидация обязательных полей
    const name = formData.get('name') as string

    if (!name?.trim()) {
      setError('Поле "ФИО" обязательно для заполнения')
      setIsSubmitting(false)
      return
    }

    // Форматируем телефон перед отправкой
    const phoneInput = formData.get('phone') as string
    const formattedPhone = phoneInput ? `+7${getPhoneDigits(phoneInput).slice(1)}` : ''
    formData.set('phone', formattedPhone)

    // Конвертируем дату рождения перед отправкой
    if (birthDateDisplay.length === 10) {
      formData.set('birthDate', convertToISODate(birthDateDisplay))
    } else {
      formData.set('birthDate', '')
    }

    try {
      const result = await handleAddPatient(formData)

      if (result.success) {
        onClose?.() // Используем onClose из пропсов
        setPhoneValue('+7 (')
        setBirthDateDisplay('')
        // Сбрасываем форму
        e.currentTarget.reset()
        // Обновляем страницу
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

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    // Если пользователь удаляет все, оставляем базовую маску
    if (value.length < 4) {
      setPhoneValue('+7 (')
      return
    }
    const formatted = formatPhone(value)
    setPhoneValue(formatted)
  }

  function handlePhoneKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Разрешаем удаление, но не позволяем удалить базовую часть
    if (e.key === 'Backspace' && phoneValue.length <= 4) {
      e.preventDefault()
    }
  }

  function handleBirthDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target.value
    const formatted = formatBirthDate(input)
    setBirthDateDisplay(formatted)
  }

  return (
    <>
      {!isModal && (
        <button
          onClick={() => setIsOpenInternal(true)}
          className="mb-6 bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          + Записать пациента
        </button>
      )}

      {isOpen && ( // Управляется извне или внутренним состоянием
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Новая запись</h2>
              <button
                type="button" // Добавлено type="button"
                onClick={() => {
                  onClose?.() // Используем onClose из пропсов
                  setError(null)
                  setPhoneValue('+7 (')
                  setBirthDateDisplay('')
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={onSubmit}>
              <input type="hidden" name="created_by_email" value={user?.username || ''} />
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    ФИО *
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Иван Иванов"
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Дата рождения пациента
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    id="birthDate"
                    name="birthDateDisplay"
                    value={birthDateDisplay}
                    onChange={handleBirthDateChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ДД.ММ.ГГГГ"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={phoneValue}
                    onChange={handlePhoneChange}
                    onKeyDown={handlePhoneKeyDown}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+7 (999) 123-45-67"
                    maxLength={18}
                  />
                </div>

                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                    Дата приема
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    defaultValue={initialDate || new Date().toISOString().split('T')[0]} // Используем initialDate
                  />
                </div>

                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                    Время записи
                  </label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Статус
                  </label>
                  <select
                    id="status"
                    name="status"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    defaultValue="Ожидает"
                  >
                    {PATIENT_STATUSES.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="doctor" className="block text-sm font-medium text-gray-700 mb-2">
                    Доктор
                  </label>
                  <select
                    id="doctor"
                    name="doctor"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Выберите врача</option>
                    {doctors.map(doctor => (
                      <option key={doctor} value={doctor}>{doctor}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="nurse" className="block text-sm font-medium text-gray-700 mb-2">
                    Медсестра
                  </label>
                  <select
                    id="nurse"
                    name="nurse"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Выберите медсестру</option>
                    {nurses.map(nurse => (
                      <option key={nurse} value={nurse}>{nurse}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="teeth" className="block text-sm font-medium text-gray-700 mb-2">
                    Зубы
                  </label>
                  <input
                    type="text"
                    id="teeth"
                    name="teeth"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Например: 11, 12, 13 или все"
                  />
                </div>

                <div>
                  <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                    Комментарии
                  </label>
                  <textarea
                    id="comments"
                    name="comments"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Дополнительная информация..."
                  />
                </div>


                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose?.() // Используем onClose из пропсов
                      setError(null)
                      setPhoneValue('+7 (')
                      setBirthDateDisplay('')
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={isSubmitting}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Добавление...' : 'Добавить'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
