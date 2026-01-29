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

export function NewPatientForm() {
  const { user } = useAuth()
  const { doctors, nurses } = useConstants()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [phoneValue, setPhoneValue] = useState('+7 (')
  const [birthDateDisplay, setBirthDateDisplay] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Wrapper function for server action
  async function submitForm(formData: FormData) {
    console.log('🎯 CLIENT: submitForm wrapper вызван')

    // Валидация обязательных полей
    const name = formData.get('name') as string
    const doctor = formData.get('doctor') as string

    if (!name?.trim()) {
      setError('Поле "ФИО" обязательно для заполнения')
      return
    }

    if (!doctor?.trim()) {
      setError('Поле "Доктор" обязательно для заполнения')
      return
    }

    // Предотвращаем двойную отправку
    if (isSubmitting) {
      console.log('🎯 CLIENT: Предотвращена двойная отправка')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    // Форматируем телефон перед отправкой
    const phoneInput = formData.get('phone') as string
    const phoneDigits = phoneInput.replace(/\D/g, '')
    const finalFormattedPhone = phoneDigits.startsWith('8')
      ? `+7${phoneDigits.slice(1)}`
      : phoneDigits.startsWith('7')
        ? `+${phoneDigits}`
        : `+7${phoneDigits}`
    formData.set('phone', finalFormattedPhone)

    // Конвертируем дату рождения перед отправкой
    if (birthDateDisplay.length === 10) {
      formData.set('birthDate', convertToISODate(birthDateDisplay))
    } else {
      formData.set('birthDate', '')
    }

    try {
      console.log('📤 CLIENT: Отправляем данные на сервер через wrapper')
      console.log('📤 CLIENT: FormData содержимое:')
      for (const [key, value] of formData.entries()) {
        console.log(`📤 CLIENT: ${key}: ${value}`)
      }
      const result = await handleAddPatient(formData)
      console.log('📥 CLIENT: Получили ответ от сервера через wrapper:', result)

      if (result.success) {
        console.log('✅ CLIENT: Успешно добавлен пациент через wrapper, перенаправляем...')
        setSuccess('Пациент успешно добавлен!')
        setTimeout(() => {
          router.push('/patients')
        }, 2000)
      } else {
        console.log('❌ CLIENT: Ошибка от сервера через wrapper:', result.error)
        setError(result.error || 'Произошла ошибка при добавлении пациента')
      }
    } catch (err) {
      console.log('❌ CLIENT: Исключение при отправке через wrapper:', err)
      setError('Произошла ошибка при отправке формы')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Автофокус на поле ФИО при загрузке страницы
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
  }

  function handleBirthDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target.value
    const formatted = formatBirthDate(input)
    setBirthDateDisplay(formatted)
  }

  return (
    <form
      action={submitForm}
      className="space-y-6"
    >
      <input type="hidden" name="created_by_email" value={user?.username || ''} />
      <div>
        <label className="block text-lg font-medium text-gray-700 mb-3">
          ФИО
        </label>
        <input
          ref={nameInputRef}
          type="text"
          name="name"
          required
          className="w-full px-5 py-4 text-lg border border-gray-300 rounded-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          placeholder="Введите ФИО пациента *"
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
          className="w-full px-5 py-4 text-lg border border-gray-300 rounded-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
          className="w-full px-5 py-4 text-lg border border-gray-300 rounded-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
          className="w-full px-5 py-4 text-lg border border-gray-300 rounded-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
      </div>

      <div>
        <label className="block text-lg font-medium text-gray-700 mb-3">
          Время записи
        </label>
        <input
          type="time"
          name="time"
          className="w-full px-5 py-4 text-lg border border-gray-300 rounded-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
      </div>

      <div>
        <label className="block text-lg font-medium text-gray-700 mb-3">
          Статус
        </label>
        <select
          name="status"
          className="w-full px-5 py-4 text-lg border border-gray-300 rounded-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          defaultValue="Ожидает"
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
          className="w-full px-5 py-4 text-lg border border-gray-300 rounded-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
          className="w-full px-5 py-4 text-lg border border-gray-300 rounded-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
          className="w-full px-5 py-4 text-lg border border-gray-300 rounded-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          placeholder="Например: 11, 12, 13 или все"
        />
      </div>

      <div>
        <label className="block text-lg font-medium text-gray-700 mb-3">
          Комментарии
        </label>
        <textarea
          name="comments"
          rows={3}
          className="w-full px-5 py-4 text-lg border border-gray-300 rounded-[14px] focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
          placeholder="Дополнительная информация..."
        />
      </div>


      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-5 py-4 rounded-[14px] text-base">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-[14px] text-base">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-6 py-4 bg-blue-600 text-white text-lg rounded-[14px] font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Добавление пациента...' : 'Добавить пациента'}
      </button>
    </form>
  )
}